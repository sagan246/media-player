from media_player_app.media_identity import stable_media_id
from media_player_app import media_library


def test_stable_media_id_normalizes_case_and_path_separators():
    assert stable_media_id("audio", "Album\\Song.FLAC") == stable_media_id(
        "audio",
        "album/song.flac",
    )
    assert stable_media_id("audio", "album/song.flac") != stable_media_id(
        "video",
        "album/song.flac",
    )


def test_music_id_does_not_change_when_an_earlier_file_is_added(tmp_path, monkeypatch):
    music_dir = tmp_path / "Music"
    music_dir.mkdir()
    later = music_dir / "B.mp3"
    later.touch()
    monkeypatch.setattr(media_library, "read_metadata", lambda _path: {})
    monkeypatch.setattr(media_library, "read_artwork", lambda _path: None)

    first_tracks, *_ = media_library.scan_music(music_dir, {})
    original_id = first_tracks[0].id
    (music_dir / "A.mp3").touch()
    second_tracks, *_ = media_library.scan_music(music_dir, {})
    rescanned = next(track for track in second_tracks if track.filename == "B.mp3")

    assert rescanned.id == original_id
