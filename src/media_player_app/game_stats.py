"""Persistent high score storage for the human game mode."""

from __future__ import annotations

import sqlite3
import threading
from contextlib import closing
from pathlib import Path


MAX_GAME_SCORE = 1_000_000


class GameHighScoreStore:
    """Store one global high score shared by normal and Guest Mode clients."""

    def __init__(self, database_path: Path):
        self.database_path = Path(database_path)
        self.lock = threading.Lock()
        self.database_path.parent.mkdir(parents=True, exist_ok=True)
        with closing(sqlite3.connect(self.database_path)) as database:
            with database:
                database.execute(
                    """
                    CREATE TABLE IF NOT EXISTS game_stats (
                        id INTEGER PRIMARY KEY CHECK (id = 1),
                        best_score INTEGER NOT NULL DEFAULT 0
                    )
                    """
                )

    def best_score(self) -> int:
        """Return the highest recorded human-game score."""
        with self.lock, closing(sqlite3.connect(self.database_path)) as database:
            row = database.execute("SELECT best_score FROM game_stats WHERE id = 1").fetchone()
        return int(row[0]) if row else 0

    def record(self, score: object) -> int:
        """Validate a candidate score and retain it only when it is higher."""
        if isinstance(score, bool) or not isinstance(score, int):
            raise ValueError("Game score must be an integer.")
        if not 0 <= score <= MAX_GAME_SCORE:
            raise ValueError(f"Game score must be between 0 and {MAX_GAME_SCORE}.")
        with self.lock, closing(sqlite3.connect(self.database_path)) as database:
            with database:
                database.execute(
                    """
                    INSERT INTO game_stats (id, best_score) VALUES (1, ?)
                    ON CONFLICT(id) DO UPDATE SET best_score = MAX(best_score, excluded.best_score)
                    """,
                    (score,),
                )
                row = database.execute("SELECT best_score FROM game_stats WHERE id = 1").fetchone()
        return int(row[0])

    def reset(self) -> None:
        """Clear the shared high score for release or testing preparation."""
        with self.lock, closing(sqlite3.connect(self.database_path)) as database:
            with database:
                database.execute("DELETE FROM game_stats WHERE id = 1")
