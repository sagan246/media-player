# Local Media Player

A media player that runs on a local computer and lets you browse, play, and
organize a local music, video, lyrics, and text archive through a web browser.

The player is local-first by default. It can also be used on your home network,
through private remote access with Tailscale, or through a temporary read-only
Cloudflare web share.

Media files are **not included** in this repository.

## Screenshots

Add screenshots here.

## Features

- Browse music by album, category, year, newest, oldest, and sections
- Browse videos with folder-based organization and optional folder cover artwork
- Read local text archives, such as interviews or translated articles
- Display local lyrics during playback, including timed `.lrc` lyrics
- Music and video queues with resume support
- Now Playing screen with artwork, lyrics, controls, and visualizers
- Listening statistics with daily, weekly, monthly, yearly, and all-time views
- Optional metadata editing for supported audio files
- Desktop and mobile browser interface
- Multiple access modes:
  - Local
  - Home Network (LAN)
  - Private Remote (Tailscale)
  - Read-only Cloudflare Web Share

## Getting Started

The easiest way to start the player is with the included **Media Launcher**.

On Windows, open:

```text
windows_commands/open_media_launcher.cmd
```

On macOS, open:

```text
mac_commands/open_media_launcher.command
```

If macOS will not open it, run this once from Terminal:

```bash
chmod +x mac_commands/open_media_launcher.command
```

The Windows launcher can start the player in:

- Local mode
- Home Network (LAN) mode
- Private Remote (Tailscale) mode
- Read-only Cloudflare Web Share mode

The macOS launcher supports Local, Home Network, Private Remote, and local
read-only Web Share modes. It also shows the link to open from a browser.

## Command Line

If you prefer, start the server directly with Python:

```powershell
python media_player.py --media-dir <media-folder> --host 127.0.0.1 --port 8766
```

Then open:

```text
http://127.0.0.1:8766/
```

To allow other devices on your home network to connect:

```powershell
python media_player.py --media-dir <media-folder> --host 0.0.0.0 --port 8766
```

Then open the server computer's LAN address from another device, for example:

```text
http://<lan-address>:8766/
```

## Library Layout

Point the app at a media folder. By default, the player looks for music, video,
lyrics, artwork, and text archives in this kind of layout:

```text
Media/
|-- Music/
|-- Video/
|-- Lyrics/
|-- Interviews/
`-- artwork/
```

The app is forgiving about the exact music subfolders. If `Music` does not
exist, the selected media folder itself is scanned for audio.

Missing optional folders, such as `Video`, `Interviews`, or `Lyrics`, simply
show empty pages.

## Artwork And Covers

Music artwork is read from embedded MP3/FLAC tags.

Video folder covers are regular image files placed inside a video folder. Use
one of these names:

```text
cover.jpg
cover.jpeg
cover.png
cover.webp
```

Individual videos do not need embedded artwork. Folder covers are used for
video album cards.

## Lyrics

Lyrics can be stored beside songs or in the shared lyrics folder. English lyrics
are preferred when available.

Preferred sidecar order beside each song:

```text
01 - Song.flac
01 - Song.en.lrc
01 - Song.en.txt
01 - Song.lrc
01 - Song.txt
```

Shared lyrics folder example:

```text
Lyrics/
`-- Panorama - The Best of TAEYEON/
    |-- Panorama.txt
    `-- Letter To Myself.txt
```

Timed `.lrc` files highlight the current lyric line in Now Playing. Use
`.en.lrc` or `.en.txt` when you have an English translation.

## Remote Access

Choose the access mode based on how you want to use the player.

### Local

Play media directly on the computer running the server.

### Home Network (LAN)

Access your library from phones, tablets, and other devices connected to your
home network.

### Tailscale

Access your library remotely through your private Tailscale network.

### Cloudflare Web Share

Generate a temporary public link for sharing playback over the internet:

```powershell
python media_player.py --media-dir <media-folder> --host 0.0.0.0 --port 8767 --web-share
```

Cloudflare Web Share always runs in **read-only mode**:

- Metadata editing is disabled
- Local file paths are hidden from API responses
- Playback stays enabled
- Visitor entries use a hashed visitor key instead of storing raw IP addresses

Treat temporary links like something other people could open if they receive
them.

## Edit Mode

Edit Mode allows supported audio metadata and embedded artwork to be updated
from the browser.

Supported edits include:

- Title
- Artist
- Album
- Album Artist
- Track Number
- Date
- Genre
- Embedded Artwork

Edit Mode writes directly to MP3 and FLAC files. Use a copy or backup of your
media if you are experimenting.

Edit Mode can also be protected with a password:

```powershell
python media_player.py --media-dir <media-folder> --edit-password "your-password"
```

## Configuration

Most application behavior can be customized through
`media_player_config.json`.

To start from the example file:

```powershell
copy media_player_config.example.json media_player_config.json
```

Example:

```json
{
  "app_name": "Local Media Player",
  "music_dir": "Music",
  "video_dir": "Video",
  "text_dir": "Interviews",
  "text_tab_label": "Interviews",
  "lyrics_dir": "Lyrics",
  "preferred_categories": ["Albums", "Soundtracks"],
  "preferred_video_categories": ["Concerts"]
}
```

Configuration can control:

- Application name
- Library folder names
- Text archive label
- Preferred music and video categories
- Launch behavior

Keep passwords and private paths out of committed config files.

## Notes

This app is designed for local media libraries. It does not upload media
anywhere by itself. For internet sharing, prefer read-only web-share mode and
avoid exposing Edit Mode.
