# BioThings Makefile for easy commands

.PHONY: help install run test deploy clean docker-build docker-run

# Default target
help:
	@echo "🧬 BioThings - Available commands:"
	@echo ""
	@echo "  make install    - Install dependencies"
	@echo "  make run        - Run locally"
	@echo "  make test       - Run tests"
	@echo "  make deploy     - Deploy with Docker"
	@echo "  make clean      - Clean up"
	@echo ""
	@echo "  make docker-build - Build Docker image"
	@echo "  make docker-run   - Run Docker container"
	@echo ""

# Install dependencies
install:
	cd backend && python -m venv venv && \
	. venv/bin/activate && \
	pip install -r requirements.txt

# Run locally
run:
	cd backend && \
	. venv/bin/activate && \
	python -m app.main

# Run tests
test:
	@echo "🧪 Testing API endpoints..."
	@curl -s http://localhost:8000/api/health | python -m json.tool
	@echo ""
	@curl -s http://localhost:8000/api/agents | python -m json.tool

# Deploy with Docker
deploy:
	./deploy.sh

# Build Docker image
docker-build:
	docker build -t biothings:latest .

# Run Docker container
docker-run:
	docker run -p 8000:8000 \
		-e GOOGLE_API_KEY=$(GOOGLE_API_KEY) \
		-e GEMINI_MODEL=gemini-2.5-flash \
		biothings:latest

# Clean up
clean:
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
	find . -type f -name "*.log" -delete
	docker-compose down -v 2>/dev/null || true