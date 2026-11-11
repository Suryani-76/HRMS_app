@echo off
cd /d "%~dp0"
echo === Committing TypeScript build fix ===
git add hrms-app\src\pages\payroll-page.tsx hrms-app\src\lib\api\core.ts
git commit -m "Fix TS build errors: replace .catch() chains with try/catch, fix fetchPayroll fallback query"
echo === Pushing to GitHub ===
git push origin main
echo.
echo === Done! Check GitHub Actions: https://github.com/Suryani-76/HRMS_app/actions ===
pause

