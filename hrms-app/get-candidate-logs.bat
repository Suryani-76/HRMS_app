@echo off
echo ========================================================
echo   Retrieving Latest Candidate & Email Logs from Supabase
echo ========================================================
cd /d "%~dp0"
node get-candidate-logs.mjs
echo.
echo ========================================================
pause
