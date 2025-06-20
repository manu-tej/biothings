# BioThings AI Platform

An LLM-powered monitoring interface for automating biotech operations using hierarchical AI agents.

## Overview

This platform enables you to operate as the board of directors, overseeing all biotech operations through AI agents that handle day-to-day tasks while providing real-time visibility and control.

### Architecture

```
Board of Directors (You)
    ├── CEO Agent
    │   ├── COO Agent (Operations)
    │   ├── CSO Agent (Science)
    │   ├── CFO Agent (Finance)
    │   └── CTO Agent (Technology)
    └── Real-time Monitoring Dashboard
```

## Features

- **Hierarchical Multi-Agent System**: AI agents organized in a corporate structure
- **Real-time Monitoring**: WebSocket-based live updates and metrics
- **Task Delegation**: Automatic task assignment and tracking
- **Biotech Integration**: Lab equipment monitoring, experiment tracking, inventory management
- **Scalable Architecture**: Microservices-based design with Docker

## Tech Stack

- **Backend**: FastAPI, LangChain, LangGraph, PostgreSQL, Redis
- **Frontend**: Next.js 14, TypeScript, React Query, WebSockets
- **Infrastructure**: Docker, Nginx

## Quick Start

### Prerequisites

- Docker and Docker Compose
- OpenAI API key

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd biothings
```

2. Copy environment variables:
```bash
cp .env.example .env
```

3. Edit `.env` and add your OpenAI API key:
```
OPENAI_API_KEY=your-actual-api-key-here
```

4. Start the platform:
```bash
docker-compose up -d
```

5. Access the dashboard:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

## Development Setup

### Backend Development

1. Create virtual environment:
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Run the backend:
```bash
python main.py
```

### Frontend Development

1. Install dependencies:
```bash
cd frontend
npm install
```

2. Run the development server:
```bash
npm run dev
```

## Project Structure

```
biothings/
├── backend/
│   ├── agents/          # AI agent implementations
│   ├── api/             # FastAPI endpoints
│   ├── monitoring/      # Metrics and monitoring
│   └── workflows/       # Business logic workflows
├── frontend/
│   ├── app/             # Next.js app directory
│   ├── components/      # React components
│   └── lib/             # Utilities and hooks
└── docker-compose.yml   # Container orchestration
```

## API Endpoints

- `GET /api/agents` - List all agents
- `POST /api/agents` - Create new agent
- `GET /api/monitoring/metrics/current` - Get current metrics
- `GET /api/workflows` - List workflows
- `WS /ws/{client_id}` - WebSocket connection

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is proprietary and confidential.