"""Process-safe playlists that reference relative music-library paths."""

from __future__ import annotations

import json
import sqlite3
import threading
import uuid
from contextlib import closing
from datetime import datetime, timezone
from pathlib import Path

from .media_library import Library
from .sqlite_utils import connect_runtime_database


class PlaylistError(ValueError):
    """Raised when a playlist request is invalid."""


class PlaylistStore:
    """Persist ordered playlists in SQLite for safe multi-server access."""

    MAX_TRACKS = 10_000

    def __init__(self, database_path: Path, legacy_json_path: Path | None = None) -> None:
        self.database_path = Path(database_path)
        self.legacy_json_path = Path(legacy_json_path) if legacy_json_path else None
        self.lock = threading.Lock()
        self._init_db()
        self._migrate_legacy_json()

    def connect(self):
        return connect_runtime_database(self.database_path, rows=True)

    def _init_db(self) -> None:
        with self.lock, closing(self.connect()) as database:
            with database:
                database.execute(
                    """
                    CREATE TABLE IF NOT EXISTS playlists (
                        id TEXT PRIMARY KEY,
                        name TEXT NOT NULL COLLATE NOCASE UNIQUE,
                        resume_track TEXT,
                        created_at TEXT NOT NULL,
                        updated_at TEXT NOT NULL,
                        resume_updated_at TEXT
                    )
                    """
                )
                database.execute(
                    """
                    CREATE TABLE IF NOT EXISTS playlist_tracks (
                        playlist_id TEXT NOT NULL,
                        position INTEGER NOT NULL,
                        relative_path TEXT NOT NULL,
                        PRIMARY KEY (playlist_id, position),
                        UNIQUE (playlist_id, relative_path),
                        FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE
                    )
                    """
                )

    def _migrate_legacy_json(self) -> None:
        """Import the former JSON store once when the SQLite store is empty."""
        path = self.legacy_json_path
        if path is None or not path.is_file():
            return
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            return
        records = payload.get("playlists", []) if isinstance(payload, dict) else []
        valid_records = [record for record in records if self._valid_legacy_record(record)]
        if not valid_records:
            return

        with self.lock, closing(self.connect()) as database:
            if database.execute("SELECT 1 FROM playlists LIMIT 1").fetchone():
                return
            with database:
                for record in reversed(valid_records):
                    database.execute(
                        """
                        INSERT OR IGNORE INTO playlists
                            (id, name, resume_track, created_at, updated_at, resume_updated_at)
                        VALUES (?, ?, ?, ?, ?, ?)
                        """,
                        (
                            record["id"],
                            record["name"],
                            record.get("resume_track"),
                            record.get("created_at") or self._timestamp(),
                            record.get("updated_at") or self._timestamp(),
                            record.get("resume_updated_at"),
                        ),
                    )
                    database.executemany(
                        """
                        INSERT OR IGNORE INTO playlist_tracks
                            (playlist_id, position, relative_path)
                        VALUES (?, ?, ?)
                        """,
                        [
                            (record["id"], position, relative_path)
                            for position, relative_path in enumerate(dict.fromkeys(record["tracks"]))
                        ],
                    )

    def list_for_library(self, library: Library) -> list[dict[str, object]]:
        """Return playlists resolved to IDs from the current catalog snapshot."""
        with self.lock, closing(self.connect()) as database:
            playlist_rows = database.execute(
                """
                SELECT id, name, resume_track, created_at, updated_at
                FROM playlists
                ORDER BY created_at DESC, rowid DESC
                """
            ).fetchall()
            track_rows = database.execute(
                """
                SELECT playlist_id, relative_path
                FROM playlist_tracks
                ORDER BY playlist_id, position
                """
            ).fetchall()

        references_by_playlist: dict[str, list[str]] = {}
        for row in track_rows:
            references_by_playlist.setdefault(row["playlist_id"], []).append(row["relative_path"])
        with library.lock:
            path_ids = {
                path.relative_to(library.music_dir).as_posix(): track_id
                for track_id, path in library.track_paths_by_id.items()
            }

        result = []
        for row in playlist_rows:
            references = references_by_playlist.get(row["id"], [])
            track_ids = [path_ids[path] for path in references if path in path_ids]
            result.append(
                {
                    "id": row["id"],
                    "name": row["name"],
                    "track_ids": track_ids,
                    "track_count": len(references),
                    "missing_count": len(references) - len(track_ids),
                    "resume_track_id": path_ids.get(row["resume_track"]),
                    "created_at": row["created_at"],
                    "updated_at": row["updated_at"],
                }
            )
        return result

    def create(self, name: object, track_ids: object, library: Library) -> dict[str, object]:
        clean_name = self._validated_name(name)
        references = self._references_for_ids(track_ids, library)
        now = self._timestamp()
        record = {
            "id": uuid.uuid4().hex,
            "name": clean_name,
            "tracks": references,
            "resume_track": references[0],
            "created_at": now,
            "updated_at": now,
        }
        try:
            with self.lock, closing(self.connect()) as database:
                with database:
                    database.execute(
                        """
                        INSERT INTO playlists (id, name, resume_track, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?)
                        """,
                        (record["id"], clean_name, references[0], now, now),
                    )
                    self._insert_tracks(database, record["id"], references)
        except sqlite3.IntegrityError as exc:
            raise PlaylistError("A playlist with that name already exists.") from exc
        return record

    def replace_tracks(self, playlist_id: str, track_ids: object, library: Library) -> dict[str, object]:
        references = self._references_for_ids(track_ids, library)
        with self.lock, closing(self.connect()) as database:
            with database:
                row = self._find(database, playlist_id)
                resume_track = row["resume_track"] if row["resume_track"] in references else references[0]
                updated_at = self._timestamp()
                database.execute("DELETE FROM playlist_tracks WHERE playlist_id = ?", (playlist_id,))
                self._insert_tracks(database, playlist_id, references)
                database.execute(
                    "UPDATE playlists SET resume_track = ?, updated_at = ? WHERE id = ?",
                    (resume_track, updated_at, playlist_id),
                )
        return {
            "id": playlist_id,
            "name": row["name"],
            "tracks": references,
            "resume_track": resume_track,
            "created_at": row["created_at"],
            "updated_at": updated_at,
        }

    def set_resume(self, playlist_id: str, track_id: object, library: Library) -> None:
        resume_track = self._references_for_ids([track_id], library)[0]
        with self.lock, closing(self.connect()) as database:
            with database:
                self._find(database, playlist_id)
                belongs = database.execute(
                    """
                    SELECT 1 FROM playlist_tracks
                    WHERE playlist_id = ? AND relative_path = ?
                    """,
                    (playlist_id, resume_track),
                ).fetchone()
                if not belongs:
                    raise PlaylistError("The resume track is not in this playlist.")
                database.execute(
                    """
                    UPDATE playlists
                    SET resume_track = ?, resume_updated_at = ?
                    WHERE id = ?
                    """,
                    (resume_track, self._timestamp(), playlist_id),
                )

    def rename(self, playlist_id: str, name: object) -> dict[str, object]:
        clean_name = self._validated_name(name)
        try:
            with self.lock, closing(self.connect()) as database:
                with database:
                    row = self._find(database, playlist_id)
                    updated_at = self._timestamp()
                    database.execute(
                        "UPDATE playlists SET name = ?, updated_at = ? WHERE id = ?",
                        (clean_name, updated_at, playlist_id),
                    )
        except sqlite3.IntegrityError as exc:
            raise PlaylistError("A playlist with that name already exists.") from exc
        return {
            "id": playlist_id,
            "name": clean_name,
            "created_at": row["created_at"],
            "updated_at": updated_at,
        }

    def delete(self, playlist_id: str) -> None:
        with self.lock, closing(self.connect()) as database:
            with database:
                self._find(database, playlist_id)
                database.execute("DELETE FROM playlist_tracks WHERE playlist_id = ?", (playlist_id,))
                database.execute("DELETE FROM playlists WHERE id = ?", (playlist_id,))

    @staticmethod
    def _insert_tracks(database, playlist_id: str, references: list[str]) -> None:
        database.executemany(
            """
            INSERT INTO playlist_tracks (playlist_id, position, relative_path)
            VALUES (?, ?, ?)
            """,
            [(playlist_id, position, path) for position, path in enumerate(references)],
        )

    @staticmethod
    def _find(database, playlist_id: str):
        row = database.execute(
            """
            SELECT id, name, resume_track, created_at, updated_at
            FROM playlists WHERE id = ?
            """,
            (playlist_id,),
        ).fetchone()
        if row is None:
            raise PlaylistError("Playlist not found.")
        return row

    @staticmethod
    def _timestamp() -> str:
        return datetime.now(timezone.utc).isoformat()

    @staticmethod
    def _valid_legacy_record(record: object) -> bool:
        return (
            isinstance(record, dict)
            and isinstance(record.get("id"), str)
            and isinstance(record.get("name"), str)
            and isinstance(record.get("tracks"), list)
            and all(isinstance(path, str) for path in record["tracks"])
            and (record.get("resume_track") is None or isinstance(record.get("resume_track"), str))
        )

    @staticmethod
    def _validated_name(name: object) -> str:
        clean_name = " ".join(str(name or "").split())
        if not clean_name:
            raise PlaylistError("Enter a playlist name.")
        if len(clean_name) > 80:
            raise PlaylistError("Playlist names must be 80 characters or fewer.")
        return clean_name

    @staticmethod
    def _validated_track_ids(track_ids: object) -> list[int]:
        if not isinstance(track_ids, list) or not track_ids:
            raise PlaylistError("The queue is empty.")
        if len(track_ids) > PlaylistStore.MAX_TRACKS:
            raise PlaylistError(f"Playlists can contain at most {PlaylistStore.MAX_TRACKS:,} tracks.")
        if any(isinstance(track_id, bool) or not isinstance(track_id, int) for track_id in track_ids):
            raise PlaylistError("Playlist track IDs must be integers.")
        return list(dict.fromkeys(track_ids))

    @classmethod
    def _references_for_ids(cls, track_ids: object, library: Library) -> list[str]:
        ids = cls._validated_track_ids(track_ids)
        with library.lock:
            if any(track_id not in library.track_paths_by_id for track_id in ids):
                raise PlaylistError("One or more tracks are no longer available.")
            return [
                library.track_paths_by_id[track_id].relative_to(library.music_dir).as_posix()
                for track_id in ids
            ]
