#!/usr/bin/env python3
"""
Simple BioThings Demo - Google Gemini Integration
No Redis required
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
    
    print(f"Response: {response[:500]}...")


async def test_executive_decisions():
    """Test executive decision-making without agents"""
    print("\n\n2️⃣ Testing Executive Decisions")
    print("-" * 50)
    
    scenario = "Should we invest $50M in developing a new CAR-T therapy for solid tumors?"
    context = {
        "market_size": "$10B by 2030",
        "competition": "moderate",
        "success_rate": "Phase 1: 70%, Phase 2: 40%",
        "timeline": "5-7 years"
    }
    
    print(f"\n📋 Scenario: {scenario}")
    print(f"📊 Context: {context}")
    
    # CEO perspective
    print("\n\n👔 CEO Analysis:")
    ceo_response = await llm_service.generate_response(
        agent_id="ceo-001",
        system_prompt="""You are the CEO of a cutting-edge biotech company. Your responsibilities include:
            - Setting strategic vision and company direction
            - Making high-level decisions on research priorities
            - Ensuring company growth and profitability
            Always think strategically and consider long-term implications.""",
        user_message=scenario,
        context=context
    )
    print(ceo_response[:400] + "...")
    
    # CSO perspective
    print("\n\n🔬 CSO Analysis:")
    cso_response = await llm_service.generate_response(
        agent_id="cso-001",
        system_prompt="""You are the CSO of a biotech company. Your responsibilities include:
            - Evaluating scientific feasibility
            - Managing R&D pipeline
            - Ensuring research quality and innovation
            Focus on scientific merit and technical feasibility.""",
        user_message=scenario,
        context=context
    )
    print(cso_response[:400] + "...")
    
    # CFO perspective
    print("\n\n💰 CFO Analysis:")
    cfo_response = await llm_service.generate_response(
        agent_id="cfo-001",
        system_prompt="""You are the CFO of a biotech company. Your responsibilities include:
            - Financial planning and analysis
            - Budget management and cost control
            - ROI evaluation and risk assessment
            Focus on financial viability and returns.""",
        user_message=scenario,
        context=context
    )
    print(cfo_response[:400] + "...")


async def test_biotech_workflows():
    """Test biotech-specific workflows"""
    print("\n\n3️⃣ Testing Biotech Workflows")
    print("-" * 50)
    
    # CRISPR protocol
    print("\n🧬 CRISPR Gene Editing Protocol:")
    crispr_response = await llm_service.generate_response(
        agent_id="lab-001",
        system_prompt="You are a biotech lab assistant specializing in gene editing.",
        user_message="Create a step-by-step CRISPR protocol for editing the BRCA1 gene",
        context={"safety_level": "BSL-2", "target": "cancer research"}
    )
    print(crispr_response[:600] + "...")
    
    # Drug screening
    print("\n\n💊 Drug Screening Analysis:")
    drug_response = await llm_service.generate_response(
        agent_id="lab-002",
        system_prompt="You are a computational biologist specializing in drug discovery.",
        user_message="Analyze potential drug candidates for targeting p53 mutations",
        context={"screening_type": "virtual", "database": "ChEMBL"}
    )
    print(drug_response[:600] + "...")


async def test_streaming():
    """Test streaming responses"""
    print("\n\n4️⃣ Testing Streaming Response")
    print("-" * 50)
    
    print("Streaming response (first 10 chunks):")
    chunks = []
    async for chunk in llm_service.stream_response(
        agent_id="stream-001",
        system_prompt="You are a biotech expert.",
        user_message="Explain the future of personalized medicine in 3 paragraphs"
    ):
        chunks.append(chunk)
        if len(chunks) <= 10:
            print(f"Chunk {len(chunks)}: {chunk[:50]}...")
        if len(chunks) >= 10:
            break
    
    print(f"\nTotal chunks received: {len(chunks)}")


async def main():
    """Run all demos"""
    print("\n🧬 BioThings - Google Gemini Simple Demo")
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
        await test_executive_decisions()
        await test_biotech_workflows()
        await test_streaming()
        
        print("\n\n✅ All tests completed successfully!")
        
        print("\n💡 System Features Demonstrated:")
        print("• Google Gemini as the sole LLM provider")
        print("• Multiple executive perspectives (CEO, CSO, CFO)")
        print("• Biotech-specific workflows (CRISPR, drug screening)")
        print("• Streaming responses for real-time interaction")
        print("• Context-aware responses with role-specific prompts")
        
        print("\n🚀 Next Steps:")
        print("• Run full system: cd backend && python -m app.main")
        print("• Start Redis for full agent communication")
        print("• Access dashboard at http://localhost:3000")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())