@echo off
echo ===================================================
echo   OKLUT HRMS - Supabase SMTP Log Audit & Trigger
echo ===================================================
cd /d "%~dp0"
if exist "hrms-app\scripts\run-smtp-audit-test.mjs" (
  cd hrms-app
) else if exist "HRMS_app-main\hrms-app\scripts\run-smtp-audit-test.mjs" (
  cd HRMS_app-main\hrms-app
)
node scripts\run-smtp-audit-test.mjs
pause

