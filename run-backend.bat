@echo off
echo Starting Synexa Backend Server...
cd backend
python -m uvicorn app.main:app --reload --port 8000
pause
