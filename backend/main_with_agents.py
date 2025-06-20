"""
Main FastAPI application with real agent integration
Streams live agent data to the dashboard
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
import asyncio
import json
import logging
from typing import Dict, List, Optional
import psutil

from services.websocket_manager import WebSocketManager
from services.agent_orchestrator import get_agent_orchestrator
from services.mock_communication import get_mock_communication_service

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="BioThings AI Platform API", version="0.2.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# WebSocket manager
manager = WebSocketManager()

# Agent orchestrator will be initialized on startup
orchestrator = None


@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    global orchestrator
    
    logger.info("Starting BioThings AI Platform...")
    
    # Initialize communication service
    comm_service = await get_mock_communication_service()
    
    # Initialize agent orchestrator
    orchestrator = await get_agent_orchestrator(manager)
    
    logger.info("All services initialized successfully")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    if orchestrator:
        await orchestrator.shutdown()
    logger.info("Shutdown complete")


@app.get("/")
async def root():
    return {
        "name": "BioThings AI Platform API",
        "version": "0.2.0",
        "status": "running",
        "features": ["real_agents", "live_communication", "workflow_automation"]
    }


@app.get("/api/agents")
async def get_agents():
    """Get all agents with real-time status"""
    if not orchestrator:
        raise HTTPException(status_code=503, detail="Orchestrator not initialized")
    
    agents = []
    for agent_id, agent in orchestrator.agents.items():
        agent_data = {
            "id": agent_id,
            "name": agent.name,
            "agent_type": agent.agent_type.value,
            "status": agent.status.value,
            "parent_id": getattr(agent, 'reporting_to', None),
            "subordinates": agent.subordinates,
            "department": getattr(agent, 'department', 'general'),
            "last_active": agent.last_active.isoformat() if hasattr(agent, 'last_active') else datetime.utcnow().isoformat(),
            "capabilities": getattr(agent, 'capabilities', [])
        }
        agents.append(agent_data)
    
    return agents


@app.get("/api/agents/{agent_id}")
async def get_agent(agent_id: str):
    """Get specific agent details"""
    if not orchestrator:
        raise HTTPException(status_code=503, detail="Orchestrator not initialized")
    
    agent = orchestrator.agents.get(agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    return {
        "id": agent_id,
        "name": agent.name,
        "agent_type": agent.agent_type.value,
        "status": agent.status.value,
        "department": getattr(agent, 'department', 'general'),
        "subordinates": agent.subordinates,
        "reporting_to": getattr(agent, 'reporting_to', None),
        "capabilities": getattr(agent, 'capabilities', []),
        "metrics": {
            "tasks_completed": len(getattr(agent, 'task_history', [])),
            "uptime": (datetime.utcnow() - agent.created_at).total_seconds(),
            "last_active": agent.last_active.isoformat() if hasattr(agent, 'last_active') else None
        }
    }


@app.post("/api/agents/{agent_id}/command")
async def send_command_to_agent(agent_id: str, command: Dict[str, any]):
    """Send a command to an agent"""
    if not orchestrator:
        raise HTTPException(status_code=503, detail="Orchestrator not initialized")
    
    result = await orchestrator.send_command_to_agent(
        agent_id,
        command.get("command"),
        command.get("parameters", {})
    )
    
    return result


@app.get("/api/hierarchy")
async def get_agent_hierarchy():
    """Get the complete agent hierarchy"""
    if not orchestrator:
        raise HTTPException(status_code=503, detail="Orchestrator not initialized")
    
    hierarchy = await orchestrator.get_agent_hierarchy()
    return hierarchy


@app.get("/api/monitoring/metrics/current")
async def get_current_metrics():
    """Get real-time system metrics"""
    cpu_percent = psutil.cpu_percent(interval=1)
    memory = psutil.virtual_memory()
    
    # Get agent metrics from orchestrator
    agent_metrics = {}
    if orchestrator:
        active_agents = len([a for a in orchestrator.agents.values() 
                           if hasattr(a, 'status') and a.status.value != 'offline'])
        agent_metrics = {
            "total_agents": len(orchestrator.agents),
            "active_agents": active_agents,
            "agent_types": {}
        }
        
        # Count by type
        for agent in orchestrator.agents.values():
            agent_type = agent.agent_type.value
            agent_metrics["agent_types"][agent_type] = agent_metrics["agent_types"].get(agent_type, 0) + 1
    
    return {
        "timestamp": datetime.utcnow().isoformat(),
        "system": {
            "cpu_percent": cpu_percent,
            "memory_percent": memory.percent,
            "memory_used_gb": memory.used / (1024**3),
            "memory_total_gb": memory.total / (1024**3)
        },
        "agents": agent_metrics,
        "websocket_connections": len(manager.active_connections)
    }


@app.get("/api/workflows")
async def get_workflows():
    """Get active workflows"""
    # For now, return sample workflows
    # In production, this would query the workflow engine
    return [
        {
            "id": "wf-001",
            "name": "Drug Discovery Pipeline",
            "workflow_type": "research",
            "status": "running",
            "progress": 0.35,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            "assigned_agents": ["cso_001", "research_mgr_001"],
            "stages": [
                {"name": "Target Identification", "status": "completed"},
                {"name": "Lead Discovery", "status": "in_progress"},
                {"name": "Lead Optimization", "status": "pending"},
                {"name": "Preclinical Testing", "status": "pending"}
            ]
        },
        {
            "id": "wf-002",
            "name": "Production Scale-Up",
            "workflow_type": "manufacturing",
            "status": "pending",
            "progress": 0.0,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            "assigned_agents": ["coo_001", "manufacturing_mgr_001"]
        }
    ]


@app.post("/api/workflows/simulate")
async def simulate_workflow(workflow: Dict[str, str]):
    """Simulate a workflow to demonstrate agent coordination"""
    if not orchestrator:
        raise HTTPException(status_code=503, detail="Orchestrator not initialized")
    
    workflow_type = workflow.get("type", "drug_discovery")
    result = await orchestrator.simulate_workflow(workflow_type)
    
    return result


@app.get("/api/monitoring/alerts")
async def get_alerts():
    """Get system alerts"""
    alerts = []
    
    if orchestrator:
        # Check for offline agents
        for agent_id, agent in orchestrator.agents.items():
            if hasattr(agent, 'status') and agent.status.value == 'offline':
                alerts.append({
                    "id": f"alert-{agent_id}",
                    "severity": "warning",
                    "type": "Agent Status",
                    "message": f"Agent {agent.name} is offline",
                    "timestamp": datetime.utcnow().isoformat()
                })
    
    # Add system alerts
    memory = psutil.virtual_memory()
    if memory.percent > 80:
        alerts.append({
            "id": "alert-memory",
            "severity": "warning",
            "type": "System Resource",
            "message": f"High memory usage: {memory.percent}%",
            "timestamp": datetime.utcnow().isoformat()
        })
    
    return alerts


@app.get("/api/messages/history")
async def get_message_history(limit: int = 50):
    """Get agent communication history"""
    if not orchestrator:
        return []
    
    comm_service = orchestrator.communication_service
    if comm_service:
        messages = await comm_service.get_message_history(limit=limit)
        return [msg.dict() for msg in messages]
    
    return []


@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    """WebSocket endpoint for real-time updates"""
    await manager.connect(websocket, client_id)
    
    try:
        # Send initial connection message
        await websocket.send_json({
            "type": "connection",
            "status": "connected",
            "client_id": client_id,
            "timestamp": datetime.utcnow().isoformat()
        })
        
        # Keep connection alive
        while True:
            # Wait for any message from client
            data = await websocket.receive_text()
            
            # Handle ping/pong for keepalive
            if data == "ping":
                await websocket.send_text("pong")
            else:
                # Process other messages if needed
                try:
                    message = json.loads(data)
                    # Handle different message types
                    if message.get("type") == "command":
                        # Forward command to appropriate agent
                        agent_id = message.get("agent_id")
                        command = message.get("command")
                        if agent_id and command and orchestrator:
                            result = await orchestrator.send_command_to_agent(
                                agent_id, command, message.get("parameters", {})
                            )
                            await websocket.send_json({
                                "type": "command_result",
                                "result": result,
                                "timestamp": datetime.utcnow().isoformat()
                            })
                except json.JSONDecodeError:
                    logger.error(f"Invalid JSON from client {client_id}: {data}")
                    
    except WebSocketDisconnect:
        manager.disconnect(client_id)
        logger.info(f"Client {client_id} disconnected")
    except Exception as e:
        logger.error(f"WebSocket error for client {client_id}: {e}")
        manager.disconnect(client_id)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)