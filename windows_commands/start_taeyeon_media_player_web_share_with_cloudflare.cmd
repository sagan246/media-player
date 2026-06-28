@echo off
setlocal

rem Start web-share mode and a temporary Cloudflare Tunnel for quick sharing.
set "SCRIPT_DIR=%~dp0"
for %%I in ("%SCRIPT_DIR%..") do set "APP_DIR=%%~fI"
for %%I in ("%APP_DIR%\..\..\media") do set "MEDIA_DIR=%%~fI"
for %%I in ("%APP_DIR%\..\codex\tools\cloudflared.exe") do set "CLOUDFLARED=%%~fI"
set "CODEX_PY=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"
set "TUNNEL_LOG=%TEMP%\taeyeon_media_player_cloudflare_tunnel.log"

if exist "%CODEX_PY%" (
  set "PYTHON_EXE=%CODEX_PY%"
) else (
  set "PYTHON_EXE=python"
)

if not exist "%CLOUDFLARED%" (
  echo Could not find cloudflared here:
  echo %CLOUDFLARED%
  echo.
  echo Start the web-share player without Cloudflare instead:
  echo %SCRIPT_DIR%start_taeyeon_media_player_web_share.cmd
  pause
  exit /b 1
)

echo Starting Taeyeon Media Player web-share mode on port 8767...
echo A second window will open with the Cloudflare public URL.
echo Close both windows when you are done sharing.
echo.

start "Taeyeon Media Player Web Share" cmd /k ""%PYTHON_EXE%" "%APP_DIR%\taeyeon_media_player.py" --media-dir "%MEDIA_DIR%" --host 0.0.0.0 --port 8767 --web-share"

echo Waiting a moment for the player to start...
timeout /t 3 /nobreak >nul

if exist "%TUNNEL_LOG%" del "%TUNNEL_LOG%"

start "Taeyeon Media Player Cloudflare Tunnel" powershell -NoExit -ExecutionPolicy Bypass -Command "& '%CLOUDFLARED%' tunnel --url http://127.0.0.1:8767 2>&1 | Tee-Object -FilePath '%TUNNEL_LOG%'"

echo.
echo Waiting for the Cloudflare public link...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$deadline=(Get-Date).AddSeconds(45); $opened=$false; while((Get-Date) -lt $deadline -and -not $opened){ if(Test-Path '%TUNNEL_LOG%'){ $text=Get-Content '%TUNNEL_LOG%' -Raw -ErrorAction SilentlyContinue; if($text -match 'https://[^\s]+\.trycloudflare\.com'){ $url=$Matches[0]; Write-Host ('Opening ' + $url); Start-Process $url; $opened=$true; } }; Start-Sleep -Milliseconds 500 }; if(-not $opened){ Write-Host 'Could not find the Cloudflare link yet. Check the Cloudflare window.' }"
echo.
pause
