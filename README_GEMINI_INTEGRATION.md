# Google Gemini Integration for BioThings

This integration brings Google Gemini's powerful capabilities to the biotech dashboard, including web search, code execution, and advanced function calling.

## 🚀 Features

### 1. **Web Search**
- Real-time access to current information
- Scientific literature and research papers
- Market data and competitive intelligence
- Regulatory updates and FDA approvals

### 2. **Code Execution**
- Native Python code execution
- Data analysis and visualization
- Statistical calculations
- Bioinformatics pipelines

### 3. **Function Calling**
- Custom biotech-specific functions
- Drug efficacy calculations
- Protein stability predictions
- Automated analysis workflows

### 4. **Multi-Modal Support**
- Text, code, and data analysis
- Future support for images and documents
- Rich output formatting

## 📦 Installation

```bash
# Install required packages
cd backend
pip install google-generativeai==0.8.3
pip install langchain-google-genai==2.0.7

# Set up API key
export GOOGLE_API_KEY=your-key-here
```

Get your API key from: https://makersuite.google.com/app/apikey

## 🎯 Quick Start

### Basic Usage

```python
from app.core.gemini_langchain import GeminiLangChainService

# Create service
service = GeminiLangChainService()

# Quick response
response = await service.quick_response("What are CAR-T therapies?")

# Execute with tools
result = await service.execute_with_tools(
    task="Search for FDA gene therapy approvals and analyze trends",
    system_prompt="You are a regulatory expert"
)
```

### Biotech Agent

```python
from app.agents.gemini_biotech_agent import GeminiBiotechAgent

# Create specialized agent
cso = GeminiBiotechAgent(
    agent_id="cso-001",
    agent_type="CSO",
    department="R&D"
)

# Process complex task
result = await cso.process_task(
    task="Evaluate CRISPR vs base editing for sickle cell",
    context={"budget": "$20M", "timeline": "3 years"}
)
```

## 🧬 Agent Types

### Chief Science Officer (CSO)
- Research and development strategy
- Scientific analysis and validation
- Clinical trial design
- Technology evaluation

### Chief Executive Officer (CEO)
- Strategic planning
- Market analysis
- Partnership decisions
- Resource allocation

### Chief Technology Officer (CTO)
- Technical infrastructure
- Bioinformatics pipelines
- Data processing systems
- Automation strategies

### Chief Financial Officer (CFO)
- Financial analysis
- Budget optimization
- ROI calculations
- Investment strategies

### Chief Operating Officer (COO)
- Operational efficiency
- Process optimization
- Scaling strategies
- Resource management

## 🔧 Configuration

### Environment Variables

```env
# Required
GOOGLE_API_KEY=your-api-key

# Optional
GEMINI_MODEL=gemini-2.0-flash-exp
GEMINI_TEMPERATURE=0.7
GEMINI_MAX_TOKENS=8192
```

### Available Models

- `gemini-2.0-flash-exp` - Latest, fastest model with code execution
- `gemini-1.5-pro` - Advanced reasoning and analysis
- `gemini-1.5-flash` - Balanced performance and cost

## 📊 Workflow Architecture

```
User Request
     ↓
Gather Information (Web Search)
     ↓
Analyze Data (Code Execution)
     ↓
Generate Insights (AI Analysis)
     ↓
Make Decision (Strategic Planning)
     ↓
Create Action Plan (Implementation)
     ↓
Communicate Results (Reporting)
```

## 🎮 Running the Demo

```bash
# Run comprehensive Gemini demo
python demo_gemini_langchain.py
```

This demonstrates:
- ✅ Web search capabilities
- ✅ Code execution for analysis
- ✅ Function calling
- ✅ Multi-agent collaboration
- ✅ Complete biotech workflows

## 💡 Use Cases

### 1. **Drug Discovery**
```python
await agent.process_task(
    "Find promising targets for Alzheimer's and analyze druggability"
)
```

### 2. **Market Analysis**
```python
await agent.process_task(
    "Analyze cell therapy market and identify opportunities"
)
```

### 3. **Clinical Trial Design**
```python
await agent.process_task(
    "Design Phase 2 trial for our lead compound with optimal endpoints"
)
```

### 4. **Competitive Intelligence**
```python
await agent.process_task(
    "Track competitor pipeline updates and patent filings"
)
```

## 🔐 Best Practices

1. **API Key Security**
   - Never commit API keys
   - Use environment variables
   - Rotate keys regularly

2. **Cost Management**
   - Monitor token usage
   - Use appropriate models
   - Cache responses when possible

3. **Error Handling**
   - Implement retries
   - Graceful fallbacks
   - Log errors properly

4. **Performance**
   - Use streaming for long responses
   - Batch related queries
   - Optimize prompt length

## 🤝 Integration with Existing System

The Gemini integration works seamlessly with:
- Existing Claude/OpenAI agents
- WebSocket real-time updates
- Redis message broker
- LangGraph workflows
- Dashboard visualization

## 📈 Advantages

- **Speed**: Gemini 2.0 Flash is extremely fast
- **Cost**: Competitive pricing for high volume
- **Capabilities**: Native code execution
- **Reliability**: Google's infrastructure
- **Integration**: Works with LangChain ecosystem

## 🚦 Limitations

- Code execution is sandboxed
- Web search results vary by region
- Some safety filters may limit outputs
- Function calling syntax differs from OpenAI

## 🔄 Migration Guide

To switch from Claude/OpenAI to Gemini:

1. Update environment variables
2. Change agent initialization
3. Adjust prompts if needed
4. Test thoroughly

```python
# Before (Claude)
from app.agents.claude_code_agent import ClaudeCodeBiotechAgent
agent = ClaudeCodeBiotechAgent(...)

# After (Gemini)
from app.agents.gemini_biotech_agent import GeminiBiotechAgent
agent = GeminiBiotechAgent(...)
```

## 🐛 Troubleshooting

### Common Issues

1. **"API key not valid"**
   - Check GOOGLE_API_KEY is set
   - Verify key permissions

2. **"Safety block"**
   - Adjust safety settings
   - Rephrase prompts

3. **"Rate limit exceeded"**
   - Implement exponential backoff
   - Check quota limits

4. **"Function not found"**
   - Ensure proper tool registration
   - Check function signatures

## 📝 Next Steps

1. Enable multi-modal inputs (images, PDFs)
2. Add streaming for real-time updates
3. Implement caching layer
4. Create specialized biotech functions
5. Build evaluation metrics

---

The Gemini integration provides a powerful alternative to Claude and OpenAI, with unique capabilities for code execution and web search that make it ideal for data-driven biotech applications.