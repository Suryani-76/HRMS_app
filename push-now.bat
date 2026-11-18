@echo off
echo ============================================
echo   OKLUT HRMS - Push and Auto-Deploy Fix
echo ============================================
cd /d "%~dp0"
echo.
echo [1] Checking status...
git status --short
echo.
echo [2] Staging all files...
git add -A
echo.
echo [3] Committing TypeScript and Vite fixes...
git commit -m "fix(ci): resolve tsc errors in smtp-scenario-runner and settings-page for clean deployment"
echo.
echo [4] Pushing to GitHub main branch...
git push origin main
echo.
echo ============================================
echo   PUSH COMPLETED!
echo   GitHub Actions will now build and deploy.
echo   Check status: https://github.com/Suryani-76/HRMS_app/actions
echo ============================================
pause
