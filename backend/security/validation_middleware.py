"""
Input Validation and Sanitization Middleware for BioThings Platform
Provides comprehensive input validation, sanitization, and security checks
"""
import re
import json
import html
import bleach
from typing import Dict, Any, List, Optional, Union
from datetime import datetime
from fastapi import Request, HTTPException, status
from fastapi.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
import structlog
from pydantic import BaseModel, validator
from dataclasses import dataclass

logger = structlog.get_logger()


@dataclass
class ValidationRule:
    """Validation rule configuration"""
    field_name: str
    field_type: str  # string, integer, float, email, url, json, etc.
    required: bool = False
    min_length: Optional[int] = None
    max_length: Optional[int] = None
    min_value: Optional[Union[int, float]] = None
    max_value: Optional[Union[int, float]] = None
    pattern: Optional[str] = None
    allowed_values: Optional[List[Any]] = None
    sanitize: bool = True


class ValidationConfig:
    """Validation configuration for different endpoints"""
    
    # Common patterns
    PATTERNS = {
        'email': r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$',
        'username': r'^[a-zA-Z0-9_-]{3,50}$',
        'password': r'^.{8,128}$',
        'uuid': r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
        'alphanumeric': r'^[a-zA-Z0-9]+$',
        'slug': r'^[a-z0-9-]+$',
        'api_key': r'^[a-zA-Z0-9_-]{32,64}$',
        'jwt_token': r'^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$',
        'ip_address': r'^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$',
        'url': r'^https?://(?:[-\w.])+(?:[:\d]+)?(?:/(?:[\w/_.])*(?:\?(?:[\w&=%.])*)?(?:#(?:[\w.])*)?)?$'
    }
    
    # Dangerous patterns to block
    DANGEROUS_PATTERNS = [
        r'<script[^>]*>.*?</script>',  # Script tags
        r'javascript:',  # JavaScript URLs
        r'vbscript:',  # VBScript URLs
        r'onload\s*=',  # Event handlers
        r'onerror\s*=',
        r'onclick\s*=',
        r'onmouseover\s*=',
        r'eval\s*\(',  # Eval functions
        r'exec\s*\(',
        r'system\s*\(',
        r'shell_exec\s*\(',
        r'--',  # SQL comment
        r'union\s+select',  # SQL injection
        r'drop\s+table',
        r'delete\s+from',
        r'insert\s+into',
        r'update\s+.*\s+set',
        r'\bor\s+1\s*=\s*1\b',  # Boolean SQL injection
        r'\band\s+1\s*=\s*1\b',
        r'\.\./',  # Directory traversal
        r'\.\.\\',
        r'%2e%2e%2f',  # URL encoded directory traversal
        r'%2e%2e%5c',
        r'<\?php',  # PHP code
        r'<%.*%>',  # ASP/JSP code
        r'\${.*}',  # Template injection
        r'#{.*}',
    ]
    
    # Endpoint-specific validation rules
    ENDPOINT_RULES = {
        '/auth/register': {
            'username': ValidationRule('username', 'string', True, 3, 50, pattern=PATTERNS['username']),
            'email': ValidationRule('email', 'email', True, pattern=PATTERNS['email']),
            'password': ValidationRule('password', 'string', True, 8, 128),
            'role': ValidationRule('role', 'string', True, allowed_values=['admin', 'scientist', 'observer', 'api_client'])
        },
        '/auth/login': {
            'username': ValidationRule('username', 'string', True, 3, 50, pattern=PATTERNS['username']),
            'password': ValidationRule('password', 'string', True, 8, 128)
        },
        '/api/experiments/start': {
            'protocol': ValidationRule('protocol', 'string', True, 1, 100),
            'scientist_id': ValidationRule('scientist_id', 'string', False, 1, 50),
            'params': ValidationRule('params', 'json', False)
        },
        '/api/agents/{agent_type}/task': {
            'task': ValidationRule('task', 'string', True, 1, 1000),
            'context': ValidationRule('context', 'json', False)
        },
        '/api/chat': {
            'agent_type': ValidationRule('agent_type', 'string', True, 1, 20, allowed_values=['CEO', 'CSO', 'CFO', 'CTO', 'COO']),
            'message': ValidationRule('message', 'string', True, 1, 2000)
        }
    }


class InputValidator:
    """Input validation and sanitization class"""
    
    def __init__(self, config: ValidationConfig = None):
        self.config = config or ValidationConfig()
        
        # Configure bleach for HTML sanitization
        self.allowed_tags = ['b', 'i', 'u', 'em', 'strong', 'p', 'br']
        self.allowed_attributes = {}
    
    def sanitize_string(self, value: str, strict: bool = False) -> str:
        """Sanitize string input"""
        if not isinstance(value, str):
            return str(value)
        
        # HTML encode to prevent XSS
        sanitized = html.escape(value)
        
        # Use bleach for more thorough sanitization if not strict
        if not strict:
            sanitized = bleach.clean(
                sanitized, 
                tags=self.allowed_tags, 
                attributes=self.allowed_attributes,
                strip=True
            )
        
        return sanitized.strip()
    
    def check_dangerous_patterns(self, value: str) -> List[str]:
        """Check for dangerous patterns in input"""
        violations = []
        value_lower = value.lower()
        
        for pattern in self.config.DANGEROUS_PATTERNS:
            if re.search(pattern, value_lower, re.IGNORECASE):
                violations.append(f"Dangerous pattern detected: {pattern}")
        
        return violations
    
    def validate_field(self, field_name: str, value: Any, rule: ValidationRule) -> Dict[str, Any]:
        """Validate a single field"""
        errors = []
        sanitized_value = value
        
        # Type validation
        if rule.field_type == 'string':
            if not isinstance(value, str):
                errors.append(f"{field_name} must be a string")
            else:
                # Check dangerous patterns
                dangerous = self.check_dangerous_patterns(value)
                if dangerous:
                    errors.extend(dangerous)
                
                # Sanitize if requested
                if rule.sanitize:
                    sanitized_value = self.sanitize_string(value)
                
                # Length validation
                if rule.min_length and len(value) < rule.min_length:
                    errors.append(f"{field_name} must be at least {rule.min_length} characters")
                if rule.max_length and len(value) > rule.max_length:
                    errors.append(f"{field_name} must be at most {rule.max_length} characters")
                
                # Pattern validation
                if rule.pattern and not re.match(rule.pattern, value):
                    errors.append(f"{field_name} format is invalid")
                
                # Allowed values validation
                if rule.allowed_values and value not in rule.allowed_values:
                    errors.append(f"{field_name} must be one of: {', '.join(rule.allowed_values)}")
        
        elif rule.field_type == 'email':
            if not isinstance(value, str):
                errors.append(f"{field_name} must be a string")
            elif not re.match(self.config.PATTERNS['email'], value):
                errors.append(f"{field_name} must be a valid email address")
            else:
                sanitized_value = self.sanitize_string(value, strict=True)
        
        elif rule.field_type == 'integer':
            try:
                sanitized_value = int(value)
                if rule.min_value is not None and sanitized_value < rule.min_value:
                    errors.append(f"{field_name} must be at least {rule.min_value}")
                if rule.max_value is not None and sanitized_value > rule.max_value:
                    errors.append(f"{field_name} must be at most {rule.max_value}")
            except (ValueError, TypeError):
                errors.append(f"{field_name} must be a valid integer")
        
        elif rule.field_type == 'float':
            try:
                sanitized_value = float(value)
                if rule.min_value is not None and sanitized_value < rule.min_value:
                    errors.append(f"{field_name} must be at least {rule.min_value}")
                if rule.max_value is not None and sanitized_value > rule.max_value:
                    errors.append(f"{field_name} must be at most {rule.max_value}")
            except (ValueError, TypeError):
                errors.append(f"{field_name} must be a valid number")
        
        elif rule.field_type == 'json':
            if isinstance(value, (dict, list)):
                sanitized_value = value
            elif isinstance(value, str):
                try:
                    sanitized_value = json.loads(value)
                except json.JSONDecodeError:
                    errors.append(f"{field_name} must be valid JSON")
            else:
                errors.append(f"{field_name} must be a JSON object or string")
        
        return {
            'valid': len(errors) == 0,
            'errors': errors,
            'sanitized_value': sanitized_value
        }
    
    def validate_request_data(self, endpoint: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate request data for specific endpoint"""
        endpoint_rules = self.config.ENDPOINT_RULES.get(endpoint, {})
        
        validation_result = {
            'valid': True,
            'errors': [],
            'sanitized_data': {},
            'missing_required': []
        }
        
        # Check required fields
        for field_name, rule in endpoint_rules.items():
            if rule.required and field_name not in data:
                validation_result['missing_required'].append(field_name)
                validation_result['valid'] = False
        
        # Validate present fields
        for field_name, value in data.items():
            if field_name in endpoint_rules:
                rule = endpoint_rules[field_name]
                field_result = self.validate_field(field_name, value, rule)
                
                if not field_result['valid']:
                    validation_result['errors'].extend(field_result['errors'])
                    validation_result['valid'] = False
                
                validation_result['sanitized_data'][field_name] = field_result['sanitized_value']
            else:
                # Unknown field - pass through with sanitization if string
                if isinstance(value, str):
                    validation_result['sanitized_data'][field_name] = self.sanitize_string(value)
                else:
                    validation_result['sanitized_data'][field_name] = value
        
        return validation_result
    
    def validate_query_params(self, params: Dict[str, str]) -> Dict[str, Any]:
        """Validate query parameters"""
        sanitized_params = {}
        errors = []
        
        for key, value in params.items():
            # Check for dangerous patterns
            dangerous = self.check_dangerous_patterns(key) + self.check_dangerous_patterns(value)
            if dangerous:
                errors.extend(dangerous)
                continue
            
            # Sanitize key and value
            clean_key = self.sanitize_string(key, strict=True)
            clean_value = self.sanitize_string(value, strict=True)
            
            # Basic validation
            if len(clean_key) > 100:
                errors.append(f"Query parameter key too long: {key}")
            if len(clean_value) > 1000:
                errors.append(f"Query parameter value too long: {key}")
            
            sanitized_params[clean_key] = clean_value
        
        return {
            'valid': len(errors) == 0,
            'errors': errors,
            'sanitized_params': sanitized_params
        }
    
    def validate_headers(self, headers: Dict[str, str]) -> Dict[str, Any]:
        """Validate HTTP headers"""
        dangerous_headers = [
            'x-forwarded-for', 'x-real-ip', 'x-cluster-client-ip',
            'x-forwarded', 'forwarded-for', 'forwarded'
        ]
        
        suspicious_patterns = []
        
        for key, value in headers.items():
            key_lower = key.lower()
            
            # Check for header injection
            if '\n' in value or '\r' in value:
                suspicious_patterns.append(f"Header injection attempt in {key}")
            
            # Check for suspicious forwarded headers
            if key_lower in dangerous_headers:
                # Validate IP format if it's an IP header
                if not re.match(self.config.PATTERNS['ip_address'], value.split(',')[0].strip()):
                    suspicious_patterns.append(f"Invalid IP format in {key}")
            
            # Check for oversized headers
            if len(value) > 8192:
                suspicious_patterns.append(f"Oversized header: {key}")
        
        return {
            'valid': len(suspicious_patterns) == 0,
            'warnings': suspicious_patterns
        }


class ValidationMiddleware(BaseHTTPMiddleware):
    """Input validation middleware"""
    
    def __init__(self, app, validator: InputValidator = None):
        super().__init__(app)
        self.validator = validator or InputValidator()
    
    async def dispatch(self, request: Request, call_next):
        start_time = datetime.utcnow()
        
        try:
            # Validate headers
            header_validation = self.validator.validate_headers(dict(request.headers))
            if not header_validation['valid']:
                logger.warning(
                    "Suspicious headers detected",
                    path=str(request.url.path),
                    warnings=header_validation['warnings']
                )
                # Don't block, but log the warning
            
            # Validate query parameters
            query_params = dict(request.query_params)
            if query_params:
                param_validation = self.validator.validate_query_params(query_params)
                if not param_validation['valid']:
                    logger.error(
                        "Invalid query parameters",
                        path=str(request.url.path),
                        errors=param_validation['errors']
                    )
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail={
                            "message": "Invalid query parameters",
                            "errors": param_validation['errors']
                        }
                    )
            
            # For POST/PUT/PATCH requests, validate request body
            if request.method in ['POST', 'PUT', 'PATCH']:
                content_type = request.headers.get('content-type', '')
                
                if 'application/json' in content_type:
                    try:
                        body = await request.body()
                        if body:
                            request_data = json.loads(body.decode('utf-8'))
                            
                            # Get endpoint path for validation rules
                            endpoint_path = str(request.url.path)
                            
                            # Apply endpoint-specific validation
                            validation_result = self.validator.validate_request_data(
                                endpoint_path, 
                                request_data
                            )
                            
                            if not validation_result['valid']:
                                logger.error(
                                    "Request validation failed",
                                    path=endpoint_path,
                                    errors=validation_result['errors'],
                                    missing_required=validation_result['missing_required']
                                )
                                
                                error_detail = {
                                    "message": "Request validation failed",
                                    "errors": validation_result['errors']
                                }
                                
                                if validation_result['missing_required']:
                                    error_detail["missing_required"] = validation_result['missing_required']
                                
                                raise HTTPException(
                                    status_code=status.HTTP_400_BAD_REQUEST,
                                    detail=error_detail
                                )
                            
                            # Replace request body with sanitized data
                            sanitized_body = json.dumps(validation_result['sanitized_data']).encode('utf-8')
                            
                            # Create new request with sanitized body
                            async def receive():
                                return {
                                    'type': 'http.request',
                                    'body': sanitized_body,
                                    'more_body': False
                                }
                            
                            request._receive = receive
                    
                    except json.JSONDecodeError:
                        logger.error("Invalid JSON in request body", path=str(request.url.path))
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Invalid JSON in request body"
                        )
                
                elif 'multipart/form-data' in content_type:
                    # Handle form data validation
                    # This would need more complex handling for file uploads
                    pass
            
            # Process the request
            response = await call_next(request)
            
            # Log validation success
            duration = (datetime.utcnow() - start_time).total_seconds()
            logger.info(
                "Request validated successfully",
                path=str(request.url.path),
                method=request.method,
                duration=duration
            )
            
            return response
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(
                "Validation middleware error",
                path=str(request.url.path),
                error=str(e)
            )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Internal validation error"
            )


# Global validator instance
input_validator = InputValidator()