"""
Performance Monitoring System for BioThings Platform
Implements decorators and middleware for comprehensive performance tracking
"""
import time
import asyncio
import functools
from typing import Dict, Any, Optional, Callable, List
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from contextlib import asynccontextmanager
import logging
from collections import defaultdict, deque

try:
    from starlette.middleware.base import BaseHTTPMiddleware
    from starlette.requests import Request
    from starlette.responses import Response
    STARLETTE_AVAILABLE = True
except ImportError:
    STARLETTE_AVAILABLE = False

from .prometheus_server import metrics_server

logger = logging.getLogger(__name__)


@dataclass
class PerformanceMetric:
    """Performance metric data point"""
    operation: str
    duration_ms: float
    timestamp: str
    status: str = "success"
    metadata: Optional[Dict[str, Any]] = None


@dataclass
class EndpointPerformance:
    """Performance statistics for an API endpoint"""
    endpoint: str
    method: str
    total_requests: int
    avg_response_time_ms: float
    p95_response_time_ms: float
    p99_response_time_ms: float
    error_rate: float
    requests_per_second: float
    last_updated: str


class PerformanceMonitor:
    """Central performance monitoring system"""
    
    def __init__(self):
        self.metrics_history = deque(maxlen=10000)
        self.endpoint_stats = {}
        self.agent_stats = {}
        self.operation_stats = defaultdict(lambda: {
            'count': 0,
            'total_time': 0,
            'min_time': float('inf'),
            'max_time': 0,
            'errors': 0,
            'recent_times': deque(maxlen=1000)
        })
        
        # Performance thresholds
        self.thresholds = {
            'api_response_time_warning': 1000,    # ms
            'api_response_time_critical': 3000,   # ms
            'agent_task_time_warning': 5000,     # ms
            'agent_task_time_critical': 15000,   # ms
            'database_query_warning': 500,       # ms
            'database_query_critical': 2000,     # ms
        }
    
    def record_metric(self, operation: str, duration_ms: float, 
                     status: str = "success", metadata: Optional[Dict[str, Any]] = None):
        """Record a performance metric"""
        metric = PerformanceMetric(
            operation=operation,
            duration_ms=duration_ms,
            timestamp=datetime.utcnow().isoformat(),
            status=status,
            metadata=metadata or {}
        )
        
        self.metrics_history.append(metric)
        
        # Update operation statistics
        stats = self.operation_stats[operation]
        stats['count'] += 1
        stats['total_time'] += duration_ms
        stats['recent_times'].append(duration_ms)
        
        if duration_ms < stats['min_time']:
            stats['min_time'] = duration_ms
        if duration_ms > stats['max_time']:
            stats['max_time'] = duration_ms
        
        if status != "success":
            stats['errors'] += 1
        
        # Check thresholds and log warnings
        self._check_performance_thresholds(operation, duration_ms)
    
    def _check_performance_thresholds(self, operation: str, duration_ms: float):
        """Check if performance thresholds are exceeded"""
        operation_type = self._get_operation_type(operation)
        
        if operation_type in self.thresholds:
            warning_threshold = self.thresholds.get(f"{operation_type}_warning", float('inf'))
            critical_threshold = self.thresholds.get(f"{operation_type}_critical", float('inf'))
            
            if duration_ms > critical_threshold:
                logger.critical(f"Critical performance threshold exceeded: {operation} took {duration_ms:.2f}ms")
                # Track critical performance event in Prometheus
                if hasattr(metrics_server, 'track_security_event'):
                    metrics_server.track_security_event("performance_critical", "critical")
            elif duration_ms > warning_threshold:
                logger.warning(f"Performance threshold exceeded: {operation} took {duration_ms:.2f}ms")
    
    def _get_operation_type(self, operation: str) -> str:
        """Determine operation type from operation name"""
        if 'api' in operation.lower() or 'http' in operation.lower():
            return 'api_response_time'
        elif 'agent' in operation.lower() or 'task' in operation.lower():
            return 'agent_task_time'
        elif 'database' in operation.lower() or 'db' in operation.lower():
            return 'database_query'
        else:
            return 'unknown'
    
    def get_operation_stats(self, operation: str) -> Dict[str, Any]:
        """Get statistics for a specific operation"""
        stats = self.operation_stats[operation]
        
        if stats['count'] == 0:
            return {
                'operation': operation,
                'count': 0,
                'avg_time_ms': 0,
                'min_time_ms': 0,
                'max_time_ms': 0,
                'error_rate': 0,
                'p95_time_ms': 0,
                'p99_time_ms': 0
            }
        
        recent_times = list(stats['recent_times'])
        recent_times.sort()
        
        avg_time = stats['total_time'] / stats['count']
        error_rate = stats['errors'] / stats['count']
        
        # Calculate percentiles
        p95_idx = int(len(recent_times) * 0.95)
        p99_idx = int(len(recent_times) * 0.99)
        
        p95_time = recent_times[p95_idx] if p95_idx < len(recent_times) else stats['max_time']
        p99_time = recent_times[p99_idx] if p99_idx < len(recent_times) else stats['max_time']
        
        return {
            'operation': operation,
            'count': stats['count'],
            'avg_time_ms': avg_time,
            'min_time_ms': stats['min_time'],
            'max_time_ms': stats['max_time'],
            'error_rate': error_rate,
            'p95_time_ms': p95_time,
            'p99_time_ms': p99_time,
            'last_updated': datetime.utcnow().isoformat()
        }
    
    def get_endpoint_performance(self, endpoint: str, method: str, 
                               timeframe_minutes: int = 60) -> EndpointPerformance:
        """Get performance statistics for a specific endpoint"""
        cutoff_time = datetime.utcnow() - timedelta(minutes=timeframe_minutes)
        
        # Filter metrics for this endpoint
        endpoint_metrics = [
            m for m in self.metrics_history
            if m.operation == f"{method}:{endpoint}" and
            datetime.fromisoformat(m.timestamp) >= cutoff_time
        ]
        
        if not endpoint_metrics:
            return EndpointPerformance(
                endpoint=endpoint,
                method=method,
                total_requests=0,
                avg_response_time_ms=0,
                p95_response_time_ms=0,
                p99_response_time_ms=0,
                error_rate=0,
                requests_per_second=0,
                last_updated=datetime.utcnow().isoformat()
            )
        
        # Calculate statistics
        response_times = [m.duration_ms for m in endpoint_metrics]
        response_times.sort()
        
        total_requests = len(endpoint_metrics)
        errors = len([m for m in endpoint_metrics if m.status != "success"])
        
        avg_response_time = sum(response_times) / len(response_times)
        p95_idx = int(len(response_times) * 0.95)
        p99_idx = int(len(response_times) * 0.99)
        
        p95_response_time = response_times[p95_idx] if p95_idx < len(response_times) else response_times[-1]
        p99_response_time = response_times[p99_idx] if p99_idx < len(response_times) else response_times[-1]
        
        error_rate = errors / total_requests
        requests_per_second = total_requests / (timeframe_minutes * 60)
        
        return EndpointPerformance(
            endpoint=endpoint,
            method=method,
            total_requests=total_requests,
            avg_response_time_ms=avg_response_time,
            p95_response_time_ms=p95_response_time,
            p99_response_time_ms=p99_response_time,
            error_rate=error_rate,
            requests_per_second=requests_per_second,
            last_updated=datetime.utcnow().isoformat()
        )
    
    def get_performance_summary(self) -> Dict[str, Any]:
        """Get overall performance summary"""
        now = datetime.utcnow()
        last_hour = now - timedelta(hours=1)
        
        # Filter recent metrics
        recent_metrics = [
            m for m in self.metrics_history
            if datetime.fromisoformat(m.timestamp) >= last_hour
        ]
        
        if not recent_metrics:
            return {
                "timestamp": now.isoformat(),
                "timeframe": "1 hour",
                "total_operations": 0,
                "avg_response_time_ms": 0,
                "error_rate": 0,
                "operations_per_second": 0,
                "slowest_operations": [],
                "error_operations": []
            }
        
        # Calculate summary statistics
        total_operations = len(recent_metrics)
        response_times = [m.duration_ms for m in recent_metrics]
        errors = [m for m in recent_metrics if m.status != "success"]
        
        avg_response_time = sum(response_times) / len(response_times)
        error_rate = len(errors) / total_operations
        operations_per_second = total_operations / 3600  # per second in last hour
        
        # Find slowest operations
        slowest_metrics = sorted(recent_metrics, key=lambda x: x.duration_ms, reverse=True)[:5]
        slowest_operations = [
            {
                "operation": m.operation,
                "duration_ms": m.duration_ms,
                "timestamp": m.timestamp
            }
            for m in slowest_metrics
        ]
        
        # Error operations
        error_operations = [
            {
                "operation": m.operation,
                "duration_ms": m.duration_ms,
                "status": m.status,
                "timestamp": m.timestamp
            }
            for m in errors[:10]  # Last 10 errors
        ]
        
        return {
            "timestamp": now.isoformat(),
            "timeframe": "1 hour",
            "total_operations": total_operations,
            "avg_response_time_ms": avg_response_time,
            "error_rate": error_rate,
            "operations_per_second": operations_per_second,
            "slowest_operations": slowest_operations,
            "error_operations": error_operations
        }


# Global performance monitor instance
performance_monitor = PerformanceMonitor()


def monitor_performance(operation_name: Optional[str] = None):
    """Decorator to monitor function performance"""
    def decorator(func):
        nonlocal operation_name
        if operation_name is None:
            operation_name = f"{func.__module__}.{func.__name__}"
        
        if asyncio.iscoroutinefunction(func):
            @functools.wraps(func)
            async def async_wrapper(*args, **kwargs):
                start_time = time.time()
                status = "success"
                
                try:
                    result = await func(*args, **kwargs)
                    return result
                except Exception as e:
                    status = "error"
                    raise
                finally:
                    duration_ms = (time.time() - start_time) * 1000
                    performance_monitor.record_metric(
                        operation=operation_name,
                        duration_ms=duration_ms,
                        status=status,
                        metadata={"function": func.__name__, "args_count": len(args)}
                    )
                    
                    # Also track in Prometheus if available
                    if hasattr(metrics_server, 'track_agent_task'):
                        metrics_server.track_agent_task(
                            agent_type="performance_monitor",
                            task_type=operation_name,
                            status=status,
                            duration=duration_ms / 1000
                        )
            
            return async_wrapper
        else:
            @functools.wraps(func)
            def sync_wrapper(*args, **kwargs):
                start_time = time.time()
                status = "success"
                
                try:
                    result = func(*args, **kwargs)
                    return result
                except Exception as e:
                    status = "error"
                    raise
                finally:
                    duration_ms = (time.time() - start_time) * 1000
                    performance_monitor.record_metric(
                        operation=operation_name,
                        duration_ms=duration_ms,
                        status=status,
                        metadata={"function": func.__name__, "args_count": len(args)}
                    )
            
            return sync_wrapper
    
    return decorator


def monitor_agent_task(agent_type: str, task_type: Optional[str] = None):
    """Decorator specifically for monitoring agent tasks"""
    def decorator(func):
        nonlocal task_type
        if task_type is None:
            task_type = func.__name__
        
        operation_name = f"agent_task:{agent_type}:{task_type}"
        
        if asyncio.iscoroutinefunction(func):
            @functools.wraps(func)
            async def async_wrapper(*args, **kwargs):
                start_time = time.time()
                status = "success"
                
                try:
                    result = await func(*args, **kwargs)
                    return result
                except Exception as e:
                    status = "error"
                    raise
                finally:
                    duration_ms = (time.time() - start_time) * 1000
                    performance_monitor.record_metric(
                        operation=operation_name,
                        duration_ms=duration_ms,
                        status=status,
                        metadata={
                            "agent_type": agent_type,
                            "task_type": task_type,
                            "function": func.__name__
                        }
                    )
                    
                    # Track in Prometheus
                    if hasattr(metrics_server, 'track_agent_task'):
                        metrics_server.track_agent_task(
                            agent_type=agent_type,
                            task_type=task_type,
                            status=status,
                            duration=duration_ms / 1000
                        )
            
            return async_wrapper
        else:
            @functools.wraps(func)
            def sync_wrapper(*args, **kwargs):
                start_time = time.time()
                status = "success"
                
                try:
                    result = func(*args, **kwargs)
                    return result
                except Exception as e:
                    status = "error"
                    raise
                finally:
                    duration_ms = (time.time() - start_time) * 1000
                    performance_monitor.record_metric(
                        operation=operation_name,
                        duration_ms=duration_ms,
                        status=status,
                        metadata={
                            "agent_type": agent_type,
                            "task_type": task_type,
                            "function": func.__name__
                        }
                    )
                    
                    # Track in Prometheus
                    if hasattr(metrics_server, 'track_agent_task'):
                        metrics_server.track_agent_task(
                            agent_type=agent_type,
                            task_type=task_type,
                            status=status,
                            duration=duration_ms / 1000
                        )
            
            return sync_wrapper
    
    return decorator


@asynccontextmanager
async def monitor_operation(operation_name: str, metadata: Optional[Dict[str, Any]] = None):
    """Context manager for monitoring operations"""
    start_time = time.time()
    status = "success"
    
    try:
        yield
    except Exception as e:
        status = "error"
        raise
    finally:
        duration_ms = (time.time() - start_time) * 1000
        performance_monitor.record_metric(
            operation=operation_name,
            duration_ms=duration_ms,
            status=status,
            metadata=metadata or {}
        )


class PerformanceMiddleware(BaseHTTPMiddleware):
    """HTTP middleware for tracking API performance"""
    
    def __init__(self, app, excluded_paths: Optional[List[str]] = None):
        super().__init__(app)
        self.excluded_paths = excluded_paths or ["/health", "/metrics", "/docs", "/openapi.json"]
    
    async def dispatch(self, request: Request, call_next):
        # Skip monitoring for excluded paths
        if any(request.url.path.startswith(path) for path in self.excluded_paths):
            return await call_next(request)
        
        start_time = time.time()
        
        # Extract request information
        method = request.method
        endpoint = request.url.path
        user_agent = request.headers.get("user-agent", "unknown")
        request_size = len(await request.body()) if hasattr(request, "body") else 0
        
        response = await call_next(request)
        
        # Calculate metrics
        duration_ms = (time.time() - start_time) * 1000
        status_code = response.status_code
        response_size = len(response.body) if hasattr(response, "body") else 0
        
        # Record performance metric
        operation_name = f"{method}:{endpoint}"
        status = "success" if 200 <= status_code < 400 else "error"
        
        performance_monitor.record_metric(
            operation=operation_name,
            duration_ms=duration_ms,
            status=status,
            metadata={
                "method": method,
                "endpoint": endpoint,
                "status_code": status_code,
                "user_agent": user_agent,
                "request_size": request_size,
                "response_size": response_size
            }
        )
        
        # Track in Prometheus
        if hasattr(metrics_server, 'track_http_request'):
            metrics_server.track_http_request(
                method=method,
                endpoint=endpoint,
                status_code=status_code,
                duration=duration_ms / 1000,
                user_agent=user_agent,
                request_size=request_size,
                response_size=response_size
            )
        
        return response


# Performance monitoring utilities
def get_performance_report() -> Dict[str, Any]:
    """Get comprehensive performance report"""
    return {
        "summary": performance_monitor.get_performance_summary(),
        "top_operations": [
            performance_monitor.get_operation_stats(op)
            for op in list(performance_monitor.operation_stats.keys())[:10]
        ],
        "system_health": {
            "monitoring_enabled": True,
            "metrics_count": len(performance_monitor.metrics_history),
            "tracked_operations": len(performance_monitor.operation_stats)
        }
    }


def get_slow_operations(threshold_ms: float = 1000, limit: int = 10) -> List[Dict[str, Any]]:
    """Get operations that exceed performance thresholds"""
    slow_operations = []
    
    for operation, stats in performance_monitor.operation_stats.items():
        if stats['max_time'] > threshold_ms:
            slow_operations.append({
                "operation": operation,
                "max_time_ms": stats['max_time'],
                "avg_time_ms": stats['total_time'] / stats['count'],
                "count": stats['count'],
                "error_rate": stats['errors'] / stats['count'] if stats['count'] > 0 else 0
            })
    
    # Sort by max time descending
    slow_operations.sort(key=lambda x: x['max_time_ms'], reverse=True)
    
    return slow_operations[:limit]