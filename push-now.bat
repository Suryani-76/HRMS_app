@echo off
echo ========================================================
echo   OKLUT HRMS - Push CandidateVerificationDoc TypeScript Fix
echo ========================================================
cd /d "%~dp0"
echo.
echo [1] Staging files...
git add -A
echo.
echo [2] Committing interface fix...
git commit -m "fix(types): add fileUrl optional property to CandidateVerificationDoc interface"
echo.
echo [3] Pushing to GitHub main...
git push origin main
echo.
echo ========================================================
echo   PUSH COMPLETED! Check actions at:
echo   https://github.com/Suryani-76/HRMS_app/actions
echo ========================================================
pause
