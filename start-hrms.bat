@echo off
title Oklut HRMS Development Server
echo ========================================================
echo               STARTING OKLUT HRMS SERVER
echo ========================================================
echo.

:: Move into the hrms-app folder
cd /d "%~dp0hrms-app" 2>nul || cd /d "%~dp0" 2>nul

echo Working Directory: %cd%
echo.

:: Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in system PATH!
    echo Please install Node.js (v18+) from: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo [1/2] Launching browser to http://localhost:5174 ...
start http://localhost:5174

echo [2/2] Running 'npm run dev' ...
echo.
echo ========================================================
echo  Server is starting! Keep this window OPEN while testing.
echo  Press Ctrl + C to stop the server when done.
echo ========================================================
echo.
npm run dev

if %errorlevel% neq 0 (
    echo.
    echo Server stopped with error code %errorlevel%.
    pause
)

