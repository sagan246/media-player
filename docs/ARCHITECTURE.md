# Architecture

The player is a Python HTTP server with a dependency-free HTML, CSS, and
JavaScript client.

```text
Browser UI
  -> server.py
     -> api_routes.py
     -> streaming.py
  -> media_library.py
     -> metadata_reader.py
  -> SQLite stats / JSON playlists
```

## Backend

- `server.py` composes the request handler and starts the server.
- `api_routes.py` serves library, playlist, config, game-score, and stats APIs.
- `streaming.py` streams artwork, lyrics, audio, and video with Range support.
- `media_library.py` scans configured music, video, and text folders.
- `metadata_reader.py` reads embedded tags and artwork without writing files.
- `playlist_store.py` persists relative track references and playlist resumes.
- `listening_stats.py` persists listening summaries in SQLite.

Media files are always read-only. Playback never parses tags or artwork; the
library scan cache performs that work before playback.

## Frontend

`assets/app.js` coordinates application state. Focused component, controller,
domain, persistence, playback, and theme modules own individual behaviors.
The server bundles these source files into a compressed JavaScript response.

CSS is split by layout concern under `assets/styles/` and bundled by the server.

## Stored State

- Music and video queues: browser storage
- Named playlists and shared resume positions: `runtime/playlists.json`
- Listening statistics and game score: SQLite under `runtime/`
- Scan and thumbnail caches: generated files under `runtime/`

## Main APIs

- `GET /api/config`
- `GET /api/tracks`
- `GET /api/videos`
- `GET /api/interviews`
- `GET /api/listening-stats`
- `GET /api/playlists`
- `GET /audio/<track-id>`
- `GET /video/<video-id>`
- `GET /lyrics/<track-id>`
- Playlist and playback-state mutation routes under `/api/`

Python is the final authority for playlist validation and path boundaries.

## Checks

```powershell
python -m compileall -q media_player.py launcher_gui.py src tests
python -m pytest
Get-ChildItem assets -Filter *.js | ForEach-Object { node --check $_.FullName }
```
