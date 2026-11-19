@echo off
echo ========================================================
echo   OKLUT HRMS - Running Email API & Logs Diagnostic
echo ========================================================
cd /d "%~dp0"
node test-mail-status.mjs
echo ========================================================
pause
