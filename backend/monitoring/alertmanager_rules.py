"""
AlertManager Rules Configuration for BioThings Platform
Defines critical alerting rules for production monitoring
"""
import yaml
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict
from datetime import timedelta


@dataclass
class AlertRule:
    """AlertManager rule definition"""
    alert: str
    expr: str
    for_: str
    labels: Dict[str, str]
    annotations: Dict[str, str]


@dataclass
class RuleGroup:
    """Group of related alert rules"""
    name: str
    interval: str
    rules: List[AlertRule]


class AlertManagerRuleBuilder:
    """Build AlertManager rules for BioThings monitoring"""
    
    def __init__(self):
        self.rule_groups = []
    
    def create_system_health_rules(self) -> RuleGroup:
        """Create system health monitoring rules"""
        rules = []
        
        # System Down Alert
        rules.append(AlertRule(
            alert="BioThingsSystemDown",
            expr='up{job="biothings"} == 0',
            for_="30s",
            labels={
                "severity": "critical",
                "component": "system",
                "sla_impact": "high"
            },
            annotations={
                "summary": "BioThings system is down",
                "description": "The BioThings system has been down for more than 30 seconds. This is a critical SLA breach.",
                "runbook_url": "https://docs.biothings.com/runbooks/system-down",
                "action_required": "Immediate investigation and recovery required"
            }
        ))
        
        # High CPU Usage Alert
        rules.append(AlertRule(
            alert="BioThingsHighCPUUsage",
            expr="biothings_cpu_usage_percent > 85",
            for_="5m",
            labels={
                "severity": "warning",
                "component": "system",
                "sla_impact": "medium"
            },
            annotations={
                "summary": "High CPU usage detected",
                "description": "CPU usage is above 85% for more than 5 minutes. Current usage: {{ $value }}%",
                "runbook_url": "https://docs.biothings.com/runbooks/high-cpu",
                "action_required": "Monitor system performance and consider scaling"
            }
        ))
        
        # Critical CPU Usage Alert
        rules.append(AlertRule(
            alert="BioThingsCriticalCPUUsage",
            expr="biothings_cpu_usage_percent > 95",
            for_="2m",
            labels={
                "severity": "critical",
                "component": "system",
                "sla_impact": "high"
            },
            annotations={
                "summary": "Critical CPU usage detected",
                "description": "CPU usage is above 95% for more than 2 minutes. Current usage: {{ $value }}%. System may become unresponsive.",
                "runbook_url": "https://docs.biothings.com/runbooks/critical-cpu",
                "action_required": "Immediate action required - scale or investigate high CPU processes"
            }
        ))
        
        # High Memory Usage Alert
        rules.append(AlertRule(
            alert="BioThingsHighMemoryUsage",
            expr="biothings_memory_usage_percent > 80",
            for_="5m",
            labels={
                "severity": "warning",
                "component": "system",
                "sla_impact": "medium"
            },
            annotations={
                "summary": "High memory usage detected",
                "description": "Memory usage is above 80% for more than 5 minutes. Current usage: {{ $value }}%",
                "runbook_url": "https://docs.biothings.com/runbooks/high-memory",
                "action_required": "Monitor memory usage and consider scaling"
            }
        ))
        
        # Critical Memory Usage Alert
        rules.append(AlertRule(
            alert="BioThingsCriticalMemoryUsage",
            expr="biothings_memory_usage_percent > 90",
            for_="2m",
            labels={
                "severity": "critical",
                "component": "system",
                "sla_impact": "high"
            },
            annotations={
                "summary": "Critical memory usage detected",
                "description": "Memory usage is above 90% for more than 2 minutes. Current usage: {{ $value }}%. Risk of OOM kills.",
                "runbook_url": "https://docs.biothings.com/runbooks/critical-memory",
                "action_required": "Immediate action required - free memory or scale system"
            }
        ))
        
        # Disk Space Alert
        rules.append(AlertRule(
            alert="BioThingsLowDiskSpace",
            expr="biothings_disk_usage_percent > 85",
            for_="5m",
            labels={
                "severity": "warning",
                "component": "storage",
                "sla_impact": "medium"
            },
            annotations={
                "summary": "Low disk space detected",
                "description": "Disk usage is above 85% for more than 5 minutes. Current usage: {{ $value }}%",
                "runbook_url": "https://docs.biothings.com/runbooks/low-disk-space",
                "action_required": "Clean up disk space or expand storage"
            }
        ))
        
        return RuleGroup(
            name="biothings_system_health",
            interval="30s",
            rules=rules
        )
    
    def create_application_health_rules(self) -> RuleGroup:
        """Create application health monitoring rules"""
        rules = []
        
        # High Error Rate Alert
        rules.append(AlertRule(
            alert="BioThingsHighErrorRate",
            expr='rate(biothings_http_requests_total{status_code=~"5.."}[5m]) / rate(biothings_http_requests_total[5m]) > 0.05',
            for_="2m",
            labels={
                "severity": "warning",
                "component": "api",
                "sla_impact": "medium"
            },
            annotations={
                "summary": "High HTTP error rate detected",
                "description": "HTTP error rate is above 5% for more than 2 minutes. Current rate: {{ $value | humanizePercentage }}",
                "runbook_url": "https://docs.biothings.com/runbooks/high-error-rate",
                "action_required": "Investigate application errors and fix issues"
            }
        ))
        
        # Critical Error Rate Alert
        rules.append(AlertRule(
            alert="BioThingsCriticalErrorRate",
            expr='rate(biothings_http_requests_total{status_code=~"5.."}[5m]) / rate(biothings_http_requests_total[5m]) > 0.15',
            for_="1m",
            labels={
                "severity": "critical",
                "component": "api",
                "sla_impact": "high"
            },
            annotations={
                "summary": "Critical HTTP error rate detected",
                "description": "HTTP error rate is above 15% for more than 1 minute. Current rate: {{ $value | humanizePercentage }}. SLA breach imminent.",
                "runbook_url": "https://docs.biothings.com/runbooks/critical-error-rate",
                "action_required": "Immediate action required - rollback or emergency fix"
            }
        ))
        
        # Slow Response Time Alert
        rules.append(AlertRule(
            alert="BioThingsSlowResponseTime",
            expr='histogram_quantile(0.95, rate(biothings_http_request_duration_seconds_bucket[5m])) > 2',
            for_="5m",
            labels={
                "severity": "warning",
                "component": "api",
                "sla_impact": "medium"
            },
            annotations={
                "summary": "Slow API response times detected",
                "description": "95th percentile response time is above 2 seconds for more than 5 minutes. Current: {{ $value }}s",
                "runbook_url": "https://docs.biothings.com/runbooks/slow-response",
                "action_required": "Investigate performance bottlenecks"
            }
        ))
        
        # No Active Agents Alert
        rules.append(AlertRule(
            alert="BioThingsNoActiveAgents",
            expr="sum(biothings_agents_active) == 0",
            for_="1m",
            labels={
                "severity": "critical",
                "component": "agents",
                "sla_impact": "high"
            },
            annotations={
                "summary": "No active agents detected",
                "description": "No agents are currently active. This will prevent any research tasks from being processed.",
                "runbook_url": "https://docs.biothings.com/runbooks/no-agents",
                "action_required": "Immediate action required - restart agent system"
            }
        ))
        
        # Low Agent Count Alert
        rules.append(AlertRule(
            alert="BioThingsLowAgentCount",
            expr="sum(biothings_agents_active) < 3",
            for_="5m",
            labels={
                "severity": "warning",
                "component": "agents",
                "sla_impact": "medium"
            },
            annotations={
                "summary": "Low number of active agents",
                "description": "Only {{ $value }} agents are currently active. Normal operation requires at least 3 agents.",
                "runbook_url": "https://docs.biothings.com/runbooks/low-agent-count",
                "action_required": "Check agent health and restart failed agents"
            }
        ))
        
        return RuleGroup(
            name="biothings_application_health",
            interval="30s",
            rules=rules
        )
    
    def create_business_sla_rules(self) -> RuleGroup:
        """Create business SLA monitoring rules"""
        rules = []
        
        # Low Research Productivity Alert
        rules.append(AlertRule(
            alert="BioThingsLowResearchProductivity",
            expr="biothings_research_productivity_score < 0.7",
            for_="15m",
            labels={
                "severity": "warning",
                "component": "research",
                "sla_impact": "medium"
            },
            annotations={
                "summary": "Research productivity below target",
                "description": "Research productivity score is {{ $value | humanizePercentage }}, below the 70% target for more than 15 minutes.",
                "runbook_url": "https://docs.biothings.com/runbooks/low-productivity",
                "action_required": "Investigate research bottlenecks and agent performance"
            }
        ))
        
        # High Experiment Failure Rate Alert
        rules.append(AlertRule(
            alert="BioThingsHighExperimentFailureRate",
            expr='rate(biothings_experiments_total{status="failed"}[1h]) / rate(biothings_experiments_total[1h]) > 0.2',
            for_="10m",
            labels={
                "severity": "warning",
                "component": "experiments",
                "sla_impact": "medium"
            },
            annotations={
                "summary": "High experiment failure rate",
                "description": "Experiment failure rate is {{ $value | humanizePercentage }}, above the 20% threshold.",
                "runbook_url": "https://docs.biothings.com/runbooks/experiment-failures",
                "action_required": "Investigate experiment execution issues"
            }
        ))
        
        # No Experiments Running Alert
        rules.append(AlertRule(
            alert="BioThingsNoActiveExperiments",
            expr="sum(biothings_experiments_active) == 0",
            for_="30m",
            labels={
                "severity": "warning",
                "component": "experiments",
                "sla_impact": "low"
            },
            annotations={
                "summary": "No active experiments",
                "description": "No experiments have been running for more than 30 minutes. This may indicate a problem with experiment scheduling.",
                "runbook_url": "https://docs.biothings.com/runbooks/no-experiments",
                "action_required": "Check experiment queue and scheduling system"
            }
        ))
        
        return RuleGroup(
            name="biothings_business_sla",
            interval="1m",
            rules=rules
        )
    
    def create_cost_monitoring_rules(self) -> RuleGroup:
        """Create cost monitoring and budget alerts"""
        rules = []
        
        # High Daily LLM Cost Alert
        rules.append(AlertRule(
            alert="BioThingsHighDailyLLMCost",
            expr="increase(biothings_llm_cost_total[24h]) > 200",
            for_="0s",
            labels={
                "severity": "warning",
                "component": "cost",
                "sla_impact": "low"
            },
            annotations={
                "summary": "High daily LLM cost",
                "description": "Daily LLM cost is ${{ $value }}, above the $200 budget threshold.",
                "runbook_url": "https://docs.biothings.com/runbooks/high-llm-cost",
                "action_required": "Review LLM usage patterns and optimize costs"
            }
        ))
        
        # Critical Daily LLM Cost Alert
        rules.append(AlertRule(
            alert="BioThingsCriticalDailyLLMCost",
            expr="increase(biothings_llm_cost_total[24h]) > 500",
            for_="0s",
            labels={
                "severity": "critical",
                "component": "cost",
                "sla_impact": "high"
            },
            annotations={
                "summary": "Critical daily LLM cost",
                "description": "Daily LLM cost is ${{ $value }}, exceeding the critical $500 threshold. Budget overrun imminent.",
                "runbook_url": "https://docs.biothings.com/runbooks/critical-llm-cost",
                "action_required": "Immediate action required - implement cost controls or throttling"
            }
        ))
        
        # High Monthly Cost Projection Alert
        rules.append(AlertRule(
            alert="BioThingsHighMonthlyProjection",
            expr="avg_over_time(rate(biothings_llm_cost_total[1h])[24h:1h]) * 24 * 30 > 3000",
            for_="1h",
            labels={
                "severity": "warning",
                "component": "cost",
                "sla_impact": "medium"
            },
            annotations={
                "summary": "High monthly cost projection",
                "description": "Projected monthly LLM cost is ${{ $value }}, above the $3000 budget.",
                "runbook_url": "https://docs.biothings.com/runbooks/high-monthly-cost",
                "action_required": "Review and optimize LLM usage to stay within budget"
            }
        ))
        
        return RuleGroup(
            name="biothings_cost_monitoring",
            interval="1m",
            rules=rules
        )
    
    def create_security_monitoring_rules(self) -> RuleGroup:
        """Create security monitoring alerts"""
        rules = []
        
        # High Authentication Failures Alert
        rules.append(AlertRule(
            alert="BioThingsHighAuthFailures",
            expr='rate(biothings_authentication_attempts_total{result="failure"}[5m]) > 5',
            for_="2m",
            labels={
                "severity": "warning",
                "component": "security",
                "sla_impact": "medium"
            },
            annotations={
                "summary": "High authentication failure rate",
                "description": "Authentication failure rate is {{ $value }} attempts/second, indicating possible brute force attack.",
                "runbook_url": "https://docs.biothings.com/runbooks/auth-failures",
                "action_required": "Investigate authentication failures and consider IP blocking"
            }
        ))
        
        # Security Events Alert
        rules.append(AlertRule(
            alert="BioThingsSecurityEvents",
            expr='rate(biothings_security_events_total{severity="critical"}[5m]) > 0',
            for_="0s",
            labels={
                "severity": "critical",
                "component": "security",
                "sla_impact": "high"
            },
            annotations={
                "summary": "Critical security event detected",
                "description": "Critical security event detected: {{ $labels.event_type }}",
                "runbook_url": "https://docs.biothings.com/runbooks/security-events",
                "action_required": "Immediate security investigation required"
            }
        ))
        
        # Rate Limiting Alert
        rules.append(AlertRule(
            alert="BioThingsHighRateLimitHits",
            expr="rate(biothings_rate_limit_hits_total[5m]) > 10",
            for_="5m",
            labels={
                "severity": "warning",
                "component": "security",
                "sla_impact": "low"
            },
            annotations={
                "summary": "High rate limit violations",
                "description": "Rate limit violations are occurring at {{ $value }} hits/second for endpoint {{ $labels.endpoint }}",
                "runbook_url": "https://docs.biothings.com/runbooks/rate-limits",
                "action_required": "Review rate limiting policies and client behavior"
            }
        ))
        
        return RuleGroup(
            name="biothings_security_monitoring",
            interval="30s",
            rules=rules
        )
    
    def create_infrastructure_rules(self) -> RuleGroup:
        """Create infrastructure monitoring rules"""
        rules = []
        
        # WebSocket Connection Loss Alert
        rules.append(AlertRule(
            alert="BioThingsWebSocketConnectionLoss",
            expr="rate(biothings_websocket_connections_active[5m]) < -0.5",
            for_="2m",
            labels={
                "severity": "warning",
                "component": "websocket",
                "sla_impact": "medium"
            },
            annotations={
                "summary": "WebSocket connections dropping rapidly",
                "description": "WebSocket connections are dropping at {{ $value }} connections/second, indicating connectivity issues.",
                "runbook_url": "https://docs.biothings.com/runbooks/websocket-issues",
                "action_required": "Investigate WebSocket connectivity and server health"
            }
        ))
        
        # Database Connection Issues Alert
        rules.append(AlertRule(
            alert="BioThingsDatabaseConnectionIssues",
            expr="rate(biothings_database_queries_total{status=\"error\"}[5m]) / rate(biothings_database_queries_total[5m]) > 0.1",
            for_="2m",
            labels={
                "severity": "critical",
                "component": "database",
                "sla_impact": "high"
            },
            annotations={
                "summary": "High database error rate",
                "description": "Database error rate is {{ $value | humanizePercentage }}, indicating connection or query issues.",
                "runbook_url": "https://docs.biothings.com/runbooks/database-errors",
                "action_required": "Immediate database investigation required"
            }
        ))
        
        return RuleGroup(
            name="biothings_infrastructure",
            interval="30s",
            rules=rules
        )
    
    def generate_all_rule_groups(self) -> List[RuleGroup]:
        """Generate all alert rule groups"""
        self.rule_groups = [
            self.create_system_health_rules(),
            self.create_application_health_rules(),
            self.create_business_sla_rules(),
            self.create_cost_monitoring_rules(),
            self.create_security_monitoring_rules(),
            self.create_infrastructure_rules()
        ]
        return self.rule_groups
    
    def export_prometheus_rules(self, output_file: str = None) -> str:
        """Export rules in Prometheus format"""
        if not self.rule_groups:
            self.generate_all_rule_groups()
        
        rules_config = {
            "groups": []
        }
        
        for group in self.rule_groups:
            group_dict = {
                "name": group.name,
                "interval": group.interval,
                "rules": []
            }
            
            for rule in group.rules:
                rule_dict = {
                    "alert": rule.alert,
                    "expr": rule.expr,
                    "for": rule.for_,
                    "labels": rule.labels,
                    "annotations": rule.annotations
                }
                group_dict["rules"].append(rule_dict)
            
            rules_config["groups"].append(group_dict)
        
        yaml_output = yaml.dump(rules_config, default_flow_style=False, sort_keys=False)
        
        if output_file:
            with open(output_file, 'w') as f:
                f.write(yaml_output)
            print(f"Exported rules to: {output_file}")
        
        return yaml_output
    
    def export_alertmanager_config(self, output_file: str = None) -> str:
        """Export AlertManager configuration"""
        config = {
            "global": {
                "smtp_smarthost": "localhost:587",
                "smtp_from": "biothings-alerts@company.com",
                "resolve_timeout": "5m"
            },
            "route": {
                "group_by": ["alertname"],
                "group_wait": "10s",
                "group_interval": "10s",
                "repeat_interval": "1h",
                "receiver": "web.hook",
                "routes": [
                    {
                        "match": {"severity": "critical"},
                        "receiver": "critical-alerts",
                        "repeat_interval": "15m"
                    },
                    {
                        "match": {"component": "cost"},
                        "receiver": "cost-alerts",
                        "repeat_interval": "4h"
                    },
                    {
                        "match": {"component": "security"},
                        "receiver": "security-alerts",
                        "repeat_interval": "30m"
                    }
                ]
            },
            "receivers": [
                {
                    "name": "web.hook",
                    "webhook_configs": [
                        {
                            "url": "http://localhost:5001/webhook",
                            "send_resolved": True
                        }
                    ]
                },
                {
                    "name": "critical-alerts",
                    "email_configs": [
                        {
                            "to": "oncall@company.com",
                            "subject": "CRITICAL: BioThings Alert - {{ .GroupLabels.alertname }}",
                            "body": "{{ range .Alerts }}{{ .Annotations.summary }}\n{{ .Annotations.description }}\n{{ .Annotations.action_required }}{{ end }}"
                        }
                    ],
                    "slack_configs": [
                        {
                            "api_url": "${SLACK_WEBHOOK_URL}",
                            "channel": "#biothings-critical",
                            "title": "CRITICAL: {{ .GroupLabels.alertname }}",
                            "text": "{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}"
                        }
                    ]
                },
                {
                    "name": "cost-alerts",
                    "email_configs": [
                        {
                            "to": "finance@company.com",
                            "subject": "BioThings Cost Alert - {{ .GroupLabels.alertname }}",
                            "body": "{{ range .Alerts }}{{ .Annotations.description }}{{ end }}"
                        }
                    ]
                },
                {
                    "name": "security-alerts",
                    "email_configs": [
                        {
                            "to": "security@company.com",
                            "subject": "BioThings Security Alert - {{ .GroupLabels.alertname }}",
                            "body": "{{ range .Alerts }}{{ .Annotations.description }}\nAction: {{ .Annotations.action_required }}{{ end }}"
                        }
                    ]
                }
            ],
            "inhibit_rules": [
                {
                    "source_match": {"severity": "critical"},
                    "target_match": {"severity": "warning"},
                    "equal": ["alertname", "component"]
                }
            ]
        }
        
        yaml_output = yaml.dump(config, default_flow_style=False, sort_keys=False)
        
        if output_file:
            with open(output_file, 'w') as f:
                f.write(yaml_output)
            print(f"Exported AlertManager config to: {output_file}")
        
        return yaml_output


# SLA Configuration
SLA_TARGETS = {
    "uptime": 99.9,  # 99.9% uptime
    "response_time_p95": 2.0,  # 95th percentile < 2 seconds
    "error_rate": 0.1,  # < 0.1% error rate
    "research_productivity": 0.8,  # > 80% productivity score
    "experiment_success_rate": 0.9,  # > 90% success rate
    "daily_cost_limit": 200,  # < $200/day LLM costs
    "monthly_cost_limit": 3000  # < $3000/month LLM costs
}


if __name__ == "__main__":
    # Generate and export alert rules
    builder = AlertManagerRuleBuilder()
    
    # Export Prometheus rules
    builder.export_prometheus_rules(
        "/Users/manuarrojwala/biothings/backend/monitoring/prometheus_rules.yml"
    )
    
    # Export AlertManager configuration
    builder.export_alertmanager_config(
        "/Users/manuarrojwala/biothings/backend/monitoring/alertmanager.yml"
    )