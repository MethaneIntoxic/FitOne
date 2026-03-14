@echo off
setlocal enabledelayedexpansion

cd /d "C:\Users\admin\Desktop\random projs\FitOne"

set passed=0
set failed=0

echo.
echo === SYNTAX CHECK RESULTS ===
echo.

for %%F in (src\dataStore.js src\syncService.js src\wearableIntegration.js src\views\settingsView.js src\views\exportView.js src\views\logView.js src\views\protocolsView.js src\views\todayView.js src\views\analyticsView.js src\main.js pwa\sw.js sw.js) do (
    echo --- Checking: %%F ---
    node --check %%F 2>&1
    if !errorlevel! equ 0 (
        echo [PASSED] %%F
        set /a passed+=1
    ) else (
        echo [FAILED] %%F
        set /a failed+=1
    )
    echo.
)

echo === SUMMARY ===
echo Total Passed: !passed!
echo Total Failed: !failed!
echo Total Files: 12
