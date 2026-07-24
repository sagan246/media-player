"""Stable, browser-safe identifiers for scanned media."""

from __future__ import annotations

import hashlib
import unicodedata


MAX_BROWSER_SAFE_ID = (1 << 52) - 1


def normalized_media_path(relative_path: str) -> str:
    """Normalize a relative path consistently across supported platforms."""
    return unicodedata.normalize("NFC", relative_path.replace("\\", "/")).casefold()


def stable_media_id(kind: str, relative_path: str) -> int:
    """Return a deterministic integer that JavaScript can represent exactly."""
    identity = f"{kind}:{normalized_media_path(relative_path)}"
    digest = hashlib.blake2b(identity.encode("utf-8"), digest_size=8).digest()
    return int.from_bytes(digest, "big") & MAX_BROWSER_SAFE_ID


def require_unique_media_id(
    seen: dict[int, str],
    media_id: int,
    relative_path: str,
) -> None:
    """Fail explicitly rather than silently serving the wrong file on collision."""
    previous = seen.setdefault(media_id, relative_path)
    if previous != relative_path:
        raise RuntimeError(f"Media ID collision between {previous!r} and {relative_path!r}")
