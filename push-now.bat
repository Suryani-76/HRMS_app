@echo off
echo ========================================================
echo   OKLUT HRMS - Push Document Collection in Interviews Tab
echo ========================================================
cd /d "%~dp0"
echo.
echo [1] Staging files...
git add -A
echo.
echo [2] Committing Document Collection status in Interviews...
git commit -m "feat(interviews): add Document Collection option to status dropdown & trigger email"
echo.
echo [3] Pushing to GitHub main...
git push origin main
echo.
echo ========================================================
echo   PUSH COMPLETED!
echo   Check Deployment: https://github.com/Suryani-76/HRMS_app/actions
echo ========================================================
pause
