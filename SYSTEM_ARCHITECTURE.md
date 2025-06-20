# BioThings System Architecture

## 🏗️ Overview

BioThings is an AI-powered biotech platform that uses Google Gemini as its exclusive LLM provider. The system simulates a complete biotech company with executive agents, research workflows, and real-time analytics.

## 🔧 Core Components

### 1. LLM Service (`backend/app/core/llm.py`)
- **Purpose**: Centralized interface to Google Gemini
- **Features**:
  - Async response generation
  - Conversation history management
  - Token counting and cost tracking
  - Context-aware responses
- **Configuration**:
  ```python
  GOOGLE_API_KEY=your-key
  GEMINI_MODEL=gemini-2.0-flash-exp
  ```

### 2. Executive Agents (`backend/app/agents/`)
Five specialized agents with distinct roles:

#### CEO Agent
- Strategic vision and company direction
- High-level decision making
- Inter-department coordination
- Stakeholder management

#### CSO Agent (Chief Scientific Officer)
- Research pipeline management
- Scientific feasibility assessment
- Innovation strategy
- Technical due diligence

#### CFO Agent (Chief Financial Officer)
- Financial planning and analysis
- Budget management
- ROI evaluation
- Risk assessment

#### CTO Agent (Chief Technology Officer)
- Technology infrastructure
- Data management strategy
- Security and compliance
- Technical architecture

#### COO Agent (Chief Operating Officer)
- Operational efficiency
- Resource allocation
- Process optimization
- Execution planning

### 3. Workflow Engine (`backend/app/workflows/`)
Pre-configured biotech workflows:
- **CRISPR Gene Editing**: Complete knockout protocol
- **CAR-T Development**: Cell therapy manufacturing
- **Drug Screening**: High-throughput compound testing
- **Protein Production**: Recombinant protein expression

### 4. Analytics Engine (`backend/app/analytics/`)
- Real-time metrics tracking
- KPI monitoring
- Predictive analytics
- Anomaly detection
- Executive reporting

## 🌐 API Architecture

### RESTful Endpoints
```
GET  /                      # API status
GET  /api/agents            # List all agents
POST /api/agents/{type}/task # Assign task to agent
POST /api/chat              # Chat with agent
GET  /api/experiments       # Active experiments
GET  /api/protocols         # Available protocols
GET  /api/equipment         # Equipment status
GET  /api/health           # Health check
```

### WebSocket Support
```
WS /ws                      # Real-time updates
```

## 📊 Data Flow

```
User Request
    ↓
FastAPI Router
    ↓
Agent Selection
    ↓
LangGraph Workflow
    ↓
Google Gemini LLM
    ↓
Response Processing
    ↓
Client Response
```

## 🔄 Agent Collaboration Flow

```
1. Task Assignment
   └─> CEO Agent (Strategic Analysis)
       ├─> CSO Agent (Technical Feasibility)
       ├─> CFO Agent (Financial Analysis)
       ├─> CTO Agent (Infrastructure Needs)
       └─> COO Agent (Implementation Plan)

2. Consensus Building
   └─> Agents share insights via message broker
   
3. Decision Output
   └─> Consolidated recommendation with confidence scores
```

## 🧬 Biotech Workflow Architecture

### Workflow Execution Pipeline
```
1. Workflow Selection
2. Parameter Configuration
3. Step-by-Step Execution
   - LLM guidance for critical steps
   - Automated quality checks
   - Progress monitoring
4. Results Compilation
5. Report Generation
```

### Example: CRISPR Workflow
```
Design gRNAs (4h)
    ↓
Validate in vitro (24h)
    ↓
Transfect cells (6h)
    ↓
Select clones (14 days)
    ↓
Verify edits (48h)
```

## 💾 State Management

### Agent State
- Current task
- Conversation history
- Decision context
- Metrics tracking

### Workflow State
- Execution status
- Current step
- Results accumulation
- Error handling

### System State
- Active agents
- Running workflows
- Alert conditions
- Performance metrics

## 🔒 Security Considerations

1. **API Key Management**
   - Environment variables
   - Never committed to repo
   - Rotation capability

2. **Access Control**
   - Agent-level permissions
   - Workflow authorization
   - Data access policies

3. **Data Protection**
   - Conversation encryption
   - Result anonymization
   - Audit logging

## 🚀 Deployment Architecture

### Development
```bash
./start_system.sh
```

### Production (Recommended)
```
Load Balancer
    ↓
API Servers (3x)
    ↓
Redis Cluster
    ↓
PostgreSQL
```

### Container Architecture
```yaml
services:
  backend:
    - FastAPI application
    - Agent services
    - Workflow engine
  
  redis:
    - Message broker
    - Cache layer
  
  postgres:
    - Persistent storage
    - Audit logs
```

## 📈 Performance Optimization

1. **LLM Optimization**
   - Response caching
   - Batch processing
   - Token management
   - Cost optimization

2. **Agent Optimization**
   - Parallel processing
   - State caching
   - Workflow optimization

3. **System Optimization**
   - Connection pooling
   - Async operations
   - Resource management

## 🔍 Monitoring & Observability

### Metrics Tracked
- LLM response times
- Token usage
- Agent decision times
- Workflow completion rates
- System resource usage

### Alerting
- API errors
- LLM failures
- Workflow failures
- Resource exhaustion
- Cost thresholds

## 🛠️ Extension Points

1. **New Agents**
   - Inherit from BaseAgent
   - Define system prompt
   - Implement workflow graph

2. **New Workflows**
   - Define workflow steps
   - Add to workflow engine
   - Configure LLM guidance

3. **New Analytics**
   - Add metric types
   - Define KPIs
   - Create visualizations

## 📚 Technology Stack

- **Backend**: FastAPI, Python 3.11+
- **LLM**: Google Gemini (gemini-2.0-flash-exp)
- **Agents**: LangChain, LangGraph
- **Real-time**: WebSockets, Redis
- **Frontend**: Next.js, TypeScript, React
- **Database**: PostgreSQL (production)
- **Container**: Docker, Docker Compose

## 🎯 Design Principles

1. **Modularity**: Each component is independent
2. **Scalability**: Horizontal scaling capability
3. **Reliability**: Graceful degradation
4. **Extensibility**: Plugin architecture
5. **Observability**: Comprehensive monitoring

## 🔮 Future Enhancements

1. **Multi-modal Support**
   - Image analysis for lab results
   - Document processing
   - Voice interfaces

2. **Advanced Analytics**
   - ML-based predictions
   - Complex scenario modeling
   - Real-time optimization

3. **Integration Capabilities**
   - Lab equipment APIs
   - ERP systems
   - Clinical trial databases

4. **Enhanced Collaboration**
   - Multi-agent negotiations
   - Consensus algorithms
   - Conflict resolution

This architecture provides a solid foundation for a production-ready biotech AI platform powered by Google Gemini.