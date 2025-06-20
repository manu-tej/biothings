"""
Simplified main with live agent data (no complex imports)
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
import asyncio
import json
import random
import psutil
from typing import Dict, Set
import uuid

app = FastAPI(title="BioThings AI Platform - Live", version="0.3.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# WebSocket connections
active_connections: Dict[str, WebSocket] = {}

# Simulated agents with live behavior
agents = {
    "ceo_001": {
        "id": "ceo_001",
        "name": "Strategic Director",
        "agent_type": "CEO",
        "status": "active",
        "parent_id": None,
        "subordinates": ["coo_001", "cso_001", "cfo_001", "cto_001"],
        "department": "Executive",
        "last_active": datetime.utcnow().isoformat(),
        "capabilities": ["strategic_planning", "decision_making", "crisis_management"]
    },
    "coo_001": {
        "id": "coo_001",
        "name": "Operations Director",
        "agent_type": "COO",
        "status": "executing",
        "parent_id": "ceo_001",
        "subordinates": ["lab_mgr_001", "mfg_mgr_001"],
        "department": "Operations",
        "last_active": datetime.utcnow().isoformat(),
        "capabilities": ["process_optimization", "resource_management", "quality_control"]
    },
    "cso_001": {
        "id": "cso_001",
        "name": "Research Director",
        "agent_type": "CSO",
        "status": "thinking",
        "parent_id": "ceo_001",
        "subordinates": ["research_mgr_001"],
        "department": "Research",
        "last_active": datetime.utcnow().isoformat(),
        "capabilities": ["research_strategy", "innovation", "clinical_trials"]
    },
    "cfo_001": {
        "id": "cfo_001",
        "name": "Financial Director",
        "agent_type": "CFO",
        "status": "active",
        "parent_id": "ceo_001",
        "subordinates": ["finance_mgr_001"],
        "department": "Finance",
        "last_active": datetime.utcnow().isoformat(),
        "capabilities": ["budget_management", "roi_analysis", "risk_assessment"]
    },
    "cto_001": {
        "id": "cto_001",
        "name": "Technology Director",
        "agent_type": "CTO",
        "status": "monitoring",
        "parent_id": "ceo_001",
        "subordinates": ["tech_mgr_001", "security_mgr_001"],
        "department": "Technology",
        "last_active": datetime.utcnow().isoformat(),
        "capabilities": ["tech_strategy", "infrastructure", "security", "innovation"]
    }
}

# Background task to simulate agent activity
async def simulate_agent_activity():
    """Simulate agent status changes and activity"""
    statuses = ["idle", "active", "thinking", "executing", "monitoring"]
    
    while True:
        # Randomly update an agent's status
        agent_id = random.choice(list(agents.keys()))
        agent = agents[agent_id]
        
        # Update status
        old_status = agent["status"]
        agent["status"] = random.choice(statuses)
        agent["last_active"] = datetime.utcnow().isoformat()
        
        # Broadcast status change
        update = {
            "type": "agent_status_update",
            "timestamp": datetime.utcnow().isoformat(),
            "agent_id": agent_id,
            "old_status": old_status,
            "new_status": agent["status"],
            "agent": agent
        }
        
        await broadcast_to_websockets(update)
        
        # Simulate some agent communication
        if random.random() > 0.7:
            sender = random.choice(list(agents.keys()))
            recipient = random.choice(list(agents.keys()))
            if sender != recipient:
                message = {
                    "type": "agent_message",
                    "timestamp": datetime.utcnow().isoformat(),
                    "message_id": str(uuid.uuid4()),
                    "sender_id": sender,
                    "recipient_id": recipient,
                    "message_type": random.choice(["command", "query", "report"]),
                    "payload": {
                        "content": f"Message from {agents[sender]['name']} to {agents[recipient]['name']}"
                    }
                }
                await broadcast_to_websockets(message)
        
        await asyncio.sleep(random.uniform(2, 8))

async def broadcast_to_websockets(data: dict):
    """Broadcast data to all connected WebSocket clients"""
    disconnected = []
    for client_id, websocket in active_connections.items():
        try:
            await websocket.send_json(data)
        except:
            disconnected.append(client_id)
    
    # Clean up disconnected clients
    for client_id in disconnected:
        active_connections.pop(client_id, None)

# Start background task on startup
@app.on_event("startup")
async def startup_event():
    asyncio.create_task(simulate_agent_activity())
    print("🚀 BioThings AI Platform - Live Mode Started")

@app.get("/")
async def root():
    return {
        "name": "BioThings AI Platform - Live",
        "version": "0.3.0",
        "status": "running",
        "agents": len(agents),
        "connections": len(active_connections)
    }

@app.get("/api/agents")
async def get_agents():
    """Get all agents with current status"""
    return list(agents.values())

@app.get("/api/agents/{agent_id}")
async def get_agent(agent_id: str):
    """Get specific agent details"""
    if agent_id not in agents:
        return {"error": "Agent not found"}
    return agents[agent_id]

@app.get("/api/hierarchy")
async def get_hierarchy():
    """Get agent hierarchy"""
    # Find CEO
    ceo = next(a for a in agents.values() if a["agent_type"] == "CEO")
    
    def build_hierarchy(agent):
        node = {
            "id": agent["id"],
            "name": agent["name"],
            "type": agent["agent_type"],
            "status": agent["status"],
            "department": agent["department"],
            "subordinates": []
        }
        
        for sub_id in agent.get("subordinates", []):
            if sub_id in agents:
                node["subordinates"].append(build_hierarchy(agents[sub_id]))
        
        return node
    
    return build_hierarchy(ceo)

@app.get("/api/monitoring/metrics/current")
async def get_metrics():
    """Get current system metrics"""
    cpu = psutil.cpu_percent(interval=1)
    memory = psutil.virtual_memory()
    
    # Count agent statuses
    status_counts = {}
    for agent in agents.values():
        status = agent["status"]
        status_counts[status] = status_counts.get(status, 0) + 1
    
    return {
        "timestamp": datetime.utcnow().isoformat(),
        "system": {
            "cpu_percent": cpu,
            "memory_percent": memory.percent,
            "memory_used_gb": memory.used / (1024**3),
            "memory_total_gb": memory.total / (1024**3)
        },
        "agents": {
            "total_agents": len(agents),
            "active_agents": sum(1 for a in agents.values() if a["status"] != "idle"),
            "status_breakdown": status_counts
        },
        "websocket_connections": len(active_connections)
    }

@app.get("/api/workflows")
async def get_workflows():
    """Get active workflows with live progress"""
    progress = random.uniform(0.3, 0.8)
    return [
        {
            "id": "wf-001",
            "name": "Drug Discovery Pipeline",
            "workflow_type": "research",
            "status": "running",
            "progress": progress,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            "assigned_agents": ["cso_001"],
            "stages": [
                {"name": "Target Identification", "status": "completed"},
                {"name": "Lead Discovery", "status": "in_progress"},
                {"name": "Lead Optimization", "status": "pending"},
                {"name": "Preclinical Testing", "status": "pending"}
            ]
        }
    ]

@app.get("/api/monitoring/alerts")
async def get_alerts():
    """Get system alerts"""
    alerts = []
    
    # Check memory
    memory = psutil.virtual_memory()
    if memory.percent > 80:
        alerts.append({
            "id": "alert-mem",
            "severity": "warning",
            "type": "System Resource",
            "message": f"High memory usage: {memory.percent:.1f}%",
            "timestamp": datetime.utcnow().isoformat()
        })
    
    # Random agent alerts
    if random.random() > 0.8:
        agent = random.choice(list(agents.values()))
        alerts.append({
            "id": f"alert-{agent['id']}",
            "severity": "info",
            "type": "Agent Activity",
            "message": f"{agent['name']} completed a task",
            "timestamp": datetime.utcnow().isoformat()
        })
    
    return alerts

@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await websocket.accept()
    active_connections[client_id] = websocket
    
    # Send connection confirmation
    await websocket.send_json({
        "type": "connection",
        "status": "connected",
        "client_id": client_id,
        "timestamp": datetime.utcnow().isoformat()
    })
    
    # Send initial agent status
    await websocket.send_json({
        "type": "agent_status_update",
        "timestamp": datetime.utcnow().isoformat(),
        "agents": list(agents.values())
    })
    
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        active_connections.pop(client_id, None)
        print(f"Client {client_id} disconnected")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)