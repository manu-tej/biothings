"""
Agent Registry Service
Manages agent lifecycle, discovery, and coordination
"""

import asyncio
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
import uuid
from pydantic import BaseModel
import logging

from backend.services.communication import CommunicationService, AgentMessage, get_communication_service
from backend.models.agent_models import AgentType, AgentStatus

logger = logging.getLogger(__name__)


class RegisteredAgent(BaseModel):
    """Registered agent information"""
    agent_id: str
    name: str
    agent_type: AgentType
    department: str
    status: AgentStatus
    capabilities: List[str]
    reporting_to: Optional[str]
    subordinates: List[str]
    registered_at: str
    last_heartbeat: str
    metadata: Dict[str, Any] = {}


class AgentRegistry:
    """Central registry for all agents in the system"""
    
    def __init__(self):
        self.agents: Dict[str, RegisteredAgent] = {}
        self.communication: Optional[CommunicationService] = None
        self._heartbeat_task: Optional[asyncio.Task] = None
        self._cleanup_task: Optional[asyncio.Task] = None
        
    async def initialize(self):
        """Initialize the registry and start background tasks"""
        self.communication = await get_communication_service()
        
        # Start background tasks
        self._heartbeat_task = asyncio.create_task(self._monitor_heartbeats())
        self._cleanup_task = asyncio.create_task(self._cleanup_inactive_agents())
        
        logger.info("Agent registry initialized")
        
    async def shutdown(self):
        """Shutdown the registry"""
        if self._heartbeat_task:
            self._heartbeat_task.cancel()
        if self._cleanup_task:
            self._cleanup_task.cancel()
            
        try:
            await self._heartbeat_task
            await self._cleanup_task
        except asyncio.CancelledError:
            pass
            
    async def register_agent(self, agent_id: str, agent_info: Dict[str, Any]) -> RegisteredAgent:
        """Register a new agent in the system"""
        registered_agent = RegisteredAgent(
            agent_id=agent_id,
            name=agent_info.get("name", agent_id),
            agent_type=agent_info.get("agent_type", AgentType.WORKER),
            department=agent_info.get("department", "general"),
            status=AgentStatus.IDLE,
            capabilities=agent_info.get("capabilities", []),
            reporting_to=agent_info.get("reporting_to"),
            subordinates=agent_info.get("subordinates", []),
            registered_at=datetime.utcnow().isoformat(),
            last_heartbeat=datetime.utcnow().isoformat(),
            metadata=agent_info.get("metadata", {})
        )
        
        self.agents[agent_id] = registered_agent
        
        # Store in Redis
        await self.communication.register_agent(agent_id, registered_agent.dict())
        
        # Announce new agent
        announcement = AgentMessage(
            message_id=str(uuid.uuid4()),
            sender_id="agent_registry",
            recipient_id=None,  # Broadcast
            message_type="event",
            payload={
                "event": "agent_registered",
                "agent_id": agent_id,
                "agent_type": agent_info.get("agent_type", "worker"),
                "department": agent_info.get("department", "general")
            },
            timestamp=datetime.utcnow().isoformat()
        )
        await self.communication.send_message(announcement)
        
        logger.info(f"Agent {agent_id} registered successfully")
        return registered_agent
        
    async def unregister_agent(self, agent_id: str):
        """Remove an agent from the registry"""
        if agent_id in self.agents:
            del self.agents[agent_id]
            
            # Announce agent departure
            announcement = AgentMessage(
                message_id=str(uuid.uuid4()),
                sender_id="agent_registry",
                recipient_id=None,
                message_type="event",
                payload={
                    "event": "agent_unregistered",
                    "agent_id": agent_id
                },
                timestamp=datetime.utcnow().isoformat()
            )
            await self.communication.send_message(announcement)
            
            logger.info(f"Agent {agent_id} unregistered")
            
    async def update_agent_status(self, agent_id: str, status: AgentStatus, metadata: Dict[str, Any] = None):
        """Update an agent's status"""
        if agent_id in self.agents:
            self.agents[agent_id].status = status
            self.agents[agent_id].last_heartbeat = datetime.utcnow().isoformat()
            
            if metadata:
                self.agents[agent_id].metadata.update(metadata)
                
            # Update in Redis
            await self.communication.register_agent(agent_id, self.agents[agent_id].dict())
            
    async def get_agent(self, agent_id: str) -> Optional[RegisteredAgent]:
        """Get agent information"""
        return self.agents.get(agent_id)
        
    async def get_agents_by_type(self, agent_type: AgentType) -> List[RegisteredAgent]:
        """Get all agents of a specific type"""
        return [
            agent for agent in self.agents.values()
            if agent.agent_type == agent_type
        ]
        
    async def get_agents_by_department(self, department: str) -> List[RegisteredAgent]:
        """Get all agents in a department"""
        return [
            agent for agent in self.agents.values()
            if agent.department == department
        ]
        
    async def get_active_agents(self) -> List[RegisteredAgent]:
        """Get all active agents"""
        cutoff = datetime.utcnow() - timedelta(minutes=5)
        return [
            agent for agent in self.agents.values()
            if datetime.fromisoformat(agent.last_heartbeat) > cutoff
        ]
        
    async def get_agent_hierarchy(self) -> Dict[str, Any]:
        """Get the complete agent hierarchy"""
        hierarchy = {}
        
        # Find top-level agents (those not reporting to anyone)
        top_agents = [
            agent for agent in self.agents.values()
            if not agent.reporting_to
        ]
        
        for agent in top_agents:
            hierarchy[agent.agent_id] = self._build_hierarchy_node(agent)
            
        return hierarchy
        
    def _build_hierarchy_node(self, agent: RegisteredAgent) -> Dict[str, Any]:
        """Build a hierarchy node for an agent"""
        node = {
            "id": agent.agent_id,
            "name": agent.name,
            "type": agent.agent_type.value,
            "status": agent.status.value,
            "department": agent.department,
            "subordinates": []
        }
        
        # Add subordinates recursively
        for sub_id in agent.subordinates:
            if sub_id in self.agents:
                sub_agent = self.agents[sub_id]
                node["subordinates"].append(self._build_hierarchy_node(sub_agent))
                
        return node
        
    async def find_available_agent(self, agent_type: AgentType, capabilities: List[str] = None) -> Optional[str]:
        """Find an available agent matching criteria"""
        candidates = await self.get_agents_by_type(agent_type)
        
        # Filter by status
        available = [
            agent for agent in candidates
            if agent.status in [AgentStatus.IDLE, AgentStatus.ACTIVE]
        ]
        
        # Filter by capabilities if specified
        if capabilities:
            available = [
                agent for agent in available
                if all(cap in agent.capabilities for cap in capabilities)
            ]
            
        # Return the least loaded agent
        if available:
            # For now, just return the first available
            return available[0].agent_id
            
        return None
        
    async def _monitor_heartbeats(self):
        """Monitor agent heartbeats and mark inactive agents"""
        while True:
            try:
                cutoff = datetime.utcnow() - timedelta(minutes=5)
                
                for agent in self.agents.values():
                    last_heartbeat = datetime.fromisoformat(agent.last_heartbeat)
                    if last_heartbeat < cutoff and agent.status != AgentStatus.OFFLINE:
                        agent.status = AgentStatus.OFFLINE
                        
                        # Notify about offline agent
                        notification = AgentMessage(
                            message_id=str(uuid.uuid4()),
                            sender_id="agent_registry",
                            recipient_id=None,
                            message_type="event",
                            payload={
                                "event": "agent_offline",
                                "agent_id": agent.agent_id,
                                "last_seen": agent.last_heartbeat
                            },
                            timestamp=datetime.utcnow().isoformat(),
                            priority="high"
                        )
                        await self.communication.send_message(notification)
                        
                await asyncio.sleep(30)  # Check every 30 seconds
                
            except Exception as e:
                logger.error(f"Error monitoring heartbeats: {e}")
                await asyncio.sleep(30)
                
    async def _cleanup_inactive_agents(self):
        """Remove agents that have been offline too long"""
        while True:
            try:
                cutoff = datetime.utcnow() - timedelta(hours=1)
                
                agents_to_remove = []
                for agent_id, agent in self.agents.items():
                    last_heartbeat = datetime.fromisoformat(agent.last_heartbeat)
                    if last_heartbeat < cutoff:
                        agents_to_remove.append(agent_id)
                        
                for agent_id in agents_to_remove:
                    await self.unregister_agent(agent_id)
                    
                await asyncio.sleep(300)  # Check every 5 minutes
                
            except Exception as e:
                logger.error(f"Error cleaning up agents: {e}")
                await asyncio.sleep(300)


# Singleton instance
_agent_registry: Optional[AgentRegistry] = None


async def get_agent_registry() -> AgentRegistry:
    """Get or create the agent registry singleton"""
    global _agent_registry
    if _agent_registry is None:
        _agent_registry = AgentRegistry()
        await _agent_registry.initialize()
    return _agent_registry