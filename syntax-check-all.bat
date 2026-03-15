@echo off
setlocal

cd /d "%~dp0"

if exist "syntax_check.bat" (
	call "syntax_check.bat"
) else (
	echo [ERROR] syntax_check.bat not found in %~dp0
	exit /b 1
)

endlocal
