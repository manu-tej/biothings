#!/usr/bin/env python3
"""Quick test of the BioThings system"""
import os
import sys
import asyncio

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

# Load environment
def load_env():
    """Load environment variables from .env file"""
    env_path = os.path.join(os.path.dirname(__file__), 'backend', '.env')
    if os.path.exists(env_path):
        with open(env_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    os.environ[key.strip()] = value.strip()

load_env()

# Import after environment is loaded
from app.core.llm import llm_service


async def quick_test():
    """Quick test of LLM functionality"""
    print("🧬 BioThings Quick Test")
    print("=" * 50)
    
    # Check API key
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        print("❌ Error: GOOGLE_API_KEY not found in backend/.env")
        return
    
    print(f"✅ API Key configured: {api_key[:20]}...")
    print(f"✅ Model: {os.getenv('GEMINI_MODEL', 'gemini-2.0-flash-exp')}")
    
    # Test basic LLM
    print("\n🔍 Testing LLM...")
    try:
        response = await llm_service.generate_response(
            agent_id="test-001",
            system_prompt="You are a helpful biotech assistant.",
            user_message="In one sentence, what is CRISPR?"
        )
        print(f"✅ LLM Response: {response}")
    except Exception as e:
        print(f"❌ LLM Error: {e}")
        return
    
    print("\n✅ System is working!")
    print("\nTo test the API server:")
    print("1. Start server: cd backend && python -m app.main")
    print("2. Test endpoint: curl http://localhost:8000/")


if __name__ == "__main__":
    asyncio.run(quick_test())