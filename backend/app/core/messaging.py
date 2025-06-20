"""
Real-time Messaging System with Redis Pub/Sub
"""
import json
import asyncio
from typing import Dict, Any, Callable, List, Optional
from datetime import datetime
import redis.asyncio as redis
from redis.asyncio.client import PubSub
import structlog
from pydantic import BaseModel

logger = structlog.get_logger()


class Message(BaseModel):
    """Standard message format"""
    id: str
    channel: str
    type: str
    sender: str
    data: Dict[str, Any]
    timestamp: datetime
    correlation_id: Optional[str] = None


class MessageBroker:
    """Redis-based message broker for inter-agent communication"""
    
    def __init__(self, redis_url: str = "redis://localhost:6379"):
        self.redis_url = redis_url
        self.redis_client: Optional[redis.Redis] = None
        self.pubsub: Optional[PubSub] = None
        self.subscriptions: Dict[str, List[Callable]] = {}
        self._listener_task: Optional[asyncio.Task] = None
        self._connected = False
    
    async def connect(self):
        """Connect to Redis"""
        try:
            self.redis_client = redis.from_url(self.redis_url, decode_responses=True)
            self.pubsub = self.redis_client.pubsub()
            await self.redis_client.ping()
            self._connected = True
            
            # Start listener
            self._listener_task = asyncio.create_task(self._listen())
            
            logger.info("Connected to Redis message broker")
            
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {e}")
            self._connected = False
            raise
    
    async def disconnect(self):
        """Disconnect from Redis"""
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
        
        self._connected = False
        logger.info("Disconnected from Redis message broker")
    
    async def publish(self, channel: str, data: Dict[str, Any], sender: str = "system") -> str:
        """Publish message to a channel"""
        if not self._connected:
            await self.connect()
        
        message = Message(
            id=f"msg-{datetime.utcnow().timestamp()}",
            channel=channel,
            type=data.get("type", "generic"),
            sender=sender,
            data=data,
            timestamp=datetime.utcnow()
        )
        
        try:
            await self.redis_client.publish(
                channel,
                message.model_dump_json()
            )
            
            # Store message in history
            await self._store_message(message)
            
            logger.debug(f"Published message to {channel}", message_id=message.id)
            return message.id
            
        except Exception as e:
            logger.error(f"Failed to publish message: {e}", channel=channel)
            raise
    
    async def subscribe(self, channel: str, callback: Callable):
        """Subscribe to a channel"""
        if channel not in self.subscriptions:
            self.subscriptions[channel] = []
            await self.pubsub.subscribe(channel)
            logger.info(f"Subscribed to channel: {channel}")
        
        self.subscriptions[channel].append(callback)
    
    async def unsubscribe(self, channel: str, callback: Optional[Callable] = None):
        """Unsubscribe from a channel"""
        if channel not in self.subscriptions:
            return
        
        if callback:
            self.subscriptions[channel].remove(callback)
        
        if not callback or not self.subscriptions[channel]:
            await self.pubsub.unsubscribe(channel)
            del self.subscriptions[channel]
            logger.info(f"Unsubscribed from channel: {channel}")
    
    async def _listen(self):
        """Listen for messages"""
        try:
            async for message in self.pubsub.listen():
                if message["type"] == "message":
                    await self._handle_message(message)
                    
        except asyncio.CancelledError:
            logger.info("Message listener cancelled")
            raise
        except Exception as e:
            logger.error(f"Error in message listener: {e}")
    
    async def _handle_message(self, raw_message: Dict[str, Any]):
        """Handle incoming message"""
        try:
            channel = raw_message["channel"]
            data = raw_message["data"]
            
            # Parse message
            message = Message.model_validate_json(data)
            
            # Call all callbacks for this channel
            if channel in self.subscriptions:
                for callback in self.subscriptions[channel]:
                    try:
                        if asyncio.iscoroutinefunction(callback):
                            await callback(message)
                        else:
                            callback(message)
                    except Exception as e:
                        logger.error(f"Callback error: {e}", channel=channel)
            
        except Exception as e:
            logger.error(f"Failed to handle message: {e}")
    
    async def _store_message(self, message: Message):
        """Store message in history"""
        try:
            # Store in Redis list with TTL
            key = f"message_history:{message.channel}"
            await self.redis_client.lpush(key, message.model_dump_json())
            await self.redis_client.ltrim(key, 0, 999)  # Keep last 1000 messages
            await self.redis_client.expire(key, 86400)  # 24 hour TTL
            
        except Exception as e:
            logger.error(f"Failed to store message: {e}")
    
    async def get_message_history(self, channel: str, limit: int = 100) -> List[Message]:
        """Get message history for a channel"""
        try:
            key = f"message_history:{channel}"
            messages = await self.redis_client.lrange(key, 0, limit - 1)
            
            return [
                Message.model_validate_json(msg)
                for msg in messages
            ]
            
        except Exception as e:
            logger.error(f"Failed to get message history: {e}", channel=channel)
            return []
    
    async def create_request_response(
        self,
        channel: str,
        request_data: Dict[str, Any],
        sender: str,
        timeout: float = 30.0
    ) -> Optional[Message]:
        """Send request and wait for response"""
        
        # Create correlation ID
        correlation_id = f"corr-{datetime.utcnow().timestamp()}"
        response_channel = f"{channel}.response.{correlation_id}"
        
        # Setup response listener
        response_future = asyncio.Future()
        
        async def response_handler(message: Message):
            if message.correlation_id == correlation_id:
                response_future.set_result(message)
        
        await self.subscribe(response_channel, response_handler)
        
        try:
            # Send request
            request_data["response_channel"] = response_channel
            request_data["correlation_id"] = correlation_id
            
            await self.publish(channel, request_data, sender)
            
            # Wait for response
            response = await asyncio.wait_for(response_future, timeout)
            return response
            
        except asyncio.TimeoutError:
            logger.warning(f"Request timeout", channel=channel, correlation_id=correlation_id)
            return None
            
        finally:
            await self.unsubscribe(response_channel)
    
    async def broadcast(self, data: Dict[str, Any], sender: str = "system"):
        """Broadcast message to all agents"""
        await self.publish("broadcast.all", data, sender)
    
    async def send_to_agent(self, agent_id: str, data: Dict[str, Any], sender: str):
        """Send direct message to specific agent"""
        await self.publish(f"agent.{agent_id}", data, sender)
    
    async def send_to_department(self, department: str, data: Dict[str, Any], sender: str):
        """Send message to all agents in a department"""
        await self.publish(f"department.{department.lower()}", data, sender)


# Global instance (will be initialized on app startup)
message_broker = MessageBroker()