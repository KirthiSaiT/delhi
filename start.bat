@echo off
rem One-command launcher for Project VayuRakshak (Air Power Predictive Maintenance & Fleet Availability)
cd /d "%~dp0backend"

rem Check if port 8000 is already in use
netstat -ano | findstr /R /C:":8000 .*LISTENING" >nul 2>&1
if %errorlevel%==0 (
  echo [VayuRakshak] Platform is already running at http://127.0.0.1:8000 - launching browser...
  start "" http://127.0.0.1:8000
  goto :eof
)

if not exist models\rul_lgbm.joblib (
  echo [1/2] Training NASA C-MAPSS Turbofan RUL & Quantile Models...
  python -m app.train || goto :fail
)

if not exist ..\frontend\dist\index.html (
  echo [2/2] Building Tactical 3D Command Dashboard UI...
  pushd ..\frontend
  call npm install || goto :fail
  call npx vite build || goto :fail
  popd
)

echo.
echo =========================================================================
echo   PROJECT VAYURAKSHAK // AIR POWER DEFENSE PREDICTIVE MAINTENANCE SUITE
echo   Ministry of Defence (MoD) / DSSC · Smart India Hackathon
echo   Dashboard: http://127.0.0.1:8000
echo   OpenAPI Docs: http://127.0.0.1:8000/docs
echo =========================================================================
echo.
start "" http://127.0.0.1:8000
python -m uvicorn app.main:app --port 8000 --host 0.0.0.0
goto :eof

:fail
echo [VayuRakshak] Startup failed. Please check error output above.
exit /b 1
