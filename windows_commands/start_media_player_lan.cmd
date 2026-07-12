@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
for %%I in ("%SCRIPT_DIR%..") do set "APP_DIR=%%~fI"
for %%I in ("%APP_DIR%\..\..\media") do set "MEDIA=%%~fI"
set "APP=%APP_DIR%\media_player.py"
set "CODEX_PY=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"
set "PORT=8766"

if exist "%CODEX_PY%" (
  set "PYTHON=%CODEX_PY%"
) else (
  set "PYTHON=python"
)

echo Starting Local Media Player for phone/LAN access...
echo.
echo On this PC:
echo   http://127.0.0.1:%PORT%/
echo.
echo On another device, use this computer's LAN address:
echo   http://YOUR_LAN_IP:%PORT%/
echo.
echo Keep this window open while listening.
echo Press Ctrl+C to stop the server.
echo.

"%PYTHON%" "%APP%" --media-dir "%MEDIA%" --host 0.0.0.0 --port %PORT%

pause
