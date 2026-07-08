@echo off
setlocal

set "PYTHON=C:\Users\chees\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"
set "APP=G:\cod\programs\taeyeon_media_player\taeyeon_media_player.py"
set "MEDIA=G:\cod\media"
set "PORT=8768"

echo Starting Taeyeon Media Player for private Tailscale access...
echo.
echo This mode is read-only and does not create a public internet link.
echo Use it when your phone and PC are both signed into Tailscale.
echo.

where tailscale >nul 2>nul
if %errorlevel%==0 (
  for /f "usebackq tokens=*" %%A in (`tailscale ip -4 2^>nul`) do set "TAILSCALE_IP=%%A"
) else if exist "%ProgramFiles%\Tailscale\tailscale.exe" (
  for /f "usebackq tokens=*" %%A in (`"%ProgramFiles%\Tailscale\tailscale.exe" ip -4 2^>nul`) do set "TAILSCALE_IP=%%A"
)

if defined TAILSCALE_IP (
  echo On your phone, open:
  echo   http://%TAILSCALE_IP%:%PORT%/
) else (
  echo Tailscale IP was not found.
  echo If Tailscale is installed and connected, run this in PowerShell to see your address:
  echo   tailscale ip -4
  echo Then open:
  echo   http://YOUR_TAILSCALE_IP:%PORT%/
)

echo.
echo On this PC:
echo   http://127.0.0.1:%PORT%/
echo.
echo Keep this window open while listening.
echo Press Ctrl+C to stop the server.
echo.

"%PYTHON%" "%APP%" --media-dir "%MEDIA%" --host 0.0.0.0 --port %PORT% --read-only

pause
