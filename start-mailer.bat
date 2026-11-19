

@echo off
title OKLUT HRMS - SMTP Background Mailer
color 0A
echo ========================================================
echo        OKLUT HRMS - 24/7 BACKGROUND SMTP MAILER
echo ========================================================
echo.
echo Supabase Project: qwygpcovmlobcmwcptvz
echo SMTP Host:        kindle.herosite.pro:465
echo Sender Account:   hr@oklut.com
echo.
echo Checking for pending emails in Supabase every 10 seconds...
echo Keep this window OPEN or MINIMIZED to process all emails!
echo.
echo ========================================================
echo.

cd /d "%~dp0\hrms-app"
node scripts/smtp-daemon.mjs

pause

