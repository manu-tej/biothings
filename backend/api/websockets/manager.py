from typing import Dict, Set, List
from fastapi import WebSocket
import json
import asyncio
import logging

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self):
        # Map client_id to WebSocket connection
        self.active_connections: Dict[str, WebSocket] = {}
        # Map channel to set of client_ids
        self.channel_subscriptions: Dict[str, Set[str]] = {}
        # Map client_id to set of channels
        self.client_subscriptions: Dict[str, Set[str]] = {}
        
    async def connect(self, websocket: WebSocket, client_id: str):
        """Accept and store a new WebSocket connection"""
        await websocket.accept()
        self.active_connections[client_id] = websocket
        self.client_subscriptions[client_id] = set()
        logger.info(f"Client {client_id} connected. Total connections: {len(self.active_connections)}")
        
    async def disconnect(self, client_id: str):
        """Remove a WebSocket connection and clean up subscriptions"""
        if client_id in self.active_connections:
            # Remove from all channel subscriptions
            if client_id in self.client_subscriptions:
                for channel in self.client_subscriptions[client_id]:
                    if channel in self.channel_subscriptions:
                        self.channel_subscriptions[channel].discard(client_id)
                        if not self.channel_subscriptions[channel]:
                            del self.channel_subscriptions[channel]
                del self.client_subscriptions[client_id]
            
            # Remove the connection
            del self.active_connections[client_id]
            logger.info(f"Client {client_id} disconnected. Total connections: {len(self.active_connections)}")
    
    async def subscribe(self, client_id: str, channel: str):
        """Subscribe a client to a channel"""
        if client_id not in self.active_connections:
            return
        
        # Add to channel subscriptions
        if channel not in self.channel_subscriptions:
            self.channel_subscriptions[channel] = set()
        self.channel_subscriptions[channel].add(client_id)
        
        # Add to client subscriptions
        self.client_subscriptions[client_id].add(channel)
        
        logger.info(f"Client {client_id} subscribed to channel {channel}")
        
        # Send confirmation
        await self.send_personal_message(
            json.dumps({
                "type": "subscription_confirmed",
                "channel": channel
            }),
            client_id
        )
    
    async def unsubscribe(self, client_id: str, channel: str):
        """Unsubscribe a client from a channel"""
        if client_id not in self.active_connections:
            return
        
        # Remove from channel subscriptions
        if channel in self.channel_subscriptions:
            self.channel_subscriptions[channel].discard(client_id)
            if not self.channel_subscriptions[channel]:
                del self.channel_subscriptions[channel]
        
        # Remove from client subscriptions
        if client_id in self.client_subscriptions:
            self.client_subscriptions[client_id].discard(channel)
        
        logger.info(f"Client {client_id} unsubscribed from channel {channel}")
    
    async def send_personal_message(self, message: str, client_id: str):
        """Send a message to a specific client"""
        if client_id in self.active_connections:
            try:
                await self.active_connections[client_id].send_text(message)
            except Exception as e:
                logger.error(f"Error sending message to client {client_id}: {str(e)}")
                await self.disconnect(client_id)
    
    async def broadcast_to_channel(self, channel: str, message: str):
        """Broadcast a message to all clients subscribed to a channel"""
        if channel not in self.channel_subscriptions:
            return
        
        # Send to all subscribed clients
        disconnected_clients = []
        for client_id in self.channel_subscriptions[channel]:
            if client_id in self.active_connections:
                try:
                    await self.active_connections[client_id].send_text(message)
                except Exception as e:
                    logger.error(f"Error broadcasting to client {client_id}: {str(e)}")
                    disconnected_clients.append(client_id)
        
        # Clean up disconnected clients
        for client_id in disconnected_clients:
            await self.disconnect(client_id)
    
    async def broadcast_to_all(self, message: str):
        """Broadcast a message to all connected clients"""
        disconnected_clients = []
        for client_id, connection in self.active_connections.items():
            try:
                await connection.send_text(message)
            except Exception as e:
                logger.error(f"Error broadcasting to client {client_id}: {str(e)}")
                disconnected_clients.append(client_id)
        
        # Clean up disconnected clients
        for client_id in disconnected_clients:
            await self.disconnect(client_id)
    
    def get_connection_count(self) -> int:
        """Get the number of active connections"""
        return len(self.active_connections)
    
    def get_channel_info(self) -> Dict[str, int]:
        """Get information about channel subscriptions"""
        return {
            channel: len(subscribers) 
            for channel, subscribers in self.channel_subscriptions.items()
        }