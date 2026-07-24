"""Read embedded audio metadata and artwork without modifying media files."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import sys


# Packaged installs use normal dependencies; the portable launcher can use the
# repository's bundled dependencies without requiring a separate pip install.
VENDOR_DIR = Path(__file__).resolve().parents[2] / "vendor"
if VENDOR_DIR.exists() and str(VENDOR_DIR) not in sys.path:
    sys.path.insert(0, str(VENDOR_DIR))

from mutagen import File
from mutagen.flac import FLAC
from mutagen.id3 import APIC, ID3
from mutagen.mp4 import MP4, MP4Cover


AUDIO_EXTENSIONS = {".flac", ".mp3", ".m4a", ".mp4"}


@dataclass(frozen=True)
class Artwork:
    """Embedded artwork bytes and their MIME type."""

    data: bytes
    mime: str


def first_value(audio: object, keys: list[str]) -> str:
    """Return the first non-empty value from a list of tag keys."""
    for key in keys:
        try:
            values = audio.get(key, [])  # type: ignore[attr-defined]
        except Exception:
            values = []
        if values:
            return str(values[0]).strip()
    return ""


def read_metadata(path: Path) -> dict[str, str]:
    """Read display metadata through Mutagen's format-neutral easy interface."""
    audio = File(path, easy=True)
    if audio is None:
        return {}
    return {
        "title": first_value(audio, ["title"]),
        "artist": first_value(audio, ["artist"]),
        "album": first_value(audio, ["album"]),
        "albumartist": first_value(audio, ["albumartist", "album_artist"]),
        "date": first_value(audio, ["date", "originaldate", "year"]),
        "tracknumber": first_value(audio, ["tracknumber", "track"]),
        "genre": first_value(audio, ["genre"]),
    }


def read_artwork(path: Path) -> Artwork | None:
    """Read the first embedded cover image supported by the audio container."""
    suffix = path.suffix.lower()
    try:
        if suffix == ".flac":
            audio = FLAC(path)
            if audio.pictures:
                picture = audio.pictures[0]
                return Artwork(data=picture.data, mime=picture.mime or "image/jpeg")

        if suffix == ".mp3":
            tags = ID3(path)
            for frame in tags.values():
                if isinstance(frame, APIC):
                    return Artwork(data=frame.data, mime=frame.mime or "image/jpeg")

        if suffix in {".m4a", ".mp4"}:
            audio = MP4(path)
            covers = audio.tags.get("covr", []) if audio.tags else []
            if covers:
                cover = covers[0]
                image_format = getattr(cover, "imageformat", None)
                mime = "image/png" if image_format == MP4Cover.FORMAT_PNG else "image/jpeg"
                return Artwork(data=bytes(cover), mime=mime)
    except Exception:
        # Malformed tags should not prevent the rest of the library from loading.
        return None
    return None
