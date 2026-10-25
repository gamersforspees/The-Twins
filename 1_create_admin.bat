@echo off
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js is not installed. Install it from https://nodejs.org then try again. & pause & exit /b)
npm run create-admin
pause
