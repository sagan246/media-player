import json
import threading
from pathlib import Path
from types import SimpleNamespace

from media_player_app.api_routes import ApiRoutesMixin
from media_player_app.http_helpers import HttpHelpersMixin
from media_player_app import launcher_gui
from media_player_app.server_config import PlayerConfig


def test_guest_config_normalizes_album_matching():
    config = PlayerConfig.from_mapping(
        {"guest_mode": True, "guest_album": "  My   Album  ", "guest_album_dir": "  guest/music  "}
    )

    assert config.guest_mode is True
    assert config.guest_album == "My   Album"
    assert config.guest_album_dir == "guest/music"
    assert config.allows_album("my album") is True
    assert config.allows_album("Other Album") is False


def test_normal_mode_allows_every_album():
    assert PlayerConfig().allows_album("Any Album") is True


def test_guest_music_path_supports_relative_and_absolute_paths(tmp_path: Path):
    config_path = tmp_path / "config" / "media_player_config.json"
    relative = PlayerConfig(guest_album_dir="guest-album")
    absolute_dir = tmp_path / "elsewhere"
    absolute = PlayerConfig(guest_album_dir=str(absolute_dir))

    assert relative.guest_music_path(config_path) == (config_path.parent / "guest-album").resolve()
    assert absolute.guest_music_path(config_path) == absolute_dir.resolve()


def test_guest_track_path_rejects_other_albums(tmp_path: Path):
    allowed_path = tmp_path / "allowed.flac"
    blocked_path = tmp_path / "blocked.flac"
    allowed_path.write_bytes(b"allowed")
    blocked_path.write_bytes(b"blocked")
    helper = SimpleNamespace(
        library=SimpleNamespace(
            lock=threading.Lock(),
            tracks=[SimpleNamespace(album="Guest Album"), SimpleNamespace(album="Other")],
            paths=[allowed_path, blocked_path],
        ),
        player_config=PlayerConfig(guest_mode=True, guest_album="Guest Album"),
    )

    assert HttpHelpersMixin.resolve_track_path(helper, 0) == allowed_path
    assert HttpHelpersMixin.resolve_track_path(helper, 1) is None


def test_guest_tracks_api_only_returns_configured_album():
    class Routes(ApiRoutesMixin):
        def __init__(self):
            self.library = SimpleNamespace(
                lock=threading.Lock(),
                tracks=[SimpleNamespace(id=0, album="Guest Album"), SimpleNamespace(id=1, album="Other")],
            )
            self.player_config = PlayerConfig(guest_mode=True, guest_album="Guest Album")
            self.payload = None

        @staticmethod
        def public_track(track):
            return {"id": track.id, "album": track.album, "has_artwork": False}

        def send_json(self, payload, status=200):
            self.payload = payload

    routes = Routes()
    routes.handle_tracks_api()

    assert [track["id"] for track in routes.payload["tracks"]] == [0]
    assert routes.payload["total"] == 1


def test_guest_listening_stats_are_ignored():
    class FailingStats:
        @staticmethod
        def record(_payload):
            raise AssertionError("Guest listening stats must not be recorded")

    class Routes(ApiRoutesMixin):
        player_config = PlayerConfig(guest_mode=True, guest_album="Guest Album")
        listening_stats = FailingStats()
        payload = None

        @staticmethod
        def read_json_object():
            return {"track": {"title": "Guest Song"}, "seconds": 30}

        def send_json(self, payload, status=200):
            self.payload = payload

    routes = Routes()
    routes.handle_listening_stats_record()

    assert routes.payload == {"ok": True, "ignored": True, "reason": "guest_mode"}


def test_launcher_saves_guest_settings_without_dropping_config(tmp_path: Path, monkeypatch):
    config_path = tmp_path / "media_player_config.json"
    config_path.write_text('{"app_name":"Test Player","guest_mode":false}\n', encoding="utf-8")
    monkeypatch.setattr(launcher_gui, "CONFIG_PATH", config_path)
    monkeypatch.setattr(launcher_gui, "EXAMPLE_CONFIG_PATH", tmp_path / "missing.json")

    launcher_gui.save_launcher_guest_config(True, "FOREVER 1 - The 7th Album", "G:/Guest Album")

    saved = json.loads(config_path.read_text(encoding="utf-8"))
    assert saved["app_name"] == "Test Player"
    assert saved["guest_mode"] is True
    assert saved["guest_album"] == "FOREVER 1 - The 7th Album"
    assert saved["guest_album_dir"] == "G:/Guest Album"
