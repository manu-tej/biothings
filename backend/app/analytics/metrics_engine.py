"""
Advanced Metrics and Analytics Engine for BioThings
Real-time tracking and predictive analytics
"""
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum
import json
import asyncio
from collections import defaultdict
import structlog

from app.core.llm import llm_service

logger = structlog.get_logger()


class MetricType(str, Enum):
    """Types of metrics tracked"""
    FINANCIAL = "financial"
    OPERATIONAL = "operational"
    SCIENTIFIC = "scientific"
    REGULATORY = "regulatory"
    MARKET = "market"


@dataclass
class Metric:
    """Individual metric data point"""
    id: str
    type: MetricType
    name: str
    value: float
    unit: str
    timestamp: datetime
    tags: Dict[str, str]
    confidence: float = 1.0


@dataclass
class KPI:
    """Key Performance Indicator"""
    id: str
    name: str
    description: str
    target: float
    current: float
    unit: str
    trend: str  # "up", "down", "stable"
    health: str  # "good", "warning", "critical"


class MetricsEngine:
    """Advanced metrics tracking and analytics"""
    
    def __init__(self):
        self.metrics_store: Dict[str, List[Metric]] = defaultdict(list)
        self.kpis = self._initialize_kpis()
        self.alerts: List[Dict[str, Any]] = []
        self.llm_enabled = bool(llm_service.llm)
    
    def _initialize_kpis(self) -> Dict[str, KPI]:
        """Initialize default KPIs"""
        return {
            "cash_burn": KPI(
                id="cash_burn",
                name="Monthly Cash Burn Rate",
                description="Average monthly cash expenditure",
                target=2000000,  # $2M/month
                current=1800000,
                unit="USD/month",
                trend="stable",
                health="good"
            ),
            "research_productivity": KPI(
                id="research_productivity",
                name="Research Productivity Index",
                description="Experiments completed vs planned",
                target=0.90,
                current=0.85,
                unit="ratio",
                trend="up",
                health="warning"
            ),
            "pipeline_value": KPI(
                id="pipeline_value",
                name="Pipeline NPV",
                description="Net present value of drug pipeline",
                target=1000000000,  # $1B
                current=750000000,
                unit="USD",
                trend="up",
                health="good"
            ),
            "clinical_success": KPI(
                id="clinical_success",
                name="Clinical Trial Success Rate",
                description="Percentage of trials meeting endpoints",
                target=0.70,
                current=0.65,
                unit="percentage",
                trend="stable",
                health="warning"
            ),
            "regulatory_compliance": KPI(
                id="regulatory_compliance",
                name="Regulatory Compliance Score",
                description="Compliance with FDA/EMA requirements",
                target=0.95,
                current=0.98,
                unit="score",
                trend="stable",
                health="good"
            )
        }
    
    async def record_metric(self, metric: Metric):
        """Record a new metric"""
        self.metrics_store[metric.type.value].append(metric)
        
        # Update related KPIs
        await self._update_kpis(metric)
        
        # Check for alerts
        await self._check_alerts(metric)
    
    async def _update_kpis(self, metric: Metric):
        """Update KPIs based on new metric"""
        # Map metrics to KPIs
        metric_kpi_map = {
            "cash_spent": "cash_burn",
            "experiments_completed": "research_productivity",
            "drug_valuation": "pipeline_value",
            "trial_success": "clinical_success",
            "compliance_score": "regulatory_compliance"
        }
        
        for metric_name, kpi_id in metric_kpi_map.items():
            if metric_name in metric.name.lower() and kpi_id in self.kpis:
                kpi = self.kpis[kpi_id]
                
                # Update current value (simplified - in reality would aggregate)
                kpi.current = metric.value
                
                # Update trend
                recent_metrics = self._get_recent_metrics(metric.type, metric.name, days=7)
                if len(recent_metrics) > 1:
                    if recent_metrics[-1].value > recent_metrics[0].value:
                        kpi.trend = "up"
                    elif recent_metrics[-1].value < recent_metrics[0].value:
                        kpi.trend = "down"
                    else:
                        kpi.trend = "stable"
                
                # Update health status
                if kpi.current >= kpi.target * 0.9:
                    kpi.health = "good"
                elif kpi.current >= kpi.target * 0.7:
                    kpi.health = "warning"
                else:
                    kpi.health = "critical"
    
    async def _check_alerts(self, metric: Metric):
        """Check if metric triggers any alerts"""
        # Define alert thresholds
        alert_rules = {
            "cash_spent": {"threshold": 3000000, "condition": "greater"},
            "experiment_failure": {"threshold": 0.3, "condition": "greater"},
            "regulatory_violation": {"threshold": 1, "condition": "greater_equal"}
        }
        
        for rule_name, rule in alert_rules.items():
            if rule_name in metric.name.lower():
                if rule["condition"] == "greater" and metric.value > rule["threshold"]:
                    await self._create_alert(metric, rule_name, rule["threshold"])
                elif rule["condition"] == "greater_equal" and metric.value >= rule["threshold"]:
                    await self._create_alert(metric, rule_name, rule["threshold"])
    
    async def _create_alert(self, metric: Metric, rule_name: str, threshold: float):
        """Create an alert"""
        alert = {
            "id": f"alert_{datetime.now().strftime('%Y%m%d%H%M%S')}",
            "timestamp": datetime.now().isoformat(),
            "severity": "high" if "violation" in rule_name else "medium",
            "metric": metric.name,
            "value": metric.value,
            "threshold": threshold,
            "message": f"{metric.name} exceeded threshold: {metric.value} > {threshold}"
        }
        
        self.alerts.append(alert)
        logger.warning(f"Alert created: {alert['message']}")
    
    def _get_recent_metrics(self, 
                          metric_type: MetricType,
                          name_filter: str,
                          days: int = 30) -> List[Metric]:
        """Get recent metrics by type and name"""
        cutoff = datetime.now() - timedelta(days=days)
        
        return [
            m for m in self.metrics_store[metric_type.value]
            if name_filter.lower() in m.name.lower() and m.timestamp > cutoff
        ]
    
    async def generate_executive_report(self) -> str:
        """Generate executive report using LLM"""
        if not self.llm_enabled:
            return "Executive report generation requires LLM"
        
        # Gather current state
        kpi_summary = {
            kpi.name: {
                "current": kpi.current,
                "target": kpi.target,
                "trend": kpi.trend,
                "health": kpi.health,
                "unit": kpi.unit
            }
            for kpi in self.kpis.values()
        }
        
        recent_alerts = self.alerts[-5:] if self.alerts else []
        
        prompt = f"""
        Generate an executive summary report for biotech company performance:
        
        KPIs:
        {json.dumps(kpi_summary, indent=2)}
        
        Recent Alerts:
        {json.dumps(recent_alerts, indent=2)}
        
        Provide:
        1. Executive summary (2-3 sentences)
        2. Key achievements
        3. Areas of concern
        4. Recommended actions
        5. 30-day outlook
        """
        
        report = await llm_service.generate_response(
            agent_id="report-generator",
            system_prompt="You are a biotech analytics expert creating executive reports.",
            user_message=prompt
        )
        
        return report
    
    async def predict_metrics(self, 
                            metric_type: MetricType,
                            metric_name: str,
                            days_ahead: int = 30) -> Dict[str, Any]:
        """Predict future metric values using LLM analysis"""
        if not self.llm_enabled:
            return {"error": "Predictions require LLM"}
        
        # Get historical data
        historical = self._get_recent_metrics(metric_type, metric_name, days=90)
        
        if len(historical) < 10:
            return {"error": "Insufficient historical data"}
        
        # Prepare data for LLM
        historical_summary = [
            {
                "date": m.timestamp.strftime("%Y-%m-%d"),
                "value": m.value,
                "tags": m.tags
            }
            for m in historical[-20:]  # Last 20 data points
        ]
        
        prompt = f"""
        Analyze this biotech metric trend and predict future values:
        
        Metric: {metric_name} ({metric_type.value})
        Historical data:
        {json.dumps(historical_summary, indent=2)}
        
        Predict:
        1. Value in {days_ahead} days
        2. Confidence level (0-1)
        3. Key factors affecting prediction
        4. Potential risks
        """
        
        prediction_response = await llm_service.generate_response(
            agent_id="metric-predictor",
            system_prompt="You are a biotech data scientist specializing in predictive analytics.",
            user_message=prompt
        )
        
        # Parse response (in production, use structured output)
        return {
            "metric": metric_name,
            "prediction_date": (datetime.now() + timedelta(days=days_ahead)).isoformat(),
            "predicted_value": historical[-1].value * 1.1,  # Placeholder
            "confidence": 0.75,
            "analysis": prediction_response
        }
    
    async def benchmark_analysis(self, 
                               company_type: str = "biotech_startup") -> Dict[str, Any]:
        """Compare metrics against industry benchmarks"""
        if not self.llm_enabled:
            return {"error": "Benchmark analysis requires LLM"}
        
        current_metrics = {
            kpi.name: {
                "value": kpi.current,
                "unit": kpi.unit
            }
            for kpi in self.kpis.values()
        }
        
        prompt = f"""
        Compare these biotech company metrics against industry benchmarks:
        
        Company type: {company_type}
        Current metrics:
        {json.dumps(current_metrics, indent=2)}
        
        Provide:
        1. Industry benchmark for each metric
        2. Percentile ranking (e.g., top 10%, median, bottom quartile)
        3. Competitive analysis
        4. Improvement recommendations
        """
        
        benchmark_analysis = await llm_service.generate_response(
            agent_id="benchmark-analyst",
            system_prompt="You are a biotech industry analyst with deep knowledge of benchmarks.",
            user_message=prompt
        )
        
        return {
            "company_type": company_type,
            "analysis_date": datetime.now().isoformat(),
            "current_metrics": current_metrics,
            "benchmark_analysis": benchmark_analysis
        }
    
    def get_dashboard_data(self) -> Dict[str, Any]:
        """Get data for dashboard display"""
        return {
            "kpis": [
                {
                    "id": kpi.id,
                    "name": kpi.name,
                    "value": kpi.current,
                    "target": kpi.target,
                    "unit": kpi.unit,
                    "trend": kpi.trend,
                    "health": kpi.health,
                    "percentage": (kpi.current / kpi.target * 100) if kpi.target > 0 else 0
                }
                for kpi in self.kpis.values()
            ],
            "recent_alerts": self.alerts[-10:],
            "metrics_summary": {
                metric_type: len(metrics)
                for metric_type, metrics in self.metrics_store.items()
            }
        }
    
    async def anomaly_detection(self) -> List[Dict[str, Any]]:
        """Detect anomalies in metrics"""
        anomalies = []
        
        for metric_type, metrics in self.metrics_store.items():
            if len(metrics) < 10:
                continue
            
            # Group by metric name
            by_name = defaultdict(list)
            for m in metrics:
                by_name[m.name].append(m)
            
            for name, metric_list in by_name.items():
                if len(metric_list) < 10:
                    continue
                
                # Simple anomaly detection: values outside 2 standard deviations
                values = [m.value for m in metric_list]
                mean = sum(values) / len(values)
                variance = sum((x - mean) ** 2 for x in values) / len(values)
                std_dev = variance ** 0.5
                
                for m in metric_list[-5:]:  # Check recent metrics
                    if abs(m.value - mean) > 2 * std_dev:
                        anomalies.append({
                            "metric": m.name,
                            "value": m.value,
                            "expected_range": f"{mean - 2*std_dev:.2f} - {mean + 2*std_dev:.2f}",
                            "timestamp": m.timestamp.isoformat(),
                            "severity": "high" if abs(m.value - mean) > 3 * std_dev else "medium"
                        })
        
        return anomalies
    
    async def scenario_analysis(self, 
                              scenarios: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze impact of different scenarios on metrics"""
        if not self.llm_enabled:
            return {"error": "Scenario analysis requires LLM"}
        
        current_state = {
            kpi.name: kpi.current
            for kpi in self.kpis.values()
        }
        
        prompt = f"""
        Analyze how these scenarios would impact biotech company metrics:
        
        Current state:
        {json.dumps(current_state, indent=2)}
        
        Scenarios to analyze:
        {json.dumps(scenarios, indent=2)}
        
        For each scenario, provide:
        1. Impact on each KPI (percentage change)
        2. Timeline for impact
        3. Probability of scenario
        4. Mitigation strategies
        """
        
        analysis = await llm_service.generate_response(
            agent_id="scenario-analyst",
            system_prompt="You are a strategic analyst specializing in biotech scenario planning.",
            user_message=prompt
        )
        
        return {
            "base_case": current_state,
            "scenarios": scenarios,
            "analysis": analysis,
            "generated_at": datetime.now().isoformat()
        }


# Global instance
metrics_engine = MetricsEngine()