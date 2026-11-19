@echo off
echo ========================================================
echo   OKLUT HRMS - Push All Email Triggers & Cloud Fix
echo ========================================================
cd /d "%~dp0"
echo.
echo [1] Staging files...
git add -A
echo.
echo [2] Committing all stage email triggers...
git commit -m "feat(email): wire interview scheduled, round passed, docs requested and status alert emails directly to UI actions"
echo.
echo [3] Pushing to GitHub main...
git push origin main
echo.
echo ========================================================
echo   PUSH COMPLETED!
echo   Deployment running on: https://github.com/Suryani-76/HRMS_app/actions
echo ========================================================
pause
