from typing import Dict, Any, List, Optional
from langchain_core.messages import BaseMessage, SystemMessage, HumanMessage
from langgraph.graph import StateGraph, END
from langchain.tools import BaseTool
import logging
import asyncio

from .agent import BaseAgent, AgentState, AgentStatus

logger = logging.getLogger(__name__)


class ManagerAgent(BaseAgent):
    """Base manager agent that oversees worker agents and coordinates tasks"""
    
    def __init__(
        self,
        agent_id: str,
        name: str,
        department: str,
        parent_id: Optional[str] = None,
        tools: List[BaseTool] = None,
        **kwargs
    ):
        self.department = department
        self.task_queue = []
        self.active_delegations = {}
        
        super().__init__(
            agent_id=agent_id,
            name=name,
            agent_type="Manager",
            parent_id=parent_id,
            tools=tools,
            **kwargs
        )
    
    def get_system_prompt(self) -> str:
        return f"""You are {self.name}, a department manager in a biotech company.
Department: {self.department}
You manage a team of specialized agents and coordinate their work to achieve departmental goals.

Key responsibilities:
1. Receive directives from senior management and break them into actionable tasks
2. Delegate tasks to appropriate team members based on their specializations
3. Monitor progress and ensure quality standards
4. Coordinate between team members for complex tasks
5. Report results and issues to senior management
6. Optimize team performance and resource allocation

Management principles:
- Clear communication and expectations
- Efficient task allocation based on expertise
- Proactive problem-solving
- Regular progress monitoring
- Data-driven decision making"""
    
    def _build_graph(self) -> StateGraph:
        """Build the manager agent workflow"""
        workflow = StateGraph(AgentState)
        
        # Define nodes
        workflow.add_node("analyze_request", self._analyze_request)
        workflow.add_node("plan_execution", self._plan_execution)
        workflow.add_node("delegate_tasks", self._delegate_tasks)
        workflow.add_node("monitor_progress", self._monitor_progress)
        workflow.add_node("compile_report", self._compile_report)
        
        # Define edges
        workflow.set_entry_point("analyze_request")
        workflow.add_edge("analyze_request", "plan_execution")
        workflow.add_edge("plan_execution", "delegate_tasks")
        workflow.add_edge("delegate_tasks", "monitor_progress")
        workflow.add_edge("monitor_progress", "compile_report")
        workflow.add_edge("compile_report", END)
        
        return workflow.compile()
    
    async def _analyze_request(self, state: AgentState) -> AgentState:
        """Analyze incoming request from superior"""
        messages = state["messages"]
        
        analysis_prompt = f"""As the {self.department} manager, analyze this request and determine:
1. The main objectives and deliverables
2. Required resources and expertise
3. Potential challenges or risks
4. Timeline and priorities
5. Which team members would be best suited for different aspects

Available team members: {', '.join([f'Agent-{sub}' for sub in self.subordinates])}"""
        
        messages.append(SystemMessage(content=analysis_prompt))
        response = await self.llm.ainvoke(messages)
        messages.append(response)
        
        state["messages"] = messages
        state["status"] = AgentStatus.THINKING.value
        
        return state
    
    async def _plan_execution(self, state: AgentState) -> AgentState:
        """Create execution plan"""
        messages = state["messages"]
        
        planning_prompt = """Create a detailed execution plan that includes:
1. Task breakdown with specific subtasks
2. Assignment of tasks to team members
3. Dependencies between tasks
4. Timeline with milestones
5. Success criteria and KPIs

Format the plan as a structured list."""
        
        messages.append(SystemMessage(content=planning_prompt))
        response = await self.llm.ainvoke(messages)
        messages.append(response)
        
        state["messages"] = messages
        return state
    
    async def _delegate_tasks(self, state: AgentState) -> AgentState:
        """Delegate tasks to subordinates"""
        messages = state["messages"]
        
        # In a real implementation, this would parse the plan and create actual delegations
        delegation_prompt = """Based on the execution plan, prepare delegation messages for each team member.
Each message should clearly state:
1. The specific task assigned
2. Expected deliverables
3. Timeline
4. Resources available
5. Reporting requirements"""
        
        messages.append(SystemMessage(content=delegation_prompt))
        response = await self.llm.ainvoke(messages)
        messages.append(response)
        
        # TODO: Implement actual task delegation to subordinate agents
        
        state["messages"] = messages
        state["status"] = AgentStatus.EXECUTING.value
        
        return state
    
    async def _monitor_progress(self, state: AgentState) -> AgentState:
        """Monitor task progress"""
        messages = state["messages"]
        
        # In a real implementation, this would check actual task statuses
        monitoring_prompt = """Review the current progress of delegated tasks.
Consider:
1. Which tasks are on track
2. Any delays or issues
3. Resource bottlenecks
4. Quality concerns
5. Need for intervention or support"""
        
        messages.append(SystemMessage(content=monitoring_prompt))
        response = await self.llm.ainvoke(messages)
        messages.append(response)
        
        state["messages"] = messages
        return state
    
    async def _compile_report(self, state: AgentState) -> AgentState:
        """Compile final report for superior"""
        messages = state["messages"]
        
        report_prompt = f"""Compile a comprehensive report for senior management that includes:
1. Executive summary of completed work
2. Key achievements and deliverables
3. Challenges encountered and how they were resolved
4. Team performance metrics
5. Recommendations for future improvements
6. Resource utilization

Department: {self.department}
Report should be concise but thorough."""
        
        messages.append(SystemMessage(content=report_prompt))
        response = await self.llm.ainvoke(messages)
        messages.append(response)
        
        state["messages"] = messages
        state["status"] = AgentStatus.IDLE.value
        
        return state
    
    async def handle_subordinate_report(self, subordinate_id: str, report: Dict[str, Any]) -> Dict[str, Any]:
        """Handle reports from subordinate agents"""
        logger.info(f"Received report from {subordinate_id}: {report}")
        
        # Update task status in active delegations
        if subordinate_id in self.active_delegations:
            task_id = self.active_delegations[subordinate_id].get("task_id")
            if task_id:
                # Process the report and update task status
                return {
                    "status": "acknowledged",
                    "action": "continue" if report.get("status") == "in_progress" else "complete"
                }
        
        return {"status": "acknowledged"}


class LabOperationsManager(ManagerAgent):
    """Manager for laboratory operations"""
    
    def __init__(self, agent_id: str, name: str, parent_id: str, **kwargs):
        super().__init__(
            agent_id=agent_id,
            name=name,
            department="Laboratory Operations",
            parent_id=parent_id,
            **kwargs
        )
    
    def get_system_prompt(self) -> str:
        base_prompt = super().get_system_prompt()
        return base_prompt + """

Specific responsibilities:
- Coordinate experimental workflows
- Ensure lab safety and compliance
- Manage equipment scheduling and maintenance
- Optimize resource utilization
- Maintain quality standards (GLP/GMP)
- Train and supervise lab technicians

You oversee all laboratory activities and ensure smooth operations."""


class ResearchManager(ManagerAgent):
    """Manager for research activities"""
    
    def __init__(self, agent_id: str, name: str, parent_id: str, **kwargs):
        super().__init__(
            agent_id=agent_id,
            name=name,
            department="Research & Development",
            parent_id=parent_id,
            **kwargs
        )
    
    def get_system_prompt(self) -> str:
        base_prompt = super().get_system_prompt()
        return base_prompt + """

Specific responsibilities:
- Direct research projects and priorities
- Coordinate between research teams
- Review and approve experimental designs
- Ensure scientific rigor and reproducibility
- Manage intellectual property
- Foster innovation and collaboration

You drive the scientific discovery process and ensure research excellence."""