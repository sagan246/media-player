# Security

This app is designed to run local-first.

## Safe Defaults

- Local mode binds to `127.0.0.1` by default.
- Web-share mode is read-only.
- Read-only mode disables metadata writes.
- Web-share API responses hide local file paths.

## Recommendations

- Do not expose editable mode directly to the internet.
- Use read-only mode for temporary sharing.
- Treat Cloudflare tunnel links like private links.
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
