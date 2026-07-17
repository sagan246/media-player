from types import SimpleNamespace
import sys

import pytest

from media_player_app.api_routes import ApiRoutesMixin
from media_player_app.game_stats import GameHighScoreStore, MAX_GAME_SCORE
from media_player_app import server


def test_game_stats_keeps_only_the_highest_score(tmp_path):
    database_path = tmp_path / "game.sqlite3"
    stats = GameHighScoreStore(database_path)

    assert stats.best_score() == 0
    assert stats.record(12) == 12
    assert stats.record(7) == 12
    assert stats.record(19) == 19
    assert GameHighScoreStore(database_path).best_score() == 19


@pytest.mark.parametrize("score", [True, 1.5, "8", -1, MAX_GAME_SCORE + 1])
def test_game_stats_rejects_invalid_scores(tmp_path, score):
    stats = GameHighScoreStore(tmp_path / "game.sqlite3")

    with pytest.raises(ValueError):
        stats.record(score)


def test_game_score_route_is_available_in_guest_mode(tmp_path):
    class Routes(ApiRoutesMixin):
        game_stats = GameHighScoreStore(tmp_path / "game.sqlite3")
        player_config = SimpleNamespace(guest_mode=True)
        payload = None

        @staticmethod
        def read_json_object():
            return {"score": 24}

        def send_json(self, payload, status=200):
            self.payload = payload

        def send_error_json(self, error, status=400):
            raise AssertionError(error)

    routes = Routes()
    routes.handle_game_score_record()

    assert routes.payload == {"ok": True, "best_score": 24}


def test_game_high_score_reset_persists(tmp_path):
    database_path = tmp_path / "game.sqlite3"
    store = GameHighScoreStore(database_path)
    store.record(42)

    store.reset()

    assert store.best_score() == 0
    assert GameHighScoreStore(database_path).best_score() == 0


def test_reset_game_record_cli_resets_and_exits(tmp_path, monkeypatch, capsys):
    database_path = tmp_path / "game.sqlite3"
    GameHighScoreStore(database_path).record(88)
    monkeypatch.setattr(server, "GAME_STATS_DB", database_path)
    monkeypatch.setattr(sys, "argv", ["media-player", "--reset-game-record"])

    assert server.main() == 0
    assert GameHighScoreStore(database_path).best_score() == 0
    assert "reset to 0" in capsys.readouterr().out
