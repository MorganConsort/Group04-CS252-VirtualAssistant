@echo off
setlocal
cd /d "%~dp0"

set "PATHLY_NODE=node"
where node >nul 2>nul
if errorlevel 1 (
  set "PATHLY_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
  if not exist "%PATHLY_NODE%" (
    echo Node.js is required. Install Node.js 24 LTS, then run npm install in this folder.
    exit /b 1
  )
)

if not exist "node_modules\vite\bin\vite.js" (
  echo Dependencies are missing. Run npm install or pnpm install in the ui folder first.
  exit /b 1
)

"%PATHLY_NODE%" "node_modules\vite\bin\vite.js" --host 127.0.0.1 --port 5173
