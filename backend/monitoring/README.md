# BioThings Production Monitoring System

Enterprise-grade monitoring stack for the BioThings research platform, supporting 99.9% uptime SLA with comprehensive visibility into system performance, security events, business metrics, and cost tracking.

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   BioThings     │───▶│   Prometheus    │───▶│    Grafana      │
│   Backend       │    │   (Metrics)     │    │  (Dashboards)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Structured     │───▶│  AlertManager   │───▶│   Kibana        │
│   Logging       │    │   (Alerts)      │    │   (Logs)        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Elasticsearch  │    │    Jaeger       │    │  PostgreSQL     │
│  (Log Store)    │    │   (Tracing)     │    │ (Persistence)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- 8GB+ RAM available
- 50GB+ disk space

### Setup
```bash
# Clone repository and navigate to project
cd biothings

# Run complete monitoring setup
./scripts/setup-monitoring.sh setup

# Start monitoring stack
./scripts/setup-monitoring.sh start

# Check status
./scripts/setup-monitoring.sh status
```

### Access Points
- **Grafana Dashboards:** http://localhost:3001 (admin/admin123)
- **Prometheus Metrics:** http://localhost:9090
- **AlertManager:** http://localhost:9093
- **Kibana Logs:** http://localhost:5601
- **Jaeger Tracing:** http://localhost:16686

## 📊 Key Components

### 1. Prometheus Metrics Server (`prometheus_server.py`)
Comprehensive metrics collection system with:
- **HTTP Metrics:** Request rates, response times, status codes
- **Agent Metrics:** Task execution, performance, error rates
- **LLM Metrics:** Token usage, costs, response times
- **Business Metrics:** Research productivity, experiment success rates
- **System Metrics:** CPU, memory, disk, network utilization

```python
from backend.monitoring.prometheus_server import metrics_server

# Track HTTP request
metrics_server.track_http_request(
    method="POST",
    endpoint="/api/experiments",
    status_code=201,
    duration=0.45,
    user_agent="Mozilla/5.0..."
)

# Track LLM usage
metrics_server.track_llm_usage(
    provider="openai",
    model="gpt-4",
    agent_type="ceo",
    input_tokens=150,
    output_tokens=75,
    cost=0.0045,
    response_time=2.1
)
```

### 2. Health Check System (`health_checks.py`)
Enterprise health monitoring with:
- **Component Health:** Database, Redis, file system, external APIs
- **SLA Compliance:** Real-time 99.9% uptime tracking
- **Performance Thresholds:** Latency monitoring with alerts
- **System Resources:** Automated resource utilization checks

```python
from backend.monitoring.health_checks import health_check_manager

# Perform comprehensive health check
health_status = await health_check_manager.perform_comprehensive_health_check()

# Check specific component
db_health = await health_check_manager.check_database_health()
```

### 3. Cost Tracking (`cost_tracking.py`)
Complete LLM cost management:
- **Multi-Provider Support:** OpenAI, Anthropic, Google, Cohere
- **Budget Management:** Daily ($200) and monthly ($3000) limits
- **Cost Projections:** Trend-based forecasting with confidence
- **Efficiency Metrics:** Cost per experiment/publication/discovery

```python
from backend.monitoring.cost_tracking import cost_tracker

# Track LLM usage cost
cost = cost_tracker.track_llm_usage(
    provider="anthropic",
    model="claude-3-opus",
    agent_type="cso",
    input_tokens=200,
    output_tokens=100,
    task_type="research_analysis"
)

# Get cost projections
projections = cost_tracker.get_cost_projections()
```

### 4. Performance Monitoring (`performance_monitoring.py`)
Automated performance tracking:
- **Decorators:** `@monitor_performance`, `@monitor_agent_task`
- **HTTP Middleware:** Automatic API request monitoring
- **Operation Statistics:** Response times, error rates, percentiles
- **Threshold Alerts:** Configurable performance warnings

```python
from backend.monitoring.performance_monitoring import monitor_agent_task

@monitor_agent_task(agent_type="ceo", task_type="strategic_planning")
async def execute_strategic_plan(objectives):
    # Agent task implementation
    return results
```

### 5. Structured Logging (`structured_logging.py`)
Enterprise logging with security:
- **Pattern Detection:** Security threats, performance issues
- **Log Categories:** System, security, business, performance, audit
- **Anomaly Detection:** Failed authentication, SQL injection attempts
- **Audit Trail:** Compliance and regulatory support

```python
from backend.monitoring.structured_logging import structured_logger, LogLevel, LogCategory

# Log security event
structured_logger.security_event(
    "Failed authentication attempt",
    "auth_system",
    user_id="unknown",
    ip_address="192.168.1.100",
    attempt_count=5
)

# Log business event
structured_logger.experiment_event(
    "Experiment completed successfully",
    experiment_id="exp_001",
    protocol="PCR_amplification",
    duration_ms=45000
)
```

## 📈 Dashboards

### 1. System Overview Dashboard
- System health indicators
- CPU, memory, disk usage
- HTTP request rates
- Active agents and experiments
- WebSocket connections

### 2. Agent Performance Dashboard
- Task execution rates by agent type
- Response time percentiles
- Error rates and failure analysis
- Success rate trends

### 3. Business Intelligence Dashboard
- Research productivity score
- Experiments completed/active
- Publication generation rates
- Discovery tracking
- ROI metrics

### 4. Cost Analysis Dashboard
- Daily and monthly LLM costs
- Cost breakdown by provider/model
- Budget utilization tracking
- Monthly projections
- Cost efficiency trends

### 5. Security Monitoring Dashboard
- Security events timeline
- Authentication failure rates
- Rate limiting violations
- Suspicious activity alerts

## 🚨 Alerting Rules

### Critical Alerts (Immediate Action)
- **System Down:** Service unavailable >30s
- **Critical CPU:** >95% utilization for 2min
- **Critical Memory:** >90% utilization for 2min
- **High Error Rate:** >15% HTTP errors for 1min
- **Security Events:** Critical security threats
- **Cost Overrun:** >$500 daily LLM costs

### Warning Alerts (Monitor & Plan)
- **High CPU:** >85% utilization for 5min
- **High Memory:** >80% utilization for 5min
- **Slow Response:** >2s p95 response time
- **Low Agent Count:** <3 active agents
- **Budget Alert:** >80% of budget used
- **Performance Degradation:** Response time increases

### SLA Monitoring
- **Uptime Target:** 99.9% availability
- **Response Time:** <2s p95 for API calls
- **Error Rate:** <0.1% for HTTP requests
- **Research Productivity:** >80% success rate

## 🔐 Security Features

### Threat Detection
- Failed authentication patterns (5+ failures in 5min)
- SQL injection attempt detection
- Privilege escalation monitoring
- Data exfiltration alerts
- Suspicious access patterns

### Compliance
- Audit trail logging for all critical operations
- Data access monitoring and logging
- User activity tracking
- GDPR compliance support
- SOC 2 readiness features

## 💰 Cost Management

### Budget Controls
- **Daily Limit:** $200 LLM costs with 80% warning
- **Monthly Limit:** $3000 LLM costs with 90% warning
- **Real-time Tracking:** Per-provider, per-model cost breakdown
- **Efficiency Metrics:** Cost per research output

### Cost Optimization
- Provider cost comparison
- Model efficiency analysis
- Usage pattern optimization
- Budget allocation recommendations

## 🔧 Configuration

### Environment Variables
```bash
# Monitoring configuration
PROMETHEUS_ENABLED=true
PROMETHEUS_PORT=8001
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=secure_password

# Database configuration
POSTGRES_URL=postgresql://user:pass@localhost:5432/biothings
REDIS_URL=redis://localhost:6379

# Alert configuration
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
SMTP_HOST=smtp.company.com:587
SMTP_USER=alerts@company.com
SMTP_PASSWORD=secure_password
```

### Monitoring Thresholds
```python
# Performance thresholds (monitoring/performance_monitoring.py)
THRESHOLDS = {
    'api_response_time_warning': 1000,    # ms
    'api_response_time_critical': 3000,   # ms
    'agent_task_time_warning': 5000,     # ms
    'agent_task_time_critical': 15000,   # ms
    'database_query_warning': 500,       # ms
    'database_query_critical': 2000,     # ms
}
```

## 📚 API Reference

### Health Endpoints
```bash
GET /health                    # Basic health check
GET /health/detailed          # Comprehensive health status
GET /health/history           # Health check history
GET /health/sla              # SLA compliance status
POST /health/component/{name}/test  # Test specific component
```

### Metrics Endpoints
```bash
GET /metrics/current          # Current system metrics
GET /metrics/history          # Historical metrics
GET /prometheus/metrics       # Prometheus formatted metrics
```

### Performance Endpoints
```bash
GET /performance/summary           # Performance overview
GET /performance/endpoint/{path}   # Endpoint-specific metrics
```

### Cost Endpoints
```bash
GET /costs/summary            # Comprehensive cost summary
GET /costs/breakdown         # Cost breakdown by category
GET /costs/projections       # Cost forecasting
GET /costs/efficiency        # Cost efficiency metrics
POST /costs/track/llm        # Track LLM usage cost
```

### Logging Endpoints
```bash
GET /logs                    # Filtered log retrieval
GET /logs/statistics         # Log statistics
GET /logs/security          # Security event logs
GET /logs/alerts            # Pattern-based alerts
GET /logs/export            # Export logs as JSON
```

### Business Intelligence
```bash
GET /business/productivity       # Research productivity metrics
GET /business/sla-compliance    # Detailed SLA compliance
```

## 🔄 Operations

### Daily Operations
```bash
# Check system health
curl http://localhost:8000/health/detailed

# View current metrics
curl http://localhost:8000/metrics/current

# Check cost status
curl http://localhost:8000/costs/summary

# View recent alerts
curl http://localhost:8000/logs/alerts?minutes=60
```

### Maintenance
```bash
# Restart monitoring stack
./scripts/setup-monitoring.sh restart

# View service logs
./scripts/setup-monitoring.sh logs prometheus
./scripts/setup-monitoring.sh logs grafana

# Backup monitoring data
docker exec biothings-postgres pg_dump biothings > backup.sql
```

### Troubleshooting
```bash
# Check service status
docker-compose -f docker-compose.monitoring.yml ps

# View container logs
docker logs biothings-prometheus
docker logs biothings-grafana

# Test Prometheus queries
curl 'http://localhost:9090/api/v1/query?query=up'

# Validate AlertManager config
docker exec biothings-alertmanager amtool config check
```

## 📖 Best Practices

### Monitoring
1. **Set up alerts gradually** - Start with critical alerts, add warnings over time
2. **Use meaningful alert names** - Include context and action needed
3. **Avoid alert fatigue** - Set appropriate thresholds and escalation
4. **Regular review** - Monthly review of alerts and thresholds

### Performance
1. **Monitor key user journeys** - Track end-to-end experiment workflows
2. **Set SLA-based thresholds** - Align with business requirements
3. **Use percentiles not averages** - p95/p99 for realistic performance
4. **Capacity planning** - Proactive scaling based on trends

### Cost Management
1. **Set budget alerts early** - Before hitting limits
2. **Monitor cost trends** - Weekly review of spending patterns
3. **Optimize model usage** - Right-size models for tasks
4. **Track ROI metrics** - Cost per business outcome

### Security
1. **Monitor authentication patterns** - Failed logins, unusual access
2. **Audit high-privilege operations** - Admin actions, data access
3. **Set up real-time alerts** - Critical security events
4. **Regular security review** - Monthly assessment of logs

## 🆘 Support

### Documentation
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [AlertManager Documentation](https://prometheus.io/docs/alerting/alertmanager/)

### Common Issues
1. **High memory usage** - Increase Docker memory allocation
2. **Metrics not appearing** - Check Prometheus targets in UI
3. **Alerts not firing** - Verify AlertManager configuration
4. **Dashboard not loading** - Check Grafana datasource configuration

For technical support, check the troubleshooting section or contact the platform team.

---

**BioThings Monitoring System** - Enterprise-grade observability for research excellence 🔬📊