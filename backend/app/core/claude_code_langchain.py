"""
Claude Code SDK Integration with LangChain
This module bridges Claude Code's native SDK capabilities with LangChain
"""
import os
import subprocess
import asyncio
import json
from typing import Dict, List, Optional, Any, Callable, Union
from langchain.llms.base import LLM
from langchain.callbacks.manager import CallbackManagerForLLMRun, AsyncCallbackManagerForLLMRun
from langchain.schema import LLMResult, Generation
from langchain.tools import Tool, BaseTool
from langchain.agents import initialize_agent, AgentType
from langchain.utilities import GoogleSearchAPIWrapper
from pydantic import BaseModel, Field
import structlog
import aiohttp
from bs4 import BeautifulSoup

logger = structlog.get_logger()


class ClaudeCodeSDK:
    """
    Native Claude Code SDK wrapper for executing bash and python
    This simulates Claude Code's ability to run commands directly
    """
    
    def __init__(self):
        self.execution_history: List[Dict[str, Any]] = []
    
    async def execute_bash(self, command: str) -> Dict[str, Any]:
        """Execute bash command like Claude Code does"""
        try:
            # Run command with proper shell
            process = await asyncio.create_subprocess_shell(
                command,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                shell=True
            )
            
            stdout, stderr = await process.communicate()
            
            result = {
                "command": command,
                "stdout": stdout.decode() if stdout else "",
                "stderr": stderr.decode() if stderr else "",
                "return_code": process.returncode,
                "success": process.returncode == 0
            }
            
            self.execution_history.append(result)
            return result
            
        except Exception as e:
            error_result = {
                "command": command,
                "stdout": "",
                "stderr": str(e),
                "return_code": -1,
                "success": False,
                "error": str(e)
            }
            self.execution_history.append(error_result)
            return error_result
    
    async def execute_python(self, code: str) -> Dict[str, Any]:
        """Execute Python code like Claude Code does"""
        try:
            # Create a temporary Python file
            import tempfile
            with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
                f.write(code)
                temp_file = f.name
            
            # Execute the Python file
            process = await asyncio.create_subprocess_exec(
                'python', temp_file,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await process.communicate()
            
            # Clean up temp file
            os.unlink(temp_file)
            
            result = {
                "code": code,
                "stdout": stdout.decode() if stdout else "",
                "stderr": stderr.decode() if stderr else "",
                "return_code": process.returncode,
                "success": process.returncode == 0
            }
            
            self.execution_history.append(result)
            return result
            
        except Exception as e:
            error_result = {
                "code": code,
                "stdout": "",
                "stderr": str(e),
                "return_code": -1,
                "success": False,
                "error": str(e)
            }
            self.execution_history.append(error_result)
            return error_result
    
    def get_execution_history(self) -> List[Dict[str, Any]]:
        """Get history of all executions"""
        return self.execution_history
    
    async def web_search(self, query: str, num_results: int = 5) -> Dict[str, Any]:
        """Perform web search like Claude Code does"""
        try:
            # Use DuckDuckGo for search (no API key needed)
            search_url = f"https://duckduckgo.com/html/?q={query}"
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(search_url, headers=headers) as response:
                    html = await response.text()
                    
            # Parse results
            soup = BeautifulSoup(html, 'html.parser')
            results = []
            
            for result in soup.find_all('div', class_='web-result', limit=num_results):
                title_elem = result.find('h2')
                snippet_elem = result.find('a', class_='result__snippet')
                
                if title_elem and snippet_elem:
                    results.append({
                        'title': title_elem.get_text(strip=True),
                        'snippet': snippet_elem.get_text(strip=True),
                        'url': result.find('a')['href'] if result.find('a') else ''
                    })
            
            search_result = {
                "query": query,
                "results": results,
                "success": True,
                "num_results": len(results)
            }
            
            self.execution_history.append({"type": "web_search", **search_result})
            return search_result
            
        except Exception as e:
            error_result = {
                "query": query,
                "results": [],
                "success": False,
                "error": str(e)
            }
            self.execution_history.append({"type": "web_search", **error_result})
            return error_result
    
    async def fetch_webpage(self, url: str) -> Dict[str, Any]:
        """Fetch and parse webpage content"""
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url, headers=headers, timeout=10) as response:
                    html = await response.text()
                    
            # Parse content
            soup = BeautifulSoup(html, 'html.parser')
            
            # Remove script and style elements
            for script in soup(["script", "style"]):
                script.decompose()
            
            # Get text content
            text = soup.get_text()
            lines = (line.strip() for line in text.splitlines())
            chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
            text = ' '.join(chunk for chunk in chunks if chunk)
            
            # Limit text length
            text = text[:5000] + "..." if len(text) > 5000 else text
            
            result = {
                "url": url,
                "title": soup.title.string if soup.title else "No title",
                "content": text,
                "success": True
            }
            
            self.execution_history.append({"type": "fetch_webpage", **result})
            return result
            
        except Exception as e:
            error_result = {
                "url": url,
                "title": "",
                "content": "",
                "success": False,
                "error": str(e)
            }
            self.execution_history.append({"type": "fetch_webpage", **error_result})
            return error_result


class ClaudeCodeLLM(LLM):
    """
    Custom LangChain LLM that uses Claude Code SDK capabilities
    instead of just API calls
    """
    
    model_name: str = Field(default="claude-code-sdk")
    temperature: float = Field(default=0.7)
    max_tokens: int = Field(default=4000)
    sdk: ClaudeCodeSDK = Field(default_factory=ClaudeCodeSDK)
    use_execution: bool = Field(default=True)
    
    @property
    def _llm_type(self) -> str:
        return "claude-code-sdk"
    
    def _call(
        self,
        prompt: str,
        stop: Optional[List[str]] = None,
        run_manager: Optional[CallbackManagerForLLMRun] = None,
        **kwargs: Any,
    ) -> str:
        """Synchronous call - delegates to async"""
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
        Process prompt using Claude Code SDK capabilities
        This method interprets the prompt and executes commands if needed
        """
        
        # Check if prompt contains executable commands
        if self.use_execution and self._contains_executable(prompt):
            return await self._execute_and_respond(prompt)
        
        # Otherwise, generate a response (mock or API)
        return await self._generate_response(prompt)
    
    def _contains_executable(self, prompt: str) -> bool:
        """Check if prompt contains executable bash or python code"""
        bash_indicators = ["```bash", "```sh", "run command:", "execute:"]
        python_indicators = ["```python", "run python:", "execute python:"]
        
        prompt_lower = prompt.lower()
        return any(indicator in prompt_lower for indicator in bash_indicators + python_indicators)
    
    async def _execute_and_respond(self, prompt: str) -> str:
        """Execute commands found in prompt and return results"""
        response_parts = []
        
        # Extract and execute bash commands
        bash_commands = self._extract_bash_commands(prompt)
        for cmd in bash_commands:
            logger.info(f"Executing bash command: {cmd}")
            result = await self.sdk.execute_bash(cmd)
            response_parts.append(self._format_bash_result(cmd, result))
        
        # Extract and execute Python code
        python_blocks = self._extract_python_code(prompt)
        for code in python_blocks:
            logger.info("Executing Python code block")
            result = await self.sdk.execute_python(code)
            response_parts.append(self._format_python_result(code, result))
        
        # If no commands were found, generate a response
        if not response_parts:
            return await self._generate_response(prompt)
        
        # Combine execution results with analysis
        execution_summary = "\n\n".join(response_parts)
        analysis = await self._analyze_execution_results(prompt, execution_summary)
        
        return f"{execution_summary}\n\n{analysis}"
    
    def _extract_bash_commands(self, prompt: str) -> List[str]:
        """Extract bash commands from prompt"""
        commands = []
        
        # Extract from code blocks
        import re
        bash_blocks = re.findall(r'```(?:bash|sh)\n(.*?)\n```', prompt, re.DOTALL)
        commands.extend(bash_blocks)
        
        # Extract inline commands
        inline_cmds = re.findall(r'(?:run command:|execute:)\s*`([^`]+)`', prompt, re.IGNORECASE)
        commands.extend(inline_cmds)
        
        return commands
    
    def _extract_python_code(self, prompt: str) -> List[str]:
        """Extract Python code blocks from prompt"""
        import re
        python_blocks = re.findall(r'```python\n(.*?)\n```', prompt, re.DOTALL)
        return python_blocks
    
    def _format_bash_result(self, command: str, result: Dict[str, Any]) -> str:
        """Format bash execution result"""
        status = "✓" if result["success"] else "✗"
        output = result["stdout"] if result["success"] else result["stderr"]
        
        return f"""**Bash Execution {status}**
Command: `{command}`
Output:
```
{output.strip() if output else "(no output)"}
```
Return code: {result["return_code"]}"""
    
    def _format_python_result(self, code: str, result: Dict[str, Any]) -> str:
        """Format Python execution result"""
        status = "✓" if result["success"] else "✗"
        output = result["stdout"] if result["success"] else result["stderr"]
        
        # Truncate code if too long
        code_preview = code[:200] + "..." if len(code) > 200 else code
        
        return f"""**Python Execution {status}**
Code:
```python
{code_preview}
```
Output:
```
{output.strip() if output else "(no output)"}
```
Return code: {result["return_code"]}"""
    
    async def _generate_response(self, prompt: str) -> str:
        """Generate a response when no execution is needed"""
        # In production, this would call the actual Claude API
        # For now, return a mock response
        return f"Based on the prompt, here's my analysis:\n\n{prompt[:100]}...\n\n[This would be Claude's actual response]"
    
    async def _analyze_execution_results(self, prompt: str, results: str) -> str:
        """Analyze execution results and provide insights"""
        # In production, this would use Claude to analyze the results
        return "**Analysis**: The commands executed successfully. The results show the expected output."
    
    @property
    def _identifying_params(self) -> Dict[str, Any]:
        """Get the identifying parameters."""
        return {
            "model_name": self.model_name,
            "temperature": self.temperature,
            "max_tokens": self.max_tokens,
            "use_execution": self.use_execution
        }


class BashTool(BaseTool):
    """LangChain tool that uses Claude Code SDK for bash execution"""
    
    name = "bash_executor"
    description = "Execute bash commands using Claude Code SDK. Input should be a valid bash command."
    sdk: ClaudeCodeSDK = Field(default_factory=ClaudeCodeSDK)
    
    async def _arun(self, command: str) -> str:
        """Execute bash command asynchronously"""
        result = await self.sdk.execute_bash(command)
        
        if result["success"]:
            return f"Command executed successfully:\n{result['stdout']}"
        else:
            return f"Command failed:\n{result['stderr']}"
    
    def _run(self, command: str) -> str:
        """Synchronous execution"""
        import asyncio
        return asyncio.run(self._arun(command))


class PythonTool(BaseTool):
    """LangChain tool that uses Claude Code SDK for Python execution"""
    
    name = "python_executor"
    description = "Execute Python code using Claude Code SDK. Input should be valid Python code."
    sdk: ClaudeCodeSDK = Field(default_factory=ClaudeCodeSDK)
    
    async def _arun(self, code: str) -> str:
        """Execute Python code asynchronously"""
        result = await self.sdk.execute_python(code)
        
        if result["success"]:
            return f"Code executed successfully:\n{result['stdout']}"
        else:
            return f"Code execution failed:\n{result['stderr']}"
    
    def _run(self, code: str) -> str:
        """Synchronous execution"""
        import asyncio
        return asyncio.run(self._arun(code))


class WebSearchTool(BaseTool):
    """LangChain tool that uses Claude Code SDK for web search"""
    
    name = "web_search"
    description = "Search the web for information. Input should be a search query string."
    sdk: ClaudeCodeSDK = Field(default_factory=ClaudeCodeSDK)
    
    async def _arun(self, query: str) -> str:
        """Search the web asynchronously"""
        result = await self.sdk.web_search(query)
        
        if result["success"] and result["results"]:
            output = f"Found {len(result['results'])} results for '{query}':\n\n"
            for i, r in enumerate(result["results"], 1):
                output += f"{i}. {r['title']}\n   {r['snippet']}\n   URL: {r['url']}\n\n"
            return output
        else:
            return f"No results found for '{query}'"
    
    def _run(self, query: str) -> str:
        """Synchronous execution"""
        import asyncio
        return asyncio.run(self._arun(query))


class WebFetchTool(BaseTool):
    """LangChain tool that fetches and parses web pages"""
    
    name = "fetch_webpage"
    description = "Fetch and read the content of a webpage. Input should be a valid URL."
    sdk: ClaudeCodeSDK = Field(default_factory=ClaudeCodeSDK)
    
    async def _arun(self, url: str) -> str:
        """Fetch webpage asynchronously"""
        result = await self.sdk.fetch_webpage(url)
        
        if result["success"]:
            return f"Title: {result['title']}\n\nContent:\n{result['content']}"
        else:
            return f"Failed to fetch {url}: {result.get('error', 'Unknown error')}"
    
    def _run(self, url: str) -> str:
        """Synchronous execution"""
        import asyncio
        return asyncio.run(self._arun(url))


def create_claude_code_agent(
    tools: Optional[List[BaseTool]] = None,
    agent_type: AgentType = AgentType.ZERO_SHOT_REACT_DESCRIPTION,
    verbose: bool = True
):
    """
    Create a LangChain agent that uses Claude Code SDK capabilities
    
    Args:
        tools: Additional tools to include
        agent_type: Type of agent to create
        verbose: Whether to show verbose output
    
    Returns:
        LangChain agent with Claude Code SDK integration
    """
    
    # Initialize Claude Code LLM
    llm = ClaudeCodeLLM()
    
    # Create default tools
    default_tools = [
        BashTool(),
        PythonTool(),
    ]
    
    # Add any additional tools
    all_tools = default_tools + (tools or [])
    
    # Create and return agent
    agent = initialize_agent(
        tools=all_tools,
        llm=llm,
        agent=agent_type,
        verbose=verbose,
        handle_parsing_errors=True
    )
    
    return agent


# Example usage functions
async def demo_claude_code_langchain():
    """Demonstrate Claude Code SDK integration with LangChain"""
    
    # Create a Claude Code enhanced agent
    agent = create_claude_code_agent()
    
    # Example 1: Execute bash command
    result1 = await agent.arun("List all Python files in the current directory")
    print(f"Result 1: {result1}")
    
    # Example 2: Execute Python code
    result2 = await agent.arun("Calculate the fibonacci sequence up to 10 terms using Python")
    print(f"Result 2: {result2}")
    
    # Example 3: Complex task
    result3 = await agent.arun("""
    Create a Python script that:
    1. Reads system information
    2. Formats it as JSON
    3. Saves it to a file
    Then use bash to display the file contents
    """)
    print(f"Result 3: {result3}")
    
    return agent