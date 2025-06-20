"""
COO Agent - Chief Operating Officer
"""
from typing import Dict, Any, List
from datetime import datetime
from app.agents.base_agent import BaseAgent, AgentState
from langgraph.graph import StateGraph, END
import structlog

logger = structlog.get_logger()


class COOAgent(BaseAgent):
    """COO Agent responsible for operations and execution"""
    
    def __init__(self):
        super().__init__(
            agent_id="coo-001",
            agent_type="COO",
            department="Operations"
        )
        self.operational_metrics = {
            "efficiency_score": 0.0,
            "project_completion_rate": 0.0,
            "resource_utilization": 0.0,
            "quality_score": 0.0
        }
    
    def _build_graph(self) -> StateGraph:
        """Build COO-specific workflow graph"""
        workflow = StateGraph(AgentState)
        
        # Define nodes
        workflow.add_node("analyze_operations", self.analyze_operational_feasibility)
        workflow.add_node("evaluate_resources", self.evaluate_resources)
        workflow.add_node("make_recommendation", self.make_operational_recommendation)
        
        # Set entry point
        workflow.set_entry_point("analyze_operations")
        
        # Add edges
        workflow.add_edge("analyze_operations", "evaluate_resources")
        workflow.add_edge("evaluate_resources", "make_recommendation")
        workflow.add_edge("make_recommendation", END)
        
        return workflow.compile()
    
    async def analyze_operational_feasibility(self, state: AgentState) -> AgentState:
        """Analyze operational feasibility"""
        task = state.current_task
        context = state.context
        
        from app.core.llm import llm_service
        
        analysis = await llm_service.generate_response(
            agent_id=self.agent_id,
            system_prompt=self.system_prompt,
            user_message=f"Analyze the operational requirements and feasibility of: {task}",
            context=context
        )
        
        state.messages.append({
            "role": "COO",
            "content": analysis,
            "timestamp": datetime.utcnow().isoformat()
        })
        
        return state
    
    async def evaluate_resources(self, state: AgentState) -> AgentState:
        """Evaluate resource requirements"""
        from app.core.llm import llm_service
        
        evaluation = await llm_service.generate_response(
            agent_id=self.agent_id,
            system_prompt=self.system_prompt,
            user_message="Evaluate resource needs, timelines, and operational challenges",
            context={"previous_analysis": state.messages[-1]["content"]}
        )
        
        state.messages.append({
            "role": "COO",
            "content": evaluation,
            "timestamp": datetime.utcnow().isoformat()
        })
        
        return state
    
    async def make_operational_recommendation(self, state: AgentState) -> AgentState:
        """Make final operational recommendation"""
        from app.core.llm import llm_service
        from datetime import datetime
        
        recommendation = await llm_service.generate_response(
            agent_id=self.agent_id,
            system_prompt=self.system_prompt,
            user_message="Provide your operational recommendation with execution plan",
            context={"analyses": [msg["content"] for msg in state.messages]}
        )
        
        state.decisions.append({
            "agent": "COO",
            "decision": recommendation,
            "timestamp": datetime.utcnow().isoformat(),
            "confidence": "high"
        })
        
        return state