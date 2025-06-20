from typing import Dict, Any, List
from langchain_core.messages import BaseMessage, SystemMessage
from langgraph.graph import StateGraph, END
from langchain.tools import BaseTool
import logging

from .agent import BaseAgent, AgentState, AgentStatus

logger = logging.getLogger(__name__)


class WorkerAgent(BaseAgent):
    """Base worker agent that can execute specific tasks"""
    
    def __init__(
        self,
        agent_id: str,
        name: str,
        specialization: str,
        parent_id: str,
        tools: List[BaseTool] = None,
        **kwargs
    ):
        self.specialization = specialization
        super().__init__(
            agent_id=agent_id,
            name=name,
            agent_type="Worker",
            parent_id=parent_id,
            tools=tools,
            **kwargs
        )
    
    def get_system_prompt(self) -> str:
        return f"""You are {self.name}, a specialized worker agent in a biotech company.
Your specialization: {self.specialization}
Your role is to execute specific tasks assigned by your supervisor and report back with results.

Key responsibilities:
1. Execute tasks within your area of expertise
2. Use available tools to complete assignments
3. Report progress and results to your supervisor
4. Ask for clarification when tasks are unclear
5. Escalate issues that are beyond your capabilities

Always be precise, efficient, and safety-conscious in your work."""
    
    def _build_graph(self) -> StateGraph:
        """Build the worker agent workflow"""
        workflow = StateGraph(AgentState)
        
        # Define nodes
        workflow.add_node("analyze_task", self._analyze_task)
        workflow.add_node("execute_task", self._execute_task)
        workflow.add_node("report_result", self._report_result)
        
        # Define edges
        workflow.set_entry_point("analyze_task")
        workflow.add_edge("analyze_task", "execute_task")
        workflow.add_edge("execute_task", "report_result")
        workflow.add_edge("report_result", END)
        
        return workflow.compile()
    
    async def _analyze_task(self, state: AgentState) -> AgentState:
        """Analyze the incoming task"""
        messages = state["messages"]
        
        # Add analysis prompt
        analysis_prompt = """Analyze the given task and determine:
1. What specific actions need to be taken
2. What tools or resources are required
3. Any potential challenges or risks
4. Estimated time to complete

Provide a brief analysis."""
        
        messages.append(SystemMessage(content=analysis_prompt))
        
        # Get LLM response
        response = await self.llm.ainvoke(messages)
        messages.append(response)
        
        state["messages"] = messages
        state["status"] = AgentStatus.EXECUTING.value
        
        return state
    
    async def _execute_task(self, state: AgentState) -> AgentState:
        """Execute the task using available tools"""
        messages = state["messages"]
        
        # Execution prompt
        execution_prompt = """Now execute the task step by step. 
Use the available tools when necessary.
Document each step and any observations."""
        
        messages.append(SystemMessage(content=execution_prompt))
        
        # Get LLM response and potentially use tools
        response = await self.llm.ainvoke(messages)
        messages.append(response)
        
        # TODO: Implement tool usage based on LLM response
        
        state["messages"] = messages
        return state
    
    async def _report_result(self, state: AgentState) -> AgentState:
        """Prepare final report"""
        messages = state["messages"]
        
        # Report prompt
        report_prompt = """Prepare a concise report of:
1. Task completed
2. Results achieved
3. Any issues encountered
4. Recommendations for future tasks"""
        
        messages.append(SystemMessage(content=report_prompt))
        
        # Get final report
        response = await self.llm.ainvoke(messages)
        messages.append(response)
        
        state["messages"] = messages
        state["status"] = AgentStatus.IDLE.value
        
        return state


class LabTechnicianAgent(WorkerAgent):
    """Specialized agent for laboratory operations"""
    
    def __init__(self, agent_id: str, name: str, parent_id: str, **kwargs):
        super().__init__(
            agent_id=agent_id,
            name=name,
            specialization="Laboratory Operations",
            parent_id=parent_id,
            **kwargs
        )
    
    def get_system_prompt(self) -> str:
        base_prompt = super().get_system_prompt()
        return base_prompt + """

Specific expertise:
- PCR and molecular biology techniques
- Cell culture and maintenance
- Equipment calibration and maintenance
- Sample preparation and analysis
- Lab safety protocols
- Data recording and documentation

Always follow GLP (Good Laboratory Practice) guidelines."""


class DataAnalystAgent(WorkerAgent):
    """Specialized agent for data analysis"""
    
    def __init__(self, agent_id: str, name: str, parent_id: str, **kwargs):
        super().__init__(
            agent_id=agent_id,
            name=name,
            specialization="Data Analysis",
            parent_id=parent_id,
            **kwargs
        )
    
    def get_system_prompt(self) -> str:
        base_prompt = super().get_system_prompt()
        return base_prompt + """

Specific expertise:
- Statistical analysis and hypothesis testing
- Bioinformatics and computational biology
- Data visualization and reporting
- Machine learning for biological data
- Quality control metrics
- Experimental design optimization

Ensure all analyses are reproducible and well-documented."""