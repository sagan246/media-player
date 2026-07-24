"""Shared SQLite connection settings for runtime state stores."""

from __future__ import annotations

import sqlite3
from pathlib import Path


SQLITE_TIMEOUT_SECONDS = 10.0


def connect_runtime_database(path: Path, *, rows: bool = False) -> sqlite3.Connection:
    """Open a process-safe runtime database with short contention handling."""
    path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(path, timeout=SQLITE_TIMEOUT_SECONDS)
    if rows:
        connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA busy_timeout = 10000")
    connection.execute("PRAGMA foreign_keys = ON")
    connection.execute("PRAGMA journal_mode = WAL")
    connection.execute("PRAGMA synchronous = NORMAL")
    return connection
