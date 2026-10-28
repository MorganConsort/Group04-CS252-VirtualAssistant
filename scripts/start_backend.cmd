@echo off
setlocal
pushd "%~dp0.."
if not exist ".venv\Scripts\python.exe" (
  echo Create .venv and install dependencies first. See README.md.
  popd
  exit /b 1
)
".venv\Scripts\python.exe" -m uvicorn assistant.backend.main:app --app-dir src --host 127.0.0.1 --port 8000 %*
set "backend_exit=%ERRORLEVEL%"
popd
exit /b %backend_exit%
