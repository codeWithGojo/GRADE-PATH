@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Open index.html in Edge for the local study tools.
  echo Install Node.js 24 LTS or later from nodejs.org to use accounts, PDF import, and online features.
  pause
  exit /b 1
)
node -e "process.exit(Number(process.versions.node.split('.')[0]) >= 24 ? 0 : 1)"
if errorlevel 1 (
  echo Install Node.js 24 LTS or later from nodejs.org, then run this file again.
  pause
  exit /b 1
)
echo Starting GradePath. Open http://localhost:3000 in Edge after the ready message.
echo Leave this window open while using the local server.
node server.mjs
pause
