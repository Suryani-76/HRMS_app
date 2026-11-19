@echo off
echo ========================================================
echo   OKLUT HRMS - Push Edge Function Diagnostic Logging
echo ========================================================
cd /d "%~dp0"
echo.
echo [1] Staging files...
git add -A
echo.
echo [2] Committing edge function response handling & diagnostics...
git commit -m "fix(email): log edge function error response and ensure reliable error reporting"
echo.
echo [3] Pushing to GitHub main...
git push origin main
echo.
echo ========================================================
echo   PUSH COMPLETED!
echo   Deployment: https://github.com/Suryani-76/HRMS_app/actions
echo ========================================================
pause
