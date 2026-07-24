# Built-in Game

A small dependency-free touch game embedded in the media player. The game is
served from `/game/` and receives current album artwork from the parent player.

The piece selector cycles through three appearances:

- Preset photos
- Plain aqua pieces
- Current album artwork

The game defaults to plain aqua pieces and remembers its piece selection.

The paw control independently enables Cat Mode. It keeps the selected piece
appearance but uses one target, removes hazards, expands paw hit detection,
and replaces straight drifting with pauses, curves, creeping, and short
dashes. Its photo appearance uses the hazard image as the prey target. The
preference is remembered on the device.

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
