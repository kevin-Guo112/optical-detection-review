@echo off
cd /d "%~dp0"
set HOST=0.0.0.0
set PORT=4173
node scripts\serve.js
pause
