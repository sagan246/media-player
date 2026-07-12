@echo off
setlocal

rem Start the internet/share mode: playback works, editing is disabled, paths are hidden.
set "SCRIPT_DIR=%~dp0"
for %%I in ("%SCRIPT_DIR%..") do set "APP_DIR=%%~fI"
for %%I in ("%APP_DIR%\..\..\media") do set "MEDIA_DIR=%%~fI"
set "CODEX_PY=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"

if exist "%CODEX_PY%" (
  set "PYTHON_EXE=%CODEX_PY%"
) else (
  set "PYTHON_EXE=python"
)

echo Starting Local Media Player in web-share mode...
echo App:   %APP_DIR%
echo Media: %MEDIA_DIR%
echo URL:   http://0.0.0.0:8767/
echo.
echo Web-share mode is read-only and hides local file paths.
echo.

"%PYTHON_EXE%" "%APP_DIR%\media_player.py" --media-dir "%MEDIA_DIR%" --host 0.0.0.0 --port 8767 --web-share

pause
