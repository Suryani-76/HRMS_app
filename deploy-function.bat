@echo off
echo ========================================================
echo   Deploying Enhanced send-email Edge Function to Supabase
echo ========================================================
cd /d "%~dp0\hrms-app"
echo.
echo Deploying to project qwygpcovmlobcmwcptvz...
npx supabase functions deploy send-email --no-verify-jwt
echo.
echo ========================================================
echo   DEPLOY COMPLETED!
echo ========================================================
pause

