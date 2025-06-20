# BioThings Security System

A comprehensive enterprise-grade security framework for the BioThings platform, providing authentication, authorization, input validation, audit logging, and security monitoring.

## Features

### 🔐 Authentication & Authorization
- **JWT-based authentication** with access and refresh tokens
- **Role-based access control (RBAC)** with predefined roles
- **API key management** for programmatic access
- **Session management** with automatic expiry
- **Account lockout** protection against brute force attacks

### 🛡️ Security Middleware
- **Rate limiting** with IP-based throttling
- **Input validation** and sanitization
- **Security headers** (HSTS, CSP, XSS protection, etc.)
- **CORS configuration** with environment-specific settings
- **IP blocking** for malicious actors

### 📊 Audit & Monitoring
- **Comprehensive audit logging** of all security events
- **Real-time security monitoring** with threat detection
- **Automated alerting** for security incidents
- **Compliance reporting** with detailed analytics
- **Threat intelligence** indicators and scoring

### 🔧 Configuration Management
- **Environment-based configuration** (dev, staging, production)
- **Secure secrets management** with rotation capabilities
- **Password policies** with strength requirements
- **Configurable security thresholds** and policies

## Architecture

```
┌─────────────────────┐
│   FastAPI App       │
├─────────────────────┤
│  Security           │
│  Middleware Stack   │
├─────────────────────┤
│  • SecurityMiddleware
│  • AuditMiddleware  │
│  • ValidationMiddleware
│  • CORS Middleware │
└─────────────────────┘
         │
    ┌────▼────┐
    │Security │
    │Manager  │
    └────┬────┘
         │
    ┌────▼────┐    ┌─────────────┐    ┌─────────────┐
    │Database │    │Audit Logger │    │Security     │
    │Models   │    │             │    │Monitor      │
    └─────────┘    └─────────────┘    └─────────────┘
```

## Quick Start

### 1. Basic Integration

```python
from security import create_secure_app, security_config

# Create secure FastAPI app
app = create_secure_app(
    title="My Secure API",
    environment="production"
)

# Or use environment detection
app = create_app()  # Detects environment from BIOTHINGS_ENV
```

### 2. Database Setup

```python
from security import initialize_database

# Initialize database with your connection string
db_manager = initialize_database("postgresql://user:pass@localhost/db")

# Create default admin user
admin_user = db_manager.create_default_admin(
    username="admin",
    email="admin@company.com", 
    password="secure_password_123!"
)
```

### 3. Manual Integration

```python
from fastapi import FastAPI
from security import (
    SecurityMiddleware, 
    ValidationMiddleware,
    AuditMiddleware,
    auth_router,
    monitoring_router,
    security_manager,
    audit_logger,
    input_validator
)

app = FastAPI()

# Add security middleware (order matters!)
app.add_middleware(SecurityMiddleware, security_manager=security_manager)
app.add_middleware(AuditMiddleware, audit_logger=audit_logger)
app.add_middleware(ValidationMiddleware, validator=input_validator)

# Add routers
app.include_router(auth_router)
app.include_router(monitoring_router)
```

## Configuration

### Environment Variables

```bash
# Database
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=biothings
export DB_USER=biothings_user
export DB_PASSWORD=secure_password

# Security
export JWT_SECRET_KEY=your-secret-key-here
export JWT_ALGORITHM=HS256
export BIOTHINGS_ENV=production

# CORS
export ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com

# Rate Limiting  
export RATE_LIMIT_REQUESTS=100
export RATE_LIMIT_PERIOD=60
```

### Configuration File

Create `config/.secrets.production.json`:

```json
{
  "jwt_secret_key": "your-jwt-secret-key",
  "db_password": "your-db-password",
  "redis_password": "your-redis-password",
  "environment": "production"
}
```

## API Endpoints

### Authentication

```http
POST /auth/register      # Register new user (admin only)
POST /auth/login         # User login
POST /auth/refresh       # Refresh access token
POST /auth/logout        # User logout
GET  /auth/me           # Get current user info
POST /auth/change-password  # Change password
```

### User Management

```http
GET    /auth/users              # List users (admin)
POST   /auth/users/{id}/deactivate  # Deactivate user (admin)
POST   /auth/api-keys           # Create API key (admin)
GET    /auth/api-keys           # List API keys (admin)
DELETE /auth/api-keys/{key}     # Revoke API key (admin)
```

### Security Monitoring

```http
GET  /api/security/monitoring/dashboard  # Security dashboard
GET  /api/security/monitoring/metrics    # Security metrics
GET  /api/security/monitoring/alerts     # Security alerts
GET  /api/security/monitoring/threats    # Threat indicators
POST /api/security/rotate-secrets        # Rotate secrets (admin)
POST /api/security/block-ip              # Block IP (admin)
```

## Usage Examples

### Protected Endpoints

```python
from security import get_current_user, require_admin, require_scientist

@app.get("/api/profile")
async def get_profile(user: User = Depends(get_current_user)):
    return {"user": user.username, "role": user.role}

@app.get("/api/admin/users")  
async def admin_endpoint(admin: User = Depends(require_admin)):
    return {"message": "Admin access granted"}

@app.get("/api/experiments")
async def scientist_endpoint(scientist: User = Depends(require_scientist)):
    return {"experiments": []}
```

### Custom Validation

```python
from security.validation_middleware import ValidationRule, ValidationConfig

# Add custom endpoint validation
ValidationConfig.ENDPOINT_RULES['/api/custom'] = {
    'data': ValidationRule('data', 'string', True, 1, 100),
    'count': ValidationRule('count', 'integer', True, 1, 1000)
}
```

### Audit Logging

```python
from security import audit_logger, AuditEvent, EventCategory, EventSeverity

# Manual audit logging
await audit_logger.log_event(AuditEvent(
    event_id=f"custom-{datetime.now().strftime('%Y%m%d%H%M%S')}",
    timestamp=datetime.now(),
    event_type="data_export",
    category=EventCategory.DATA_ACCESS,
    severity=EventSeverity.INFO,
    user_id=user.id,
    message="User exported experiment data",
    details={"experiment_id": "exp_123", "records": 1000}
))
```

## Security Features

### Password Policy

- Minimum 8 characters (12 in production)
- Requires uppercase, lowercase, numbers, special characters
- Prevents common passwords
- Tracks password history (last 5 passwords)
- Configurable complexity requirements

### Rate Limiting

- **Default**: 100 requests per minute per IP
- **Login**: 10 attempts per minute per IP
- **API errors**: Auto-blocks after repeated violations
- **Configurable per endpoint**

### Session Security

- **JWT tokens** with configurable expiry
- **Refresh token rotation**
- **Session tracking** with device fingerprinting
- **Automatic cleanup** of expired sessions
- **Suspicious activity detection**

### Input Validation

- **XSS prevention** with HTML sanitization
- **SQL injection** pattern detection
- **Command injection** prevention  
- **Directory traversal** protection
- **Schema validation** per endpoint

### Security Headers

```http
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'; script-src 'self'
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
```

## Monitoring & Alerting

### Real-time Monitoring

- **Failed login attempts** with automatic IP blocking
- **API error rates** and anomaly detection
- **User behavior analysis** with anomaly scoring
- **Threat intelligence** with IOC tracking
- **System health** monitoring

### Alert Types

- **High failed login rate** (>10/minute)
- **Excessive API errors** (>20/minute)  
- **Suspicious IP activity** (high request volume, multiple endpoints)
- **Anomalous user behavior** (multiple IPs, high admin actions)
- **Critical system events**

### Compliance Reporting

```python
# Generate compliance report
report = await audit_logger.generate_compliance_report(
    start_date=datetime(2024, 1, 1),
    end_date=datetime(2024, 12, 31),
    format="json"  # or "csv"
)
```

## Production Deployment

### 1. Environment Setup

```bash
# Set production environment
export BIOTHINGS_ENV=production

# Use secure database connection
export DB_HOST=your-db-host
export DB_PASSWORD=secure-password
export DB_SSL_MODE=require

# Configure Redis for session storage
export REDIS_HOST=your-redis-host
export REDIS_PASSWORD=secure-password
export REDIS_SSL=true
```

### 2. Security Hardening

```python
# Production configuration
from security import security_config, Environment

# Verify production settings
if security_config.environment == Environment.PRODUCTION:
    # Ensure secure settings
    assert security_config.jwt.access_token_expire_hours <= 2
    assert security_config.cors.allow_origins != ["*"]
    assert security_config.password_policy.min_length >= 12
```

### 3. SSL/TLS Configuration

```python
# Use HTTPS in production
if security_config.environment == Environment.PRODUCTION:
    security_config.database.ssl_mode = "require"
    security_config.redis.ssl = True
    
    # Force HTTPS
    app.add_middleware(HTTPSRedirectMiddleware)
```

### 4. Monitoring Setup

```python
# Start security monitoring
await security_monitor.start()

# Configure alerts (integrate with your alerting system)
security_monitor.alert_thresholds.update({
    "failed_logins_per_hour": 50,
    "critical_events_per_hour": 10
})
```

## Best Practices

### 1. Secret Management

- Never commit secrets to version control
- Use environment variables or secure vault
- Rotate secrets regularly (JWT keys, DB passwords)
- Use different secrets per environment

### 2. Access Control

- Follow principle of least privilege
- Use role-based access control
- Regularly audit user permissions
- Implement temporary elevated access

### 3. Monitoring

- Monitor all authentication events
- Set up real-time alerting
- Regular security metric reviews
- Automated threat response

### 4. Incident Response

- Have incident response procedures
- Log everything for forensics
- Automate common responses (IP blocking)
- Regular security reviews

## Troubleshooting

### Common Issues

#### Authentication Failures

```python
# Check user status
user = db_manager.get_user_by_username("username")
print(f"Active: {user.is_active}, Locked: {user.is_locked()}")

# Reset failed attempts
user.unlock_account()
```

#### Rate Limiting Issues

```python
# Check rate limit status
rate_limited = not security_manager.check_rate_limit("192.168.1.1")
print(f"Rate limited: {rate_limited}")

# Reset rate limits (admin only)
security_manager.rate_limiters.clear()
```

#### Configuration Problems

```python
# Validate configuration
errors = security_config.validate_config()
if errors:
    print("Configuration errors:", errors)
```

### Debug Mode

```python
# Enable detailed logging
import structlog
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.dev.ConsoleRenderer()
    ],
    logger_factory=structlog.stdlib.LoggerFactory(),
    wrapper_class=structlog.stdlib.BoundLogger,
    cache_logger_on_first_use=True,
)

# Set log level
import logging
logging.getLogger().setLevel(logging.DEBUG)
```

## Security Considerations

### Production Checklist

- [ ] Change default admin credentials
- [ ] Use strong JWT secret keys
- [ ] Enable HTTPS/TLS
- [ ] Configure proper CORS origins
- [ ] Set up database SSL
- [ ] Enable audit logging
- [ ] Configure monitoring alerts
- [ ] Regular security updates
- [ ] Backup and recovery procedures
- [ ] Incident response plan

### Security Updates

Keep the security system updated by:

1. Regularly updating dependencies
2. Monitoring security advisories
3. Testing security configurations
4. Reviewing audit logs
5. Updating threat intelligence

## Support

For issues and questions:

1. Check the troubleshooting section
2. Review audit logs for security events
3. Check monitoring dashboard for system health
4. Verify configuration settings

## License

This security system is part of the BioThings platform.