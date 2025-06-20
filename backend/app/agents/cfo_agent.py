"""
CFO Agent - Chief Financial Officer
"""
from typing import Dict, Any, List
from datetime import datetime
from app.agents.base_agent import BaseAgent, AgentState
from langgraph.graph import StateGraph, END
import structlog

logger = structlog.get_logger()


class CFOAgent(BaseAgent):
    """CFO Agent responsible for financial strategy and budgeting"""
    
    def __init__(self):
        super().__init__(
            agent_id="cfo-001",
            agent_type="CFO",
            department="Finance"
        )
        self.financial_metrics = {
            "cash_flow": 0.0,
            "burn_rate": 0.0,
            "roi": 0.0,
            "budget_utilization": 0.0
        }
    
    def _build_graph(self) -> StateGraph:
        """Build CFO-specific workflow graph"""
        workflow = StateGraph(AgentState)
        
        # Define nodes
        workflow.add_node("analyze_financials", self.analyze_financial_impact)
        workflow.add_node("evaluate_roi", self.evaluate_roi)
        workflow.add_node("make_recommendation", self.make_financial_recommendation)
        
        # Set entry point
        workflow.set_entry_point("analyze_financials")
        
        # Add edges
        workflow.add_edge("analyze_financials", "evaluate_roi")
        workflow.add_edge("evaluate_roi", "make_recommendation")
        workflow.add_edge("make_recommendation", END)
        
        return workflow.compile()
    
    async def analyze_financial_impact(self, state: AgentState) -> AgentState:
        """Analyze financial impact of proposals"""
        task = state.current_task
        context = state.context
        
        from app.core.llm import llm_service
        
        analysis = await llm_service.generate_response(
            agent_id=self.agent_id,
            system_prompt=self.system_prompt,
            user_message=f"Analyze the financial implications of: {task}",
            context=context
        )
        
        state.messages.append({
            "role": "CFO",
            "content": analysis,
            "timestamp": datetime.utcnow().isoformat()
        })
        
        return state
    
    async def evaluate_roi(self, state: AgentState) -> AgentState:
        """Evaluate return on investment"""
        from app.core.llm import llm_service
        
        roi_analysis = await llm_service.generate_response(
            agent_id=self.agent_id,
            system_prompt=self.system_prompt,
            user_message="Calculate and evaluate the potential ROI and financial risks",
            context={"previous_analysis": state.messages[-1]["content"]}
        )
        
        state.messages.append({
            "role": "CFO",
            "content": roi_analysis,
            "timestamp": datetime.utcnow().isoformat()
        })
        
        return state
    
    async def make_financial_recommendation(self, state: AgentState) -> AgentState:
        """Make final financial recommendation"""
        from app.core.llm import llm_service
        from datetime import datetime
        
        recommendation = await llm_service.generate_response(
            agent_id=self.agent_id,
            system_prompt=self.system_prompt,
            user_message="Provide your financial recommendation with budget allocation suggestions",
            context={"analyses": [msg["content"] for msg in state.messages]}
        )
        
        state.decisions.append({
            "agent": "CFO",
            "decision": recommendation,
            "timestamp": datetime.utcnow().isoformat(),
            "confidence": "high"
        })
        
        return state