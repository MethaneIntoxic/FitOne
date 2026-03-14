@echo off
setlocal enabledelayedexpansion

cd /d "C:\Users\admin\Desktop\random projs\FitOne"

set PASSED=0
set FAILED=0

REM Create temporary files to store results
echo. > results.txt

echo Checking: src\dataStore.js
node --check "src\dataStore.js" >nul 2>&1
if !ERRORLEVEL! equ 0 (
    echo [PASS] src\dataStore.js
    set /a PASSED+=1
) else (
    echo [FAIL] src\dataStore.js
    for /f "tokens=*" %%A in ('node --check "src\dataStore.js" 2^>^&1') do echo   %%A
    set /a FAILED+=1
)

echo Checking: src\syncService.js
node --check "src\syncService.js" >nul 2>&1
if !ERRORLEVEL! equ 0 (
    echo [PASS] src\syncService.js
    set /a PASSED+=1
) else (
    echo [FAIL] src\syncService.js
    for /f "tokens=*" %%A in ('node --check "src\syncService.js" 2^>^&1') do echo   %%A
    set /a FAILED+=1
)

echo Checking: src\wearableIntegration.js
node --check "src\wearableIntegration.js" >nul 2>&1
if !ERRORLEVEL! equ 0 (
    echo [PASS] src\wearableIntegration.js
    set /a PASSED+=1
) else (
    echo [FAIL] src\wearableIntegration.js
    for /f "tokens=*" %%A in ('node --check "src\wearableIntegration.js" 2^>^&1') do echo   %%A
    set /a FAILED+=1
)

echo Checking: src\views\settingsView.js
node --check "src\views\settingsView.js" >nul 2>&1
if !ERRORLEVEL! equ 0 (
    echo [PASS] src\views\settingsView.js
    set /a PASSED+=1
) else (
    echo [FAIL] src\views\settingsView.js
    for /f "tokens=*" %%A in ('node --check "src\views\settingsView.js" 2^>^&1') do echo   %%A
    set /a FAILED+=1
)

echo Checking: src\views\exportView.js
node --check "src\views\exportView.js" >nul 2>&1
if !ERRORLEVEL! equ 0 (
    echo [PASS] src\views\exportView.js
    set /a PASSED+=1
) else (
    echo [FAIL] src\views\exportView.js
    for /f "tokens=*" %%A in ('node --check "src\views\exportView.js" 2^>^&1') do echo   %%A
    set /a FAILED+=1
)

echo Checking: src\views\logView.js
node --check "src\views\logView.js" >nul 2>&1
if !ERRORLEVEL! equ 0 (
    echo [PASS] src\views\logView.js
    set /a PASSED+=1
) else (
    echo [FAIL] src\views\logView.js
    for /f "tokens=*" %%A in ('node --check "src\views\logView.js" 2^>^&1') do echo   %%A
    set /a FAILED+=1
)

echo Checking: src\views\protocolsView.js
node --check "src\views\protocolsView.js" >nul 2>&1
if !ERRORLEVEL! equ 0 (
    echo [PASS] src\views\protocolsView.js
    set /a PASSED+=1
) else (
    echo [FAIL] src\views\protocolsView.js
    for /f "tokens=*" %%A in ('node --check "src\views\protocolsView.js" 2^>^&1') do echo   %%A
    set /a FAILED+=1
)

echo Checking: src\views\todayView.js
node --check "src\views\todayView.js" >nul 2>&1
if !ERRORLEVEL! equ 0 (
    echo [PASS] src\views\todayView.js
    set /a PASSED+=1
) else (
    echo [FAIL] src\views\todayView.js
    for /f "tokens=*" %%A in ('node --check "src\views\todayView.js" 2^>^&1') do echo   %%A
    set /a FAILED+=1
)

echo Checking: src\views\analyticsView.js
node --check "src\views\analyticsView.js" >nul 2>&1
if !ERRORLEVEL! equ 0 (
    echo [PASS] src\views\analyticsView.js
    set /a PASSED+=1
) else (
    echo [FAIL] src\views\analyticsView.js
    for /f "tokens=*" %%A in ('node --check "src\views\analyticsView.js" 2^>^&1') do echo   %%A
    set /a FAILED+=1
)

echo Checking: src\main.js
node --check "src\main.js" >nul 2>&1
if !ERRORLEVEL! equ 0 (
    echo [PASS] src\main.js
    set /a PASSED+=1
) else (
    echo [FAIL] src\main.js
    for /f "tokens=*" %%A in ('node --check "src\main.js" 2^>^&1') do echo   %%A
    set /a FAILED+=1
)

echo Checking: pwa\sw.js
node --check "pwa\sw.js" >nul 2>&1
if !ERRORLEVEL! equ 0 (
    echo [PASS] pwa\sw.js
    set /a PASSED+=1
) else (
    echo [FAIL] pwa\sw.js
    for /f "tokens=*" %%A in ('node --check "pwa\sw.js" 2^>^&1') do echo   %%A
    set /a FAILED+=1
)

echo Checking: sw.js
node --check "sw.js" >nul 2>&1
if !ERRORLEVEL! equ 0 (
    echo [PASS] sw.js
    set /a PASSED+=1
) else (
    echo [FAIL] sw.js
    for /f "tokens=*" %%A in ('node --check "sw.js" 2^>^&1') do echo   %%A
    set /a FAILED+=1
)

echo.
echo ========================================
echo SYNTAX CHECK SUMMARY
echo ========================================
echo Passed: !PASSED!
echo Failed: !FAILED!
echo Total:  12
echo ========================================

endlocal
