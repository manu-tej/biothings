# Claude Code + LangChain Integration for Biotech

This integration seamlessly combines Claude Code's native capabilities (bash, Python, web search) with LangChain's agent framework for powerful biotech applications.

## 🚀 Key Innovation

Instead of reimplementing Claude Code's features, we **prompt Claude Code directly** to use its built-in capabilities:

```python
# Simple but powerful - Claude Code handles everything
result = await agent.arun("Search for CRISPR patents filed in 2024 and analyze the trends")
```

Claude Code automatically:
- 🔍 Searches the web
- 🐍 Writes and executes Python code
- 📊 Analyzes data
- 📁 Manages files
- 🖥️ Runs bash commands

## 📦 Installation

```bash
# Install dependencies
cd backend
pip install -r requirements.txt

# Set your API key
export ANTHROPIC_API_KEY=your-key-here
```

## 🎯 Quick Start

### Basic Claude Code Agent

```python
from app.core.claude_code_langchain_simple import create_claude_code_agent

# Create agent with Claude Code capabilities
agent = create_claude_code_agent()

# Use natural language - Claude Code figures out what to do
result = await agent.arun(
    "Find the latest FDA-approved gene therapies and create a comparison chart"
)
```

### Biotech-Specific Agent

```python
from app.agents.claude_code_agent import ClaudeCodeBiotechAgent

# Create a Chief Science Officer agent
cso = ClaudeCodeBiotechAgent(
    agent_id="cso-001",
    agent_type="CSO",
    department="R&D"
)

# Process complex scientific tasks
result = await cso.process_task(
    "Evaluate CRISPR vs Prime Editing for treating sickle cell disease",
    context={"budget": "$10M", "timeline": "3 years"}
)
```

## 🧬 Biotech Use Cases

### 1. **Research & Development**
```python
# CSO researches new therapeutic targets
await cso.arun("""
    Search for recent breakthroughs in Alzheimer's research,
    analyze the most promising targets,
    and create a Python visualization of the drug development pipeline
""")
```

### 2. **Market Analysis**
```python
# CEO analyzes market opportunities
await ceo.arun("""
    Find the current market size for cell therapy,
    calculate growth projections using Python,
    and identify top competitors with their market share
""")
```

### 3. **Technical Implementation**
```python
# CTO implements bioinformatics pipeline
await cto.arun("""
    Write a Python script for RNA-seq analysis,
    test it with sample data,
    and create documentation for the lab team
""")
```

### 4. **Financial Planning**
```python
# CFO evaluates investment opportunities
await cfo.arun("""
    Search for recent biotech IPOs and their performance,
    analyze ROI patterns with Python,
    and recommend optimal funding strategies
""")
```

## 🔧 How It Works

### 1. **Smart Prompting**
The integration enhances prompts to leverage Claude Code's capabilities:

```python
# Your prompt
"Analyze gene expression data"

# Enhanced prompt sent to Claude Code
"Analyze gene expression data

You have access to:
- Execute bash commands
- Write and run Python code
- Search the web for current information
- Read and write files

Use these capabilities as needed..."
```

### 2. **Unified Interface**
All Claude Code features through one simple tool:

```python
class ClaudeCodeTool(BaseTool):
    name = "claude_code_universal"
    description = "Can search web, run code, analyze data..."
    
    async def _arun(self, task: str) -> str:
        # Claude Code handles everything
        return await claude_code_llm.execute(task)
```

### 3. **Workflow Integration**
Complex workflows with research → analysis → decision → execution:

```python
graph = StateGraph(AgentState)
graph.add_node("research", self._research_phase)    # Web search
graph.add_node("analyze", self._analyze_phase)      # Python analysis
graph.add_node("decide", self._decide_phase)        # Strategic decision
graph.add_node("execute", self._execute_phase)      # Implementation
```

## 📊 Real Examples

### Example 1: Drug Discovery Analysis
```python
result = await agent.arun("""
    1. Search for recent FDA approvals in oncology
    2. Extract drug names, targets, and approval dates
    3. Create a Python analysis of approval trends
    4. Generate a report with visualizations
""")
```

### Example 2: Competitive Intelligence
```python
result = await agent.arun("""
    1. Find the top 10 biotech companies by market cap
    2. Search for their recent pipeline updates
    3. Analyze their focus areas with Python
    4. Create a competitive landscape visualization
""")
```

### Example 3: Protocol Generation
```python
result = await agent.arun("""
    1. Search for best practices in CAR-T cell manufacturing
    2. Generate a detailed protocol with Python
    3. Include quality control checkpoints
    4. Create a Gantt chart for the timeline
""")
```

## 🎮 Interactive Demo

Run the comprehensive demo:

```bash
python demo_claude_code_langchain.py
```

This demonstrates:
- ✅ Web search for biotech information
- ✅ Python code execution for analysis
- ✅ Multi-agent collaboration
- ✅ Real bioinformatics workflows
- ✅ File operations and data processing

## 🏗️ Architecture

```
┌─────────────────────┐
│   Your Application  │
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│  LangChain Agent    │
│  ┌────────────────┐ │
│  │ Claude Code    │ │
│  │ Universal Tool │ │
│  └────────┬───────┘ │
└───────────┼─────────┘
           │
┌──────────▼──────────┐
│   Claude Code SDK   │
│  ┌────────────────┐ │
│  │ • Web Search   │ │
│  │ • Python Exec  │ │
│  │ • Bash Commands│ │
│  │ • File I/O     │ │
│  └────────────────┘ │
└─────────────────────┘
```

## 🔐 Best Practices

1. **Let Claude Code Decide**: Don't over-specify; let Claude Code choose the best approach
2. **Context Matters**: Provide relevant context for better results
3. **Iterative Refinement**: Claude Code can build on previous results
4. **Error Handling**: Claude Code gracefully handles failures

## 🚦 Advantages

- **No Complex Setup**: Just prompt Claude Code naturally
- **All Features Included**: Web search, code execution, file operations
- **Intelligent Routing**: Claude Code decides which tools to use
- **Production Ready**: Built on proven Claude and LangChain
- **Extensible**: Easy to add custom tools alongside Claude Code

## 🤝 Contributing

Extend the integration by:
1. Adding specialized biotech tools
2. Creating domain-specific agents
3. Building custom workflows
4. Enhancing prompts for specific use cases

## 📝 License

This integration is part of the BioThings project and follows the same license terms.