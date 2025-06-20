#!/bin/bash
# BioThings Production Setup Script
# Sets up monitoring, security, and production infrastructure

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}🚀 BioThings Production Setup${NC}"
echo "=================================="

# Check prerequisites
check_prerequisites() {
    echo -e "${YELLOW}Checking prerequisites...${NC}"
    
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}❌ Docker is not installed${NC}"
        exit 1
    fi
    
    # Check if kubectl is installed (for Kubernetes deployments)
    if ! command -v kubectl &> /dev/null; then
        echo -e "${YELLOW}⚠️  kubectl not found - Kubernetes features disabled${NC}"
        KUBERNETES_ENABLED=false
    else
        KUBERNETES_ENABLED=true
    fi
    
    # Check if Helm is installed
    if ! command -v helm &> /dev/null; then
        echo -e "${YELLOW}⚠️  Helm not found - Kubernetes charts disabled${NC}"
        HELM_ENABLED=false
    else
        HELM_ENABLED=true
    fi
    
    echo -e "${GREEN}✅ Prerequisites checked${NC}"
}

# Setup monitoring stack
setup_monitoring() {
    echo -e "${YELLOW}Setting up monitoring stack...${NC}"
    
    # Create monitoring directory
    mkdir -p monitoring/{prometheus,grafana,alertmanager}
    
    # Prometheus configuration
    cat > monitoring/prometheus/prometheus.yml << 'EOF'
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
    metrics_path: '/metrics'
    scrape_interval: 10s

  - job_name: 'biothings-frontend'
    static_configs:
      - targets: ['frontend:3000']
    metrics_path: '/metrics'
    scrape_interval: 10s

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']
EOF

    # Prometheus alert rules
    cat > monitoring/prometheus/alert_rules.yml << 'EOF'
groups:
  - name: biothings-alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} errors per second"

      - alert: HighLatency
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High latency detected"
          description: "95th percentile latency is {{ $value }} seconds"

      - alert: ServiceDown
        expr: up == 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Service is down"
          description: "{{ $labels.instance }} of job {{ $labels.job }} has been down for more than 5 minutes"

      - alert: HighMemoryUsage
        expr: (node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes > 0.9
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage"
          description: "Memory usage is {{ $value | humanizePercentage }} on {{ $labels.instance }}"

      - alert: HighCPUUsage
        expr: 100 - (avg by(instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 90
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "High CPU usage"
          description: "CPU usage is {{ $value }}% on {{ $labels.instance }}"
EOF

    # Grafana configuration
    cat > monitoring/grafana/grafana.ini << 'EOF'
[server]
http_port = 3001
domain = localhost

[security]
admin_user = admin
admin_password = ${GRAFANA_PASSWORD:-admin123}

[users]
allow_sign_up = false

[auth.anonymous]
enabled = false

[alerting]
enabled = true
EOF

    # Grafana provisioning
    mkdir -p monitoring/grafana/provisioning/{datasources,dashboards}
    
    cat > monitoring/grafana/provisioning/datasources/prometheus.yml << 'EOF'
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
EOF

    # AlertManager configuration
    cat > monitoring/alertmanager/alertmanager.yml << 'EOF'
global:
  smtp_smarthost: 'localhost:587'
  smtp_from: 'alerts@biothings.ai'

route:
  group_by: ['alertname']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'web.hook'

receivers:
  - name: 'web.hook'
    slack_configs:
      - api_url: '${SLACK_WEBHOOK_URL}'
        channel: '#alerts'
        title: 'BioThings Alert'
        text: '{{ range .Alerts }}{{ .Annotations.summary }}\n{{ .Annotations.description }}{{ end }}'
EOF

    echo -e "${GREEN}✅ Monitoring stack configured${NC}"
}

# Setup security configurations
setup_security() {
    echo -e "${YELLOW}Setting up security configurations...${NC}"
    
    # Create security directory
    mkdir -p security/{nginx,ssl,secrets}
    
    # Enhanced Nginx configuration with security
    cat > security/nginx/nginx-production.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    # Basic Settings
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    server_tokens off;
    
    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=1r/s;
    
    # Security Headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';";
    add_header Referrer-Policy "strict-origin-when-cross-origin";
    
    # Logging
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;
    
    # Upstream servers
    upstream backend {
        server backend:8000;
        keepalive 32;
    }
    
    upstream frontend {
        server frontend:3000;
        keepalive 32;
    }
    
    # HTTP Server (redirect to HTTPS)
    server {
        listen 80;
        server_name _;
        return 301 https://$host$request_uri;
    }
    
    # HTTPS Server
    server {
        listen 443 ssl http2;
        server_name ${DOMAIN_NAME:-localhost};
        
        # SSL Configuration
        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;
        
        # API Routes
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
            
            # Timeouts
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }
        
        # WebSocket
        location /ws {
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_read_timeout 86400;
        }
        
        # Health Check (no rate limit)
        location /api/health {
            proxy_pass http://backend;
            access_log off;
        }
        
        # Frontend
        location / {
            proxy_pass http://frontend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }
        
        # Static files caching
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
EOF

    # Security headers middleware for FastAPI
    cat > security/middleware.py << 'EOF'
from fastapi import Request, Response
from fastapi.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response as StarletteResponse
import time

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        # Security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Content-Security-Policy"] = "default-src 'self'"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        
        return response

class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, calls: int = 100, period: int = 60):
        super().__init__(app)
        self.calls = calls
        self.period = period
        self.clients = {}
    
    async def dispatch(self, request: Request, call_next):
        client_ip = request.client.host
        now = time.time()
        
        # Clean old entries
        self.clients = {
            ip: timestamps for ip, timestamps in self.clients.items()
            if timestamps and now - timestamps[-1] < self.period
        }
        
        # Check rate limit
        if client_ip not in self.clients:
            self.clients[client_ip] = []
        
        self.clients[client_ip] = [
            timestamp for timestamp in self.clients[client_ip]
            if now - timestamp < self.period
        ]
        
        if len(self.clients[client_ip]) >= self.calls:
            return StarletteResponse(
                "Rate limit exceeded", 
                status_code=429,
                headers={"Retry-After": str(self.period)}
            )
        
        self.clients[client_ip].append(now)
        response = await call_next(request)
        return response
EOF

    echo -e "${GREEN}✅ Security configurations created${NC}"
}

# Setup backup and recovery
setup_backup() {
    echo -e "${YELLOW}Setting up backup and recovery...${NC}"
    
    mkdir -p backup/{scripts,configs}
    
    # Backup script
    cat > backup/scripts/backup.sh << 'EOF'
#!/bin/bash
# Automated backup script for BioThings

BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
S3_BUCKET="${S3_BACKUP_BUCKET:-biothings-backups}"

# Create backup directory
mkdir -p $BACKUP_DIR/$TIMESTAMP

# Backup application data
if [ -n "$DATABASE_URL" ]; then
    echo "Backing up database..."
    pg_dump $DATABASE_URL > $BACKUP_DIR/$TIMESTAMP/database.sql
fi

# Backup configuration files
echo "Backing up configurations..."
cp -r /app/config $BACKUP_DIR/$TIMESTAMP/
cp -r /etc/nginx $BACKUP_DIR/$TIMESTAMP/

# Backup logs
echo "Backing up logs..."
cp -r /var/log $BACKUP_DIR/$TIMESTAMP/

# Compress backup
tar -czf $BACKUP_DIR/backup_$TIMESTAMP.tar.gz -C $BACKUP_DIR $TIMESTAMP
rm -rf $BACKUP_DIR/$TIMESTAMP

# Upload to S3 if configured
if [ -n "$AWS_ACCESS_KEY_ID" ] && [ -n "$S3_BUCKET" ]; then
    echo "Uploading to S3..."
    aws s3 cp $BACKUP_DIR/backup_$TIMESTAMP.tar.gz s3://$S3_BUCKET/$(date +%Y/%m/%d)/backup_$TIMESTAMP.tar.gz
fi

# Clean old local backups (keep last 7 days)
find $BACKUP_DIR -name "backup_*.tar.gz" -mtime +7 -delete

echo "Backup completed: backup_$TIMESTAMP.tar.gz"
EOF

    chmod +x backup/scripts/backup.sh
    
    # Recovery script
    cat > backup/scripts/recovery.sh << 'EOF'
#!/bin/bash
# Recovery script for BioThings

BACKUP_FILE=$1
S3_BUCKET="${S3_BACKUP_BUCKET:-biothings-backups}"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup_file_or_s3_path>"
    exit 1
fi

# Download from S3 if it's an S3 path
if [[ $BACKUP_FILE == s3://* ]]; then
    echo "Downloading backup from S3..."
    aws s3 cp $BACKUP_FILE ./restore_backup.tar.gz
    BACKUP_FILE="./restore_backup.tar.gz"
fi

# Extract backup
echo "Extracting backup..."
tar -xzf $BACKUP_FILE -C /tmp/

# Find extracted directory
BACKUP_DIR=$(find /tmp -name "*backup*" -type d | head -1)

# Restore database
if [ -f "$BACKUP_DIR/database.sql" ]; then
    echo "Restoring database..."
    psql $DATABASE_URL < $BACKUP_DIR/database.sql
fi

# Restore configurations
if [ -d "$BACKUP_DIR/config" ]; then
    echo "Restoring configurations..."
    cp -r $BACKUP_DIR/config/* /app/config/
fi

echo "Recovery completed"
EOF

    chmod +x backup/scripts/recovery.sh
    
    echo -e "${GREEN}✅ Backup and recovery configured${NC}"
}

# Setup Kubernetes manifests
setup_kubernetes() {
    if [ "$KUBERNETES_ENABLED" = false ]; then
        echo -e "${YELLOW}⚠️  Skipping Kubernetes setup - kubectl not available${NC}"
        return
    fi
    
    echo -e "${YELLOW}Setting up Kubernetes manifests...${NC}"
    
    mkdir -p k8s/{base,overlays/{staging,production}}
    
    # Base deployment
    cat > k8s/base/deployment.yaml << 'EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: biothings-backend
  labels:
    app: biothings-backend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: biothings-backend
  template:
    metadata:
      labels:
        app: biothings-backend
    spec:
      containers:
      - name: backend
        image: biothings:latest
        ports:
        - containerPort: 8000
        env:
        - name: GOOGLE_API_KEY
          valueFrom:
            secretKeyRef:
              name: biothings-secrets
              key: google-api-key
        - name: GEMINI_MODEL
          value: "gemini-2.5-flash"
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /api/health
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/health
            port: 8000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: biothings-backend-service
spec:
  selector:
    app: biothings-backend
  ports:
  - port: 8000
    targetPort: 8000
  type: ClusterIP
EOF

    # HPA configuration
    cat > k8s/base/hpa.yaml << 'EOF'
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: biothings-backend-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: biothings-backend
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
EOF

    # Production overlay
    cat > k8s/overlays/production/kustomization.yaml << 'EOF'
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
- ../../base

patchesStrategicMerge:
- deployment-patch.yaml

images:
- name: biothings
  newTag: v1.0.0
EOF

    cat > k8s/overlays/production/deployment-patch.yaml << 'EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: biothings-backend
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: backend
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
EOF

    echo -e "${GREEN}✅ Kubernetes manifests created${NC}"
}

# Setup CI/CD pipeline
setup_cicd() {
    echo -e "${YELLOW}Setting up CI/CD pipeline...${NC}"
    
    mkdir -p .github/workflows
    
    cat > .github/workflows/cicd.yaml << 'EOF'
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - name: Install dependencies
        run: |
          cd backend
          pip install -r requirements.txt
          pip install pytest pytest-cov safety bandit
      
      - name: Run tests
        run: |
          cd backend
          pytest --cov=app tests/ --cov-report=xml
      
      - name: Security scan
        run: |
          cd backend
          safety check --json || true
          bandit -r app/ -f json || true
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./backend/coverage.xml

  security-scan:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      
      - name: Build Docker image
        run: docker build -t biothings:latest .
      
      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: 'biothings:latest'
          format: 'sarif'
          output: 'trivy-results.sarif'
      
      - name: Upload Trivy scan results
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: 'trivy-results.sarif'

  build:
    needs: [test, security-scan]
    runs-on: ubuntu-latest
    outputs:
      image: ${{ steps.image.outputs.image }}
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      
      - name: Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=ref,event=pr
            type=sha
      
      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
      
      - name: Output image
        id: image
        run: echo "image=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}" >> $GITHUB_OUTPUT

  deploy-staging:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/develop'
    environment: staging
    steps:
      - name: Deploy to staging
        run: |
          echo "Deploying ${{ needs.build.outputs.image }} to staging"
          # Add actual deployment commands here

  deploy-production:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    environment: production
    steps:
      - name: Deploy to production
        run: |
          echo "Deploying ${{ needs.build.outputs.image }} to production"
          # Add actual deployment commands here
EOF

    echo -e "${GREEN}✅ CI/CD pipeline configured${NC}"
}

# Setup Docker Compose for production
setup_docker_compose() {
    echo -e "${YELLOW}Setting up production Docker Compose...${NC}"
    
    cat > docker-compose.prod.yml << 'EOF'
version: '3.8'

services:
  backend:
    build: .
    container_name: biothings-backend
    restart: unless-stopped
    environment:
      - GOOGLE_API_KEY=${GOOGLE_API_KEY}
      - GEMINI_MODEL=${GEMINI_MODEL:-gemini-2.5-flash}
      - GEMINI_THINKING_BUDGET=${GEMINI_THINKING_BUDGET:-8192}
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
    volumes:
      - ./logs:/app/logs
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    networks:
      - biothings-network
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '1.0'

  frontend:
    build: ./frontend
    container_name: biothings-frontend
    restart: unless-stopped
    environment:
      - NEXT_PUBLIC_API_URL=https://${DOMAIN_NAME}/api
      - NODE_ENV=production
    volumes:
      - ./logs:/app/logs
    networks:
      - biothings-network
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '0.5'

  nginx:
    image: nginx:alpine
    container_name: biothings-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./security/nginx/nginx-production.conf:/etc/nginx/nginx.conf:ro
      - ./security/ssl:/etc/nginx/ssl:ro
      - ./logs/nginx:/var/log/nginx
    depends_on:
      - backend
      - frontend
    networks:
      - biothings-network

  redis:
    image: redis:7-alpine
    container_name: biothings-redis
    restart: unless-stopped
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    networks:
      - biothings-network

  postgres:
    image: postgres:15-alpine
    container_name: biothings-postgres
    restart: unless-stopped
    environment:
      - POSTGRES_DB=${POSTGRES_DB:-biothings}
      - POSTGRES_USER=${POSTGRES_USER:-biothings}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backup/postgres:/backup
    networks:
      - biothings-network

  prometheus:
    image: prom/prometheus:latest
    container_name: biothings-prometheus
    restart: unless-stopped
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus:/etc/prometheus
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--storage.tsdb.retention.time=200h'
      - '--web.enable-lifecycle'
    networks:
      - biothings-network

  grafana:
    image: grafana/grafana:latest
    container_name: biothings-grafana
    restart: unless-stopped
    ports:
      - "3001:3000"
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana:/etc/grafana
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD:-admin123}
    networks:
      - biothings-network

  alertmanager:
    image: prom/alertmanager:latest
    container_name: biothings-alertmanager
    restart: unless-stopped
    ports:
      - "9093:9093"
    volumes:
      - ./monitoring/alertmanager:/etc/alertmanager
    networks:
      - biothings-network

  node-exporter:
    image: prom/node-exporter:latest
    container_name: biothings-node-exporter
    restart: unless-stopped
    ports:
      - "9100:9100"
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    command:
      - '--path.procfs=/host/proc'
      - '--path.rootfs=/rootfs'
      - '--path.sysfs=/host/sys'
      - '--collector.filesystem.mount-points-exclude=^/(sys|proc|dev|host|etc)($$|/)'
    networks:
      - biothings-network

volumes:
  postgres_data:
  redis_data:
  prometheus_data:
  grafana_data:

networks:
  biothings-network:
    driver: bridge
EOF

    echo -e "${GREEN}✅ Production Docker Compose configured${NC}"
}

# Main setup function
main() {
    echo -e "${BLUE}Starting BioThings production setup...${NC}"
    
    check_prerequisites
    setup_monitoring
    setup_security
    setup_backup
    setup_kubernetes
    setup_cicd
    setup_docker_compose
    
    echo ""
    echo -e "${GREEN}🎉 Production setup completed!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Set environment variables in .env file"
    echo "2. Generate SSL certificates for HTTPS"
    echo "3. Configure monitoring dashboards"
    echo "4. Set up backup scheduling"
    echo "5. Run: docker-compose -f docker-compose.prod.yml up -d"
    echo ""
    echo "For more information, see: scratch_notes/production_operations_roadmap.md"
}

# Run main function
main "$@"