"""Lyric sidecar selection, timing validation, and text decoding."""

from __future__ import annotations

import re
from pathlib import Path


def lyrics_for_track(path: Path) -> tuple[str, str]:
    """Return the best lyrics, preferring trustworthy English translations."""
    english_lrc_path = path.with_suffix(".en.lrc")
    if english_lrc_path.is_file():
        english_lrc = read_lyric_text(english_lrc_path)
        if english_lrc and lrc_timing_matches_raw(english_lrc, path.with_suffix(".lrc")):
            return english_lrc, "lrc"

    english_text_sidecar = read_lyric_sidecar(path, ((".en.txt", "text"),))
    if english_text_sidecar:
        return english_text_sidecar

    # Keep translated text useful even if its timestamps no longer match the
    # source LRC. Untimed lyrics are safer than visibly incorrect highlighting.
    if english_lrc_path.is_file():
        plain_text = strip_lrc_timing(read_lyric_text(english_lrc_path))
        if plain_text:
            return plain_text, "text"

    sidecar = read_lyric_sidecar(path, ((".lrc", "lrc"), (".txt", "text")))
    return sidecar if sidecar else ("", "")


def lrc_timing_matches_raw(english_lrc: str, raw_lrc_path: Path) -> bool:
    """Return whether translated and source LRC lyric rows use identical timestamps."""
    if not raw_lrc_path.is_file():
        return True
    english_timestamps = timed_lrc_timestamps(english_lrc)
    raw_timestamps = timed_lrc_timestamps(read_lyric_text(raw_lrc_path))
    return bool(english_timestamps and raw_timestamps and english_timestamps == raw_timestamps)


def timed_lrc_line_count(content: str) -> int:
    return len(timed_lrc_timestamps(content))


def timed_lrc_timestamps(content: str) -> list[str]:
    """Return timestamps for non-empty lyric rows, ignoring timed blanks."""
    timestamps: list[str] = []
    for line in content.splitlines():
        matches = re.findall(r"\[([0-9]{1,2}:[0-9]{2}(?:[.:][0-9]{1,3})?)\]", line)
        if matches:
            text = re.sub(r"\[[^\]]+\]", "", line).strip()
            if text and not text.startswith("#"):
                timestamps.extend(matches)
    return timestamps


def strip_lrc_timing(content: str) -> str:
    """Remove LRC metadata and timestamps while retaining readable lyric text."""
    lines: list[str] = []
    for line in content.splitlines():
        text = re.sub(r"\[[^\]]+\]", "", line).strip()
        if text and not text.startswith("#"):
            lines.append(text)
    return "\n".join(lines).strip()


def read_lyric_sidecar(
    path: Path,
    candidates: tuple[tuple[str, str], ...] = (
        (".en.lrc", "lrc"),
        (".en.txt", "text"),
        (".lrc", "lrc"),
        (".txt", "text"),
    ),
) -> tuple[str, str] | None:
    for suffix, lyric_format in candidates:
        lyric_path = path.with_suffix(suffix)
        if not lyric_path.is_file():
            continue
        content = read_lyric_text(lyric_path)
        if content:
            return content, lyric_format
    return None


def read_lyric_text(path: Path) -> str:
    """Read a lyric file using common Korean/Japanese-friendly encodings."""
    try:
        return path.read_text(encoding="utf-8-sig").strip()
    except UnicodeDecodeError:
        return path.read_text(encoding="cp949", errors="replace").strip()
