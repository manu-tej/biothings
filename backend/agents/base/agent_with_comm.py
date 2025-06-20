"""
Enhanced base agent with inter-agent communication capabilities
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional, TypedDict, Callable
from datetime import datetime
import asyncio
import uuid
from enum import Enum

from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, SystemMessage
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolExecutor
from langchain.tools import BaseTool
import logging

from backend.services.communication import CommunicationService, AgentMessage, get_communication_service
from backend.services.agent_registry import AgentRegistry, get_agent_registry
from backend.models.agent_models import AgentStatus, AgentType

logger = logging.getLogger(__name__)


class AgentState(TypedDict):
    """State for agent execution"""
    messages: List[BaseMessage]
    current_task: Optional[Dict[str, Any]]
    agent_id: str
    status: str
    context: Dict[str, Any]
    metadata: Dict[str, Any]
    tasks: List[Any]  # Tasks to create or delegate


class BaseAgentWithComm(ABC):
    """Enhanced base agent with communication capabilities"""
    
    def __init__(
        self,
        agent_id: str,
        name: str,
        agent_type: AgentType,
        department: str,
        reporting_to: Optional[str] = None,
        llm_model: str = "gpt-4",
        temperature: float = 0.7,
        tools: List[BaseTool] = None,
        capabilities: List[str] = None
    ):
        self.agent_id = agent_id
        self.name = name
        self.agent_type = agent_type
        self.department = department
        self.reporting_to = reporting_to
        self.status = AgentStatus.IDLE
        self.created_at = datetime.utcnow()
        self.last_active = datetime.utcnow()
        
        # Initialize LLM
        self.llm = ChatOpenAI(
            model=llm_model,
            temperature=temperature
        )
        
        # Tools and capabilities
        self.tools = tools or []
        self.tool_executor = ToolExecutor(self.tools) if self.tools else None
        self.capabilities = capabilities or []
        
        # Task tracking
        self.current_task = None
        self.task_history = []
        self.subordinates = []
        
        # Communication
        self.communication: Optional[CommunicationService] = None
        self.registry: Optional[AgentRegistry] = None
        self._message_handlers: Dict[str, Callable] = {}
        self._heartbeat_task: Optional[asyncio.Task] = None
        
        # Build the agent graph
        self.graph = self._build_graph()
        
        logger.info(f"Initialized {agent_type.value} agent: {name} (ID: {agent_id})")
    
    @abstractmethod
    def _build_graph(self) -> StateGraph:
        """Build the LangGraph workflow for this agent"""
        pass
    
    @abstractmethod
    def get_system_prompt(self) -> str:
        """Get the system prompt for this agent"""
        pass
    
    async def initialize(self):
        """Initialize communication and register agent"""
        # Get communication service
        self.communication = await get_communication_service()
        self.registry = await get_agent_registry()
        
        # Register message handlers
        self._setup_message_handlers()
        
        # Subscribe to communication channels
        await self.communication.subscribe_agent(self.agent_id, self._handle_message)
        
        # Register in the system
        agent_info = {
            "name": self.name,
            "agent_type": self.agent_type.value,
            "department": self.department,
            "capabilities": self.capabilities,
            "reporting_to": self.reporting_to,
            "subordinates": self.subordinates
        }
        await self.registry.register_agent(self.agent_id, agent_info)
        
        # Start heartbeat
        self._heartbeat_task = asyncio.create_task(self._send_heartbeat())
        
        # Update status
        await self.update_status(AgentStatus.ACTIVE)
        
        logger.info(f"Agent {self.name} initialized and registered")
    
    async def shutdown(self):
        """Shutdown the agent gracefully"""
        if self._heartbeat_task:
            self._heartbeat_task.cancel()
            try:
                await self._heartbeat_task
            except asyncio.CancelledError:
                pass
        
        if self.registry:
            await self.registry.unregister_agent(self.agent_id)
        
        logger.info(f"Agent {self.name} shutdown complete")
    
    def _setup_message_handlers(self):
        """Setup handlers for different message types"""
        self._message_handlers = {
            "command": self._handle_command,
            "query": self._handle_query,
            "task": self._handle_task,
            "report": self._handle_report,
            "event": self._handle_event
        }
    
    async def _handle_message(self, message: AgentMessage):
        """Handle incoming messages"""
        try:
            handler = self._message_handlers.get(message.message_type)
            if handler:
                await handler(message)
            else:
                logger.warning(f"No handler for message type: {message.message_type}")
        except Exception as e:
            logger.error(f"Error handling message: {e}")
    
    async def _handle_command(self, message: AgentMessage):
        """Handle command messages"""
        command = message.payload.get("command")
        logger.info(f"{self.name} received command: {command}")
        
        # Process through agent workflow
        result = await self.process_message(
            f"Execute command: {command}",
            {"message": message.dict()}
        )
        
        # Send response if correlation_id exists
        if message.correlation_id:
            response = AgentMessage(
                message_id=str(uuid.uuid4()),
                sender_id=self.agent_id,
                recipient_id=message.sender_id,
                message_type="response",
                payload={"result": result},
                timestamp=datetime.utcnow().isoformat(),
                correlation_id=message.correlation_id
            )
            await self.communication.send_message(response)
    
    async def _handle_query(self, message: AgentMessage):
        """Handle query messages"""
        query = message.payload.get("query")
        logger.info(f"{self.name} received query: {query}")
        
        # Process query
        result = await self.process_message(
            f"Answer query: {query}",
            {"message": message.dict()}
        )
        
        # Send response
        if message.correlation_id:
            response = AgentMessage(
                message_id=str(uuid.uuid4()),
                sender_id=self.agent_id,
                recipient_id=message.sender_id,
                message_type="response",
                payload={"answer": result},
                timestamp=datetime.utcnow().isoformat(),
                correlation_id=message.correlation_id
            )
            await self.communication.send_message(response)
    
    async def _handle_task(self, message: AgentMessage):
        """Handle task assignment messages"""
        task = message.payload.get("task")
        logger.info(f"{self.name} received task: {task}")
        
        # Update current task
        self.current_task = task
        await self.update_status(AgentStatus.EXECUTING)
        
        # Process task
        result = await self.process_message(
            f"Execute task: {task.get('description', 'No description')}",
            {"task": task, "message": message.dict()}
        )
        
        # Report completion
        await self.report_to_superior({
            "task_id": task.get("id"),
            "status": "completed",
            "result": result
        })
    
    async def _handle_report(self, message: AgentMessage):
        """Handle report messages from subordinates"""
        report = message.payload.get("report")
        logger.info(f"{self.name} received report from {message.sender_id}")
        
        # Process report through workflow
        await self.process_message(
            f"Process report from subordinate: {report}",
            {"report": report, "sender": message.sender_id}
        )
    
    async def _handle_event(self, message: AgentMessage):
        """Handle system events"""
        event = message.payload.get("event")
        logger.debug(f"{self.name} received event: {event}")
        
        # Handle specific events
        if event == "system_alert":
            await self.process_message(
                "System alert received",
                {"event": message.payload}
            )
    
    async def update_status(self, status: AgentStatus, metadata: Dict[str, Any] = None):
        """Update agent status"""
        self.status = status
        self.last_active = datetime.utcnow()
        
        if self.registry:
            await self.registry.update_agent_status(self.agent_id, status, metadata)
    
    async def send_message_to_agent(self, recipient_id: str, message_type: str, payload: Dict[str, Any]) -> Optional[AgentMessage]:
        """Send a message to another agent"""
        message = AgentMessage(
            message_id=str(uuid.uuid4()),
            sender_id=self.agent_id,
            recipient_id=recipient_id,
            message_type=message_type,
            payload=payload,
            timestamp=datetime.utcnow().isoformat()
        )
        
        await self.communication.send_message(message)
        return message
    
    async def query_agent(self, recipient_id: str, query: str, timeout: float = 30.0) -> Optional[Dict[str, Any]]:
        """Query another agent and wait for response"""
        message = AgentMessage(
            message_id=str(uuid.uuid4()),
            sender_id=self.agent_id,
            recipient_id=recipient_id,
            message_type="query",
            payload={"query": query},
            timestamp=datetime.utcnow().isoformat(),
            correlation_id=str(uuid.uuid4())
        )
        
        response = await self.communication.request_response(message, timeout)
        if response:
            return response.payload
        return None
    
    async def delegate_task(self, task: Dict[str, Any], subordinate_id: str) -> Dict[str, Any]:
        """Delegate a task to a subordinate"""
        if subordinate_id not in self.subordinates:
            # Find an available agent if not a direct subordinate
            subordinate_id = await self.registry.find_available_agent(
                AgentType(task.get("required_agent_type", "worker")),
                task.get("required_capabilities", [])
            )
            
            if not subordinate_id:
                raise ValueError("No suitable agent found for task")
        
        # Send task to subordinate
        message = await self.send_message_to_agent(
            subordinate_id,
            "task",
            {"task": task}
        )
        
        logger.info(f"{self.name} delegated task to {subordinate_id}")
        
        return {
            "status": "delegated",
            "task_id": task.get("id", str(uuid.uuid4())),
            "delegated_to": subordinate_id,
            "message_id": message.message_id
        }
    
    async def report_to_superior(self, report: Dict[str, Any]) -> Dict[str, Any]:
        """Report to superior agent"""
        if not self.reporting_to:
            logger.warning(f"{self.name} has no superior to report to")
            return {"status": "no_superior"}
        
        message = await self.send_message_to_agent(
            self.reporting_to,
            "report",
            {"report": report}
        )
        
        logger.info(f"{self.name} reported to superior")
        
        return {
            "status": "reported",
            "report_id": str(uuid.uuid4()),
            "reported_to": self.reporting_to,
            "message_id": message.message_id
        }
    
    async def broadcast_to_department(self, message_type: str, payload: Dict[str, Any]):
        """Broadcast a message to all agents in the department"""
        message = AgentMessage(
            message_id=str(uuid.uuid4()),
            sender_id=self.agent_id,
            recipient_id=None,
            message_type=message_type,
            payload=payload,
            timestamp=datetime.utcnow().isoformat()
        )
        
        await self.communication.send_to_department(self.department, message)
    
    async def _send_heartbeat(self):
        """Send periodic heartbeat"""
        while True:
            try:
                await asyncio.sleep(30)  # Every 30 seconds
                await self.communication.heartbeat(self.agent_id)
                await self.registry.update_agent_status(
                    self.agent_id,
                    self.status,
                    {"last_heartbeat": datetime.utcnow().isoformat()}
                )
            except Exception as e:
                logger.error(f"Error sending heartbeat: {e}")
    
    async def process_message(self, message: str, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """Process an incoming message through the agent workflow"""
        self.last_active = datetime.utcnow()
        await self.update_status(AgentStatus.THINKING)
        
        try:
            # Create initial state
            initial_state = AgentState(
                messages=[
                    SystemMessage(content=self.get_system_prompt()),
                    HumanMessage(content=message)
                ],
                current_task=self.current_task,
                agent_id=self.agent_id,
                status=self.status.value,
                context=context or {},
                metadata={},
                tasks=[]
            )
            
            # Run the graph
            result = await self.graph.ainvoke(initial_state)
            
            # Handle any tasks created during processing
            for task in result.get("tasks", []):
                if task.get("assign_to"):
                    await self.delegate_task(task, task["assign_to"])
            
            await self.update_status(AgentStatus.IDLE)
            
            return {
                "agent_id": self.agent_id,
                "response": result.get("messages", [])[-1].content if result.get("messages") else None,
                "status": "success",
                "context": result.get("context", {}),
                "metadata": result.get("metadata", {})
            }
            
        except Exception as e:
            logger.error(f"Error processing message for {self.name}: {str(e)}")
            await self.update_status(AgentStatus.ERROR)
            return {
                "agent_id": self.agent_id,
                "response": None,
                "status": "error",
                "error": str(e)
            }
    
    def get_status(self) -> Dict[str, Any]:
        """Get current agent status"""
        return {
            "agent_id": self.agent_id,
            "name": self.name,
            "type": self.agent_type.value,
            "department": self.department,
            "status": self.status.value,
            "reporting_to": self.reporting_to,
            "subordinates": self.subordinates,
            "current_task": self.current_task,
            "capabilities": self.capabilities,
            "last_active": self.last_active.isoformat(),
            "created_at": self.created_at.isoformat()
        }