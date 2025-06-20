"""
Security Integration for BioThings Main Application
Provides secure FastAPI application setup with all security features enabled
"""
import os
from contextlib import asynccontextmanager
from typing import Dict, Any, Optional, List
from datetime import datetime
from fastapi import FastAPI, Request, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.sessions import SessionMiddleware
import structlog

# Import security components
from .production_security import (
    SecurityManager, 
    SecurityMiddleware, 
    security_manager,
    get_current_user,
    require_admin,
    require_scientist,
    User
)
from .auth_endpoints import auth_router
from .validation_middleware import ValidationMiddleware, input_validator
from .config import security_config, Environment
from .audit_logging import audit_logger, AuditMiddleware
from .monitoring import security_monitor, monitoring_router

logger = structlog.get_logger()


def create_secure_app(
    title: str = "BioThings - Secure API",
    description: str = "Production-ready biotech platform with enterprise security",
    version: str = "1.0.0",
    environment: Optional[Environment] = None
) -> FastAPI:
    """Create FastAPI application with comprehensive security"""
    
    # Use provided environment or detect from config
    env = environment or security_config.environment
    
    @asynccontextmanager
    async def lifespan(app: FastAPI):
        """Secure application lifespan manager"""
        # Startup
        logger.info("Starting secure BioThings application", environment=env.value)
        
        # Initialize security components
        security_manager.log_security_event(
            "application_startup",
            None,
            "127.0.0.1",
            "FastAPI/1.0",
            {"environment": env.value},
            "info"
        )
        
        # Start security monitoring
        await security_monitor.start()
        
        # Validate security configuration
        config_errors = security_config.validate_config()
        if config_errors and env == Environment.PRODUCTION:
            logger.critical("Security configuration errors in production", errors=config_errors)
            raise Exception(f"Production security errors: {config_errors}")
        
        logger.info("Secure BioThings application started successfully")
        
        yield
        
        # Shutdown
        logger.info("Shutting down secure BioThings application")
        
        # Stop security monitoring
        await security_monitor.stop()
        
        # Log shutdown
        security_manager.log_security_event(
            "application_shutdown",
            None,
            "127.0.0.1",
            "FastAPI/1.0",
            {"environment": env.value},
            "info"
        )
        
        logger.info("Secure BioThings application shut down")
    
    # Create FastAPI app with security settings
    app = FastAPI(
        title=title,
        description=description,
        version=version,
        lifespan=lifespan,
        docs_url="/docs" if env != Environment.PRODUCTION else None,  # Disable docs in production
        redoc_url="/redoc" if env != Environment.PRODUCTION else None,
        openapi_url="/openapi.json" if env != Environment.PRODUCTION else None
    )
    
    # Add security middleware in correct order (last added = first executed)
    
    # 1. Trusted host middleware (outermost)
    if env == Environment.PRODUCTION:
        allowed_hosts = ["biothings.ai", "*.biothings.ai"]
    else:
        allowed_hosts = ["*"]  # Allow all hosts in development
    
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=allowed_hosts
    )
    
    # 2. Security middleware for rate limiting, IP blocking, headers
    app.add_middleware(SecurityMiddleware, security_manager=security_manager)
    
    # 3. Audit logging middleware
    app.add_middleware(AuditMiddleware, audit_logger=audit_logger)
    
    # 4. Input validation middleware
    app.add_middleware(ValidationMiddleware, validator=input_validator)
    
    # 5. Session middleware for CSRF protection
    app.add_middleware(
        SessionMiddleware,
        secret_key=security_config.jwt.secret_key,
        https_only=env == Environment.PRODUCTION,
        same_site="strict"
    )
    
    # 6. CORS middleware (innermost)
    if security_config.cors.enabled:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=security_config.cors.allow_origins,
            allow_credentials=security_config.cors.allow_credentials,
            allow_methods=security_config.cors.allow_methods,
            allow_headers=security_config.cors.allow_headers,
            max_age=security_config.cors.max_age
        )
    
    # Add routers
    app.include_router(auth_router)
    app.include_router(monitoring_router)
    
    # Security exception handlers
    @app.exception_handler(HTTPException)
    async def security_http_exception_handler(request: Request, exc: HTTPException):
        """Handle HTTP exceptions with security logging"""
        
        # Log security-relevant exceptions
        if exc.status_code in [401, 403, 429]:
            security_manager.log_security_event(
                f"http_{exc.status_code}",
                None,  # User ID would be extracted from token if available
                request.client.host,
                request.headers.get("user-agent", ""),
                {
                    "path": str(request.url.path),
                    "method": request.method,
                    "detail": exc.detail
                },
                "warning" if exc.status_code == 429 else "info"
            )
        
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail},
            headers={
                "X-Content-Type-Options": "nosniff",
                "X-Frame-Options": "DENY"
            }
        )
    
    @app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception):
        """Handle general exceptions with security logging"""
        
        security_manager.log_security_event(
            "application_error",
            None,
            request.client.host,
            request.headers.get("user-agent", ""),
            {
                "path": str(request.url.path),
                "method": request.method,
                "error": str(exc)
            },
            "critical"
        )
        
        logger.error("Unhandled application error", error=str(exc), path=str(request.url.path))
        
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "Internal server error"},
            headers={
                "X-Content-Type-Options": "nosniff",
                "X-Frame-Options": "DENY"
            }
        )
    
    # Secure root endpoint
    @app.get("/")
    async def secure_root():
        """Secure root endpoint with system status"""
        return {
            "name": "BioThings Secure API",
            "version": version,
            "status": "operational",
            "security": {
                "environment": env.value,
                "authentication": "enabled",
                "rate_limiting": "enabled",
                "audit_logging": "enabled"
            },
            "timestamp": datetime.utcnow().isoformat()
        }
    
    # Security health endpoint
    @app.get("/security/health")
    async def security_health():
        """Security system health check"""
        return {
            "status": "healthy",
            "security_summary": security_manager.get_security_summary(),
            "config_summary": security_config.get_security_summary(),
            "timestamp": datetime.utcnow().isoformat()
        }
    
    # Protected endpoints examples
    @app.get("/api/secure/profile")
    async def get_user_profile(current_user: User = Depends(get_current_user)):
        """Get current user profile (authenticated endpoint)"""
        return {
            "user": {
                "id": current_user.id,
                "username": current_user.username,
                "email": current_user.email,
                "role": current_user.role.value,
                "last_login": current_user.last_login.isoformat() if current_user.last_login else None
            }
        }
    
    @app.get("/api/secure/admin/users")
    async def admin_list_users(admin_user: User = Depends(require_admin)):
        """List all users (admin only)"""
        users = []
        for user in security_manager.users.values():
            users.append({
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "role": user.role.value,
                "is_active": user.is_active,
                "created_at": user.created_at.isoformat(),
                "last_login": user.last_login.isoformat() if user.last_login else None,
                "failed_login_attempts": user.failed_login_attempts
            })
        
        return {"users": users, "total": len(users)}
    
    @app.get("/api/secure/scientist/experiments")
    async def scientist_experiments(scientist_user: User = Depends(require_scientist)):
        """Get experiments (scientist+ access required)"""
        # This would integrate with the existing experiment system
        return {
            "message": "Scientist-level access granted",
            "user_role": scientist_user.role.value,
            "experiments": []  # Would be populated with actual experiments
        }
    
    # Security administration endpoints
    @app.post("/api/security/rotate-secrets")
    async def rotate_secrets(admin_user: User = Depends(require_admin)):
        """Rotate security secrets (admin only)"""
        try:
            result = security_config.rotate_secrets()
            
            security_manager.log_security_event(
                "secrets_rotated",
                admin_user.id,
                "127.0.0.1",  # Would get real IP
                "API",
                result,
                "info"
            )
            
            return {"success": True, "result": result}
            
        except Exception as e:
            logger.error("Secret rotation failed", error=str(e))
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Secret rotation failed"
            )
    
    @app.post("/api/security/block-ip")
    async def block_ip_address(
        request: Request,
        ip_data: Dict[str, str],
        admin_user: User = Depends(require_admin)
    ):
        """Block IP address (admin only)"""
        ip_address = ip_data.get("ip_address")
        reason = ip_data.get("reason", "Manual block by admin")
        
        if not ip_address:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="IP address is required"
            )
        
        security_manager.block_ip(ip_address, reason)
        
        return {
            "success": True,
            "message": f"IP {ip_address} blocked successfully",
            "reason": reason
        }
    
    @app.delete("/api/security/unblock-ip/{ip_address}")
    async def unblock_ip_address(
        ip_address: str,
        admin_user: User = Depends(require_admin)
    ):
        """Unblock IP address (admin only)"""
        security_manager.unblock_ip(ip_address)
        
        return {
            "success": True,
            "message": f"IP {ip_address} unblocked successfully"
        }
    
    @app.get("/api/security/audit-log")
    async def get_audit_log(
        limit: int = 100,
        offset: int = 0,
        admin_user: User = Depends(require_admin)
    ):
        """Get audit log entries (admin only)"""
        events = security_manager.security_events[offset:offset + limit]
        
        return {
            "events": [
                {
                    "event_type": event.event_type,
                    "user_id": event.user_id,
                    "ip_address": event.ip_address,
                    "timestamp": event.timestamp.isoformat(),
                    "details": event.details,
                    "severity": event.severity
                }
                for event in events
            ],
            "total": len(security_manager.security_events),
            "limit": limit,
            "offset": offset
        }
    
    return app


def create_development_app() -> FastAPI:
    """Create development app with relaxed security"""
    return create_secure_app(
        title="BioThings - Development API",
        description="Development version with relaxed security settings",
        environment=Environment.DEVELOPMENT
    )


def create_production_app() -> FastAPI:
    """Create production app with maximum security"""
    return create_secure_app(
        title="BioThings - Production API",
        description="Production biotech platform with enterprise security",
        environment=Environment.PRODUCTION
    )


# Factory function for different environments
def create_app(environment: str = None) -> FastAPI:
    """Create app based on environment"""
    if not environment:
        environment = os.getenv("BIOTHINGS_ENV", "development")
    
    if environment.lower() in ["prod", "production"]:
        return create_production_app()
    elif environment.lower() in ["dev", "development"]:
        return create_development_app()
    else:
        return create_secure_app(environment=Environment(environment.lower()))


# Create app instance based on environment
app = create_app()