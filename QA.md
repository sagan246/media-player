# QA Checklist

Use this as a quick manual pass after UI, playback, or server changes.

## Startup

- Start local edit mode on port `8766`.
- Start read-only mode on port `8767`.
- Confirm the page loads on desktop.
- Confirm the page loads on a phone or tablet on the same network.

## Music

- Open the Music tab.
- Switch album views: newest, oldest, sections, year.
- Play an album from the main album grid.
- Open an album page and play a specific track.
- Confirm Next moves through the album or queue correctly.
- Open and close Music Queue.
- Reorder queue items.
- Test repeat off, repeat queue, and repeat one.
- Refresh the page and confirm queue/current song resume.
- Open Now Playing and confirm artwork, lyrics, visualizer, volume, and controls work.

## Video

- Open the Video tab.
- Open a video folder/album.
- Play a video.
- Switch to another tab and back, confirming the paused video returns.
- Open and close Video Queue.
- Reorder video queue items.
- Confirm mobile playback still works for browser-friendly MP4 files.

## Interviews

- Open the Interviews tab.
- Open and close Browse.
- Select an interview.
- Refresh and confirm the selected interview is remembered.
- Use Shuffle to open a random interview.

## Stats

- Open the Stats tab.
- Check Day, Week, Month, Year, and All Time.
- Use previous/next range controls.
- Click chart cells to drill down where supported.
- Click a top song and confirm playback starts without leaving the Stats tab.

## Customize

- Switch between dark and light themes.
- Confirm cards, browse menus, queues, tables, and Now Playing all update colors.
- Confirm the default theme loads after refresh.

## Edit Mode

- Switch to Edit Mode locally.
- Confirm metadata fields are visible.
- Confirm Listen Mode returns to the main listening screen.
- Do not test destructive metadata writes unless you are using test files.
