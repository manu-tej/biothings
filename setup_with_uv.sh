#!/bin/bash
# BioThings Setup with UV - Ultra-fast Python package manager

echo "🚀 BioThings Setup with UV"
echo "=========================="

# Check if uv is installed
if ! command -v uv &> /dev/null; then
    echo "📦 Installing uv..."
    curl -LsSf https://astral.sh/uv/install.sh | sh
    
    # Add to PATH for current session
    export PATH="$HOME/.local/bin:$PATH"
    
    echo "✅ uv installed successfully"
else
    echo "✅ uv is already installed"
fi

# Display uv version
echo "📌 uv version: $(uv --version)"

# Navigate to backend directory
cd backend

# Remove old venv if it exists
if [ -d "venv" ]; then
    echo "🗑️  Removing old virtual environment..."
    rm -rf venv
fi

# Create new virtual environment with uv
echo -e "\n🐍 Creating virtual environment with uv..."
uv venv --python 3.11

# Install dependencies using uv
echo -e "\n📦 Installing dependencies with uv..."
uv pip install -r requirements.txt

# If pyproject.toml exists, sync the project
if [ -f "pyproject.toml" ]; then
    echo -e "\n🔄 Syncing project dependencies..."
    uv sync
fi

# Create uv.lock file
echo -e "\n🔒 Creating lockfile..."
uv lock

# Show installed packages
echo -e "\n📋 Installed packages:"
uv pip list | head -20
echo "... and more"

# Back to root
cd ..

# Create a new startup script that uses uv
cat > start_with_uv.sh << 'EOF'
#!/bin/bash
# BioThings Startup with UV

echo "🧬 BioThings - Powered by Google Gemini + UV"
echo "==========================================="

# Activate virtual environment
cd backend
source .venv/bin/activate
cd ..

# Check Redis (optional)
echo -e "\n📦 Checking Redis..."
if command -v redis-cli &> /dev/null && redis-cli ping > /dev/null 2>&1; then
    echo "✅ Redis is running"
else
    echo "⚠️  Redis not available (system will run without message broker)"
fi

# Start Backend
echo -e "\n🚀 Starting Backend Server..."
cd backend
python -m app.main &
BACKEND_PID=$!
cd ..

echo "✅ Backend starting on port 8000 (PID: $BACKEND_PID)"

# Display info
echo -e "\n====================================="
echo "🎉 BioThings is running with UV!"
echo "====================================="
echo ""
echo "📍 Access Points:"
echo "   - API: http://localhost:8000"
echo "   - API Docs: http://localhost:8000/docs"
echo ""
echo "🚀 UV Commands:"
echo "   - Add package: cd backend && uv add <package>"
echo "   - Update deps: cd backend && uv sync"
echo "   - Show deps: cd backend && uv pip list"
echo ""
echo "🧪 Test Commands:"
echo "   - Run demos: cd backend && uv run python ../demo_simple.py"
echo "   - Test API: cd backend && uv run python ../test_api.py"
echo ""
echo "🛑 To stop: Press Ctrl+C"
echo "====================================="

# Cleanup on exit
cleanup() {
    echo -e "\n🛑 Shutting down..."
    kill $BACKEND_PID 2>/dev/null
    echo "✅ Stopped"
    exit 0
}

trap cleanup INT TERM

# Keep running
while true; do
    sleep 1
done
EOF

chmod +x start_with_uv.sh

echo -e "\n✅ Setup complete!"
echo ""
echo "🎯 Next steps:"
echo "1. Start the system: ./start_with_uv.sh"
echo "2. Or manually:"
echo "   cd backend"
echo "   source .venv/bin/activate"
echo "   uv run python -m app.main"
echo ""
echo "💡 UV Benefits:"
echo "• 10-100x faster than pip"
echo "• Built-in virtual environment management"
echo "• Dependency resolution in milliseconds"
echo "• Lock files for reproducible builds"
echo "• Drop-in replacement for pip"