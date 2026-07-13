#!/bin/zsh

# Start the normal local media player with edit mode available.

set -u

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
MEDIA_DIR="${MEDIA_DIR:-$(cd "$APP_DIR/../.." && pwd)/media}"
PYTHON_BIN="${PYTHON_BIN:-python3}"
URL="http://127.0.0.1:8766/"

echo "Starting Media Player..."
echo "App:   $APP_DIR"
echo "Media: $MEDIA_DIR"
echo "URL:   $URL"
echo

(sleep 2; open "$URL" >/dev/null 2>&1) &

"$PYTHON_BIN" "$APP_DIR/media_player.py" \
  --media-dir "$MEDIA_DIR" \
  --host 127.0.0.1 \
  --port 8766

echo
echo "Server stopped."
printf "Press Enter to close this window."
read _
