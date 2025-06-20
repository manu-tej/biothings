#!/bin/bash
#
# BioThings Production Monitoring Setup Script
# Sets up comprehensive monitoring stack with Prometheus, Grafana, AlertManager, and logging
#

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
MONITORING_DIR="$PROJECT_ROOT/backend/monitoring"

# Default values
GRAFANA_ADMIN_USER="${GRAFANA_ADMIN_USER:-admin}"
GRAFANA_ADMIN_PASSWORD="${GRAFANA_ADMIN_PASSWORD:-admin123}"
POSTGRES_DB="${POSTGRES_DB:-biothings}"
POSTGRES_USER="${POSTGRES_USER:-biothings}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-biothings123}"
ENVIRONMENT="${ENVIRONMENT:-production}"

print_header() {
    echo -e "${BLUE}"
    echo "=================================="
    echo "BioThings Monitoring Setup"
    echo "=================================="
    echo -e "${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

check_dependencies() {
    print_info "Checking dependencies..."
    
    local deps=("docker" "docker-compose" "curl")
    local missing_deps=()
    
    for dep in "${deps[@]}"; do
        if ! command -v "$dep" &> /dev/null; then
            missing_deps+=("$dep")
        fi
    done
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        print_error "Missing dependencies: ${missing_deps[*]}"
        print_info "Please install the missing dependencies and try again."
        exit 1
    fi
    
    print_success "All dependencies found"
}

create_env_file() {
    print_info "Creating environment configuration..."
    
    local env_file="$PROJECT_ROOT/.env.monitoring"
    
    cat > "$env_file" << EOF
# BioThings Monitoring Configuration
GRAFANA_ADMIN_USER=$GRAFANA_ADMIN_USER
GRAFANA_ADMIN_PASSWORD=$GRAFANA_ADMIN_PASSWORD
POSTGRES_DB=$POSTGRES_DB
POSTGRES_USER=$POSTGRES_USER
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
ENVIRONMENT=$ENVIRONMENT

# Optional: Slack webhook for alerts
SLACK_WEBHOOK_URL=${SLACK_WEBHOOK_URL:-}

# Optional: SMTP configuration for email alerts
SMTP_HOST=${SMTP_HOST:-localhost:587}
SMTP_USER=${SMTP_USER:-}
SMTP_PASSWORD=${SMTP_PASSWORD:-}
SMTP_FROM=${SMTP_FROM:-biothings@company.com}

# Optional: External storage
AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID:-}
AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY:-}
AWS_REGION=${AWS_REGION:-us-east-1}
EOF
    
    print_success "Environment file created at $env_file"
}

setup_directories() {
    print_info "Setting up monitoring directories..."
    
    local dirs=(
        "$MONITORING_DIR/grafana/provisioning/datasources"
        "$MONITORING_DIR/grafana/provisioning/dashboards"
        "$MONITORING_DIR/logstash"
        "$MONITORING_DIR/postgres"
        "$PROJECT_ROOT/ssl"
        "$PROJECT_ROOT/logs"
    )
    
    for dir in "${dirs[@]}"; do
        mkdir -p "$dir"
        print_success "Created directory: $dir"
    done
}

create_ssl_certificates() {
    print_info "Creating SSL certificates for HTTPS..."
    
    local ssl_dir="$PROJECT_ROOT/ssl"
    
    if [ ! -f "$ssl_dir/cert.pem" ] || [ ! -f "$ssl_dir/key.pem" ]; then
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout "$ssl_dir/key.pem" \
            -out "$ssl_dir/cert.pem" \
            -subj "/C=US/ST=State/L=City/O=BioThings/CN=biothings.local" \
            -addext "subjectAltName=DNS:biothings.local,DNS:*.biothings.local,DNS:localhost"
        
        print_success "SSL certificates created"
    else
        print_success "SSL certificates already exist"
    fi
}

create_logstash_config() {
    print_info "Creating Logstash configuration..."
    
    local logstash_dir="$MONITORING_DIR/logstash"
    
    cat > "$logstash_dir/logstash.yml" << 'EOF'
http.host: "0.0.0.0"
xpack.monitoring.elasticsearch.hosts: [ "http://elasticsearch:9200" ]
EOF

    cat > "$logstash_dir/biothings.conf" << 'EOF'
input {
  tcp {
    port => 5000
    codec => json_lines
  }
  
  udp {
    port => 5000
    codec => json_lines
  }
  
  beats {
    port => 5044
  }
}

filter {
  if [level] {
    mutate {
      uppercase => [ "level" ]
    }
  }
  
  if [timestamp] {
    date {
      match => [ "timestamp", "ISO8601" ]
    }
  }
  
  # Parse stack traces
  if [stack_trace] {
    mutate {
      gsub => [ "stack_trace", "\n", " | " ]
    }
  }
  
  # Add environment tag
  mutate {
    add_field => { "environment" => "production" }
  }
}

output {
  elasticsearch {
    hosts => ["elasticsearch:9200"]
    index => "biothings-logs-%{+YYYY.MM.dd}"
  }
  
  # Debug output
  stdout {
    codec => rubydebug
  }
}
EOF
    
    print_success "Logstash configuration created"
}

create_postgres_init() {
    print_info "Creating PostgreSQL initialization script..."
    
    local postgres_dir="$MONITORING_DIR/postgres"
    
    cat > "$postgres_dir/init.sql" << 'EOF'
-- BioThings monitoring database initialization

-- Create monitoring tables
CREATE TABLE IF NOT EXISTS monitoring_events (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    event_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    component VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB,
    resolved BOOLEAN DEFAULT FALSE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_monitoring_events_timestamp ON monitoring_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_monitoring_events_type ON monitoring_events(event_type);
CREATE INDEX IF NOT EXISTS idx_monitoring_events_severity ON monitoring_events(severity);

-- Create cost tracking table
CREATE TABLE IF NOT EXISTS cost_events (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    category VARCHAR(50) NOT NULL,
    provider VARCHAR(100) NOT NULL,
    service VARCHAR(100) NOT NULL,
    cost_usd DECIMAL(10,4) NOT NULL,
    quantity DECIMAL(15,2) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_cost_events_timestamp ON cost_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_cost_events_category ON cost_events(category);

-- Create performance tracking table
CREATE TABLE IF NOT EXISTS performance_metrics (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    operation VARCHAR(200) NOT NULL,
    duration_ms DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) NOT NULL,
    component VARCHAR(100) NOT NULL,
    metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_performance_metrics_timestamp ON performance_metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_operation ON performance_metrics(operation);

-- Create users for monitoring access
CREATE USER monitoring_reader WITH ENCRYPTED PASSWORD 'monitoring_readonly_123';
GRANT SELECT ON ALL TABLES IN SCHEMA public TO monitoring_reader;

GRANT ALL PRIVILEGES ON DATABASE biothings TO biothings;
EOF
    
    print_success "PostgreSQL initialization script created"
}

start_monitoring_stack() {
    print_info "Starting monitoring stack..."
    
    cd "$PROJECT_ROOT"
    
    # Pull latest images
    docker-compose -f docker-compose.monitoring.yml pull
    
    # Start the monitoring stack
    docker-compose -f docker-compose.monitoring.yml up -d
    
    print_success "Monitoring stack started"
}

wait_for_services() {
    print_info "Waiting for services to be ready..."
    
    local services=(
        "http://localhost:9090"     # Prometheus
        "http://localhost:3001"     # Grafana
        "http://localhost:9200"     # Elasticsearch
        "http://localhost:5601"     # Kibana
    )
    
    for service in "${services[@]}"; do
        print_info "Waiting for $service..."
        
        local retries=0
        local max_retries=30
        
        until curl -s "$service" > /dev/null || [ $retries -eq $max_retries ]; do
            retries=$((retries + 1))
            sleep 10
        done
        
        if [ $retries -eq $max_retries ]; then
            print_warning "Service $service may not be ready"
        else
            print_success "Service $service is ready"
        fi
    done
}

configure_grafana() {
    print_info "Configuring Grafana..."
    
    # Wait a bit more for Grafana to fully start
    sleep 30
    
    # Import dashboards via API
    local grafana_url="http://localhost:3001"
    local auth="admin:$GRAFANA_ADMIN_PASSWORD"
    
    # Create organization folder
    curl -s -X POST \
        -H "Content-Type: application/json" \
        -u "$auth" \
        "$grafana_url/api/folders" \
        -d '{"title":"BioThings","uid":"biothings"}' || true
    
    print_success "Grafana configuration completed"
}

setup_alerts() {
    print_info "Setting up monitoring alerts..."
    
    # Validate AlertManager configuration
    docker exec biothings-alertmanager amtool config check /etc/alertmanager/alertmanager.yml
    
    # Validate Prometheus rules
    docker exec biothings-prometheus promtool check rules /etc/prometheus/rules.yml
    
    # Reload Prometheus configuration
    curl -s -X POST http://localhost:9090/-/reload
    
    print_success "Alerts configured and validated"
}

show_access_info() {
    print_header
    echo -e "${GREEN}Monitoring Stack Setup Complete!${NC}"
    echo ""
    echo "Access Information:"
    echo "=================="
    echo -e "${BLUE}Grafana Dashboard:${NC}    http://localhost:3001"
    echo -e "  Username: $GRAFANA_ADMIN_USER"
    echo -e "  Password: $GRAFANA_ADMIN_PASSWORD"
    echo ""
    echo -e "${BLUE}Prometheus:${NC}           http://localhost:9090"
    echo -e "${BLUE}AlertManager:${NC}         http://localhost:9093"
    echo -e "${BLUE}Kibana (Logs):${NC}        http://localhost:5601"
    echo -e "${BLUE}Jaeger (Tracing):${NC}     http://localhost:16686"
    echo ""
    echo -e "${BLUE}API Endpoints:${NC}"
    echo -e "  Health Check:       http://localhost:8000/health"
    echo -e "  Metrics:           http://localhost:8000/metrics/current"
    echo -e "  Performance:       http://localhost:8000/performance/summary"
    echo -e "  Cost Tracking:     http://localhost:8000/costs/summary"
    echo -e "  Logs:              http://localhost:8000/logs"
    echo ""
    echo -e "${YELLOW}Next Steps:${NC}"
    echo "1. Configure your Slack webhook URL in .env.monitoring for alerts"
    echo "2. Set up SMTP configuration for email notifications"
    echo "3. Import custom dashboards in Grafana"
    echo "4. Configure retention policies for logs and metrics"
    echo "5. Set up backup strategies for persistent data"
    echo ""
    echo -e "${GREEN}Happy Monitoring! 🚀${NC}"
}

cleanup() {
    print_info "Cleaning up..."
    cd "$PROJECT_ROOT"
    docker-compose -f docker-compose.monitoring.yml down
    print_success "Cleanup completed"
}

main() {
    print_header
    
    case "${1:-setup}" in
        "setup")
            check_dependencies
            create_env_file
            setup_directories
            create_ssl_certificates
            create_logstash_config
            create_postgres_init
            start_monitoring_stack
            wait_for_services
            configure_grafana
            setup_alerts
            show_access_info
            ;;
        "start")
            print_info "Starting monitoring stack..."
            cd "$PROJECT_ROOT"
            docker-compose -f docker-compose.monitoring.yml up -d
            print_success "Monitoring stack started"
            ;;
        "stop")
            print_info "Stopping monitoring stack..."
            cd "$PROJECT_ROOT"
            docker-compose -f docker-compose.monitoring.yml down
            print_success "Monitoring stack stopped"
            ;;
        "restart")
            print_info "Restarting monitoring stack..."
            cd "$PROJECT_ROOT"
            docker-compose -f docker-compose.monitoring.yml restart
            print_success "Monitoring stack restarted"
            ;;
        "status")
            print_info "Checking monitoring stack status..."
            cd "$PROJECT_ROOT"
            docker-compose -f docker-compose.monitoring.yml ps
            ;;
        "logs")
            cd "$PROJECT_ROOT"
            docker-compose -f docker-compose.monitoring.yml logs -f "${2:-}"
            ;;
        "cleanup")
            cleanup
            ;;
        "help")
            echo "Usage: $0 {setup|start|stop|restart|status|logs|cleanup|help}"
            echo ""
            echo "Commands:"
            echo "  setup    - Complete monitoring stack setup"
            echo "  start    - Start monitoring services"
            echo "  stop     - Stop monitoring services"
            echo "  restart  - Restart monitoring services"
            echo "  status   - Show service status"
            echo "  logs     - Show service logs"
            echo "  cleanup  - Remove all monitoring containers and data"
            echo "  help     - Show this help message"
            ;;
        *)
            print_error "Unknown command: $1"
            echo "Use '$0 help' for usage information"
            exit 1
            ;;
    esac
}

# Handle script interruption
trap cleanup EXIT

main "$@"