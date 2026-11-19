@echo off
echo ========================================================
echo   OKLUT HRMS - Push Document Collection Email Fix
echo ========================================================
cd /d "%~dp0"
echo.
echo [1] Staging files...
git add -A
echo.
echo [2] Committing document collection email fixes...
git commit -m "fix(recruitment): ensure document collection email triggers on interview pass and stage change"
echo.
echo [3] Pushing to GitHub main...
git push origin main
echo.
echo ========================================================
echo   PUSH COMPLETED!
echo   Check Deployment: https://github.com/Suryani-76/HRMS_app/actions
echo ========================================================
pause
