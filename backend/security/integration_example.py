"""
Example Integration of BioThings Security System
This file shows how to integrate the security system with the existing main.py
"""
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from datetime import datetime
from typing import Dict, Any

# Import security components
from security import (
    # Core security
    SecurityMiddleware,
    ValidationMiddleware, 
    AuditMiddleware,
    security_manager,
    audit_logger,
    input_validator,
    
    # Authentication
    auth_router,
    get_current_user,
    require_admin,
    require_scientist,
    User,
    
    # Configuration
    security_config,
    Environment,
    
    # Monitoring
    monitoring_router,
    security_monitor,
    
    # Database
    initialize_database
)

# Import existing BioThings modules
from app.agents.ceo_agent import CEOAgent
from app.agents.cso_agent import CSOAgent
from app.agents.cfo_agent import CFOAgent
from app.agents.cto_agent import CTOAgent
from app.agents.coo_agent import COOAgent
from app.core.messaging import message_broker
from app.core.llm import llm_service
from app.workflows.biotech_workflows import workflow_engine
from app.analytics.metrics_engine import metrics_engine
import structlog

logger = structlog.get_logger()


@asynccontextmanager
async def secure_lifespan(app: FastAPI):
    """Secure application lifespan with security initialization"""
    # Startup
    logger.info("Starting secure BioThings application", environment=security_config.environment.value)
    
    # Initialize database if URL is provided
    db_url = os.getenv("DATABASE_URL") or security_config.database.url
    if db_url and db_url != "postgresql://biothings_user:@localhost:5432/biothings?sslmode=prefer":
        try:
            db_manager = initialize_database(db_url)
            # Create default admin user
            db_manager.create_default_admin()
            logger.info("Database initialized successfully")
        except Exception as e:
            logger.warning("Database initialization failed", error=str(e))
    
    # Start security monitoring
    try:
        await security_monitor.start()
        logger.info("Security monitoring started")
    except Exception as e:
        logger.warning("Security monitoring failed to start", error=str(e))
    
    # Connect to message broker (optional)
    try:
        await message_broker.connect()
        logger.info("Message broker connected")
    except Exception as e:
        logger.warning(f"Redis not available: {e}. Running without message broker.")
    
    # Initialize agents
    agents = {
        "CEO": CEOAgent(),
        "CSO": CSOAgent(), 
        "CFO": CFOAgent(),
        "CTO": CTOAgent(),
        "COO": COOAgent()
    }
    
    # Store agents in app state
    app.state.agents = agents
    
    # Log application startup
    security_manager.log_security_event(
        "application_startup",
        None,
        "127.0.0.1",
        "FastAPI/1.0",
        {
            "environment": security_config.environment.value,
            "agents_count": len(agents),
            "security_enabled": True
        },
        "info"
    )
    
    logger.info("Secure BioThings application started successfully")
    
    yield
    
    # Shutdown
    logger.info("Shutting down secure BioThings application")
    
    # Stop security monitoring
    if security_monitor.is_running:
        await security_monitor.stop()
    
    # Disconnect message broker
    if message_broker._connected:
        await message_broker.disconnect()
    
    # Log application shutdown
    security_manager.log_security_event(
        "application_shutdown",
        None,
        "127.0.0.1", 
        "FastAPI/1.0",
        {"environment": security_config.environment.value},
        "info"
    )
    
    logger.info("Secure BioThings application shut down")


def create_secure_biothings_app() -> FastAPI:
    """Create secure BioThings application"""
    
    # Create FastAPI app with security
    app = FastAPI(
        title="BioThings - Secure AI Biotech Platform",
        description="Production-ready biotech platform with enterprise security",
        version="1.0.0",
        lifespan=secure_lifespan,
        # Disable docs in production
        docs_url="/docs" if security_config.environment != Environment.PRODUCTION else None,
        redoc_url="/redoc" if security_config.environment != Environment.PRODUCTION else None,
        openapi_url="/openapi.json" if security_config.environment != Environment.PRODUCTION else None
    )
    
    # Add security middleware (order is important - last added runs first)
    app.add_middleware(SecurityMiddleware, security_manager=security_manager)
    app.add_middleware(AuditMiddleware, audit_logger=audit_logger)
    app.add_middleware(ValidationMiddleware, validator=input_validator)
    
    # Add CORS middleware (configured through security config)
    if security_config.cors.enabled:
        from fastapi.middleware.cors import CORSMiddleware
        app.add_middleware(
            CORSMiddleware,
            allow_origins=security_config.cors.allow_origins,
            allow_credentials=security_config.cors.allow_credentials,
            allow_methods=security_config.cors.allow_methods,
            allow_headers=security_config.cors.allow_headers,
            max_age=security_config.cors.max_age
        )
    
    # Include security routers
    app.include_router(auth_router)
    app.include_router(monitoring_router)
    
    # Secure root endpoint
    @app.get("/")
    async def secure_root():
        """Secure root endpoint"""
        return {
            "name": "BioThings Secure API",
            "version": "1.0.0",
            "status": "operational",
            "security": {
                "environment": security_config.environment.value,
                "authentication": "enabled",
                "rate_limiting": "enabled",
                "audit_logging": "enabled",
                "monitoring": security_monitor.is_running
            },
            "features": {
                "llm_model": llm_service.model if hasattr(llm_service, 'model') else "gemini-2.5-flash",
                "agents_active": len(getattr(app.state, 'agents', {})),
                "workflows_available": len(workflow_engine.protocols) if hasattr(workflow_engine, 'protocols') else 0
            },
            "timestamp": datetime.utcnow().isoformat()
        }
    
    # Secure health check
    @app.get("/api/health")
    async def secure_health_check():
        """Comprehensive health check with security status"""
        return {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "services": {
                "message_broker": message_broker._connected,
                "llm_service": bool(llm_service.llm),
                "agents": len(getattr(app.state, 'agents', {})),
                "active_experiments": len(workflow_engine.active_experiments),
                "security_monitor": security_monitor.is_running,
                "audit_logger": audit_logger is not None
            },
            "security": security_manager.get_security_summary(),
            "environment": security_config.environment.value
        }
    
    # Protected agent endpoints
    @app.get("/api/agents")
    async def get_agents(current_user: User = Depends(get_current_user)):
        """Get all active agents (requires authentication)"""
        agents = getattr(app.state, 'agents', {})
        
        # Log data access
        security_manager.log_security_event(
            "agents_list_accessed",
            current_user.id,
            "127.0.0.1",  # Would get real IP from request
            "API",
            {"agent_count": len(agents)},
            "info"
        )
        
        return {
            "agents": [
                agent.get_status() for agent in agents.values()
            ]
        }
    
    @app.post("/api/agents/{agent_type}/task") 
    async def assign_task(
        agent_type: str, 
        task_data: Dict[str, Any],
        current_user: User = Depends(require_scientist)  # Requires scientist role or higher
    ):
        """Assign a task to an agent (scientist+ access required)"""
        agents = getattr(app.state, 'agents', {})
        agent_type = agent_type.upper()
        
        if agent_type not in agents:
            raise HTTPException(status_code=404, detail=f"Agent {agent_type} not found")
        
        agent = agents[agent_type]
        result = await agent.process_task(
            task=task_data.get("task", ""),
            context=task_data.get("context", {})
        )
        
        # Log task assignment
        security_manager.log_security_event(
            "agent_task_assigned",
            current_user.id,
            "127.0.0.1",
            "API",
            {
                "agent_type": agent_type,
                "task": task_data.get("task", "")[:100],  # First 100 chars
                "user_role": current_user.role.value
            },
            "info"
        )
        
        return result
    
    @app.get("/api/experiments")
    async def get_experiments(current_user: User = Depends(require_scientist)):
        """Get all active experiments (scientist+ access required)"""
        experiments = [
            await workflow_engine.get_experiment_status(exp_id)
            for exp_id in workflow_engine.active_experiments.keys()
        ]
        
        # Log data access
        security_manager.log_security_event(
            "experiments_accessed",
            current_user.id,
            "127.0.0.1",
            "API",
            {"experiment_count": len(experiments)},
            "info"
        )
        
        return {"experiments": experiments}
    
    @app.post("/api/experiments/start")
    async def start_experiment(
        experiment_data: Dict[str, Any],
        current_user: User = Depends(require_scientist)
    ):
        """Start a new experiment (scientist+ access required)"""
        try:
            experiment = await workflow_engine.start_experiment(
                protocol_name=experiment_data["protocol"],
                scientist_id=current_user.id,  # Use authenticated user ID
                custom_params=experiment_data.get("params")
            )
            
            # Log experiment creation
            security_manager.log_security_event(
                "experiment_started",
                current_user.id,
                "127.0.0.1",
                "API",
                {
                    "experiment_id": experiment.id,
                    "protocol": experiment.protocol.name,
                    "scientist": current_user.username
                },
                "info"
            )
            
            # Notify other agents
            await message_broker.publish(
                "experiment.started",
                {
                    "experiment_id": experiment.id,
                    "protocol": experiment.protocol.name,
                    "scientist": current_user.username,
                    "started_by": current_user.id
                }
            )
            
            return {
                "success": True,
                "experiment": await workflow_engine.get_experiment_status(experiment.id)
            }
            
        except Exception as e:
            # Log error
            security_manager.log_security_event(
                "experiment_start_failed",
                current_user.id,
                "127.0.0.1",
                "API",
                {"error": str(e), "protocol": experiment_data.get("protocol")},
                "error"
            )
            raise HTTPException(status_code=400, detail=str(e))
    
    @app.post("/api/chat")
    async def chat_with_agent(
        chat_data: Dict[str, Any],
        current_user: User = Depends(get_current_user)
    ):
        """Chat with a specific agent (requires authentication)"""
        agents = getattr(app.state, 'agents', {})
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
                "department": agent.department,
                "user": current_user.username,
                "user_role": current_user.role.value
            }
        )
        
        # Log chat interaction
        security_manager.log_security_event(
            "agent_chat_interaction",
            current_user.id,
            "127.0.0.1",
            "API",
            {
                "agent": agent_type,
                "message_length": len(message),
                "response_length": len(response)
            },
            "info"
        )
        
        # Broadcast update
        await message_broker.publish(
            "websocket.broadcast",
            {
                "type": "chat_response",
                "agent": agent_type,
                "user": current_user.username,
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
    
    # Admin-only endpoints
    @app.get("/api/admin/security/summary")
    async def get_security_summary(admin_user: User = Depends(require_admin)):
        """Get comprehensive security summary (admin only)"""
        return {
            "security_manager": security_manager.get_security_summary(),
            "audit_stats": audit_logger.get_statistics(),
            "monitoring": security_monitor.get_metrics_summary(),
            "config": security_config.get_security_summary(),
            "threat_indicators": security_monitor.get_threat_indicators(min_score=30),
            "active_alerts": security_monitor.get_active_alerts()
        }
    
    @app.post("/api/admin/security/test-alert")
    async def test_security_alert(admin_user: User = Depends(require_admin)):
        """Test security alert system (admin only)"""
        # Create test alert
        security_manager.log_security_event(
            "test_alert",
            admin_user.id,
            "127.0.0.1",
            "API",
            {"test": True, "admin": admin_user.username},
            "warning"
        )
        
        return {"success": True, "message": "Test alert created"}
    
    # Error handlers with security logging
    @app.exception_handler(HTTPException)
    async def security_http_exception_handler(request: Request, exc: HTTPException):
        """Handle HTTP exceptions with security logging"""
        
        # Extract user info if available
        user_id = None
        try:
            # Try to get user from authorization header
            auth_header = request.headers.get("authorization")
            if auth_header and auth_header.startswith("Bearer "):
                token = auth_header.split(" ")[1]
                payload = security_manager.verify_token(token)
                user_id = payload.get("sub")
        except:
            pass
        
        # Log security-relevant exceptions
        if exc.status_code in [401, 403, 404, 429]:
            security_manager.log_security_event(
                f"http_{exc.status_code}",
                user_id,
                request.client.host,
                request.headers.get("user-agent", ""),
                {
                    "path": str(request.url.path),
                    "method": request.method,
                    "detail": exc.detail
                },
                "warning" if exc.status_code in [429] else "info"
            )
        
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail},
            headers=security_config.security_headers.__dict__
        )
    
    return app


# Create the secure app
app = create_secure_biothings_app()

# For development/testing
if __name__ == "__main__":
    import uvicorn
    
    port = int(os.getenv("API_PORT", 8000))
    uvicorn.run(
        "integration_example:app",
        host="0.0.0.0",
        port=port,
        reload=security_config.environment == Environment.DEVELOPMENT,
        log_level="info"
    )