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

- Private computer, LAN, and Tailscale modes expose the complete player.
- Browser APIs hide local paths in every mode.
- Cloudflare Web Share tunnels the same player and retains its playback and
  optional playlist-management behavior.

Themes change presentation only. Access and media behavior must not depend on a
theme.
