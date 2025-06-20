#!/usr/bin/env python3
"""
Demo: Claude Code + LangChain Integration for Biotech
Shows how Claude Code's native capabilities work within LangChain
"""
import asyncio
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv("backend/.env")

# Import our modules
from backend.app.core.claude_code_langchain_simple import (
    create_claude_code_agent,
    create_biotech_executive_agent
)
from backend.app.agents.claude_code_agent import ClaudeCodeBiotechAgent


async def demo_basic_capabilities():
    """Demo basic Claude Code capabilities through LangChain"""
    print("\n🔧 Basic Claude Code + LangChain Demo")
    print("=" * 60)
    
    # Create a simple Claude Code agent
    agent = create_claude_code_agent(verbose=True)
    
    # Test 1: Web Search
    print("\n1️⃣ Web Search Demo:")
    result = await agent.arun(
        "Search for the latest FDA approvals for gene therapy in 2024"
    )
    print(f"Result: {result[:500]}...\n")
    
    # Test 2: Code Execution
    print("\n2️⃣ Python Code Execution Demo:")
    result = await agent.arun("""
        Write and execute Python code to:
        1. Calculate the doubling time of bacteria with 30 min generation time
        2. Plot bacterial growth over 24 hours
        3. Show the results
    """)
    print(f"Result: {result[:500]}...\n")
    
    # Test 3: Combined Task
    print("\n3️⃣ Combined Capabilities Demo:")
    result = await agent.arun("""
        Research the current market cap of Moderna (MRNA), 
        then write Python code to calculate what percentage of the 
        total biotech market cap it represents (assume $500B total market)
    """)
    print(f"Result: {result[:500]}...\n")


async def demo_biotech_agents():
    """Demo specialized biotech agents"""
    print("\n🧬 Biotech Executive Agents Demo")
    print("=" * 60)
    
    # Create CSO agent
    cso = ClaudeCodeBiotechAgent(
        agent_id="cso-demo",
        agent_type="CSO",
        department="R&D"
    )
    
    # Test CSO with research task
    print("\n👨‍🔬 Chief Science Officer Task:")
    result = await cso.process_task(
        task="Evaluate the feasibility of developing CAR-T therapy for solid tumors",
        context={
            "budget": "$50M",
            "timeline": "5 years",
            "current_expertise": "liquid tumors"
        }
    )
    
    print(f"Research findings: {result['research']['findings'][:300]}...")
    print(f"Decision: {result['decisions'][0]['decision'][:300]}...")
    
    # Quick query demo
    print("\n💬 Quick Query Demo:")
    quick_result = await cso.quick_query(
        "What are the main challenges in CRISPR delivery to the brain?"
    )
    print(f"Quick answer: {quick_result[:400]}...")


async def demo_multi_agent_scenario():
    """Demo multiple agents working on a complex scenario"""
    print("\n🏢 Multi-Agent Biotech Scenario")
    print("=" * 60)
    
    scenario = """
    Our biotech company has discovered a promising compound for Alzheimer's treatment.
    We need to decide whether to proceed with clinical trials.
    """
    
    print(f"Scenario: {scenario}\n")
    
    # Create different executives
    agents = {
        "CEO": ClaudeCodeBiotechAgent("ceo-001", "CEO", "Executive"),
        "CSO": ClaudeCodeBiotechAgent("cso-001", "CSO", "R&D"),
        "CFO": ClaudeCodeBiotechAgent("cfo-001", "CFO", "Finance"),
    }
    
    # Each agent analyzes from their perspective
    for role, agent in agents.items():
        print(f"\n{role} Analysis:")
        result = await agent.quick_query(
            f"From your perspective as {role}, analyze this: {scenario}"
        )
        print(f"{result[:400]}...\n")


async def demo_real_world_workflow():
    """Demo a real-world biotech workflow"""
    print("\n🔬 Real-World Biotech Workflow Demo")
    print("=" * 60)
    
    # Create CTO for technical implementation
    cto = ClaudeCodeBiotechAgent(
        agent_id="cto-workflow",
        agent_type="CTO",
        department="Technology"
    )
    
    workflow_task = """
    Design and implement a bioinformatics pipeline for:
    1. Processing raw RNA-seq data
    2. Identifying differentially expressed genes
    3. Pathway analysis
    4. Generating publication-ready visualizations
    
    Show actual code and implementation steps.
    """
    
    print("Task: Bioinformatics Pipeline Implementation\n")
    
    result = await cto.process_task(
        task=workflow_task,
        context={
            "data_type": "RNA-seq",
            "samples": "tumor vs normal",
            "output_format": "research paper figures"
        }
    )
    
    # Show execution details
    if result['success']:
        print("✅ Pipeline Implementation:")
        print(f"Research phase: Found {len(result['messages'])} relevant resources")
        print(f"Execution output: {result['execution']['output'][:500]}...")
    else:
        print(f"❌ Error: {result['error']}")


async def main():
    """Run all demos"""
    print("\n🧬 Claude Code + LangChain Biotech Integration Demo")
    print("=" * 70)
    print("This demo shows Claude Code's native capabilities integrated with LangChain")
    print("for biotech applications including web search, code execution, and analysis.\n")
    
    # Check API key
    if not os.getenv("ANTHROPIC_API_KEY"):
        print("⚠️  WARNING: No ANTHROPIC_API_KEY found!")
        print("Set your API key in backend/.env to use Claude Code features.")
        return
    
    try:
        # Run demos sequentially
        await demo_basic_capabilities()
        await demo_biotech_agents()
        await demo_multi_agent_scenario()
        await demo_real_world_workflow()
        
        print("\n✅ All demos completed successfully!")
        print("\n💡 Key Features Demonstrated:")
        print("- Web search for current biotech information")
        print("- Python code execution for data analysis")
        print("- Multi-agent collaboration with specialized roles")
        print("- Real bioinformatics workflow implementation")
        print("- Integration of Claude Code with LangChain agents")
        
    except Exception as e:
        print(f"\n❌ Error running demos: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())