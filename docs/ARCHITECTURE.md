# Architecture

The app is a Python web server with a plain HTML/CSS/JavaScript frontend.

```text
Browser UI
  -> media_player.py
  -> media_library.py
  -> media_models.py

Metadata writes:
Browser UI -> media_player.py -> metadata_tag_tools.py -> MP3/FLAC files

Stats:
Browser UI -> media_player.py -> listening_stats.py -> SQLite
```

## Backend

- `media_player.py` - server, routes, APIs, streaming, edit/read-only gates.
- `media_library.py` - scans music, videos, lyrics, artwork, and text files.
- `media_models.py` - shared data records.
- `metadata_tag_tools.py` - MP3/FLAC metadata and artwork writes.
- `metadata_browser.py` - audio metadata/artwork reading helpers.
- `listening_stats.py` - playback stats stored in SQLite.
- `launcher_gui.py` - optional launcher for access modes.

## Frontend

- `assets/index.html` - app shell.
- `assets/app.js` - main state, playback, routing, and event wiring.
- `assets/components.js` - shared UI helpers.
- `assets/music-components.js` - music rendering.
- `assets/video-components.js` - video rendering.
- `assets/queue-components.js` - music/video queues.
- `assets/now-playing-components.js` - Now Playing screen.
- `assets/stats-components.js` - stats screen.
- `assets/lyrics.js` - text and LRC lyric handling.
- `assets/theme-data.js` / `assets/theme-engine.js` - themes.

## Styles

`assets/styles.css` imports focused files from `assets/styles/`:

- `themes.css`
- `base.css`
- `album-focus.css`
- `shared-panels.css`
- `music.css`
- `player-queue-now-playing.css`
- `video.css`
- `health-stats-interviews.css`
- `responsive.css`

## Key APIs

- `GET /api/config`
- `GET /api/tracks`
- `GET /api/videos`
- `GET /api/interviews`
- `GET /api/listening-stats`
- `GET /audio/<track-id>`
- `GET /video/<video-id>`
- `GET /lyrics/<track-id>`
- `POST /api/listening-stats`
- `POST /api/track/<track-id>/metadata`
- `POST /api/track/<track-id>/artwork`
- `POST /api/bulk/metadata`

Metadata write APIs are disabled in read-only and web-share modes.

## Streaming

Audio and video use HTTP Range requests.

This lets large files start quickly, seek correctly, and stream from disk without
loading the full file into memory.

Playback routes should not parse metadata or artwork. That work belongs in the
library scan cache.

## Checks

```powershell
python -m py_compile media_player.py media_library.py listening_stats.py media_models.py metadata_browser.py metadata_tag_tools.py launcher_gui.py
node --check assets/app.js
```
