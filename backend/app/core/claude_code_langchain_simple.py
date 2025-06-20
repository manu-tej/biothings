"""
Simple Claude Code Integration with LangChain
This leverages Claude Code's native capabilities through prompting
"""
import os
from typing import Dict, List, Optional, Any, Callable
from langchain.llms.base import LLM
from langchain.callbacks.manager import CallbackManagerForLLMRun, AsyncCallbackManagerForLLMRun
from langchain.tools import Tool, BaseTool
from langchain.agents import initialize_agent, AgentType
from pydantic import BaseModel, Field
import anthropic
from anthropic import AsyncAnthropic
import structlog

logger = structlog.get_logger()


class ClaudeCodeLLM(LLM):
    """
    LangChain LLM wrapper that prompts Claude Code to use its native capabilities
    including bash, python execution, and web search
    """
    
    model_name: str = Field(default="claude-3-opus-20240229")
    temperature: float = Field(default=0.7)
    max_tokens: int = Field(default=4000)
    api_key: Optional[str] = Field(default=None)
    enable_code_execution: bool = Field(default=True)
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.api_key = self.api_key or os.getenv("ANTHROPIC_API_KEY")
        self.client = AsyncAnthropic(api_key=self.api_key) if self.api_key else None
    
    @property
    def _llm_type(self) -> str:
        return "claude-code"
    
    def _call(
        self,
        prompt: str,
        stop: Optional[List[str]] = None,
        run_manager: Optional[CallbackManagerForLLMRun] = None,
        **kwargs: Any,
    ) -> str:
        """Synchronous call"""
        import asyncio
        return asyncio.run(self._acall(prompt, stop, run_manager, **kwargs))
    
    async def _acall(
        self,
        prompt: str,
        stop: Optional[List[str]] = None,
        run_manager: Optional[AsyncCallbackManagerForLLMRun] = None,
        **kwargs: Any,
    ) -> str:
        """
        Process prompt by instructing Claude Code to use its native capabilities
        """
        
        if not self.client:
            return "No API key provided. Please set ANTHROPIC_API_KEY."
        
        # Enhance prompt to leverage Claude Code capabilities
        enhanced_prompt = self._enhance_prompt(prompt)
        
        try:
            response = await self.client.messages.create(
                model=self.model_name,
                max_tokens=self.max_tokens,
                temperature=self.temperature,
                messages=[
                    {
                        "role": "user",
                        "content": enhanced_prompt
                    }
                ]
            )
            
            return response.content[0].text
            
        except Exception as e:
            logger.error(f"Claude API call failed: {e}")
            return f"Error: {str(e)}"
    
    def _enhance_prompt(self, prompt: str) -> str:
        """
        Enhance the prompt to leverage Claude Code's capabilities
        """
        if not self.enable_code_execution:
            return prompt
        
        # Check what the prompt is asking for
        prompt_lower = prompt.lower()
        
        enhancements = []
        
        if any(keyword in prompt_lower for keyword in ["search", "find online", "web", "internet"]):
            enhancements.append("Use web search to find current information if needed.")
        
        if any(keyword in prompt_lower for keyword in ["run", "execute", "command", "bash", "shell"]):
            enhancements.append("You can execute bash commands to complete this task.")
        
        if any(keyword in prompt_lower for keyword in ["python", "code", "script", "program"]):
            enhancements.append("You can write and execute Python code to solve this.")
        
        if any(keyword in prompt_lower for keyword in ["file", "directory", "folder", "read", "write"]):
            enhancements.append("You can read and write files, and navigate the filesystem.")
        
        if enhancements:
            enhanced = f"{prompt}\n\nNote: {' '.join(enhancements)}"
        else:
            # General enhancement
            enhanced = f"""{prompt}

You have access to the following capabilities:
- Execute bash commands
- Write and run Python code  
- Search the web for current information
- Read and write files
- Navigate the filesystem

Use these capabilities as needed to complete the task effectively."""
        
        return enhanced
    
    @property
    def _identifying_params(self) -> Dict[str, Any]:
        """Get the identifying parameters."""
        return {
            "model_name": self.model_name,
            "temperature": self.temperature,
            "max_tokens": self.max_tokens,
            "enable_code_execution": self.enable_code_execution
        }


class ClaudeCodeTool(BaseTool):
    """
    Universal tool that prompts Claude Code to handle any task
    using its native capabilities
    """
    
    name = "claude_code_universal"
    description = """Universal tool that can:
    - Execute bash commands
    - Write and run Python code
    - Search the web
    - Read/write files
    - Analyze data
    - And more...
    
    Simply describe what you need to do."""
    
    llm: ClaudeCodeLLM = Field(default_factory=ClaudeCodeLLM)
    
    async def _arun(self, task: str) -> str:
        """Execute task using Claude Code"""
        # Directly prompt Claude Code with the task
        enhanced_task = f"""Please complete this task: {task}

Use any of your available capabilities:
- Bash commands for system operations
- Python code for data processing or calculations
- Web search for current information
- File operations as needed

Show the actual commands/code you run and their outputs."""
        
        result = await self.llm._acall(enhanced_task)
        return result
    
    def _run(self, task: str) -> str:
        """Synchronous execution"""
        import asyncio
        return asyncio.run(self._arun(task))


def create_claude_code_agent(
    additional_tools: Optional[List[BaseTool]] = None,
    agent_type: AgentType = AgentType.ZERO_SHOT_REACT_DESCRIPTION,
    verbose: bool = True,
    **llm_kwargs
):
    """
    Create a LangChain agent powered by Claude Code
    
    Args:
        additional_tools: Extra tools to add beyond Claude Code
        agent_type: Type of agent to create
        verbose: Whether to show verbose output
        **llm_kwargs: Additional arguments for ClaudeCodeLLM
    
    Returns:
        LangChain agent with Claude Code capabilities
    """
    
    # Initialize Claude Code LLM
    llm = ClaudeCodeLLM(**llm_kwargs)
    
    # Create the universal Claude Code tool
    claude_tool = ClaudeCodeTool(llm=llm)
    
    # Combine tools
    tools = [claude_tool] + (additional_tools or [])
    
    # Create and return agent
    agent = initialize_agent(
        tools=tools,
        llm=llm,
        agent=agent_type,
        verbose=verbose,
        handle_parsing_errors=True
    )
    
    return agent


# Example biotech-specific tools that work with Claude Code
class BiotechAnalysisTool(BaseTool):
    """Tool specifically for biotech analysis using Claude Code"""
    
    name = "biotech_analyzer"
    description = "Analyze biotech data, experiments, or protocols using Claude's scientific knowledge and code execution"
    llm: ClaudeCodeLLM = Field(default_factory=ClaudeCodeLLM)
    
    async def _arun(self, query: str) -> str:
        """Analyze biotech-related query"""
        enhanced_query = f"""As a biotech expert, analyze this: {query}

You can:
- Search for recent scientific papers or biotech news
- Write Python code to analyze data or create visualizations
- Access bioinformatics tools via bash
- Generate protocols or experimental designs

Provide a comprehensive analysis with any relevant code, data, or references."""
        
        return await self.llm._acall(enhanced_query)
    
    def _run(self, query: str) -> str:
        import asyncio
        return asyncio.run(self._arun(query))


# Demo usage
async def demo_claude_code_langchain():
    """Demonstrate the simple Claude Code + LangChain integration"""
    
    # Create agent with biotech capabilities
    biotech_tool = BiotechAnalysisTool()
    agent = create_claude_code_agent(
        additional_tools=[biotech_tool],
        verbose=True
    )
    
    print("=== Claude Code + LangChain Demo ===\n")
    
    # Example 1: Web search
    print("1. Testing web search capability:")
    result1 = await agent.arun("Search for the latest CRISPR gene therapy breakthroughs in 2024")
    print(f"Result: {result1}\n")
    
    # Example 2: Code execution
    print("2. Testing Python execution:")
    result2 = await agent.arun("Write a Python script to simulate bacterial growth using the logistic model and plot it")
    print(f"Result: {result2}\n")
    
    # Example 3: Combined capabilities
    print("3. Testing combined capabilities:")
    result3 = await agent.arun("""
    Find the current stock price of Moderna (MRNA), 
    then calculate its P/E ratio if EPS is $5.20,
    and determine if it's a good biotech investment
    """)
    print(f"Result: {result3}\n")
    
    # Example 4: Biotech-specific analysis
    print("4. Testing biotech analysis:")
    result4 = await agent.arun("""
    Use the biotech analyzer to design a CRISPR experiment 
    for knocking out the p53 gene in HEK293 cells
    """)
    print(f"Result: {result4}\n")
    
    return agent


# Integration with existing biotech agents
def create_biotech_executive_agent(role: str = "CEO"):
    """Create a biotech executive agent powered by Claude Code"""
    
    system_prompts = {
        "CEO": "You are the CEO of a biotech company. Use all available tools to make strategic decisions.",
        "CSO": "You are the Chief Science Officer. Use scientific analysis and current research to guide R&D.",
        "CFO": "You are the CFO. Analyze financial data and market trends for biotech investments.",
        "CTO": "You are the CTO. Evaluate and implement cutting-edge biotech technologies."
    }
    
    # Create specialized tools for the role
    tools = []
    if role == "CSO":
        tools.append(BiotechAnalysisTool())
    
    # Create agent with role-specific system prompt
    agent = create_claude_code_agent(
        additional_tools=tools,
        verbose=True,
        model_name="claude-3-opus-20240229",
        temperature=0.7
    )
    
    # Wrap with role context
    class RoleAgent:
        def __init__(self, agent, role, system_prompt):
            self.agent = agent
            self.role = role
            self.system_prompt = system_prompt
        
        async def arun(self, task: str) -> str:
            contextualized_task = f"{self.system_prompt}\n\nTask: {task}"
            return await self.agent.arun(contextualized_task)
        
        def run(self, task: str) -> str:
            import asyncio
            return asyncio.run(self.arun(task))
    
    return RoleAgent(agent, role, system_prompts.get(role, "You are a biotech executive."))


if __name__ == "__main__":
    import asyncio
    asyncio.run(demo_claude_code_langchain())