@echo off
title Inspect CAND-J3BQZX & Send Test Email
color 0B
echo ========================================================
echo   OKLUT HRMS - Inspect Candidate CAND-J3BQZX & Send Email
echo ========================================================
echo.
cd /d "%~dp0\hrms-app"
node inspect-cand.mjs
echo.
echo ========================================================
pause

