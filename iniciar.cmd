@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Instale o Node.js 20 ou superior para iniciar o NexoStock.
  pause
  exit /b 1
)
start "NexoStock" /b cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:3210"
node server.js
pause
