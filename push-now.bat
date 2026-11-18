@echo off
echo ============================================
echo   OKLUT HRMS - Git Push to GitHub
echo ============================================
cd /d "%~dp0"
echo.
echo [1] Adding all changes...
git add -A
echo.
echo [2] Committing...
git commit -m "fix: remove auto git-push on vite startup + remove audit test auto-trigger from App.tsx"
echo.
echo [3] Pushing to origin main (GitHub)...
git push origin main
echo.
echo [4] Done! Check GitHub Actions for deployment:
echo     https://github.com/Suryani-76/HRMS_app/actions
echo.
pause

