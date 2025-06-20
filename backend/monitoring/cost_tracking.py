"""
Cost Tracking System for BioThings Platform
Comprehensive LLM cost monitoring and budget management
"""
import time
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from collections import defaultdict, deque
from enum import Enum
import logging
import json

from .prometheus_server import metrics_server

logger = logging.getLogger(__name__)


class CostCategory(Enum):
    """Cost categories for tracking"""
    LLM_USAGE = "llm_usage"
    COMPUTE = "compute"
    STORAGE = "storage"
    NETWORK = "network"
    EXTERNAL_APIS = "external_apis"


@dataclass
class CostEvent:
    """Individual cost event"""
    category: CostCategory
    provider: str
    service: str
    cost_usd: float
    quantity: float
    unit: str
    timestamp: str
    metadata: Optional[Dict[str, Any]] = None


@dataclass
class BudgetAlert:
    """Budget alert configuration"""
    category: CostCategory
    threshold_usd: float
    period: str  # daily, weekly, monthly
    alert_percentage: float  # 0.8 for 80% of budget
    enabled: bool = True


@dataclass
class CostProjection:
    """Cost projection for a time period"""
    category: CostCategory
    current_spend: float
    projected_spend: float
    budget_limit: Optional[float]
    projection_period: str
    confidence: float  # 0-1 confidence score


class LLMCostCalculator:
    """Calculate costs for different LLM providers"""
    
    # Cost per 1000 tokens (approximate pricing as of 2024)
    PRICING = {
        "openai": {
            "gpt-4": {"input": 0.03, "output": 0.06},
            "gpt-4-turbo": {"input": 0.01, "output": 0.03},
            "gpt-3.5-turbo": {"input": 0.0015, "output": 0.002},
            "text-embedding-ada-002": {"input": 0.0001, "output": 0}
        },
        "anthropic": {
            "claude-3-opus": {"input": 0.015, "output": 0.075},
            "claude-3-sonnet": {"input": 0.003, "output": 0.015},
            "claude-3-haiku": {"input": 0.00025, "output": 0.00125}
        },
        "google": {
            "gemini-pro": {"input": 0.0005, "output": 0.0015},
            "gemini-pro-vision": {"input": 0.0025, "output": 0.0075}
        },
        "cohere": {
            "command": {"input": 0.0015, "output": 0.002},
            "command-light": {"input": 0.0003, "output": 0.0006}
        }
    }
    
    @classmethod
    def calculate_llm_cost(cls, provider: str, model: str, 
                          input_tokens: int, output_tokens: int) -> float:
        """Calculate cost for LLM usage"""
        provider_pricing = cls.PRICING.get(provider.lower(), {})
        model_pricing = provider_pricing.get(model.lower(), {"input": 0.01, "output": 0.02})
        
        input_cost = (input_tokens / 1000) * model_pricing["input"]
        output_cost = (output_tokens / 1000) * model_pricing["output"]
        
        return input_cost + output_cost
    
    @classmethod
    def get_cost_per_token(cls, provider: str, model: str, token_type: str) -> float:
        """Get cost per token for specific model"""
        provider_pricing = cls.PRICING.get(provider.lower(), {})
        model_pricing = provider_pricing.get(model.lower(), {"input": 0.01, "output": 0.02})
        
        return model_pricing.get(token_type.lower(), 0.01) / 1000


class CostTracker:
    """Comprehensive cost tracking system"""
    
    def __init__(self):
        self.cost_events = deque(maxlen=50000)  # Keep last 50k events
        self.daily_budgets = {}
        self.monthly_budgets = {}
        self.budget_alerts = []
        self.cost_summaries = defaultdict(lambda: defaultdict(float))
        
        # Default budgets (can be configured)
        self.set_budget(CostCategory.LLM_USAGE, 200.0, "daily")
        self.set_budget(CostCategory.LLM_USAGE, 3000.0, "monthly")
        self.set_budget(CostCategory.COMPUTE, 100.0, "daily")
        self.set_budget(CostCategory.STORAGE, 50.0, "daily")
        
        # Alert thresholds
        self.add_budget_alert(CostCategory.LLM_USAGE, 200.0, "daily", 0.8)
        self.add_budget_alert(CostCategory.LLM_USAGE, 3000.0, "monthly", 0.9)
    
    def track_llm_usage(self, provider: str, model: str, agent_type: str,
                       input_tokens: int, output_tokens: int, 
                       task_type: str = "unknown") -> float:
        """Track LLM usage and calculate cost"""
        cost = LLMCostCalculator.calculate_llm_cost(
            provider, model, input_tokens, output_tokens
        )
        
        # Record cost event
        event = CostEvent(
            category=CostCategory.LLM_USAGE,
            provider=provider,
            service=model,
            cost_usd=cost,
            quantity=input_tokens + output_tokens,
            unit="tokens",
            timestamp=datetime.utcnow().isoformat(),
            metadata={
                "agent_type": agent_type,
                "task_type": task_type,
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "model": model
            }
        )
        
        self.record_cost_event(event)
        
        # Track in Prometheus
        if hasattr(metrics_server, 'track_llm_usage'):
            metrics_server.track_llm_usage(
                provider=provider,
                model=model,
                agent_type=agent_type,
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                cost=cost,
                response_time=0  # Would be provided by caller
            )
        
        return cost
    
    def track_compute_cost(self, service: str, instance_type: str, 
                          hours: float, cost_per_hour: float) -> float:
        """Track compute/infrastructure costs"""
        cost = hours * cost_per_hour
        
        event = CostEvent(
            category=CostCategory.COMPUTE,
            provider="aws",  # or configurable
            service=service,
            cost_usd=cost,
            quantity=hours,
            unit="hours",
            timestamp=datetime.utcnow().isoformat(),
            metadata={
                "instance_type": instance_type,
                "cost_per_hour": cost_per_hour
            }
        )
        
        self.record_cost_event(event)
        return cost
    
    def track_storage_cost(self, storage_gb: float, cost_per_gb: float, 
                          storage_type: str = "standard") -> float:
        """Track storage costs"""
        cost = storage_gb * cost_per_gb
        
        event = CostEvent(
            category=CostCategory.STORAGE,
            provider="aws",
            service="s3",
            cost_usd=cost,
            quantity=storage_gb,
            unit="gb",
            timestamp=datetime.utcnow().isoformat(),
            metadata={
                "storage_type": storage_type,
                "cost_per_gb": cost_per_gb
            }
        )
        
        self.record_cost_event(event)
        return cost
    
    def track_external_api_cost(self, api_name: str, requests: int, 
                               cost_per_request: float) -> float:
        """Track external API costs"""
        cost = requests * cost_per_request
        
        event = CostEvent(
            category=CostCategory.EXTERNAL_APIS,
            provider="external",
            service=api_name,
            cost_usd=cost,
            quantity=requests,
            unit="requests",
            timestamp=datetime.utcnow().isoformat(),
            metadata={
                "cost_per_request": cost_per_request
            }
        )
        
        self.record_cost_event(event)
        return cost
    
    def record_cost_event(self, event: CostEvent):
        """Record a cost event"""
        self.cost_events.append(event)
        
        # Update running summaries
        date_key = event.timestamp[:10]  # YYYY-MM-DD
        self.cost_summaries[date_key][event.category.value] += event.cost_usd
        
        # Check budget alerts
        self._check_budget_alerts(event)
    
    def set_budget(self, category: CostCategory, amount: float, period: str):
        """Set budget for a category and period"""
        if period == "daily":
            self.daily_budgets[category] = amount
        elif period == "monthly":
            self.monthly_budgets[category] = amount
        else:
            raise ValueError(f"Unsupported period: {period}")
    
    def add_budget_alert(self, category: CostCategory, threshold: float, 
                        period: str, alert_percentage: float):
        """Add budget alert configuration"""
        alert = BudgetAlert(
            category=category,
            threshold_usd=threshold,
            period=period,
            alert_percentage=alert_percentage
        )
        self.budget_alerts.append(alert)
    
    def _check_budget_alerts(self, event: CostEvent):
        """Check if any budget alerts should be triggered"""
        for alert in self.budget_alerts:
            if not alert.enabled or alert.category != event.category:
                continue
            
            # Get current spend for the period
            current_spend = self.get_spend_for_period(
                alert.category, alert.period
            )
            
            alert_threshold = alert.threshold_usd * alert.alert_percentage
            
            if current_spend >= alert_threshold:
                self._trigger_budget_alert(alert, current_spend)
    
    def _trigger_budget_alert(self, alert: BudgetAlert, current_spend: float):
        """Trigger a budget alert"""
        percentage_used = (current_spend / alert.threshold_usd) * 100
        
        alert_message = (
            f"Budget Alert: {alert.category.value} spending has reached "
            f"${current_spend:.2f} ({percentage_used:.1f}%) of the "
            f"{alert.period} budget (${alert.threshold_usd:.2f})"
        )
        
        logger.warning(alert_message)
        
        # Track alert in Prometheus
        if hasattr(metrics_server, 'track_security_event'):
            metrics_server.track_security_event("budget_alert", "warning")
    
    def get_spend_for_period(self, category: CostCategory, period: str) -> float:
        """Get spending for a category and period"""
        now = datetime.utcnow()
        
        if period == "daily":
            start_time = now.replace(hour=0, minute=0, second=0, microsecond=0)
        elif period == "weekly":
            start_time = now - timedelta(days=7)
        elif period == "monthly":
            start_time = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        else:
            raise ValueError(f"Unsupported period: {period}")
        
        total_spend = 0.0
        
        for event in self.cost_events:
            event_time = datetime.fromisoformat(event.timestamp)
            if (event_time >= start_time and 
                event.category == category):
                total_spend += event.cost_usd
        
        return total_spend
    
    def get_cost_breakdown(self, days: int = 30) -> Dict[str, Any]:
        """Get cost breakdown for the specified number of days"""
        cutoff_time = datetime.utcnow() - timedelta(days=days)
        
        breakdown = defaultdict(lambda: {
            'total_cost': 0.0,
            'providers': defaultdict(float),
            'services': defaultdict(float),
            'event_count': 0
        })
        
        for event in self.cost_events:
            event_time = datetime.fromisoformat(event.timestamp)
            if event_time >= cutoff_time:
                category = event.category.value
                breakdown[category]['total_cost'] += event.cost_usd
                breakdown[category]['providers'][event.provider] += event.cost_usd
                breakdown[category]['services'][event.service] += event.cost_usd
                breakdown[category]['event_count'] += 1
        
        # Convert defaultdicts to regular dicts for JSON serialization
        result = {}
        for category, data in breakdown.items():
            result[category] = {
                'total_cost': data['total_cost'],
                'providers': dict(data['providers']),
                'services': dict(data['services']),
                'event_count': data['event_count']
            }
        
        return result
    
    def get_daily_costs(self, days: int = 30) -> List[Dict[str, Any]]:
        """Get daily cost summary for the specified number of days"""
        daily_costs = defaultdict(lambda: defaultdict(float))
        
        cutoff_time = datetime.utcnow() - timedelta(days=days)
        
        for event in self.cost_events:
            event_time = datetime.fromisoformat(event.timestamp)
            if event_time >= cutoff_time:
                date_key = event.timestamp[:10]  # YYYY-MM-DD
                daily_costs[date_key][event.category.value] += event.cost_usd
                daily_costs[date_key]['total'] += event.cost_usd
        
        # Convert to list and sort by date
        result = []
        for date, costs in daily_costs.items():
            result.append({
                'date': date,
                'costs': dict(costs)
            })
        
        result.sort(key=lambda x: x['date'])
        return result
    
    def get_cost_projections(self) -> List[CostProjection]:
        """Get cost projections for different categories"""
        projections = []
        
        # Get last 7 days of data for trend analysis
        week_ago = datetime.utcnow() - timedelta(days=7)
        recent_events = [
            event for event in self.cost_events
            if datetime.fromisoformat(event.timestamp) >= week_ago
        ]
        
        # Group by category
        category_costs = defaultdict(list)
        for event in recent_events:
            category_costs[event.category].append(event.cost_usd)
        
        for category, costs in category_costs.items():
            daily_avg = sum(costs) / 7  # Average daily cost
            current_spend = self.get_spend_for_period(category, "monthly")
            
            # Project monthly cost
            days_in_month = 30  # Simplified
            projected_monthly = daily_avg * days_in_month
            
            # Get budget if available
            budget_limit = self.monthly_budgets.get(category)
            
            # Calculate confidence based on data variability
            if len(costs) > 1:
                avg_cost = sum(costs) / len(costs)
                variance = sum((x - avg_cost) ** 2 for x in costs) / len(costs)
                confidence = max(0.5, 1.0 - (variance / avg_cost) if avg_cost > 0 else 0.5)
            else:
                confidence = 0.5
            
            projection = CostProjection(
                category=category,
                current_spend=current_spend,
                projected_spend=projected_monthly,
                budget_limit=budget_limit,
                projection_period="monthly",
                confidence=confidence
            )
            
            projections.append(projection)
        
        return projections
    
    def get_top_cost_drivers(self, days: int = 30, limit: int = 10) -> List[Dict[str, Any]]:
        """Get top cost drivers for the specified period"""
        cutoff_time = datetime.utcnow() - timedelta(days=days)
        
        # Group costs by service/provider combination
        cost_drivers = defaultdict(lambda: {
            'total_cost': 0.0,
            'event_count': 0,
            'category': None,
            'provider': None,
            'service': None
        })
        
        for event in self.cost_events:
            event_time = datetime.fromisoformat(event.timestamp)
            if event_time >= cutoff_time:
                key = f"{event.provider}:{event.service}"
                driver = cost_drivers[key]
                driver['total_cost'] += event.cost_usd
                driver['event_count'] += 1
                driver['category'] = event.category.value
                driver['provider'] = event.provider
                driver['service'] = event.service
        
        # Sort by total cost and return top drivers
        top_drivers = sorted(
            cost_drivers.values(),
            key=lambda x: x['total_cost'],
            reverse=True
        )
        
        return top_drivers[:limit]
    
    def get_cost_efficiency_metrics(self) -> Dict[str, Any]:
        """Get cost efficiency metrics"""
        # This would integrate with business metrics
        # For now, provide basic efficiency calculations
        
        llm_costs_30d = self.get_spend_for_period(CostCategory.LLM_USAGE, "monthly")
        
        # Mock business metrics (would come from actual system)
        experiments_completed = 150  # Would get from metrics
        publications_generated = 12
        discoveries_made = 3
        
        return {
            "cost_per_experiment": llm_costs_30d / experiments_completed if experiments_completed > 0 else 0,
            "cost_per_publication": llm_costs_30d / publications_generated if publications_generated > 0 else 0,
            "cost_per_discovery": llm_costs_30d / discoveries_made if discoveries_made > 0 else 0,
            "total_llm_cost_30d": llm_costs_30d,
            "roi_score": self._calculate_roi_score(llm_costs_30d, experiments_completed, publications_generated)
        }
    
    def _calculate_roi_score(self, cost: float, experiments: int, publications: int) -> float:
        """Calculate simple ROI score (0-1)"""
        if cost == 0:
            return 1.0
        
        # Simple formula: value generated / cost
        # This would be more sophisticated in reality
        value_per_experiment = 100  # Assumed value
        value_per_publication = 1000
        
        total_value = (experiments * value_per_experiment) + (publications * value_per_publication)
        roi = total_value / cost if cost > 0 else 0
        
        # Normalize to 0-1 range (assuming ROI of 2.0 = perfect score)
        return min(1.0, roi / 2.0)
    
    def export_cost_data(self, days: int = 30) -> Dict[str, Any]:
        """Export comprehensive cost data"""
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "period_days": days,
            "cost_breakdown": self.get_cost_breakdown(days),
            "daily_costs": self.get_daily_costs(days),
            "projections": [asdict(p) for p in self.get_cost_projections()],
            "top_cost_drivers": self.get_top_cost_drivers(days),
            "efficiency_metrics": self.get_cost_efficiency_metrics(),
            "budget_status": {
                "daily_budgets": {k.value: v for k, v in self.daily_budgets.items()},
                "monthly_budgets": {k.value: v for k, v in self.monthly_budgets.items()},
                "current_spend": {
                    category.value: {
                        "daily": self.get_spend_for_period(category, "daily"),
                        "monthly": self.get_spend_for_period(category, "monthly")
                    }
                    for category in CostCategory
                }
            }
        }


# Global cost tracker instance
cost_tracker = CostTracker()