#!/usr/bin/env python3
"""
Example: Using BioThings Programmatically
Shows how to integrate BioThings into your own applications
"""
import asyncio
import aiohttp
import json
from typing import Dict, Any, List, Optional
from datetime import datetime


class BioThingsClient:
    """Client for interacting with BioThings API"""
    
    def __init__(self, base_url: str = "http://localhost:8001"):
        self.base_url = base_url
        self.session: Optional[aiohttp.ClientSession] = None
    
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    async def chat_with_agent(self, 
                            agent_type: str,
                            message: str) -> Dict[str, Any]:
        """Chat with a specific agent"""
        async with self.session.post(
            f"{self.base_url}/api/chat",
            json={"agent_type": agent_type, "message": message}
        ) as response:
            return await response.json()
    
    async def assign_task(self,
                         agent_type: str,
                         task: str,
                         context: Dict[str, Any]) -> Dict[str, Any]:
        """Assign a task to an agent"""
        async with self.session.post(
            f"{self.base_url}/api/agents/{agent_type}/task",
            json={"task": task, "context": context}
        ) as response:
            return await response.json()
    
    async def get_agents(self) -> List[Dict[str, Any]]:
        """Get all available agents"""
        async with self.session.get(f"{self.base_url}/api/agents") as response:
            data = await response.json()
            return data.get("agents", [])
    
    async def get_experiments(self) -> List[Dict[str, Any]]:
        """Get active experiments"""
        async with self.session.get(f"{self.base_url}/api/experiments") as response:
            data = await response.json()
            return data.get("experiments", [])
    
    async def start_experiment(self,
                             protocol: str,
                             params: Dict[str, Any]) -> Dict[str, Any]:
        """Start a new experiment"""
        async with self.session.post(
            f"{self.base_url}/api/experiments/start",
            json={"protocol": protocol, "params": params}
        ) as response:
            return await response.json()


async def example_strategic_decision():
    """Example: Making a strategic decision with executive team"""
    print("\n" + "="*60)
    print("Example 1: Strategic Decision Making")
    print("="*60)
    
    async with BioThingsClient() as client:
        # Define the strategic question
        question = "Should we pivot from oncology to rare diseases given the new regulatory incentives?"
        context = {
            "current_pipeline": "3 oncology drugs in Phase II",
            "rare_disease_opportunity": "Orphan drug designation available",
            "financial_impact": "Potential $500M market but higher risk",
            "timeline": "Decision needed in 30 days"
        }
        
        print(f"\n📋 Strategic Question: {question}")
        print(f"📊 Context: {json.dumps(context, indent=2)}")
        
        # Get input from each executive
        executives = ["CEO", "CSO", "CFO", "COO"]
        responses = {}
        
        for exec in executives:
            print(f"\n\n💼 Consulting {exec}...")
            result = await client.assign_task(exec, question, context)
            
            if result.get("success"):
                decision = result.get("decisions", [{}])[0].get("decision", "No response")
                responses[exec] = decision
                print(f"{exec} says: {decision[:200]}...")
            else:
                print(f"❌ Failed to get {exec} response")
        
        # Synthesize decision
        print("\n\n📊 Executive Summary:")
        print("-" * 40)
        print("Based on executive team input:")
        print("• CEO: Strategic alignment with long-term vision")
        print("• CSO: Technical feasibility and scientific merit")
        print("• CFO: Financial implications and ROI analysis")
        print("• COO: Operational impact and resource requirements")


async def example_research_workflow():
    """Example: Running a research workflow"""
    print("\n\n" + "="*60)
    print("Example 2: Research Workflow Execution")
    print("="*60)
    
    async with BioThingsClient() as client:
        # Start a CRISPR experiment
        print("\n🧬 Starting CRISPR Gene Editing Workflow")
        
        experiment_params = {
            "target_gene": "TP53",
            "cell_line": "HEK293",
            "purpose": "Create knockout for cancer research"
        }
        
        result = await client.start_experiment(
            protocol="crispr_genome_editing",
            params=experiment_params
        )
        
        if result.get("success"):
            experiment = result.get("experiment", {})
            print(f"\n✅ Experiment started!")
            print(f"   ID: {experiment.get('id')}")
            print(f"   Status: {experiment.get('status')}")
            print(f"   Current Step: {experiment.get('current_step')}")
        else:
            print(f"\n❌ Failed to start experiment: {result.get('detail')}")


async def example_financial_analysis():
    """Example: Financial analysis and forecasting"""
    print("\n\n" + "="*60)
    print("Example 3: Financial Analysis")
    print("="*60)
    
    async with BioThingsClient() as client:
        # Get financial analysis from CFO
        queries = [
            "What's our current burn rate and runway?",
            "Should we raise Series B now or wait 6 months?",
            "How should we allocate our $50M budget across R&D, clinical trials, and operations?"
        ]
        
        for query in queries:
            print(f"\n💰 Question: {query}")
            result = await client.chat_with_agent("CFO", query)
            
            response = result.get("response", "No response")
            print(f"CFO Analysis: {response[:300]}...")


async def example_drug_discovery():
    """Example: AI-powered drug discovery"""
    print("\n\n" + "="*60)
    print("Example 4: Drug Discovery Pipeline")
    print("="*60)
    
    async with BioThingsClient() as client:
        # Design drug discovery campaign
        task = "Design a drug discovery campaign for Alzheimer's disease"
        context = {
            "target": "Beta-amyloid and tau proteins",
            "budget": "$20M",
            "timeline": "3 years",
            "approach": "AI-driven molecular design + high-throughput screening",
            "existing_data": "10,000 compounds screened, 50 hits identified"
        }
        
        # Get CSO's scientific strategy
        print("\n🔬 Getting scientific strategy from CSO...")
        cso_result = await client.assign_task("CSO", task, context)
        
        if cso_result.get("success"):
            print(f"CSO Strategy: {cso_result['decisions'][0]['decision'][:400]}...")
        
        # Get CTO's tech requirements
        print("\n\n💻 Getting technology requirements from CTO...")
        cto_result = await client.chat_with_agent(
            "CTO",
            f"What computational infrastructure do we need for {task}?"
        )
        
        print(f"CTO Requirements: {cto_result.get('response', '')[:400]}...")


async def example_real_time_monitoring():
    """Example: Real-time experiment monitoring"""
    print("\n\n" + "="*60)
    print("Example 5: Real-time Monitoring")
    print("="*60)
    
    async with BioThingsClient() as client:
        # Connect to WebSocket for real-time updates
        ws_url = "ws://localhost:8001/ws"
        
        try:
            async with client.session.ws_connect(ws_url) as ws:
                print("\n📡 Connected to real-time monitoring")
                
                # Subscribe to experiment updates
                await ws.send_json({
                    "type": "subscribe",
                    "channel": "experiment_updates"
                })
                
                print("✅ Subscribed to experiment updates")
                print("⏳ Waiting for updates (press Ctrl+C to stop)...")
                
                # Listen for updates (timeout after 10 seconds for demo)
                try:
                    async with asyncio.timeout(10):
                        async for msg in ws:
                            if msg.type == aiohttp.WSMsgType.TEXT:
                                data = json.loads(msg.data)
                                print(f"\n📬 Update: {data}")
                except asyncio.TimeoutError:
                    print("\n⏰ Demo timeout reached")
                
        except Exception as e:
            print(f"\n❌ WebSocket error: {e}")


async def example_integrated_workflow():
    """Example: Complete integrated workflow"""
    print("\n\n" + "="*60)
    print("Example 6: Integrated Decision & Execution")
    print("="*60)
    
    async with BioThingsClient() as client:
        # Step 1: Strategic decision
        print("\n📋 Step 1: Strategic Decision")
        decision_task = "Should we develop an in-house AAV manufacturing facility?"
        
        ceo_response = await client.chat_with_agent(
            "CEO",
            decision_task
        )
        print(f"CEO Decision: {ceo_response.get('response', '')[:200]}...")
        
        # Step 2: Technical feasibility
        print("\n\n🔬 Step 2: Technical Feasibility")
        cso_response = await client.chat_with_agent(
            "CSO",
            "What are the technical requirements for AAV manufacturing?"
        )
        print(f"CSO Analysis: {cso_response.get('response', '')[:200]}...")
        
        # Step 3: Financial planning
        print("\n\n💰 Step 3: Financial Planning")
        cfo_response = await client.chat_with_agent(
            "CFO",
            "What's the ROI on a $30M AAV facility investment?"
        )
        print(f"CFO Analysis: {cfo_response.get('response', '')[:200]}...")
        
        # Step 4: Implementation planning
        print("\n\n⚙️ Step 4: Implementation Planning")
        coo_response = await client.chat_with_agent(
            "COO",
            "Create implementation plan for AAV facility build-out"
        )
        print(f"COO Plan: {coo_response.get('response', '')[:200]}...")
        
        print("\n\n✅ Integrated workflow completed!")


async def main():
    """Run all examples"""
    print("\n🧬 BioThings Integration Examples")
    print("="*60)
    print("Demonstrating how to use BioThings programmatically")
    
    # Make sure the server is running
    print("\n⚠️  Make sure BioThings server is running on port 8001")
    input("Press Enter to continue...")
    
    try:
        # Run examples
        await example_strategic_decision()
        await example_research_workflow()
        await example_financial_analysis()
        await example_drug_discovery()
        await example_real_time_monitoring()
        await example_integrated_workflow()
        
        print("\n\n✅ All examples completed!")
        print("\n💡 These examples show how to:")
        print("   • Make strategic decisions with AI executives")
        print("   • Run biotech research workflows")
        print("   • Perform financial analysis")
        print("   • Design drug discovery campaigns")
        print("   • Monitor experiments in real-time")
        print("   • Integrate multiple agents for complex tasks")
        
    except aiohttp.ClientError as e:
        print(f"\n❌ Connection error: {e}")
        print("Make sure the BioThings server is running!")
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())