"""
Grafana Dashboard Configurations for BioThings Platform
Programmatic dashboard creation and management
"""
import json
from typing import Dict, List, Any, Optional
from datetime import datetime
from dataclasses import dataclass, asdict


@dataclass
class Panel:
    """Grafana panel configuration"""
    id: int
    title: str
    type: str
    targets: List[Dict[str, Any]]
    gridPos: Dict[str, int]
    options: Optional[Dict[str, Any]] = None
    fieldConfig: Optional[Dict[str, Any]] = None
    yAxes: Optional[List[Dict[str, Any]]] = None


@dataclass
class Dashboard:
    """Grafana dashboard configuration"""
    id: Optional[int]
    title: str
    tags: List[str]
    timezone: str
    panels: List[Panel]
    time: Dict[str, str]
    refresh: str
    schemaVersion: int = 27
    version: int = 1


class GrafanaDashboardGenerator:
    """Generate Grafana dashboards for BioThings monitoring"""
    
    def __init__(self):
        self.dashboards = {}
        self.panel_id_counter = 1
    
    def _get_next_panel_id(self) -> int:
        """Get the next available panel ID"""
        panel_id = self.panel_id_counter
        self.panel_id_counter += 1
        return panel_id
    
    def _create_prometheus_target(self, expr: str, legend: str = "", interval: str = "30s") -> Dict[str, Any]:
        """Create a Prometheus query target"""
        return {
            "expr": expr,
            "format": "time_series",
            "intervalFactor": 1,
            "legendFormat": legend,
            "refId": "A",
            "step": 30
        }
    
    def _create_grid_pos(self, x: int, y: int, w: int, h: int) -> Dict[str, int]:
        """Create grid position for panel"""
        return {"h": h, "w": w, "x": x, "y": y}
    
    def create_system_overview_dashboard(self) -> Dashboard:
        """Create system overview dashboard"""
        panels = []
        
        # System Health Status Panel
        panels.append(Panel(
            id=self._get_next_panel_id(),
            title="System Health Status",
            type="stat",
            targets=[
                self._create_prometheus_target(
                    'up{job="biothings"}',
                    "System Status"
                )
            ],
            gridPos=self._create_grid_pos(0, 0, 4, 3),
            options={
                "colorMode": "background",
                "graphMode": "none",
                "justifyMode": "center",
                "orientation": "horizontal",
                "reduceOptions": {
                    "calcs": ["lastNotNull"],
                    "fields": "",
                    "values": False
                },
                "text": {},
                "textMode": "auto"
            },
            fieldConfig={
                "defaults": {
                    "color": {"mode": "thresholds"},
                    "mappings": [
                        {"options": {"0": {"text": "DOWN"}}, "type": "value"},
                        {"options": {"1": {"text": "UP"}}, "type": "value"}
                    ],
                    "thresholds": {
                        "mode": "absolute",
                        "steps": [
                            {"color": "red", "value": None},
                            {"color": "green", "value": 1}
                        ]
                    }
                }
            }
        ))
        
        # CPU Usage Panel
        panels.append(Panel(
            id=self._get_next_panel_id(),
            title="CPU Usage",
            type="graph",
            targets=[
                self._create_prometheus_target(
                    'biothings_cpu_usage_percent',
                    "CPU %"
                )
            ],
            gridPos=self._create_grid_pos(4, 0, 8, 8),
            yAxes=[
                {"label": "Percent", "max": 100, "min": 0},
                {"show": False}
            ]
        ))
        
        # Memory Usage Panel
        panels.append(Panel(
            id=self._get_next_panel_id(),
            title="Memory Usage",
            type="graph",
            targets=[
                self._create_prometheus_target(
                    'biothings_memory_usage_percent',
                    "Memory %"
                )
            ],
            gridPos=self._create_grid_pos(12, 0, 8, 8),
            yAxes=[
                {"label": "Percent", "max": 100, "min": 0},
                {"show": False}
            ]
        ))
        
        # Active Agents Panel
        panels.append(Panel(
            id=self._get_next_panel_id(),
            title="Active Agents",
            type="stat",
            targets=[
                self._create_prometheus_target(
                    'sum(biothings_agents_active)',
                    "Total Active Agents"
                )
            ],
            gridPos=self._create_grid_pos(20, 0, 4, 3)
        ))
        
        # HTTP Request Rate Panel
        panels.append(Panel(
            id=self._get_next_panel_id(),
            title="HTTP Request Rate",
            type="graph",
            targets=[
                self._create_prometheus_target(
                    'rate(biothings_http_requests_total[5m])',
                    "Requests/sec"
                )
            ],
            gridPos=self._create_grid_pos(0, 8, 12, 8)
        ))
        
        # WebSocket Connections Panel
        panels.append(Panel(
            id=self._get_next_panel_id(),
            title="WebSocket Connections",
            type="graph",
            targets=[
                self._create_prometheus_target(
                    'biothings_websocket_connections_active',
                    "Active Connections"
                )
            ],
            gridPos=self._create_grid_pos(12, 8, 12, 8)
        ))
        
        return Dashboard(
            id=None,
            title="BioThings System Overview",
            tags=["biothings", "system", "overview"],
            timezone="UTC",
            panels=panels,
            time={"from": "now-1h", "to": "now"},
            refresh="30s"
        )
    
    def create_agent_performance_dashboard(self) -> Dashboard:
        """Create agent performance dashboard"""
        panels = []
        
        # Agent Task Rate Panel
        panels.append(Panel(
            id=self._get_next_panel_id(),
            title="Agent Task Rate by Type",
            type="graph",
            targets=[
                self._create_prometheus_target(
                    'rate(biothings_agent_tasks_total[5m])',
                    "{{agent_type}} - {{task_type}}"
                )
            ],
            gridPos=self._create_grid_pos(0, 0, 12, 8)
        ))
        
        # Agent Response Time Panel
        panels.append(Panel(
            id=self._get_next_panel_id(),
            title="Agent Response Time",
            type="graph",
            targets=[
                self._create_prometheus_target(
                    'histogram_quantile(0.95, rate(biothings_agent_task_duration_seconds_bucket[5m]))',
                    "95th percentile"
                ),
                self._create_prometheus_target(
                    'histogram_quantile(0.50, rate(biothings_agent_task_duration_seconds_bucket[5m]))',
                    "50th percentile"
                )
            ],
            gridPos=self._create_grid_pos(12, 0, 12, 8)
        ))
        
        # Agent Error Rate Panel
        panels.append(Panel(
            id=self._get_next_panel_id(),
            title="Agent Error Rate",
            type="graph",
            targets=[
                self._create_prometheus_target(
                    'rate(biothings_agent_errors_total[5m])',
                    "{{agent_type}} - {{error_type}}"
                )
            ],
            gridPos=self._create_grid_pos(0, 8, 12, 8)
        ))
        
        # Agent Success Rate Panel
        panels.append(Panel(
            id=self._get_next_panel_id(),
            title="Agent Success Rate",
            type="stat",
            targets=[
                self._create_prometheus_target(
                    'rate(biothings_agent_tasks_total{status="success"}[5m]) / rate(biothings_agent_tasks_total[5m]) * 100',
                    "Success Rate %"
                )
            ],
            gridPos=self._create_grid_pos(12, 8, 12, 8),
            fieldConfig={
                "defaults": {
                    "color": {"mode": "thresholds"},
                    "unit": "percent",
                    "thresholds": {
                        "mode": "absolute",
                        "steps": [
                            {"color": "red", "value": None},
                            {"color": "yellow", "value": 90},
                            {"color": "green", "value": 95}
                        ]
                    }
                }
            }
        ))
        
        return Dashboard(
            id=None,
            title="BioThings Agent Performance",
            tags=["biothings", "agents", "performance"],
            timezone="UTC",
            panels=panels,
            time={"from": "now-1h", "to": "now"},
            refresh="30s"
        )
    
    def create_business_intelligence_dashboard(self) -> Dashboard:
        """Create business intelligence dashboard"""
        panels = []
        
        # Research Productivity Score Panel
        panels.append(Panel(
            id=self._get_next_panel_id(),
            title="Research Productivity Score",
            type="stat",
            targets=[
                self._create_prometheus_target(
                    'biothings_research_productivity_score',
                    "Productivity Score"
                )
            ],
            gridPos=self._create_grid_pos(0, 0, 6, 4),
            fieldConfig={
                "defaults": {
                    "color": {"mode": "thresholds"},
                    "max": 1,
                    "min": 0,
                    "unit": "percentunit",
                    "thresholds": {
                        "mode": "absolute",
                        "steps": [
                            {"color": "red", "value": None},
                            {"color": "yellow", "value": 0.6},
                            {"color": "green", "value": 0.8}
                        ]
                    }
                }
            }
        ))
        
        # Experiments Completed Panel
        panels.append(Panel(
            id=self._get_next_panel_id(),
            title="Experiments Completed Today",
            type="stat",
            targets=[
                self._create_prometheus_target(
                    'increase(biothings_experiments_total{status="success"}[24h])',
                    "Completed Experiments"
                )
            ],
            gridPos=self._create_grid_pos(6, 0, 6, 4)
        ))
        
        # Active Experiments Panel
        panels.append(Panel(
            id=self._get_next_panel_id(),
            title="Active Experiments",
            type="stat",
            targets=[
                self._create_prometheus_target(
                    'sum(biothings_experiments_active)',
                    "Active Experiments"
                )
            ],
            gridPos=self._create_grid_pos(12, 0, 6, 4)
        ))
        
        # Experiment Success Rate Panel
        panels.append(Panel(
            id=self._get_next_panel_id(),
            title="Experiment Success Rate",
            type="stat",
            targets=[
                self._create_prometheus_target(
                    'avg(biothings_experiment_success_rate) * 100',
                    "Success Rate %"
                )
            ],
            gridPos=self._create_grid_pos(18, 0, 6, 4),
            fieldConfig={
                "defaults": {
                    "color": {"mode": "thresholds"},
                    "unit": "percent",
                    "thresholds": {
                        "mode": "absolute",
                        "steps": [
                            {"color": "red", "value": None},
                            {"color": "yellow", "value": 80},
                            {"color": "green", "value": 90}
                        ]
                    }
                }
            }
        ))
        
        # Experiment Duration Distribution Panel
        panels.append(Panel(
            id=self._get_next_panel_id(),
            title="Experiment Duration Distribution",
            type="graph",
            targets=[
                self._create_prometheus_target(
                    'histogram_quantile(0.95, rate(biothings_experiment_duration_seconds_bucket[1h]))',
                    "95th percentile"
                ),
                self._create_prometheus_target(
                    'histogram_quantile(0.50, rate(biothings_experiment_duration_seconds_bucket[1h]))',
                    "Median"
                )
            ],
            gridPos=self._create_grid_pos(0, 4, 12, 8)
        ))
        
        # Publications Generated Panel
        panels.append(Panel(
            id=self._get_next_panel_id(),
            title="Publications Generated",
            type="graph",
            targets=[
                self._create_prometheus_target(
                    'increase(biothings_publications_generated_total[24h])',
                    "{{publication_type}}"
                )
            ],
            gridPos=self._create_grid_pos(12, 4, 12, 8)
        ))
        
        return Dashboard(
            id=None,
            title="BioThings Business Intelligence",
            tags=["biothings", "business", "research"],
            timezone="UTC",
            panels=panels,
            time={"from": "now-24h", "to": "now"},
            refresh="5m"
        )
    
    def create_cost_analysis_dashboard(self) -> Dashboard:
        """Create cost analysis dashboard"""
        panels = []
        
        # Total LLM Cost Today Panel
        panels.append(Panel(
            id=self._get_next_panel_id(),
            title="LLM Cost Today",
            type="stat",
            targets=[
                self._create_prometheus_target(
                    'increase(biothings_llm_cost_total[24h])',
                    "Cost ($)"
                )
            ],
            gridPos=self._create_grid_pos(0, 0, 6, 4),
            fieldConfig={
                "defaults": {
                    "color": {"mode": "thresholds"},
                    "unit": "currencyUSD",
                    "thresholds": {
                        "mode": "absolute",
                        "steps": [
                            {"color": "green", "value": None},
                            {"color": "yellow", "value": 100},
                            {"color": "red", "value": 500}
                        ]
                    }
                }
            }
        ))
        
        # Cost by Provider Panel
        panels.append(Panel(
            id=self._get_next_panel_id(),
            title="Cost by Provider",
            type="piechart",
            targets=[
                self._create_prometheus_target(
                    'sum by (provider) (increase(biothings_llm_cost_total[24h]))',
                    "{{provider}}"
                )
            ],
            gridPos=self._create_grid_pos(6, 0, 6, 8)
        ))
        
        # Cost by Agent Type Panel
        panels.append(Panel(
            id=self._get_next_panel_id(),
            title="Cost by Agent Type",
            type="piechart",
            targets=[
                self._create_prometheus_target(
                    'sum by (agent_type) (increase(biothings_llm_cost_total[24h]))',
                    "{{agent_type}}"
                )
            ],
            gridPos=self._create_grid_pos(12, 0, 6, 8)
        ))
        
        # Token Usage Panel
        panels.append(Panel(
            id=self._get_next_panel_id(),
            title="Token Usage Rate",
            type="graph",
            targets=[
                self._create_prometheus_target(
                    'rate(biothings_llm_tokens_total{token_type="input"}[5m])',
                    "Input Tokens/sec"
                ),
                self._create_prometheus_target(
                    'rate(biothings_llm_tokens_total{token_type="output"}[5m])',
                    "Output Tokens/sec"
                )
            ],
            gridPos=self._create_grid_pos(18, 0, 6, 8)
        ))
        
        # Monthly Cost Projection Panel
        panels.append(Panel(
            id=self._get_next_panel_id(),
            title="Monthly Cost Projection",
            type="stat",
            targets=[
                self._create_prometheus_target(
                    'avg_over_time(rate(biothings_llm_cost_total[1h])[24h:1h]) * 24 * 30',
                    "Projected Monthly Cost"
                )
            ],
            gridPos=self._create_grid_pos(0, 4, 6, 4),
            fieldConfig={
                "defaults": {
                    "color": {"mode": "thresholds"},
                    "unit": "currencyUSD",
                    "thresholds": {
                        "mode": "absolute",
                        "steps": [
                            {"color": "green", "value": None},
                            {"color": "yellow", "value": 1000},
                            {"color": "red", "value": 5000}
                        ]
                    }
                }
            }
        ))
        
        return Dashboard(
            id=None,
            title="BioThings Cost Analysis",
            tags=["biothings", "cost", "llm"],
            timezone="UTC",
            panels=panels,
            time={"from": "now-24h", "to": "now"},
            refresh="5m"
        )
    
    def create_security_dashboard(self) -> Dashboard:
        """Create security monitoring dashboard"""
        panels = []
        
        # Security Events Panel
        panels.append(Panel(
            id=self._get_next_panel_id(),
            title="Security Events (Last 24h)",
            type="stat",
            targets=[
                self._create_prometheus_target(
                    'increase(biothings_security_events_total[24h])',
                    "Security Events"
                )
            ],
            gridPos=self._create_grid_pos(0, 0, 6, 4),
            fieldConfig={
                "defaults": {
                    "color": {"mode": "thresholds"},
                    "thresholds": {
                        "mode": "absolute",
                        "steps": [
                            {"color": "green", "value": None},
                            {"color": "yellow", "value": 10},
                            {"color": "red", "value": 50}
                        ]
                    }
                }
            }
        ))
        
        # Authentication Attempts Panel
        panels.append(Panel(
            id=self._get_next_panel_id(),
            title="Authentication Attempts",
            type="graph",
            targets=[
                self._create_prometheus_target(
                    'rate(biothings_authentication_attempts_total{result="success"}[5m])',
                    "Successful"
                ),
                self._create_prometheus_target(
                    'rate(biothings_authentication_attempts_total{result="failure"}[5m])',
                    "Failed"
                )
            ],
            gridPos=self._create_grid_pos(6, 0, 12, 8)
        ))
        
        # Rate Limit Hits Panel
        panels.append(Panel(
            id=self._get_next_panel_id(),
            title="Rate Limit Hits",
            type="graph",
            targets=[
                self._create_prometheus_target(
                    'rate(biothings_rate_limit_hits_total[5m])',
                    "{{endpoint}}"
                )
            ],
            gridPos=self._create_grid_pos(18, 0, 6, 8)
        ))
        
        return Dashboard(
            id=None,
            title="BioThings Security Monitoring",
            tags=["biothings", "security", "monitoring"],
            timezone="UTC",
            panels=panels,
            time={"from": "now-24h", "to": "now"},
            refresh="1m"
        )
    
    def generate_all_dashboards(self) -> Dict[str, Dashboard]:
        """Generate all dashboards"""
        self.dashboards = {
            "system_overview": self.create_system_overview_dashboard(),
            "agent_performance": self.create_agent_performance_dashboard(),
            "business_intelligence": self.create_business_intelligence_dashboard(),
            "cost_analysis": self.create_cost_analysis_dashboard(),
            "security_monitoring": self.create_security_dashboard()
        }
        return self.dashboards
    
    def export_dashboard_json(self, dashboard: Dashboard) -> str:
        """Export dashboard as Grafana JSON"""
        dashboard_dict = asdict(dashboard)
        
        # Convert panels to proper format
        dashboard_dict["panels"] = [asdict(panel) for panel in dashboard.panels]
        
        return json.dumps(dashboard_dict, indent=2)
    
    def export_all_dashboards(self, output_dir: str = "."):
        """Export all dashboards to JSON files"""
        import os
        
        dashboards = self.generate_all_dashboards()
        
        for name, dashboard in dashboards.items():
            filename = f"{output_dir}/biothings_{name}_dashboard.json"
            with open(filename, 'w') as f:
                f.write(self.export_dashboard_json(dashboard))
            print(f"Exported dashboard: {filename}")


# Dashboard configuration templates
DASHBOARD_CONFIGS = {
    "datasource": {
        "name": "BioThings Prometheus",
        "type": "prometheus",
        "url": "http://localhost:9090",
        "access": "proxy",
        "isDefault": True
    },
    "notification_channels": [
        {
            "name": "biothings-alerts",
            "type": "slack",
            "settings": {
                "url": "${SLACK_WEBHOOK_URL}",
                "channel": "#biothings-alerts",
                "username": "Grafana"
            }
        }
    ]
}


if __name__ == "__main__":
    # Generate and export all dashboards
    generator = GrafanaDashboardGenerator()
    generator.export_all_dashboards("/Users/manuarrojwala/biothings/backend/monitoring/dashboards")