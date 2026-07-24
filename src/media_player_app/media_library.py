from __future__ import annotations

import base64
import hashlib
import json
import threading
import time
from dataclasses import dataclass
from pathlib import Path

from .library_text import scan_interviews
from .library_video import scan_videos
from .lyrics_reader import (
    lrc_timing_matches_raw,
    lyrics_for_track,
    read_lyric_sidecar,
    read_lyric_text,
    strip_lrc_timing,
    timed_lrc_line_count,
    timed_lrc_timestamps,
)
from .media_identity import require_unique_media_id, stable_media_id
from .metadata_reader import AUDIO_EXTENSIONS, Artwork, read_artwork, read_metadata
from .media_models import CachedArtwork, Interview, Track, Video
from .runtime_files import atomic_write_bytes, atomic_write_text


APP_ROOT = Path(__file__).resolve().parents[2]
RUNTIME_DIR = APP_ROOT / "runtime"
SCAN_CACHE_PATH = RUNTIME_DIR / "media_player_scan_cache.json"
CACHE_DIR = RUNTIME_DIR / "media_player_cache"
ARTWORK_CACHE_DIR = CACHE_DIR / "artwork"
SCAN_CACHE_VERSION = 1


@dataclass(frozen=True)
class LibraryConfig:
    """! @brief Folder names used inside the selected media root."""

    music_dir: str = "Music"
    video_dir: str = "Video"
    text_dir: str = "Interviews"


@dataclass
class LibrarySnapshot:
    """! @brief Complete scan result swapped into Library atomically."""

    tracks: list[Track]
    paths: list[Path]
    artwork: dict[int, CachedArtwork]
    videos: list[Video]
    video_paths: list[Path]
    video_thumbnails: dict[int, Path]
    video_folder_covers: dict[str, Path]
    interviews: list[Interview]
    lyrics: dict[int, str]
    lyrics_formats: dict[int, str]
    scan_times_ms: dict[str, int]


@dataclass(frozen=True)
class LibraryRefreshResult:
    """Summary returned after a refresh request."""

    status: str
    total_ms: int
    music_ms: int
    video_ms: int
    text_ms: int
    cache_write_ms: int
    tracks: int
    videos: int
    interviews: int


class Library:
    """In-memory snapshot of the current media folders.

    The HTTP server reads from this object while scans happen under a lock.
    """

    def __init__(self, media_dir: Path, config: LibraryConfig | None = None) -> None:
        config = config or LibraryConfig()
        self.media_dir = media_dir
        configured_music_dir = media_dir / config.music_dir
        self.music_dir = configured_music_dir if configured_music_dir.is_dir() else media_dir
        self.scan_cache_path = SCAN_CACHE_PATH
        self.cache_namespace = ""
        self.video_dir = media_dir / config.video_dir
        self.text_dir = media_dir / config.text_dir
        self.tracks: list[Track] = []
        self.paths: list[Path] = []
        self.track_by_id: dict[int, Track] = {}
        self.track_paths_by_id: dict[int, Path] = {}
        self.artwork: dict[int, CachedArtwork] = {}
        self.videos: list[Video] = []
        self.video_paths: list[Path] = []
        self.video_paths_by_id: dict[int, Path] = {}
        self.video_thumbnails: dict[int, Path] = {}
        self.video_folder_covers: dict[str, Path] = {}
        self.interviews: list[Interview] = []
        self.lyrics: dict[int, str] = {}
        self.lyrics_formats: dict[int, str] = {}
        self.lock = threading.Lock()
        self.refresh_lock = threading.Lock()
        self.last_refresh_result: LibraryRefreshResult | None = None
        self.refresh()

    def refresh(self, *, wait: bool = True) -> LibraryRefreshResult:
        """Build and atomically install a fresh library snapshot.

        Refresh requests are serialized because overlapping scans can race while
        replacing the shared metadata cache. HTTP refreshes use ``wait=False``
        so repeated clicks report the active scan instead of starting another.
        """
        if not self.refresh_lock.acquire(blocking=wait):
            with self.lock:
                return LibraryRefreshResult(
                    status="in_progress",
                    total_ms=0,
                    music_ms=0,
                    video_ms=0,
                    text_ms=0,
                    cache_write_ms=0,
                    tracks=len(self.tracks),
                    videos=len(self.videos),
                    interviews=len(self.interviews),
                )

        started = time.perf_counter()
        # Build fresh snapshots outside the lock, then swap them in quickly so
        # browser requests do not wait on a full media scan.
        try:
            snapshot = build_library_snapshot(
                self.music_dir,
                self.video_dir,
                self.text_dir,
                scan_cache_path=self.scan_cache_path,
                cache_namespace=self.cache_namespace,
            )

            result = LibraryRefreshResult(
                status="complete",
                total_ms=round((time.perf_counter() - started) * 1000),
                music_ms=snapshot.scan_times_ms["music"],
                video_ms=snapshot.scan_times_ms["video"],
                text_ms=snapshot.scan_times_ms["text"],
                cache_write_ms=snapshot.scan_times_ms["cache_write"],
                tracks=len(snapshot.tracks),
                videos=len(snapshot.videos),
                interviews=len(snapshot.interviews),
            )
            with self.lock:
                self.tracks = snapshot.tracks
                self.paths = snapshot.paths
                self.track_by_id = {track.id: track for track in snapshot.tracks}
                self.track_paths_by_id = {
                    track.id: path for track, path in zip(snapshot.tracks, snapshot.paths)
                }
                self.artwork = snapshot.artwork
                self.videos = snapshot.videos
                self.video_paths = snapshot.video_paths
                self.video_paths_by_id = {
                    video.id: path for video, path in zip(snapshot.videos, snapshot.video_paths)
                }
                self.video_thumbnails = snapshot.video_thumbnails
                self.video_folder_covers = snapshot.video_folder_covers
                self.interviews = snapshot.interviews
                self.lyrics = snapshot.lyrics
                self.lyrics_formats = snapshot.lyrics_formats
                self.last_refresh_result = result
            return result
        finally:
            self.refresh_lock.release()

    def path_for_id(self, track_id: int) -> Path | None:
        with self.lock:
            return self.track_paths_by_id.get(track_id)

    def track_for_id(self, track_id: int) -> Track | None:
        with self.lock:
            return self.track_by_id.get(track_id)

    def video_path_for_id(self, video_id: int) -> Path | None:
        with self.lock:
            return self.video_paths_by_id.get(video_id)

    def album_paths_for_track(self, track_id: int) -> list[Path]:
        with self.lock:
            selected_track = self.track_by_id.get(track_id)
            selected_path = self.track_paths_by_id.get(track_id)
            if selected_track is None or selected_path is None:
                return []
            album = selected_track.album
            if not album:
                return [selected_path]
            return [
                path
                for track, path in zip(self.tracks, self.paths)
                if track.album == album
            ]

    def video_thumbnail_for_id(self, video_id: int) -> Path | None:
        with self.lock:
            return self.video_thumbnails.get(video_id)

    def video_folder_cover_for_folder(self, folder: str) -> Path | None:
        with self.lock:
            return self.video_folder_covers.get(folder)


def build_library_snapshot(
    music_dir: Path,
    video_dir: Path,
    interviews_dir: Path,
    *,
    scan_cache_path: Path = SCAN_CACHE_PATH,
    cache_namespace: str = "",
) -> LibrarySnapshot:
    """Scan each media source independently, then return one swappable snapshot."""
    # Music uses a metadata/artwork cache because tag reads are the expensive
    # part. Video and interview scans are lightweight path/text scans.
    music_started = time.perf_counter()
    cache = load_scan_cache(scan_cache_path)
    tracks, paths, artwork, lyrics, lyrics_formats, next_cache = scan_music(
        music_dir,
        cache,
        cache_namespace=cache_namespace,
    )
    music_ms = round((time.perf_counter() - music_started) * 1000)

    video_started = time.perf_counter()
    videos, video_paths, video_thumbnails, video_folder_covers = scan_videos(video_dir)
    video_ms = round((time.perf_counter() - video_started) * 1000)

    text_started = time.perf_counter()
    interviews = scan_interviews(interviews_dir)
    text_ms = round((time.perf_counter() - text_started) * 1000)

    cache_started = time.perf_counter()
    save_scan_cache(next_cache, scan_cache_path)
    cache_write_ms = round((time.perf_counter() - cache_started) * 1000)
    return LibrarySnapshot(
        tracks=tracks,
        paths=paths,
        artwork=artwork,
        videos=videos,
        video_paths=video_paths,
        video_thumbnails=video_thumbnails,
        video_folder_covers=video_folder_covers,
        interviews=interviews,
        lyrics=lyrics,
        lyrics_formats=lyrics_formats,
        scan_times_ms={
            "music": music_ms,
            "video": video_ms,
            "text": text_ms,
            "cache_write": cache_write_ms,
        },
    )


def load_scan_cache(path: Path = SCAN_CACHE_PATH) -> dict[str, dict[str, object]]:
    """! @brief Load cached audio metadata/artwork records from disk."""
    if not path.exists():
        return {}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}
    if data.get("version") != SCAN_CACHE_VERSION or not isinstance(data.get("files"), dict):
        return {}
    return data["files"]


def save_scan_cache(files: dict[str, dict[str, object]], path: Path = SCAN_CACHE_PATH) -> None:
    """! @brief Persist scan cache records after a successful music scan."""
    atomic_write_text(
        path,
        json.dumps({"version": SCAN_CACHE_VERSION, "files": files}, ensure_ascii=False),
    )


def scan_music(
    music_dir: Path,
    cache: dict[str, dict[str, object]],
    *,
    cache_namespace: str = "",
) -> tuple[list[Track], list[Path], dict[int, CachedArtwork], dict[int, str], dict[int, str], dict[str, dict[str, object]]]:
    """! @brief Scan audio files and reuse cached metadata when possible."""
    # Metadata/artwork reads are the slow part. The scan cache lets playback and
    # refreshes stay quick unless a file's size or modified time actually changed.
    tracks: list[Track] = []
    paths: list[Path] = []
    artwork: dict[int, CachedArtwork] = {}
    lyrics: dict[int, str] = {}
    lyrics_formats: dict[int, str] = {}
    next_cache: dict[str, dict[str, object]] = {}
    audio_paths = audio_files(music_dir)
    seen_ids: dict[int, str] = {}

    for path in audio_paths:
        stat = path.stat()
        relative_path = path.relative_to(music_dir).as_posix()
        track_id = stable_media_id("audio", relative_path)
        require_unique_media_id(seen_ids, track_id, relative_path)
        cache_key = f"{cache_namespace}/{relative_path}" if cache_namespace else relative_path
        file_cache = cached_audio_entry(cache.get(cache_key), stat)
        if file_cache is None:
            metadata = read_metadata(path)
            art = read_artwork(path)
            file_cache = {
                "size": stat.st_size,
                "mtime_ns": stat.st_mtime_ns,
                "metadata": metadata,
                "artwork_mime": art.mime if art else "",
                "artwork_file": cache_artwork_data(cache_key, art.data) if art else "",
            }
        else:
            file_cache = normalize_audio_cache(cache_key, file_cache)
        metadata = dict(file_cache.get("metadata", {}))
        art = artwork_from_cache(file_cache)
        next_cache[cache_key] = file_cache

        title = str(metadata.get("title", "") or path.stem)
        artist = str(metadata.get("artist", ""))
        album = str(metadata.get("album", ""))
        albumartist = str(metadata.get("albumartist", ""))
        date = str(metadata.get("date", ""))
        tracknumber = str(metadata.get("tracknumber", ""))
        genre = str(metadata.get("genre", ""))
        folder = str(Path(relative_path).parent).replace("\\", "/")
        if folder == ".":
            folder = "(root)"
        lyric_text, lyric_format = lyrics_for_track(path)
        if art:
            artwork[track_id] = art
        if lyric_text:
            lyrics[track_id] = lyric_text
            lyrics_formats[track_id] = lyric_format
        paths.append(path)
        tracks.append(
            Track(
                id=track_id,
                path=relative_path,
                filename=path.name,
                format=path.suffix.lower().lstrip("."),
                title=title,
                artist=artist,
                album=album,
                albumartist=albumartist,
                date=date,
                tracknumber=tracknumber,
                genre=genre,
                has_artwork=art is not None,
                artwork_url=f"/art/{track_id}?v={stat.st_mtime_ns}" if art else "",
                audio_url=f"/audio/{track_id}",
                size_mb=round(stat.st_size / 1024 / 1024, 2),
                folder=folder,
                has_lyrics=bool(lyric_text),
                lyrics_url=f"/lyrics/{track_id}" if lyric_text else "",
                lyrics_format=lyric_format if lyric_text else "",
            )
        )
    return tracks, paths, artwork, lyrics, lyrics_formats, next_cache


def audio_files(music_dir: Path) -> list[Path]:
    return sorted(
        path
        for path in music_dir.rglob("*")
        if path.is_file()
        and path.suffix.lower() in AUDIO_EXTENSIONS
        and ".bak" not in path.name.lower()
    )


def cached_audio_entry(entry: dict[str, object] | None, stat) -> dict[str, object] | None:
    if not isinstance(entry, dict):
        return None
    if entry.get("size") != stat.st_size or entry.get("mtime_ns") != stat.st_mtime_ns:
        return None
    if not isinstance(entry.get("metadata"), dict):
        return None
    return entry


def normalize_audio_cache(relative_path: str, entry: dict[str, object]) -> dict[str, object]:
    # Older cache files stored artwork as base64 JSON. Move that data to a side
    # file once so the main cache stays small and fast to load.
    if entry.get("artwork_file") or not entry.get("artwork_data"):
        entry.pop("artwork_data", None)
        return entry
    data_text = str(entry.get("artwork_data", ""))
    try:
        data = base64.b64decode(data_text)
    except ValueError:
        data = b""
    entry.pop("artwork_data", None)
    entry["artwork_file"] = cache_artwork_data(relative_path, data) if data else ""
    return entry


def cache_artwork_data(relative_path: str, data: bytes) -> str:
    ARTWORK_CACHE_DIR.mkdir(parents=True, exist_ok=True)
    digest = hashlib.sha1(relative_path.encode("utf-8")).hexdigest()
    cache_path = ARTWORK_CACHE_DIR / f"{digest}.bin"
    if not cache_path.exists() or cache_path.stat().st_size != len(data):
        atomic_write_bytes(cache_path, data)
    return cache_path.name


def artwork_from_cache(entry: dict[str, object]) -> CachedArtwork | None:
    mime = str(entry.get("artwork_mime", ""))
    artwork_file = str(entry.get("artwork_file", ""))
    if not mime or not artwork_file:
        return None
    path = ARTWORK_CACHE_DIR / artwork_file
    if not path.is_file() or path.stat().st_size <= 0:
        return None
    return CachedArtwork(mime=mime, path=path)
