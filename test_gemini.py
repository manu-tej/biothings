#!/usr/bin/env python3
"""
Test Gemini Integration Directly
"""
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

# Set API key
os.environ["GOOGLE_API_KEY"] = "AIzaSyDjLWRnrLsC9DlHAxiln-zQGZEV_-h6gTs"

import asyncio
from app.core.llm import llm_service


async def test_llm_service():
    """Test the Gemini LLM service"""
    print("\n🧬 Testing Gemini LLM Service")
    print("=" * 50)
    
    # Test 1: Basic response
    print("\n1️⃣ Basic Response Test:")
    response = await llm_service.generate_response(
        agent_id="test-001",
        system_prompt="You are a helpful biotech assistant.",
        user_message="What are the advantages of mRNA vaccines?",
        context={"focus": "COVID-19"}
    )
    print(f"Response: {response[:300]}...")
    
    # Test 2: CEO-style response
    print("\n\n2️⃣ CEO Response Test:")
    response = await llm_service.generate_response(
        agent_id="ceo-001",
        system_prompt="You are the CEO of a biotech company focused on strategic decisions.",
        user_message="Should we invest $50M in CAR-T therapy development?",
        context={"market_size": "$10B", "competition": "high", "timeline": "5 years"}
    )
    print(f"CEO says: {response[:400]}...")
    
    # Test 3: CSO-style response
    print("\n\n3️⃣ CSO Response Test:")
    response = await llm_service.generate_response(
        agent_id="cso-001",
        system_prompt="You are the Chief Science Officer evaluating research opportunities.",
        user_message="Evaluate CRISPR vs base editing for treating genetic diseases",
        context={"diseases": ["sickle cell", "beta-thalassemia"], "budget": "$20M"}
    )
    print(f"CSO says: {response[:400]}...")
    
    # Test 4: Check conversation history
    print("\n\n4️⃣ Conversation History Test:")
    summary = llm_service.get_conversation_summary("ceo-001")
    print(f"History: {summary}")


async def test_agent_creation():
    """Test creating and using agents"""
    print("\n\n🤖 Testing Agent Creation")
    print("=" * 50)
    
    from app.agents.base_agent import BaseAgent, AgentState
    
    class TestAgent(BaseAgent):
        def _create_system_prompt(self) -> str:
            return "You are a test agent for biotech applications."
    
    # Create test agent
    agent = TestAgent(
        agent_id="test-agent-001",
        agent_type="TEST",
        department="Testing"
    )
    
    # Process a task
    result = await agent.process_task(
        "Analyze the potential of gene therapy",
        {"focus": "rare diseases", "budget": "$30M"}
    )
    
    print(f"Task result: {result}")
    print(f"Decision: {result['decisions'][0]['decision'][:300] if result['decisions'] else 'No decision'}...")


async def main():
    """Run all tests"""
    print("\n🚀 Google Gemini Integration Test")
    print("=" * 70)
    
    try:
        await test_llm_service()
        await test_agent_creation()
        
        print("\n\n✅ All tests completed successfully!")
        print("💡 Gemini is working properly as the only LLM provider.")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())