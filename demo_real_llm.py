#!/usr/bin/env python3
"""
BioThings Real LLM Demo - Complete System Showcase
Demonstrates all features with Google Gemini
"""
import asyncio
import os
import sys
import json
from datetime import datetime
from typing import Dict, Any, List

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
from app.agents.cto_agent import CTOAgent
from app.agents.coo_agent import COOAgent


class BioThingsDemo:
    """Interactive demo showcasing all BioThings capabilities"""
    
    def __init__(self):
        self.agents = {
            "CEO": CEOAgent(),
            "CSO": CSOAgent(),
            "CFO": CFOAgent(),
            "CTO": CTOAgent(),
            "COO": COOAgent()
        }
        self.scenarios = {
            "1": {
                "name": "CAR-T Therapy Investment",
                "task": "Should we invest $50M in developing a new CAR-T therapy for solid tumors?",
                "context": {
                    "market_size": "$10B by 2030",
                    "competition": "moderate",
                    "success_rate": "Phase 1: 70%, Phase 2: 40%",
                    "timeline": "5-7 years"
                }
            },
            "2": {
                "name": "CRISPR Platform Development",
                "task": "Should we build an in-house CRISPR platform or partner with existing providers?",
                "context": {
                    "cost_inhouse": "$20M initial + $5M/year",
                    "cost_partnership": "$2M/year licensing",
                    "control": "Full IP ownership vs shared",
                    "timeline": "18 months vs immediate"
                }
            },
            "3": {
                "name": "AI Drug Discovery Initiative",
                "task": "Launch AI-powered drug discovery platform targeting neurological diseases?",
                "context": {
                    "investment": "$30M",
                    "market_opportunity": "$50B neurology market",
                    "ai_capabilities": "Molecular design, target identification",
                    "competition": "First-mover advantage possible"
                }
            },
            "4": {
                "name": "Gene Therapy Manufacturing",
                "task": "Build GMP manufacturing facility for gene therapy vectors?",
                "context": {
                    "capital_required": "$100M",
                    "capacity": "500 batches/year",
                    "market_demand": "Growing 30% annually",
                    "regulatory": "FDA fast-track potential"
                }
            }
        }
    
    async def run_scenario(self, scenario_id: str):
        """Run a complete scenario with all agents"""
        scenario = self.scenarios.get(scenario_id)
        if not scenario:
            print(f"❌ Invalid scenario ID: {scenario_id}")
            return
        
        print(f"\n{'='*80}")
        print(f"🎯 Scenario: {scenario['name']}")
        print(f"{'='*80}")
        print(f"\n📋 Question: {scenario['task']}")
        print(f"\n📊 Context:")
        for key, value in scenario['context'].items():
            print(f"  • {key}: {value}")
        
        # Collect all agent responses
        responses = {}
        
        print(f"\n{'─'*80}")
        print("🤖 Executive Team Analysis")
        print(f"{'─'*80}")
        
        for agent_type, agent in self.agents.items():
            print(f"\n\n{'='*60}")
            print(f"💼 {agent_type} Analysis")
            print(f"{'='*60}")
            
            try:
                result = await agent.process_task(
                    task=scenario['task'],
                    context=scenario['context']
                )
                
                if result['success'] and result['decisions']:
                    decision = result['decisions'][0]['decision']
                    responses[agent_type] = decision
                    
                    # Print first 800 chars with proper formatting
                    print(f"\n{decision[:800]}...")
                    
                    # Extract key points if present
                    if "recommend" in decision.lower():
                        print(f"\n✅ Recommendation extracted")
                else:
                    print(f"❌ No response generated")
                    
            except Exception as e:
                print(f"❌ Error: {e}")
        
        # Generate executive summary
        await self.generate_executive_summary(scenario, responses)
    
    async def generate_executive_summary(self, scenario: Dict[str, Any], responses: Dict[str, str]):
        """Generate an executive summary of all responses"""
        print(f"\n\n{'='*80}")
        print("📊 EXECUTIVE SUMMARY")
        print(f"{'='*80}")
        
        summary_prompt = f"""
        Based on the executive team's analysis of "{scenario['name']}":
        
        CEO Opinion: {responses.get('CEO', 'N/A')[:300]}...
        CSO Opinion: {responses.get('CSO', 'N/A')[:300]}...
        CFO Opinion: {responses.get('CFO', 'N/A')[:300]}...
        CTO Opinion: {responses.get('CTO', 'N/A')[:300]}...
        COO Opinion: {responses.get('COO', 'N/A')[:300]}...
        
        Provide a concise executive summary with:
        1. Consensus recommendation (invest/don't invest/conditional)
        2. Key factors supporting the decision
        3. Major risks identified
        4. Suggested next steps
        """
        
        summary = await llm_service.generate_response(
            agent_id="summary-001",
            system_prompt="You are an executive assistant summarizing C-suite decisions.",
            user_message=summary_prompt
        )
        
        print(f"\n{summary}")
    
    async def run_biotech_workflow_demo(self):
        """Demonstrate biotech-specific workflows"""
        print(f"\n\n{'='*80}")
        print("🧬 BIOTECH WORKFLOW DEMONSTRATIONS")
        print(f"{'='*80}")
        
        workflows = [
            {
                "name": "CRISPR Gene Editing Protocol",
                "prompt": "Design a CRISPR protocol for knocking out the p53 gene in HEK293 cells",
                "agent": "lab-crispr",
                "system": "You are a molecular biology expert specializing in CRISPR."
            },
            {
                "name": "Protein Expression Optimization",
                "prompt": "Optimize expression of a 50kDa therapeutic protein in E. coli",
                "agent": "lab-protein",
                "system": "You are a protein engineering specialist."
            },
            {
                "name": "Drug Screening Protocol",
                "prompt": "Design high-throughput screening for kinase inhibitors",
                "agent": "lab-screening",
                "system": "You are a drug discovery scientist."
            }
        ]
        
        for workflow in workflows:
            print(f"\n\n{'─'*60}")
            print(f"🔬 {workflow['name']}")
            print(f"{'─'*60}")
            
            response = await llm_service.generate_response(
                agent_id=workflow['agent'],
                system_prompt=workflow['system'],
                user_message=workflow['prompt']
            )
            
            print(f"\n{response[:1000]}...")
    
    async def run_realtime_collaboration(self):
        """Simulate real-time collaboration between agents"""
        print(f"\n\n{'='*80}")
        print("🤝 REAL-TIME AGENT COLLABORATION")
        print(f"{'='*80}")
        
        # Simulate a complex decision requiring collaboration
        initial_proposal = """
        Emergency Decision Required: Competitor just announced breakthrough in our lead program area.
        Should we:
        1. Accelerate our program (cost +$15M)
        2. Pivot to backup program
        3. Seek partnership/acquisition
        """
        
        print(f"\n📨 Initial Proposal:\n{initial_proposal}")
        
        # CEO initiates discussion
        print(f"\n\n{'─'*60}")
        print("👔 CEO initiating emergency meeting...")
        print(f"{'─'*60}")
        
        ceo_response = await llm_service.generate_response(
            agent_id="ceo-collab",
            system_prompt=self.agents["CEO"].system_prompt,
            user_message=f"Urgent strategic decision needed: {initial_proposal}"
        )
        
        print(f"\nCEO: {ceo_response[:400]}...")
        
        # Other executives respond
        for agent_type in ["CSO", "CFO", "COO"]:
            print(f"\n\n{'─'*40}")
            print(f"💼 {agent_type} responding...")
            
            response = await llm_service.generate_response(
                agent_id=f"{agent_type.lower()}-collab",
                system_prompt=self.agents[agent_type].system_prompt,
                user_message=f"CEO says: {ceo_response[:200]}... Your thoughts on: {initial_proposal}",
                context={"urgency": "high", "ceo_input": ceo_response[:400]}
            )
            
            print(f"\n{agent_type}: {response[:400]}...")
    
    async def run_interactive_mode(self):
        """Interactive Q&A with any agent"""
        print(f"\n\n{'='*80}")
        print("💬 INTERACTIVE MODE")
        print(f"{'='*80}")
        print("\nYou can now chat with any executive!")
        print("Available agents: CEO, CSO, CFO, CTO, COO")
        print("Type 'exit' to return to main menu\n")
        
        while True:
            agent_choice = input("Select agent (CEO/CSO/CFO/CTO/COO): ").upper()
            if agent_choice == 'EXIT':
                break
            
            if agent_choice not in self.agents:
                print("❌ Invalid agent. Try again.")
                continue
            
            question = input(f"\nYour question for the {agent_choice}: ")
            if question.lower() == 'exit':
                break
            
            print(f"\n{agent_choice} thinking...")
            
            response = await llm_service.generate_response(
                agent_id=f"{agent_choice.lower()}-interactive",
                system_prompt=self.agents[agent_choice].system_prompt,
                user_message=question
            )
            
            print(f"\n{agent_choice}: {response}\n")
            print("-" * 60)


async def main():
    """Main demo runner"""
    print("\n🧬 BioThings - Advanced Google Gemini Demo")
    print("=" * 80)
    
    # Check configuration
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        print("❌ Error: GOOGLE_API_KEY not found in backend/.env")
        return
    
    print(f"✅ Using Gemini model: {os.getenv('GEMINI_MODEL', 'gemini-2.0-flash-exp')}")
    print(f"✅ API Key configured: {api_key[:20]}...")
    
    demo = BioThingsDemo()
    
    while True:
        print(f"\n\n{'='*80}")
        print("🎯 BIOTHINGS DEMO MENU")
        print(f"{'='*80}")
        print("\n1. CAR-T Therapy Investment Decision")
        print("2. CRISPR Platform Strategy")
        print("3. AI Drug Discovery Initiative")
        print("4. Gene Therapy Manufacturing")
        print("5. Biotech Workflow Demonstrations")
        print("6. Real-time Agent Collaboration")
        print("7. Interactive Q&A Mode")
        print("8. Run All Scenarios")
        print("9. Exit")
        
        choice = input("\nSelect option (1-9): ")
        
        if choice == '9':
            print("\n👋 Thank you for exploring BioThings!")
            break
        elif choice in ['1', '2', '3', '4']:
            await demo.run_scenario(choice)
        elif choice == '5':
            await demo.run_biotech_workflow_demo()
        elif choice == '6':
            await demo.run_realtime_collaboration()
        elif choice == '7':
            await demo.run_interactive_mode()
        elif choice == '8':
            for scenario_id in ['1', '2', '3', '4']:
                await demo.run_scenario(scenario_id)
                await asyncio.sleep(2)  # Brief pause between scenarios
        else:
            print("❌ Invalid choice. Please try again.")
        
        if choice != '9':
            input("\n\nPress Enter to continue...")


if __name__ == "__main__":
    asyncio.run(main())