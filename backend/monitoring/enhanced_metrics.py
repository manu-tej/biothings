"""
Enhanced Metrics Collection for BioThings Production
Implements Prometheus metrics, OpenTelemetry tracing, and custom analytics
"""
import time
import asyncio
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
from functools import wraps
from contextlib import asynccontextmanager

try:
    from prometheus_client import Counter, Histogram, Gauge, Summary, CollectorRegistry, generate_latest
    PROMETHEUS_AVAILABLE = True
except ImportError:
    PROMETHEUS_AVAILABLE = False

try:
    from opentelemetry import trace
    from opentelemetry.exporter.jaeger.thrift import JaegerExporter
    from opentelemetry.sdk.trace import TracerProvider
    from opentelemetry.sdk.trace.export import BatchSpanProcessor
    OTEL_AVAILABLE = True
except ImportError:
    OTEL_AVAILABLE = False

import structlog
from .metrics import MetricsCollector

logger = structlog.get_logger()


class EnhancedMetricsCollector(MetricsCollector):
    """Enhanced metrics collector with Prometheus and OpenTelemetry support"""
    
    def __init__(self):
        super().__init__()
        self.registry = CollectorRegistry() if PROMETHEUS_AVAILABLE else None
        self.tracer = None
        self._setup_prometheus_metrics()
        self._setup_opentelemetry()
        
        # Business metrics
        self.experiment_metrics = {}
        self.agent_performance = {}
        self.llm_usage_stats = {
            'total_tokens': 0,
            'total_requests': 0,
            'total_cost': 0.0,
            'avg_response_time': 0.0
        }
    
    def _setup_prometheus_metrics(self):
        """Initialize Prometheus metrics"""
        if not PROMETHEUS_AVAILABLE:
            logger.warning("Prometheus client not available")
            return
        
        # HTTP metrics
        self.http_requests_total = Counter(
            'http_requests_total',
            'Total HTTP requests',
            ['method', 'endpoint', 'status_code'],
            registry=self.registry
        )
        
        self.http_request_duration = Histogram(
            'http_request_duration_seconds',
            'HTTP request duration',
            ['method', 'endpoint'],
            registry=self.registry
        )
        
        # Agent metrics
        self.agent_tasks_total = Counter(
            'agent_tasks_total',
            'Total agent tasks',
            ['agent_type', 'status'],
            registry=self.registry
        )
        
        self.agent_response_time = Histogram(
            'agent_response_time_seconds',
            'Agent response time',
            ['agent_type'],
            registry=self.registry
        )
        
        # LLM metrics
        self.llm_tokens_total = Counter(
            'llm_tokens_total',
            'Total LLM tokens used',
            ['agent_type', 'model'],
            registry=self.registry
        )
        
        self.llm_requests_total = Counter(
            'llm_requests_total',
            'Total LLM requests',
            ['agent_type', 'model', 'status'],
            registry=self.registry
        )
        
        self.llm_cost_total = Counter(
            'llm_cost_total',
            'Total LLM cost in USD',
            ['agent_type', 'model'],
            registry=self.registry
        )
        
        # System metrics
        self.active_connections = Gauge(
            'websocket_connections_active',
            'Active WebSocket connections',
            registry=self.registry
        )
        
        self.active_experiments = Gauge(
            'experiments_active',
            'Active experiments',
            registry=self.registry
        )
        
        # Business metrics
        self.experiments_completed = Counter(
            'experiments_completed_total',
            'Total completed experiments',
            ['protocol', 'status'],
            registry=self.registry
        )
        
        self.research_productivity = Gauge(
            'research_productivity_ratio',
            'Research productivity ratio',
            registry=self.registry
        )
    
    def _setup_opentelemetry(self):
        """Initialize OpenTelemetry tracing"""
        if not OTEL_AVAILABLE:
            logger.warning("OpenTelemetry not available")
            return
        
        trace.set_tracer_provider(TracerProvider())
        
        # Configure Jaeger exporter
        jaeger_exporter = JaegerExporter(
            agent_host_name="localhost",
            agent_port=14268,
        )
        
        span_processor = BatchSpanProcessor(jaeger_exporter)
        trace.get_tracer_provider().add_span_processor(span_processor)
        
        self.tracer = trace.get_tracer(__name__)
    
    def track_http_request(self, method: str, endpoint: str, status_code: int, duration: float):
        """Track HTTP request metrics"""
        if not PROMETHEUS_AVAILABLE:
            return
        
        self.http_requests_total.labels(
            method=method,
            endpoint=endpoint,
            status_code=str(status_code)
        ).inc()
        
        self.http_request_duration.labels(
            method=method,
            endpoint=endpoint
        ).observe(duration)
    
    def track_agent_task(self, agent_type: str, status: str, response_time: float):
        """Track agent task metrics"""
        if not PROMETHEUS_AVAILABLE:
            return
        
        self.agent_tasks_total.labels(
            agent_type=agent_type,
            status=status
        ).inc()
        
        self.agent_response_time.labels(
            agent_type=agent_type
        ).observe(response_time)
        
        # Update internal tracking
        if agent_type not in self.agent_performance:
            self.agent_performance[agent_type] = {
                'total_tasks': 0,
                'successful_tasks': 0,
                'failed_tasks': 0,
                'avg_response_time': 0.0,
                'last_active': datetime.utcnow()
            }
        
        perf = self.agent_performance[agent_type]
        perf['total_tasks'] += 1
        perf['last_active'] = datetime.utcnow()
        
        if status == 'success':
            perf['successful_tasks'] += 1
        else:
            perf['failed_tasks'] += 1
        
        # Update average response time
        perf['avg_response_time'] = (
            (perf['avg_response_time'] * (perf['total_tasks'] - 1) + response_time) 
            / perf['total_tasks']
        )
    
    def track_llm_usage(self, agent_type: str, model: str, tokens: int, cost: float, 
                       response_time: float, status: str = 'success'):
        """Track LLM usage metrics"""
        if not PROMETHEUS_AVAILABLE:
            return
        
        self.llm_tokens_total.labels(
            agent_type=agent_type,
            model=model
        ).inc(tokens)
        
        self.llm_requests_total.labels(
            agent_type=agent_type,
            model=model,
            status=status
        ).inc()
        
        self.llm_cost_total.labels(
            agent_type=agent_type,
            model=model
        ).inc(cost)
        
        # Update internal stats
        self.llm_usage_stats['total_tokens'] += tokens
        self.llm_usage_stats['total_requests'] += 1
        self.llm_usage_stats['total_cost'] += cost
        
        # Update average response time
        total_requests = self.llm_usage_stats['total_requests']
        self.llm_usage_stats['avg_response_time'] = (
            (self.llm_usage_stats['avg_response_time'] * (total_requests - 1) + response_time) 
            / total_requests
        )
    
    def track_experiment(self, protocol: str, status: str, duration: Optional[float] = None):
        """Track experiment metrics"""
        if not PROMETHEUS_AVAILABLE:
            return
        
        self.experiments_completed.labels(
            protocol=protocol,
            status=status
        ).inc()
        
        # Update experiment tracking
        if protocol not in self.experiment_metrics:
            self.experiment_metrics[protocol] = {
                'total': 0,
                'successful': 0,
                'failed': 0,
                'avg_duration': 0.0
            }
        
        exp = self.experiment_metrics[protocol]
        exp['total'] += 1
        
        if status == 'success':
            exp['successful'] += 1
        else:
            exp['failed'] += 1
        
        if duration:
            exp['avg_duration'] = (
                (exp['avg_duration'] * (exp['total'] - 1) + duration) 
                / exp['total']
            )
    
    def update_connection_count(self, count: int):
        """Update WebSocket connection count"""
        super().update_connection_count(count)
        if PROMETHEUS_AVAILABLE:
            self.active_connections.set(count)
    
    def update_active_experiments(self, count: int):
        """Update active experiments count"""
        super().update_active_workflows(count)
        if PROMETHEUS_AVAILABLE:
            self.active_experiments.set(count)
    
    def calculate_research_productivity(self) -> float:
        """Calculate research productivity ratio"""
        total_experiments = sum(exp['total'] for exp in self.experiment_metrics.values())
        successful_experiments = sum(exp['successful'] for exp in self.experiment_metrics.values())
        
        if total_experiments == 0:
            return 0.0
        
        productivity = successful_experiments / total_experiments
        
        if PROMETHEUS_AVAILABLE:
            self.research_productivity.set(productivity)
        
        return productivity
    
    def get_prometheus_metrics(self) -> str:
        """Get Prometheus formatted metrics"""
        if not PROMETHEUS_AVAILABLE or not self.registry:
            return "# Prometheus not available\n"
        
        return generate_latest(self.registry).decode('utf-8')
    
    @asynccontextmanager
    async def trace_operation(self, operation_name: str, **attributes):
        """Context manager for tracing operations"""
        if not self.tracer:
            yield None
            return
        
        with self.tracer.start_as_current_span(operation_name) as span:
            for key, value in attributes.items():
                span.set_attribute(key, str(value))
            
            yield span
    
    async def get_enhanced_metrics(self) -> Dict[str, Any]:
        """Get comprehensive metrics including business intelligence"""
        base_metrics = await super().get_current_metrics()
        
        # Add business metrics
        productivity_ratio = self.calculate_research_productivity()
        
        enhanced_metrics = {
            **base_metrics,
            "business_metrics": {
                "research_productivity": productivity_ratio,
                "experiment_success_rate": productivity_ratio,
                "total_experiments": sum(exp['total'] for exp in self.experiment_metrics.values()),
                "llm_usage": self.llm_usage_stats,
                "agent_performance": self.agent_performance
            },
            "cost_analysis": {
                "llm_cost_per_hour": self._calculate_hourly_llm_cost(),
                "cost_per_experiment": self._calculate_cost_per_experiment(),
                "estimated_monthly_cost": self._estimate_monthly_cost()
            },
            "performance_indicators": {
                "avg_agent_response_time": self._get_avg_agent_response_time(),
                "system_efficiency": self._calculate_system_efficiency(),
                "resource_utilization": self._get_resource_utilization()
            }
        }
        
        return enhanced_metrics
    
    def _calculate_hourly_llm_cost(self) -> float:
        """Calculate LLM cost per hour"""
        # This is a simplified calculation
        if self.llm_usage_stats['total_requests'] == 0:
            return 0.0
        
        # Estimate based on recent usage (last hour)
        return self.llm_usage_stats['total_cost'] / max(1, 
            (datetime.utcnow() - datetime.utcnow().replace(minute=0, second=0, microsecond=0)).seconds / 3600
        )
    
    def _calculate_cost_per_experiment(self) -> float:
        """Calculate average cost per experiment"""
        total_experiments = sum(exp['total'] for exp in self.experiment_metrics.values())
        if total_experiments == 0:
            return 0.0
        
        return self.llm_usage_stats['total_cost'] / total_experiments
    
    def _estimate_monthly_cost(self) -> float:
        """Estimate monthly cost based on current usage"""
        hourly_cost = self._calculate_hourly_llm_cost()
        return hourly_cost * 24 * 30  # Simple extrapolation
    
    def _get_avg_agent_response_time(self) -> float:
        """Get average response time across all agents"""
        if not self.agent_performance:
            return 0.0
        
        total_time = sum(agent['avg_response_time'] for agent in self.agent_performance.values())
        return total_time / len(self.agent_performance)
    
    def _calculate_system_efficiency(self) -> float:
        """Calculate overall system efficiency score (0-1)"""
        # This is a composite metric
        factors = {
            'research_productivity': self.calculate_research_productivity(),
            'agent_availability': self._calculate_agent_availability(),
            'resource_efficiency': self._calculate_resource_efficiency()
        }
        
        return sum(factors.values()) / len(factors)
    
    def _calculate_agent_availability(self) -> float:
        """Calculate agent availability ratio"""
        if not self.agent_performance:
            return 1.0
        
        now = datetime.utcnow()
        available_agents = sum(
            1 for agent in self.agent_performance.values()
            if (now - agent['last_active']).seconds < 300  # Active within 5 minutes
        )
        
        return available_agents / len(self.agent_performance)
    
    def _calculate_resource_efficiency(self) -> float:
        """Calculate resource utilization efficiency"""
        # Placeholder - would integrate with actual resource monitoring
        return 0.8  # Assume 80% efficiency for now
    
    def _get_resource_utilization(self) -> Dict[str, float]:
        """Get current resource utilization"""
        # This would integrate with actual system monitoring
        return {
            "cpu_utilization": 0.6,
            "memory_utilization": 0.7,
            "disk_utilization": 0.4,
            "network_utilization": 0.3
        }


def monitor_endpoint(operation_name: str = None):
    """Decorator for monitoring HTTP endpoints"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            start_time = time.time()
            status_code = 200
            
            try:
                # Extract request info if available
                method = "GET"  # Default
                endpoint = operation_name or func.__name__
                
                result = await func(*args, **kwargs)
                return result
                
            except Exception as e:
                status_code = 500
                raise
            finally:
                duration = time.time() - start_time
                
                # Track metrics if collector is available
                if hasattr(func, '_metrics_collector'):
                    func._metrics_collector.track_http_request(
                        method, endpoint, status_code, duration
                    )
        
        return wrapper
    return decorator


def monitor_agent_task(agent_type: str):
    """Decorator for monitoring agent tasks"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            start_time = time.time()
            status = "success"
            
            try:
                result = await func(*args, **kwargs)
                return result
            except Exception as e:
                status = "failed"
                raise
            finally:
                duration = time.time() - start_time
                
                # Track metrics if collector is available
                if hasattr(func, '_metrics_collector'):
                    func._metrics_collector.track_agent_task(
                        agent_type, status, duration
                    )
        
        return wrapper
    return decorator


# Global enhanced metrics collector instance
enhanced_metrics_collector = EnhancedMetricsCollector()