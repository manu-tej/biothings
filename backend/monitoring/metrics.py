import asyncio
from datetime import datetime
from typing import Dict, List, Any
import psutil
import logging
from dataclasses import dataclass, asdict

logger = logging.getLogger(__name__)


@dataclass
class SystemMetrics:
    """System resource metrics"""
    timestamp: str
    cpu_percent: float
    memory_percent: float
    memory_used_mb: float
    disk_percent: float
    active_agents: int
    active_workflows: int
    websocket_connections: int


@dataclass
class AgentMetrics:
    """Metrics for individual agents"""
    agent_id: str
    agent_type: str
    status: str
    tasks_completed: int
    tasks_failed: int
    average_response_time_ms: float
    last_active: str


class MetricsCollector:
    def __init__(self):
        self.collection_interval = 5  # seconds
        self.is_collecting = False
        self.metrics_history: List[SystemMetrics] = []
        self.max_history_size = 1000
        self.agent_metrics: Dict[str, AgentMetrics] = {}
        
        # Placeholder counters (will be connected to actual systems)
        self.active_agents = 0
        self.active_workflows = 0
        self.websocket_connections = 0
    
    async def start_collection(self):
        """Start the metrics collection loop"""
        self.is_collecting = True
        logger.info("Starting metrics collection")
        
        while self.is_collecting:
            try:
                metrics = await self.collect_system_metrics()
                self.metrics_history.append(metrics)
                
                # Trim history if too large
                if len(self.metrics_history) > self.max_history_size:
                    self.metrics_history = self.metrics_history[-self.max_history_size:]
                
                await asyncio.sleep(self.collection_interval)
            except Exception as e:
                logger.error(f"Error collecting metrics: {str(e)}")
                await asyncio.sleep(self.collection_interval)
    
    async def stop_collection(self):
        """Stop the metrics collection loop"""
        self.is_collecting = False
        logger.info("Stopping metrics collection")
    
    async def collect_system_metrics(self) -> SystemMetrics:
        """Collect current system metrics"""
        # Get system resource usage
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        metrics = SystemMetrics(
            timestamp=datetime.utcnow().isoformat(),
            cpu_percent=cpu_percent,
            memory_percent=memory.percent,
            memory_used_mb=memory.used / (1024 * 1024),
            disk_percent=disk.percent,
            active_agents=self.active_agents,
            active_workflows=self.active_workflows,
            websocket_connections=self.websocket_connections
        )
        
        return metrics
    
    async def get_current_metrics(self) -> Dict[str, Any]:
        """Get the most recent metrics"""
        if not self.metrics_history:
            # Collect metrics on demand if none available
            metrics = await self.collect_system_metrics()
            self.metrics_history.append(metrics)
        
        current = self.metrics_history[-1]
        
        return {
            "system": asdict(current),
            "agents": {
                agent_id: asdict(metrics) 
                for agent_id, metrics in self.agent_metrics.items()
            },
            "summary": {
                "total_agents": len(self.agent_metrics),
                "active_agents": self.active_agents,
                "total_workflows": self.active_workflows,
                "system_health": self._calculate_system_health(current)
            }
        }
    
    async def get_metrics_history(self, minutes: int = 60) -> List[Dict[str, Any]]:
        """Get metrics history for the specified number of minutes"""
        if not self.metrics_history:
            return []
        
        cutoff_time = datetime.utcnow()
        history = []
        
        for metrics in reversed(self.metrics_history):
            metrics_time = datetime.fromisoformat(metrics.timestamp)
            time_diff = (cutoff_time - metrics_time).total_seconds() / 60
            
            if time_diff <= minutes:
                history.append(asdict(metrics))
            else:
                break
        
        return list(reversed(history))
    
    def update_agent_metrics(self, agent_id: str, metrics: AgentMetrics):
        """Update metrics for a specific agent"""
        self.agent_metrics[agent_id] = metrics
    
    def update_connection_count(self, count: int):
        """Update the WebSocket connection count"""
        self.websocket_connections = count
    
    def update_active_agents(self, count: int):
        """Update the active agents count"""
        self.active_agents = count
    
    def update_active_workflows(self, count: int):
        """Update the active workflows count"""
        self.active_workflows = count
    
    def _calculate_system_health(self, metrics: SystemMetrics) -> str:
        """Calculate overall system health status"""
        # Simple health calculation based on resource usage
        if metrics.cpu_percent > 90 or metrics.memory_percent > 90:
            return "critical"
        elif metrics.cpu_percent > 70 or metrics.memory_percent > 70:
            return "warning"
        else:
            return "healthy"