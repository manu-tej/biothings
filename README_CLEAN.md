# BioThings - Clean Architecture

## Overview
BioThings is an AI-powered biotechnology platform using Google Gemini 2.5 with thinking mode capabilities. The system has been refactored for production readiness with a clean, maintainable architecture.

## Architecture

### Backend Structure
```
backend/
├── app/
│   ├── agents/         # Executive AI agents (CEO, CSO, CFO, CTO, COO)
│   ├── core/           # Core services (LLM, messaging)
│   ├── integrations/   # External integrations (CRISPR designer, etc.)
│   ├── workflows/      # Biotech workflows
│   ├── analytics/      # Metrics and analytics
│   └── main.py         # FastAPI application
├── config.py           # Centralized configuration
├── requirements.txt    # Python dependencies
└── .env               # Environment variables
```

### Key Components

#### 1. **LLM Service** (`app/core/llm.py`)
- Gemini 2.5 Flash integration
- Thinking mode with configurable budgets
- Conversation history management
- Cost tracking

#### 2. **Base Agent** (`app/agents/base_agent.py`)
- Simplified abstract base class
- Common functionality for all agents
- Clean async task processing
- Inter-agent collaboration

#### 3. **Executive Agents**
- **CEO**: Strategic vision and leadership
- **CSO**: Scientific research direction
- **CFO**: Financial planning and analysis
- **CTO**: Technology and infrastructure
- **COO**: Operations and efficiency

Each agent has:
- Specific system prompt
- Task processing capability
- Collaboration features
- Usage tracking

## Configuration

### Environment Variables
```env
# API Keys
GOOGLE_API_KEY=your-gemini-api-key

# Model Configuration
GEMINI_MODEL=gemini-2.5-flash
GEMINI_THINKING_BUDGET=8192

# Server Configuration
API_HOST=0.0.0.0
API_PORT=8000

# Optional Services
USE_REDIS=false
REDIS_URL=redis://localhost:6379
```

### Agent-Specific Settings
Each agent can have custom thinking budgets:
- CEO: 16384 tokens (complex strategy)
- CSO: 12288 tokens (research planning)
- CFO: 8192 tokens (financial analysis)
- CTO: 10240 tokens (technical design)
- COO: 8192 tokens (operational planning)

## Quick Start

### 1. Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure
```bash
cp .env.example .env
# Edit .env with your API key
```

### 3. Run
```bash
python -m app.main
```

### 4. Test
```bash
# Check health
curl http://localhost:8000/api/health

# List agents
curl http://localhost:8000/api/agents

# Chat with CEO
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "agent_type": "CEO",
    "message": "What should our R&D focus be?"
  }'
```

## API Endpoints

### Core
- `GET /` - API status
- `GET /api/health` - Health check
- `GET /api/agents` - List all agents
- `POST /api/chat` - Chat with an agent

### Agent Tasks
- `POST /api/agents/{type}/task` - Assign task to agent
- `GET /api/agents/{type}/status` - Get agent status

### Workflows
- `GET /api/workflows` - Available workflows
- `POST /api/workflows/execute` - Execute workflow

### Analytics
- `GET /api/metrics/dashboard` - Dashboard data
- `GET /api/metrics/report` - Executive report

## Key Features

### 1. **Thinking Mode**
Automatically activated for complex tasks:
- Strategy planning
- Research design
- Financial analysis
- Technical architecture

### 2. **Cost Optimization**
- Dynamic thinking budget allocation
- Simple queries use fast mode (0 tokens)
- Complex queries use thinking mode
- Real-time cost tracking

### 3. **Clean Code**
- Simple, readable implementations
- No over-engineering
- Clear separation of concerns
- Type hints throughout

### 4. **Production Ready**
- Error handling
- Logging
- Configuration management
- Health checks
- CORS support

## Development

### Adding New Features
1. Keep it simple
2. Follow existing patterns
3. Add proper type hints
4. Include error handling
5. Update tests

### Code Style
- Use Black for formatting
- Follow PEP 8
- Keep functions focused
- Document complex logic

## Deployment

### Docker
```bash
docker build -t biothings:latest .
docker run -p 8000:8000 --env-file .env biothings:latest
```

### Production Checklist
- [ ] Set production API keys
- [ ] Disable debug mode
- [ ] Configure CORS properly
- [ ] Set up monitoring
- [ ] Enable HTTPS
- [ ] Configure rate limiting

## Performance

### Optimization Tips
1. Use thinking mode only when needed
2. Cache common responses
3. Batch agent tasks
4. Monitor token usage
5. Set appropriate timeouts

### Benchmarks
- Simple query: <200ms
- Complex query with thinking: 2-5s
- Agent collaboration: <1s
- Workflow execution: varies

## Troubleshooting

### Common Issues
1. **API Key Error**: Check GOOGLE_API_KEY in .env
2. **Import Errors**: Ensure virtual environment is activated
3. **Thinking Budget**: Adjust GEMINI_THINKING_BUDGET
4. **Timeout**: Increase agent_response_timeout

### Debug Mode
```python
# Enable detailed logging
import logging
logging.basicConfig(level=logging.DEBUG)
```

## Future Enhancements
1. Real lab equipment integration
2. Advanced CRISPR design tools
3. Drug discovery pipelines
4. Clinical trial management
5. Regulatory compliance automation

---

Built with ❤️ for the future of biotechnology