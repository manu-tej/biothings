from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncio
import json
from typing import Dict, Set
import logging

from api.websockets.manager import ConnectionManager
from api.endpoints import agents, monitoring, workflows
from monitoring.metrics import MetricsCollector

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# WebSocket connection manager
manager = ConnectionManager()
metrics_collector = MetricsCollector()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting up BioThings AI Platform...")
    # Start background tasks
    asyncio.create_task(metrics_collector.start_collection())
    yield
    # Shutdown
    logger.info("Shutting down BioThings AI Platform...")
    await metrics_collector.stop_collection()

# Create FastAPI app
app = FastAPI(
    title="BioThings AI Platform",
    description="LLM-powered biotech automation and monitoring platform",
    version="0.1.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(agents.router, prefix="/api/agents", tags=["agents"])
app.include_router(monitoring.router, prefix="/api/monitoring", tags=["monitoring"])
app.include_router(workflows.router, prefix="/api/workflows", tags=["workflows"])

@app.get("/")
async def root():
    return {
        "message": "BioThings AI Platform API",
        "status": "operational",
        "version": "0.1.0"
    }

@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await manager.connect(websocket, client_id)
    try:
        while True:
            # Receive message from client
            data = await websocket.receive_json()
            
            # Process different message types
            if data["type"] == "subscribe":
                await manager.subscribe(client_id, data["channel"])
            elif data["type"] == "unsubscribe":
                await manager.unsubscribe(client_id, data["channel"])
            elif data["type"] == "agent_command":
                # Forward command to agent system
                await handle_agent_command(client_id, data["payload"])
            elif data["type"] == "metrics_request":
                # Send current metrics
                metrics = await metrics_collector.get_current_metrics()
                await manager.send_personal_message(
                    json.dumps({"type": "metrics", "data": metrics}),
                    client_id
                )
    except WebSocketDisconnect:
        await manager.disconnect(client_id)
        logger.info(f"Client {client_id} disconnected")
    except Exception as e:
        logger.error(f"WebSocket error for client {client_id}: {str(e)}")
        await manager.disconnect(client_id)

async def handle_agent_command(client_id: str, payload: dict):
    """Handle commands sent to agents"""
    try:
        # This will be implemented when we create the agent system
        logger.info(f"Received agent command from {client_id}: {payload}")
        # Send acknowledgment
        await manager.send_personal_message(
            json.dumps({
                "type": "command_ack",
                "status": "received",
                "command_id": payload.get("command_id")
            }),
            client_id
        )
    except Exception as e:
        logger.error(f"Error handling agent command: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )