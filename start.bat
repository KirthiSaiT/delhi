@echo off
rem One-command launcher for AirCouple: trains (first run only), builds the UI (first run only), serves everything on :8000
cd /d "%~dp0backend"

rem If a copy is already running on port 8000, just open it instead of failing with "address already in use"
netstat -ano | findstr /R /C:":8000 .*LISTENING" >nul 2>&1
if %errorlevel%==0 (
  echo AirCouple is already running at http://127.0.0.1:8000 - opening it.
  echo To restart it, close the other window first ^(or use Task Manager to end python.exe^).
  start "" http://127.0.0.1:8000
  goto :eof
)

if not exist models\models.joblib (
  echo [1/5] No trained model found - training now ^(about 25 min the first time, downloads cached history^)...
  python -m app.train || goto :fail
)
if not exist models\models_q.joblib (
  echo [2/5] Training the uncertainty ^(likely range^) models...
  python -m app.uncertainty
)
if not exist cache\validation.json (
  echo [3/5] Generating the validation report...
  python -m app.validation
)
if not exist cache\backtest.json (
  echo [4/5] Generating the Nov 2025 backtest replay...
  python -m app.backtest
)
if not exist ..\frontend\dist\index.html (
  echo [5/5] Building the dashboard UI...
  pushd ..\frontend
  call npm install || goto :fail
  call npm run build || goto :fail
  popd
)

echo.
echo AirCouple running at http://127.0.0.1:8000   ^(Ctrl+C to stop^)   API docs: http://127.0.0.1:8000/docs
start "" http://127.0.0.1:8000
python -m uvicorn app.main:app --port 8000
goto :eof

:fail
echo Setup failed - see the messages above.
exit /b 1
