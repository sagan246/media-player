@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
for %%I in ("%SCRIPT_DIR%..") do set "APP_DIR=%%~fI"
set "CODEX_PY=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"

if exist "%CODEX_PY%" (
  set "PYTHON_EXE=%CODEX_PY%"
) else (
  set "PYTHON_EXE=python"
)

start "Media Player Launcher" "%PYTHON_EXE%" "%APP_DIR%\launcher_gui.py"
