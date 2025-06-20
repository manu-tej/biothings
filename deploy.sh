#!/bin/bash
# 🚀 BioThings One-Click Deployment Script

set -e

echo "🧬 BioThings Deployment Script"
echo "=============================="

# Detect docker compose command
if docker compose version &> /dev/null 2>&1; then
    COMPOSE_CMD="docker compose"
elif command -v docker-compose &> /dev/null 2>&1; then
    COMPOSE_CMD="docker-compose"
else
    echo "❌ Docker Compose is required but not installed."
    echo "   Please install Docker Compose and try again."
    exit 1
fi

# Check for required tools
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo "❌ $1 is required but not installed."
        echo "   Please install $1 and try again."
        exit 1
    fi
}

# Deploy function
deploy() {
    echo "🚀 Starting deployment..."
    
    # Build and start
    $COMPOSE_CMD build --no-cache
    $COMPOSE_CMD up -d
    
    # Wait for health check
    echo "⏳ Waiting for services to be healthy..."
    sleep 10
    
    # Check health
    if curl -f http://localhost:8000/api/health > /dev/null 2>&1; then
        echo "✅ Backend is healthy!"
    else
        echo "❌ Backend health check failed"
        $COMPOSE_CMD logs backend
        exit 1
    fi
    
    echo ""
    echo "🎉 Deployment successful!"
    echo ""
    echo "📍 Access points:"
    echo "   - Dashboard: http://localhost:${FRONTEND_PORT:-3000}"
    echo "   - API: http://localhost:8000"
    echo "   - API Docs: http://localhost:8000/docs"
    echo "   - Health: http://localhost:8000/api/health"
    echo ""
    echo "📝 Useful commands:"
    echo "   - View logs: $COMPOSE_CMD logs -f"
    echo "   - View backend logs: $COMPOSE_CMD logs -f backend"
    echo "   - View frontend logs: $COMPOSE_CMD logs -f frontend"
    echo "   - Stop: $COMPOSE_CMD down"
    echo "   - Restart: $COMPOSE_CMD restart"
}

# Main menu
case "$1" in
    "")
        # Check requirements
        check_command docker
        check_command curl
        
        # Check for API key
        if [ -z "$GOOGLE_API_KEY" ]; then
            # Try to load from .env file
            if [ -f .env ]; then
                export $(grep -v '^#' .env | xargs)
            fi
            
            # Check again after loading .env
            if [ -z "$GOOGLE_API_KEY" ]; then
                echo "⚠️  GOOGLE_API_KEY not set!"
                echo ""
                echo "Please run:"
                echo "  export GOOGLE_API_KEY=your-api-key"
                echo "  ./deploy.sh"
                echo ""
                echo "Or create a .env file with:"
                echo "  GOOGLE_API_KEY=your-api-key"
                exit 1
            fi
        fi
        
        deploy
        ;;
        
    "local")
        echo "🏠 Local development mode"
        cd backend
        python -m venv venv
        source venv/bin/activate
        pip install -r requirements.txt
        python -m app.main
        ;;
        
    "stop")
        echo "🛑 Stopping services..."
        $COMPOSE_CMD down
        echo "✅ Services stopped"
        ;;
        
    "clean")
        echo "🧹 Cleaning up..."
        $COMPOSE_CMD down -v
        docker system prune -f
        echo "✅ Cleanup complete"
        ;;
        
    "logs")
        $COMPOSE_CMD logs -f
        ;;
        
    "test")
        echo "🧪 Running tests..."
        curl -s http://localhost:8000/api/health | jq .
        echo ""
        curl -s http://localhost:8000/api/agents | jq .
        ;;
        
    *)
        echo "Usage: ./deploy.sh [command]"
        echo ""
        echo "Commands:"
        echo "  (none)  - Deploy with Docker"
        echo "  local   - Run locally with Python"
        echo "  stop    - Stop all services"
        echo "  clean   - Clean up containers and volumes"
        echo "  logs    - View logs"
        echo "  test    - Test endpoints"
        ;;
esac