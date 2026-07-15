# Design Notes

This app is a local-first media player for a personal music, video, lyrics, and
text archive.

## Goals

- Make local media easy to browse and play.
- Keep playback fast for large FLAC and video files.
- Work well on desktop and mobile browsers.
- Keep listening clean and editing separate.
- Hide local paths and editing tools in read-only sharing mode.

## UI Principles

- **Listen mode:** simple cards, queues, lyrics, stats, and playback controls.
- **Edit mode:** extra metadata, file details, and write tools.
- **Mobile:** playback-first, compact controls, no editing surface.
- **Desktop:** richer layouts, wider track lists, side panels, and edit tools.
- **Themes:** change accent colors without changing the layout.

## Main Screens

- **Music:** albums, sections, years, playlists, queues, lyrics, and Now Playing.
- **Video:** folder-based video albums, covers, queue, and resume support.
- **Interviews/Text:** a simple reader for local text files.
- **Stats:** lightweight listening summaries and top songs.
- **Customize:** theme selection.

## Editing

Edit mode can update supported MP3/FLAC metadata and embedded artwork.

Bulk edits should stay careful:

- Ignore empty fields.
- Refresh the library after writes.
- Clear selected rows after broad artwork changes.

## Sharing

Supported access modes:

- Local
- Home network
- Private remote access
- Temporary read-only web share

Read-only sharing disables metadata writes and hides local file paths.

## Non-Goals

- Full media-server replacement
- User accounts
- Cloud storage
- Permanent public hosting
- On-demand transcoding for every playback request
