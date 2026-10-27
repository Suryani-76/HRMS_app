@echo off
setlocal EnableExtensions EnableDelayedExpansion
title OKLUT HRMS Development Server
color 0A

echo ========================================================
echo               OKLUT HRMS - STARTING SERVER              
echo ========================================================
echo.

cd /d "%~dp0"
echo Working Directory: %CD%
echo.

where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    color 0C
    echo [ERROR] Node.js is not detected in your PATH.
    pause
    exit /b 1
)

echo Starting Vite dev server on http://localhost:5174/ ...
start "" "http://localhost:5174/"

call npm run dev
if %ERRORLEVEL% neq 0 (
    call node node_modules\vite\bin\vite.js
)

pause
