@echo off
setlocal

rem Summarize the private web-share visitor log.
set "SCRIPT_DIR=%~dp0"
for %%I in ("%SCRIPT_DIR%..") do set "APP_DIR=%%~fI"
set "VISITOR_LOG=%APP_DIR%\taeyeon_media_player_visitors.jsonl"

if not exist "%VISITOR_LOG%" (
  echo No visitor log found yet.
  echo.
  echo Expected:
  echo %VISITOR_LOG%
  echo.
  echo Start web-share mode and visit the public link first.
  pause
  exit /b 0
)

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$rows = Get-Content '%VISITOR_LOG%' | Where-Object { $_.Trim() } | ForEach-Object { try { $_ | ConvertFrom-Json } catch { $null } } | Where-Object { $_ }; " ^
  "if(-not $rows){ Write-Host 'Visitor log is empty.'; exit }; " ^
  "$botPattern = 'bot|crawler|spider|preview|discord|slack|twitter|facebookexternalhit|whatsapp|telegram|embed|linkexpanding'; " ^
  "$humans = @($rows | Where-Object { [string]$_.user_agent -notmatch $botPattern }); " ^
  "$bots = @($rows | Where-Object { [string]$_.user_agent -match $botPattern }); " ^
  "$unique = $rows | Group-Object visitor; " ^
  "$uniqueHumans = $humans | Group-Object visitor; " ^
  "$uniqueBots = $bots | Group-Object visitor; " ^
  "Write-Host ''; " ^
  "Write-Host 'Taeyeon Media Player - Web Share Visitors'; " ^
  "Write-Host '=========================================='; " ^
  "Write-Host ('Total page loads:       ' + $rows.Count); " ^
  "Write-Host ('Human page loads:       ' + $humans.Count); " ^
  "Write-Host ('Bot/preview page loads: ' + $bots.Count); " ^
  "Write-Host ('Unique humans:          ' + $uniqueHumans.Count); " ^
  "Write-Host ('Unique bots/previews:   ' + $uniqueBots.Count); " ^
  "Write-Host ('First log entry:   ' + ($rows | Select-Object -First 1).time); " ^
  "Write-Host ('Latest log entry:  ' + ($rows | Select-Object -Last 1).time); " ^
  "Write-Host ''; " ^
  "Write-Host 'Human visitors:'; " ^
  "if($uniqueHumans){ $uniqueHumans | Sort-Object Count -Descending | ForEach-Object { $last = $_.Group | Select-Object -Last 1; Write-Host ('  ' + $_.Count + ' visits  ' + $_.Name + '  last: ' + $last.time) } } else { Write-Host '  None yet.' }; " ^
  "Write-Host ''; " ^
  "Write-Host 'Bots/link previews:'; " ^
  "if($uniqueBots){ $uniqueBots | Sort-Object Count -Descending | ForEach-Object { $last = $_.Group | Select-Object -Last 1; Write-Host ('  ' + $_.Count + ' visits  ' + $_.Name + '  last: ' + $last.time); Write-Host ('    ' + $last.user_agent) } } else { Write-Host '  None detected.' }; " ^
  "Write-Host ''; " ^
  "Write-Host 'Latest visits:'; " ^
  "$rows | Select-Object -Last 12 | ForEach-Object { $kind = if([string]$_.user_agent -match $botPattern){'bot'}else{'human'}; Write-Host ('  ' + $_.time + '  ' + $kind + '  ' + $_.visitor); Write-Host ('    ' + $_.user_agent) }; "

echo.
pause
