"""
Database Models for BioThings Security System
Provides SQLAlchemy models and database operations for user management,
sessions, audit logs, and security configurations
"""
import uuid
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from sqlalchemy import (
    create_engine, Column, String, DateTime, Boolean, Text, Integer, 
    JSON, ForeignKey, Index, func, Enum as SQLEnum
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship, Session
from sqlalchemy.dialects.postgresql import UUID
import enum
import bcrypt
import structlog

from .production_security import UserRole
from .audit_logging import EventSeverity, EventCategory

logger = structlog.get_logger()

Base = declarative_base()


class UserStatus(enum.Enum):
    """User account status"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"
    PENDING_VERIFICATION = "pending_verification"


class SessionStatus(enum.Enum):
    """Session status"""
    ACTIVE = "active"
    EXPIRED = "expired"
    TERMINATED = "terminated"


class User(Base):
    """User model with comprehensive security features"""
    __tablename__ = "users"
    
    # Primary identification
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    
    # Authentication
    password_hash = Column(String(255), nullable=False)
    password_salt = Column(String(255), nullable=False)
    
    # User information
    first_name = Column(String(100))
    last_name = Column(String(100))
    role = Column(SQLEnum(UserRole), nullable=False, default=UserRole.OBSERVER)
    
    # Account status
    status = Column(SQLEnum(UserStatus), nullable=False, default=UserStatus.ACTIVE)
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    
    # Security tracking
    failed_login_attempts = Column(Integer, default=0, nullable=False)
    account_locked_until = Column(DateTime(timezone=True))
    last_login = Column(DateTime(timezone=True))
    last_password_change = Column(DateTime(timezone=True))
    
    # Audit information
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now())
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    
    # Additional security fields
    two_factor_enabled = Column(Boolean, default=False)
    two_factor_secret = Column(String(255))
    backup_codes = Column(JSON)  # Array of backup codes
    
    # Password history for policy enforcement
    password_history = Column(JSON)  # Array of previous password hashes
    
    # Preferences and metadata
    preferences = Column(JSON, default=dict)
    metadata = Column(JSON, default=dict)
    
    # Relationships
    sessions = relationship("UserSession", back_populates="user", cascade="all, delete-orphan")
    api_keys = relationship("APIKey", back_populates="user", cascade="all, delete-orphan")
    audit_events = relationship("AuditEvent", back_populates="user")
    created_users = relationship("User", remote_side=[id])
    
    # Indexes
    __table_args__ = (
        Index('idx_user_email_status', 'email', 'status'),
        Index('idx_user_username_status', 'username', 'status'),
        Index('idx_user_role_status', 'role', 'status'),
        Index('idx_user_created_at', 'created_at'),
    )
    
    def set_password(self, password: str) -> None:
        """Set user password with proper hashing"""
        # Generate salt and hash password
        salt = bcrypt.gensalt()
        password_hash = bcrypt.hashpw(password.encode('utf-8'), salt)
        
        self.password_salt = salt.decode('utf-8')
        self.password_hash = password_hash.decode('utf-8')
        self.last_password_change = datetime.utcnow()
        
        # Update password history
        if not self.password_history:
            self.password_history = []
        
        self.password_history.append({
            'hash': self.password_hash,
            'changed_at': datetime.utcnow().isoformat()
        })
        
        # Keep only last 5 passwords
        if len(self.password_history) > 5:
            self.password_history = self.password_history[-5:]
    
    def verify_password(self, password: str) -> bool:
        """Verify password against stored hash"""
        return bcrypt.checkpw(
            password.encode('utf-8'), 
            self.password_hash.encode('utf-8')
        )
    
    def is_password_in_history(self, password: str) -> bool:
        """Check if password was used before"""
        if not self.password_history:
            return False
        
        for hist_entry in self.password_history:
            if bcrypt.checkpw(password.encode('utf-8'), hist_entry['hash'].encode('utf-8')):
                return True
        return False
    
    def lock_account(self, duration_minutes: int = 30) -> None:
        """Lock user account for specified duration"""
        self.account_locked_until = datetime.utcnow() + timedelta(minutes=duration_minutes)
        self.status = UserStatus.SUSPENDED
    
    def unlock_account(self) -> None:
        """Unlock user account"""
        self.account_locked_until = None
        self.failed_login_attempts = 0
        if self.status == UserStatus.SUSPENDED:
            self.status = UserStatus.ACTIVE
    
    def is_locked(self) -> bool:
        """Check if account is currently locked"""
        if not self.account_locked_until:
            return False
        return datetime.utcnow() < self.account_locked_until
    
    def record_login_attempt(self, success: bool, ip_address: str) -> None:
        """Record login attempt"""
        if success:
            self.failed_login_attempts = 0
            self.last_login = datetime.utcnow()
            self.unlock_account()
        else:
            self.failed_login_attempts += 1
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert user to dictionary"""
        return {
            'id': str(self.id),
            'username': self.username,
            'email': self.email,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'role': self.role.value if self.role else None,
            'status': self.status.value if self.status else None,
            'is_active': self.is_active,
            'is_verified': self.is_verified,
            'two_factor_enabled': self.two_factor_enabled,
            'last_login': self.last_login.isoformat() if self.last_login else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'is_locked': self.is_locked()
        }


class UserSession(Base):
    """User session model for tracking active sessions"""
    __tablename__ = "user_sessions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    # Session identification
    session_token = Column(String(255), unique=True, nullable=False, index=True)
    refresh_token = Column(String(255), unique=True, nullable=False, index=True)
    
    # Session information
    status = Column(SQLEnum(SessionStatus), default=SessionStatus.ACTIVE, nullable=False)
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    last_activity = Column(DateTime(timezone=True), default=func.now())
    
    # Client information
    client_ip = Column(String(45))  # IPv6 compatible
    user_agent = Column(Text)
    device_fingerprint = Column(String(255))
    
    # Security tracking
    login_method = Column(String(50))  # password, api_key, oauth, etc.
    is_suspicious = Column(Boolean, default=False)
    security_flags = Column(JSON, default=dict)
    
    # Relationships
    user = relationship("User", back_populates="sessions")
    
    # Indexes
    __table_args__ = (
        Index('idx_session_user_status', 'user_id', 'status'),
        Index('idx_session_expires_status', 'expires_at', 'status'),
        Index('idx_session_client_ip', 'client_ip'),
    )
    
    def is_expired(self) -> bool:
        """Check if session is expired"""
        return datetime.utcnow() > self.expires_at
    
    def is_active(self) -> bool:
        """Check if session is active"""
        return self.status == SessionStatus.ACTIVE and not self.is_expired()
    
    def terminate(self) -> None:
        """Terminate session"""
        self.status = SessionStatus.TERMINATED
    
    def extend_expiry(self, hours: int = 24) -> None:
        """Extend session expiry"""
        if self.is_active():
            self.expires_at = datetime.utcnow() + timedelta(hours=hours)
            self.last_activity = datetime.utcnow()


class APIKey(Base):
    """API key model for programmatic access"""
    __tablename__ = "api_keys"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    # Key information
    key_hash = Column(String(255), unique=True, nullable=False, index=True)
    key_prefix = Column(String(20), nullable=False)  # First few chars for identification
    name = Column(String(100), nullable=False)
    description = Column(Text)
    
    # Access control
    permissions = Column(JSON, default=list)  # List of allowed operations
    allowed_ips = Column(JSON, default=list)  # IP whitelist
    rate_limit_override = Column(Integer)  # Custom rate limit
    
    # Status and lifecycle
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)
    expires_at = Column(DateTime(timezone=True))
    last_used = Column(DateTime(timezone=True))
    
    # Usage tracking
    usage_count = Column(Integer, default=0, nullable=False)
    usage_limit = Column(Integer)  # Max usage count
    
    # Relationships
    user = relationship("User", back_populates="api_keys")
    
    # Indexes
    __table_args__ = (
        Index('idx_apikey_user_active', 'user_id', 'is_active'),
        Index('idx_apikey_expires', 'expires_at'),
    )
    
    def is_expired(self) -> bool:
        """Check if API key is expired"""
        if not self.expires_at:
            return False
        return datetime.utcnow() > self.expires_at
    
    def is_usage_exceeded(self) -> bool:
        """Check if usage limit is exceeded"""
        if not self.usage_limit:
            return False
        return self.usage_count >= self.usage_limit
    
    def is_valid(self) -> bool:
        """Check if API key is valid for use"""
        return (
            self.is_active and 
            not self.is_expired() and 
            not self.is_usage_exceeded()
        )
    
    def record_usage(self, ip_address: str) -> None:
        """Record API key usage"""
        self.usage_count += 1
        self.last_used = datetime.utcnow()
    
    def can_access_from_ip(self, ip_address: str) -> bool:
        """Check if IP is allowed to use this key"""
        if not self.allowed_ips:
            return True
        return ip_address in self.allowed_ips


class AuditEvent(Base):
    """Audit event model for security logging"""
    __tablename__ = "audit_events"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Event identification
    event_id = Column(String(100), unique=True, nullable=False, index=True)
    event_type = Column(String(100), nullable=False, index=True)
    category = Column(SQLEnum(EventCategory), nullable=False, index=True)
    severity = Column(SQLEnum(EventSeverity), nullable=False, index=True)
    
    # Event details
    message = Column(Text, nullable=False)
    details = Column(JSON, default=dict)
    
    # User and session information
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    session_id = Column(UUID(as_uuid=True), ForeignKey("user_sessions.id"))
    
    # Request information
    client_ip = Column(String(45), index=True)
    user_agent = Column(Text)
    endpoint = Column(String(255))
    method = Column(String(10))
    
    # Result information
    success = Column(Boolean, nullable=False, default=True)
    error_code = Column(String(50))
    error_message = Column(Text)
    
    # Timing information
    timestamp = Column(DateTime(timezone=True), default=func.now(), nullable=False, index=True)
    duration_ms = Column(Integer)
    
    # Compliance and security
    compliance_tags = Column(JSON, default=list)
    sensitive_data_accessed = Column(Boolean, default=False)
    data_classification = Column(String(50))
    
    # Relationships
    user = relationship("User", back_populates="audit_events")
    session = relationship("UserSession")
    
    # Indexes
    __table_args__ = (
        Index('idx_audit_user_timestamp', 'user_id', 'timestamp'),
        Index('idx_audit_category_severity', 'category', 'severity'),
        Index('idx_audit_client_ip_timestamp', 'client_ip', 'timestamp'),
        Index('idx_audit_event_type_timestamp', 'event_type', 'timestamp'),
    )


class SecurityConfiguration(Base):
    """Security configuration model"""
    __tablename__ = "security_configurations"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Configuration identification
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text)
    environment = Column(String(50), nullable=False)  # dev, staging, prod
    
    # Configuration data
    config_data = Column(JSON, nullable=False)
    schema_version = Column(String(20), default="1.0")
    
    # Lifecycle
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now())
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    
    # Relationships
    creator = relationship("User")


class DatabaseManager:
    """Database operations manager"""
    
    def __init__(self, database_url: str):
        self.engine = create_engine(
            database_url,
            pool_size=10,
            max_overflow=20,
            pool_pre_ping=True,
            echo=False  # Set to True for SQL debugging
        )
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
        
        # Create tables
        self.create_tables()
        
        logger.info("Database manager initialized", url=database_url.split('@')[0] + '@***')
    
    def create_tables(self):
        """Create all tables"""
        Base.metadata.create_all(bind=self.engine)
        logger.info("Database tables created/verified")
    
    def get_session(self) -> Session:
        """Get database session"""
        return self.SessionLocal()
    
    def create_default_admin(self, 
                           username: str = "admin",
                           email: str = "admin@biothings.ai",
                           password: str = "admin123!") -> User:
        """Create default admin user"""
        
        with self.get_session() as db:
            # Check if admin already exists
            existing_admin = db.query(User).filter(User.username == username).first()
            if existing_admin:
                logger.info("Admin user already exists", username=username)
                return existing_admin
            
            # Create admin user
            admin_user = User(
                username=username,
                email=email,
                first_name="System",
                last_name="Administrator",
                role=UserRole.ADMIN,
                status=UserStatus.ACTIVE,
                is_active=True,
                is_verified=True
            )
            
            admin_user.set_password(password)
            
            db.add(admin_user)
            db.commit()
            db.refresh(admin_user)
            
            logger.warning(
                "Default admin user created - CHANGE PASSWORD IN PRODUCTION!",
                username=username,
                user_id=str(admin_user.id)
            )
            
            return admin_user
    
    def get_user_by_username(self, username: str) -> Optional[User]:
        """Get user by username"""
        with self.get_session() as db:
            return db.query(User).filter(User.username == username).first()
    
    def get_user_by_email(self, email: str) -> Optional[User]:
        """Get user by email"""
        with self.get_session() as db:
            return db.query(User).filter(User.email == email).first()
    
    def get_user_by_id(self, user_id: str) -> Optional[User]:
        """Get user by ID"""
        with self.get_session() as db:
            return db.query(User).filter(User.id == user_id).first()
    
    def create_user(self, user_data: Dict[str, Any]) -> User:
        """Create new user"""
        with self.get_session() as db:
            user = User(**user_data)
            if 'password' in user_data:
                user.set_password(user_data['password'])
            
            db.add(user)
            db.commit()
            db.refresh(user)
            
            return user
    
    def authenticate_user(self, username: str, password: str, ip_address: str) -> Optional[User]:
        """Authenticate user and record attempt"""
        with self.get_session() as db:
            user = db.query(User).filter(User.username == username).first()
            
            if not user:
                return None
            
            # Check if account is locked
            if user.is_locked():
                user.record_login_attempt(False, ip_address)
                db.commit()
                return None
            
            # Verify password
            if user.verify_password(password):
                user.record_login_attempt(True, ip_address)
                db.commit()
                return user
            else:
                user.record_login_attempt(False, ip_address)
                
                # Lock account if too many failed attempts
                if user.failed_login_attempts >= 5:
                    user.lock_account()
                
                db.commit()
                return None
    
    def create_session(self, user_id: str, session_data: Dict[str, Any]) -> UserSession:
        """Create user session"""
        with self.get_session() as db:
            session = UserSession(user_id=user_id, **session_data)
            db.add(session)
            db.commit()
            db.refresh(session)
            return session
    
    def get_active_session(self, session_token: str) -> Optional[UserSession]:
        """Get active session by token"""
        with self.get_session() as db:
            session = db.query(UserSession).filter(
                UserSession.session_token == session_token,
                UserSession.status == SessionStatus.ACTIVE
            ).first()
            
            if session and session.is_expired():
                session.status = SessionStatus.EXPIRED
                db.commit()
                return None
            
            return session
    
    def cleanup_expired_sessions(self) -> int:
        """Clean up expired sessions"""
        with self.get_session() as db:
            expired_count = db.query(UserSession).filter(
                UserSession.status == SessionStatus.ACTIVE,
                UserSession.expires_at < datetime.utcnow()
            ).update({'status': SessionStatus.EXPIRED})
            
            db.commit()
            return expired_count
    
    def log_audit_event(self, event_data: Dict[str, Any]) -> AuditEvent:
        """Log audit event to database"""
        with self.get_session() as db:
            event = AuditEvent(**event_data)
            db.add(event)
            db.commit()
            db.refresh(event)
            return event
    
    def get_audit_events(self,
                        user_id: Optional[str] = None,
                        start_time: Optional[datetime] = None,
                        end_time: Optional[datetime] = None,
                        event_types: Optional[List[str]] = None,
                        limit: int = 1000) -> List[AuditEvent]:
        """Query audit events"""
        with self.get_session() as db:
            query = db.query(AuditEvent)
            
            if user_id:
                query = query.filter(AuditEvent.user_id == user_id)
            
            if start_time:
                query = query.filter(AuditEvent.timestamp >= start_time)
            
            if end_time:
                query = query.filter(AuditEvent.timestamp <= end_time)
            
            if event_types:
                query = query.filter(AuditEvent.event_type.in_(event_types))
            
            return query.order_by(AuditEvent.timestamp.desc()).limit(limit).all()


# Global database manager instance (will be initialized with actual database URL)
db_manager: Optional[DatabaseManager] = None


def initialize_database(database_url: str) -> DatabaseManager:
    """Initialize database manager"""
    global db_manager
    db_manager = DatabaseManager(database_url)
    return db_manager


def get_database() -> DatabaseManager:
    """Get database manager instance"""
    return db_manager