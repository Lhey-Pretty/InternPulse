@echo off
title InternPulse Full Stack Launcher
color 0B

echo =================================================================
echo             INTERNPULSE - FULL STACK SYSTEM LAUNCHER             
echo =================================================================
echo.
echo Cleaning up any old background instances on ports 8001, 5173...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8001 ^| findstr LISTENING') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173 ^| findstr LISTENING') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5174 ^| findstr LISTENING') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5175 ^| findstr LISTENING') do taskkill /f /pid %%a >nul 2>&1

echo.
echo Starting all microservices and frontend...
echo.

echo [1/3] Checking Laravel API through Laragon Apache...
curl.exe -fsS http://localhost/InternPulse/backend/public/up >nul
if errorlevel 1 (
  echo ERROR: Laragon Apache is unavailable. Start Apache in Laragon, then run this file again.
  pause
  exit /b 1
)

echo [2/3] Starting Machine Learning Service (Port 8001)...
start "InternPulse - ML Microservice (Python)" cmd /k "cd /d %~dp0ml && python run.py"

echo [3/3] Starting React Frontend (Port 5173)...
start "InternPulse - Frontend (React + Vite)" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo Waiting 3 seconds for servers to initialize...
timeout /t 3 >nul

echo Opening React Web Portal in your default browser...
start http://localhost:5173

echo.
echo =================================================================
echo   ALL SERVICES ARE NOW RUNNING!
echo.
echo   * React Frontend : http://localhost:5173
echo   * Laravel API    : http://localhost/InternPulse/backend/public/api/v1
echo   * ML Service     : http://127.0.0.1:8001
echo =================================================================
echo.
echo To stop everything later, run stop-all.bat or close their windows.
echo Press any key to exit this launcher window...
pause > nul
