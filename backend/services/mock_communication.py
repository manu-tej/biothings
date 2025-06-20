"""
Mock communication service for testing without Redis
Uses in-memory message passing
"""

import asyncio
from typing import Dict, Any, Optional, Callable, List
from datetime import datetime
import json
import logging
from collections import defaultdict

from backend.services.communication import AgentMessage

logger = logging.getLogger(__name__)


class MockCommunicationService:
    """Mock communication service using in-memory queues"""
    
    def __init__(self):
        self.subscriptions: Dict[str, List[Callable]] = defaultdict(list)
        self.message_queues: Dict[str, asyncio.Queue] = defaultdict(asyncio.Queue)
        self.message_history: List[AgentMessage] = []
        self.agent_registry: Dict[str, Dict[str, Any]] = {}
        self.running = True
        self._listeners: Dict[str, asyncio.Task] = {}
        
    async def connect(self):
        """Mock connect - no actual connection needed"""
        logger.info("Mock communication service initialized")
        
    async def disconnect(self):
        """Clean up listeners"""
        self.running = False
        for task in self._listeners.values():
            task.cancel()
        self._listeners.clear()
        logger.info("Mock communication service disconnected")
        
    async def subscribe_agent(self, agent_id: str, handler: Callable):
        """Subscribe an agent to receive messages"""
        # Personal channel
        personal_channel = f"agent:{agent_id}"
        self.subscriptions[personal_channel].append(handler)
        
        # Broadcast channel
        self.subscriptions["agent:broadcast"].append(handler)
        
        # Department channels
        if "ceo" in agent_id:
            self.subscriptions["agent:executives"].append(handler)
        elif any(role in agent_id for role in ["coo", "cso", "cfo", "cto"]):
            self.subscriptions["agent:executives"].append(handler)
            dept = agent_id.split('-')[0]
            self.subscriptions[f"agent:dept:{dept}"].append(handler)
        
        logger.info(f"Agent {agent_id} subscribed to mock channels")
        
    async def send_message(self, message: AgentMessage):
        """Send a message"""
        # Store in history
        self.message_history.append(message)
        
        # Determine channel
        if message.recipient_id:
            channel = f"agent:{message.recipient_id}"
        else:
            channel = "agent:broadcast"
            
        # Deliver to handlers
        handlers = self.subscriptions.get(channel, [])
        for handler in handlers:
            asyncio.create_task(handler(message))
            
        logger.debug(f"Message sent from {message.sender_id} to {channel}")
        
    async def send_to_department(self, department: str, message: AgentMessage):
        """Send to department"""
        channel = f"agent:dept:{department}"
        handlers = self.subscriptions.get(channel, [])
        for handler in handlers:
            asyncio.create_task(handler(message))
        self.message_history.append(message)
        
    async def send_to_executives(self, message: AgentMessage):
        """Send to executives"""
        channel = "agent:executives"
        handlers = self.subscriptions.get(channel, [])
        for handler in handlers:
            asyncio.create_task(handler(message))
        self.message_history.append(message)
        
    async def request_response(self, message: AgentMessage, timeout: float = 30.0) -> Optional[AgentMessage]:
        """Send and wait for response - simplified mock version"""
        await self.send_message(message)
        # In a real implementation, this would wait for actual response
        # For mock, return None after brief delay
        await asyncio.sleep(0.1)
        return None
        
    async def register_agent(self, agent_id: str, agent_info: Dict[str, Any]):
        """Register agent in mock registry"""
        agent_info['last_seen'] = datetime.utcnow().isoformat()
        self.agent_registry[agent_id] = agent_info
        logger.info(f"Agent {agent_id} registered in mock registry")
        
    async def get_active_agents(self) -> List[Dict[str, Any]]:
        """Get active agents from mock registry"""
        return list(self.agent_registry.values())
        
    async def get_message_history(self, date: str = None, limit: int = 100) -> List[AgentMessage]:
        """Get message history"""
        return self.message_history[-limit:]
        
    async def heartbeat(self, agent_id: str):
        """Update heartbeat"""
        if agent_id in self.agent_registry:
            self.agent_registry[agent_id]['last_seen'] = datetime.utcnow().isoformat()


# Create a singleton instance
_mock_service: Optional[MockCommunicationService] = None


async def get_mock_communication_service() -> MockCommunicationService:
    """Get or create mock service"""
    global _mock_service
    if _mock_service is None:
        _mock_service = MockCommunicationService()
        await _mock_service.connect()
    return _mock_service