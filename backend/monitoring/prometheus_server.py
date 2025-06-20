"""
Prometheus Metrics Server for BioThings Platform
Provides comprehensive metrics collection for production monitoring
"""
import time
import asyncio
import threading
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
from dataclasses import dataclass
from contextlib import asynccontextmanager

try:
    from prometheus_client import (
        Counter, Histogram, Gauge, Summary, Info,
        CollectorRegistry, generate_latest, 
        start_http_server, CONTENT_TYPE_LATEST
    )
    PROMETHEUS_AVAILABLE = True
except ImportError:
    PROMETHEUS_AVAILABLE = False

import structlog
from fastapi import FastAPI, Response
from fastapi.responses import PlainTextResponse

logger = structlog.get_logger()


@dataclass
class MetricDefinition:
    """Definition for a custom metric"""
    name: str
    description: str
    labels: List[str]
    metric_type: str  # counter, gauge, histogram, summary


class PrometheusMetricsServer:
    """Production-ready Prometheus metrics server"""
    
    def __init__(self, port: int = 8000, registry: Optional[CollectorRegistry] = None):
        self.port = port
        self.registry = registry or CollectorRegistry()
        self.app = FastAPI(title="BioThings Metrics Server")
        self.metrics = {}
        self.custom_metrics = {}
        self.server_thread = None
        self.is_running = False
        
        # Initialize core metrics
        self._setup_core_metrics()
        self._setup_business_metrics()
        self._setup_security_metrics()
        self._setup_performance_metrics()
        
        # Setup FastAPI routes
        self._setup_routes()
    
    def _setup_core_metrics(self):
        """Initialize core system metrics"""
        
        # HTTP Request Metrics
        self.metrics['http_requests_total'] = Counter(
            'biothings_http_requests_total',
            'Total HTTP requests received',
            ['method', 'endpoint', 'status_code', 'user_agent'],
            registry=self.registry
        )
        
        self.metrics['http_request_duration_seconds'] = Histogram(
            'biothings_http_request_duration_seconds',
            'HTTP request duration in seconds',
            ['method', 'endpoint'],
            buckets=[0.005, 0.01, 0.025, 0.05, 0.075, 0.1, 0.25, 0.5, 0.75, 1.0, 2.5, 5.0, 7.5, 10.0],
            registry=self.registry
        )
        
        self.metrics['http_request_size_bytes'] = Histogram(
            'biothings_http_request_size_bytes',
            'HTTP request size in bytes',
            ['method', 'endpoint'],
            registry=self.registry
        )
        
        self.metrics['http_response_size_bytes'] = Histogram(
            'biothings_http_response_size_bytes',
            'HTTP response size in bytes',
            ['method', 'endpoint'],
            registry=self.registry
        )
        
        # System Resource Metrics
        self.metrics['cpu_usage_percent'] = Gauge(
            'biothings_cpu_usage_percent',
            'CPU usage percentage',
            registry=self.registry
        )
        
        self.metrics['memory_usage_percent'] = Gauge(
            'biothings_memory_usage_percent',
            'Memory usage percentage',
            registry=self.registry
        )
        
        self.metrics['memory_usage_bytes'] = Gauge(
            'biothings_memory_usage_bytes',
            'Memory usage in bytes',
            registry=self.registry
        )
        
        self.metrics['disk_usage_percent'] = Gauge(
            'biothings_disk_usage_percent',
            'Disk usage percentage',
            registry=self.registry
        )
        
        self.metrics['network_bytes_sent'] = Counter(
            'biothings_network_bytes_sent_total',
            'Total network bytes sent',
            registry=self.registry
        )
        
        self.metrics['network_bytes_received'] = Counter(
            'biothings_network_bytes_received_total',
            'Total network bytes received',
            registry=self.registry
        )
        
        # WebSocket Metrics
        self.metrics['websocket_connections_active'] = Gauge(
            'biothings_websocket_connections_active',
            'Active WebSocket connections',
            registry=self.registry
        )
        
        self.metrics['websocket_messages_sent'] = Counter(
            'biothings_websocket_messages_sent_total',
            'Total WebSocket messages sent',
            ['message_type'],
            registry=self.registry
        )
        
        self.metrics['websocket_messages_received'] = Counter(
            'biothings_websocket_messages_received_total',
            'Total WebSocket messages received',
            ['message_type'],
            registry=self.registry
        )
    
    def _setup_business_metrics(self):
        """Initialize business and research metrics"""
        
        # Agent Metrics
        self.metrics['agents_active'] = Gauge(
            'biothings_agents_active',
            'Number of active agents',
            ['agent_type'],
            registry=self.registry
        )
        
        self.metrics['agent_tasks_total'] = Counter(
            'biothings_agent_tasks_total',
            'Total agent tasks processed',
            ['agent_type', 'task_type', 'status'],
            registry=self.registry
        )
        
        self.metrics['agent_task_duration_seconds'] = Histogram(
            'biothings_agent_task_duration_seconds',
            'Agent task duration in seconds',
            ['agent_type', 'task_type'],
            buckets=[0.1, 0.5, 1.0, 2.0, 5.0, 10.0, 30.0, 60.0, 300.0, 600.0],
            registry=self.registry
        )
        
        self.metrics['agent_errors_total'] = Counter(
            'biothings_agent_errors_total',
            'Total agent errors',
            ['agent_type', 'error_type'],
            registry=self.registry
        )
        
        # Experiment Metrics
        self.metrics['experiments_total'] = Counter(
            'biothings_experiments_total',
            'Total experiments executed',
            ['protocol', 'status', 'researcher_id'],
            registry=self.registry
        )
        
        self.metrics['experiments_active'] = Gauge(
            'biothings_experiments_active',
            'Currently active experiments',
            ['protocol'],
            registry=self.registry
        )
        
        self.metrics['experiment_duration_seconds'] = Histogram(
            'biothings_experiment_duration_seconds',
            'Experiment duration in seconds',
            ['protocol'],
            buckets=[60, 300, 600, 1800, 3600, 7200, 14400, 28800, 86400],
            registry=self.registry
        )
        
        self.metrics['experiment_success_rate'] = Gauge(
            'biothings_experiment_success_rate',
            'Experiment success rate',
            ['protocol'],
            registry=self.registry
        )
        
        # Research Productivity Metrics
        self.metrics['research_productivity_score'] = Gauge(
            'biothings_research_productivity_score',
            'Overall research productivity score (0-1)',
            registry=self.registry
        )
        
        self.metrics['publications_generated'] = Counter(
            'biothings_publications_generated_total',
            'Total publications generated',
            ['publication_type', 'quality_score'],
            registry=self.registry
        )
        
        self.metrics['discoveries_made'] = Counter(
            'biothings_discoveries_made_total',
            'Total scientific discoveries made',
            ['discovery_type', 'significance'],
            registry=self.registry
        )
    
    def _setup_security_metrics(self):
        """Initialize security and audit metrics"""
        
        self.metrics['authentication_attempts'] = Counter(
            'biothings_authentication_attempts_total',
            'Total authentication attempts',
            ['result', 'method'],
            registry=self.registry
        )
        
        self.metrics['authorization_failures'] = Counter(
            'biothings_authorization_failures_total',
            'Total authorization failures',
            ['resource', 'user_role'],
            registry=self.registry
        )
        
        self.metrics['security_events'] = Counter(
            'biothings_security_events_total',
            'Total security events',
            ['event_type', 'severity'],
            registry=self.registry
        )
        
        self.metrics['rate_limit_hits'] = Counter(
            'biothings_rate_limit_hits_total',
            'Total rate limit hits',
            ['endpoint', 'user_id'],
            registry=self.registry
        )
        
        self.metrics['data_access_requests'] = Counter(
            'biothings_data_access_requests_total',
            'Total data access requests',
            ['data_type', 'access_level', 'user_role'],
            registry=self.registry
        )
    
    def _setup_performance_metrics(self):
        """Initialize performance and cost metrics"""
        
        # LLM Usage Metrics
        self.metrics['llm_requests_total'] = Counter(
            'biothings_llm_requests_total',
            'Total LLM requests',
            ['provider', 'model', 'agent_type', 'status'],
            registry=self.registry
        )
        
        self.metrics['llm_tokens_total'] = Counter(
            'biothings_llm_tokens_total',
            'Total LLM tokens consumed',
            ['provider', 'model', 'agent_type', 'token_type'],
            registry=self.registry
        )
        
        self.metrics['llm_cost_total'] = Counter(
            'biothings_llm_cost_total',
            'Total LLM cost in USD',
            ['provider', 'model', 'agent_type'],
            registry=self.registry
        )
        
        self.metrics['llm_response_time_seconds'] = Histogram(
            'biothings_llm_response_time_seconds',
            'LLM response time in seconds',
            ['provider', 'model'],
            buckets=[0.5, 1.0, 2.0, 5.0, 10.0, 20.0, 30.0, 60.0],
            registry=self.registry
        )
        
        # Database Metrics
        self.metrics['database_connections_active'] = Gauge(
            'biothings_database_connections_active',
            'Active database connections',
            ['database'],
            registry=self.registry
        )
        
        self.metrics['database_queries_total'] = Counter(
            'biothings_database_queries_total',
            'Total database queries',
            ['database', 'operation', 'status'],
            registry=self.registry
        )
        
        self.metrics['database_query_duration_seconds'] = Histogram(
            'biothings_database_query_duration_seconds',
            'Database query duration in seconds',
            ['database', 'operation'],
            buckets=[0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0],
            registry=self.registry
        )
        
        # Cache Metrics
        self.metrics['cache_hits_total'] = Counter(
            'biothings_cache_hits_total',
            'Total cache hits',
            ['cache_type'],
            registry=self.registry
        )
        
        self.metrics['cache_misses_total'] = Counter(
            'biothings_cache_misses_total',
            'Total cache misses',
            ['cache_type'],
            registry=self.registry
        )
        
        self.metrics['cache_size_bytes'] = Gauge(
            'biothings_cache_size_bytes',
            'Cache size in bytes',
            ['cache_type'],
            registry=self.registry
        )
    
    def _setup_routes(self):
        """Setup FastAPI routes for metrics endpoints"""
        
        @self.app.get("/metrics", response_class=PlainTextResponse)
        async def get_metrics():
            """Prometheus metrics endpoint"""
            return generate_latest(self.registry).decode('utf-8')
        
        @self.app.get("/health")
        async def health_check():
            """Health check endpoint"""
            return {
                "status": "healthy",
                "timestamp": datetime.utcnow().isoformat(),
                "metrics_count": len(self.metrics),
                "registry_collectors": len(list(self.registry._collector_to_names.keys()))
            }
        
        @self.app.get("/metrics/list")
        async def list_metrics():
            """List all available metrics"""
            return {
                "metrics": list(self.metrics.keys()),
                "custom_metrics": list(self.custom_metrics.keys()),
                "total_count": len(self.metrics) + len(self.custom_metrics)
            }
    
    def track_http_request(self, method: str, endpoint: str, status_code: int, 
                          duration: float, user_agent: str = "unknown",
                          request_size: int = 0, response_size: int = 0):
        """Track HTTP request metrics"""
        self.metrics['http_requests_total'].labels(
            method=method,
            endpoint=endpoint,
            status_code=str(status_code),
            user_agent=user_agent
        ).inc()
        
        self.metrics['http_request_duration_seconds'].labels(
            method=method,
            endpoint=endpoint
        ).observe(duration)
        
        if request_size > 0:
            self.metrics['http_request_size_bytes'].labels(
                method=method,
                endpoint=endpoint
            ).observe(request_size)
        
        if response_size > 0:
            self.metrics['http_response_size_bytes'].labels(
                method=method,
                endpoint=endpoint
            ).observe(response_size)
    
    def track_agent_task(self, agent_type: str, task_type: str, status: str, 
                        duration: float, error_type: str = None):
        """Track agent task metrics"""
        self.metrics['agent_tasks_total'].labels(
            agent_type=agent_type,
            task_type=task_type,
            status=status
        ).inc()
        
        self.metrics['agent_task_duration_seconds'].labels(
            agent_type=agent_type,
            task_type=task_type
        ).observe(duration)
        
        if status == 'error' and error_type:
            self.metrics['agent_errors_total'].labels(
                agent_type=agent_type,
                error_type=error_type
            ).inc()
    
    def track_llm_usage(self, provider: str, model: str, agent_type: str,
                       input_tokens: int, output_tokens: int, cost: float,
                       response_time: float, status: str = 'success'):
        """Track LLM usage metrics"""
        self.metrics['llm_requests_total'].labels(
            provider=provider,
            model=model,
            agent_type=agent_type,
            status=status
        ).inc()
        
        self.metrics['llm_tokens_total'].labels(
            provider=provider,
            model=model,
            agent_type=agent_type,
            token_type='input'
        ).inc(input_tokens)
        
        self.metrics['llm_tokens_total'].labels(
            provider=provider,
            model=model,
            agent_type=agent_type,
            token_type='output'
        ).inc(output_tokens)
        
        self.metrics['llm_cost_total'].labels(
            provider=provider,
            model=model,
            agent_type=agent_type
        ).inc(cost)
        
        self.metrics['llm_response_time_seconds'].labels(
            provider=provider,
            model=model
        ).observe(response_time)
    
    def track_experiment(self, protocol: str, status: str, duration: float = None,
                        researcher_id: str = "unknown"):
        """Track experiment metrics"""
        self.metrics['experiments_total'].labels(
            protocol=protocol,
            status=status,
            researcher_id=researcher_id
        ).inc()
        
        if duration:
            self.metrics['experiment_duration_seconds'].labels(
                protocol=protocol
            ).observe(duration)
    
    def track_security_event(self, event_type: str, severity: str):
        """Track security events"""
        self.metrics['security_events'].labels(
            event_type=event_type,
            severity=severity
        ).inc()
    
    def track_authentication(self, result: str, method: str):
        """Track authentication attempts"""
        self.metrics['authentication_attempts'].labels(
            result=result,
            method=method
        ).inc()
    
    def update_system_metrics(self, cpu_percent: float, memory_percent: float,
                             memory_bytes: int, disk_percent: float):
        """Update system resource metrics"""
        self.metrics['cpu_usage_percent'].set(cpu_percent)
        self.metrics['memory_usage_percent'].set(memory_percent)
        self.metrics['memory_usage_bytes'].set(memory_bytes)
        self.metrics['disk_usage_percent'].set(disk_percent)
    
    def update_agent_count(self, agent_type: str, count: int):
        """Update active agent count"""
        self.metrics['agents_active'].labels(agent_type=agent_type).set(count)
    
    def update_websocket_connections(self, count: int):
        """Update WebSocket connection count"""
        self.metrics['websocket_connections_active'].set(count)
    
    def register_custom_metric(self, definition: MetricDefinition):
        """Register a custom metric"""
        if definition.metric_type == 'counter':
            metric = Counter(
                definition.name,
                definition.description,
                definition.labels,
                registry=self.registry
            )
        elif definition.metric_type == 'gauge':
            metric = Gauge(
                definition.name,
                definition.description,
                definition.labels,
                registry=self.registry
            )
        elif definition.metric_type == 'histogram':
            metric = Histogram(
                definition.name,
                definition.description,
                definition.labels,
                registry=self.registry
            )
        elif definition.metric_type == 'summary':
            metric = Summary(
                definition.name,
                definition.description,
                definition.labels,
                registry=self.registry
            )
        else:
            raise ValueError(f"Unsupported metric type: {definition.metric_type}")
        
        self.custom_metrics[definition.name] = metric
        return metric
    
    def get_metric(self, name: str):
        """Get a metric by name"""
        return self.metrics.get(name) or self.custom_metrics.get(name)
    
    async def start_server(self):
        """Start the metrics server"""
        if not PROMETHEUS_AVAILABLE:
            logger.error("Prometheus client not available")
            return
        
        import uvicorn
        
        self.is_running = True
        logger.info(f"Starting Prometheus metrics server on port {self.port}")
        
        config = uvicorn.Config(
            app=self.app,
            host="0.0.0.0",
            port=self.port,
            log_level="info"
        )
        
        server = uvicorn.Server(config)
        await server.serve()
    
    def start_server_thread(self):
        """Start the metrics server in a separate thread"""
        if self.server_thread and self.server_thread.is_alive():
            logger.warning("Metrics server already running")
            return
        
        def run_server():
            asyncio.run(self.start_server())
        
        self.server_thread = threading.Thread(target=run_server, daemon=True)
        self.server_thread.start()
        logger.info(f"Metrics server thread started on port {self.port}")
    
    def stop_server(self):
        """Stop the metrics server"""
        self.is_running = False
        if self.server_thread:
            self.server_thread.join(timeout=5)
        logger.info("Metrics server stopped")
    
    @asynccontextmanager
    async def track_duration(self, metric_name: str, **labels):
        """Context manager to track operation duration"""
        start_time = time.time()
        try:
            yield
        finally:
            duration = time.time() - start_time
            metric = self.get_metric(metric_name)
            if metric and hasattr(metric, 'labels'):
                metric.labels(**labels).observe(duration)
            elif metric and hasattr(metric, 'observe'):
                metric.observe(duration)


# Global metrics server instance
metrics_server = PrometheusMetricsServer()