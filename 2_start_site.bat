@echo off
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js is not installed. Install it from https://nodejs.org then try again. & pause & exit /b)
echo.
echo  The Twins is starting. Your browser will open in 3 seconds.
echo  DO NOT CLOSE THIS WINDOW while using the site.
echo.
start "" cmd /c "timeout /t 3 >nul & start http://127.0.0.1:5000/admin"
npm start
pause
