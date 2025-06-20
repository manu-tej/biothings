"""
Main FastAPI Application with Real LLM Integration
"""
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, Any, List
import asyncio
import json
from datetime import datetime
from dotenv import load_dotenv
import structlog

# Load environment variables
load_dotenv()

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.dev.ConsoleRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()

# Import our modules
from app.core.messaging import message_broker
from app.agents.ceo_agent import CEOAgent
from app.workflows.biotech_workflows import workflow_engine
from app.core.llm_claude import llm_service


class ConnectionManager:
    """Manage WebSocket connections"""
    
    def __init__(self):
        self.active_connections: List[WebSocket] = []
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info("WebSocket client connected", total_connections=len(self.active_connections))
    
    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
        logger.info("WebSocket client disconnected", total_connections=len(self.active_connections))
    
    async def broadcast(self, message: dict):
        """Broadcast message to all connected clients"""
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"Error broadcasting to client: {e}")


# Global instances
manager = ConnectionManager()
agents: Dict[str, Any] = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    # Startup
    logger.info("Starting BioThings application...")
    
    # Connect to message broker
    await message_broker.connect()
    
    # Initialize agents
    agents["CEO"] = CEOAgent()
    
    # Subscribe to WebSocket broadcast channel
    async def websocket_broadcast_handler(message):
        await manager.broadcast(message.data)
    
    await message_broker.subscribe("websocket.broadcast", websocket_broadcast_handler)
    
    logger.info("BioThings application started successfully")
    
    yield
    
    # Shutdown
    logger.info("Shutting down BioThings application...")
    await message_broker.disconnect()
    logger.info("BioThings application shut down")


# Create FastAPI app
app = FastAPI(
    title="BioThings - AI-Powered Biotech Company",
    description="Real-time dashboard for autonomous biotech operations",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "name": "BioThings API",
        "version": "1.0.0",
        "status": "operational",
        "features": {
            "llm_integration": llm_service.config.provider if llm_service.llm else "mock",
            "agents_active": len(agents),
            "workflows_available": len(workflow_engine.protocols)
        }
    }


@app.get("/api/agents")
async def get_agents():
    """Get all active agents"""
    return {
        "agents": [
            agent.get_status() for agent in agents.values()
        ]
    }


@app.post("/api/agents/{agent_type}/task")
async def assign_task(agent_type: str, task_data: Dict[str, Any]):
    """Assign a task to an agent"""
    agent_type = agent_type.upper()
    
    if agent_type not in agents:
        raise HTTPException(status_code=404, detail=f"Agent {agent_type} not found")
    
    agent = agents[agent_type]
    result = await agent.process_task(
        task=task_data.get("task", ""),
        context=task_data.get("context", {})
    )
    
    return result


@app.get("/api/experiments")
async def get_experiments():
    """Get all active experiments"""
    return {
        "experiments": [
            await workflow_engine.get_experiment_status(exp_id)
            for exp_id in workflow_engine.active_experiments.keys()
        ]
    }


@app.post("/api/experiments/start")
async def start_experiment(experiment_data: Dict[str, Any]):
    """Start a new experiment"""
    try:
        experiment = await workflow_engine.start_experiment(
            protocol_name=experiment_data["protocol"],
            scientist_id=experiment_data.get("scientist_id", "system"),
            custom_params=experiment_data.get("params")
        )
        
        # Notify agents
        await message_broker.publish(
            "experiment.started",
            {
                "experiment_id": experiment.id,
                "protocol": experiment.protocol.name,
                "scientist": experiment.assigned_scientist
            }
        )
        
        return {
            "success": True,
            "experiment": await workflow_engine.get_experiment_status(experiment.id)
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/experiments/{experiment_id}")
async def get_experiment(experiment_id: str):
    """Get specific experiment status"""
    status = await workflow_engine.get_experiment_status(experiment_id)
    
    if "error" in status:
        raise HTTPException(status_code=404, detail=status["error"])
    
    return status


@app.get("/api/equipment")
async def get_equipment_status():
    """Get lab equipment status"""
    return workflow_engine.get_equipment_status()


@app.get("/api/protocols")
async def get_protocols():
    """Get available experiment protocols"""
    return {
        "protocols": workflow_engine.get_available_protocols()
    }


@app.post("/api/chat")
async def chat_with_agent(chat_data: Dict[str, Any]):
    """Chat with a specific agent using LLM"""
    agent_type = chat_data.get("agent_type", "CEO").upper()
    message = chat_data.get("message", "")
    
    if agent_type not in agents:
        raise HTTPException(status_code=404, detail=f"Agent {agent_type} not found")
    
    agent = agents[agent_type]
    
    # Generate response using LLM
    response = await llm_service.generate_response(
        agent_id=agent.agent_id,
        system_prompt=agent.system_prompt,
        user_message=message,
        context={
            "company_metrics": getattr(agent, "company_metrics", {}),
            "department": agent.department
        }
    )
    
    # Broadcast update
    await message_broker.publish(
        "websocket.broadcast",
        {
            "type": "chat_response",
            "agent": agent_type,
            "message": message,
            "response": response,
            "timestamp": datetime.utcnow().isoformat()
        }
    )
    
    return {
        "agent": agent_type,
        "response": response,
        "conversation_summary": llm_service.get_conversation_summary(agent.agent_id)
    }


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time updates"""
    await manager.connect(websocket)
    
    try:
        # Send initial status
        await websocket.send_json({
            "type": "connection",
            "status": "connected",
            "timestamp": datetime.utcnow().isoformat()
        })
        
        # Keep connection alive and handle messages
        while True:
            data = await websocket.receive_text()
            
            try:
                message = json.loads(data)
                
                # Handle different message types
                if message.get("type") == "ping":
                    await websocket.send_json({
                        "type": "pong",
                        "timestamp": datetime.utcnow().isoformat()
                    })
                
                elif message.get("type") == "subscribe":
                    # Subscribe to specific updates
                    channel = message.get("channel")
                    logger.info(f"WebSocket subscribed to {channel}")
                
                elif message.get("type") == "command":
                    # Handle commands
                    command = message.get("command")
                    if command == "start_demo":
                        await start_demo_workflow()
                    
            except json.JSONDecodeError:
                await websocket.send_json({
                    "type": "error",
                    "message": "Invalid JSON"
                })
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)


async def start_demo_workflow():
    """Start a demo workflow to showcase the system"""
    logger.info("Starting demo workflow")
    
    # CEO makes strategic decision
    ceo_result = await agents["CEO"].process_task(
        task="Evaluate new CRISPR gene therapy project for rare disease treatment",
        context={
            "market_size": "$2.5B",
            "competition": "moderate",
            "scientific_readiness": "high"
        }
    )
    
    # Start an experiment
    experiment = await workflow_engine.start_experiment(
        protocol_name="crispr_genome_editing",
        scientist_id="demo-scientist"
    )
    
    logger.info("Demo workflow started", experiment_id=experiment.id)


@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "services": {
            "message_broker": message_broker._connected,
            "llm_service": bool(llm_service.llm),
            "agents": len(agents),
            "active_experiments": len(workflow_engine.active_experiments)
        }
    }


if __name__ == "__main__":
    import uvicorn
    
    port = int(os.getenv("API_PORT", 8000))
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        log_level="info"
    )