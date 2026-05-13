@echo off
setlocal EnableExtensions EnableDelayedExpansion
set "ROOT=%~dp0"
set "FRONTEND_PORT=5173"
set "BACKEND_PORT=8001"

if exist "%ROOT%.env" (
  for /f "usebackq tokens=1,* delims==" %%A in ("%ROOT%.env") do (
    if /i "%%A"=="FRONTEND_PORT" set "FRONTEND_PORT=%%B"
    if /i "%%A"=="BACKEND_PORT" set "BACKEND_PORT=%%B"
  )
)

if not exist "%ROOT%frontend\node_modules" (
  echo Frontend dependencies not found. Run setup.bat first.
  exit /b 1
)

start "Boilerplate Backend" cmd /k "cd /d ""%ROOT%backend"" && py -3 -m uvicorn app.main:app --reload --host 127.0.0.1 --port %BACKEND_PORT%"
start "Boilerplate Frontend" cmd /k "cd /d ""%ROOT%frontend"" && npm run dev -- --host 127.0.0.1 --port %FRONTEND_PORT%"

echo Started frontend on port %FRONTEND_PORT% and backend on port %BACKEND_PORT%.
endlocal
