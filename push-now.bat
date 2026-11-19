@echo off
echo ========================================================
echo   OKLUT HRMS - Push Storage Cloud Upload Update
echo ========================================================
cd /d "%~dp0"
echo.
echo [1] Staging changes...
git add -A
echo.
echo [2] Committing Supabase Storage integration...
git commit -m "feat: upload candidate verification docs directly to Supabase Storage candidate-documents bucket"
echo.
echo [3] Pushing to GitHub main branch...
git push origin main
echo.
echo ========================================================
echo   PUSH COMPLETED!
echo   Deployment running on: https://github.com/Suryani-76/HRMS_app/actions
echo ========================================================
pause
