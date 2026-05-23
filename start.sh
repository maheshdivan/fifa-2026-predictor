#!/bin/bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "⚽  FIFA 2026 World Cup Predictor"
echo "================================="

# ---- Backend ----
echo ""
echo "🐍  Setting up Python backend..."
cd "$ROOT/backend"

if [ ! -d ".venv" ]; then
  python3 -m venv .venv
fi
source .venv/bin/activate
pip install -q -r requirements.txt

echo "✅  Backend dependencies ready"
echo "🚀  Starting FastAPI on http://localhost:8000 ..."
uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!

# ---- Frontend ----
echo ""
echo "⚛️   Setting up React frontend..."
cd "$ROOT/frontend"

if [ ! -d "node_modules" ]; then
  npm install
fi

echo "✅  Frontend dependencies ready"
echo "🚀  Starting Vite on http://localhost:5173 ..."
npm run dev &
FRONTEND_PID=$!

echo ""
echo "================================="
echo "✅  Both servers running!"
echo "   Frontend → http://localhost:5173"
echo "   Backend  → http://localhost:8000"
echo "   API docs → http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop both servers."
echo "================================="

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo 'Stopped.'" INT TERM
wait
