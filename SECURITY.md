# Security

This app is designed to run local-first.

## Safe Defaults

- Local mode binds to `127.0.0.1` by default.
- Web-share mode disables media metadata and embedded-artwork writes.
- Read-only mode disables the same media-file writes.
- Web-share API responses hide local file paths.
- Playlist files are separate application state. They remain mutable when
  `playlist_editable` is `true`, including in web-share mode.
- Guest Mode disables metadata and playlist writes and applies its configured
  album restriction to track APIs, audio streams, artwork, and lyrics.
- `--media-dir` is restricted to the expected media root or a descendant; it
  cannot be used to browse arbitrary directories through the server.
- `guest_album_dir` is an explicit trusted-config exception for Guest Mode. It
  can point outside the main media root, but only its matching configured album
  is exposed and local paths remain hidden in web-share mode.

## Recommendations

- Do not expose editable mode directly to the internet.
- Set `playlist_editable` to `false` when a shared link should not be able to
  create, rename, update, or delete playlists.
- Treat Cloudflare tunnel links like private links.
- Guest Mode is a focused sharing surface, not user authentication. Protect
  the server or tunnel link as you would any other private media link.
- Stop the server or tunnel when you are done sharing.
- Keep your media library backed up before using Edit Mode.

## Supported Security Boundary

The app is suitable for personal/local use, LAN use, private remote access, and
short-term read-only sharing.

It is not a hardened public media service with accounts, roles, or multi-user
permissions.

## Reporting Issues

If this project is hosted on GitHub, report security concerns through GitHub
Issues unless the repository owner provides another contact method.
