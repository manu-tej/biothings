#!/usr/bin/env python3
"""
Demo script showing real LLM integration with Claude
"""
import asyncio
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv("backend/.env")

# Import our modules
from backend.app.core.llm_claude import llm_service
from backend.app.workflows.biotech_workflows import workflow_engine
from backend.app.agents.ceo_agent import CEOAgent


async def demo_llm_conversation():
    """Demo direct LLM conversation"""
    print("\n🤖 Testing Direct LLM Conversation")
    print("=" * 50)
    
    # Test basic response
    response = await llm_service.generate_response(
        agent_id="demo-001",
        system_prompt="You are a helpful biotech expert.",
        user_message="What are the key considerations when setting up a CRISPR experiment?",
        context={
            "lab_type": "research",
            "experience_level": "intermediate"
        }
    )
    
    print(f"Claude's Response:\n{response}\n")


async def demo_agent_decision():
    """Demo CEO agent making strategic decisions"""
    print("\n👔 Testing CEO Agent Decision Making")
    print("=" * 50)
    
    ceo = CEOAgent()
    
    # CEO evaluates a strategic opportunity
    result = await ceo.process_task(
        task="Evaluate acquisition of AI-powered drug discovery startup for $50M",
        context={
            "startup_name": "BioML Technologies",
            "technology": "Machine learning for protein folding prediction",
            "revenue": "$5M ARR",
            "team_size": 25,
            "patents": 3,
            "competitors_interested": True
        }
    )
    
    print(f"CEO Decision:\n{result['decisions'][0]['decision'] if result['decisions'] else 'No decision made'}\n")


async def demo_experiment_analysis():
    """Demo AI-powered experiment analysis"""
    print("\n🔬 Testing Experiment Data Analysis")
    print("=" * 50)
    
    # Simulate experiment data
    experiment_data = {
        "experiment_type": "CRISPR Gene Editing",
        "target_gene": "BRCA1",
        "cell_line": "HEK293",
        "editing_efficiency": 0.76,
        "off_target_sites": 2,
        "viability_post_edit": 0.89,
        "indel_frequency": {
            "insertions": 0.23,
            "deletions": 0.53,
            "substitutions": 0.0
        }
    }
    
    analysis = await llm_service.analyze_experiment_data(
        experiment_type="CRISPR",
        data=experiment_data
    )
    
    print(f"AI Analysis:\n{analysis.get('analysis', 'No analysis available')}\n")


async def demo_protocol_generation():
    """Demo AI-generated scientific protocol"""
    print("\n📋 Testing Protocol Generation")
    print("=" * 50)
    
    requirements = {
        "experiment_goal": "Validate CRISPR knockout of p53 gene",
        "cell_type": "Primary human fibroblasts",
        "safety_level": "BSL-2",
        "timeline": "2 weeks",
        "budget_constraint": "$5000"
    }
    
    protocol = await llm_service.create_scientific_protocol(
        experiment_type="CRISPR Knockout Validation",
        requirements=requirements
    )
    
    print(f"Generated Protocol: {protocol.get('protocol_name', 'Unknown')}")
    if 'steps' in protocol:
        print(f"Number of steps: {len(protocol['steps'])}")
        print(f"First 3 steps:")
        for i, step in enumerate(protocol.get('steps', [])[:3]):
            print(f"  {i+1}. {step}")


async def demo_streaming_response():
    """Demo streaming LLM response"""
    print("\n📡 Testing Streaming Response")
    print("=" * 50)
    
    print("Question: Explain the process of CAR-T cell therapy development")
    print("Streaming response:")
    
    # Define streaming callback
    async def stream_callback(agent_id, token, accumulated):
        print(token, end='', flush=True)
    
    await llm_service.generate_response(
        agent_id="stream-demo",
        system_prompt="You are a CAR-T cell therapy expert. Be concise but thorough.",
        user_message="Explain the process of CAR-T cell therapy development in 3 main steps.",
        streaming_callback=stream_callback
    )
    print("\n")


async def demo_inter_agent_collaboration():
    """Demo agents collaborating with LLM enhancement"""
    print("\n🤝 Testing Inter-Agent Collaboration")
    print("=" * 50)
    
    # CEO sends strategic directive
    ceo = CEOAgent()
    
    # Simulate collaboration
    collab_result = await ceo.collaborate_with_agent(
        target_agent_id="cso-001",
        message="We need to pivot our gene therapy pipeline to focus on rare diseases. What's our scientific readiness?",
        context={
            "reason": "Market opportunity identified",
            "timeline": "6 months",
            "budget": "$10M allocated"
        }
    )
    
    print(f"Enhanced collaboration message sent:\n{collab_result.get('message_sent', 'No message')}\n")


async def main():
    """Run all demos"""
    print("\n🧬 BioThings Real LLM Integration Demo")
    print("=" * 70)
    print("This demo shows real Claude/LLM integration in action")
    print("Make sure you have set ANTHROPIC_API_KEY in backend/.env\n")
    
    # Check if API key is set
    if not os.getenv("ANTHROPIC_API_KEY"):
        print("⚠️  WARNING: No ANTHROPIC_API_KEY found!")
        print("The system will use mock responses.")
        print("To use real Claude, add your API key to backend/.env")
        print("")
    
    try:
        # Run demos
        await demo_llm_conversation()
        await demo_agent_decision()
        await demo_experiment_analysis()
        await demo_protocol_generation()
        await demo_streaming_response()
        await demo_inter_agent_collaboration()
        
        print("\n✅ All demos completed successfully!")
        
    except Exception as e:
        print(f"\n❌ Error running demos: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())