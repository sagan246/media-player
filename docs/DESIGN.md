# Design

The player is a personal, local-first media library built around quick browsing
and reliable playback on desktop and mobile.

## Principles

- Keep playback controls familiar and immediately reachable.
- Let artwork, titles, lyrics, and media take visual priority.
- Keep media files read-only.
- Use one shared visual language across music, video, text, queues, and detail
  screens.
- Keep mobile layouts touch-friendly without duplicating application behavior.
- Preserve fast startup and Range-aware streaming for large local files.

## Modes

- Local and LAN modes expose the complete player.
- Web share hides local paths but still permits playback and optional playlist
  management.
- Guest Mode opens a configured album and the Game without exposing the normal
  navigation.

Themes change presentation only. Access and media behavior must not depend on a
theme.
