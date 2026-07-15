from types import SimpleNamespace

from media_player_app.edit_routes import EditRoutesMixin


def route_fixture(tmp_path):
    paths = {
        0: tmp_path / "one.flac",
        1: tmp_path / "two.mp3",
        2: tmp_path / "video.mp4",
    }
    route = EditRoutesMixin()
    route.library = SimpleNamespace(
        path_for_id=lambda track_id: paths.get(track_id),
        album_paths_for_track=lambda _track_id: paths.values(),
    )
    return route, paths


def test_selected_artwork_requires_valid_existing_track_ids(tmp_path):
    route, paths = route_fixture(tmp_path)

    selected, error = route.artwork_scope_paths(0, paths[0], {"scope": "selected", "ids": []})
    assert selected == []
    assert "at least one" in error

    selected, error = route.artwork_scope_paths(0, paths[0], {"scope": "selected", "ids": [0, 99]})
    assert selected == []
    assert "no longer available" in error

    selected, error = route.artwork_scope_paths(0, paths[0], {"scope": "selected", "ids": [True]})
    assert selected == []
    assert "integers" in error


def test_selected_artwork_deduplicates_and_keeps_supported_audio_only(tmp_path):
    route, paths = route_fixture(tmp_path)

    selected, error = route.artwork_scope_paths(0, paths[0], {"scope": "selected", "ids": [0, 1, 0, 2]})

    assert error is None
    assert selected == [paths[0], paths[1]]
