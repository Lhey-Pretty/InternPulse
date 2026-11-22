@echo off
title InternPulse Shutdown
color 0C

echo =================================================================
echo             STOPPING ALL INTERNPULSE SERVICES                    
echo =================================================================
echo.
echo Stopping InternPulse services running on ports 8001, 5173, 5174, 5175...
taskkill /fi "WINDOWTITLE eq InternPulse - Laravel Queue Worker" /t /f >nul 2>&1

for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8001 ^| findstr LISTENING') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173 ^| findstr LISTENING') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5174 ^| findstr LISTENING') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5175 ^| findstr LISTENING') do taskkill /f /pid %%a >nul 2>&1

echo.
echo All InternPulse servers have been stopped!
echo =================================================================
timeout /t 3 >nul
