from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import json
from datetime import datetime
import random
import psutil

# Create FastAPI app
app = FastAPI(
    title="BioThings AI Platform",
    description="LLM-powered biotech automation and monitoring platform",
    version="0.1.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mock data
active_connections = {}

@app.get("/")
async def root():
    return {
        "message": "BioThings AI Platform API",
        "status": "operational",
        "version": "0.1.0"
    }

@app.get("/api/monitoring/metrics/current")
async def get_current_metrics():
    """Get current system metrics"""
    cpu = psutil.cpu_percent(interval=1)
    memory = psutil.virtual_memory()
    
    return {
        "system": {
            "timestamp": datetime.utcnow().isoformat(),
            "cpu_percent": cpu,
            "memory_percent": memory.percent,
            "memory_used_mb": memory.used / (1024 * 1024),
            "disk_percent": 60.0,
            "active_agents": 5,
            "active_workflows": 2,
            "websocket_connections": len(active_connections)
        }
    }

@app.get("/api/monitoring/metrics/history")
async def get_metrics_history(minutes: int = 30):
    """Get metrics history"""
    history = []
    base_cpu = 25
    base_memory = 45
    
    for i in range(min(minutes * 2, 60)):
        history.append({
            "timestamp": datetime.utcnow().replace(second=0).isoformat(),
            "cpu_percent": base_cpu + random.uniform(-10, 10),
            "memory_percent": base_memory + random.uniform(-5, 5),
            "active_agents": 5,
            "active_workflows": 2 if i % 20 < 10 else 3
        })
    
    return history

@app.get("/api/agents")
async def get_agents():
    """Get all agents"""
    return [
        {
            "id": "ceo-001",
            "name": "CEO Strategic Director",
            "agent_type": "CEO",
            "status": "active",
            "parent_id": None,
            "subordinates": ["coo-001", "cso-001", "cfo-001", "cto-001"],
            "last_active": datetime.utcnow().isoformat()
        },
        {
            "id": "coo-001",
            "name": "COO Operations Director",
            "agent_type": "COO",
            "status": "executing",
            "parent_id": "ceo-001",
            "subordinates": ["lab-mgr-001", "mfg-mgr-001"],
            "last_active": datetime.utcnow().isoformat()
        },
        {
            "id": "cso-001",
            "name": "CSO Research Director",
            "agent_type": "CSO",
            "status": "thinking",
            "parent_id": "ceo-001",
            "subordinates": ["research-mgr-001"],
            "last_active": datetime.utcnow().isoformat()
        },
        {
            "id": "cfo-001",
            "name": "CFO Financial Director",
            "agent_type": "CFO",
            "status": "active",
            "parent_id": "ceo-001",
            "subordinates": ["finance-mgr-001"],
            "last_active": datetime.utcnow().isoformat()
        },
        {
            "id": "cto-001",
            "name": "CTO Technology Director",
            "agent_type": "CTO",
            "status": "monitoring",
            "parent_id": "ceo-001",
            "subordinates": ["tech-mgr-001", "security-mgr-001"],
            "last_active": datetime.utcnow().isoformat()
        }
    ]

@app.get("/api/workflows")
async def get_workflows():
    """Get all workflows"""
    return [
        {
            "id": "wf-001",
            "name": "PCR Amplification Protocol",
            "workflow_type": "experiment",
            "status": "running",
            "progress": 0.65,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            "assigned_agents": ["lab-tech-001", "qc-001"]
        },
        {
            "id": "wf-002",
            "name": "Protein Purification Batch",
            "workflow_type": "manufacturing",
            "status": "pending",
            "progress": 0.0,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            "assigned_agents": ["manufacturing-001"]
        }
    ]

@app.get("/api/monitoring/alerts")
async def get_alerts():
    """Get system alerts"""
    return [
        {
            "id": "alert-001",
            "severity": "warning",
            "type": "Resource Usage",
            "message": "Lab equipment PCR-001 maintenance due in 3 days",
            "timestamp": datetime.utcnow().isoformat()
        }
    ]

@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await websocket.accept()
    active_connections[client_id] = websocket
    
    try:
        # Send initial connection message
        await websocket.send_json({
            "type": "connection",
            "status": "connected",
            "client_id": client_id
        })
        
        # Keep connection alive
        while True:
            data = await websocket.receive_json()
            
            # Echo back for now
            await websocket.send_json({
                "type": "echo",
                "data": data
            })
            
    except WebSocketDisconnect:
        del active_connections[client_id]
    except Exception as e:
        print(f"WebSocket error: {e}")
        if client_id in active_connections:
            del active_connections[client_id]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)