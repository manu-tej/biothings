#!/usr/bin/env python3
"""
Simple usage example for BioThings
Demonstrates clean API usage
"""
import asyncio
import os
import sys

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

from app.agents.ceo_agent import CEOAgent
from app.agents.cso_agent import CSOAgent
from app.agents.cfo_agent import CFOAgent


async def main():
    """Simple demonstration of agent usage"""
    print("🧬 BioThings Simple Usage Example")
    print("=" * 50)
    
    # Initialize agents
    ceo = CEOAgent()
    cso = CSOAgent()
    cfo = CFOAgent()
    
    # Example 1: Strategic Planning
    print("\n1️⃣ CEO Strategic Planning")
    result = await ceo.process_task(
        "Develop a 3-year strategy for entering the CAR-T therapy market"
    )
    print(f"CEO Response: {result['response'][:300]}...")
    
    # Example 2: Scientific Evaluation
    print("\n\n2️⃣ CSO Research Evaluation")
    result = await cso.process_task(
        "Evaluate the feasibility of using CRISPR for sickle cell disease treatment"
    )
    print(f"CSO Response: {result['response'][:300]}...")
    
    # Example 3: Financial Analysis
    print("\n\n3️⃣ CFO Budget Analysis")
    result = await cfo.process_task(
        "Analyze the financial requirements for a Phase 2 clinical trial"
    )
    print(f"CFO Response: {result['response'][:300]}...")
    
    # Example 4: Agent Collaboration
    print("\n\n4️⃣ Agent Collaboration")
    collab_result = await ceo.collaborate(
        target_agent="CSO",
        message="We need to prioritize our CRISPR research. What are the most promising targets?"
    )
    print(f"CEO → CSO: {collab_result['message'][:200]}...")
    
    # Show usage stats
    print("\n\n📊 Usage Statistics")
    for agent in [ceo, cso, cfo]:
        stats = agent.get_status()
        print(f"{agent.agent_type}: {stats['tasks_completed']} tasks completed")


if __name__ == "__main__":
    # Check for API key
    if not os.getenv("GOOGLE_API_KEY"):
        print("❌ Please set GOOGLE_API_KEY environment variable")
        print("   export GOOGLE_API_KEY=your-api-key")
        sys.exit(1)
    
    # Run example
    asyncio.run(main())