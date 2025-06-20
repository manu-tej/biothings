"""
CEO Agent with Strategic Decision Making
"""
from typing import Dict, Any, List
from app.agents.base_agent import BaseAgent, AgentState
from langgraph.graph import StateGraph, END
import structlog

logger = structlog.get_logger()


class CEOAgent(BaseAgent):
    """CEO Agent with strategic vision and company leadership"""
    
    def __init__(self):
        super().__init__(
            agent_id="ceo-001",
            agent_type="CEO",
            department="Executive"
        )
        self.strategic_initiatives = []
        self.company_metrics = {
            "revenue_growth": 0.0,
            "market_share": 0.0,
            "employee_satisfaction": 0.0,
            "innovation_index": 0.0
        }
    
    def _build_graph(self) -> StateGraph:
        """Build CEO-specific decision graph"""
        graph = StateGraph(AgentState)
        
        # CEO-specific nodes
        graph.add_node("assess_market", self._assess_market)
        graph.add_node("strategic_planning", self._strategic_planning)
        graph.add_node("analyze", self._analyze_situation)
        graph.add_node("decide", self._make_decision)
        graph.add_node("delegate", self._delegate_tasks)
        graph.add_node("monitor", self._monitor_progress)
        graph.add_node("communicate", self._communicate_results)
        
        # Define flow
        graph.add_edge("assess_market", "strategic_planning")
        graph.add_edge("strategic_planning", "analyze")
        graph.add_edge("analyze", "decide")
        graph.add_edge("decide", "delegate")
        graph.add_edge("delegate", "monitor")
        graph.add_edge("monitor", "communicate")
        graph.add_edge("communicate", END)
        
        graph.set_entry_point("assess_market")
        
        return graph.compile()
    
    async def _assess_market(self, state: AgentState) -> AgentState:
        """Assess market conditions and opportunities"""
        try:
            market_prompt = f"""
            Task: {state.current_task}
            Current Context: {state.context}
            
            As CEO, assess:
            1. Current market trends in biotech
            2. Competitive landscape
            3. Emerging opportunities
            4. Potential threats
            5. Strategic positioning opportunities
            
            Provide executive-level insights.
            """
            
            from app.core.llm import llm_service
            
            market_analysis = await llm_service.generate_response(
                agent_id=self.agent_id,
                system_prompt=self.system_prompt,
                user_message=market_prompt
            )
            
            state.context["market_analysis"] = market_analysis
            state.messages.append({
                "type": "market_assessment",
                "content": market_analysis,
                "agent": "CEO"
            })
            
            return state
            
        except Exception as e:
            logger.error(f"Market assessment failed: {e}")
            return state
    
    async def _strategic_planning(self, state: AgentState) -> AgentState:
        """Develop strategic plans based on market assessment"""
        try:
            planning_prompt = f"""
            Based on market analysis: {state.context.get('market_analysis', 'N/A')}
            
            Develop strategic plan including:
            1. Primary strategic objective
            2. Key initiatives (3-5)
            3. Resource allocation priorities
            4. Success metrics
            5. Timeline and milestones
            6. Risk mitigation strategies
            """
            
            from app.core.llm import llm_service
            
            strategic_plan = await llm_service.generate_response(
                agent_id=self.agent_id,
                system_prompt=self.system_prompt,
                user_message=planning_prompt
            )
            
            state.context["strategic_plan"] = strategic_plan
            self.strategic_initiatives.append({
                "plan": strategic_plan,
                "task": state.current_task,
                "status": "active"
            })
            
            return state
            
        except Exception as e:
            logger.error(f"Strategic planning failed: {e}")
            return state
    
    async def _delegate_tasks(self, state: AgentState) -> AgentState:
        """Delegate tasks to other executives"""
        try:
            decision = state.context.get("current_decision", {})
            
            # Determine delegation based on decision
            delegation_prompt = f"""
            Decision made: {decision.get('decision', '')}
            
            Determine which executives should handle specific aspects:
            - COO: Operational implementation
            - CSO: Scientific/research components  
            - CFO: Financial planning and budgeting
            - CTO: Technology and infrastructure needs
            
            Create specific delegated tasks for each relevant executive.
            """
            
            from app.core.llm import llm_service
            
            delegation_plan = await llm_service.generate_response(
                agent_id=self.agent_id,
                system_prompt=self.system_prompt,
                user_message=delegation_prompt
            )
            
            # Parse delegation and send to executives
            delegations = self._parse_delegations(delegation_plan)
            
            for exec_type, task in delegations.items():
                await self.collaborate_with_agent(
                    target_agent_id=f"{exec_type.lower()}-001",
                    message=task,
                    context={
                        "strategic_plan": state.context.get("strategic_plan"),
                        "priority": "high",
                        "from_ceo": True
                    }
                )
            
            state.context["delegations"] = delegations
            return state
            
        except Exception as e:
            logger.error(f"Task delegation failed: {e}")
            return state
    
    async def _monitor_progress(self, state: AgentState) -> AgentState:
        """Monitor progress on strategic initiatives"""
        try:
            # Update company metrics based on execution
            self.company_metrics["innovation_index"] += 0.1
            self.company_metrics["revenue_growth"] += 0.05
            
            state.metrics.update({
                "company_metrics": self.company_metrics,
                "active_initiatives": len(self.strategic_initiatives),
                "delegation_success": True
            })
            
            return state
            
        except Exception as e:
            logger.error(f"Progress monitoring failed: {e}")
            return state
    
    def _parse_delegations(self, delegation_plan: str) -> Dict[str, str]:
        """Parse delegation plan into specific tasks"""
        # In production, use structured output from LLM
        delegations = {}
        
        if "COO" in delegation_plan:
            delegations["COO"] = "Implement operational plan for new strategic initiative"
        if "CSO" in delegation_plan:
            delegations["CSO"] = "Evaluate scientific feasibility and research requirements"
        if "CFO" in delegation_plan:
            delegations["CFO"] = "Develop budget and financial projections"
        if "CTO" in delegation_plan:
            delegations["CTO"] = "Assess technology infrastructure needs"
        
        return delegations
    
    async def make_executive_decision(self, proposal: Dict[str, Any]) -> Dict[str, Any]:
        """Make high-level executive decisions"""
        context = {
            "proposal": proposal,
            "company_metrics": self.company_metrics,
            "active_initiatives": len(self.strategic_initiatives)
        }
        
        result = await self.process_task(
            task=f"Evaluate proposal: {proposal.get('title', 'New Initiative')}",
            context=context
        )
        
        return result
    
    async def quarterly_review(self) -> Dict[str, Any]:
        """Conduct quarterly strategic review"""
        review_task = "Conduct quarterly strategic review and set priorities for next quarter"
        
        context = {
            "company_metrics": self.company_metrics,
            "strategic_initiatives": self.strategic_initiatives,
            "quarter": "Q1 2024"  # In production, get actual quarter
        }
        
        result = await self.process_task(task=review_task, context=context)
        
        return {
            "review_results": result,
            "updated_metrics": self.company_metrics,
            "new_initiatives": self.strategic_initiatives[-3:]  # Last 3 initiatives
        }