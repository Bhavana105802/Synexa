@echo off
echo ============================================================
echo Starting Synexa Complete Application (Backend + Frontend)...
echo ============================================================

start "Synexa Backend (FastAPI)" cmd /k "cd backend && python -m uvicorn app.main:app --reload --port 8000"
start "Synexa Frontend (React)" cmd /k "cd frontend && npm run dev"

echo.
echo ✅ Both Backend and Frontend are starting up!
echo 🌐 Frontend: http://localhost:5173
echo ⚙️ Backend:  http://127.0.0.1:8000
echo.
