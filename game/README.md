# Built-in Game

A small dependency-free touch game embedded in the media player. The game is
served from `/game/` and receives current album artwork from the parent player.

The piece selector cycles through two modes:

- Preset photos
- Plain aqua pieces
- Current album artwork

Normal mode defaults to plain aqua pieces. Guest Mode defaults to preset
photos and remembers its piece selection separately.

Pausing freezes the current game and switches to a visualizer-only view. The
Run control restores the same score and piece positions.

The preset-photo mode optionally uses these local files:

```text
game/assets/photo-grid.png
game/assets/hazard.png
```

They are intentionally ignored by Git. When either photo is absent, the game
continues normally with its plain CSS shapes. `preset-icon.png` is application
UI and is included in the repository.
