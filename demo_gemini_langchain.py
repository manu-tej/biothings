#!/usr/bin/env python3
"""
Demo: Google Gemini + LangChain Integration for Biotech
Shows Gemini's web search, code execution, and function calling
"""
import asyncio
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv("backend/.env")

# Import our Gemini modules
from backend.app.core.gemini_langchain import (
    GeminiLangChainService,
    create_gemini_biotech_agent,
    demonstrate_gemini_function_calling
)
from backend.app.agents.gemini_biotech_agent import GeminiBiotechAgent


async def demo_basic_gemini_capabilities():
    """Demo basic Gemini capabilities through LangChain"""
    print("\n🔷 Basic Gemini + LangChain Demo")
    print("=" * 60)
    
    # Create Gemini service
    service = GeminiLangChainService()
    
    # Test 1: Quick response without tools
    print("\n1️⃣ Quick Response Demo:")
    response = await service.quick_response(
        "What are the latest breakthroughs in CAR-T therapy for solid tumors?"
    )
    print(f"Response: {response[:500]}...\n")
    
    # Test 2: Web Search with Gemini
    print("\n2️⃣ Web Search Demo:")
    result = await service.execute_with_tools(
        task="Search for the latest FDA approvals for gene therapy in 2024 and summarize key approvals",
        system_prompt="You are a regulatory affairs specialist"
    )
    print(f"Web search result: {result['output'][:500]}...")
    print(f"Tools used: {result.get('tools_used', [])}\n")
    
    # Test 3: Code Execution with Gemini
    print("\n3️⃣ Code Execution Demo:")
    result = await service.execute_with_tools(
        task="""
        Write and execute Python code to:
        1. Calculate the half-life of a drug with initial concentration 100mg/L 
           and elimination rate constant 0.693/hr
        2. Plot the drug concentration over 24 hours
        3. Calculate AUC (area under curve)
        """,
        system_prompt="You are a pharmacokinetics expert"
    )
    print(f"Code execution result: {result['output'][:500]}...")
    print(f"Tools used: {result.get('tools_used', [])}\n")
    
    # Test 4: Combined Task
    print("\n4️⃣ Combined Web Search + Code Analysis:")
    result = await service.execute_with_tools(
        task="""
        1. Search for the current market cap of top 5 biotech companies
        2. Write Python code to create a bar chart comparing them
        3. Calculate the total market cap and each company's percentage
        """,
        system_prompt="You are a biotech market analyst"
    )
    print(f"Combined result: {result['output'][:500]}...")
    print(f"Tools used: {result.get('tools_used', [])}\n")


async def demo_biotech_specific_agents():
    """Demo specialized biotech agents powered by Gemini"""
    print("\n🧬 Gemini Biotech Agents Demo")
    print("=" * 60)
    
    # Create different agent types
    agents = {
        "scientist": create_gemini_biotech_agent("scientist"),
        "executive": create_gemini_biotech_agent("executive"),
        "engineer": create_gemini_biotech_agent("engineer")
    }
    
    # Test each agent type
    tasks = {
        "scientist": "Analyze the potential of using CRISPR base editing for treating sickle cell disease. Search for recent clinical trials and success rates.",
        "executive": "Evaluate the market opportunity for a new Alzheimer's drug. Search for competitor landscape and market size projections.",
        "engineer": "Design a Python pipeline for analyzing single-cell RNA sequencing data. Include quality control and visualization steps."
    }
    
    for agent_type, agent in agents.items():
        print(f"\n👤 {agent_type.title()} Agent:")
        result = await agent.ainvoke({
            "input": tasks[agent_type],
            "system_prompt": f"Act as a {agent_type}"
        })
        print(f"Result: {result.get('output', '')[:400]}...")
        print(f"Tools used: {[step[0].tool for step in result.get('intermediate_steps', [])]}")


async def demo_gemini_biotech_workflow():
    """Demo complete biotech workflow with Gemini agent"""
    print("\n🔬 Gemini Biotech Workflow Demo")
    print("=" * 60)
    
    # Create CSO agent
    cso = GeminiBiotechAgent(
        agent_id="cso-gemini-001",
        agent_type="CSO",
        department="R&D",
        model_name="gemini-2.0-flash-exp"
    )
    
    # Complex scientific task
    task = """
    Evaluate the feasibility of developing a new mRNA vaccine for a rare genetic disorder.
    Consider:
    1. Current state of mRNA technology
    2. Similar successful treatments
    3. Development timeline and costs
    4. Regulatory pathway
    5. Market potential
    """
    
    print(f"\n📋 Task: {task}\n")
    print("Processing through Gemini-powered workflow...\n")
    
    result = await cso.process_task(
        task=task,
        context={
            "budget": "$100M",
            "timeline": "5 years",
            "target_population": "10,000 patients globally"
        }
    )
    
    if result['success']:
        print("✅ Workflow completed successfully!")
        print(f"\n📊 Metrics:")
        print(f"- Web searches conducted: {result['web_searches']}")
        print(f"- Code analyses performed: {result['code_outputs']}")
        print(f"- Decision made: {result['decision']['decision'][:300] if result['decision'] else 'None'}...")
        print(f"\n📝 Action Plan: {result['action_plan']['plan'][:300] if result['action_plan'] else 'None'}...")
    else:
        print(f"❌ Workflow failed: {result['error']}")
    
    # Quick analysis demo
    print("\n\n💬 Quick Analysis Demo:")
    quick_result = await cso.quick_analysis(
        "What are the main advantages of mRNA vaccines over traditional vaccines?"
    )
    print(f"Quick analysis: {quick_result[:400]}...")


async def demo_function_calling():
    """Demo Gemini's function calling capabilities"""
    print("\n🔧 Gemini Function Calling Demo")
    print("=" * 60)
    
    result = await demonstrate_gemini_function_calling()
    
    print("Function calling result:")
    print(f"Output: {result.get('output', '')[:500]}...")
    print(f"Tools used: {[step[0].tool for step in result.get('intermediate_steps', [])]}")


async def demo_multi_agent_collaboration():
    """Demo multiple Gemini agents collaborating"""
    print("\n🏢 Multi-Agent Gemini Collaboration")
    print("=" * 60)
    
    scenario = """
    Our biotech startup has discovered a promising antibody for cancer immunotherapy.
    We need to decide on the development strategy.
    """
    
    print(f"Scenario: {scenario}\n")
    
    # Create different executives
    agents = {
        "CEO": GeminiBiotechAgent("ceo-gemini", "CEO", "Executive"),
        "CSO": GeminiBiotechAgent("cso-gemini", "CSO", "R&D"),
        "CFO": GeminiBiotechAgent("cfo-gemini", "CFO", "Finance"),
        "CTO": GeminiBiotechAgent("cto-gemini", "CTO", "Technology")
    }
    
    # Each agent analyzes from their perspective
    for role, agent in agents.items():
        print(f"\n{role} Analysis:")
        analysis = await agent.quick_analysis(
            f"As {role}, analyze this opportunity: {scenario}"
        )
        print(f"{analysis[:400]}...\n")


async def main():
    """Run all Gemini demos"""
    print("\n🚀 Google Gemini + LangChain Biotech Integration Demo")
    print("=" * 70)
    print("This demo showcases Gemini's advanced capabilities for biotech:")
    print("- Web search for current information")
    print("- Code execution for data analysis")
    print("- Function calling for specialized tasks")
    print("- Multi-agent collaboration\n")
    
    # Check API key
    if not os.getenv("GOOGLE_API_KEY"):
        print("⚠️  WARNING: No GOOGLE_API_KEY found!")
        print("Set your API key in backend/.env to use Gemini features.")
        print("\nGet your API key from: https://makersuite.google.com/app/apikey")
        return
    
    try:
        # Run demos sequentially
        await demo_basic_gemini_capabilities()
        await demo_biotech_specific_agents()
        await demo_gemini_biotech_workflow()
        await demo_function_calling()
        await demo_multi_agent_collaboration()
        
        print("\n✅ All Gemini demos completed successfully!")
        print("\n💡 Key Features Demonstrated:")
        print("- Web search with Gemini for current biotech data")
        print("- Code execution for scientific analysis")
        print("- Function calling for specialized calculations")
        print("- Multi-phase agent workflows")
        print("- Cross-functional agent collaboration")
        print("- Integration with LangChain agent framework")
        
    except Exception as e:
        print(f"\n❌ Error running demos: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())