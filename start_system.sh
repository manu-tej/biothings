#!/bin/bash
# BioThings System Startup Script

echo "🧬 BioThings - Google Gemini Powered Biotech Platform"
echo "====================================================="

# Check if virtual environment exists
if [ ! -d "backend/venv" ]; then
    echo "❌ Virtual environment not found. Creating..."
    cd backend
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    cd ..
else
    echo "✅ Virtual environment found"
fi

# Function to check if port is in use
check_port() {
    lsof -i :$1 > /dev/null 2>&1
    return $?
}

# Check Redis (optional)
echo -e "\n📦 Checking Redis..."
if command -v redis-cli &> /dev/null; then
    if redis-cli ping > /dev/null 2>&1; then
        echo "✅ Redis is running"
    else
        echo "⚠️  Redis not running. Starting Redis..."
        if command -v docker &> /dev/null; then
            docker run -d -p 6379:6379 --name biothings-redis redis:alpine
            echo "✅ Redis started in Docker"
        else
            echo "⚠️  Redis not available (system will run without message broker)"
        fi
    fi
else
    echo "⚠️  Redis not installed (system will run without message broker)"
fi

# Start Backend
echo -e "\n🚀 Starting Backend Server..."
if check_port 8000; then
    echo "⚠️  Port 8000 is in use, trying port 8001..."
    API_PORT=8001
else
    API_PORT=8000
fi

cd backend
source venv/bin/activate
API_PORT=$API_PORT python -m app.main &
BACKEND_PID=$!
cd ..

echo "✅ Backend starting on port $API_PORT (PID: $BACKEND_PID)"

# Wait for backend to start
echo -e "\n⏳ Waiting for backend to start..."
for i in {1..30}; do
    if curl -s http://localhost:$API_PORT/api/health > /dev/null; then
        echo "✅ Backend is ready!"
        break
    fi
    sleep 1
done

# Check if frontend exists and start if available
if [ -d "frontend" ] && [ -f "frontend/package.json" ]; then
    echo -e "\n🎨 Starting Frontend..."
    cd frontend
    if [ ! -d "node_modules" ]; then
        echo "📦 Installing frontend dependencies..."
        npm install
    fi
    npm run dev &
    FRONTEND_PID=$!
    cd ..
    echo "✅ Frontend starting (PID: $FRONTEND_PID)"
else
    echo -e "\n⚠️  Frontend not found. API-only mode."
fi

# Display access information
echo -e "\n====================================================="
echo "🎉 BioThings is running!"
echo "====================================================="
echo ""
echo "📍 Access Points:"
echo "   - API: http://localhost:$API_PORT"
echo "   - API Docs: http://localhost:$API_PORT/docs"
if [ ! -z "$FRONTEND_PID" ]; then
    echo "   - Frontend: http://localhost:3000"
fi
echo ""
echo "🧪 Test Commands:"
echo "   - Run demos: python3 demo_simple.py"
echo "   - Interactive demo: python3 demo_real_llm.py"
echo "   - Test API: python3 test_api.py"
echo ""
echo "📝 Available Agents:"
echo "   - CEO: Strategic decisions"
echo "   - CSO: Scientific analysis"
echo "   - CFO: Financial planning"
echo "   - CTO: Technology strategy"
echo "   - COO: Operations management"
echo ""
echo "⚡ Quick Test:"
echo "   curl http://localhost:$API_PORT/api/chat \\"
echo "     -X POST \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"agent_type\": \"CEO\", \"message\": \"What should our focus be?\"}'"
echo ""
echo "🛑 To stop: Press Ctrl+C"
echo "====================================================="

# Function to cleanup on exit
cleanup() {
    echo -e "\n🛑 Shutting down BioThings..."
    
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null
        echo "✅ Backend stopped"
    fi
    
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null
        echo "✅ Frontend stopped"
    fi
    
    # Optional: Stop Redis container
    if docker ps | grep -q biothings-redis; then
        docker stop biothings-redis > /dev/null
        docker rm biothings-redis > /dev/null
        echo "✅ Redis stopped"
    fi
    
    echo "👋 Goodbye!"
    exit 0
}

# Set up trap for cleanup
trap cleanup INT TERM

# Keep script running
while true; do
    sleep 1
done