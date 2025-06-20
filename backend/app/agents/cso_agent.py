"""
CSO Agent - Chief Scientific Officer
"""
from typing import Dict, Any, List
from datetime import datetime
from app.agents.base_agent import BaseAgent, AgentState
from langgraph.graph import StateGraph, END
import structlog

logger = structlog.get_logger()


class CSOAgent(BaseAgent):
    """CSO Agent responsible for R&D and scientific strategy"""
    
    def __init__(self):
        super().__init__(
            agent_id="cso-001",
            agent_type="CSO",
            department="R&D"
        )
        self.research_pipeline = []
        self.lab_metrics = {
            "experiments_running": 0,
            "success_rate": 0.0,
            "publications": 0,
            "patents_filed": 0
        }
    
    def _build_graph(self) -> StateGraph:
        """Build CSO-specific workflow graph"""
        workflow = StateGraph(AgentState)
        
        # Define nodes
        workflow.add_node("analyze_science", self.analyze_scientific_feasibility)
        workflow.add_node("evaluate_research", self.evaluate_research_potential)
        workflow.add_node("make_recommendation", self.make_scientific_recommendation)
        
        # Set entry point
        workflow.set_entry_point("analyze_science")
        
        # Add edges
        workflow.add_edge("analyze_science", "evaluate_research")
        workflow.add_edge("evaluate_research", "make_recommendation")
        workflow.add_edge("make_recommendation", END)
        
        return workflow.compile()
    
    async def analyze_scientific_feasibility(self, state: AgentState) -> AgentState:
        """Analyze scientific feasibility of proposals"""
        task = state.current_task
        context = state.context
        
        # Use LLM to analyze scientific aspects
        from app.core.llm import llm_service
        
        analysis = await llm_service.generate_response(
            agent_id=self.agent_id,
            system_prompt=self.system_prompt,
            user_message=f"Analyze the scientific feasibility of: {task}",
            context=context
        )
        
        state.messages.append({
            "role": "CSO",
            "content": analysis,
            "timestamp": datetime.utcnow().isoformat()
        })
        
        return state
    
    async def evaluate_research_potential(self, state: AgentState) -> AgentState:
        """Evaluate research and development potential"""
        from app.core.llm import llm_service
        
        evaluation = await llm_service.generate_response(
            agent_id=self.agent_id,
            system_prompt=self.system_prompt,
            user_message="Evaluate the R&D potential and requirements",
            context={"previous_analysis": state.messages[-1]["content"]}
        )
        
        state.messages.append({
            "role": "CSO",
            "content": evaluation,
            "timestamp": datetime.utcnow().isoformat()
        })
        
        return state
    
    async def make_scientific_recommendation(self, state: AgentState) -> AgentState:
        """Make final scientific recommendation"""
        from app.core.llm import llm_service
        from datetime import datetime
        
        recommendation = await llm_service.generate_response(
            agent_id=self.agent_id,
            system_prompt=self.system_prompt,
            user_message="Provide your scientific recommendation and key considerations",
            context={"analyses": [msg["content"] for msg in state.messages]}
        )
        
        state.decisions.append({
            "agent": "CSO",
            "decision": recommendation,
            "timestamp": datetime.utcnow().isoformat(),
            "confidence": "high"
        })
        
        return state