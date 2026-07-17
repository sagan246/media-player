@echo off
setlocal

rem Reset the shared human-game world record without starting the server.
set "SCRIPT_DIR=%~dp0"
for %%I in ("%SCRIPT_DIR%..") do set "APP_DIR=%%~fI"
set "CODEX_PY=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"

if exist "%CODEX_PY%" (
  set "PYTHON_EXE=%CODEX_PY%"
) else (
  set "PYTHON_EXE=python"
)

echo This will reset the shared game world record to 0.
choice /C YN /N /M "Continue? [Y/N] "
if errorlevel 2 exit /b 0

echo.
"%PYTHON_EXE%" "%APP_DIR%\media_player.py" --reset-game-record
if errorlevel 1 (
  echo.
  echo The world record could not be reset.
)

echo.
pause
