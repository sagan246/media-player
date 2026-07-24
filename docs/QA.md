# QA Checklist

## Startup

- Start local mode on port `8766`.
- Start web-share mode on port `8767`.
- Confirm desktop and mobile pages load.
- Confirm web-share responses do not expose local paths.

## Music

- Switch newest, oldest, sections, and year views.
- Play an album and an individual track.
- Verify Next, Previous, repeat, queue reorder, and queue resume.
- Create, update, rename, open, and delete a playlist.
- Refresh and confirm current track and queue resume.
- Check artwork, lyrics, visualizer, volume, and lock-screen controls.

## Video

- Open a video folder and play a video.
- Switch tabs and confirm the paused video returns.
- Reorder and resume the video queue.
- Test a browser-friendly MP4 on mobile.

## Other Tabs

- Open, shuffle, and restore an interview.
- Check Day, Week, Month, Year, and All Time stats.
- Switch light/dark and accent themes.
- Open the Game and verify normal, paused, and cat modes.

## Regression Checks

- Audio and video seeking returns HTTP `206` for Range requests.
- Playing media does not trigger tag or artwork parsing.
- Missing optional folders produce usable empty states.
- Invalid playlist IDs and track IDs return JSON errors without server traces.
