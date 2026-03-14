@echo off
setlocal enabledelayedexpansion

REM Change to project directory
cd /d "C:\Users\admin\Desktop\random projs\FitOne"

set "passed_count=0"
set "failed_count=0"
set "passed_files="
set "failed_files="

REM Check each file
for %%f in (
  "src\dataStore.js"
  "src\syncService.js"
  "src\wearableIntegration.js"
  "src\views\settingsView.js"
  "src\views\exportView.js"
  "src\views\logView.js"
  "src\views\protocolsView.js"
  "src\views\todayView.js"
  "src\views\analyticsView.js"
  "src\main.js"
  "pwa\sw.js"
  "sw.js"
) do (
  set "file=%%f"
  if exist !file! (
    echo.
    echo Checking: !file!
    node --check "!file!" 2>&1
    if !errorlevel! equ 0 (
      set /a passed_count+=1
      set "passed_files=!passed_files! !file!"
      echo PASSED
    ) else (
      set /a failed_count+=1
      set "failed_files=!failed_files! !file!"
      echo FAILED
    )
  ) else (
    echo.
    echo Checking: !file!
    echo FILE NOT FOUND
    set /a failed_count+=1
    set "failed_files=!failed_files! !file!"
  )
)

REM Print summary
echo.
echo ===== SUMMARY =====
echo Passed: %passed_count%
echo Failed: %failed_count%
echo.
if %passed_count% gtr 0 (
  echo PASSED FILES:
  for %%f in (%passed_files%) do (
    echo   - %%f
  )
)
echo.
if %failed_count% gtr 0 (
  echo FAILED FILES:
  for %%f in (%failed_files%) do (
    echo   - %%f
  )
)
