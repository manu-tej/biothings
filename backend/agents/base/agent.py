from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional, TypedDict
from datetime import datetime
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, SystemMessage
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolExecutor
from langchain.tools import BaseTool
import logging
import uuid
from enum import Enum

logger = logging.getLogger(__name__)


class AgentStatus(str, Enum):
    IDLE = "idle"
    THINKING = "thinking"
    EXECUTING = "executing"
    WAITING = "waiting"
    ERROR = "error"


class AgentState(TypedDict):
    """State for agent execution"""
    messages: List[BaseMessage]
    current_task: Optional[Dict[str, Any]]
    agent_id: str
    status: str
    context: Dict[str, Any]
    parent_directive: Optional[str]


class BaseAgent(ABC):
    """Base class for all agents in the biotech platform"""
    
    def __init__(
        self,
        agent_id: str,
        name: str,
        agent_type: str,
        parent_id: Optional[str] = None,
        llm_model: str = "gpt-4",
        temperature: float = 0.7,
        tools: List[BaseTool] = None
    ):
        self.agent_id = agent_id
        self.name = name
        self.agent_type = agent_type
        self.parent_id = parent_id
        self.status = AgentStatus.IDLE
        self.created_at = datetime.utcnow()
        self.last_active = datetime.utcnow()
        
        # Initialize LLM
        self.llm = ChatOpenAI(
            model=llm_model,
            temperature=temperature
        )
        
        # Tools available to this agent
        self.tools = tools or []
        self.tool_executor = ToolExecutor(self.tools) if self.tools else None
        
        # Task tracking
        self.current_task = None
        self.task_history = []
        self.subordinates = []  # List of agent IDs that report to this agent
        
        # Build the agent graph
        self.graph = self._build_graph()
        
        logger.info(f"Initialized {agent_type} agent: {name} (ID: {agent_id})")
    
    @abstractmethod
    def _build_graph(self) -> StateGraph:
        """Build the LangGraph workflow for this agent"""
        pass
    
    @abstractmethod
    def get_system_prompt(self) -> str:
        """Get the system prompt for this agent"""
        pass
    
    def add_subordinate(self, agent_id: str):
        """Add a subordinate agent"""
        if agent_id not in self.subordinates:
            self.subordinates.append(agent_id)
            logger.info(f"Added subordinate {agent_id} to {self.name}")
    
    def remove_subordinate(self, agent_id: str):
        """Remove a subordinate agent"""
        if agent_id in self.subordinates:
            self.subordinates.remove(agent_id)
            logger.info(f"Removed subordinate {agent_id} from {self.name}")
    
    async def process_message(self, message: str, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """Process an incoming message"""
        self.last_active = datetime.utcnow()
        self.status = AgentStatus.THINKING
        
        try:
            # Create initial state
            initial_state = AgentState(
                messages=[
                    SystemMessage(content=self.get_system_prompt()),
                    HumanMessage(content=message)
                ],
                current_task=None,
                agent_id=self.agent_id,
                status=self.status.value,
                context=context or {},
                parent_directive=None
            )
            
            # Run the graph
            result = await self.graph.ainvoke(initial_state)
            
            self.status = AgentStatus.IDLE
            
            return {
                "agent_id": self.agent_id,
                "response": result.get("messages", [])[-1].content if result.get("messages") else None,
                "status": "success",
                "context": result.get("context", {})
            }
            
        except Exception as e:
            logger.error(f"Error processing message for {self.name}: {str(e)}")
            self.status = AgentStatus.ERROR
            return {
                "agent_id": self.agent_id,
                "response": None,
                "status": "error",
                "error": str(e)
            }
    
    async def delegate_task(self, task: Dict[str, Any], subordinate_id: str) -> Dict[str, Any]:
        """Delegate a task to a subordinate"""
        if subordinate_id not in self.subordinates:
            raise ValueError(f"Agent {subordinate_id} is not a subordinate of {self.agent_id}")
        
        # This will be implemented to communicate with the subordinate agent
        logger.info(f"{self.name} delegating task to {subordinate_id}: {task}")
        
        return {
            "status": "delegated",
            "task_id": str(uuid.uuid4()),
            "delegated_to": subordinate_id,
            "task": task
        }
    
    async def report_to_superior(self, report: Dict[str, Any]) -> Dict[str, Any]:
        """Report back to superior agent"""
        if not self.parent_id:
            logger.warning(f"{self.name} has no superior to report to")
            return {"status": "no_superior"}
        
        # This will be implemented to communicate with the parent agent
        logger.info(f"{self.name} reporting to superior: {report}")
        
        return {
            "status": "reported",
            "report_id": str(uuid.uuid4()),
            "reported_to": self.parent_id,
            "report": report
        }
    
    def get_status(self) -> Dict[str, Any]:
        """Get current agent status"""
        return {
            "agent_id": self.agent_id,
            "name": self.name,
            "type": self.agent_type,
            "status": self.status.value,
            "parent_id": self.parent_id,
            "subordinates": self.subordinates,
            "current_task": self.current_task,
            "last_active": self.last_active.isoformat(),
            "created_at": self.created_at.isoformat()
        }
    
    def update_task_status(self, task_id: str, status: str, result: Any = None):
        """Update the status of a task"""
        if self.current_task and self.current_task.get("id") == task_id:
            self.current_task["status"] = status
            if result:
                self.current_task["result"] = result
            
            if status in ["completed", "failed", "cancelled"]:
                self.task_history.append(self.current_task)
                self.current_task = None
                self.status = AgentStatus.IDLE