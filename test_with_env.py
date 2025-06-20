#!/usr/bin/env python3
"""
Test Gemini with environment variables (no hardcoded keys)
"""
import os
import sys

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

# Load environment variables from .env file
def load_env_file(filepath):
    """Simple .env file loader"""
    if os.path.exists(filepath):
        with open(filepath, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    os.environ[key.strip()] = value.strip()
        print(f"✅ Loaded environment from {filepath}")
    else:
        print(f"❌ No .env file found at {filepath}")

# Load environment
env_path = os.path.join(os.path.dirname(__file__), 'backend', '.env')
load_env_file(env_path)


def test_environment():
    """Test that environment is properly configured"""
    print("\n🔧 Environment Configuration Test")
    print("=" * 50)
    
    api_key = os.getenv("GOOGLE_API_KEY")
    model = os.getenv("GEMINI_MODEL", "gemini-2.0-flash-exp")
    
    if api_key:
        print(f"✅ GOOGLE_API_KEY configured: {api_key[:20]}...")
        print(f"✅ GEMINI_MODEL: {model}")
        return True
    else:
        print("❌ GOOGLE_API_KEY not found!")
        print("\nTo configure:")
        print("1. Create backend/.env file")
        print("2. Add: GOOGLE_API_KEY=your-api-key-here")
        return False


def demo_system_architecture():
    """Show the simplified Gemini-only architecture"""
    print("\n🏗️ System Architecture (Gemini Only)")
    print("=" * 50)
    
    architecture = """
    ┌─────────────────────────────────────────┐
    │           BioThings Dashboard           │
    │         (Next.js + TypeScript)          │
    └────────────────┬───────────────────────┘
                     │ WebSocket
    ┌────────────────▼───────────────────────┐
    │          FastAPI Backend               │
    │  ┌─────────────────────────────────┐  │
    │  │     Executive Agents            │  │
    │  │  (CEO, CSO, CFO, CTO, COO)     │  │
    │  └─────────────┬───────────────────┘  │
    │                │                       │
    │  ┌─────────────▼───────────────────┐  │
    │  │    Google Gemini Service        │  │
    │  │  • Chat Completions             │  │
    │  │  • Web Search                   │  │
    │  │  • Code Execution               │  │
    │  │  • Function Calling             │  │
    │  └─────────────────────────────────┘  │
    └────────────────────────────────────────┘
    """
    print(architecture)


def show_usage_examples():
    """Show how to use the system"""
    print("\n📚 Usage Examples")
    print("=" * 50)
    
    examples = [
        ("Basic Chat", """
from app.core.llm import llm_service

response = await llm_service.generate_response(
    agent_id="ceo-001",
    system_prompt="You are the CEO",
    user_message="Should we invest in gene therapy?"
)
"""),
        
        ("Agent Task Processing", """
from app.agents.ceo_agent import CEOAgent

ceo = CEOAgent("ceo-001", "CEO", "Executive")
result = await ceo.process_task(
    "Evaluate market opportunity",
    {"market_size": "$10B", "competition": "moderate"}
)
"""),
        
        ("Inter-Agent Communication", """
# CEO asks CSO for scientific input
await ceo.collaborate_with_agent(
    "cso-001",
    "Need assessment of CRISPR technology",
    {"budget": "$20M", "timeline": "3 years"}
)
""")
    ]
    
    for title, code in examples:
        print(f"\n{title}:")
        print("```python")
        print(code.strip())
        print("```")


def main():
    """Run all tests"""
    print("\n🚀 BioThings - Google Gemini Integration Test")
    print("=" * 70)
    
    # Test environment
    if not test_environment():
        return
    
    # Show architecture
    demo_system_architecture()
    
    # Show examples
    show_usage_examples()
    
    print("\n\n✅ Configuration Test Complete!")
    print("\n🎯 Next Steps:")
    print("1. Install packages in venv:")
    print("   cd backend && source venv/bin/activate")
    print("   pip install langchain-google-genai google-generativeai")
    print("\n2. Start the backend:")
    print("   python -m app.main")
    print("\n3. Access dashboard:")
    print("   http://localhost:3000")
    
    print("\n💡 Benefits of Gemini-Only System:")
    print("• Simplified codebase (one LLM provider)")
    print("• Native web search and code execution")
    print("• Fast responses with Gemini 2.0 Flash")
    print("• Cost-effective for high volume")
    print("• No need to manage multiple API keys")


if __name__ == "__main__":
    main()