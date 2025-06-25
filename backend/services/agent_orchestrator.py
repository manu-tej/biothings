"""
Agent Orchestrator Service
Manages agent lifecycle and connects them to the dashboard
"""

import asyncio
from typing import Dict, List, Optional, Any
from datetime import datetime
import uuid
import logging

from backend.app.agents.ceo_agent import CEOAgent
from backend.app.agents.coo_agent import COOAgent
from backend.app.agents.cso_agent import CSOAgent
from backend.app.agents.cfo_agent import CFOAgent
from backend.app.agents.cto_agent import CTOAgent
from backend.services.mock_communication import get_mock_communication_service
from backend.services.agent_registry import get_agent_registry
from backend.services.websocket_manager import WebSocketManager
from enum import Enum

# Define AgentStatus and AgentType here since they're not in the newer implementation
class AgentStatus(str, Enum):
    IDLE = "idle"
    THINKING = "thinking"
    EXECUTING = "executing"
    WAITING = "waiting"
    ERROR = "error"
    OFFLINE = "offline"

class AgentType(str, Enum):
    CEO = "CEO"
    COO = "COO"
    CSO = "CSO"
    CFO = "CFO"
    CTO = "CTO"

logger = logging.getLogger(__name__)


class AgentOrchestrator:
    """Orchestrates all agents and manages their lifecycle"""
    
    def __init__(self, websocket_manager: WebSocketManager):
        self.websocket_manager = websocket_manager
        self.agents: Dict[str, Any] = {}
        self.communication_service = None
        self.agent_registry = None
        self.running = False
        self._monitor_task: Optional[asyncio.Task] = None
        
    async def initialize(self):
        """Initialize the orchestrator and all agents"""
        logger.info("Initializing Agent Orchestrator...")
        
        # Initialize services
        self.communication_service = await get_mock_communication_service()
        self.agent_registry = await get_agent_registry()
        
        # Create and initialize all executive agents
        await self._create_executive_agents()
        
        # Start monitoring
        self.running = True
        self._monitor_task = asyncio.create_task(self._monitor_agents())
        
        logger.info("Agent Orchestrator initialized successfully")
        
    async def shutdown(self):
        """Shutdown all agents and services"""
        self.running = False
        
        if self._monitor_task:
            self._monitor_task.cancel()
            try:
                await self._monitor_task
            except asyncio.CancelledError:
                pass
        
        # Shutdown all agents
        for agent_id, agent in self.agents.items():
            if hasattr(agent, 'shutdown'):
                await agent.shutdown()
        
        logger.info("Agent Orchestrator shutdown complete")
        
    async def _create_executive_agents(self):
        """Create and initialize all executive agents"""
        # Create CEO
        ceo = CEOAgent()
        self.agents[ceo.agent_id] = ceo
        
        # Create C-suite executives
        coo = COOAgent()
        cso = CSOAgent()
        cfo = CFOAgent()
        cto = CTOAgent()
        
        self.agents[coo.agent_id] = coo
        self.agents[cso.agent_id] = cso
        self.agents[cfo.agent_id] = cfo
        self.agents[cto.agent_id] = cto
        
        # Set up reporting relationships (store as attribute since newer agents don't have this)
        ceo.subordinates = [coo.agent_id, cso.agent_id, cfo.agent_id, cto.agent_id]
        
        # Add additional attributes for compatibility
        for agent in self.agents.values():
            agent.name = f"{agent.agent_type} Agent"
            agent.status = AgentStatus.IDLE
            agent.subordinates = getattr(agent, 'subordinates', [])
            agent.last_active = datetime.utcnow()
        
        # Register all agents
        for agent_id, agent in self.agents.items():
            await self._register_agent(agent)
            
        logger.info(f"Created {len(self.agents)} executive agents")
        
    async def _register_agent(self, agent):
        """Register an agent with the system"""
        agent_info = {
            "name": getattr(agent, 'name', f"{agent.agent_type} Agent"),
            "agent_type": agent.agent_type,
            "department": getattr(agent, 'department', 'general'),
            "capabilities": getattr(agent, 'capabilities', []),
            "reporting_to": getattr(agent, 'reporting_to', None),
            "subordinates": getattr(agent, 'subordinates', []),
            "status": getattr(agent, 'status', AgentStatus.IDLE).value
        }
        
        await self.agent_registry.register_agent(agent.agent_id, agent_info)
        
        # Set up message handler
        async def handle_message(message):
            await self._handle_agent_message(agent.agent_id, message)
            
        await self.communication_service.subscribe_agent(agent.agent_id, handle_message)
        
    async def _handle_agent_message(self, agent_id: str, message):
        """Handle messages for a specific agent"""
        agent = self.agents.get(agent_id)
        if not agent:
            logger.warning(f"No agent found for ID: {agent_id}")
            return
            
        # Process message through agent using the newer API
        result = await agent.process_task(
            f"Message type: {message.message_type}, Content: {message.payload}",
            {"message": message.dict()}
        )
        
        # Stream to dashboard
        await self._stream_agent_activity(agent_id, {
            "type": "message_processed",
            "message": message.dict(),
            "result": result
        })
        
    async def _monitor_agents(self):
        """Monitor agent status and stream updates to dashboard"""
        while self.running:
            try:
                # Collect agent statuses
                agent_statuses = []
                for agent_id, agent in self.agents.items():
                    status = {
                        "id": agent_id,
                        "name": getattr(agent, 'name', f"{agent.agent_type} Agent"),
                        "type": agent.agent_type,
                        "status": getattr(agent, 'status', AgentStatus.IDLE).value,
                        "department": getattr(agent, 'department', 'general'),
                        "last_active": getattr(agent, 'last_active', datetime.utcnow()).isoformat(),
                        "subordinates": getattr(agent, 'subordinates', []),
                        "reporting_to": getattr(agent, 'reporting_to', None)
                    }
                    agent_statuses.append(status)
                
                # Stream to dashboard
                await self.websocket_manager.broadcast({
                    "type": "agent_status_update",
                    "timestamp": datetime.utcnow().isoformat(),
                    "agents": agent_statuses
                })
                
                # Also stream system metrics
                metrics = await self._collect_system_metrics()
                await self.websocket_manager.broadcast({
                    "type": "system_metrics",
                    "timestamp": datetime.utcnow().isoformat(),
                    "metrics": metrics
                })
                
                await asyncio.sleep(5)  # Update every 5 seconds
                
            except Exception as e:
                logger.error(f"Error in agent monitoring: {e}")
                await asyncio.sleep(5)
                
    async def _collect_system_metrics(self) -> Dict[str, Any]:
        """Collect system-wide metrics"""
        active_agents = len([a for a in self.agents.values() if getattr(a, 'status', AgentStatus.IDLE) != AgentStatus.OFFLINE])
        
        # Count agents by type
        agent_types = {}
        for agent in self.agents.values():
            agent_type = agent.agent_type
            agent_types[agent_type] = agent_types.get(agent_type, 0) + 1
        
        # Get message history
        recent_messages = await self.communication_service.get_message_history(limit=100)
        message_rate = len(recent_messages) / 5  # Messages per second (last 5 min)
        
        return {
            "total_agents": len(self.agents),
            "active_agents": active_agents,
            "agent_types": agent_types,
            "message_rate": message_rate,
            "orchestrator_status": "healthy"
        }
        
    async def _stream_agent_activity(self, agent_id: str, activity: Dict[str, Any]):
        """Stream agent activity to dashboard"""
        await self.websocket_manager.broadcast({
            "type": "agent_activity",
            "agent_id": agent_id,
            "timestamp": datetime.utcnow().isoformat(),
            "activity": activity
        })
        
    async def send_command_to_agent(self, agent_id: str, command: str, parameters: Dict[str, Any] = None) -> Dict[str, Any]:
        """Send a command to a specific agent"""
        agent = self.agents.get(agent_id)
        if not agent:
            return {"error": f"Agent {agent_id} not found"}
            
        # Create command message
        from backend.services.communication import AgentMessage
        message = AgentMessage(
            message_id=str(uuid.uuid4()),
            sender_id="orchestrator",
            recipient_id=agent_id,
            message_type="command",
            payload={
                "command": command,
                "parameters": parameters or {}
            },
            timestamp=datetime.utcnow().isoformat(),
            priority="high"
        )
        
        await self.communication_service.send_message(message)
        
        return {
            "status": "command_sent",
            "message_id": message.message_id,
            "agent_id": agent_id,
            "command": command
        }
        
    async def get_agent_hierarchy(self) -> Dict[str, Any]:
        """Get the current agent hierarchy"""
        hierarchy = {}
        
        # Find CEO (top-level agent)
        ceo = None
        for agent in self.agents.values():
            if agent.agent_type == "CEO":
                ceo = agent
                break
                
        if ceo:
            hierarchy = await self._build_hierarchy_node(ceo)
            
        return hierarchy
        
    async def _build_hierarchy_node(self, agent) -> Dict[str, Any]:
        """Build hierarchy node for an agent"""
        node = {
            "id": agent.agent_id,
            "name": getattr(agent, 'name', f"{agent.agent_type} Agent"),
            "type": agent.agent_type,
            "status": getattr(agent, 'status', AgentStatus.IDLE).value,
            "department": getattr(agent, 'department', 'general'),
            "subordinates": []
        }
        
        # Add subordinates
        for sub_id in agent.subordinates:
            if sub_id in self.agents:
                sub_agent = self.agents[sub_id]
                sub_node = await self._build_hierarchy_node(sub_agent)
                node["subordinates"].append(sub_node)
                
        return node
        
    async def simulate_workflow(self, workflow_type: str) -> Dict[str, Any]:
        """Simulate a workflow to demonstrate agent coordination"""
        workflow_id = f"wf_{uuid.uuid4().hex[:8]}"
        
        if workflow_type == "drug_discovery":
            # CEO initiates drug discovery project
            ceo = next((a for a in self.agents.values() if a.agent_type == "CEO"), None)
            if ceo:
                # Send command to CEO
                await self.send_command_to_agent(
                    ceo.agent_id,
                    "initiate_drug_discovery",
                    {
                        "target": "COVID-19 protease inhibitor",
                        "budget": 5000000,
                        "timeline": "12 months"
                    }
                )
                
                # CEO will delegate to CSO for research
                # CSO will coordinate with COO for lab resources
                # CFO will manage budget allocation
                # CTO will set up computational infrastructure
                
        elif workflow_type == "production_scale_up":
            # COO leads production scale-up
            coo = next((a for a in self.agents.values() if a.agent_type == "COO"), None)
            if coo:
                await self.send_command_to_agent(
                    coo.agent_id,
                    "scale_production",
                    {
                        "product": "mRNA vaccine",
                        "target_volume": "1M doses/month",
                        "deadline": "Q2 2025"
                    }
                )
                
        return {
            "workflow_id": workflow_id,
            "type": workflow_type,
            "status": "initiated",
            "timestamp": datetime.utcnow().isoformat()
        }


# Singleton instance
_orchestrator: Optional[AgentOrchestrator] = None


async def get_agent_orchestrator(websocket_manager: WebSocketManager) -> AgentOrchestrator:
    """Get or create the agent orchestrator singleton"""
    global _orchestrator
    if _orchestrator is None:
        _orchestrator = AgentOrchestrator(websocket_manager)
        await _orchestrator.initialize()
    return _orchestrator