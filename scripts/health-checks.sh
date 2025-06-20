#!/bin/bash
# Comprehensive Health Check Script for BioThings Production
# Tests all critical system components and generates detailed reports

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
API_BASE_URL="${API_BASE_URL:-http://localhost:8000}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:3000}"
TIMEOUT="${TIMEOUT:-30}"
VERBOSE="${VERBOSE:-false}"

# Metrics
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNINGS=0

echo -e "${BLUE}🏥 BioThings Health Check Suite${NC}"
echo "=================================="
echo "API URL: $API_BASE_URL"
echo "Frontend URL: $FRONTEND_URL"
echo "Timeout: ${TIMEOUT}s"
echo ""

# Logging function
log_check() {
    local status=$1
    local service=$2
    local message=$3
    local details=$4
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    case $status in
        "PASS")
            PASSED_CHECKS=$((PASSED_CHECKS + 1))
            echo -e "${GREEN}✅ [$service] $message${NC}"
            ;;
        "FAIL")
            FAILED_CHECKS=$((FAILED_CHECKS + 1))
            echo -e "${RED}❌ [$service] $message${NC}"
            if [ "$details" != "" ]; then
                echo -e "${RED}   Details: $details${NC}"
            fi
            ;;
        "WARN")
            WARNINGS=$((WARNINGS + 1))
            echo -e "${YELLOW}⚠️  [$service] $message${NC}"
            if [ "$details" != "" ]; then
                echo -e "${YELLOW}   Details: $details${NC}"
            fi
            ;;
    esac
    
    if [ "$VERBOSE" = "true" ] && [ "$details" != "" ]; then
        echo -e "   ${details}"
    fi
}

# HTTP request helper
make_request() {
    local url=$1
    local expected_status=${2:-200}
    local timeout=${3:-$TIMEOUT}
    
    response=$(curl -s -w "\n%{http_code}\n%{time_total}" \
                   --max-time $timeout \
                   --connect-timeout 10 \
                   "$url" 2>/dev/null || echo -e "\nERROR\n0")
    
    # Extract response body, status code, and time
    response_body=$(echo "$response" | head -n -2)
    status_code=$(echo "$response" | tail -n 2 | head -n 1)
    response_time=$(echo "$response" | tail -n 1)
    
    echo "$status_code|$response_time|$response_body"
}

# Check API health endpoint
check_api_health() {
    echo -e "${BLUE}Checking API Health...${NC}"
    
    result=$(make_request "$API_BASE_URL/api/health")
    status_code=$(echo "$result" | cut -d'|' -f1)
    response_time=$(echo "$result" | cut -d'|' -f2)
    response_body=$(echo "$result" | cut -d'|' -f3-)
    
    if [ "$status_code" = "200" ]; then
        log_check "PASS" "API" "Health endpoint responding" "Response time: ${response_time}s"
        
        # Check response structure
        if echo "$response_body" | jq -e '.status' >/dev/null 2>&1; then
            status=$(echo "$response_body" | jq -r '.status')
            if [ "$status" = "healthy" ]; then
                log_check "PASS" "API" "Service status is healthy"
            else
                log_check "WARN" "API" "Service status: $status"
            fi
        else
            log_check "WARN" "API" "Invalid health response format"
        fi
        
        # Check service components
        if echo "$response_body" | jq -e '.services' >/dev/null 2>&1; then
            services=$(echo "$response_body" | jq -r '.services')
            
            # Check LLM service
            llm_status=$(echo "$services" | jq -r '.llm_service // false')
            if [ "$llm_status" = "true" ]; then
                log_check "PASS" "LLM" "Service available"
            else
                log_check "FAIL" "LLM" "Service unavailable"
            fi
            
            # Check message broker
            broker_status=$(echo "$services" | jq -r '.message_broker // false')
            if [ "$broker_status" = "true" ]; then
                log_check "PASS" "MessageBroker" "Connected"
            else
                log_check "WARN" "MessageBroker" "Not connected (optional)"
            fi
            
            # Check agents
            agent_count=$(echo "$services" | jq -r '.agents // 0')
            if [ "$agent_count" -gt 0 ]; then
                log_check "PASS" "Agents" "$agent_count agents active"
            else
                log_check "WARN" "Agents" "No agents active"
            fi
        fi
        
    elif [ "$status_code" = "ERROR" ]; then
        log_check "FAIL" "API" "Connection failed" "Could not connect to $API_BASE_URL"
    else
        log_check "FAIL" "API" "Unhealthy response" "Status code: $status_code"
    fi
}

# Check API endpoints
check_api_endpoints() {
    echo -e "${BLUE}Checking API Endpoints...${NC}"
    
    endpoints=(
        "/api/agents:GET:200"
        "/api/protocols:GET:200"
        "/api/equipment:GET:200"
        "/api/workflows:GET:200"
        "/api/monitoring/metrics/current:GET:200"
        "/api/monitoring/alerts:GET:200"
        "/api/metrics/dashboard:GET:200"
    )
    
    for endpoint_info in "${endpoints[@]}"; do
        IFS=':' read -r path method expected_status <<< "$endpoint_info"
        
        result=$(make_request "$API_BASE_URL$path" "$expected_status")
        status_code=$(echo "$result" | cut -d'|' -f1)
        response_time=$(echo "$result" | cut -d'|' -f2)
        
        if [ "$status_code" = "$expected_status" ]; then
            log_check "PASS" "API" "$path endpoint" "Response time: ${response_time}s"
        elif [ "$status_code" = "ERROR" ]; then
            log_check "FAIL" "API" "$path endpoint" "Connection failed"
        else
            log_check "FAIL" "API" "$path endpoint" "Expected $expected_status, got $status_code"
        fi
        
        # Rate limiting check - warn if response time is too high
        if [ "$status_code" = "$expected_status" ] && [ "$(echo "$response_time > 2.0" | bc -l 2>/dev/null || echo 0)" = "1" ]; then
            log_check "WARN" "Performance" "$path slow response" "Response time: ${response_time}s"
        fi
    done
}

# Check WebSocket connectivity
check_websocket() {
    echo -e "${BLUE}Checking WebSocket...${NC}"
    
    # Simple WebSocket check using curl
    ws_url=$(echo "$API_BASE_URL" | sed 's/http/ws/')/ws
    
    # Test WebSocket upgrade (simplified check)
    result=$(curl -s -w "%{http_code}" \
                  --max-time 10 \
                  -H "Connection: Upgrade" \
                  -H "Upgrade: websocket" \
                  -H "Sec-WebSocket-Version: 13" \
                  -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
                  "$ws_url" 2>/dev/null || echo "ERROR")
    
    if [ "$result" = "101" ]; then
        log_check "PASS" "WebSocket" "Upgrade successful"
    elif [ "$result" = "ERROR" ]; then
        log_check "FAIL" "WebSocket" "Connection failed"
    else
        log_check "WARN" "WebSocket" "Unexpected response" "Status: $result"
    fi
}

# Check frontend
check_frontend() {
    echo -e "${BLUE}Checking Frontend...${NC}"
    
    result=$(make_request "$FRONTEND_URL")
    status_code=$(echo "$result" | cut -d'|' -f1)
    response_time=$(echo "$result" | cut -d'|' -f2)
    response_body=$(echo "$result" | cut -d'|' -f3-)
    
    if [ "$status_code" = "200" ]; then
        log_check "PASS" "Frontend" "Responding" "Response time: ${response_time}s"
        
        # Check if it looks like a valid HTML page
        if echo "$response_body" | grep -q "<html\|<HTML" 2>/dev/null; then
            log_check "PASS" "Frontend" "Valid HTML response"
        else
            log_check "WARN" "Frontend" "Response doesn't appear to be HTML"
        fi
        
        # Check for Next.js indicators
        if echo "$response_body" | grep -q "_next\|__NEXT_DATA__" 2>/dev/null; then
            log_check "PASS" "Frontend" "Next.js application detected"
        else
            log_check "WARN" "Frontend" "Next.js indicators not found"
        fi
        
    elif [ "$status_code" = "ERROR" ]; then
        log_check "FAIL" "Frontend" "Connection failed" "Could not connect to $FRONTEND_URL"
    else
        log_check "FAIL" "Frontend" "Unhealthy response" "Status code: $status_code"
    fi
}

# Check database connectivity (if configured)
check_database() {
    echo -e "${BLUE}Checking Database...${NC}"
    
    if [ -z "$DATABASE_URL" ]; then
        log_check "WARN" "Database" "No DATABASE_URL configured"
        return
    fi
    
    # Try to connect to database
    if command -v psql >/dev/null 2>&1; then
        if psql "$DATABASE_URL" -c "SELECT 1;" >/dev/null 2>&1; then
            log_check "PASS" "Database" "PostgreSQL connection successful"
        else
            log_check "FAIL" "Database" "PostgreSQL connection failed"
        fi
    else
        log_check "WARN" "Database" "psql not available for testing"
    fi
}

# Check Redis connectivity (if configured)
check_redis() {
    echo -e "${BLUE}Checking Redis...${NC}"
    
    if [ -z "$REDIS_URL" ]; then
        log_check "WARN" "Redis" "No REDIS_URL configured"
        return
    fi
    
    # Try to connect to Redis
    if command -v redis-cli >/dev/null 2>&1; then
        if redis-cli -u "$REDIS_URL" ping >/dev/null 2>&1; then
            log_check "PASS" "Redis" "Connection successful"
        else
            log_check "FAIL" "Redis" "Connection failed"
        fi
    else
        log_check "WARN" "Redis" "redis-cli not available for testing"
    fi
}

# Check system resources
check_system_resources() {
    echo -e "${BLUE}Checking System Resources...${NC}"
    
    # Check disk space
    disk_usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    if [ "$disk_usage" -lt 80 ]; then
        log_check "PASS" "Disk" "Usage: ${disk_usage}%"
    elif [ "$disk_usage" -lt 90 ]; then
        log_check "WARN" "Disk" "Usage: ${disk_usage}%" "Consider cleanup"
    else
        log_check "FAIL" "Disk" "Usage: ${disk_usage}%" "Critical disk space"
    fi
    
    # Check memory usage
    if command -v free >/dev/null 2>&1; then
        memory_usage=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
        if [ "$memory_usage" -lt 80 ]; then
            log_check "PASS" "Memory" "Usage: ${memory_usage}%"
        elif [ "$memory_usage" -lt 90 ]; then
            log_check "WARN" "Memory" "Usage: ${memory_usage}%" "High memory usage"
        else
            log_check "FAIL" "Memory" "Usage: ${memory_usage}%" "Critical memory usage"
        fi
    else
        log_check "WARN" "Memory" "Cannot check memory usage"
    fi
    
    # Check load average
    if command -v uptime >/dev/null 2>&1; then
        load_avg=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
        cpu_count=$(nproc 2>/dev/null || echo "1")
        load_percent=$(echo "scale=0; $load_avg * 100 / $cpu_count" | bc -l 2>/dev/null || echo "0")
        
        if [ "$load_percent" -lt 70 ]; then
            log_check "PASS" "CPU" "Load: ${load_avg} (${load_percent}%)"
        elif [ "$load_percent" -lt 90 ]; then
            log_check "WARN" "CPU" "Load: ${load_avg} (${load_percent}%)" "High CPU load"
        else
            log_check "FAIL" "CPU" "Load: ${load_avg} (${load_percent}%)" "Critical CPU load"
        fi
    fi
}

# Check Docker containers (if running in Docker)
check_docker_containers() {
    echo -e "${BLUE}Checking Docker Containers...${NC}"
    
    if ! command -v docker >/dev/null 2>&1; then
        log_check "WARN" "Docker" "Docker not available"
        return
    fi
    
    # Check if containers are running
    containers=("biothings-backend" "biothings-frontend" "biothings-nginx")
    
    for container in "${containers[@]}"; do
        if docker ps --format "table {{.Names}}" | grep -q "$container" 2>/dev/null; then
            # Check container health
            health=$(docker inspect "$container" --format='{{.State.Health.Status}}' 2>/dev/null || echo "unknown")
            case $health in
                "healthy")
                    log_check "PASS" "Docker" "$container is healthy"
                    ;;
                "unhealthy")
                    log_check "FAIL" "Docker" "$container is unhealthy"
                    ;;
                "starting")
                    log_check "WARN" "Docker" "$container is starting"
                    ;;
                *)
                    log_check "PASS" "Docker" "$container is running" "Health check not configured"
                    ;;
            esac
        else
            log_check "WARN" "Docker" "$container not running"
        fi
    done
}

# Check SSL/TLS configuration
check_ssl() {
    echo -e "${BLUE}Checking SSL/TLS...${NC}"
    
    # Extract domain from URL
    domain=$(echo "$API_BASE_URL" | sed -e 's|^[^/]*//||' -e 's|/.*||' -e 's|:.*||')
    
    if [[ "$API_BASE_URL" == https://* ]]; then
        if command -v openssl >/dev/null 2>&1; then
            ssl_info=$(echo | openssl s_client -servername "$domain" -connect "$domain:443" 2>/dev/null | openssl x509 -noout -dates 2>/dev/null)
            
            if [ $? -eq 0 ]; then
                log_check "PASS" "SSL" "Certificate valid"
                
                # Check expiration
                expiry=$(echo "$ssl_info" | grep "notAfter" | cut -d= -f2)
                if [ -n "$expiry" ]; then
                    expiry_timestamp=$(date -d "$expiry" +%s 2>/dev/null || date -j -f "%b %d %H:%M:%S %Y %Z" "$expiry" +%s 2>/dev/null || echo "0")
                    current_timestamp=$(date +%s)
                    days_until_expiry=$(( (expiry_timestamp - current_timestamp) / 86400 ))
                    
                    if [ "$days_until_expiry" -gt 30 ]; then
                        log_check "PASS" "SSL" "Certificate expires in $days_until_expiry days"
                    elif [ "$days_until_expiry" -gt 7 ]; then
                        log_check "WARN" "SSL" "Certificate expires in $days_until_expiry days" "Consider renewal"
                    else
                        log_check "FAIL" "SSL" "Certificate expires in $days_until_expiry days" "Urgent renewal needed"
                    fi
                fi
            else
                log_check "FAIL" "SSL" "Certificate validation failed"
            fi
        else
            log_check "WARN" "SSL" "OpenSSL not available for testing"
        fi
    else
        log_check "WARN" "SSL" "HTTPS not configured" "Consider enabling SSL/TLS"
    fi
}

# Performance benchmarks
run_performance_tests() {
    echo -e "${BLUE}Running Performance Tests...${NC}"
    
    # Simple load test with curl
    echo "Testing API response times..."
    
    total_time=0
    successful_requests=0
    failed_requests=0
    
    for i in {1..10}; do
        result=$(make_request "$API_BASE_URL/api/health" 200 5)
        status_code=$(echo "$result" | cut -d'|' -f1)
        response_time=$(echo "$result" | cut -d'|' -f2)
        
        if [ "$status_code" = "200" ]; then
            successful_requests=$((successful_requests + 1))
            total_time=$(echo "$total_time + $response_time" | bc -l 2>/dev/null || echo "$total_time")
        else
            failed_requests=$((failed_requests + 1))
        fi
    done
    
    if [ "$successful_requests" -gt 0 ]; then
        avg_response_time=$(echo "scale=3; $total_time / $successful_requests" | bc -l 2>/dev/null || echo "0")
        
        if [ "$(echo "$avg_response_time < 0.5" | bc -l 2>/dev/null || echo 0)" = "1" ]; then
            log_check "PASS" "Performance" "Average response time: ${avg_response_time}s"
        elif [ "$(echo "$avg_response_time < 1.0" | bc -l 2>/dev/null || echo 0)" = "1" ]; then
            log_check "WARN" "Performance" "Average response time: ${avg_response_time}s" "Consider optimization"
        else
            log_check "FAIL" "Performance" "Average response time: ${avg_response_time}s" "Poor performance"
        fi
        
        if [ "$failed_requests" -eq 0 ]; then
            log_check "PASS" "Reliability" "10/10 requests successful"
        else
            log_check "WARN" "Reliability" "$successful_requests/10 requests successful"
        fi
    else
        log_check "FAIL" "Performance" "All requests failed"
    fi
}

# Generate summary report
generate_summary() {
    echo ""
    echo -e "${BLUE}📊 Health Check Summary${NC}"
    echo "========================="
    echo -e "Total Checks: $TOTAL_CHECKS"
    echo -e "${GREEN}Passed: $PASSED_CHECKS${NC}"
    echo -e "${RED}Failed: $FAILED_CHECKS${NC}"
    echo -e "${YELLOW}Warnings: $WARNINGS${NC}"
    echo ""
    
    # Calculate health score
    if [ "$TOTAL_CHECKS" -gt 0 ]; then
        health_score=$(echo "scale=1; $PASSED_CHECKS * 100 / $TOTAL_CHECKS" | bc -l 2>/dev/null || echo "0")
        echo -e "Health Score: ${health_score}%"
        
        if [ "$(echo "$health_score >= 90" | bc -l 2>/dev/null || echo 0)" = "1" ]; then
            echo -e "${GREEN}System Status: HEALTHY${NC}"
            exit_code=0
        elif [ "$(echo "$health_score >= 70" | bc -l 2>/dev/null || echo 0)" = "1" ]; then
            echo -e "${YELLOW}System Status: WARNING${NC}"
            exit_code=1
        else
            echo -e "${RED}System Status: CRITICAL${NC}"
            exit_code=2
        fi
    else
        echo -e "${RED}System Status: UNKNOWN${NC}"
        exit_code=3
    fi
    
    echo ""
    echo "Timestamp: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
    
    return $exit_code
}

# Main execution
main() {
    check_api_health
    check_api_endpoints
    check_websocket
    check_frontend
    check_database
    check_redis
    check_system_resources
    check_docker_containers
    check_ssl
    run_performance_tests
    
    generate_summary
    exit_code=$?
    
    # Save results to file if requested
    if [ -n "$HEALTH_CHECK_LOG" ]; then
        {
            echo "BioThings Health Check Report"
            echo "Generated: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
            echo "Total Checks: $TOTAL_CHECKS"
            echo "Passed: $PASSED_CHECKS"
            echo "Failed: $FAILED_CHECKS"
            echo "Warnings: $WARNINGS"
            echo "Health Score: ${health_score}%"
        } > "$HEALTH_CHECK_LOG"
    fi
    
    exit $exit_code
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --api-url)
            API_BASE_URL="$2"
            shift 2
            ;;
        --frontend-url)
            FRONTEND_URL="$2"
            shift 2
            ;;
        --timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        --verbose)
            VERBOSE="true"
            shift
            ;;
        --log)
            HEALTH_CHECK_LOG="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [options]"
            echo "Options:"
            echo "  --api-url URL         API base URL (default: http://localhost:8000)"
            echo "  --frontend-url URL    Frontend URL (default: http://localhost:3000)"
            echo "  --timeout SECONDS     Request timeout (default: 30)"
            echo "  --verbose             Verbose output"
            echo "  --log FILE            Save results to file"
            echo "  --help                Show this help"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Run main function
main