"""Video discovery and optional sidecar artwork lookup."""

from __future__ import annotations

from pathlib import Path
from urllib.parse import quote

from .media_identity import require_unique_media_id, stable_media_id
from .media_models import Video


VIDEO_EXTENSIONS = {".mp4", ".m4v", ".mov", ".webm", ".mkv", ".avi", ".wmv", ".m2ts", ".mts", ".ts"}
VIDEO_THUMBNAIL_EXTENSIONS = (".jpg", ".jpeg", ".png", ".webp")


def scan_videos(video_dir: Path) -> tuple[list[Video], list[Path], dict[int, Path], dict[str, Path]]:
    """Scan video files and their optional thumbnail and folder-cover sidecars."""
    video_paths = video_files(video_dir)
    videos: list[Video] = []
    video_thumbnails: dict[int, Path] = {}
    video_folder_covers: dict[str, Path] = {}
    seen_ids: dict[int, str] = {}
    for path in video_paths:
        relative_path = path.relative_to(video_dir).as_posix()
        video_id = stable_media_id("video", relative_path)
        require_unique_media_id(seen_ids, video_id, relative_path)
        folder = str(Path(relative_path).parent).replace("\\", "/")
        if folder == ".":
            folder = "(root)"
        category = relative_path.split("/", 1)[0] if "/" in relative_path else "(root)"
        suffix = path.suffix.lower()
        thumbnail = find_video_thumbnail(path)
        folder_cover = find_video_folder_cover(path.parent)
        if folder_cover is not None:
            video_folder_covers[folder] = folder_cover
        if thumbnail is not None:
            video_thumbnails[video_id] = thumbnail
        videos.append(
            Video(
                id=video_id,
                path=relative_path,
                filename=path.name,
                title=path.stem,
                folder=folder,
                category=category,
                format=suffix.lstrip("."),
                size_mb=round(path.stat().st_size / 1024 / 1024, 2),
                video_url=f"/video/{video_id}",
                thumbnail_url=f"/video-thumb/{video_id}" if thumbnail is not None else "",
                has_thumbnail=thumbnail is not None,
                folder_cover_url=f"/video-folder-cover/{quote(folder, safe='/')}" if folder_cover is not None else "",
                has_folder_cover=folder_cover is not None,
                browser_friendly=suffix in {".mp4", ".m4v", ".mov", ".webm"},
            )
        )
    return videos, video_paths, video_thumbnails, video_folder_covers


def video_files(video_dir: Path) -> list[Path]:
    if not video_dir.is_dir():
        return []
    return sorted(
        path
        for path in video_dir.rglob("*")
        if path.is_file()
        and path.suffix.lower() in VIDEO_EXTENSIONS
        and ".bak" not in path.name.lower()
    )


def find_video_thumbnail(path: Path) -> Path | None:
    """Find a same-name image next to a video file, if present."""
    for extension in VIDEO_THUMBNAIL_EXTENSIONS:
        candidate = path.with_suffix(extension)
        if candidate.is_file():
            return candidate
    return None


def find_video_folder_cover(folder: Path) -> Path | None:
    """Find an optional cover.jpg/png/webp inside a video folder."""
    for extension in VIDEO_THUMBNAIL_EXTENSIONS:
        candidate = folder / f"cover{extension}"
        if candidate.is_file():
            return candidate
    return None
