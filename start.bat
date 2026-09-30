@echo off
rem One-command launcher for AirCouple: trains (first run only), builds the UI (first run only), serves everything on :8000
cd /d "%~dp0backend"

if not exist models\models.joblib (
  echo [1/3] No trained model found - training now ^(about 25 min the first time, downloads cached history^)...
  python -m app.train || goto :fail
)
if not exist cache\backtest.json (
  echo [2/3] Generating the Nov 2025 backtest replay...
  python -m app.backtest
)
if not exist ..\frontend\dist\index.html (
  echo [3/3] Building the dashboard UI...
  pushd ..\frontend
  call npm install || goto :fail
  call npm run build || goto :fail
  popd
)

echo.
echo AirCouple running at http://127.0.0.1:8000   ^(Ctrl+C to stop^)
start "" http://127.0.0.1:8000
python -m uvicorn app.main:app --port 8000
goto :eof

:fail
echo Setup failed - see the messages above.
exit /b 1
