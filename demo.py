#!/usr/bin/env python3
"""
BioThings Demo - Google Gemini Integration
"""
import asyncio
import os
import sys

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
from app.agents.ceo_agent import CEOAgent
from app.agents.cso_agent import CSOAgent
from app.agents.cfo_agent import CFOAgent


async def test_basic_llm():
    """Test basic LLM functionality"""
    print("\n1️⃣ Testing Basic LLM Response")
    print("-" * 50)
    
    response = await llm_service.generate_response(
        agent_id="test-001",
        system_prompt="You are a helpful biotech assistant.",
        user_message="What are the main advantages of mRNA vaccines?",
        context={"focus": "COVID-19 pandemic"}
    )
    
    print(f"Response: {response[:300]}...")


async def test_executive_agents():
    """Test executive agent decision-making"""
    print("\n\n2️⃣ Testing Executive Agents")
    print("-" * 50)
    
    # Create agents
    ceo = CEOAgent("ceo-001", "CEO", "Executive")
    cso = CSOAgent("cso-001", "CSO", "R&D")
    cfo = CFOAgent("cfo-001", "CFO", "Finance")
    
    # Test scenario
    scenario = "Should we invest $50M in developing a new CAR-T therapy for solid tumors?"
    context = {
        "market_size": "$10B by 2030",
        "competition": "moderate",
        "success_rate": "Phase 1: 70%, Phase 2: 40%",
        "timeline": "5-7 years"
    }
    
    print(f"\n📋 Scenario: {scenario}")
    print(f"📊 Context: {context}")
    
    # Get responses from each executive
    print("\n\n👔 CEO Analysis:")
    ceo_result = await ceo.process_task(scenario, context)
    if ceo_result['success']:
        print(ceo_result['decisions'][0]['decision'][:400] + "...")
    
    print("\n\n🔬 CSO Analysis:")
    cso_result = await cso.process_task(scenario, context)
    if cso_result['success']:
        print(cso_result['decisions'][0]['decision'][:400] + "...")
    
    print("\n\n💰 CFO Analysis:")
    cfo_result = await cfo.process_task(scenario, context)
    if cfo_result['success']:
        print(cfo_result['decisions'][0]['decision'][:400] + "...")


async def test_collaboration():
    """Test inter-agent collaboration"""
    print("\n\n3️⃣ Testing Agent Collaboration")
    print("-" * 50)
    
    ceo = CEOAgent("ceo-002", "CEO", "Executive")
    
    # CEO requests input from CSO
    collab_result = await ceo.collaborate_with_agent(
        target_agent_id="cso-002",
        message="Need scientific assessment of CRISPR vs base editing for our gene therapy pipeline",
        context={
            "diseases": ["sickle cell", "beta-thalassemia"],
            "budget": "$30M",
            "timeline": "3 years"
        }
    )
    
    print(f"CEO → CSO Message:")
    print(collab_result['message_sent'][:500] + "...")


async def main():
    """Run all demos"""
    print("\n🧬 BioThings - Google Gemini Demo")
    print("=" * 70)
    
    # Check configuration
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        print("❌ Error: GOOGLE_API_KEY not found in backend/.env")
        print("Please add: GOOGLE_API_KEY=your-api-key-here")
        return
    
    print(f"✅ Using Gemini model: {os.getenv('GEMINI_MODEL', 'gemini-2.0-flash-exp')}")
    print(f"✅ API Key configured: {api_key[:20]}...")
    
    try:
        # Run tests
        await test_basic_llm()
        await test_executive_agents()
        await test_collaboration()
        
        print("\n\n✅ All tests completed successfully!")
        
        print("\n💡 System Features:")
        print("• Google Gemini as the sole LLM provider")
        print("• Executive agents with specialized roles")
        print("• Inter-agent collaboration")
        print("• Real-time decision making")
        print("• WebSocket updates to dashboard")
        
        print("\n🚀 To run the full system:")
        print("1. cd backend && python -m app.main")
        print("2. cd frontend && npm run dev")
        print("3. Open http://localhost:3000")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())