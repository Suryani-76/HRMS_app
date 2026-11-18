@echo off
echo ==============================================
echo   Oklut HRMS - Automated Deploy and Git Push
echo ==============================================
cd /d "%~dp0"
if exist "hrms-app\scripts\deploy-push.mjs" (
  cd hrms-app
) else if exist "HRMS_app-main\hrms-app\scripts\deploy-push.mjs" (
  cd HRMS_app-main\hrms-app
)
node scripts\deploy-push.mjs
pause

