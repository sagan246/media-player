# Usage

## Start the Player

Use the included launcher for the simplest setup:

```text
windows_commands/start_launcher.cmd
mac_commands/start_launcher.command
```

The plain launchers start local mode on port `8766`.

```text
windows_commands/start_player.cmd
mac_commands/start_player.command
```

## Configuration

Copy `media_player_config.example.json` to `media_player_config.json`, then
adjust the paths and labels for your library.

Important settings:

- `app_name` - browser title.
- `music_dir`, `video_dir`, `text_dir` - folders inside the media directory.
- `text_tab_label` - label for the text archive tab.
- `preferred_categories` and `preferred_video_categories` - browse order.
- `playlist_editable` - allow playlist create, update, rename, and delete.

Media tags and embedded artwork are read-only in every mode.

## Library Layout

```text
Media/
|-- Music/
|-- Video/
`-- Interviews/
```

If `Music` is absent, the selected media folder itself is scanned for audio.
Optional missing folders appear as empty tabs.

Music artwork comes from embedded audio tags. Video folders may contain
`cover.jpg`, `cover.jpeg`, `cover.png`, or `cover.webp`.

Lyrics should live beside the matching song. Lookup prefers:

```text
01 - Song.en.lrc
01 - Song.en.txt
01 - Song.lrc
01 - Song.txt
```

## Access Modes

- Local: `http://127.0.0.1:8766/`
- LAN: bind to `0.0.0.0`, then use `http://<lan-address>:8766/`
- Web share: run with `--web-share` on port `8767`
- Private remote: use the launcher with Tailscale

Web-share mode hides local paths. It does not provide authentication. Playlist
changes remain available when `playlist_editable` is enabled.

## Command Line

```powershell
python media_player.py --media-dir <media-folder>
python media_player.py --media-dir <media-folder> --host 0.0.0.0 --port 8766
python media_player.py --media-dir <media-folder> --host 0.0.0.0 --port 8767 --web-share
```

`--media-dir` is validated against the configured media root.
