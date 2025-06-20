#!/bin/bash
# ☁️ Cloud Deployment Script for BioThings

set -e

echo "☁️ BioThings Cloud Deployment"
echo "============================="

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

# Deploy to different cloud providers
deploy_aws() {
    echo -e "${BLUE}📦 Deploying to AWS ECS...${NC}"
    
    # Build and push to ECR
    aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin $ECR_URI
    docker build -t biothings .
    docker tag biothings:latest $ECR_URI/biothings:latest
    docker push $ECR_URI/biothings:latest
    
    # Update ECS service
    aws ecs update-service --cluster biothings-cluster --service biothings-service --force-new-deployment
    
    echo -e "${GREEN}✅ AWS deployment complete!${NC}"
}

deploy_gcp() {
    echo -e "${BLUE}📦 Deploying to Google Cloud Run...${NC}"
    
    # Build and push to GCR
    gcloud builds submit --tag gcr.io/$PROJECT_ID/biothings
    
    # Deploy to Cloud Run
    gcloud run deploy biothings \
        --image gcr.io/$PROJECT_ID/biothings \
        --platform managed \
        --region us-central1 \
        --allow-unauthenticated \
        --set-env-vars "GOOGLE_API_KEY=$GOOGLE_API_KEY,GEMINI_MODEL=gemini-2.5-flash"
    
    echo -e "${GREEN}✅ GCP deployment complete!${NC}"
}

deploy_azure() {
    echo -e "${BLUE}📦 Deploying to Azure Container Instances...${NC}"
    
    # Build and push to ACR
    az acr build --registry $ACR_NAME --image biothings:latest .
    
    # Deploy container instance
    az container create \
        --resource-group biothings-rg \
        --name biothings \
        --image $ACR_NAME.azurecr.io/biothings:latest \
        --dns-name-label biothings \
        --ports 8000 \
        --environment-variables \
            GOOGLE_API_KEY=$GOOGLE_API_KEY \
            GEMINI_MODEL=gemini-2.5-flash
    
    echo -e "${GREEN}✅ Azure deployment complete!${NC}"
}

deploy_railway() {
    echo -e "${BLUE}📦 Deploying to Railway...${NC}"
    
    # Railway CLI deployment
    railway login
    railway link
    railway up
    
    echo -e "${GREEN}✅ Railway deployment complete!${NC}"
}

deploy_render() {
    echo -e "${BLUE}📦 Deploying to Render...${NC}"
    
    # Create render.yaml if not exists
    cat > render.yaml << EOF
services:
  - type: web
    name: biothings
    runtime: docker
    dockerfilePath: ./Dockerfile
    envVars:
      - key: GOOGLE_API_KEY
        sync: false
      - key: GEMINI_MODEL
        value: gemini-2.5-flash
    healthCheckPath: /api/health
EOF
    
    echo "Please connect your GitHub repo to Render and it will auto-deploy!"
    echo "Visit: https://render.com/deploy"
    
    echo -e "${GREEN}✅ Render config created!${NC}"
}

deploy_heroku() {
    echo -e "${BLUE}📦 Deploying to Heroku...${NC}"
    
    # Create heroku.yml
    cat > heroku.yml << EOF
build:
  docker:
    web: Dockerfile
run:
  web: python -m app.main
EOF
    
    # Deploy
    heroku create biothings-app
    heroku config:set GOOGLE_API_KEY=$GOOGLE_API_KEY
    heroku config:set GEMINI_MODEL=gemini-2.5-flash
    git push heroku main
    
    echo -e "${GREEN}✅ Heroku deployment complete!${NC}"
}

# Main menu
case "$1" in
    "aws")
        deploy_aws
        ;;
    "gcp")
        deploy_gcp
        ;;
    "azure")
        deploy_azure
        ;;
    "railway")
        deploy_railway
        ;;
    "render")
        deploy_render
        ;;
    "heroku")
        deploy_heroku
        ;;
    *)
        echo "Usage: ./deploy-cloud.sh [provider]"
        echo ""
        echo "Providers:"
        echo "  aws     - Deploy to AWS ECS"
        echo "  gcp     - Deploy to Google Cloud Run"
        echo "  azure   - Deploy to Azure Container Instances"
        echo "  railway - Deploy to Railway"
        echo "  render  - Deploy to Render"
        echo "  heroku  - Deploy to Heroku"
        echo ""
        echo "Prerequisites:"
        echo "  - Docker installed"
        echo "  - Cloud CLI tools configured"
        echo "  - GOOGLE_API_KEY environment variable set"
        ;;
esac