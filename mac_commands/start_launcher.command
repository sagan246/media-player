#!/bin/zsh

# Simple macOS launcher for the Media Player.
# Double-click this file in Finder, or run it from Terminal.

set -u

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
DEFAULT_MEDIA_DIR="$(cd "$APP_DIR/../.." && pwd)/media"

PYTHON_BIN="${PYTHON_BIN:-python3}"
MEDIA_DIR="${MEDIA_DIR:-$DEFAULT_MEDIA_DIR}"

echo "Media Player"
echo "============"
echo
echo "Media folder: $MEDIA_DIR"
echo
echo "Choose a launch mode:"
echo "  1) Local"
echo "  2) Home network (LAN)"
echo "  3) Private remote"
echo
printf "Mode [1]: "
read MODE
MODE="${MODE:-1}"

HOST="127.0.0.1"
PORT="8766"
URL="http://127.0.0.1:8766/"

case "$MODE" in
  1)
    HOST="127.0.0.1"
    PORT="8766"
    URL="http://127.0.0.1:8766/"
    ;;
  2)
    HOST="0.0.0.0"
    PORT="8766"
    LAN_IP="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "your-mac-ip")"
    URL="http://$LAN_IP:8766/"
    ;;
  3)
    HOST="0.0.0.0"
    PORT="8766"
    URL="http://127.0.0.1:8766/"
    ;;
  *)
    echo "Unknown mode: $MODE"
    exit 1
    ;;
esac

echo
echo "Starting server..."
echo "Open: $URL"
echo

(sleep 2; open "$URL" >/dev/null 2>&1) &

"$PYTHON_BIN" "$APP_DIR/media_player.py" \
  --media-dir "$MEDIA_DIR" \
  --host "$HOST" \
  --port "$PORT"

echo
echo "Server stopped."
printf "Press Enter to close this window."
read _
