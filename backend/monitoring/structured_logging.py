"""
Structured Logging System for BioThings Platform
Enterprise-grade logging with security, debugging, and audit capabilities
"""
import json
import logging
import time
from typing import Dict, List, Any, Optional, Union
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from enum import Enum
from collections import deque, defaultdict
import traceback
import sys

try:
    import structlog
    STRUCTLOG_AVAILABLE = True
except ImportError:
    STRUCTLOG_AVAILABLE = False


class LogLevel(Enum):
    """Log levels with severity scores"""
    DEBUG = "DEBUG"
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"


class LogCategory(Enum):
    """Log categories for classification"""
    SYSTEM = "system"
    SECURITY = "security"
    BUSINESS = "business"
    PERFORMANCE = "performance"
    AGENT = "agent"
    API = "api"
    DATABASE = "database"
    EXPERIMENT = "experiment"
    USER = "user"
    AUDIT = "audit"


@dataclass
class LogEntry:
    """Structured log entry"""
    timestamp: str
    level: LogLevel
    category: LogCategory
    message: str
    component: str
    correlation_id: Optional[str] = None
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    agent_id: Optional[str] = None
    experiment_id: Optional[str] = None
    request_id: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    duration_ms: Optional[float] = None
    status_code: Optional[int] = None
    error_code: Optional[str] = None
    stack_trace: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


@dataclass
class LogPattern:
    """Log pattern for anomaly detection"""
    pattern_id: str
    description: str
    level: LogLevel
    category: LogCategory
    keywords: List[str]
    threshold_count: int
    time_window_minutes: int
    action: str  # alert, block, notify


class StructuredLogger:
    """Centralized structured logging system"""
    
    def __init__(self, max_logs: int = 100000):
        self.log_buffer = deque(maxlen=max_logs)
        self.log_patterns = []
        self.alert_history = deque(maxlen=1000)
        self.log_stats = defaultdict(int)
        
        # Setup standard Python logger
        self.logger = logging.getLogger("biothings")
        self.logger.setLevel(logging.INFO)
        
        # Add console handler if not exists
        if not self.logger.handlers:
            handler = logging.StreamHandler(sys.stdout)
            formatter = logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            )
            handler.setFormatter(formatter)
            self.logger.addHandler(handler)
        
        # Setup structured logger if available
        if STRUCTLOG_AVAILABLE:
            structlog.configure(
                processors=[
                    structlog.stdlib.filter_by_level,
                    structlog.stdlib.add_logger_name,
                    structlog.stdlib.add_log_level,
                    structlog.stdlib.PositionalArgumentsFormatter(),
                    structlog.processors.TimeStamper(fmt="iso"),
                    structlog.processors.StackInfoRenderer(),
                    structlog.processors.format_exc_info,
                    structlog.processors.UnicodeDecoder(),
                    structlog.processors.JSONRenderer()
                ],
                context_class=dict,
                logger_factory=structlog.stdlib.LoggerFactory(),
                wrapper_class=structlog.stdlib.BoundLogger,
                cache_logger_on_first_use=True,
            )
            self.struct_logger = structlog.get_logger()
        else:
            self.struct_logger = None
        
        # Initialize security patterns
        self._setup_security_patterns()
        
        # Initialize performance patterns
        self._setup_performance_patterns()
    
    def _setup_security_patterns(self):
        """Setup security-related log patterns"""
        self.log_patterns.extend([
            LogPattern(
                pattern_id="failed_auth_attempts",
                description="Multiple failed authentication attempts",
                level=LogLevel.WARNING,
                category=LogCategory.SECURITY,
                keywords=["authentication", "failed", "invalid", "unauthorized"],
                threshold_count=5,
                time_window_minutes=5,
                action="alert"
            ),
            LogPattern(
                pattern_id="sql_injection_attempt",
                description="Potential SQL injection attempt",
                level=LogLevel.CRITICAL,
                category=LogCategory.SECURITY,
                keywords=["sql", "injection", "union", "select", "drop", "delete"],
                threshold_count=1,
                time_window_minutes=1,
                action="block"
            ),
            LogPattern(
                pattern_id="privilege_escalation",
                description="Privilege escalation attempt",
                level=LogLevel.CRITICAL,
                category=LogCategory.SECURITY,
                keywords=["privilege", "escalation", "admin", "root", "sudo"],
                threshold_count=3,
                time_window_minutes=10,
                action="alert"
            ),
            LogPattern(
                pattern_id="data_exfiltration",
                description="Potential data exfiltration",
                level=LogLevel.CRITICAL,
                category=LogCategory.SECURITY,
                keywords=["export", "download", "bulk", "sensitive", "confidential"],
                threshold_count=10,
                time_window_minutes=5,
                action="alert"
            )
        ])
    
    def _setup_performance_patterns(self):
        """Setup performance-related log patterns"""
        self.log_patterns.extend([
            LogPattern(
                pattern_id="slow_queries",
                description="Slow database queries detected",
                level=LogLevel.WARNING,
                category=LogCategory.PERFORMANCE,
                keywords=["slow", "query", "timeout", "database"],
                threshold_count=5,
                time_window_minutes=5,
                action="notify"
            ),
            LogPattern(
                pattern_id="memory_pressure",
                description="Memory pressure detected",
                level=LogLevel.WARNING,
                category=LogCategory.PERFORMANCE,
                keywords=["memory", "pressure", "oom", "swap"],
                threshold_count=3,
                time_window_minutes=2,
                action="alert"
            ),
            LogPattern(
                pattern_id="agent_failures",
                description="High agent failure rate",
                level=LogLevel.ERROR,
                category=LogCategory.AGENT,
                keywords=["agent", "failed", "error", "exception"],
                threshold_count=10,
                time_window_minutes=10,
                action="alert"
            )
        ])
    
    def log(self, level: LogLevel, category: LogCategory, message: str, 
           component: str, **kwargs) -> LogEntry:
        """Log a structured entry"""
        
        # Create log entry
        entry = LogEntry(
            timestamp=datetime.utcnow().isoformat(),
            level=level,
            category=category,
            message=message,
            component=component,
            **kwargs
        )
        
        # Add to buffer
        self.log_buffer.append(entry)
        
        # Update statistics
        self.log_stats[f"{level.value}_{category.value}"] += 1
        self.log_stats["total_logs"] += 1
        
        # Log to standard logger
        log_dict = asdict(entry)
        log_message = f"[{category.value}:{component}] {message}"
        
        if level == LogLevel.DEBUG:
            self.logger.debug(log_message, extra=log_dict)
        elif level == LogLevel.INFO:
            self.logger.info(log_message, extra=log_dict)
        elif level == LogLevel.WARNING:
            self.logger.warning(log_message, extra=log_dict)
        elif level == LogLevel.ERROR:
            self.logger.error(log_message, extra=log_dict)
        elif level == LogLevel.CRITICAL:
            self.logger.critical(log_message, extra=log_dict)
        
        # Log to structured logger if available
        if self.struct_logger:
            self.struct_logger.info(
                message,
                level=level.value,
                category=category.value,
                component=component,
                **{k: v for k, v in kwargs.items() if v is not None}
            )
        
        # Check for patterns
        self._check_log_patterns(entry)
        
        return entry
    
    def _check_log_patterns(self, entry: LogEntry):
        """Check if log entry matches any security or performance patterns"""
        for pattern in self.log_patterns:
            if self._matches_pattern(entry, pattern):
                self._handle_pattern_match(pattern, entry)
    
    def _matches_pattern(self, entry: LogEntry, pattern: LogPattern) -> bool:
        """Check if log entry matches a pattern"""
        # Check level and category
        if pattern.level != entry.level or pattern.category != entry.category:
            return False
        
        # Check keywords
        message_lower = entry.message.lower()
        for keyword in pattern.keywords:
            if keyword.lower() in message_lower:
                return True
        
        return False
    
    def _handle_pattern_match(self, pattern: LogPattern, entry: LogEntry):
        """Handle when a log pattern is matched"""
        # Count recent matches
        cutoff_time = datetime.utcnow() - timedelta(minutes=pattern.time_window_minutes)
        
        recent_matches = sum(
            1 for log_entry in self.log_buffer
            if (datetime.fromisoformat(log_entry.timestamp) >= cutoff_time and
                self._matches_pattern(log_entry, pattern))
        )
        
        if recent_matches >= pattern.threshold_count:
            self._trigger_pattern_alert(pattern, recent_matches, entry)
    
    def _trigger_pattern_alert(self, pattern: LogPattern, match_count: int, entry: LogEntry):
        """Trigger alert for pattern match"""
        alert = {
            "timestamp": datetime.utcnow().isoformat(),
            "pattern_id": pattern.pattern_id,
            "description": pattern.description,
            "match_count": match_count,
            "action": pattern.action,
            "triggering_entry": asdict(entry)
        }
        
        self.alert_history.append(alert)
        
        # Log the alert
        alert_message = (
            f"PATTERN ALERT: {pattern.description} - "
            f"{match_count} matches in {pattern.time_window_minutes} minutes"
        )
        
        self.log(
            LogLevel.CRITICAL,
            LogCategory.SECURITY if pattern.category == LogCategory.SECURITY else LogCategory.SYSTEM,
            alert_message,
            "log_pattern_detector",
            pattern_id=pattern.pattern_id,
            match_count=match_count,
            action=pattern.action
        )
    
    def debug(self, category: LogCategory, message: str, component: str, **kwargs):
        """Log debug message"""
        return self.log(LogLevel.DEBUG, category, message, component, **kwargs)
    
    def info(self, category: LogCategory, message: str, component: str, **kwargs):
        """Log info message"""
        return self.log(LogLevel.INFO, category, message, component, **kwargs)
    
    def warning(self, category: LogCategory, message: str, component: str, **kwargs):
        """Log warning message"""
        return self.log(LogLevel.WARNING, category, message, component, **kwargs)
    
    def error(self, category: LogCategory, message: str, component: str, **kwargs):
        """Log error message"""
        # Capture stack trace if not provided
        if "stack_trace" not in kwargs and "error_code" not in kwargs:
            kwargs["stack_trace"] = traceback.format_exc()
        
        return self.log(LogLevel.ERROR, category, message, component, **kwargs)
    
    def critical(self, category: LogCategory, message: str, component: str, **kwargs):
        """Log critical message"""
        # Always capture stack trace for critical errors
        if "stack_trace" not in kwargs:
            kwargs["stack_trace"] = traceback.format_exc()
        
        return self.log(LogLevel.CRITICAL, category, message, component, **kwargs)
    
    def audit(self, message: str, component: str, **kwargs):
        """Log audit event"""
        return self.log(LogLevel.INFO, LogCategory.AUDIT, message, component, **kwargs)
    
    def security_event(self, message: str, component: str, **kwargs):
        """Log security event"""
        return self.log(LogLevel.WARNING, LogCategory.SECURITY, message, component, **kwargs)
    
    def performance_event(self, message: str, component: str, duration_ms: float, **kwargs):
        """Log performance event"""
        return self.log(
            LogLevel.INFO, LogCategory.PERFORMANCE, message, component,
            duration_ms=duration_ms, **kwargs
        )
    
    def agent_event(self, message: str, agent_id: str, **kwargs):
        """Log agent-related event"""
        return self.log(
            LogLevel.INFO, LogCategory.AGENT, message, "agent_system",
            agent_id=agent_id, **kwargs
        )
    
    def experiment_event(self, message: str, experiment_id: str, **kwargs):
        """Log experiment-related event"""
        return self.log(
            LogLevel.INFO, LogCategory.EXPERIMENT, message, "experiment_system",
            experiment_id=experiment_id, **kwargs
        )
    
    def api_request(self, method: str, endpoint: str, status_code: int, 
                   duration_ms: float, **kwargs):
        """Log API request"""
        level = LogLevel.INFO if 200 <= status_code < 400 else LogLevel.WARNING
        message = f"{method} {endpoint} - {status_code}"
        
        return self.log(
            level, LogCategory.API, message, "api_server",
            status_code=status_code, duration_ms=duration_ms, **kwargs
        )
    
    def database_query(self, query_type: str, table: str, duration_ms: float, 
                      success: bool = True, **kwargs):
        """Log database query"""
        level = LogLevel.INFO if success else LogLevel.ERROR
        message = f"{query_type} on {table} - {'success' if success else 'failed'}"
        
        return self.log(
            level, LogCategory.DATABASE, message, "database",
            duration_ms=duration_ms, **kwargs
        )
    
    def get_logs(self, 
                level: Optional[LogLevel] = None,
                category: Optional[LogCategory] = None,
                component: Optional[str] = None,
                minutes: int = 60,
                limit: int = 1000) -> List[Dict[str, Any]]:
        """Get filtered logs"""
        cutoff_time = datetime.utcnow() - timedelta(minutes=minutes)
        
        filtered_logs = []
        for entry in reversed(self.log_buffer):
            # Check time filter
            if datetime.fromisoformat(entry.timestamp) < cutoff_time:
                continue
            
            # Check filters
            if level and entry.level != level:
                continue
            if category and entry.category != category:
                continue
            if component and entry.component != component:
                continue
            
            filtered_logs.append(asdict(entry))
            
            if len(filtered_logs) >= limit:
                break
        
        return filtered_logs
    
    def get_log_statistics(self, minutes: int = 60) -> Dict[str, Any]:
        """Get log statistics for the specified time period"""
        cutoff_time = datetime.utcnow() - timedelta(minutes=minutes)
        
        stats = {
            "time_period_minutes": minutes,
            "total_logs": 0,
            "by_level": defaultdict(int),
            "by_category": defaultdict(int),
            "by_component": defaultdict(int),
            "error_rate": 0,
            "critical_count": 0,
            "top_errors": [],
            "recent_alerts": len(self.alert_history)
        }
        
        recent_logs = [
            entry for entry in self.log_buffer
            if datetime.fromisoformat(entry.timestamp) >= cutoff_time
        ]
        
        error_messages = defaultdict(int)
        
        for entry in recent_logs:
            stats["total_logs"] += 1
            stats["by_level"][entry.level.value] += 1
            stats["by_category"][entry.category.value] += 1
            stats["by_component"][entry.component] += 1
            
            if entry.level in [LogLevel.ERROR, LogLevel.CRITICAL]:
                error_messages[entry.message] += 1
            
            if entry.level == LogLevel.CRITICAL:
                stats["critical_count"] += 1
        
        # Calculate error rate
        if stats["total_logs"] > 0:
            error_count = stats["by_level"]["ERROR"] + stats["by_level"]["CRITICAL"]
            stats["error_rate"] = error_count / stats["total_logs"]
        
        # Top errors
        stats["top_errors"] = [
            {"message": msg, "count": count}
            for msg, count in sorted(error_messages.items(), key=lambda x: x[1], reverse=True)[:10]
        ]
        
        # Convert defaultdicts to regular dicts
        stats["by_level"] = dict(stats["by_level"])
        stats["by_category"] = dict(stats["by_category"])
        stats["by_component"] = dict(stats["by_component"])
        
        return stats
    
    def get_security_events(self, minutes: int = 60) -> List[Dict[str, Any]]:
        """Get security-related log events"""
        return self.get_logs(
            category=LogCategory.SECURITY,
            minutes=minutes,
            limit=500
        )
    
    def get_pattern_alerts(self, minutes: int = 60) -> List[Dict[str, Any]]:
        """Get pattern-based alerts"""
        cutoff_time = datetime.utcnow() - timedelta(minutes=minutes)
        
        recent_alerts = [
            alert for alert in self.alert_history
            if datetime.fromisoformat(alert["timestamp"]) >= cutoff_time
        ]
        
        return recent_alerts
    
    def export_logs(self, minutes: int = 60) -> str:
        """Export logs as JSON"""
        logs = self.get_logs(minutes=minutes, limit=10000)
        return json.dumps(logs, indent=2, default=str)
    
    def clear_old_logs(self, days: int = 7):
        """Clear logs older than specified days"""
        cutoff_time = datetime.utcnow() - timedelta(days=days)
        
        # Filter out old logs
        self.log_buffer = deque([
            entry for entry in self.log_buffer
            if datetime.fromisoformat(entry.timestamp) >= cutoff_time
        ], maxlen=self.log_buffer.maxlen)
        
        # Clear old alerts
        self.alert_history = deque([
            alert for alert in self.alert_history
            if datetime.fromisoformat(alert["timestamp"]) >= cutoff_time
        ], maxlen=self.alert_history.maxlen)


# Global structured logger instance
structured_logger = StructuredLogger()


# Convenience functions for common logging patterns
def log_api_request(method: str, endpoint: str, status_code: int, 
                   duration_ms: float, **kwargs):
    """Log API request"""
    return structured_logger.api_request(method, endpoint, status_code, duration_ms, **kwargs)


def log_agent_task(agent_id: str, task_type: str, status: str, 
                  duration_ms: float, **kwargs):
    """Log agent task"""
    message = f"Agent task {task_type} - {status}"
    return structured_logger.agent_event(
        message, agent_id, duration_ms=duration_ms, task_type=task_type, 
        status=status, **kwargs
    )


def log_security_event(event_type: str, severity: str, description: str, **kwargs):
    """Log security event"""
    message = f"{event_type}: {description}"
    level = LogLevel.CRITICAL if severity == "critical" else LogLevel.WARNING
    return structured_logger.log(
        level, LogCategory.SECURITY, message, "security_system",
        event_type=event_type, severity=severity, **kwargs
    )


def log_business_event(event_type: str, description: str, **kwargs):
    """Log business event"""
    return structured_logger.log(
        LogLevel.INFO, LogCategory.BUSINESS, description, "business_system",
        event_type=event_type, **kwargs
    )


def log_performance_issue(component: str, issue_type: str, metric_value: float, 
                         threshold: float, **kwargs):
    """Log performance issue"""
    message = f"Performance issue in {component}: {issue_type} = {metric_value} (threshold: {threshold})"
    return structured_logger.performance_event(
        message, component, duration_ms=0, issue_type=issue_type,
        metric_value=metric_value, threshold=threshold, **kwargs
    )