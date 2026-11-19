@echo off
echo ========================================================
echo   OKLUT HRMS - Push Deployment Fix
echo ========================================================
cd /d "%~dp0"
echo.
echo [1] Staging files...
git add -A
echo.
echo [2] Committing imports and date_of_birth typing fix...
git commit -m "fix(recruitment): import sendCandidateStatusAlertEmail and sendOfferLetterReleasedAlertEmail, sanitize dateOfBirth"
echo.
echo [3] Pushing to GitHub main...
git push origin main
echo.
echo ========================================================
echo   PUSH COMPLETED!
echo   Monitor deployment: https://github.com/Suryani-76/HRMS_app/actions
echo ========================================================
pause
