"""
Inter-agent communication service using Redis pub/sub
Handles message routing, agent discovery, and real-time coordination
"""

import json
import asyncio
from typing import Dict, Any, Optional, Callable, List
from datetime import datetime
import redis.asyncio as redis
from pydantic import BaseModel
import logging

logger = logging.getLogger(__name__)


class AgentMessage(BaseModel):
    """Standard message format for inter-agent communication"""
    message_id: str
    sender_id: str
    recipient_id: Optional[str] = None  # None for broadcast
    message_type: str  # command, query, response, event, report
    payload: Dict[str, Any]
    timestamp: str
    correlation_id: Optional[str] = None  # For request-response tracking
    priority: str = "normal"  # low, normal, high, critical


class CommunicationService:
    """Manages inter-agent communication via Redis pub/sub"""
    
    def __init__(self, redis_url: str = "redis://localhost:6379"):
        self.redis_url = redis_url
        self.redis_client: Optional[redis.Redis] = None
        self.pubsub: Optional[redis.client.PubSub] = None
        self.subscriptions: Dict[str, List[Callable]] = {}
        self.running = False
        self._listener_task: Optional[asyncio.Task] = None
        
    async def connect(self):
        """Connect to Redis and start listening"""
        try:
            self.redis_client = await redis.from_url(self.redis_url)
            self.pubsub = self.redis_client.pubsub()
            self.running = True
            
            # Start the listener task
            self._listener_task = asyncio.create_task(self._listen())
            
            logger.info("Communication service connected to Redis")
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {e}")
            raise
            
    async def disconnect(self):
        """Disconnect from Redis"""
        self.running = False
        
        if self._listener_task:
            self._listener_task.cancel()
            try:
                await self._listener_task
            except asyncio.CancelledError:
                pass
                
        if self.pubsub:
            await self.pubsub.close()
            
        if self.redis_client:
            await self.redis_client.close()
            
        logger.info("Communication service disconnected")
        
    async def subscribe_agent(self, agent_id: str, handler: Callable):
        """Subscribe an agent to receive messages"""
        # Personal channel for direct messages
        personal_channel = f"agent:{agent_id}"
        await self.pubsub.subscribe(personal_channel)
        
        if personal_channel not in self.subscriptions:
            self.subscriptions[personal_channel] = []
        self.subscriptions[personal_channel].append(handler)
        
        # Broadcast channel for all agents
        broadcast_channel = "agent:broadcast"
        if broadcast_channel not in self.subscriptions:
            await self.pubsub.subscribe(broadcast_channel)
            self.subscriptions[broadcast_channel] = []
        self.subscriptions[broadcast_channel].append(handler)
        
        # Department channels based on agent type
        if "ceo" in agent_id:
            await self._subscribe_to_channel("executives", handler)
        elif any(role in agent_id for role in ["coo", "cso", "cfo", "cto"]):
            await self._subscribe_to_channel("executives", handler)
            await self._subscribe_to_channel(f"dept:{agent_id.split('-')[0]}", handler)
        elif "manager" in agent_id:
            await self._subscribe_to_channel("managers", handler)
        elif "worker" in agent_id or "tech" in agent_id:
            await self._subscribe_to_channel("workers", handler)
            
        logger.info(f"Agent {agent_id} subscribed to communication channels")
        
    async def _subscribe_to_channel(self, channel: str, handler: Callable):
        """Subscribe to a specific channel"""
        full_channel = f"agent:{channel}"
        if full_channel not in self.subscriptions:
            await self.pubsub.subscribe(full_channel)
            self.subscriptions[full_channel] = []
        self.subscriptions[full_channel].append(handler)
        
    async def send_message(self, message: AgentMessage):
        """Send a message to an agent or broadcast"""
        # Serialize message
        message_data = message.json()
        
        # Determine channel
        if message.recipient_id:
            # Direct message
            channel = f"agent:{message.recipient_id}"
        else:
            # Broadcast
            channel = "agent:broadcast"
            
        # Publish message
        await self.redis_client.publish(channel, message_data)
        
        # Store message in history
        await self._store_message(message)
        
        logger.debug(f"Message sent from {message.sender_id} to {channel}")
        
    async def send_to_department(self, department: str, message: AgentMessage):
        """Send a message to all agents in a department"""
        channel = f"agent:dept:{department}"
        message_data = message.json()
        await self.redis_client.publish(channel, message_data)
        await self._store_message(message)
        
    async def send_to_executives(self, message: AgentMessage):
        """Send a message to all executive agents"""
        channel = "agent:executives"
        message_data = message.json()
        await self.redis_client.publish(channel, message_data)
        await self._store_message(message)
        
    async def request_response(self, message: AgentMessage, timeout: float = 30.0) -> Optional[AgentMessage]:
        """Send a message and wait for a response"""
        # Create a temporary response channel
        response_channel = f"response:{message.message_id}"
        await self.pubsub.subscribe(response_channel)
        
        # Send the request
        await self.send_message(message)
        
        # Wait for response
        try:
            async with asyncio.timeout(timeout):
                while True:
                    message_data = await self.pubsub.get_message(ignore_subscribe_messages=True)
                    if message_data and message_data['type'] == 'message':
                        response = AgentMessage.parse_raw(message_data['data'])
                        await self.pubsub.unsubscribe(response_channel)
                        return response
                    await asyncio.sleep(0.1)
        except asyncio.TimeoutError:
            await self.pubsub.unsubscribe(response_channel)
            logger.warning(f"Request {message.message_id} timed out")
            return None
            
    async def _listen(self):
        """Listen for messages and dispatch to handlers"""
        while self.running:
            try:
                message_data = await self.pubsub.get_message(ignore_subscribe_messages=True)
                if message_data and message_data['type'] == 'message':
                    channel = message_data['channel'].decode('utf-8')
                    message = AgentMessage.parse_raw(message_data['data'])
                    
                    # Dispatch to all handlers for this channel
                    handlers = self.subscriptions.get(channel, [])
                    for handler in handlers:
                        asyncio.create_task(handler(message))
                        
            except Exception as e:
                logger.error(f"Error in message listener: {e}")
                
            await asyncio.sleep(0.01)
            
    async def _store_message(self, message: AgentMessage):
        """Store message in Redis for history/audit"""
        key = f"message_history:{datetime.utcnow().strftime('%Y%m%d')}"
        await self.redis_client.lpush(key, message.json())
        await self.redis_client.ltrim(key, 0, 9999)  # Keep last 10k messages per day
        await self.redis_client.expire(key, 86400 * 7)  # 7 day retention
        
    async def get_message_history(self, date: str = None, limit: int = 100) -> List[AgentMessage]:
        """Retrieve message history"""
        if not date:
            date = datetime.utcnow().strftime('%Y%m%d')
            
        key = f"message_history:{date}"
        messages = await self.redis_client.lrange(key, 0, limit - 1)
        
        return [AgentMessage.parse_raw(msg) for msg in messages]
        
    async def register_agent(self, agent_id: str, agent_info: Dict[str, Any]):
        """Register an agent in the system"""
        key = f"agent_registry:{agent_id}"
        agent_info['last_seen'] = datetime.utcnow().isoformat()
        await self.redis_client.hset(key, mapping={
            k: json.dumps(v) if isinstance(v, (dict, list)) else str(v)
            for k, v in agent_info.items()
        })
        await self.redis_client.expire(key, 3600)  # 1 hour TTL
        
    async def get_active_agents(self) -> List[Dict[str, Any]]:
        """Get list of active agents"""
        pattern = "agent_registry:*"
        agents = []
        
        async for key in self.redis_client.scan_iter(match=pattern):
            agent_data = await self.redis_client.hgetall(key)
            agent_info = {}
            for field, value in agent_data.items():
                field_str = field.decode('utf-8')
                value_str = value.decode('utf-8')
                try:
                    agent_info[field_str] = json.loads(value_str)
                except:
                    agent_info[field_str] = value_str
            agents.append(agent_info)
            
        return agents
        
    async def heartbeat(self, agent_id: str):
        """Update agent heartbeat"""
        key = f"agent_registry:{agent_id}"
        await self.redis_client.hset(key, "last_seen", datetime.utcnow().isoformat())
        await self.redis_client.expire(key, 3600)


# Singleton instance
_communication_service: Optional[CommunicationService] = None


async def get_communication_service() -> CommunicationService:
    """Get or create the communication service singleton"""
    global _communication_service
    if _communication_service is None:
        _communication_service = CommunicationService()
        await _communication_service.connect()
    return _communication_service