@echo off
REM Double-click this file to launch the website locally.
cd /d "%~dp0website"
echo Starting server at http://localhost:8000 ...
start "" http://localhost:8000
python -m http.server 8000
pause
