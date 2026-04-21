@echo off
echo ===============================================
echo   Grand Palace Hotel - Billing System
echo ===============================================
echo.
echo [1/2] Starting Backend Server...
cd /d "%~dp0backend"
start cmd /k "echo Backend starting... && npm install && npm run dev"
echo.
echo [2/2] Opening Frontend...
timeout /t 4 /nobreak >nul
start "" "%~dp0frontend\index.html"
echo.
echo System started!
echo Backend: http://localhost:5000
echo Frontend: Open index.html in browser
echo.
echo Press any key to exit...
pause >nul
