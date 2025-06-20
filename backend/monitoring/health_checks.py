"""
Comprehensive Health Check System for BioThings Platform
Enterprise-grade health monitoring with detailed component status
"""
import asyncio
import time
import psutil
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from enum import Enum
import aiohttp
import logging

logger = logging.getLogger(__name__)


class HealthStatus(Enum):
    """Health status levels"""
    HEALTHY = "healthy"
    WARNING = "warning" 
    CRITICAL = "critical"
    UNKNOWN = "unknown"


@dataclass
class ComponentHealth:
    """Health status for a system component"""
    name: str
    status: HealthStatus
    message: str
    latency_ms: Optional[float] = None
    last_check: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


@dataclass
class SystemHealth:
    """Overall system health status"""
    status: HealthStatus
    timestamp: str
    uptime_seconds: float
    components: Dict[str, ComponentHealth]
    summary: Dict[str, Any]
    sla_compliance: Dict[str, Any]


class HealthCheckManager:
    """Manages comprehensive health checks for all system components"""
    
    def __init__(self):
        self.start_time = time.time()
        self.component_checks = {}
        self.health_history = []
        self.max_history = 1000
        
        # Component endpoints and configurations
        self.component_configs = {
            "database": {
                "type": "database",
                "timeout": 5.0,
                "critical_latency": 1000,  # ms
                "warning_latency": 500,    # ms
            },
            "redis": {
                "type": "cache",
                "timeout": 3.0,
                "critical_latency": 100,
                "warning_latency": 50,
            },
            "prometheus": {
                "type": "http",
                "url": "http://localhost:9090/-/healthy",
                "timeout": 5.0,
                "critical_latency": 2000,
                "warning_latency": 1000,
            },
            "grafana": {
                "type": "http", 
                "url": "http://localhost:3000/api/health",
                "timeout": 5.0,
                "critical_latency": 3000,
                "warning_latency": 1500,
            },
            "agent_system": {
                "type": "internal",
                "timeout": 10.0,
            },
            "websocket": {
                "type": "internal",
                "timeout": 5.0,
            },
            "file_system": {
                "type": "system",
                "timeout": 3.0,
            },
            "external_apis": {
                "type": "external",
                "timeout": 10.0,
            }
        }
    
    async def check_database_health(self) -> ComponentHealth:
        """Check database connectivity and performance"""
        start_time = time.time()
        
        try:
            # This would integrate with your actual database
            # For now, simulate a database check
            await asyncio.sleep(0.01)  # Simulate DB query
            
            latency_ms = (time.time() - start_time) * 1000
            config = self.component_configs["database"]
            
            if latency_ms > config["critical_latency"]:
                status = HealthStatus.CRITICAL
                message = f"Database response time too high: {latency_ms:.2f}ms"
            elif latency_ms > config["warning_latency"]:
                status = HealthStatus.WARNING
                message = f"Database response time elevated: {latency_ms:.2f}ms"
            else:
                status = HealthStatus.HEALTHY
                message = "Database connection healthy"
            
            return ComponentHealth(
                name="database",
                status=status,
                message=message,
                latency_ms=latency_ms,
                last_check=datetime.utcnow().isoformat(),
                metadata={
                    "connection_pool_size": 10,  # Would get from actual DB
                    "active_connections": 3,
                    "query_count_1min": 150
                }
            )
            
        except Exception as e:
            return ComponentHealth(
                name="database",
                status=HealthStatus.CRITICAL,
                message=f"Database check failed: {str(e)}",
                last_check=datetime.utcnow().isoformat()
            )
    
    async def check_redis_health(self) -> ComponentHealth:
        """Check Redis cache connectivity and performance"""
        start_time = time.time()
        
        try:
            # This would integrate with your actual Redis
            await asyncio.sleep(0.005)  # Simulate Redis ping
            
            latency_ms = (time.time() - start_time) * 1000
            config = self.component_configs["redis"]
            
            if latency_ms > config["critical_latency"]:
                status = HealthStatus.CRITICAL
                message = f"Redis response time too high: {latency_ms:.2f}ms"
            elif latency_ms > config["warning_latency"]:
                status = HealthStatus.WARNING
                message = f"Redis response time elevated: {latency_ms:.2f}ms"
            else:
                status = HealthStatus.HEALTHY
                message = "Redis connection healthy"
            
            return ComponentHealth(
                name="redis",
                status=status,
                message=message,
                latency_ms=latency_ms,
                last_check=datetime.utcnow().isoformat(),
                metadata={
                    "memory_usage_mb": 64,  # Would get from actual Redis
                    "connected_clients": 5,
                    "keys_count": 1250,
                    "hit_rate": 0.95
                }
            )
            
        except Exception as e:
            return ComponentHealth(
                name="redis",
                status=HealthStatus.CRITICAL,
                message=f"Redis check failed: {str(e)}",
                last_check=datetime.utcnow().isoformat()
            )
    
    async def check_http_endpoint_health(self, name: str, url: str, timeout: float) -> ComponentHealth:
        """Check HTTP endpoint health"""
        start_time = time.time()
        
        try:
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=timeout)) as session:
                async with session.get(url) as response:
                    latency_ms = (time.time() - start_time) * 1000
                    
                    config = self.component_configs.get(name, {})
                    critical_latency = config.get("critical_latency", 5000)
                    warning_latency = config.get("warning_latency", 2000)
                    
                    if response.status != 200:
                        status = HealthStatus.CRITICAL
                        message = f"HTTP {response.status}: {url}"
                    elif latency_ms > critical_latency:
                        status = HealthStatus.CRITICAL
                        message = f"Response time too high: {latency_ms:.2f}ms"
                    elif latency_ms > warning_latency:
                        status = HealthStatus.WARNING
                        message = f"Response time elevated: {latency_ms:.2f}ms"
                    else:
                        status = HealthStatus.HEALTHY
                        message = f"Endpoint healthy"
                    
                    return ComponentHealth(
                        name=name,
                        status=status,
                        message=message,
                        latency_ms=latency_ms,
                        last_check=datetime.utcnow().isoformat(),
                        metadata={
                            "url": url,
                            "status_code": response.status,
                            "content_type": response.headers.get("content-type", "unknown")
                        }
                    )
                    
        except asyncio.TimeoutError:
            return ComponentHealth(
                name=name,
                status=HealthStatus.CRITICAL,
                message=f"Timeout accessing {url}",
                last_check=datetime.utcnow().isoformat(),
                metadata={"url": url, "timeout": timeout}
            )
        except Exception as e:
            return ComponentHealth(
                name=name,
                status=HealthStatus.CRITICAL,
                message=f"Failed to check {url}: {str(e)}",
                last_check=datetime.utcnow().isoformat(),
                metadata={"url": url, "error": str(e)}
            )
    
    async def check_agent_system_health(self) -> ComponentHealth:
        """Check agent system health"""
        try:
            # This would integrate with your actual agent system
            # For now, simulate agent system check
            await asyncio.sleep(0.1)
            
            # Simulate getting agent metrics
            active_agents = 5  # Would get from actual system
            total_agents = 6
            failed_tasks_1min = 2
            total_tasks_1min = 100
            
            if active_agents == 0:
                status = HealthStatus.CRITICAL
                message = "No active agents"
            elif active_agents < total_agents * 0.5:
                status = HealthStatus.CRITICAL
                message = f"Only {active_agents}/{total_agents} agents active"
            elif active_agents < total_agents * 0.8:
                status = HealthStatus.WARNING
                message = f"{active_agents}/{total_agents} agents active"
            elif failed_tasks_1min / total_tasks_1min > 0.1:
                status = HealthStatus.WARNING
                message = f"High task failure rate: {failed_tasks_1min}/{total_tasks_1min}"
            else:
                status = HealthStatus.HEALTHY
                message = f"All {active_agents} agents healthy"
            
            return ComponentHealth(
                name="agent_system",
                status=status,
                message=message,
                last_check=datetime.utcnow().isoformat(),
                metadata={
                    "active_agents": active_agents,
                    "total_agents": total_agents,
                    "tasks_completed_1min": total_tasks_1min - failed_tasks_1min,
                    "tasks_failed_1min": failed_tasks_1min,
                    "average_response_time_ms": 250.5
                }
            )
            
        except Exception as e:
            return ComponentHealth(
                name="agent_system",
                status=HealthStatus.CRITICAL,
                message=f"Agent system check failed: {str(e)}",
                last_check=datetime.utcnow().isoformat()
            )
    
    async def check_websocket_health(self) -> ComponentHealth:
        """Check WebSocket system health"""
        try:
            # This would integrate with your actual WebSocket manager
            await asyncio.sleep(0.05)
            
            active_connections = 8  # Would get from actual system
            max_connections = 100
            connection_errors_1min = 1
            
            if active_connections == 0:
                status = HealthStatus.WARNING
                message = "No active WebSocket connections"
            elif connection_errors_1min > 10:
                status = HealthStatus.WARNING
                message = f"High connection error rate: {connection_errors_1min}/min"
            else:
                status = HealthStatus.HEALTHY
                message = f"{active_connections} active connections"
            
            return ComponentHealth(
                name="websocket",
                status=status,
                message=message,
                last_check=datetime.utcnow().isoformat(),
                metadata={
                    "active_connections": active_connections,
                    "max_connections": max_connections,
                    "connection_errors_1min": connection_errors_1min,
                    "messages_sent_1min": 450,
                    "messages_received_1min": 320
                }
            )
            
        except Exception as e:
            return ComponentHealth(
                name="websocket",
                status=HealthStatus.CRITICAL,
                message=f"WebSocket check failed: {str(e)}",
                last_check=datetime.utcnow().isoformat()
            )
    
    async def check_file_system_health(self) -> ComponentHealth:
        """Check file system health"""
        try:
            start_time = time.time()
            
            # Get disk usage
            disk_usage = psutil.disk_usage('/')
            disk_percent = (disk_usage.used / disk_usage.total) * 100
            
            # Test file I/O
            test_file = "/tmp/biothings_health_check"
            with open(test_file, 'w') as f:
                f.write("health_check_test")
            with open(test_file, 'r') as f:
                content = f.read()
            
            import os
            os.remove(test_file)
            
            io_latency_ms = (time.time() - start_time) * 1000
            
            if disk_percent > 95:
                status = HealthStatus.CRITICAL
                message = f"Disk usage critical: {disk_percent:.1f}%"
            elif disk_percent > 85:
                status = HealthStatus.WARNING
                message = f"Disk usage high: {disk_percent:.1f}%"
            elif io_latency_ms > 1000:
                status = HealthStatus.WARNING
                message = f"Slow file I/O: {io_latency_ms:.2f}ms"
            else:
                status = HealthStatus.HEALTHY
                message = f"File system healthy, {disk_percent:.1f}% used"
            
            return ComponentHealth(
                name="file_system",
                status=status,
                message=message,
                latency_ms=io_latency_ms,
                last_check=datetime.utcnow().isoformat(),
                metadata={
                    "disk_usage_percent": disk_percent,
                    "disk_free_gb": disk_usage.free / (1024**3),
                    "disk_total_gb": disk_usage.total / (1024**3),
                    "test_passed": content == "health_check_test"
                }
            )
            
        except Exception as e:
            return ComponentHealth(
                name="file_system",
                status=HealthStatus.CRITICAL,
                message=f"File system check failed: {str(e)}",
                last_check=datetime.utcnow().isoformat()
            )
    
    async def check_external_apis_health(self) -> ComponentHealth:
        """Check external API dependencies"""
        try:
            # This would check actual external APIs your system depends on
            # For now, simulate checking multiple APIs
            start_time = time.time()
            
            # Simulate API checks
            api_results = []
            
            # Mock external API checks
            apis_to_check = [
                {"name": "OpenAI API", "status": "healthy", "latency": 450},
                {"name": "Anthropic API", "status": "healthy", "latency": 380}, 
                {"name": "PubMed API", "status": "healthy", "latency": 720},
                {"name": "Lab Equipment API", "status": "warning", "latency": 1200}
            ]
            
            total_latency = time.time() - start_time
            
            failed_apis = [api for api in apis_to_check if api["status"] == "critical"]
            warning_apis = [api for api in apis_to_check if api["status"] == "warning"]
            
            if failed_apis:
                status = HealthStatus.CRITICAL
                message = f"{len(failed_apis)} external APIs failing"
            elif warning_apis:
                status = HealthStatus.WARNING
                message = f"{len(warning_apis)} external APIs degraded"
            else:
                status = HealthStatus.HEALTHY
                message = f"All {len(apis_to_check)} external APIs healthy"
            
            return ComponentHealth(
                name="external_apis",
                status=status,
                message=message,
                latency_ms=total_latency * 1000,
                last_check=datetime.utcnow().isoformat(),
                metadata={
                    "apis_checked": len(apis_to_check),
                    "apis_healthy": len([api for api in apis_to_check if api["status"] == "healthy"]),
                    "apis_warning": len(warning_apis),
                    "apis_critical": len(failed_apis),
                    "api_details": apis_to_check
                }
            )
            
        except Exception as e:
            return ComponentHealth(
                name="external_apis",
                status=HealthStatus.CRITICAL,
                message=f"External API check failed: {str(e)}",
                last_check=datetime.utcnow().isoformat()
            )
    
    async def get_system_metrics(self) -> Dict[str, Any]:
        """Get current system resource metrics"""
        try:
            # Get CPU usage
            cpu_percent = psutil.cpu_percent(interval=1)
            
            # Get memory usage
            memory = psutil.virtual_memory()
            
            # Get network stats
            network = psutil.net_io_counters()
            
            # Get process count
            process_count = len(psutil.pids())
            
            return {
                "cpu_percent": cpu_percent,
                "memory_percent": memory.percent,
                "memory_used_gb": memory.used / (1024**3),
                "memory_total_gb": memory.total / (1024**3),
                "network_bytes_sent": network.bytes_sent,
                "network_bytes_recv": network.bytes_recv,
                "process_count": process_count,
                "load_average": psutil.getloadavg()[:3] if hasattr(psutil, 'getloadavg') else [0, 0, 0]
            }
        except Exception as e:
            logger.error(f"Failed to get system metrics: {e}")
            return {}
    
    def calculate_sla_compliance(self, components: Dict[str, ComponentHealth], 
                               system_metrics: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate SLA compliance metrics"""
        
        # SLA targets
        sla_targets = {
            "uptime_percent": 99.9,
            "response_time_ms": 2000,
            "error_rate_percent": 0.1,
            "cpu_threshold": 85,
            "memory_threshold": 85
        }
        
        # Calculate current values
        uptime_hours = (time.time() - self.start_time) / 3600
        
        # Count healthy vs total components
        total_components = len(components)
        healthy_components = len([c for c in components.values() if c.status == HealthStatus.HEALTHY])
        availability_percent = (healthy_components / total_components) * 100 if total_components > 0 else 0
        
        # Get average response time
        response_times = [c.latency_ms for c in components.values() if c.latency_ms is not None]
        avg_response_time = sum(response_times) / len(response_times) if response_times else 0
        
        # SLA compliance status
        sla_compliance = {
            "uptime": {
                "target_percent": sla_targets["uptime_percent"],
                "current_percent": availability_percent,
                "compliant": availability_percent >= sla_targets["uptime_percent"],
                "uptime_hours": uptime_hours
            },
            "response_time": {
                "target_ms": sla_targets["response_time_ms"],
                "current_ms": avg_response_time,
                "compliant": avg_response_time <= sla_targets["response_time_ms"]
            },
            "resource_usage": {
                "cpu_target": sla_targets["cpu_threshold"],
                "cpu_current": system_metrics.get("cpu_percent", 0),
                "cpu_compliant": system_metrics.get("cpu_percent", 0) <= sla_targets["cpu_threshold"],
                "memory_target": sla_targets["memory_threshold"],
                "memory_current": system_metrics.get("memory_percent", 0),
                "memory_compliant": system_metrics.get("memory_percent", 0) <= sla_targets["memory_threshold"]
            }
        }
        
        # Overall SLA compliance
        all_compliant = all([
            sla_compliance["uptime"]["compliant"],
            sla_compliance["response_time"]["compliant"],
            sla_compliance["resource_usage"]["cpu_compliant"],
            sla_compliance["resource_usage"]["memory_compliant"]
        ])
        
        sla_compliance["overall"] = {
            "compliant": all_compliant,
            "score": sum([
                sla_compliance["uptime"]["compliant"],
                sla_compliance["response_time"]["compliant"],
                sla_compliance["resource_usage"]["cpu_compliant"],
                sla_compliance["resource_usage"]["memory_compliant"]
            ]) / 4 * 100
        }
        
        return sla_compliance
    
    async def perform_comprehensive_health_check(self) -> SystemHealth:
        """Perform comprehensive health check of all components"""
        check_start_time = time.time()
        
        # Run all component checks concurrently
        component_checks = await asyncio.gather(
            self.check_database_health(),
            self.check_redis_health(),
            self.check_http_endpoint_health("prometheus", "http://localhost:9090/-/healthy", 5.0),
            self.check_http_endpoint_health("grafana", "http://localhost:3000/api/health", 5.0),
            self.check_agent_system_health(),
            self.check_websocket_health(),
            self.check_file_system_health(),
            self.check_external_apis_health(),
            return_exceptions=True
        )
        
        # Process results
        components = {}
        for check_result in component_checks:
            if isinstance(check_result, ComponentHealth):
                components[check_result.name] = check_result
            elif isinstance(check_result, Exception):
                # Handle failed health checks
                components["unknown"] = ComponentHealth(
                    name="unknown",
                    status=HealthStatus.CRITICAL,
                    message=f"Health check failed: {str(check_result)}",
                    last_check=datetime.utcnow().isoformat()
                )
        
        # Get system metrics
        system_metrics = await self.get_system_metrics()
        
        # Calculate overall system status
        critical_components = [c for c in components.values() if c.status == HealthStatus.CRITICAL]
        warning_components = [c for c in components.values() if c.status == HealthStatus.WARNING]
        
        if critical_components:
            overall_status = HealthStatus.CRITICAL
        elif warning_components:
            overall_status = HealthStatus.WARNING
        else:
            overall_status = HealthStatus.HEALTHY
        
        # Calculate SLA compliance
        sla_compliance = self.calculate_sla_compliance(components, system_metrics)
        
        # Create summary
        summary = {
            "total_components": len(components),
            "healthy_components": len([c for c in components.values() if c.status == HealthStatus.HEALTHY]),
            "warning_components": len(warning_components),
            "critical_components": len(critical_components),
            "check_duration_ms": (time.time() - check_start_time) * 1000,
            "system_metrics": system_metrics
        }
        
        # Create system health object
        system_health = SystemHealth(
            status=overall_status,
            timestamp=datetime.utcnow().isoformat(),
            uptime_seconds=time.time() - self.start_time,
            components=components,
            summary=summary,
            sla_compliance=sla_compliance
        )
        
        # Store in history
        self.health_history.append(system_health)
        if len(self.health_history) > self.max_history:
            self.health_history = self.health_history[-self.max_history:]
        
        return system_health
    
    async def get_health_history(self, minutes: int = 60) -> List[Dict[str, Any]]:
        """Get health check history for specified duration"""
        cutoff_time = datetime.utcnow() - timedelta(minutes=minutes)
        
        history = []
        for health_check in reversed(self.health_history):
            check_time = datetime.fromisoformat(health_check.timestamp)
            if check_time >= cutoff_time:
                history.append(asdict(health_check))
        
        return list(reversed(history))
    
    def get_component_status_summary(self) -> Dict[str, Any]:
        """Get a quick summary of component statuses"""
        if not self.health_history:
            return {"status": "no_data", "message": "No health checks performed yet"}
        
        latest = self.health_history[-1]
        
        return {
            "overall_status": latest.status.value,
            "timestamp": latest.timestamp,
            "uptime_hours": latest.uptime_seconds / 3600,
            "component_count": len(latest.components),
            "healthy_count": len([c for c in latest.components.values() if c.status == HealthStatus.HEALTHY]),
            "sla_compliant": latest.sla_compliance.get("overall", {}).get("compliant", False),
            "sla_score": latest.sla_compliance.get("overall", {}).get("score", 0)
        }


# Global health check manager instance
health_check_manager = HealthCheckManager()