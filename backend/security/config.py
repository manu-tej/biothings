"""
Security Configuration Management for BioThings Platform
Handles environment-based configuration, secrets management, and security settings
"""
import os
import secrets
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field
from enum import Enum
import json
from pathlib import Path
import structlog

logger = structlog.get_logger()


class Environment(str, Enum):
    """Deployment environments"""
    DEVELOPMENT = "development"
    TESTING = "testing"
    STAGING = "staging"
    PRODUCTION = "production"


class SecurityLevel(str, Enum):
    """Security levels"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class DatabaseConfig:
    """Database configuration"""
    host: str = "localhost"
    port: int = 5432
    database: str = "biothings"
    username: str = "biothings_user"
    password: str = ""
    ssl_mode: str = "prefer"
    pool_size: int = 10
    max_overflow: int = 20
    
    @property
    def url(self) -> str:
        """Get database URL"""
        return f"postgresql://{self.username}:{self.password}@{self.host}:{self.port}/{self.database}?sslmode={self.ssl_mode}"


@dataclass
class RedisConfig:
    """Redis configuration"""
    host: str = "localhost"
    port: int = 6379
    password: str = ""
    database: int = 0
    ssl: bool = False
    
    @property
    def url(self) -> str:
        """Get Redis URL"""
        protocol = "rediss" if self.ssl else "redis"
        auth = f":{self.password}@" if self.password else ""
        return f"{protocol}://{auth}{self.host}:{self.port}/{self.database}"


@dataclass
class JWTConfig:
    """JWT configuration"""
    secret_key: str = field(default_factory=lambda: secrets.token_urlsafe(32))
    algorithm: str = "HS256"
    access_token_expire_hours: int = 24
    refresh_token_expire_days: int = 30
    issuer: str = "biothings-platform"
    audience: str = "biothings-api"
    
    def validate(self) -> List[str]:
        """Validate JWT configuration"""
        errors = []
        if len(self.secret_key) < 32:
            errors.append("JWT secret key must be at least 32 characters")
        if self.algorithm not in ["HS256", "HS384", "HS512", "RS256", "RS384", "RS512"]:
            errors.append("Invalid JWT algorithm")
        if self.access_token_expire_hours < 1 or self.access_token_expire_hours > 168:  # 1 hour to 1 week
            errors.append("Access token expiration must be between 1 and 168 hours")
        return errors


@dataclass
class RateLimitConfig:
    """Rate limiting configuration"""
    enabled: bool = True
    requests_per_minute: int = 100
    burst_requests: int = 20
    ban_duration_minutes: int = 15
    bypass_api_keys: List[str] = field(default_factory=list)
    
    # Endpoint-specific limits
    endpoint_limits: Dict[str, Dict[str, int]] = field(default_factory=lambda: {
        "/auth/login": {"requests_per_minute": 10, "burst_requests": 3},
        "/auth/register": {"requests_per_minute": 5, "burst_requests": 2},
        "/api/experiments/start": {"requests_per_minute": 20, "burst_requests": 5},
        "/api/chat": {"requests_per_minute": 50, "burst_requests": 10}
    })


@dataclass
class CORSConfig:
    """CORS configuration"""
    enabled: bool = True
    allow_origins: List[str] = field(default_factory=lambda: ["http://localhost:3000"])
    allow_methods: List[str] = field(default_factory=lambda: ["GET", "POST", "PUT", "DELETE"])
    allow_headers: List[str] = field(default_factory=lambda: ["*"])
    allow_credentials: bool = True
    max_age: int = 86400  # 24 hours


@dataclass
class PasswordPolicyConfig:
    """Password policy configuration"""
    min_length: int = 8
    max_length: int = 128
    require_uppercase: bool = True
    require_lowercase: bool = True
    require_numbers: bool = True
    require_special_chars: bool = True
    prevent_common_passwords: bool = True
    password_history_count: int = 5
    
    def validate_password(self, password: str) -> List[str]:
        """Validate password against policy"""
        errors = []
        
        if len(password) < self.min_length:
            errors.append(f"Password must be at least {self.min_length} characters")
        if len(password) > self.max_length:
            errors.append(f"Password must be at most {self.max_length} characters")
        
        if self.require_uppercase and not any(c.isupper() for c in password):
            errors.append("Password must contain uppercase letters")
        
        if self.require_lowercase and not any(c.islower() for c in password):
            errors.append("Password must contain lowercase letters")
        
        if self.require_numbers and not any(c.isdigit() for c in password):
            errors.append("Password must contain numbers")
        
        if self.require_special_chars and not any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in password):
            errors.append("Password must contain special characters")
        
        # Check common passwords if enabled
        if self.prevent_common_passwords:
            common_passwords = {
                "password", "123456", "password123", "admin", "qwerty",
                "letmein", "welcome", "monkey", "dragon", "master"
            }
            if password.lower() in common_passwords:
                errors.append("Password is too common")
        
        return errors


@dataclass
class SecurityHeadersConfig:
    """Security headers configuration"""
    strict_transport_security: str = "max-age=31536000; includeSubDomains"
    content_security_policy: str = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data: https:; "
        "font-src 'self' https:; "
        "connect-src 'self' wss: https:;"
    )
    x_content_type_options: str = "nosniff"
    x_frame_options: str = "DENY"
    x_xss_protection: str = "1; mode=block"
    referrer_policy: str = "strict-origin-when-cross-origin"
    permissions_policy: str = (
        "geolocation=(), "
        "microphone=(), "
        "camera=(), "
        "payment=(), "
        "usb=(), "
        "magnetometer=(), "
        "gyroscope=(), "
        "accelerometer=()"
    )


@dataclass
class AuditConfig:
    """Audit logging configuration"""
    enabled: bool = True
    log_all_requests: bool = False
    log_failed_logins: bool = True
    log_admin_actions: bool = True
    log_data_access: bool = True
    retention_days: int = 90
    export_format: str = "json"  # json, csv, syslog
    
    # Events to always log
    critical_events: List[str] = field(default_factory=lambda: [
        "login_failed", "account_locked", "privilege_escalation",
        "data_export", "system_configuration_change", "api_key_created",
        "user_created", "user_deleted", "password_changed"
    ])


@dataclass
class EncryptionConfig:
    """Encryption configuration"""
    algorithm: str = "AES-256-GCM"
    key_rotation_days: int = 90
    backup_encryption: bool = True
    
    def generate_key(self) -> str:
        """Generate encryption key"""
        return secrets.token_urlsafe(32)


class SecurityConfigManager:
    """Security configuration manager"""
    
    def __init__(self, environment: Environment = Environment.DEVELOPMENT):
        self.environment = environment
        self.config_dir = Path("config")
        self.secrets_file = self.config_dir / f".secrets.{environment.value}.json"
        
        # Initialize configurations
        self.database = DatabaseConfig()
        self.redis = RedisConfig()
        self.jwt = JWTConfig()
        self.rate_limit = RateLimitConfig()
        self.cors = CORSConfig()
        self.password_policy = PasswordPolicyConfig()
        self.security_headers = SecurityHeadersConfig()
        self.audit = AuditConfig()
        self.encryption = EncryptionConfig()
        
        # Load configuration
        self.load_config()
        
        # Validate configuration
        self.validate_config()
    
    def load_config(self):
        """Load configuration from environment and files"""
        # Load from environment variables
        self._load_from_environment()
        
        # Load from configuration files
        self._load_from_files()
        
        # Adjust for environment
        self._adjust_for_environment()
    
    def _load_from_environment(self):
        """Load configuration from environment variables"""
        # Database
        self.database.host = os.getenv("DB_HOST", self.database.host)
        self.database.port = int(os.getenv("DB_PORT", self.database.port))
        self.database.database = os.getenv("DB_NAME", self.database.database)
        self.database.username = os.getenv("DB_USER", self.database.username)
        self.database.password = os.getenv("DB_PASSWORD", self.database.password)
        
        # Redis
        self.redis.host = os.getenv("REDIS_HOST", self.redis.host)
        self.redis.port = int(os.getenv("REDIS_PORT", self.redis.port))
        self.redis.password = os.getenv("REDIS_PASSWORD", self.redis.password)
        
        # JWT
        self.jwt.secret_key = os.getenv("JWT_SECRET_KEY", self.jwt.secret_key)
        self.jwt.algorithm = os.getenv("JWT_ALGORITHM", self.jwt.algorithm)
        
        # Security
        if os.getenv("SECURITY_LEVEL"):
            self.security_level = SecurityLevel(os.getenv("SECURITY_LEVEL"))
        
        # CORS
        if os.getenv("ALLOWED_ORIGINS"):
            self.cors.allow_origins = os.getenv("ALLOWED_ORIGINS").split(",")
    
    def _load_from_files(self):
        """Load configuration from files"""
        # Load secrets file if it exists
        if self.secrets_file.exists():
            try:
                with open(self.secrets_file, 'r') as f:
                    secrets_data = json.load(f)
                
                # Apply secrets to configuration
                if "jwt_secret_key" in secrets_data:
                    self.jwt.secret_key = secrets_data["jwt_secret_key"]
                if "db_password" in secrets_data:
                    self.database.password = secrets_data["db_password"]
                if "redis_password" in secrets_data:
                    self.redis.password = secrets_data["redis_password"]
                    
            except Exception as e:
                logger.warning("Failed to load secrets file", error=str(e))
    
    def _adjust_for_environment(self):
        """Adjust configuration based on environment"""
        if self.environment == Environment.PRODUCTION:
            # Production security settings
            self.jwt.access_token_expire_hours = 1  # Shorter token lifetime
            self.rate_limit.requests_per_minute = 60  # More restrictive
            self.cors.allow_origins = ["https://biothings.ai"]  # Specific domain
            self.password_policy.min_length = 12  # Stronger passwords
            self.audit.log_all_requests = True  # Full logging
            
        elif self.environment == Environment.STAGING:
            # Staging settings
            self.jwt.access_token_expire_hours = 2
            self.rate_limit.requests_per_minute = 80
            self.cors.allow_origins = ["https://staging.biothings.ai"]
            
        elif self.environment == Environment.DEVELOPMENT:
            # Development settings (more permissive)
            self.jwt.access_token_expire_hours = 24
            self.rate_limit.requests_per_minute = 200
            self.cors.allow_origins = ["http://localhost:3000", "http://127.0.0.1:3000"]
            self.password_policy.min_length = 8
            self.audit.log_all_requests = False
    
    def validate_config(self) -> List[str]:
        """Validate all configuration"""
        errors = []
        
        # Validate JWT config
        errors.extend(self.jwt.validate())
        
        # Validate database connection (basic checks)
        if not self.database.host:
            errors.append("Database host is required")
        if not self.database.username:
            errors.append("Database username is required")
        
        # Environment-specific validations
        if self.environment == Environment.PRODUCTION:
            if self.jwt.secret_key == JWTConfig().secret_key:
                errors.append("JWT secret key must be changed in production")
            if not self.database.password:
                errors.append("Database password is required in production")
            if "localhost" in self.cors.allow_origins:
                errors.append("Localhost should not be in CORS origins for production")
        
        if errors:
            logger.error("Configuration validation failed", errors=errors)
            if self.environment == Environment.PRODUCTION:
                raise ValueError(f"Production configuration errors: {errors}")
        
        return errors
    
    def save_secrets(self):
        """Save secrets to encrypted file"""
        secrets_data = {
            "jwt_secret_key": self.jwt.secret_key,
            "db_password": self.database.password,
            "redis_password": self.redis.password,
            "created_at": datetime.utcnow().isoformat(),
            "environment": self.environment.value
        }
        
        # Ensure config directory exists
        self.config_dir.mkdir(exist_ok=True)
        
        try:
            with open(self.secrets_file, 'w') as f:
                json.dump(secrets_data, f, indent=2)
            
            # Set restrictive permissions
            os.chmod(self.secrets_file, 0o600)
            
            logger.info("Secrets saved successfully", file=str(self.secrets_file))
            
        except Exception as e:
            logger.error("Failed to save secrets", error=str(e))
            raise
    
    def get_security_summary(self) -> Dict[str, Any]:
        """Get security configuration summary"""
        return {
            "environment": self.environment.value,
            "jwt": {
                "algorithm": self.jwt.algorithm,
                "access_token_expire_hours": self.jwt.access_token_expire_hours,
                "refresh_token_expire_days": self.jwt.refresh_token_expire_days
            },
            "rate_limiting": {
                "enabled": self.rate_limit.enabled,
                "requests_per_minute": self.rate_limit.requests_per_minute
            },
            "cors": {
                "enabled": self.cors.enabled,
                "allowed_origins": self.cors.allow_origins
            },
            "password_policy": {
                "min_length": self.password_policy.min_length,
                "require_special_chars": self.password_policy.require_special_chars
            },
            "audit": {
                "enabled": self.audit.enabled,
                "retention_days": self.audit.retention_days
            }
        }
    
    def rotate_secrets(self):
        """Rotate secrets (JWT key, etc.)"""
        old_jwt_key = self.jwt.secret_key
        
        # Generate new JWT secret
        self.jwt.secret_key = secrets.token_urlsafe(32)
        
        # Save new secrets
        self.save_secrets()
        
        logger.info("Secrets rotated successfully")
        
        return {
            "jwt_key_rotated": True,
            "old_key_hash": hash(old_jwt_key),
            "new_key_hash": hash(self.jwt.secret_key),
            "rotation_time": datetime.utcnow().isoformat()
        }


# Global configuration instance
def get_security_config(environment: str = None) -> SecurityConfigManager:
    """Get security configuration instance"""
    env = Environment(environment) if environment else Environment.DEVELOPMENT
    return SecurityConfigManager(env)


# Environment detection
def detect_environment() -> Environment:
    """Detect current environment"""
    env_var = os.getenv("BIOTHINGS_ENV", "development").lower()
    
    if env_var in ["prod", "production"]:
        return Environment.PRODUCTION
    elif env_var in ["stage", "staging"]:
        return Environment.STAGING
    elif env_var in ["test", "testing"]:
        return Environment.TESTING
    else:
        return Environment.DEVELOPMENT


# Create global config instance
current_environment = detect_environment()
security_config = get_security_config(current_environment.value)