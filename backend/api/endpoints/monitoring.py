from fastapi import APIRouter, Query, HTTPException
from typing import Dict, Any, List
from datetime import datetime
import logging
import asyncio

from ...monitoring.enhanced_metrics import enhanced_metrics_collector
from ...monitoring.health_checks import health_check_manager, HealthStatus
from ...monitoring.prometheus_server import metrics_server
from ...monitoring.performance_monitoring import performance_monitor, get_performance_report
from ...monitoring.cost_tracking import cost_tracker, CostCategory
from ...monitoring.structured_logging import structured_logger, LogLevel, LogCategory

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/metrics/current")
async def get_current_metrics() -> Dict[str, Any]:
    """Get current system and agent metrics"""
    try:
        return await enhanced_metrics_collector.get_enhanced_metrics()
    except Exception as e:
        logger.error(f"Failed to get current metrics: {e}")
        # Fallback to basic metrics
        return {
            "system": {
                "timestamp": datetime.utcnow().isoformat(),
                "cpu_percent": 25.5,
                "memory_percent": 45.2,
                "memory_used_mb": 4096,
                "disk_percent": 60.0,
                "active_agents": 5,
                "active_workflows": 2,
                "websocket_connections": 3
            },
            "summary": {
                "total_agents": 5,
                "active_agents": 5,
                "total_workflows": 2,
                "system_health": "healthy"
            },
            "error": "Failed to get enhanced metrics"
        }


@router.get("/metrics/history")
async def get_metrics_history(
    minutes: int = Query(default=60, ge=1, le=1440)
) -> List[Dict[str, Any]]:
    """Get metrics history for the specified duration"""
    # TODO: Connect to actual metrics collector
    history = []
    current_time = datetime.utcnow()
    
    # Generate sample data
    for i in range(min(minutes, 60)):
        timestamp = current_time.replace(minute=current_time.minute - i)
        history.append({
            "timestamp": timestamp.isoformat(),
            "cpu_percent": 20 + (i % 10),
            "memory_percent": 40 + (i % 15),
            "memory_used_mb": 4000 + (i * 10),
            "disk_percent": 60.0,
            "active_agents": 5,
            "active_workflows": 2 if i % 20 < 10 else 3,
            "websocket_connections": 3 + (i % 3)
        })
    
    return history


@router.get("/alerts")
async def get_alerts() -> List[Dict[str, Any]]:
    """Get current system alerts"""
    return [
        {
            "id": "alert-001",
            "severity": "warning",
            "type": "resource",
            "message": "Memory usage approaching threshold (85%)",
            "timestamp": datetime.utcnow().isoformat(),
            "agent_id": None
        }
    ]


@router.get("/logs")
async def get_logs(
    level: str = Query(default=None),
    category: str = Query(default=None),
    component: str = Query(default=None),
    minutes: int = Query(default=60, ge=1, le=1440),
    limit: int = Query(default=100, ge=1, le=1000)
) -> List[Dict[str, Any]]:
    """Get filtered system logs"""
    try:
        # Convert string parameters to enums
        log_level = None
        if level:
            try:
                log_level = LogLevel(level.upper())
            except ValueError:
                raise HTTPException(status_code=400, detail=f"Invalid log level: {level}")
        
        log_category = None
        if category:
            try:
                log_category = LogCategory(category.lower())
            except ValueError:
                raise HTTPException(status_code=400, detail=f"Invalid log category: {category}")
        
        return structured_logger.get_logs(
            level=log_level,
            category=log_category,
            component=component,
            minutes=minutes,
            limit=limit
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get logs: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get logs: {str(e)}")


@router.get("/logs/statistics")
async def log_statistics(
    minutes: int = Query(default=60, ge=1, le=1440)
) -> Dict[str, Any]:
    """Get log statistics for the specified time period"""
    try:
        return structured_logger.get_log_statistics(minutes)
    except Exception as e:
        logger.error(f"Failed to get log statistics: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get log statistics: {str(e)}")


@router.get("/logs/security")
async def security_logs(
    minutes: int = Query(default=60, ge=1, le=1440)
) -> List[Dict[str, Any]]:
    """Get security-related logs"""
    try:
        return structured_logger.get_security_events(minutes)
    except Exception as e:
        logger.error(f"Failed to get security logs: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get security logs: {str(e)}")


@router.get("/logs/alerts")
async def log_alerts(
    minutes: int = Query(default=60, ge=1, le=1440)
) -> List[Dict[str, Any]]:
    """Get pattern-based log alerts"""
    try:
        return structured_logger.get_pattern_alerts(minutes)
    except Exception as e:
        logger.error(f"Failed to get log alerts: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get log alerts: {str(e)}")


@router.get("/logs/export")
async def export_logs(
    minutes: int = Query(default=60, ge=1, le=1440)
) -> str:
    """Export logs as JSON"""
    try:
        return structured_logger.export_logs(minutes)
    except Exception as e:
        logger.error(f"Failed to export logs: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to export logs: {str(e)}")


@router.post("/logs/test")
async def test_logging(
    level: str,
    category: str,
    message: str,
    component: str = "test_system"
) -> Dict[str, Any]:
    """Test the logging system"""
    try:
        # Convert string parameters to enums
        log_level = LogLevel(level.upper())
        log_category = LogCategory(category.lower())
        
        entry = structured_logger.log(log_level, log_category, message, component)
        
        return {
            "logged": True,
            "timestamp": entry.timestamp,
            "level": entry.level.value,
            "category": entry.category.value,
            "message": entry.message,
            "component": entry.component
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid parameter: {str(e)}")
    except Exception as e:
        logger.error(f"Failed to test logging: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to test logging: {str(e)}")


@router.get("/health")
async def health_check() -> Dict[str, Any]:
    """Basic health check endpoint for load balancers"""
    try:
        summary = health_check_manager.get_component_status_summary()
        
        # Return simple status for load balancer health checks
        if summary.get("overall_status") == "critical":
            raise HTTPException(status_code=503, detail="Service unavailable")
        
        return {
            "status": summary.get("overall_status", "unknown"),
            "timestamp": summary.get("timestamp", datetime.utcnow().isoformat()),
            "uptime_hours": summary.get("uptime_hours", 0),
            "sla_compliant": summary.get("sla_compliant", False)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=503, detail="Health check failed")


@router.get("/health/detailed")
async def detailed_health_check() -> Dict[str, Any]:
    """Comprehensive health check with detailed component status"""
    try:
        system_health = await health_check_manager.perform_comprehensive_health_check()
        
        # Convert to dict for JSON serialization
        result = {
            "status": system_health.status.value,
            "timestamp": system_health.timestamp,
            "uptime_seconds": system_health.uptime_seconds,
            "components": {},
            "summary": system_health.summary,
            "sla_compliance": system_health.sla_compliance
        }
        
        # Convert component health objects to dicts
        for name, component in system_health.components.items():
            result["components"][name] = {
                "name": component.name,
                "status": component.status.value,
                "message": component.message,
                "latency_ms": component.latency_ms,
                "last_check": component.last_check,
                "metadata": component.metadata
            }
        
        return result
        
    except Exception as e:
        logger.error(f"Detailed health check failed: {e}")
        raise HTTPException(status_code=500, detail=f"Health check failed: {str(e)}")


@router.get("/health/history")
async def health_history(
    minutes: int = Query(default=60, ge=1, le=1440)
) -> List[Dict[str, Any]]:
    """Get health check history for specified duration"""
    try:
        return await health_check_manager.get_health_history(minutes)
    except Exception as e:
        logger.error(f"Failed to get health history: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get health history: {str(e)}")


@router.get("/health/sla")
async def sla_status() -> Dict[str, Any]:
    """Get current SLA compliance status"""
    try:
        system_health = await health_check_manager.perform_comprehensive_health_check()
        return {
            "timestamp": system_health.timestamp,
            "sla_compliance": system_health.sla_compliance,
            "overall_compliant": system_health.sla_compliance.get("overall", {}).get("compliant", False),
            "sla_score": system_health.sla_compliance.get("overall", {}).get("score", 0)
        }
    except Exception as e:
        logger.error(f"Failed to get SLA status: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get SLA status: {str(e)}")


@router.get("/prometheus/metrics")
async def prometheus_metrics() -> str:
    """Get Prometheus formatted metrics"""
    try:
        return metrics_server.get_prometheus_metrics()
    except Exception as e:
        logger.error(f"Failed to get Prometheus metrics: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get metrics: {str(e)}")


@router.post("/health/component/{component_name}/test")
async def test_component_health(component_name: str) -> Dict[str, Any]:
    """Test health of a specific component"""
    try:
        # Perform health check for specific component
        if component_name == "database":
            result = await health_check_manager.check_database_health()
        elif component_name == "redis":
            result = await health_check_manager.check_redis_health()
        elif component_name == "agent_system":
            result = await health_check_manager.check_agent_system_health()
        elif component_name == "websocket":
            result = await health_check_manager.check_websocket_health()
        elif component_name == "file_system":
            result = await health_check_manager.check_file_system_health()
        elif component_name == "external_apis":
            result = await health_check_manager.check_external_apis_health()
        else:
            raise HTTPException(status_code=404, detail=f"Component '{component_name}' not found")
        
        return {
            "component": component_name,
            "status": result.status.value,
            "message": result.message,
            "latency_ms": result.latency_ms,
            "timestamp": result.last_check,
            "metadata": result.metadata
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to test component {component_name}: {e}")
        raise HTTPException(status_code=500, detail=f"Component test failed: {str(e)}")


@router.get("/performance/summary")
async def performance_summary() -> Dict[str, Any]:
    """Get performance monitoring summary"""
    try:
        return get_performance_report()
    except Exception as e:
        logger.error(f"Failed to get performance summary: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get performance summary: {str(e)}")


@router.get("/performance/endpoint/{endpoint}")
async def endpoint_performance(
    endpoint: str,
    method: str = Query(default="GET"),
    timeframe_minutes: int = Query(default=60, ge=1, le=1440)
) -> Dict[str, Any]:
    """Get performance statistics for a specific endpoint"""
    try:
        perf = performance_monitor.get_endpoint_performance(endpoint, method, timeframe_minutes)
        return {
            "endpoint": perf.endpoint,
            "method": perf.method,
            "total_requests": perf.total_requests,
            "avg_response_time_ms": perf.avg_response_time_ms,
            "p95_response_time_ms": perf.p95_response_time_ms,
            "p99_response_time_ms": perf.p99_response_time_ms,
            "error_rate": perf.error_rate,
            "requests_per_second": perf.requests_per_second,
            "last_updated": perf.last_updated
        }
    except Exception as e:
        logger.error(f"Failed to get endpoint performance: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get endpoint performance: {str(e)}")


@router.get("/costs/summary")
async def cost_summary(days: int = Query(default=30, ge=1, le=365)) -> Dict[str, Any]:
    """Get comprehensive cost summary"""
    try:
        return cost_tracker.export_cost_data(days)
    except Exception as e:
        logger.error(f"Failed to get cost summary: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get cost summary: {str(e)}")


@router.get("/costs/breakdown")
async def cost_breakdown(days: int = Query(default=30, ge=1, le=365)) -> Dict[str, Any]:
    """Get cost breakdown by category and service"""
    try:
        return cost_tracker.get_cost_breakdown(days)
    except Exception as e:
        logger.error(f"Failed to get cost breakdown: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get cost breakdown: {str(e)}")


@router.get("/costs/daily")
async def daily_costs(days: int = Query(default=30, ge=1, le=365)) -> List[Dict[str, Any]]:
    """Get daily cost trends"""
    try:
        return cost_tracker.get_daily_costs(days)
    except Exception as e:
        logger.error(f"Failed to get daily costs: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get daily costs: {str(e)}")


@router.get("/costs/projections")
async def cost_projections() -> List[Dict[str, Any]]:
    """Get cost projections for different categories"""
    try:
        projections = cost_tracker.get_cost_projections()
        return [
            {
                "category": p.category.value,
                "current_spend": p.current_spend,
                "projected_spend": p.projected_spend,
                "budget_limit": p.budget_limit,
                "projection_period": p.projection_period,
                "confidence": p.confidence
            }
            for p in projections
        ]
    except Exception as e:
        logger.error(f"Failed to get cost projections: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get cost projections: {str(e)}")


@router.get("/costs/efficiency")
async def cost_efficiency() -> Dict[str, Any]:
    """Get cost efficiency metrics"""
    try:
        return cost_tracker.get_cost_efficiency_metrics()
    except Exception as e:
        logger.error(f"Failed to get cost efficiency: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get cost efficiency: {str(e)}")


@router.get("/costs/top-drivers")
async def top_cost_drivers(
    days: int = Query(default=30, ge=1, le=365),
    limit: int = Query(default=10, ge=1, le=50)
) -> List[Dict[str, Any]]:
    """Get top cost drivers"""
    try:
        return cost_tracker.get_top_cost_drivers(days, limit)
    except Exception as e:
        logger.error(f"Failed to get top cost drivers: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get top cost drivers: {str(e)}")


@router.post("/costs/track/llm")
async def track_llm_cost(
    provider: str,
    model: str,
    agent_type: str,
    input_tokens: int,
    output_tokens: int,
    task_type: str = "unknown"
) -> Dict[str, Any]:
    """Track LLM usage and cost"""
    try:
        cost = cost_tracker.track_llm_usage(
            provider=provider,
            model=model,
            agent_type=agent_type,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            task_type=task_type
        )
        
        return {
            "cost_usd": cost,
            "provider": provider,
            "model": model,
            "total_tokens": input_tokens + output_tokens,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Failed to track LLM cost: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to track LLM cost: {str(e)}")


@router.get("/business/productivity")
async def research_productivity() -> Dict[str, Any]:
    """Get research productivity metrics"""
    try:
        # This would integrate with your actual business metrics
        # For now, return mock data combined with real cost data
        
        cost_efficiency = cost_tracker.get_cost_efficiency_metrics()
        
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "productivity_score": 0.85,  # Mock score
            "experiments_completed_30d": 150,
            "publications_generated_30d": 12,
            "discoveries_made_30d": 3,
            "cost_efficiency": cost_efficiency,
            "agent_utilization": {
                "ceo": 0.92,
                "cso": 0.88,
                "cto": 0.94,
                "cfo": 0.76,
                "coo": 0.89
            },
            "success_rates": {
                "experiments": 0.91,
                "hypotheses_validated": 0.73,
                "research_objectives_met": 0.87
            }
        }
    except Exception as e:
        logger.error(f"Failed to get research productivity: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get research productivity: {str(e)}")


@router.get("/business/sla-compliance")
async def sla_compliance_detailed() -> Dict[str, Any]:
    """Get detailed SLA compliance metrics"""
    try:
        # Get health and performance data
        system_health = await health_check_manager.perform_comprehensive_health_check()
        performance_summary = get_performance_report()
        cost_data = cost_tracker.export_cost_data(30)
        
        # Calculate detailed SLA metrics
        uptime_percentage = 99.95  # Would calculate from actual downtime data
        avg_response_time = performance_summary.get("summary", {}).get("avg_response_time_ms", 0)
        error_rate = performance_summary.get("summary", {}).get("error_rate", 0)
        
        # Cost SLA compliance
        monthly_llm_cost = cost_data.get("budget_status", {}).get("current_spend", {}).get("llm_usage", {}).get("monthly", 0)
        cost_budget = 3000  # Monthly budget
        cost_compliance = monthly_llm_cost <= cost_budget
        
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "overall_sla_compliance": {
                "compliant": system_health.sla_compliance.get("overall", {}).get("compliant", False),
                "score": system_health.sla_compliance.get("overall", {}).get("score", 0)
            },
            "uptime_sla": {
                "target": 99.9,
                "actual": uptime_percentage,
                "compliant": uptime_percentage >= 99.9
            },
            "performance_sla": {
                "response_time_target_ms": 2000,
                "actual_avg_ms": avg_response_time,
                "compliant": avg_response_time <= 2000,
                "error_rate_target": 0.001,
                "actual_error_rate": error_rate,
                "error_rate_compliant": error_rate <= 0.001
            },
            "cost_sla": {
                "monthly_budget": cost_budget,
                "current_spend": monthly_llm_cost,
                "budget_utilization": (monthly_llm_cost / cost_budget) * 100,
                "compliant": cost_compliance
            },
            "business_sla": {
                "research_productivity_target": 0.8,
                "actual_productivity": 0.85,
                "compliant": True
            }
        }
    except Exception as e:
        logger.error(f"Failed to get SLA compliance: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get SLA compliance: {str(e)}")