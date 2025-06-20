#!/usr/bin/env python3
"""
Simple Gemini Demo - Test the simplified setup
"""
import asyncio
import os

# Set environment variables directly since dotenv might not be installed
os.environ["GOOGLE_API_KEY"] = "AIzaSyDjLWRnrLsC9DlHAxiln-zQGZEV_-h6gTs"

# Import agents
from backend.app.agents.ceo_agent import CEOAgent
from backend.app.agents.cso_agent import CSOAgent
from backend.app.agents.cfo_agent import CFOAgent


async def test_basic_agents():
    """Test basic agent responses"""
    print("\n🚀 Testing Gemini-Only Agents")
    print("=" * 50)
    
    # Create agents
    ceo = CEOAgent("ceo-001", "CEO", "Executive")
    cso = CSOAgent("cso-001", "CSO", "R&D") 
    cfo = CFOAgent("cfo-001", "CFO", "Finance")
    
    # Test each agent
    print("\n👔 CEO Response:")
    ceo_response = await ceo.process_task(
        "Should we invest in mRNA technology?",
        {"budget": "$50M", "timeline": "3 years"}
    )
    print(ceo_response['decisions'][0]['decision'][:300] + "...")
    
    print("\n🔬 CSO Response:")
    cso_response = await cso.process_task(
        "Evaluate CRISPR for rare diseases",
        {"target": "sickle cell", "budget": "$20M"}
    )
    print(cso_response['decisions'][0]['decision'][:300] + "...")
    
    print("\n💰 CFO Response:")
    cfo_response = await cfo.process_task(
        "Analyze ROI for gene therapy investment",
        {"amount": "$30M", "period": "5 years"}
    )
    print(cfo_response['decisions'][0]['decision'][:300] + "...")


async def test_collaboration():
    """Test agent collaboration"""
    print("\n\n🤝 Testing Agent Collaboration")
    print("=" * 50)
    
    ceo = CEOAgent("ceo-002", "CEO", "Executive")
    cso = CSOAgent("cso-002", "CSO", "R&D")
    
    # CEO asks CSO for input
    print("\nCEO → CSO Communication:")
    collab_result = await ceo.collaborate_with_agent(
        "cso-002",
        "Need scientific assessment of CAR-T opportunity",
        {"market_size": "$10B", "competition": "high"}
    )
    print(f"Message sent: {collab_result['message_sent'][:300]}...")


async def main():
    """Run all tests"""
    print("\n🧬 BioThings - Gemini Only System")
    print("=" * 70)
    
    # Check API key
    if not os.getenv("GOOGLE_API_KEY"):
        print("❌ No GOOGLE_API_KEY found in .env file")
        print("Add: GOOGLE_API_KEY=your-key-here")
        return
    
    print("✅ Google API Key configured")
    print(f"📍 Using model: {os.getenv('GEMINI_MODEL', 'gemini-2.0-flash-exp')}")
    
    try:
        await test_basic_agents()
        await test_collaboration()
        
        print("\n\n✅ All tests completed successfully!")
        print("\n💡 The system is now using Google Gemini exclusively.")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())