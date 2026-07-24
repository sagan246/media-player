@echo off
setlocal

rem Start the normal local media player.
set "SCRIPT_DIR=%~dp0"
for %%I in ("%SCRIPT_DIR%..") do set "APP_DIR=%%~fI"
for %%I in ("%APP_DIR%\..\..\media") do set "MEDIA_DIR=%%~fI"
set "CODEX_PY=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"

if exist "%CODEX_PY%" (
  set "PYTHON_EXE=%CODEX_PY%"
) else (
  set "PYTHON_EXE=python"
)

echo Starting Media Player...
echo App:   %APP_DIR%
echo Media: %MEDIA_DIR%
echo URL:   http://127.0.0.1:8766/
echo.

"%PYTHON_EXE%" "%APP_DIR%\media_player.py" --media-dir "%MEDIA_DIR%" --host 127.0.0.1 --port 8766

pause
