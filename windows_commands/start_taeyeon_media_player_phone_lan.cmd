@echo off
setlocal

set "PYTHON=C:\Users\chees\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"
set "APP=G:\cod\programs\taeyeon_media_player\taeyeon_media_player.py"
set "MEDIA=G:\cod\media"
set "PORT=8766"

echo Starting Taeyeon Media Player for phone/LAN access...
echo.
echo On this PC:
echo   http://127.0.0.1:%PORT%/
echo.
echo On your phone, use your PC LAN address, usually:
echo   http://10.0.0.160:%PORT%/
echo.
echo Keep this window open while listening.
echo Press Ctrl+C to stop the server.
echo.

"%PYTHON%" "%APP%" --media-dir "%MEDIA%" --host 0.0.0.0 --port %PORT%

pause
