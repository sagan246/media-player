"""Persistent playlists that reference tracks in the scanned music library."""

from __future__ import annotations

import json
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path

from .media_library import Library


class PlaylistError(ValueError):
    """Raised when a playlist request is invalid."""


class PlaylistStore:
    """Store small playlist snapshots as relative music-library paths."""

    def __init__(self, path: Path) -> None:
        self.path = path
        self.lock = threading.Lock()

    def list_for_library(self, library: Library) -> list[dict[str, object]]:
        """Return playlists with current scan IDs and missing-reference counts."""
        with self.lock:
            records = self._load()
        with library.lock:
            path_ids = {
                path.relative_to(library.music_dir).as_posix(): track.id
                for track, path in zip(library.tracks, library.paths)
            }
        result = []
        for record in records:
            references = record.get("tracks", [])
            track_ids = [path_ids[path] for path in references if path in path_ids]
            resume_track = record.get("resume_track")
            resume_track_id = path_ids.get(resume_track) if isinstance(resume_track, str) else None
            result.append(
                {
                    "id": record["id"],
                    "name": record["name"],
                    "track_ids": track_ids,
                    "track_count": len(references),
                    "missing_count": len(references) - len(track_ids),
                    "resume_track_id": resume_track_id,
                    "created_at": record.get("created_at", ""),
                    "updated_at": record.get("updated_at", ""),
                }
            )
        return result

    def create(self, name: object, track_ids: object, library: Library) -> dict[str, object]:
        """Create a playlist snapshot from current track IDs."""
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
        with self.lock:
            records = self._load()
            self._require_unique_name(records, clean_name)
            records.insert(0, record)
            self._save(records)
        return record

    def replace_tracks(self, playlist_id: str, track_ids: object, library: Library) -> dict[str, object]:
        """Replace a playlist snapshot while preserving the submitted order."""
        references = self._references_for_ids(track_ids, library)
        with self.lock:
            records = self._load()
            record = self._find(records, playlist_id)
            record["tracks"] = references
            if record.get("resume_track") not in references:
                record["resume_track"] = references[0]
            record["updated_at"] = self._timestamp()
            self._save(records)
            return dict(record)

    def set_resume(self, playlist_id: str, track_id: object, library: Library) -> None:
        """Store the current playlist track on the server for cross-device resume."""
        references = self._references_for_ids([track_id], library)
        resume_track = references[0]
        with self.lock:
            records = self._load()
            record = self._find(records, playlist_id)
            if resume_track not in record["tracks"]:
                raise PlaylistError("The resume track is not in this playlist.")
            record["resume_track"] = resume_track
            record["resume_updated_at"] = self._timestamp()
            self._save(records)

    def rename(self, playlist_id: str, name: object) -> dict[str, object]:
        """Rename one playlist without changing its track snapshot."""
        clean_name = self._validated_name(name)
        with self.lock:
            records = self._load()
            record = self._find(records, playlist_id)
            self._require_unique_name(records, clean_name, exclude_id=playlist_id)
            record["name"] = clean_name
            record["updated_at"] = self._timestamp()
            self._save(records)
            return dict(record)

    def delete(self, playlist_id: str) -> None:
        """Delete a playlist definition without touching any media file."""
        with self.lock:
            records = self._load()
            record = self._find(records, playlist_id)
            records.remove(record)
            self._save(records)

    def _load(self) -> list[dict[str, object]]:
        if not self.path.exists():
            return []
        try:
            data = json.loads(self.path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            return []
        records = data.get("playlists", []) if isinstance(data, dict) else []
        return [record for record in records if self._valid_record(record)]

    def _save(self, records: list[dict[str, object]]) -> None:
        """Atomically replace the small JSON store after a complete write."""
        self.path.parent.mkdir(parents=True, exist_ok=True)
        temporary = self.path.with_suffix(".tmp")
        temporary.write_text(json.dumps({"playlists": records}, ensure_ascii=False, indent=2), encoding="utf-8")
        temporary.replace(self.path)

    @staticmethod
    def _timestamp() -> str:
        """Return one consistent UTC timestamp format for playlist records."""
        return datetime.now(timezone.utc).isoformat()

    @staticmethod
    def _valid_record(record: object) -> bool:
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
        try:
            # dict preserves insertion order, giving playlists stable ordering
            # while preventing accidental duplicate songs.
            return list(dict.fromkeys(int(track_id) for track_id in track_ids))
        except (TypeError, ValueError) as exc:
            raise PlaylistError("Playlist tracks are invalid.") from exc

    @classmethod
    def _references_for_ids(cls, track_ids: object, library: Library) -> list[str]:
        ids = cls._validated_track_ids(track_ids)
        with library.lock:
            if any(track_id < 0 or track_id >= len(library.paths) for track_id in ids):
                raise PlaylistError("One or more tracks are no longer available.")
            return [library.paths[track_id].relative_to(library.music_dir).as_posix() for track_id in ids]

    @staticmethod
    def _find(records: list[dict[str, object]], playlist_id: str) -> dict[str, object]:
        record = next((item for item in records if item["id"] == playlist_id), None)
        if record is None:
            raise PlaylistError("Playlist not found.")
        return record

    @staticmethod
    def _require_unique_name(
        records: list[dict[str, object]],
        name: str,
        exclude_id: str | None = None,
    ) -> None:
        if any(record["id"] != exclude_id and str(record["name"]).casefold() == name.casefold() for record in records):
            raise PlaylistError("A playlist with that name already exists.")
