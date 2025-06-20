"""
Authentication Endpoints for BioThings Platform
Implements login, logout, token refresh, and user management endpoints
"""
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
from fastapi import APIRouter, HTTPException, Depends, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr, validator
import secrets
import structlog

from .production_security import (
    security_manager, 
    SecurityManager, 
    User, 
    UserRole,
    get_current_user,
    require_admin
)

logger = structlog.get_logger()

# Create router
auth_router = APIRouter(prefix="/auth", tags=["authentication"])

# Pydantic models for request/response
class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    role: UserRole = UserRole.OBSERVER
    
    @validator('username')
    def username_alphanumeric(cls, v):
        if not v.replace('_', '').replace('-', '').isalnum():
            raise ValueError('Username must be alphanumeric (underscores and hyphens allowed)')
        if len(v) < 3:
            raise ValueError('Username must be at least 3 characters')
        return v

class UserLogin(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int

class TokenRefresh(BaseModel):
    refresh_token: str

class PasswordChange(BaseModel):
    current_password: str
    new_password: str

class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    role: UserRole
    is_active: bool
    created_at: datetime
    last_login: Optional[datetime]

class APIKeyCreate(BaseModel):
    name: str
    permissions: List[str]

class APIKeyResponse(BaseModel):
    api_key: str
    name: str
    permissions: List[str]
    created_at: datetime


@auth_router.post("/register", response_model=UserResponse)
async def register_user(
    user_data: UserCreate,
    request: Request,
    current_user: User = Depends(require_admin)
):
    """Register a new user (Admin only)"""
    try:
        # Validate password strength
        password_errors = security_manager.validate_password_strength(user_data.password)
        if password_errors:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"message": "Password does not meet requirements", "errors": password_errors}
            )
        
        # Check if user already exists
        existing_user = None
        for user in security_manager.users.values():
            if user.username == user_data.username or user.email == user_data.email:
                existing_user = user
                break
        
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User with this username or email already exists"
            )
        
        # Create new user
        user_id = f"user-{secrets.token_urlsafe(8)}"
        hashed_password = security_manager.hash_password(user_data.password)
        
        new_user = User(
            id=user_id,
            username=user_data.username,
            email=user_data.email,
            role=user_data.role,
            is_active=True,
            created_at=datetime.utcnow()
        )
        
        # Store user and password hash separately (in production, use proper database)
        security_manager.users[user_id] = new_user
        security_manager._password_hashes = getattr(security_manager, '_password_hashes', {})
        security_manager._password_hashes[user_id] = hashed_password
        
        # Log security event
        security_manager.log_security_event(
            "user_registered",
            current_user.id,
            request.client.host,
            request.headers.get("user-agent", ""),
            {"new_user_id": user_id, "new_user_role": user_data.role.value},
            "info"
        )
        
        logger.info("New user registered", user_id=user_id, username=user_data.username, role=user_data.role)
        
        return UserResponse(
            id=new_user.id,
            username=new_user.username,
            email=new_user.email,
            role=new_user.role,
            is_active=new_user.is_active,
            created_at=new_user.created_at,
            last_login=new_user.last_login
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("User registration failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed"
        )


@auth_router.post("/login", response_model=TokenResponse)
async def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends()
):
    """Authenticate user and return JWT tokens"""
    client_ip = request.client.host
    user_agent = request.headers.get("user-agent", "")
    
    try:
        # Find user by username
        user = None
        for u in security_manager.users.values():
            if u.username == form_data.username:
                user = u
                break
        
        if not user:
            security_manager.log_security_event(
                "login_failed_user_not_found",
                None,
                client_ip,
                user_agent,
                {"username": form_data.username},
                "warning"
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )
        
        # Check if user is active
        if not user.is_active:
            security_manager.log_security_event(
                "login_failed_user_inactive",
                user.id,
                client_ip,
                user_agent,
                {},
                "warning"
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Account is inactive"
            )
        
        # Check if account is locked
        if user.account_locked_until and user.account_locked_until > datetime.utcnow():
            security_manager.log_security_event(
                "login_failed_account_locked",
                user.id,
                client_ip,
                user_agent,
                {"locked_until": user.account_locked_until.isoformat()},
                "warning"
            )
            raise HTTPException(
                status_code=status.HTTP_423_LOCKED,
                detail=f"Account locked until {user.account_locked_until.isoformat()}"
            )
        
        # Verify password
        password_hashes = getattr(security_manager, '_password_hashes', {})
        stored_hash = password_hashes.get(user.id)
        
        if not stored_hash or not security_manager.verify_password(form_data.password, stored_hash):
            # Increment failed login attempts
            user.failed_login_attempts += 1
            
            # Lock account if too many failed attempts
            if user.failed_login_attempts >= security_manager.config.MAX_LOGIN_ATTEMPTS:
                user.account_locked_until = datetime.utcnow() + timedelta(
                    minutes=security_manager.config.LOCKOUT_DURATION_MINUTES
                )
                security_manager.log_security_event(
                    "account_locked_too_many_attempts",
                    user.id,
                    client_ip,
                    user_agent,
                    {"failed_attempts": user.failed_login_attempts},
                    "critical"
                )
            
            security_manager.log_security_event(
                "login_failed_invalid_password",
                user.id,
                client_ip,
                user_agent,
                {"failed_attempts": user.failed_login_attempts},
                "warning"
            )
            
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )
        
        # Reset failed login attempts on successful login
        user.failed_login_attempts = 0
        user.account_locked_until = None
        user.last_login = datetime.utcnow()
        
        # Create tokens
        access_token = security_manager.create_access_token(user.id)
        refresh_token = security_manager.create_refresh_token(user.id)
        
        # Log successful login
        security_manager.log_security_event(
            "login_successful",
            user.id,
            client_ip,
            user_agent,
            {"role": user.role.value},
            "info"
        )
        
        logger.info("User logged in successfully", user_id=user.id, username=user.username)
        
        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=security_manager.config.JWT_EXPIRATION_HOURS * 3600
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Login failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed"
        )


@auth_router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    request: Request,
    token_data: TokenRefresh
):
    """Refresh access token using refresh token"""
    client_ip = request.client.host
    user_agent = request.headers.get("user-agent", "")
    
    try:
        # Verify refresh token
        payload = security_manager.verify_token(token_data.refresh_token)
        
        if payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type"
            )
        
        user_id = payload.get("sub")
        user = security_manager.users.get(user_id)
        
        if not user or not user.is_active:
            security_manager.log_security_event(
                "token_refresh_failed_user_inactive",
                user_id,
                client_ip,
                user_agent,
                {},
                "warning"
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or inactive"
            )
        
        # Create new tokens
        new_access_token = security_manager.create_access_token(user_id)
        new_refresh_token = security_manager.create_refresh_token(user_id)
        
        # Log token refresh
        security_manager.log_security_event(
            "token_refreshed",
            user_id,
            client_ip,
            user_agent,
            {},
            "info"
        )
        
        return TokenResponse(
            access_token=new_access_token,
            refresh_token=new_refresh_token,
            expires_in=security_manager.config.JWT_EXPIRATION_HOURS * 3600
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Token refresh failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Token refresh failed"
        )


@auth_router.post("/logout")
async def logout(
    request: Request,
    current_user: User = Depends(get_current_user)
):
    """Logout user (token invalidation would be implemented with token blacklist)"""
    client_ip = request.client.host
    user_agent = request.headers.get("user-agent", "")
    
    # Log logout event
    security_manager.log_security_event(
        "user_logout",
        current_user.id,
        client_ip,
        user_agent,
        {},
        "info"
    )
    
    logger.info("User logged out", user_id=current_user.id, username=current_user.username)
    
    return {"message": "Successfully logged out"}


@auth_router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    return UserResponse(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        role=current_user.role,
        is_active=current_user.is_active,
        created_at=current_user.created_at,
        last_login=current_user.last_login
    )


@auth_router.post("/change-password")
async def change_password(
    request: Request,
    password_data: PasswordChange,
    current_user: User = Depends(get_current_user)
):
    """Change user password"""
    client_ip = request.client.host
    user_agent = request.headers.get("user-agent", "")
    
    try:
        # Verify current password
        password_hashes = getattr(security_manager, '_password_hashes', {})
        stored_hash = password_hashes.get(current_user.id)
        
        if not stored_hash or not security_manager.verify_password(password_data.current_password, stored_hash):
            security_manager.log_security_event(
                "password_change_failed_invalid_current",
                current_user.id,
                client_ip,
                user_agent,
                {},
                "warning"
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is incorrect"
            )
        
        # Validate new password strength
        password_errors = security_manager.validate_password_strength(password_data.new_password)
        if password_errors:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"message": "New password does not meet requirements", "errors": password_errors}
            )
        
        # Update password
        new_hash = security_manager.hash_password(password_data.new_password)
        password_hashes[current_user.id] = new_hash
        
        # Log password change
        security_manager.log_security_event(
            "password_changed",
            current_user.id,
            client_ip,
            user_agent,
            {},
            "info"
        )
        
        logger.info("Password changed successfully", user_id=current_user.id)
        
        return {"message": "Password changed successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Password change failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Password change failed"
        )


@auth_router.get("/users", response_model=List[UserResponse])
async def list_users(
    current_user: User = Depends(require_admin)
):
    """List all users (Admin only)"""
    users = []
    for user in security_manager.users.values():
        users.append(UserResponse(
            id=user.id,
            username=user.username,
            email=user.email,
            role=user.role,
            is_active=user.is_active,
            created_at=user.created_at,
            last_login=user.last_login
        ))
    
    return users


@auth_router.post("/users/{user_id}/deactivate")
async def deactivate_user(
    user_id: str,
    request: Request,
    current_user: User = Depends(require_admin)
):
    """Deactivate a user (Admin only)"""
    client_ip = request.client.host
    user_agent = request.headers.get("user-agent", "")
    
    user = security_manager.users.get(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot deactivate your own account"
        )
    
    user.is_active = False
    
    # Log user deactivation
    security_manager.log_security_event(
        "user_deactivated",
        current_user.id,
        client_ip,
        user_agent,
        {"target_user_id": user_id, "target_username": user.username},
        "info"
    )
    
    logger.info("User deactivated", user_id=user_id, admin_id=current_user.id)
    
    return {"message": f"User {user.username} deactivated successfully"}


@auth_router.post("/api-keys", response_model=APIKeyResponse)
async def create_api_key(
    request: Request,
    api_key_data: APIKeyCreate,
    current_user: User = Depends(require_admin)
):
    """Create new API key (Admin only)"""
    client_ip = request.client.host
    user_agent = request.headers.get("user-agent", "")
    
    try:
        api_key = security_manager.generate_api_key(
            name=api_key_data.name,
            permissions=api_key_data.permissions
        )
        
        key_info = security_manager.api_keys[api_key]
        
        # Log API key creation
        security_manager.log_security_event(
            "api_key_created",
            current_user.id,
            client_ip,
            user_agent,
            {"api_key_name": api_key_data.name, "permissions": api_key_data.permissions},
            "info"
        )
        
        logger.info("API key created", name=api_key_data.name, admin_id=current_user.id)
        
        return APIKeyResponse(
            api_key=api_key,
            name=key_info["name"],
            permissions=key_info["permissions"],
            created_at=key_info["created_at"]
        )
        
    except Exception as e:
        logger.error("API key creation failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="API key creation failed"
        )


@auth_router.get("/api-keys")
async def list_api_keys(
    current_user: User = Depends(require_admin)
):
    """List all API keys (Admin only)"""
    keys = []
    for api_key, key_info in security_manager.api_keys.items():
        keys.append({
            "api_key": api_key[:8] + "..." + api_key[-4:],  # Masked key
            "name": key_info["name"],
            "permissions": key_info["permissions"],
            "created_at": key_info["created_at"],
            "last_used": key_info["last_used"],
            "usage_count": key_info["usage_count"]
        })
    
    return {"api_keys": keys}


@auth_router.delete("/api-keys/{api_key}")
async def revoke_api_key(
    api_key: str,
    request: Request,
    current_user: User = Depends(require_admin)
):
    """Revoke an API key (Admin only)"""
    client_ip = request.client.host
    user_agent = request.headers.get("user-agent", "")
    
    if api_key not in security_manager.api_keys:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found"
        )
    
    key_info = security_manager.api_keys.pop(api_key)
    
    # Log API key revocation
    security_manager.log_security_event(
        "api_key_revoked",
        current_user.id,
        client_ip,
        user_agent,
        {"api_key_name": key_info["name"]},
        "info"
    )
    
    logger.info("API key revoked", name=key_info["name"], admin_id=current_user.id)
    
    return {"message": f"API key '{key_info['name']}' revoked successfully"}