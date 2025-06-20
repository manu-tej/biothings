# BioThings - AI-Powered Biotech Dashboard

An AI-powered biotech company simulation with executive agents using Google Gemini.

## Overview

BioThings is a real-time dashboard where AI agents (CEO, CSO, CFO, CTO, COO) collaborate to make strategic decisions, manage research workflows, and optimize biotech operations.

### Architecture

```
┌─────────────────────────────────────────┐
│       Next.js Frontend Dashboard        │
│         Real-time WebSocket             │
└────────────────┬───────────────────────┘
                 │
┌────────────────▼───────────────────────┐
│         FastAPI Backend                 │
│  ┌─────────────────────────────────┐  │
│  │   Executive AI Agents           │  │
│  │  CEO, CSO, CFO, CTO, COO       │  │
│  └──────────┬──────────────────────┘  │
│             │                          │
│  ┌──────────▼──────────────────────┐  │
│  │   Google Gemini LLM Service     │  │
│  │  • Strategic decisions          │  │
│  │  • Scientific analysis          │  │
│  │  • Financial planning           │  │
│  └─────────────────────────────────┘  │
└────────────────────────────────────────┘
```

## Features

- **AI Executive Agents**: CEO, CSO, CFO, CTO, COO with specialized roles
- **Real-time Monitoring**: WebSocket-based live updates and agent communication
- **Biotech Workflows**: CRISPR, protein synthesis, drug screening automation
- **Inter-agent Collaboration**: Agents communicate and make collective decisions
- **Google Gemini Integration**: Fast, cost-effective AI with advanced capabilities

## Tech Stack

- **Backend**: FastAPI, LangChain, LangGraph, Redis
- **Frontend**: Next.js 14, TypeScript, React, WebSockets
- **AI/LLM**: Google Gemini (gemini-2.0-flash-exp)
- **Infrastructure**: Docker, Redis Pub/Sub

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- Docker and Docker Compose
- Google API key for Gemini

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd biothings
```

2. Copy environment variables:
```bash
cp backend/.env.example backend/.env
```

3. Edit `backend/.env` and add your Google API key:
```
GOOGLE_API_KEY=your-actual-api-key-here
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
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Run the backend:
```bash
python -m app.main
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
│   ├── app/
│   │   ├── agents/          # AI agent implementations
│   │   ├── api/             # FastAPI endpoints  
│   │   ├── core/            # Core services (LLM, messaging)
│   │   ├── models/          # Data models
│   │   └── workflows/       # Biotech workflows
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── app/                 # Next.js app directory
│   ├── components/          # React components
│   └── package.json
├── demo.py                  # Quick demo script
├── docker-compose.yml       # Container orchestration
└── README.md
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

## Running the Demo

```bash
python demo.py
```

This will test:
- Basic LLM responses
- Executive agent decision-making
- Inter-agent collaboration

## Get Google API Key

Visit https://makersuite.google.com/app/apikey to get your Gemini API key.

## License

MIT License