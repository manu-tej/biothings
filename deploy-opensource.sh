#!/bin/bash

# BioThings Open Source Deployment Script
# Uses 100% open source tools for POC and production deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DEPLOYMENT_TYPE=${1:-"local"}
ENVIRONMENT=${2:-"development"}

echo -e "${BLUE}🚀 BioThings Open Source Deployment${NC}"
echo -e "${BLUE}=====================================${NC}"
echo -e "Deployment Type: ${YELLOW}$DEPLOYMENT_TYPE${NC}"
echo -e "Environment: ${YELLOW}$ENVIRONMENT${NC}"
echo ""

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to generate secure passwords
generate_password() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-25
}

echo -e "${BLUE}📋 Checking Prerequisites...${NC}"

# Check Docker
if ! command_exists docker; then
    echo -e "${RED}❌ Docker not found. Please install Docker first.${NC}"
    echo "Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check Docker Compose
if ! command_exists docker-compose && ! docker compose version >/dev/null 2>&1; then
    echo -e "${RED}❌ Docker Compose not found. Please install Docker Compose.${NC}"
    exit 1
fi

# Use docker compose or docker-compose
if docker compose version >/dev/null 2>&1; then
    DOCKER_COMPOSE="docker compose"
else
    DOCKER_COMPOSE="docker-compose"
fi

echo -e "${GREEN}✅ Docker and Docker Compose are available${NC}"

# Create necessary directories
echo -e "${BLUE}📁 Creating directories...${NC}"
mkdir -p monitoring/grafana/{dashboards,provisioning}
mkdir -p nginx/ssl
mkdir -p logs
mkdir -p backend/database

# Generate environment file if it doesn't exist
if [ ! -f .env.opensource ]; then
    echo -e "${BLUE}🔧 Generating environment configuration...${NC}"
    
    # Generate secure passwords
    POSTGRES_PASSWORD=$(generate_password)
    JWT_SECRET_KEY=$(generate_password)
    GRAFANA_PASSWORD=$(generate_password)
    
    cat > .env.opensource << EOF
# BioThings Open Source Configuration
NODE_ENV=$ENVIRONMENT
DEPLOYMENT_TYPE=$DEPLOYMENT_TYPE

# Database Configuration (PostgreSQL - Open Source)
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
DATABASE_URL=postgresql://biothings:$POSTGRES_PASSWORD@postgres:5432/biothings

# Cache Configuration (Redis - Open Source)
REDIS_URL=redis://redis:6379

# API Keys (Only external dependency)
GOOGLE_API_KEY=${GOOGLE_API_KEY:-your-gemini-api-key-here}
GEMINI_MODEL=${GEMINI_MODEL:-gemini-2.0-flash-exp}

# Security Configuration
JWT_SECRET_KEY=$JWT_SECRET_KEY
BCRYPT_ROUNDS=12

# Monitoring Configuration
GRAFANA_PASSWORD=$GRAFANA_PASSWORD
PROMETHEUS_URL=http://localhost:9090
GRAFANA_URL=http://localhost:3001
ALERTMANAGER_URL=http://localhost:9093

# Application URLs
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws
EOF

    echo -e "${GREEN}✅ Environment file created: .env.opensource${NC}"
    echo -e "${YELLOW}⚠️  Please update GOOGLE_API_KEY in .env.opensource${NC}"
else
    echo -e "${GREEN}✅ Using existing .env.opensource${NC}"
fi

# Create Prometheus configuration
echo -e "${BLUE}📊 Setting up monitoring configuration...${NC}"

cat > monitoring/prometheus.yml << 'EOF'
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alert_rules.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093

scrape_configs:
  - job_name: 'biothings-backend'
    static_configs:
      - targets: ['backend:8000']
    metrics_path: /api/prometheus/metrics
    scrape_interval: 10s

  - job_name: 'biothings-frontend'
    static_configs:
      - targets: ['frontend:3000']
    scrape_interval: 30s

  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']

  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres:5432']

  - job_name: 'redis'
    static_configs:
      - targets: ['redis:6379']
EOF

# Create AlertManager configuration
cat > monitoring/alertmanager.yml << 'EOF'
global:
  smtp_smarthost: 'localhost:587'
  smtp_from: 'alerts@biothings.local'

route:
  group_by: ['alertname']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'web.hook'

receivers:
  - name: 'web.hook'
    webhook_configs:
      - url: 'http://backend:8000/api/monitoring/alerts/webhook'
        send_resolved: true

inhibit_rules:
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'warning'
    equal: ['alertname', 'dev', 'instance']
EOF

# Create alert rules
cat > monitoring/alert_rules.yml << 'EOF'
groups:
  - name: biothings.rules
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"

      - alert: HighResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High response time detected"

      - alert: DatabaseDown
        expr: up{job="postgres"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "PostgreSQL database is down"

      - alert: RedisDown
        expr: up{job="redis"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Redis cache is down"
EOF

# Create Nginx configuration for open source deployment
cat > nginx/nginx.opensource.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    upstream backend {
        server backend:8000;
    }

    upstream frontend {
        server frontend:3000;
    }

    upstream grafana {
        server grafana:3000;
    }

    # Frontend
    server {
        listen 80;
        server_name localhost;

        location / {
            proxy_pass http://frontend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # API endpoints
        location /api/ {
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # WebSocket
        location /ws {
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Grafana monitoring
        location /grafana/ {
            proxy_pass http://grafana/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
EOF

# Create basic database initialization
cat > backend/database/init.sql << 'EOF'
-- BioThings Database Initialization
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'scientist',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Experiments table
CREATE TABLE IF NOT EXISTS experiments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Agents table
CREATE TABLE IF NOT EXISTS agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'idle',
    capabilities TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default admin user (password: admin123)
INSERT INTO users (email, username, password_hash, role) 
VALUES ('admin@biothings.local', 'admin', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewL9a7e2vLm2Zm6y', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_experiments_user_id ON experiments(user_id);
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
EOF

echo -e "${GREEN}✅ Configuration files created${NC}"

# Start deployment based on type
case $DEPLOYMENT_TYPE in
    "local")
        echo -e "${BLUE}🚀 Starting local open source deployment...${NC}"
        
        # Load environment variables
        export $(cat .env.opensource | grep -v '^#' | xargs)
        
        # Start services
        $DOCKER_COMPOSE -f docker-compose.opensource.yml up -d
        
        echo -e "${GREEN}✅ Services started successfully!${NC}"
        ;;
        
    "production")
        echo -e "${BLUE}🚀 Starting production open source deployment...${NC}"
        
        # Load environment variables
        export $(cat .env.opensource | grep -v '^#' | xargs)
        
        # Pull latest images
        $DOCKER_COMPOSE -f docker-compose.opensource.yml pull
        
        # Start services
        $DOCKER_COMPOSE -f docker-compose.opensource.yml up -d
        
        echo -e "${GREEN}✅ Production services started!${NC}"
        ;;
        
    *)
        echo -e "${RED}❌ Unknown deployment type: $DEPLOYMENT_TYPE${NC}"
        echo "Available types: local, production"
        exit 1
        ;;
esac

# Wait for services to be ready
echo -e "${BLUE}⏳ Waiting for services to be ready...${NC}"
sleep 30

# Check service health
echo -e "${BLUE}🔍 Checking service health...${NC}"

check_service() {
    local service_name=$1
    local url=$2
    local max_attempts=10
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s "$url" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ $service_name is healthy${NC}"
            return 0
        fi
        echo -e "${YELLOW}⏳ Waiting for $service_name... (attempt $attempt/$max_attempts)${NC}"
        sleep 5
        attempt=$((attempt + 1))
    done
    
    echo -e "${RED}❌ $service_name failed health check${NC}"
    return 1
}

# Health checks
check_service "Backend API" "http://localhost:8000/api/health"
check_service "Frontend" "http://localhost:3000"
check_service "Prometheus" "http://localhost:9090/-/healthy"
check_service "Grafana" "http://localhost:3001/api/health"

echo ""
echo -e "${GREEN}🎉 BioThings Open Source Deployment Complete!${NC}"
echo -e "${GREEN}==========================================${NC}"
echo ""
echo -e "${BLUE}📊 Access Points:${NC}"
echo -e "  • Frontend:    ${YELLOW}http://localhost:3000${NC}"
echo -e "  • Backend API: ${YELLOW}http://localhost:8000${NC}"
echo -e "  • API Docs:    ${YELLOW}http://localhost:8000/docs${NC}"
echo -e "  • Prometheus:  ${YELLOW}http://localhost:9090${NC}"
echo -e "  • Grafana:     ${YELLOW}http://localhost:3001${NC} (admin/$(grep GRAFANA_PASSWORD .env.opensource | cut -d'=' -f2))"
echo -e "  • AlertManager: ${YELLOW}http://localhost:9093${NC}"
echo ""
echo -e "${BLUE}🔐 Default Credentials:${NC}"
echo -e "  • Admin User:  admin@biothings.local / admin123"
echo -e "  • Grafana:     admin / $(grep GRAFANA_PASSWORD .env.opensource | cut -d'=' -f2)"
echo ""
echo -e "${BLUE}📋 Next Steps:${NC}"
echo -e "  1. Update GOOGLE_API_KEY in .env.opensource"
echo -e "  2. Change default passwords for production"
echo -e "  3. Configure SSL certificates for HTTPS"
echo -e "  4. Set up backup procedures"
echo ""
echo -e "${YELLOW}💡 Management Commands:${NC}"
echo -e "  • View logs: ${BLUE}$DOCKER_COMPOSE -f docker-compose.opensource.yml logs -f${NC}"
echo -e "  • Stop:      ${BLUE}$DOCKER_COMPOSE -f docker-compose.opensource.yml down${NC}"
echo -e "  • Restart:   ${BLUE}$DOCKER_COMPOSE -f docker-compose.opensource.yml restart${NC}"
echo ""
echo -e "${GREEN}🚀 Your open source BioThings platform is ready!${NC}"