#!/bin/bash

echo "Starting BioThings Development Environment..."

# Function to cleanup on exit
cleanup() {
    echo -e "\n\nShutting down servers..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit
}

trap cleanup INT TERM

# Start backend
echo "Starting backend server..."
cd backend
python3 -m venv venv 2>/dev/null || true
source venv/bin/activate
pip install -q -r requirements-minimal.txt 2>/dev/null || echo "Some packages may be missing"
python3 main.py &
BACKEND_PID=$!
cd ..

# Wait for backend to start
sleep 3

# Start frontend
echo "Starting frontend server..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo -e "\n✅ Development servers started!"
echo "📊 Dashboard: http://localhost:3000"
echo "🔧 Backend API: http://localhost:8000"
echo "📚 API Docs: http://localhost:8000/docs"
echo -e "\nPress Ctrl+C to stop all servers\n"

# Wait for both processes
wait