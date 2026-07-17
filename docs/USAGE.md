# Usage

This guide covers configuration, media layout, artwork, lyrics, and access
modes.

## Launchers

The easiest start path is one of the included launchers:

```text
windows_commands/start_launcher.cmd
windows_commands/start_player.cmd
mac_commands/start_launcher.command
mac_commands/start_player.command
```

Use `start_launcher` for the menu-style launcher. Use `start_player` for a
plain local editable start on port `8766`. The Windows graphical launcher also
offers **Normal + Demo Cloudflare**, which starts two temporary public links:

- Normal read-only share on local port `8767`
- Guest/demo share on local port `8769`
- Local editable server on port `8766`

## Configuration

The app reads `media_player_config.json` by default. If the file is missing,
safe defaults are used.

To start from the example:

```powershell
copy media_player_config.example.json media_player_config.json
```

Common settings:

```json
{
  "app_name": "Local Media Player",
  "editable": true,
  "playlist_editable": true,
  "web_share": false,
  "guest_mode": false,
  "guest_album": "",
  "guest_album_dir": "",
  "music_dir": "Music",
  "video_dir": "Video",
  "text_dir": "Interviews",
  "text_tab_label": "Interviews",
  "preferred_categories": ["Albums", "Soundtracks", "Live"],
  "preferred_video_categories": ["Concerts"]
}
```

Useful fields:

- `app_name` - name shown in the browser.
- `editable` - enables or disables metadata editing.
- `playlist_editable` - allows playlist create, rename, update, and delete independently of metadata editing.
- `web_share` - enables read-only web-share behavior.
- `guest_mode` - opens directly to the Game and limits playback to one album.
- `guest_album` - exact album metadata value made available in Guest Mode.
- `guest_album_dir` - optional Guest-only music folder. It may be outside the
  main media library and is resolved relative to the config file when it is not
  an absolute path.
- `music_dir` - music folder inside the selected media folder.
- `video_dir` - video folder inside the selected media folder.
- `text_dir` - text archive folder inside the selected media folder.
- `text_tab_label` - label used for the text archive tab.
- `preferred_categories` - music category order.
- `preferred_video_categories` - video category order.

### Guest Mode

Guest Mode is a focused Game and music-player surface. It hides the main
navigation, disables metadata and playlist writes, and only exposes tracks
whose album metadata exactly matches `guest_album` (ignoring capitalization
and repeated spaces). Guests can still play music, read lyrics, open and
reorder the queue, and move between the Game and Now Playing. Its piece-style
selector offers preset photos, plain pieces, and current album artwork.

```json
{
  "guest_mode": true,
  "guest_album": "Album Name",
  "guest_album_dir": "D:/Guest Music/Album Name"
}
```

The graphical launcher can enable or disable Guest Mode, save its album, and
optionally select a separate folder containing Guest music. Leaving the folder
blank uses the normal music library. Its combined Cloudflare mode can expose a
normal share and a Guest/demo share at the same time without changing the
saved Guest toggle.

The configured album and game directory must exist or the server will stop
with a clear startup error. On mobile, Guest Mode enables the Game bloom while
Now Playing keeps the normal mobile layout.

## Media Library

Recommended layout:

```text
Media/
|-- Music/
|-- Video/
`-- Interviews/
```

If `Music` does not exist, the selected media folder itself is scanned for
audio. Missing optional folders simply show empty pages.

Music formats:

- MP3
- FLAC
- M4A/AAC for playback when the browser supports it

Video playback depends on browser support. MP4 with browser-friendly video and
audio codecs works best.

## Artwork

Music artwork is read from embedded audio tags.

Video folder covers can be added inside a video folder with one of these names:

```text
cover.jpg
cover.jpeg
cover.png
cover.webp
```

## Lyrics

Lyrics should live beside the song file. English lyrics are preferred when
available.

Preferred lookup order:

```text
01 - Song.en.lrc
01 - Song.en.txt
01 - Song.lrc
01 - Song.txt
```

Timed `.lrc` files are used for synced lyrics in Now Playing.

## Access Modes

### Local

Use this on the computer running the server.

```text
http://127.0.0.1:8766/
```

### Home Network

Use this for phones, tablets, or other computers on the same network.

Start the server with:

```powershell
python media_player.py --media-dir <media-folder> --host 0.0.0.0 --port 8766
```

Then open:

```text
http://<lan-address>:8766/
```

### Private Remote

Use a private network tool if you want remote access without making the player
public.

### Read-Only Web Share

Use this for temporary sharing through a public tunnel.

```powershell
python media_player.py --media-dir <media-folder> --host 0.0.0.0 --port 8767 --web-share
```

Port `8767` is intended for media read-only sharing. Playlists remain manageable
unless `playlist_editable` is set to `false`; metadata and embedded artwork stay
read-only. Keep port `8766` for local metadata editing.

`--media-dir` must resolve to the repository's expected media folder or one of
its descendants. This restriction prevents the server from being pointed at an
arbitrary filesystem directory.
