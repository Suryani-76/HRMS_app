@echo off
echo ========================================================
echo   OKLUT HRMS - Push Document Collection Email Template & Resend Fix
echo ========================================================
cd /d "%~dp0"
echo.
echo [1] Staging files...
git add -A
echo.
echo [2] Committing email template & resend trigger fix...
git commit -m "fix(recruitment): refined document collection email template copy and async trigger"
echo.
echo [3] Pushing to GitHub main...
git push origin main
echo.
echo ========================================================
echo   PUSH COMPLETED!
echo   Check Deployment: https://github.com/Suryani-76/HRMS_app/actions
echo ========================================================
pause
