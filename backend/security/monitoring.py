"""
Security Monitoring and Alerting System for BioThings Platform
Provides real-time security monitoring, threat detection, and alerting capabilities
"""
import asyncio
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Set
from collections import defaultdict, deque
from dataclasses import dataclass, field
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import JSONResponse
import structlog
import json
import aioredis
from statistics import mean, stdev

from .production_security import require_admin, require_scientist, User, security_manager
from .audit_logging import AuditEvent, EventSeverity, audit_logger

logger = structlog.get_logger()

# Create monitoring router  
monitoring_router = APIRouter(prefix="/api/security/monitoring", tags=["security-monitoring"])


@dataclass
class SecurityMetric:
    """Security metric data structure"""
    name: str
    value: float
    threshold: float
    timestamp: datetime
    severity: str
    tags: Dict[str, str] = field(default_factory=dict)
    
    def is_threshold_exceeded(self) -> bool:
        """Check if metric exceeds threshold"""
        return self.value > self.threshold


@dataclass
class ThreatIndicator:
    """Threat indicator for security analysis"""
    indicator_type: str  # ip, user, pattern, etc.
    value: str
    threat_score: float  # 0-100
    first_seen: datetime
    last_seen: datetime
    occurrences: int
    evidence: List[str]
    tags: List[str] = field(default_factory=list)


@dataclass
class SecurityAlert:
    """Security alert structure"""
    alert_id: str
    alert_type: str
    severity: str
    title: str
    description: str
    timestamp: datetime
    source: str
    affected_resources: List[str]
    indicators: List[ThreatIndicator]
    recommendations: List[str]
    status: str = "open"  # open, investigating, resolved
    assigned_to: Optional[str] = None


class SecurityMonitor:
    """Comprehensive security monitoring system"""
    
    def __init__(self, redis_url: str = None):
        self.redis_url = redis_url
        self.redis = None
        self.is_running = False
        
        # Monitoring data
        self.metrics: Dict[str, deque] = defaultdict(lambda: deque(maxlen=1000))
        self.threat_indicators: Dict[str, ThreatIndicator] = {}
        self.active_alerts: Dict[str, SecurityAlert] = {}
        self.alert_history: List[SecurityAlert] = []
        
        # Monitoring configuration
        self.monitoring_intervals = {
            "failed_logins": 60,  # Check every minute
            "api_errors": 60,
            "suspicious_ips": 300,  # Check every 5 minutes
            "user_activity": 300,
            "system_health": 600   # Check every 10 minutes
        }
        
        # Thresholds for different metrics
        self.thresholds = {
            "failed_logins_per_minute": 10,
            "api_errors_per_minute": 20,
            "unique_failed_ips_per_hour": 50,
            "admin_actions_per_hour": 100,
            "data_access_anomaly_score": 80,
            "session_anomaly_score": 75
        }
        
        # Pattern detection
        self.attack_patterns = {
            "brute_force": {
                "description": "Brute force login attempts",
                "conditions": [
                    {"metric": "failed_logins_per_minute", "operator": ">", "value": 5},
                    {"metric": "unique_failed_ips_per_hour", "operator": ">", "value": 10}
                ]
            },
            "credential_stuffing": {
                "description": "Credential stuffing attack",
                "conditions": [
                    {"metric": "failed_logins_per_minute", "operator": ">", "value": 20},
                    {"metric": "success_rate", "operator": "<", "value": 0.1}
                ]
            },
            "privilege_escalation": {
                "description": "Privilege escalation attempt",
                "conditions": [
                    {"metric": "admin_actions_per_hour", "operator": ">", "value": 50},
                    {"metric": "unauthorized_access_attempts", "operator": ">", "value": 5}
                ]
            },
            "data_exfiltration": {
                "description": "Potential data exfiltration",
                "conditions": [
                    {"metric": "data_download_volume_mb", "operator": ">", "value": 1000},
                    {"metric": "api_calls_per_minute", "operator": ">", "value": 100}
                ]
            }
        }
        
        # Background tasks
        self.monitoring_tasks: List[asyncio.Task] = []
    
    async def initialize(self):
        """Initialize monitoring system"""
        if self.redis_url:
            try:
                self.redis = await aioredis.from_url(self.redis_url)
                logger.info("Security monitor connected to Redis")
            except Exception as e:
                logger.warning("Failed to connect to Redis for monitoring", error=str(e))
        
        logger.info("Security monitor initialized")
    
    async def start(self):
        """Start security monitoring"""
        if self.is_running:
            return
        
        await self.initialize()
        self.is_running = True
        
        # Start monitoring tasks
        for monitor_type, interval in self.monitoring_intervals.items():
            task = asyncio.create_task(self._run_monitor(monitor_type, interval))
            self.monitoring_tasks.append(task)
        
        logger.info("Security monitoring started")
    
    async def stop(self):
        """Stop security monitoring"""
        self.is_running = False
        
        # Cancel monitoring tasks
        for task in self.monitoring_tasks:
            task.cancel()
        
        # Wait for tasks to complete
        if self.monitoring_tasks:
            await asyncio.gather(*self.monitoring_tasks, return_exceptions=True)
        
        if self.redis:
            await self.redis.close()
        
        logger.info("Security monitoring stopped")
    
    async def _run_monitor(self, monitor_type: str, interval: int):
        """Run specific monitoring task"""
        while self.is_running:
            try:
                await self._execute_monitor(monitor_type)
                await asyncio.sleep(interval)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Monitor {monitor_type} failed", error=str(e))
                await asyncio.sleep(interval)
    
    async def _execute_monitor(self, monitor_type: str):
        """Execute specific monitoring check"""
        now = datetime.utcnow()
        
        if monitor_type == "failed_logins":
            await self._monitor_failed_logins(now)
        elif monitor_type == "api_errors":
            await self._monitor_api_errors(now)
        elif monitor_type == "suspicious_ips":
            await self._monitor_suspicious_ips(now)
        elif monitor_type == "user_activity":
            await self._monitor_user_activity(now)
        elif monitor_type == "system_health":
            await self._monitor_system_health(now)
    
    async def _monitor_failed_logins(self, timestamp: datetime):
        """Monitor failed login attempts"""
        # Get recent failed login events
        since = timestamp - timedelta(minutes=1)
        events = audit_logger.recent_events
        
        failed_logins = [
            e for e in events 
            if e.timestamp >= since and "login_failed" in e.event_type
        ]
        
        failed_count = len(failed_logins)
        unique_ips = len(set(e.client_ip for e in failed_logins if e.client_ip))
        
        # Record metrics
        await self._record_metric("failed_logins_per_minute", failed_count, timestamp)
        await self._record_metric("unique_failed_ips_per_minute", unique_ips, timestamp)
        
        # Check thresholds
        if failed_count > self.thresholds["failed_logins_per_minute"]:
            await self._create_alert(
                "high_failed_logins",
                "High Failed Login Rate",
                f"Detected {failed_count} failed logins in the last minute",
                "critical" if failed_count > 20 else "warning",
                ["authentication", "brute_force"],
                {"failed_count": failed_count, "unique_ips": unique_ips}
            )
        
        # Update threat indicators for suspicious IPs
        for event in failed_logins:
            if event.client_ip:
                await self._update_threat_indicator(
                    "ip", 
                    event.client_ip, 
                    10,  # Threat score increment
                    f"Failed login attempt from {event.client_ip}"
                )
    
    async def _monitor_api_errors(self, timestamp: datetime):
        """Monitor API errors and anomalies"""
        since = timestamp - timedelta(minutes=1)
        events = audit_logger.recent_events
        
        api_events = [
            e for e in events 
            if e.timestamp >= since and e.event_type == "http_request"
        ]
        
        error_events = [e for e in api_events if not e.success]
        error_count = len(error_events)
        total_requests = len(api_events)
        error_rate = error_count / total_requests if total_requests > 0 else 0
        
        # Record metrics
        await self._record_metric("api_errors_per_minute", error_count, timestamp)
        await self._record_metric("api_error_rate", error_rate, timestamp)
        
        # Check thresholds
        if error_count > self.thresholds["api_errors_per_minute"]:
            await self._create_alert(
                "high_api_errors",
                "High API Error Rate",
                f"Detected {error_count} API errors in the last minute ({error_rate:.2%} error rate)",
                "warning",
                ["api", "system_health"],
                {"error_count": error_count, "error_rate": error_rate, "total_requests": total_requests}
            )
    
    async def _monitor_suspicious_ips(self, timestamp: datetime):
        """Monitor for suspicious IP behavior"""
        since = timestamp - timedelta(hours=1)
        events = audit_logger.recent_events
        
        recent_events = [e for e in events if e.timestamp >= since and e.client_ip]
        
        # Analyze IP behavior
        ip_stats = defaultdict(lambda: {
            "total_requests": 0,
            "failed_requests": 0,
            "endpoints": set(),
            "user_agents": set(),
            "threat_score": 0
        })
        
        for event in recent_events:
            ip = event.client_ip
            ip_stats[ip]["total_requests"] += 1
            
            if not event.success:
                ip_stats[ip]["failed_requests"] += 1
            
            if hasattr(event, 'endpoint') and event.endpoint:
                ip_stats[ip]["endpoints"].add(event.endpoint)
            
            if hasattr(event, 'user_agent') and event.user_agent:
                ip_stats[ip]["user_agents"].add(event.user_agent)
        
        # Calculate threat scores
        for ip, stats in ip_stats.items():
            threat_score = 0
            
            # High request volume
            if stats["total_requests"] > 1000:
                threat_score += 30
            
            # High failure rate
            failure_rate = stats["failed_requests"] / stats["total_requests"]
            if failure_rate > 0.5:
                threat_score += 40
            
            # Multiple endpoints (reconnaissance)
            if len(stats["endpoints"]) > 20:
                threat_score += 20
            
            # Multiple user agents (evasion)
            if len(stats["user_agents"]) > 5:
                threat_score += 15
            
            stats["threat_score"] = threat_score
            
            # Update threat indicator
            if threat_score > 50:
                await self._update_threat_indicator(
                    "ip",
                    ip,
                    threat_score,
                    f"Suspicious activity: {stats['total_requests']} requests, {failure_rate:.2%} failure rate"
                )
    
    async def _monitor_user_activity(self, timestamp: datetime):
        """Monitor user activity patterns"""
        since = timestamp - timedelta(hours=1)
        events = audit_logger.recent_events
        
        user_events = [
            e for e in events 
            if e.timestamp >= since and hasattr(e, 'user_id') and e.user_id
        ]
        
        # Analyze user behavior
        user_stats = defaultdict(lambda: {
            "total_actions": 0,
            "admin_actions": 0,
            "failed_actions": 0,
            "unique_ips": set(),
            "endpoints": set()
        })
        
        for event in user_events:
            user_id = event.user_id
            user_stats[user_id]["total_actions"] += 1
            
            if not event.success:
                user_stats[user_id]["failed_actions"] += 1
            
            if hasattr(event, 'category') and "admin" in str(event.category).lower():
                user_stats[user_id]["admin_actions"] += 1
            
            if hasattr(event, 'client_ip') and event.client_ip:
                user_stats[user_id]["unique_ips"].add(event.client_ip)
            
            if hasattr(event, 'endpoint') and event.endpoint:
                user_stats[user_id]["endpoints"].add(event.endpoint)
        
        # Check for anomalies
        for user_id, stats in user_stats.items():
            anomaly_score = 0
            
            # High admin actions
            if stats["admin_actions"] > 50:
                anomaly_score += 40
            
            # Multiple IPs (account sharing or compromise)
            if len(stats["unique_ips"]) > 3:
                anomaly_score += 30
            
            # High failure rate
            failure_rate = stats["failed_actions"] / stats["total_actions"]
            if failure_rate > 0.3:
                anomaly_score += 25
            
            if anomaly_score > self.thresholds["session_anomaly_score"]:
                await self._create_alert(
                    "suspicious_user_activity",
                    "Suspicious User Activity",
                    f"User {user_id} shows anomalous behavior (score: {anomaly_score})",
                    "warning",
                    ["user_behavior", "account_compromise"],
                    {"user_id": user_id, "anomaly_score": anomaly_score, "stats": stats}
                )
    
    async def _monitor_system_health(self, timestamp: datetime):
        """Monitor overall system health"""
        # Get system metrics
        security_summary = security_manager.get_security_summary()
        
        # Record metrics
        await self._record_metric("active_users", security_summary.get("active_users", 0), timestamp)
        await self._record_metric("blocked_ips", security_summary.get("blocked_ips", 0), timestamp)
        await self._record_metric("events_last_24h", security_summary.get("events_last_24h", 0), timestamp)
        
        # Check for system health issues
        if security_summary.get("critical_events_last_24h", 0) > 10:
            await self._create_alert(
                "high_critical_events",
                "High Critical Events",
                f"System recorded {security_summary['critical_events_last_24h']} critical events in 24h",
                "critical",
                ["system_health"],
                security_summary
            )
    
    async def _record_metric(self, metric_name: str, value: float, timestamp: datetime):
        """Record a security metric"""
        metric = SecurityMetric(
            name=metric_name,
            value=value,
            threshold=self.thresholds.get(metric_name, float('inf')),
            timestamp=timestamp,
            severity="info"
        )
        
        self.metrics[metric_name].append(metric)
        
        # Store in Redis if available
        if self.redis:
            try:
                await self.redis.zadd(
                    f"metrics:{metric_name}",
                    {json.dumps({"value": value, "timestamp": timestamp.isoformat()}): timestamp.timestamp()}
                )
                # Keep only last 24 hours
                cutoff = timestamp.timestamp() - 86400
                await self.redis.zremrangebyscore(f"metrics:{metric_name}", 0, cutoff)
            except Exception as e:
                logger.warning("Failed to store metric in Redis", metric=metric_name, error=str(e))
    
    async def _update_threat_indicator(self, indicator_type: str, value: str, score_increment: float, evidence: str):
        """Update threat indicator"""
        key = f"{indicator_type}:{value}"
        now = datetime.utcnow()
        
        if key in self.threat_indicators:
            indicator = self.threat_indicators[key]
            indicator.threat_score = min(100, indicator.threat_score + score_increment)
            indicator.last_seen = now
            indicator.occurrences += 1
            indicator.evidence.append(evidence)
        else:
            indicator = ThreatIndicator(
                indicator_type=indicator_type,
                value=value,
                threat_score=score_increment,
                first_seen=now,
                last_seen=now,
                occurrences=1,
                evidence=[evidence]
            )
            self.threat_indicators[key] = indicator
        
        # Store in Redis if available
        if self.redis:
            try:
                await self.redis.hset(
                    "threat_indicators",
                    key,
                    json.dumps({
                        "indicator_type": indicator.indicator_type,
                        "value": indicator.value,
                        "threat_score": indicator.threat_score,
                        "first_seen": indicator.first_seen.isoformat(),
                        "last_seen": indicator.last_seen.isoformat(),
                        "occurrences": indicator.occurrences,
                        "evidence": indicator.evidence[-10:]  # Keep last 10 pieces of evidence
                    })
                )
            except Exception as e:
                logger.warning("Failed to store threat indicator in Redis", indicator=key, error=str(e))
    
    async def _create_alert(self, alert_type: str, title: str, description: str, 
                          severity: str, tags: List[str], context: Dict[str, Any]):
        """Create security alert"""
        alert_id = f"{alert_type}-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
        
        alert = SecurityAlert(
            alert_id=alert_id,
            alert_type=alert_type,
            severity=severity,
            title=title,
            description=description,
            timestamp=datetime.utcnow(),
            source="security_monitor",
            affected_resources=[],
            indicators=[],
            recommendations=self._get_recommendations(alert_type)
        )
        
        self.active_alerts[alert_id] = alert
        self.alert_history.append(alert)
        
        # Log alert
        logger.bind(
            alert_id=alert_id,
            alert_type=alert_type,
            severity=severity,
            context=context
        ).warning("Security alert created", title=title)
        
        # Store in Redis if available
        if self.redis:
            try:
                await self.redis.hset(
                    "security_alerts",
                    alert_id,
                    json.dumps({
                        "alert_type": alert.alert_type,
                        "severity": alert.severity,
                        "title": alert.title,
                        "description": alert.description,
                        "timestamp": alert.timestamp.isoformat(),
                        "status": alert.status,
                        "context": context
                    })
                )
            except Exception as e:
                logger.warning("Failed to store alert in Redis", alert_id=alert_id, error=str(e))
    
    def _get_recommendations(self, alert_type: str) -> List[str]:
        """Get recommendations for alert type"""
        recommendations = {
            "high_failed_logins": [
                "Review and potentially block suspicious IP addresses",
                "Check for compromised user accounts",
                "Consider implementing additional authentication factors",
                "Review rate limiting configuration"
            ],
            "high_api_errors": [
                "Check system resources and performance",
                "Review application logs for errors",
                "Verify database connectivity",
                "Check for malformed client requests"
            ],
            "suspicious_user_activity": [
                "Review user account for compromise",
                "Check for unauthorized access",
                "Consider temporary account suspension",
                "Audit recent user actions"
            ]
        }
        
        return recommendations.get(alert_type, ["Review and investigate the alert"])
    
    def get_metrics_summary(self) -> Dict[str, Any]:
        """Get metrics summary"""
        summary = {}
        
        for metric_name, metric_deque in self.metrics.items():
            if not metric_deque:
                continue
            
            values = [m.value for m in metric_deque]
            summary[metric_name] = {
                "current": values[-1] if values else 0,
                "average": mean(values) if values else 0,
                "max": max(values) if values else 0,
                "min": min(values) if values else 0,
                "count": len(values)
            }
        
        return summary
    
    def get_threat_indicators(self, min_score: float = 50) -> List[Dict[str, Any]]:
        """Get threat indicators above minimum score"""
        indicators = []
        
        for indicator in self.threat_indicators.values():
            if indicator.threat_score >= min_score:
                indicators.append({
                    "type": indicator.indicator_type,
                    "value": indicator.value,
                    "threat_score": indicator.threat_score,
                    "first_seen": indicator.first_seen.isoformat(),
                    "last_seen": indicator.last_seen.isoformat(),
                    "occurrences": indicator.occurrences,
                    "evidence": indicator.evidence[-5:]  # Last 5 pieces of evidence
                })
        
        return sorted(indicators, key=lambda x: x["threat_score"], reverse=True)
    
    def get_active_alerts(self) -> List[Dict[str, Any]]:
        """Get active security alerts"""
        alerts = []
        
        for alert in self.active_alerts.values():
            if alert.status == "open":
                alerts.append({
                    "alert_id": alert.alert_id,
                    "alert_type": alert.alert_type,
                    "severity": alert.severity,
                    "title": alert.title,
                    "description": alert.description,
                    "timestamp": alert.timestamp.isoformat(),
                    "recommendations": alert.recommendations
                })
        
        return sorted(alerts, key=lambda x: x["timestamp"], reverse=True)


# Global security monitor instance
security_monitor = SecurityMonitor()


# Monitoring API endpoints
@monitoring_router.get("/dashboard")
async def get_monitoring_dashboard(admin_user: User = Depends(require_admin)):
    """Get security monitoring dashboard data"""
    return {
        "metrics": security_monitor.get_metrics_summary(),
        "threat_indicators": security_monitor.get_threat_indicators(),
        "active_alerts": security_monitor.get_active_alerts(),
        "system_status": {
            "monitoring_active": security_monitor.is_running,
            "monitors_count": len(security_monitor.monitoring_tasks),
            "redis_available": security_monitor.redis is not None
        },
        "timestamp": datetime.utcnow().isoformat()
    }


@monitoring_router.get("/metrics")
async def get_security_metrics(
    metric_name: Optional[str] = None,
    hours: int = 24,
    admin_user: User = Depends(require_admin)
):
    """Get security metrics"""
    if metric_name and metric_name in security_monitor.metrics:
        # Get specific metric
        since = datetime.utcnow() - timedelta(hours=hours)
        metrics = [
            {
                "value": m.value,
                "timestamp": m.timestamp.isoformat(),
                "threshold": m.threshold
            }
            for m in security_monitor.metrics[metric_name]
            if m.timestamp >= since
        ]
        return {"metric": metric_name, "data": metrics}
    else:
        # Get all metrics summary
        return {"metrics": security_monitor.get_metrics_summary()}


@monitoring_router.get("/alerts")
async def get_security_alerts(
    status: str = "open",
    severity: Optional[str] = None,
    limit: int = 100,
    admin_user: User = Depends(require_admin)
):
    """Get security alerts"""
    if status == "active":
        alerts = security_monitor.get_active_alerts()
    else:
        # Get from history
        alerts = []
        for alert in security_monitor.alert_history[-limit:]:
            if status == "all" or alert.status == status:
                if severity is None or alert.severity == severity:
                    alerts.append({
                        "alert_id": alert.alert_id,
                        "alert_type": alert.alert_type,
                        "severity": alert.severity,
                        "title": alert.title,
                        "description": alert.description,
                        "timestamp": alert.timestamp.isoformat(),
                        "status": alert.status,
                        "recommendations": alert.recommendations
                    })
    
    return {"alerts": alerts, "count": len(alerts)}


@monitoring_router.post("/alerts/{alert_id}/acknowledge")
async def acknowledge_alert(
    alert_id: str,
    admin_user: User = Depends(require_admin)
):
    """Acknowledge security alert"""
    if alert_id not in security_monitor.active_alerts:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alert not found"
        )
    
    alert = security_monitor.active_alerts[alert_id]
    alert.status = "investigating"
    alert.assigned_to = admin_user.username
    
    return {"success": True, "message": f"Alert {alert_id} acknowledged"}


@monitoring_router.post("/alerts/{alert_id}/resolve")
async def resolve_alert(
    alert_id: str,
    admin_user: User = Depends(require_admin)
):
    """Resolve security alert"""
    if alert_id not in security_monitor.active_alerts:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alert not found"
        )
    
    alert = security_monitor.active_alerts.pop(alert_id)
    alert.status = "resolved"
    
    return {"success": True, "message": f"Alert {alert_id} resolved"}


@monitoring_router.get("/threats")
async def get_threat_indicators(
    min_score: float = 50,
    indicator_type: Optional[str] = None,
    admin_user: User = Depends(require_admin)
):
    """Get threat indicators"""
    indicators = security_monitor.get_threat_indicators(min_score)
    
    if indicator_type:
        indicators = [i for i in indicators if i["type"] == indicator_type]
    
    return {"threat_indicators": indicators, "count": len(indicators)}


@monitoring_router.get("/health")
async def get_monitoring_health(scientist_user: User = Depends(require_scientist)):
    """Get monitoring system health"""
    return {
        "status": "healthy" if security_monitor.is_running else "stopped",
        "monitors_active": len([t for t in security_monitor.monitoring_tasks if not t.done()]),
        "total_monitors": len(security_monitor.monitoring_tasks),
        "redis_connected": security_monitor.redis is not None,
        "active_alerts": len(security_monitor.active_alerts),
        "threat_indicators": len(security_monitor.threat_indicators),
        "uptime": "N/A",  # Would track actual uptime
        "timestamp": datetime.utcnow().isoformat()
    }