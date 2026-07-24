import json
import threading
from types import SimpleNamespace

import pytest

from media_player_app.playlist_store import PlaylistError, PlaylistStore


def library_fixture(tmp_path):
    music_dir = tmp_path / "Music"
    paths = [music_dir / "Album" / "01 - One.flac", music_dir / "Album" / "02 - Two.mp3"]
    for path in paths:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.touch()
    return SimpleNamespace(
        music_dir=music_dir,
        paths=paths,
        tracks=[SimpleNamespace(id=101), SimpleNamespace(id=205)],
        track_paths_by_id={101: paths[0], 205: paths[1]},
        lock=threading.Lock(),
    )


def test_playlist_persists_relative_paths_and_deduplicates_tracks(tmp_path):
    library = library_fixture(tmp_path)
    store_path = tmp_path / "runtime" / "playlists.sqlite3"
    store = PlaylistStore(store_path)

    created = store.create("  Road   Trip  ", [205, 101, 205], library)
    loaded = PlaylistStore(store_path).list_for_library(library)

    assert created["name"] == "Road Trip"
    assert loaded[0]["track_ids"] == [205, 101]


def test_playlist_validation_rejects_bad_names_and_track_ids(tmp_path):
    library = library_fixture(tmp_path)
    store = PlaylistStore(tmp_path / "playlists.sqlite3")

    with pytest.raises(PlaylistError, match="name"):
        store.create("   ", [101], library)
    with pytest.raises(PlaylistError, match="empty"):
        store.create("Empty", [], library)
    with pytest.raises(PlaylistError, match="no longer available"):
        store.create("Missing", [99], library)
    with pytest.raises(PlaylistError, match="integers"):
        store.create("Strings", ["0"], library)
    with pytest.raises(PlaylistError, match="integers"):
        store.create("Boolean", [True], library)


def test_playlist_rename_resume_and_delete_round_trip(tmp_path):
    library = library_fixture(tmp_path)
    store = PlaylistStore(tmp_path / "playlists.sqlite3")
    created = store.create("First", [101, 205], library)

    store.rename(created["id"], "Renamed")
    store.set_resume(created["id"], 205, library)
    listed = store.list_for_library(library)
    assert listed[0]["name"] == "Renamed"
    assert listed[0]["resume_track_id"] == 205

    store.delete(created["id"])
    assert store.list_for_library(library) == []


def test_playlist_store_migrates_existing_json(tmp_path):
    library = library_fixture(tmp_path)
    legacy_path = tmp_path / "playlists.json"
    legacy_path.write_text(
        json.dumps(
            {
                "playlists": [
                    {
                        "id": "legacy",
                        "name": "Imported",
                        "tracks": ["Album/02 - Two.mp3"],
                        "resume_track": "Album/02 - Two.mp3",
                        "created_at": "2026-01-01T00:00:00+00:00",
                        "updated_at": "2026-01-01T00:00:00+00:00",
                    }
                ]
            }
        ),
        encoding="utf-8",
    )

    store = PlaylistStore(tmp_path / "playlists.sqlite3", legacy_json_path=legacy_path)

    assert store.list_for_library(library)[0]["track_ids"] == [205]


def test_two_playlist_store_instances_do_not_lose_writes(tmp_path):
    library = library_fixture(tmp_path)
    database_path = tmp_path / "playlists.sqlite3"
    first = PlaylistStore(database_path)
    second = PlaylistStore(database_path)
    errors = []

    def create(store, index):
        try:
            store.create(f"List {index}", [101, 205], library)
        except Exception as exc:  # pragma: no cover - asserted through errors.
            errors.append(exc)

    threads = [
        threading.Thread(target=create, args=(first if index % 2 else second, index))
        for index in range(12)
    ]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()

    assert errors == []
    assert len(first.list_for_library(library)) == 12
