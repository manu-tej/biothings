#!/usr/bin/env python3
"""
Quick health check for BioThings system
"""
import sys
import os
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


async def test_system():
    """Test system components"""
    print("🧬 BioThings System Health Check")
    print("=" * 50)
    
    # 1. Check environment
    print("\n1️⃣ Environment Check")
    api_key = os.getenv("GOOGLE_API_KEY")
    if api_key:
        print(f"✅ API Key: {api_key[:20]}...")
        print(f"✅ Model: {os.getenv('GEMINI_MODEL', 'gemini-2.0-flash-exp')}")
    else:
        print("❌ No API key found")
        return
    
    # 2. Test LLM import
    print("\n2️⃣ Testing LLM Service")
    try:
        from app.core.llm import llm_service
        print("✅ LLM service imported")
        
        # Test basic response
        response = await llm_service.generate_response(
            agent_id="test",
            system_prompt="You are a helpful assistant.",
            user_message="Say 'System working' in 3 words"
        )
        print(f"✅ LLM Response: {response}")
    except Exception as e:
        print(f"❌ LLM Error: {e}")
        return
    
    # 3. Test agent imports
    print("\n3️⃣ Testing Agent Imports")
    agents = ["CEO", "CSO", "CFO", "CTO", "COO"]
    for agent in agents:
        try:
            module = __import__(f"app.agents.{agent.lower()}_agent", fromlist=[f"{agent}Agent"])
            print(f"✅ {agent} Agent imported")
        except Exception as e:
            print(f"❌ {agent} Agent error: {e}")
    
    # 4. Test workflow engine
    print("\n4️⃣ Testing Workflow Engine")
    try:
        from app.workflows.biotech_workflows import workflow_engine
        protocols = workflow_engine.get_available_protocols()
        print(f"✅ Workflow engine loaded with {len(protocols)} protocols")
    except Exception as e:
        print(f"❌ Workflow error: {e}")
    
    # 5. Test advanced features
    print("\n5️⃣ Testing Advanced Features")
    try:
        from app.workflows.advanced_biotech_workflows import advanced_workflow_engine
        workflows = advanced_workflow_engine.get_available_workflows()
        print(f"✅ Advanced workflows: {len(workflows)} available")
    except Exception as e:
        print(f"❌ Advanced workflow error: {e}")
    
    try:
        from app.analytics.metrics_engine import metrics_engine
        dashboard = metrics_engine.get_dashboard_data()
        print(f"✅ Metrics engine: {len(dashboard['kpis'])} KPIs tracked")
    except Exception as e:
        print(f"❌ Metrics error: {e}")
    
    print("\n" + "="*50)
    print("✅ System health check complete!")
    print("\nTo start the server:")
    print("1. cd backend && source venv/bin/activate")
    print("2. python -m app.main")
    print("\nOr use: ./start_system.sh")


if __name__ == "__main__":
    # Check if we're in virtual environment
    if not hasattr(sys, 'real_prefix') and not (hasattr(sys, 'base_prefix') and sys.base_prefix != sys.prefix):
        print("⚠️  Not in virtual environment. Activating...")
        activate_script = os.path.join(os.path.dirname(__file__), 'backend', 'venv', 'bin', 'activate_this.py')
        if os.path.exists(activate_script):
            exec(open(activate_script).read(), {'__file__': activate_script})
    
    asyncio.run(test_system())