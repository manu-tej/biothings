#!/bin/bash

echo "🧬 BioThings - Real AI-Powered Biotech Dashboard Setup"
echo "======================================================"

# Check if .env exists
if [ ! -f backend/.env ]; then
    echo "Creating .env file from example..."
    cp backend/.env.example backend/.env
    echo "⚠️  Please edit backend/.env and add your API keys:"
    echo "   - OPENAI_API_KEY or ANTHROPIC_API_KEY"
    echo "   - Update other configuration as needed"
    echo ""
fi

# Install backend dependencies
echo "Installing backend dependencies..."
cd backend
pip install -r requirements.txt

# Install frontend dependencies
echo "Installing frontend dependencies..."
cd ../frontend
npm install

# Start Redis if using Docker
echo ""
echo "Starting Redis (required for messaging)..."
docker run -d --name biothings-redis -p 6379:6379 redis:alpine 2>/dev/null || echo "Redis container already exists"

echo ""
echo "✅ Setup complete!"
echo ""
echo "To run the system:"
echo "1. Make sure you've added your LLM API keys to backend/.env"
echo "2. Start the backend: cd backend && python -m app.main"
echo "3. Start the frontend: cd frontend && npm run dev"
echo "4. Open http://localhost:3000"
echo ""
echo "Features now available:"
echo "- Real LLM-powered agent decision making"
echo "- Actual biotech experiment workflows"
echo "- Real-time agent communication via Redis"
echo "- WebSocket streaming of agent activities"
echo "- Interactive chat with executive agents"
echo ""
echo "Try these in the dashboard:"
echo "- Chat with the CEO about strategic decisions"
echo "- Start a CRISPR gene editing experiment"
echo "- Watch real-time experiment progress"
echo "- See agents collaborate on tasks"