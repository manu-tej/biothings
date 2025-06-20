"""
BioThings Security System
Comprehensive enterprise-grade security implementation
"""

from .production_security import (
    SecurityManager,
    SecurityMiddleware,
    SecurityConfig,
    User,
    UserRole,
    SecurityLevel,
    security_manager,
    get_current_user,
    require_admin,
    require_scientist
)

from .auth_endpoints import auth_router

from .validation_middleware import (
    ValidationMiddleware,
    InputValidator,
    ValidationConfig,
    input_validator
)

from .config import (
    SecurityConfigManager,
    Environment,
    security_config,
    get_security_config
)

from .audit_logging import (
    AuditLogger,
    AuditMiddleware,
    AuditEvent,
    EventSeverity,
    EventCategory,
    audit_logger
)

from .database_models import (
    User as UserModel,
    UserSession,
    APIKey,
    AuditEvent as AuditEventModel,
    DatabaseManager,
    initialize_database,
    get_database
)

from .monitoring import (
    SecurityMonitor,
    security_monitor,
    monitoring_router
)

from .main_integration import (
    create_secure_app,
    create_development_app,
    create_production_app,
    create_app
)

__all__ = [
    # Core security
    'SecurityManager',
    'SecurityMiddleware', 
    'SecurityConfig',
    'User',
    'UserRole',
    'SecurityLevel',
    'security_manager',
    'get_current_user',
    'require_admin',
    'require_scientist',
    
    # Authentication
    'auth_router',
    
    # Validation
    'ValidationMiddleware',
    'InputValidator',
    'ValidationConfig',
    'input_validator',
    
    # Configuration
    'SecurityConfigManager',
    'Environment',
    'security_config',
    'get_security_config',
    
    # Audit logging
    'AuditLogger',
    'AuditMiddleware',
    'AuditEvent',
    'EventSeverity',
    'EventCategory',
    'audit_logger',
    
    # Database
    'UserModel',
    'UserSession',
    'APIKey',
    'AuditEventModel',
    'DatabaseManager',
    'initialize_database',
    'get_database',
    
    # Monitoring
    'SecurityMonitor',
    'security_monitor',
    'monitoring_router',
    
    # App integration
    'create_secure_app',
    'create_development_app',
    'create_production_app',
    'create_app'
]

__version__ = "1.0.0"