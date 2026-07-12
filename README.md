# Taeyeon Media Player

A local-first web media player for a Taeyeon-focused music, video, lyrics, and
interview archive.

The app runs on your computer and serves your own files through a browser UI. It
can be used locally, on your home network, through a private VPN such as
Tailscale, or in read-only web-share mode through a temporary tunnel.

Media files are **not included** in this repository.

## Features

- Music library with album, category, newest/oldest, and year views
- Video library with folder-style video albums and optional folder covers
- Interview reader for local `.txt` files
- Music and video queues with resume support
- Mobile-friendly listening UI with Now Playing and queue screens
- Audio visualizer on the Now Playing screen
- Local lyrics sidecars shown on supported songs
- Listening stats page with day, week, month, year, and all-time summaries
- HTTP Range streaming for fast MP3, FLAC, M4A, and video playback/seek
- Optional Edit Mode for MP3/FLAC metadata and embedded artwork
- Read-only web-share mode that hides local paths and disables editing
- Windows launcher scripts and a small launcher GUI

## Expected Media Layout

Point the app at a media folder. By default, the library expects this shape:

```text
media/
  Music/
    Taeyeon Official/
    Taeyeon OST/
    Taeyeon Live, Covers & Radio/
    Girls' Generation/
    Girls' Generation-TTS/
  Video/
    Taeyeon Concert/
    Group Concert/
    ...
  Interviews/
    2021 Interview Name.txt
  Lyrics/
    Album Name/
      Song Title.txt
  artwork/
    Album Name.jpg
```

The app is forgiving about the exact music subfolders. If `Music` does not
exist, the selected media folder itself is scanned for audio.

You can override the default folder names and labels with
`taeyeon_media_player_config.json`:

```json
{
  "app_name": "Taeyeon Media Player",
  "music_dir": "Music",
  "video_dir": "Video",
  "text_dir": "Interviews",
  "text_tab_label": "Interviews",
  "lyrics_dir": "Lyrics",
  "preferred_categories": ["Taeyeon Official", "Taeyeon OST"],
  "preferred_video_categories": ["Taeyeon Concert"]
}
```

Missing optional folders such as `Video`, `Interviews`, or `Lyrics` simply show
empty pages. Missing preferred categories are ignored.

## Artwork And Covers

Audio artwork is normally read from embedded MP3/FLAC tags.

Video folder covers are regular image files placed inside the video folder. Use
one of these names:

```text
cover.jpg
cover.jpeg
cover.png
cover.webp
```

Individual videos do not need embedded artwork. Folder covers are used for video
album cards.

## Local Lyrics

Lyrics are read from sidecar text files under `Lyrics/`.

Recommended layout:

```text
Lyrics/
  Panorama - The Best of TAEYEON/
    Panorama.txt
    Letter To Myself.txt
```

Use the album folder name when possible. Song filenames should match the song
title closely. Characters that Windows does not allow in filenames can be left
out or replaced with a simple dash.

## Start The Player

Run the server with Python:

```powershell
python taeyeon_media_player.py --media-dir G:\cod\media --host 127.0.0.1 --port 8766
```

Then open:

```text
http://127.0.0.1:8766/
```

To let your phone or tablet connect on the same home network, bind to all
interfaces:

```powershell
python taeyeon_media_player.py --media-dir G:\cod\media --host 0.0.0.0 --port 8766
```

Then open your computer's LAN address from the other device, for example:

```text
http://10.0.0.160:8766/
```

## Windows Launchers

Windows helper scripts live in `windows_commands/`.

```text
open_taeyeon_media_player_launcher_gui.cmd
start_taeyeon_media_player.cmd
start_taeyeon_media_player_phone_lan.cmd
start_taeyeon_media_player_private_tailscale.cmd
start_taeyeon_media_player_web_share.cmd
start_taeyeon_media_player_web_share_with_cloudflare.cmd
show_web_share_visitors.cmd
```

The launcher GUI is the easiest way to choose local, phone/LAN, Tailscale, or
Cloudflare web-share mode.

## Web-Share Mode

Use web-share mode for temporary internet-facing playback:

```powershell
python taeyeon_media_player.py --media-dir G:\cod\media --host 0.0.0.0 --port 8767 --web-share
```

Web-share mode:

- disables metadata editing
- hides local file paths from API responses
- keeps playback enabled
- records privacy-light visitor entries in `taeyeon_media_player_visitors.jsonl`

Visitor entries use a hashed visitor key rather than storing raw IP addresses.

## Optional Edit Password

Edit Mode can be protected with a password:

```powershell
python taeyeon_media_player.py --media-dir G:\cod\media --edit-password "your-password"
```

You can also copy the example config:

```powershell
copy taeyeon_media_player_config.example.json taeyeon_media_player_config.json
```

The local config file is ignored by git.

## Edit Mode

Edit Mode writes directly to MP3 and FLAC files.

Supported edits:

- title
- artist
- album
- album artist
- date
- track number
- genre
- embedded artwork

Use a copy or backup of your media if you are experimenting.

## Generated Files

These files/folders are created while running and are safe to regenerate:

```text
taeyeon_media_player_cache/
taeyeon_media_player_scan_cache.json
taeyeon_media_player_audio_debug.log
taeyeon_media_player_stats.sqlite3
taeyeon_media_player_visitors.jsonl
docs/doxygen/
__pycache__/
```

They are local runtime artifacts and should not be committed.

## Source Map

```text
taeyeon_media_player.py      Server, API routes, streaming, edit routes
media_library.py             Music/video/interview scanning, lyrics, artwork cache
listening_stats.py           SQLite-backed listening stats summaries
metadata_editor_models.py    Track, Video, and Interview data models
metadata_tag_tools.py        MP3/FLAC metadata and artwork writing
metadata_browser.py          Audio metadata and artwork reading
launcher_gui.py              Windows launcher GUI
assets/index.html            Browser app shell
assets/app.js                UI, playback, queues, stats, mobile behavior
assets/styles.css            Visual design and responsive layout
windows_commands/            Windows helper launch scripts
```

## Developer Docs

The source includes Doxygen-style comments and a `Doxyfile`.

To generate local HTML docs, install Doxygen and run:

```powershell
doxygen Doxyfile
```

Generated docs go to:

```text
docs/doxygen/html/
```

## Notes

This app is designed for personal/local media libraries. It does not upload your
media anywhere by itself. If you expose it outside your home network, use
read-only web-share mode, avoid Edit Mode, and treat the temporary link like
something other people could open if they receive it.
