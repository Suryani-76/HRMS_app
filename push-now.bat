@echo off
echo ========================================================
echo   OKLUT HRMS - Push Deployment Clean
echo ========================================================
cd /d "%~dp0"
echo.
echo [1] Staging files...
git add -A
echo.
echo [2] Committing clean build fix...
git commit -m "fix(recruitment): clean jsx syntax and deploy document collection email trigger"
echo.
echo [3] Pushing to GitHub main...
git push origin main
echo.
echo ========================================================
echo   PUSH COMPLETED!
echo   Check Deployment: https://github.com/Suryani-76/HRMS_app/actions
echo ========================================================
pause
