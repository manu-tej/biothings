from typing import Dict, Any, List, Optional
from langchain_core.messages import BaseMessage, SystemMessage, HumanMessage
from langgraph.graph import StateGraph, END
from langchain.tools import BaseTool
import logging
from datetime import datetime

from ..base import BaseAgent, AgentState, AgentStatus

logger = logging.getLogger(__name__)


class CEOAgent(BaseAgent):
    """Chief Executive Officer Agent - Top-level strategic decision maker"""
    
    def __init__(
        self,
        agent_id: str = "ceo-001",
        name: str = "CEO Strategic Director",
        **kwargs
    ):
        super().__init__(
            agent_id=agent_id,
            name=name,
            agent_type="CEO",
            parent_id=None,  # CEO reports to board (user)
            llm_model="gpt-4",
            temperature=0.7,
            **kwargs
        )
        
        # Strategic planning attributes
        self.company_vision = "Revolutionize biotech through AI-driven automation"
        self.strategic_goals = []
        self.quarterly_objectives = []
        self.risk_assessments = []
        
    def get_system_prompt(self) -> str:
        return f"""You are the CEO of a cutting-edge biotech company. Your role is to:

1. Set strategic direction and company vision
2. Make high-level decisions about research priorities and resource allocation  
3. Oversee C-suite executives (COO, CSO, CFO, CTO)
4. Report to the Board of Directors (user) on company performance
5. Identify opportunities and risks in the biotech landscape
6. Ensure alignment between departments toward company goals

Company Vision: {self.company_vision}

Decision-making principles:
- Data-driven strategic planning
- Balance innovation with practical execution
- Focus on long-term value creation
- Maintain regulatory compliance
- Foster a culture of scientific excellence

You have the following executives reporting to you:
- COO (Chief Operating Officer): Oversees daily operations
- CSO (Chief Scientific Officer): Leads research and development
- CFO (Chief Financial Officer): Manages finances and budgets
- CTO (Chief Technology Officer): Oversees technology and data infrastructure

Always think strategically and consider the big picture impact of decisions."""
    
    def _build_graph(self) -> StateGraph:
        """Build the CEO agent workflow"""
        workflow = StateGraph(AgentState)
        
        # Define nodes
        workflow.add_node("analyze_situation", self._analyze_situation)
        workflow.add_node("strategic_planning", self._strategic_planning)
        workflow.add_node("make_decision", self._make_decision)
        workflow.add_node("delegate_execution", self._delegate_execution)
        workflow.add_node("prepare_board_report", self._prepare_board_report)
        
        # Define the flow
        workflow.set_entry_point("analyze_situation")
        
        # Add conditional edges based on the type of request
        def route_after_analysis(state: AgentState) -> str:
            last_message = state["messages"][-1].content.lower()
            if "report" in last_message or "status" in last_message:
                return "prepare_board_report"
            elif "strategy" in last_message or "plan" in last_message:
                return "strategic_planning"
            else:
                return "make_decision"
        
        workflow.add_conditional_edges(
            "analyze_situation",
            route_after_analysis,
            {
                "prepare_board_report": "prepare_board_report",
                "strategic_planning": "strategic_planning", 
                "make_decision": "make_decision"
            }
        )
        
        workflow.add_edge("strategic_planning", "make_decision")
        workflow.add_edge("make_decision", "delegate_execution")
        workflow.add_edge("delegate_execution", END)
        workflow.add_edge("prepare_board_report", END)
        
        return workflow.compile()
    
    async def _analyze_situation(self, state: AgentState) -> AgentState:
        """Analyze the current situation and context"""
        messages = state["messages"]
        
        analysis_prompt = """As CEO, analyze the current request/situation:
1. What is being asked or reported?
2. What is the strategic importance?
3. Which departments/executives need to be involved?
4. What are the potential risks and opportunities?
5. What additional context is needed?

Provide a concise executive analysis."""
        
        messages.append(SystemMessage(content=analysis_prompt))
        response = await self.llm.ainvoke(messages)
        messages.append(response)
        
        state["messages"] = messages
        state["status"] = AgentStatus.THINKING.value
        logger.info(f"CEO analyzing situation: {response.content[:100]}...")
        
        return state
    
    async def _strategic_planning(self, state: AgentState) -> AgentState:
        """Develop strategic plans"""
        messages = state["messages"]
        
        planning_prompt = """Develop a strategic plan that includes:
1. Key objectives and milestones
2. Resource allocation recommendations
3. Timeline and phases
4. Success metrics and KPIs
5. Risk mitigation strategies
6. Alignment with company vision

Format as an executive strategic plan."""
        
        messages.append(SystemMessage(content=planning_prompt))
        response = await self.llm.ainvoke(messages)
        messages.append(response)
        
        state["messages"] = messages
        logger.info("CEO developed strategic plan")
        
        return state
    
    async def _make_decision(self, state: AgentState) -> AgentState:
        """Make executive decisions"""
        messages = state["messages"]
        
        decision_prompt = """Based on the analysis, make executive decisions:
1. What specific actions should be taken?
2. Which C-suite executive should lead each initiative?
3. What are the priorities and deadlines?
4. What resources should be allocated?
5. What are the success criteria?

Provide clear, actionable decisions with rationale."""
        
        messages.append(SystemMessage(content=decision_prompt))
        response = await self.llm.ainvoke(messages)
        messages.append(response)
        
        state["messages"] = messages
        state["status"] = AgentStatus.EXECUTING.value
        logger.info("CEO made executive decisions")
        
        return state
    
    async def _delegate_execution(self, state: AgentState) -> AgentState:
        """Delegate tasks to C-suite executives"""
        messages = state["messages"]
        
        delegation_prompt = """Create specific delegations for each C-suite executive:

For COO:
- Operational tasks and process improvements
- Resource optimization
- Cross-department coordination

For CSO:
- Research priorities and experiments
- Scientific strategy
- Innovation initiatives  

For CFO:
- Budget allocations
- Financial analysis
- Investment decisions

For CTO:
- Technology infrastructure
- Data management
- Digital transformation

Format each delegation with clear objectives and deadlines."""
        
        messages.append(SystemMessage(content=delegation_prompt))
        response = await self.llm.ainvoke(messages)
        messages.append(response)
        
        # In a real implementation, this would trigger actual delegations
        state["messages"] = messages
        state["context"]["delegations_made"] = True
        logger.info("CEO delegated tasks to executives")
        
        return state
    
    async def _prepare_board_report(self, state: AgentState) -> AgentState:
        """Prepare comprehensive report for the board"""
        messages = state["messages"]
        
        report_prompt = """Prepare an executive report for the Board of Directors including:

1. Executive Summary
   - Key achievements and milestones
   - Critical issues requiring board attention
   
2. Department Performance
   - Operations (COO report)
   - Research & Development (CSO report)
   - Financial Health (CFO report)
   - Technology Infrastructure (CTO report)
   
3. Strategic Initiatives
   - Progress on strategic goals
   - New opportunities identified
   - Risk assessment and mitigation
   
4. Financial Overview
   - Revenue and expenses
   - Budget utilization
   - ROI on key investments
   
5. Recommendations
   - Strategic decisions requiring board approval
   - Resource allocation requests
   - Policy changes

Format as a professional board report with clear sections."""
        
        messages.append(SystemMessage(content=report_prompt))
        response = await self.llm.ainvoke(messages)
        messages.append(response)
        
        state["messages"] = messages
        state["status"] = AgentStatus.IDLE.value
        logger.info("CEO prepared board report")
        
        return state
    
    async def handle_board_directive(self, directive: str) -> Dict[str, Any]:
        """Handle directives from the board of directors"""
        logger.info(f"CEO received board directive: {directive[:100]}...")
        
        # Process through the standard workflow
        result = await self.process_message(
            directive,
            context={"source": "board_of_directors", "priority": "high"}
        )
        
        return result
    
    async def request_executive_update(self, executive_type: str) -> Dict[str, Any]:
        """Request update from a specific C-suite executive"""
        logger.info(f"CEO requesting update from {executive_type}")
        
        # This would communicate with the specific executive agent
        return {
            "status": "update_requested",
            "executive": executive_type,
            "timestamp": datetime.utcnow().isoformat()
        }
    
    def set_strategic_goals(self, goals: List[str]):
        """Set company strategic goals"""
        self.strategic_goals = goals
        logger.info(f"CEO set {len(goals)} strategic goals")
    
    def assess_company_health(self) -> Dict[str, Any]:
        """Assess overall company health"""
        return {
            "overall_status": "healthy",
            "departments": {
                "operations": "optimal",
                "research": "active", 
                "finance": "stable",
                "technology": "advancing"
            },
            "risk_level": "moderate",
            "opportunity_score": 8.5,
            "timestamp": datetime.utcnow().isoformat()
        }