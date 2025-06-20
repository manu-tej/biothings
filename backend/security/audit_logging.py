"""
Comprehensive Audit Logging System for BioThings Platform
Provides detailed security event logging, monitoring, and compliance reporting
"""
import json
import asyncio
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Union
from dataclasses import dataclass, asdict
from enum import Enum
from pathlib import Path
import hashlib
import gzip
import csv
from collections import defaultdict
from fastapi import Request
from fastapi.middleware.base import BaseHTTPMiddleware
import structlog
import aiofiles

logger = structlog.get_logger()


class EventSeverity(str, Enum):
    """Event severity levels"""
    DEBUG = "debug"
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class EventCategory(str, Enum):
    """Event categories for classification"""
    AUTHENTICATION = "authentication"
    AUTHORIZATION = "authorization"
    DATA_ACCESS = "data_access"
    SYSTEM_ADMIN = "system_admin"
    API_ACCESS = "api_access"
    SECURITY_VIOLATION = "security_violation"
    SYSTEM_ERROR = "system_error"
    USER_MANAGEMENT = "user_management"
    CONFIGURATION = "configuration"
    COMPLIANCE = "compliance"


@dataclass
class AuditEvent:
    """Comprehensive audit event structure"""
    # Core event information
    event_id: str
    timestamp: datetime
    event_type: str
    category: EventCategory
    severity: EventSeverity
    
    # User information
    user_id: Optional[str] = None
    username: Optional[str] = None
    user_role: Optional[str] = None
    
    # Session information
    session_id: Optional[str] = None
    client_ip: str = ""
    user_agent: str = ""
    
    # Request information
    method: Optional[str] = None
    endpoint: Optional[str] = None
    query_params: Optional[Dict[str, Any]] = None
    
    # Event details
    message: str = ""
    details: Dict[str, Any] = None
    
    # Result information
    success: bool = True
    error_code: Optional[str] = None
    error_message: Optional[str] = None
    
    # Compliance tracking
    compliance_tags: List[str] = None
    sensitive_data_accessed: bool = False
    data_classification: Optional[str] = None
    
    # Performance metrics
    duration_ms: Optional[float] = None
    response_size: Optional[int] = None
    
    def __post_init__(self):
        if self.details is None:
            self.details = {}
        if self.compliance_tags is None:
            self.compliance_tags = []
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization"""
        data = asdict(self)
        data['timestamp'] = self.timestamp.isoformat()
        return data
    
    def to_json(self) -> str:
        """Convert to JSON string"""
        return json.dumps(self.to_dict(), default=str)
    
    def get_event_hash(self) -> str:
        """Generate hash for event integrity"""
        event_str = f"{self.timestamp.isoformat()}{self.event_type}{self.user_id}{self.client_ip}"
        return hashlib.sha256(event_str.encode()).hexdigest()[:16]


class AuditLogger:
    """Comprehensive audit logging system"""
    
    def __init__(self, 
                 log_directory: str = "logs/audit",
                 max_file_size_mb: int = 100,
                 retention_days: int = 90,
                 compression_enabled: bool = True,
                 real_time_alerts: bool = True):
        
        self.log_directory = Path(log_directory)
        self.log_directory.mkdir(parents=True, exist_ok=True)
        
        self.max_file_size = max_file_size_mb * 1024 * 1024  # Convert to bytes
        self.retention_days = retention_days
        self.compression_enabled = compression_enabled
        self.real_time_alerts = real_time_alerts
        
        # In-memory event storage for real-time queries
        self.recent_events: List[AuditEvent] = []
        self.max_recent_events = 10000
        
        # Event statistics
        self.event_counts = defaultdict(int)
        self.severity_counts = defaultdict(int)
        self.user_activity = defaultdict(int)
        
        # Alert thresholds
        self.alert_thresholds = {
            "failed_logins_per_hour": 10,
            "critical_events_per_hour": 5,
            "api_errors_per_hour": 50,
            "suspicious_ips_per_hour": 3
        }
        
        # Current log file
        self.current_log_file = None
        self.current_file_size = 0
        
        logger.info("Audit logger initialized", directory=str(self.log_directory))
    
    async def log_event(self, event: AuditEvent) -> None:
        """Log an audit event"""
        try:
            # Add to recent events
            self.recent_events.append(event)
            if len(self.recent_events) > self.max_recent_events:
                self.recent_events.pop(0)
            
            # Update statistics
            self.event_counts[event.event_type] += 1
            self.severity_counts[event.severity] += 1
            if event.user_id:
                self.user_activity[event.user_id] += 1
            
            # Write to file
            await self._write_to_file(event)
            
            # Check for real-time alerts
            if self.real_time_alerts:
                await self._check_alerts(event)
            
            # Log to structured logger
            logger.bind(
                event_id=event.event_id,
                event_type=event.event_type,
                category=event.category,
                severity=event.severity,
                user_id=event.user_id,
                client_ip=event.client_ip
            ).info("Audit event logged", message=event.message)
            
        except Exception as e:
            logger.error("Failed to log audit event", error=str(e), event_type=event.event_type)
    
    async def _write_to_file(self, event: AuditEvent) -> None:
        """Write event to log file"""
        # Check if we need a new log file
        if self._need_new_log_file():
            await self._rotate_log_file()
        
        # Ensure current log file exists
        if not self.current_log_file:
            self.current_log_file = self._get_current_log_filename()
        
        # Write event to file
        log_line = event.to_json() + '\n'
        
        async with aiofiles.open(self.current_log_file, 'a') as f:
            await f.write(log_line)
        
        self.current_file_size += len(log_line.encode())
    
    def _need_new_log_file(self) -> bool:
        """Check if we need to create a new log file"""
        if not self.current_log_file:
            return True
        
        if not Path(self.current_log_file).exists():
            return True
        
        if self.current_file_size >= self.max_file_size:
            return True
        
        # Check if it's a new day
        if self.current_log_file:
            file_date = self._extract_date_from_filename(self.current_log_file)
            today = datetime.now().strftime('%Y-%m-%d')
            if file_date != today:
                return True
        
        return False
    
    async def _rotate_log_file(self) -> None:
        """Rotate log file"""
        # Compress old file if enabled
        if self.current_log_file and self.compression_enabled:
            await self._compress_log_file(self.current_log_file)
        
        # Create new log file
        self.current_log_file = self._get_current_log_filename()
        self.current_file_size = 0
        
        logger.info("Log file rotated", new_file=self.current_log_file)
    
    async def _compress_log_file(self, filename: str) -> None:
        """Compress log file"""
        try:
            compressed_filename = f"{filename}.gz"
            
            async with aiofiles.open(filename, 'rb') as f_in:
                content = await f_in.read()
            
            with gzip.open(compressed_filename, 'wb') as f_out:
                f_out.write(content)
            
            # Remove original file
            Path(filename).unlink()
            
            logger.info("Log file compressed", original=filename, compressed=compressed_filename)
            
        except Exception as e:
            logger.error("Failed to compress log file", filename=filename, error=str(e))
    
    def _get_current_log_filename(self) -> str:
        """Get current log filename"""
        timestamp = datetime.now().strftime('%Y-%m-%d_%H')
        return str(self.log_directory / f"audit-{timestamp}.jsonl")
    
    def _extract_date_from_filename(self, filename: str) -> str:
        """Extract date from log filename"""
        try:
            basename = Path(filename).name
            # Extract date part from "audit-YYYY-MM-DD_HH.jsonl"
            date_part = basename.split('-')[1:4]  # ['YYYY', 'MM', 'DD_HH.jsonl']
            date_part[2] = date_part[2].split('_')[0]  # Remove hour part
            return '-'.join(date_part)
        except:
            return datetime.now().strftime('%Y-%m-%d')
    
    async def _check_alerts(self, event: AuditEvent) -> None:
        """Check for security alerts based on event patterns"""
        current_hour = datetime.now().replace(minute=0, second=0, microsecond=0)
        hour_ago = current_hour - timedelta(hours=1)
        
        # Get events from the last hour
        recent_hour_events = [
            e for e in self.recent_events 
            if e.timestamp >= hour_ago
        ]
        
        alerts = []
        
        # Check failed login attempts
        failed_logins = [
            e for e in recent_hour_events 
            if e.event_type == "login_failed"
        ]
        if len(failed_logins) >= self.alert_thresholds["failed_logins_per_hour"]:
            alerts.append({
                "type": "excessive_failed_logins",
                "count": len(failed_logins),
                "threshold": self.alert_thresholds["failed_logins_per_hour"]
            })
        
        # Check critical events
        critical_events = [
            e for e in recent_hour_events 
            if e.severity == EventSeverity.CRITICAL
        ]
        if len(critical_events) >= self.alert_thresholds["critical_events_per_hour"]:
            alerts.append({
                "type": "excessive_critical_events",
                "count": len(critical_events),
                "threshold": self.alert_thresholds["critical_events_per_hour"]
            })
        
        # Check API errors
        api_errors = [
            e for e in recent_hour_events 
            if not e.success and e.category == EventCategory.API_ACCESS
        ]
        if len(api_errors) >= self.alert_thresholds["api_errors_per_hour"]:
            alerts.append({
                "type": "excessive_api_errors",
                "count": len(api_errors),
                "threshold": self.alert_thresholds["api_errors_per_hour"]
            })
        
        # Check for suspicious IP activity
        ip_counts = defaultdict(int)
        for e in recent_hour_events:
            if e.client_ip:
                ip_counts[e.client_ip] += 1
        
        suspicious_ips = [
            ip for ip, count in ip_counts.items() 
            if count >= self.alert_thresholds["suspicious_ips_per_hour"]
        ]
        if suspicious_ips:
            alerts.append({
                "type": "suspicious_ip_activity",
                "ips": suspicious_ips,
                "threshold": self.alert_thresholds["suspicious_ips_per_hour"]
            })
        
        # Send alerts
        for alert in alerts:
            await self._send_alert(alert, event)
    
    async def _send_alert(self, alert: Dict[str, Any], triggering_event: AuditEvent) -> None:
        """Send security alert"""
        alert_event = AuditEvent(
            event_id=f"alert-{datetime.now().strftime('%Y%m%d%H%M%S')}",
            timestamp=datetime.now(),
            event_type="security_alert",
            category=EventCategory.SECURITY_VIOLATION,
            severity=EventSeverity.CRITICAL,
            message=f"Security alert: {alert['type']}",
            details={
                "alert": alert,
                "triggering_event": triggering_event.event_id
            }
        )
        
        # Log the alert
        await self.log_event(alert_event)
        
        # Log to structured logger with critical level
        logger.critical(
            "SECURITY ALERT",
            alert_type=alert["type"],
            alert_details=alert,
            triggering_event=triggering_event.event_id
        )
    
    async def query_events(self,
                          start_time: Optional[datetime] = None,
                          end_time: Optional[datetime] = None,
                          event_types: Optional[List[str]] = None,
                          user_id: Optional[str] = None,
                          client_ip: Optional[str] = None,
                          severity: Optional[EventSeverity] = None,
                          category: Optional[EventCategory] = None,
                          limit: int = 1000) -> List[AuditEvent]:
        """Query audit events with filters"""
        
        # Start with recent events in memory
        events = self.recent_events.copy()
        
        # Apply filters
        if start_time:
            events = [e for e in events if e.timestamp >= start_time]
        
        if end_time:
            events = [e for e in events if e.timestamp <= end_time]
        
        if event_types:
            events = [e for e in events if e.event_type in event_types]
        
        if user_id:
            events = [e for e in events if e.user_id == user_id]
        
        if client_ip:
            events = [e for e in events if e.client_ip == client_ip]
        
        if severity:
            events = [e for e in events if e.severity == severity]
        
        if category:
            events = [e for e in events if e.category == category]
        
        # Sort by timestamp (newest first) and limit
        events.sort(key=lambda x: x.timestamp, reverse=True)
        return events[:limit]
    
    async def generate_compliance_report(self,
                                       start_date: datetime,
                                       end_date: datetime,
                                       format: str = "json") -> Union[Dict[str, Any], str]:
        """Generate compliance report"""
        
        events = await self.query_events(start_time=start_date, end_time=end_date)
        
        # Analyze events for compliance
        report_data = {
            "report_period": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat()
            },
            "summary": {
                "total_events": len(events),
                "by_severity": dict(self.severity_counts),
                "by_category": {},
                "unique_users": len(set(e.user_id for e in events if e.user_id)),
                "unique_ips": len(set(e.client_ip for e in events if e.client_ip))
            },
            "security_metrics": {
                "authentication_failures": len([e for e in events if "login_failed" in e.event_type]),
                "privilege_escalations": len([e for e in events if "privilege" in e.event_type]),
                "data_access_events": len([e for e in events if e.sensitive_data_accessed]),
                "admin_actions": len([e for e in events if e.category == EventCategory.SYSTEM_ADMIN])
            },
            "compliance_issues": [],
            "recommendations": []
        }
        
        # Category breakdown
        for event in events:
            category = event.category.value
            if category not in report_data["summary"]["by_category"]:
                report_data["summary"]["by_category"][category] = 0
            report_data["summary"]["by_category"][category] += 1
        
        # Identify compliance issues
        if report_data["security_metrics"]["authentication_failures"] > 100:
            report_data["compliance_issues"].append("High number of authentication failures detected")
        
        if report_data["security_metrics"]["privilege_escalations"] > 0:
            report_data["compliance_issues"].append("Privilege escalation attempts detected")
        
        # Generate recommendations
        if report_data["security_metrics"]["authentication_failures"] > 50:
            report_data["recommendations"].append("Consider implementing stronger authentication policies")
        
        if format == "csv":
            return self._generate_csv_report(events)
        else:
            return report_data
    
    def _generate_csv_report(self, events: List[AuditEvent]) -> str:
        """Generate CSV format report"""
        output = []
        
        # CSV header
        headers = [
            "timestamp", "event_type", "category", "severity", "user_id", 
            "client_ip", "endpoint", "success", "message"
        ]
        output.append(",".join(headers))
        
        # CSV rows
        for event in events:
            row = [
                event.timestamp.isoformat(),
                event.event_type,
                event.category.value,
                event.severity.value,
                event.user_id or "",
                event.client_ip,
                event.endpoint or "",
                str(event.success),
                event.message.replace('"', '""')  # Escape quotes
            ]
            output.append(",".join(f'"{field}"' for field in row))
        
        return "\n".join(output)
    
    async def cleanup_old_logs(self) -> None:
        """Clean up old log files based on retention policy"""
        cutoff_date = datetime.now() - timedelta(days=self.retention_days)
        
        deleted_files = []
        for log_file in self.log_directory.glob("audit-*.jsonl*"):
            try:
                # Extract date from filename
                file_date_str = self._extract_date_from_filename(str(log_file))
                file_date = datetime.strptime(file_date_str, '%Y-%m-%d')
                
                if file_date < cutoff_date:
                    log_file.unlink()
                    deleted_files.append(str(log_file))
                    
            except Exception as e:
                logger.warning("Failed to process log file for cleanup", file=str(log_file), error=str(e))
        
        if deleted_files:
            logger.info("Old log files cleaned up", files=deleted_files, count=len(deleted_files))
        
        return deleted_files
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get audit logging statistics"""
        return {
            "recent_events_count": len(self.recent_events),
            "event_counts": dict(self.event_counts),
            "severity_counts": dict(self.severity_counts),
            "active_users": len(self.user_activity),
            "log_directory": str(self.log_directory),
            "current_log_file": self.current_log_file,
            "retention_days": self.retention_days
        }


class AuditMiddleware(BaseHTTPMiddleware):
    """Middleware to automatically audit HTTP requests"""
    
    def __init__(self, app, audit_logger: AuditLogger):
        super().__init__(app)
        self.audit_logger = audit_logger
    
    async def dispatch(self, request: Request, call_next):
        start_time = datetime.now()
        
        # Generate event ID
        event_id = f"req-{start_time.strftime('%Y%m%d%H%M%S')}-{id(request)}"
        
        # Extract request information
        client_ip = request.client.host
        user_agent = request.headers.get("user-agent", "")
        method = request.method
        endpoint = str(request.url.path)
        query_params = dict(request.query_params) if request.query_params else None
        
        # Process request
        response = await call_next(request)
        
        # Calculate duration
        end_time = datetime.now()
        duration_ms = (end_time - start_time).total_seconds() * 1000
        
        # Determine event category
        category = EventCategory.API_ACCESS
        if endpoint.startswith("/auth"):
            category = EventCategory.AUTHENTICATION
        elif endpoint.startswith("/api/security"):
            category = EventCategory.SYSTEM_ADMIN
        
        # Determine severity based on response status
        if response.status_code >= 500:
            severity = EventSeverity.ERROR
        elif response.status_code >= 400:
            severity = EventSeverity.WARNING
        else:
            severity = EventSeverity.INFO
        
        # Create audit event
        audit_event = AuditEvent(
            event_id=event_id,
            timestamp=start_time,
            event_type="http_request",
            category=category,
            severity=severity,
            client_ip=client_ip,
            user_agent=user_agent,
            method=method,
            endpoint=endpoint,
            query_params=query_params,
            message=f"{method} {endpoint} - {response.status_code}",
            success=response.status_code < 400,
            details={
                "status_code": response.status_code,
                "content_type": response.headers.get("content-type", ""),
            },
            duration_ms=duration_ms,
            response_size=len(response.body) if hasattr(response, 'body') else None
        )
        
        # Log the event
        await self.audit_logger.log_event(audit_event)
        
        return response


# Global audit logger instance
audit_logger = AuditLogger()