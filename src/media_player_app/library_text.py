"""Plain-text archive discovery and display-title cleanup."""

from __future__ import annotations

import re
from pathlib import Path

from .media_models import Interview


def scan_interviews(interviews_dir: Path) -> list[Interview]:
    """Scan local text files into browser-readable archive records."""
    interviews: list[Interview] = []
    for interview_id, path in enumerate(interview_files(interviews_dir)):
        relative_path = path.relative_to(interviews_dir).as_posix()
        title_base = clean_interview_title(path.stem)
        year_match = re.search(r"(19|20)\d{2}", title_base)
        year = year_match.group(0) if year_match else ""
        source = re.sub(r"^(19|20)\d{2}\s*", "", title_base).strip(" -_") or title_base
        try:
            content = path.read_text(encoding="utf-8-sig")
        except UnicodeDecodeError:
            content = path.read_text(encoding="cp949", errors="replace")
        interviews.append(
            Interview(
                id=interview_id,
                path=relative_path,
                filename=path.name,
                title=title_base,
                year=year,
                source=source,
                content=content,
            )
        )
    return interviews


def clean_interview_title(title: str) -> str:
    """Remove compact translator/source tags from archive display titles."""
    cleaned = title.replace("_", " ")
    cleaned = re.sub(r"\b\d{2,}[A-Za-z]{2,}\b", "", cleaned)
    cleaned = re.sub(r"\s{2,}", " ", cleaned)
    return cleaned.strip(" -_")


def interview_files(interviews_dir: Path) -> list[Path]:
    if not interviews_dir.is_dir():
        return []
    return sorted(path for path in interviews_dir.rglob("*.txt") if path.is_file())
