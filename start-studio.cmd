@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
 echo Install Node.js 22 or newer, then run this file again.
 pause
 exit /b 1
)
if not exist node_modules call npm install
if not exist node_modules\ffmpeg-static\ffmpeg.exe (
 echo FFmpeg is missing. Run: npm rebuild ffmpeg-static
 pause
 exit /b 1
)
echo Open http://localhost:3210 in Chrome or Edge.
node server.mjs
pause
