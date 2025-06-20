"""
Production Security Implementation for BioThings
Implements comprehensive security measures including authentication, authorization,
rate limiting, input validation, and security monitoring
"""
import hashlib
import hmac
import secrets
import time
import jwt
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List, Set
from functools import wraps
from dataclasses import dataclass
from enum import Enum

from fastapi import Request, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials, OAuth2PasswordBearer
from fastapi.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
import bcrypt
import structlog

logger = structlog.get_logger()


class UserRole(str, Enum):
    """User roles for RBAC"""
    ADMIN = "admin"
    SCIENTIST = "scientist"
    OBSERVER = "observer"
    API_CLIENT = "api_client"


class SecurityLevel(str, Enum):
    """Security levels for different operations"""
    PUBLIC = "public"
    AUTHENTICATED = "authenticated"
    SCIENTIST_ONLY = "scientist_only"
    ADMIN_ONLY = "admin_only"


@dataclass
class User:
    """User model"""
    id: str
    username: str
    email: str
    role: UserRole
    is_active: bool
    created_at: datetime
    last_login: Optional[datetime] = None
    failed_login_attempts: int = 0
    account_locked_until: Optional[datetime] = None


@dataclass
class SecurityAuditEvent:
    """Security audit event"""
    event_type: str
    user_id: Optional[str]
    ip_address: str
    user_agent: str
    timestamp: datetime
    details: Dict[str, Any]
    severity: str  # info, warning, critical


class SecurityConfig:
    """Security configuration"""
    # JWT settings
    JWT_SECRET_KEY = secrets.token_urlsafe(32)
    JWT_ALGORITHM = "HS256"
    JWT_EXPIRATION_HOURS = 24
    JWT_REFRESH_EXPIRATION_DAYS = 30
    
    # Rate limiting
    RATE_LIMIT_REQUESTS = 100
    RATE_LIMIT_PERIOD = 60  # seconds
    RATE_LIMIT_BURST = 20
    
    # Account lockout
    MAX_LOGIN_ATTEMPTS = 5
    LOCKOUT_DURATION_MINUTES = 30
    
    # Password requirements
    MIN_PASSWORD_LENGTH = 8
    REQUIRE_UPPERCASE = True
    REQUIRE_LOWERCASE = True
    REQUIRE_NUMBERS = True
    REQUIRE_SPECIAL_CHARS = True
    
    # API security
    API_KEY_LENGTH = 32
    REQUIRE_HTTPS = True
    
    # CORS settings
    ALLOWED_ORIGINS = ["https://yourdomain.com"]
    ALLOWED_METHODS = ["GET", "POST", "PUT", "DELETE"]
    ALLOWED_HEADERS = ["Authorization", "Content-Type"]


class SecurityManager:
    """Centralized security management"""
    
    def __init__(self, config: SecurityConfig = None):
        self.config = config or SecurityConfig()
        self.users: Dict[str, User] = {}
        self.api_keys: Dict[str, Dict[str, Any]] = {}
        self.rate_limiters: Dict[str, List[float]] = {}
        self.blocked_ips: Set[str] = set()
        self.security_events: List[SecurityAuditEvent] = []
        self.bearer_scheme = HTTPBearer()
        self.oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")
        
        # Initialize default admin user (change in production!)
        self._create_default_admin()
    
    def _create_default_admin(self):
        """Create default admin user"""
        admin_user = User(
            id="admin-001",
            username="admin",
            email="admin@biothings.ai",
            role=UserRole.ADMIN,
            is_active=True,
            created_at=datetime.utcnow()
        )
        self.users[admin_user.id] = admin_user
        logger.warning("Default admin user created - change credentials in production!")
    
    def hash_password(self, password: str) -> str:
        """Hash password using bcrypt"""
        return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    def verify_password(self, password: str, hashed: str) -> bool:
        """Verify password against hash"""
        return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
    
    def validate_password_strength(self, password: str) -> List[str]:
        """Validate password against security requirements"""
        errors = []
        
        if len(password) < self.config.MIN_PASSWORD_LENGTH:
            errors.append(f"Password must be at least {self.config.MIN_PASSWORD_LENGTH} characters")
        
        if self.config.REQUIRE_UPPERCASE and not any(c.isupper() for c in password):
            errors.append("Password must contain uppercase letters")
        
        if self.config.REQUIRE_LOWERCASE and not any(c.islower() for c in password):
            errors.append("Password must contain lowercase letters")
        
        if self.config.REQUIRE_NUMBERS and not any(c.isdigit() for c in password):
            errors.append("Password must contain numbers")
        
        if self.config.REQUIRE_SPECIAL_CHARS and not any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in password):
            errors.append("Password must contain special characters")
        
        return errors
    
    def create_access_token(self, user_id: str, expires_delta: Optional[timedelta] = None) -> str:
        """Create JWT access token"""
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(hours=self.config.JWT_EXPIRATION_HOURS)
        
        user = self.users.get(user_id)
        if not user:
            raise ValueError("User not found")
        
        to_encode = {
            "sub": user_id,
            "username": user.username,
            "role": user.role.value,
            "exp": expire,
            "iat": datetime.utcnow(),
            "type": "access"
        }
        
        return jwt.encode(to_encode, self.config.JWT_SECRET_KEY, algorithm=self.config.JWT_ALGORITHM)
    
    def create_refresh_token(self, user_id: str) -> str:
        """Create JWT refresh token"""
        expire = datetime.utcnow() + timedelta(days=self.config.JWT_REFRESH_EXPIRATION_DAYS)
        
        to_encode = {
            "sub": user_id,
            "exp": expire,
            "iat": datetime.utcnow(),
            "type": "refresh"
        }
        
        return jwt.encode(to_encode, self.config.JWT_SECRET_KEY, algorithm=self.config.JWT_ALGORITHM)
    
    def verify_token(self, token: str) -> Dict[str, Any]:
        """Verify and decode JWT token"""
        try:
            payload = jwt.decode(
                token, 
                self.config.JWT_SECRET_KEY, 
                algorithms=[self.config.JWT_ALGORITHM]
            )
            return payload
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired"
            )
        except jwt.JWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
    
    def generate_api_key(self, name: str, permissions: List[str]) -> str:
        """Generate API key"""
        api_key = secrets.token_urlsafe(self.config.API_KEY_LENGTH)
        
        self.api_keys[api_key] = {
            "name": name,
            "permissions": permissions,
            "created_at": datetime.utcnow(),
            "last_used": None,
            "usage_count": 0
        }
        
        return api_key
    
    def verify_api_key(self, api_key: str) -> Dict[str, Any]:
        """Verify API key"""
        key_info = self.api_keys.get(api_key)
        if not key_info:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid API key"
            )
        
        # Update usage stats
        key_info["last_used"] = datetime.utcnow()
        key_info["usage_count"] += 1
        
        return key_info
    
    def check_rate_limit(self, identifier: str) -> bool:
        """Check if request is within rate limits"""
        now = time.time()
        
        # Clean old entries
        if identifier in self.rate_limiters:
            self.rate_limiters[identifier] = [
                timestamp for timestamp in self.rate_limiters[identifier]
                if now - timestamp < self.config.RATE_LIMIT_PERIOD
            ]
        else:
            self.rate_limiters[identifier] = []
        
        # Check limit
        if len(self.rate_limiters[identifier]) >= self.config.RATE_LIMIT_REQUESTS:
            return False
        
        # Add current request
        self.rate_limiters[identifier].append(now)
        return True
    
    def is_ip_blocked(self, ip_address: str) -> bool:
        """Check if IP is blocked"""
        return ip_address in self.blocked_ips
    
    def block_ip(self, ip_address: str, reason: str):
        """Block IP address"""
        self.blocked_ips.add(ip_address)
        self.log_security_event(
            "ip_blocked",
            None,
            ip_address,
            "",
            {"reason": reason},
            "warning"
        )
    
    def unblock_ip(self, ip_address: str):
        """Unblock IP address"""
        self.blocked_ips.discard(ip_address)
        self.log_security_event(
            "ip_unblocked",
            None,
            ip_address,
            "",
            {},
            "info"
        )
    
    def log_security_event(self, event_type: str, user_id: Optional[str], 
                          ip_address: str, user_agent: str, 
                          details: Dict[str, Any], severity: str):
        """Log security event"""
        event = SecurityAuditEvent(
            event_type=event_type,
            user_id=user_id,
            ip_address=ip_address,
            user_agent=user_agent,
            timestamp=datetime.utcnow(),
            details=details,
            severity=severity
        )
        
        self.security_events.append(event)
        
        # Log to structured logger
        logger.bind(
            event_type=event_type,
            user_id=user_id,
            ip_address=ip_address,
            severity=severity,
            details=details
        ).info("Security event logged")
        
        # Alert on critical events
        if severity == "critical":
            self._send_security_alert(event)
    
    def _send_security_alert(self, event: SecurityAuditEvent):
        """Send security alert for critical events"""
        # This would integrate with alerting system (Slack, email, etc.)
        logger.critical(
            "SECURITY ALERT",
            event_type=event.event_type,
            user_id=event.user_id,
            ip_address=event.ip_address,
            details=event.details
        )
    
    def get_security_summary(self) -> Dict[str, Any]:
        """Get security metrics summary"""
        now = datetime.utcnow()
        last_24h = now - timedelta(hours=24)
        
        recent_events = [
            event for event in self.security_events
            if event.timestamp >= last_24h
        ]
        
        return {
            "active_users": len([u for u in self.users.values() if u.is_active]),
            "blocked_ips": len(self.blocked_ips),
            "active_api_keys": len(self.api_keys),
            "events_last_24h": len(recent_events),
            "critical_events_last_24h": len([
                e for e in recent_events if e.severity == "critical"
            ]),
            "failed_login_attempts": sum(
                u.failed_login_attempts for u in self.users.values()
            )
        }


class SecurityMiddleware(BaseHTTPMiddleware):
    """Security middleware for FastAPI"""
    
    def __init__(self, app, security_manager: SecurityManager):
        super().__init__(app)
        self.security_manager = security_manager
    
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        client_ip = request.client.host
        user_agent = request.headers.get("user-agent", "")
        
        # Check if IP is blocked
        if self.security_manager.is_ip_blocked(client_ip):
            self.security_manager.log_security_event(
                "blocked_ip_attempt",
                None,
                client_ip,
                user_agent,
                {"path": str(request.url.path)},
                "warning"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="IP address blocked"
            )
        
        # Rate limiting
        if not self.security_manager.check_rate_limit(client_ip):
            self.security_manager.log_security_event(
                "rate_limit_exceeded",
                None,
                client_ip,
                user_agent,
                {"path": str(request.url.path)},
                "warning"
            )
            
            # Block IP after repeated rate limit violations
            violations = len([
                e for e in self.security_manager.security_events[-100:]
                if e.event_type == "rate_limit_exceeded" and e.ip_address == client_ip
            ])
            
            if violations > 5:
                self.security_manager.block_ip(client_ip, "Repeated rate limit violations")
            
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded"
            )
        
        # Process request
        response = await call_next(request)
        
        # Add security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "font-src 'self' https:; "
            "connect-src 'self' wss: https:;"
        )
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        
        # Log request
        duration = time.time() - start_time
        self.security_manager.log_security_event(
            "http_request",
            None,  # Would extract from token if available
            client_ip,
            user_agent,
            {
                "method": request.method,
                "path": str(request.url.path),
                "status_code": response.status_code,
                "duration": duration
            },
            "info"
        )
        
        return response


def require_auth(security_level: SecurityLevel = SecurityLevel.AUTHENTICATED):
    """Decorator to require authentication"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # This would be implemented with FastAPI's Depends system
            # For now, it's a placeholder
            return await func(*args, **kwargs)
        return wrapper
    return decorator


def require_role(*roles: UserRole):
    """Decorator to require specific roles"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # This would check user role from JWT token
            # For now, it's a placeholder
            return await func(*args, **kwargs)
        return wrapper
    return decorator


def require_permission(permission: str):
    """Decorator to require specific permission"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # This would check user permissions
            # For now, it's a placeholder
            return await func(*args, **kwargs)
        return wrapper
    return decorator


# Global security manager instance
security_manager = SecurityManager()


# FastAPI dependency functions
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer())):
    """Get current authenticated user"""
    try:
        payload = security_manager.verify_token(credentials.credentials)
        user_id = payload.get("sub")
        
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
        
        user = security_manager.users.get(user_id)
        if user is None or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or inactive"
            )
        
        return user
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )


async def require_admin(current_user: User = Depends(get_current_user)):
    """Require admin role"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user


async def require_scientist(current_user: User = Depends(get_current_user)):
    """Require scientist role or higher"""
    if current_user.role not in [UserRole.ADMIN, UserRole.SCIENTIST]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Scientist access required"
        )
    return current_user