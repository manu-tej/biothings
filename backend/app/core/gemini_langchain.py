"""
Google Gemini + LangChain Integration for Biotech
Leverages Gemini's native capabilities including code execution
"""
from typing import Dict, Any, Optional, List, Type
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.agents import AgentExecutor, create_tool_calling_agent
from langchain.tools import Tool, BaseTool, StructuredTool
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.schema import BaseMessage, HumanMessage, AIMessage
from langchain.callbacks.base import BaseCallbackHandler
from langchain.pydantic_v1 import BaseModel, Field
from langchain.memory import ConversationBufferMemory
import structlog
import os
import asyncio
from datetime import datetime
import google.generativeai as genai

logger = structlog.get_logger()


class GeminiCallbackHandler(BaseCallbackHandler):
    """Callback handler for Gemini streaming and logging"""
    
    def __init__(self):
        self.tokens = []
        
    def on_llm_new_token(self, token: str, **kwargs) -> None:
        self.tokens.append(token)
        
    def on_llm_end(self, response, **kwargs) -> None:
        logger.info("Gemini response completed", tokens=len(self.tokens))


class WebSearchInput(BaseModel):
    """Input for web search tool"""
    query: str = Field(description="The search query")
    
    
class CodeExecutionInput(BaseModel):
    """Input for code execution tool"""
    code: str = Field(description="Python code to execute")
    description: str = Field(description="Description of what the code does")


class BiotechAnalysisInput(BaseModel):
    """Input for biotech analysis"""
    data: str = Field(description="Data to analyze")
    analysis_type: str = Field(description="Type of analysis: protein, gene, drug, clinical")


class GeminiWebSearchTool(BaseTool):
    """Web search tool that prompts Gemini to search the web"""
    name = "web_search"
    description = "Search the web for current information, research papers, and news"
    args_schema: Type[BaseModel] = WebSearchInput
    
    def __init__(self, llm: ChatGoogleGenerativeAI):
        super().__init__()
        self.llm = llm
        
    def _run(self, query: str) -> str:
        """Execute web search using Gemini"""
        prompt = f"""
        Search the web for: {query}
        
        Provide comprehensive results including:
        - Recent news and developments
        - Scientific papers if relevant
        - Key statistics and data
        - Credible sources
        
        Focus on accurate, current information.
        """
        
        response = self.llm.invoke(prompt)
        return response.content
        
    async def _arun(self, query: str) -> str:
        """Async web search"""
        return await asyncio.to_thread(self._run, query)


class GeminiCodeExecutionTool(BaseTool):
    """Code execution tool using Gemini's native code execution capability"""
    name = "code_execution"
    description = "Write and execute Python code for data analysis, calculations, and visualizations"
    args_schema: Type[BaseModel] = CodeExecutionInput
    
    def __init__(self):
        super().__init__()
        # Configure Gemini with code execution
        genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
        self.model = genai.GenerativeModel(
            model_name="gemini-2.0-flash-exp",
            tools="code_execution"
        )
        
    def _run(self, code: str, description: str) -> str:
        """Execute Python code using Gemini"""
        prompt = f"""
        Task: {description}
        
        Execute this Python code and provide the results:
        
        ```python
        {code}
        ```
        
        Show any outputs, visualizations, or calculated results.
        """
        
        response = self.model.generate_content(prompt)
        return response.text
        
    async def _arun(self, code: str, description: str) -> str:
        """Async code execution"""
        return await asyncio.to_thread(self._run, code, description)


class GeminiBiotechAnalysisTool(BaseTool):
    """Specialized biotech analysis tool"""
    name = "biotech_analysis"
    description = "Analyze biotech data including proteins, genes, drugs, and clinical results"
    args_schema: Type[BaseModel] = BiotechAnalysisInput
    
    def __init__(self, llm: ChatGoogleGenerativeAI):
        super().__init__()
        self.llm = llm
        
    def _run(self, data: str, analysis_type: str) -> str:
        """Run biotech-specific analysis"""
        prompts = {
            "protein": """
                Analyze this protein data:
                - Structure and function predictions
                - Binding sites and interactions
                - Stability analysis
                - Therapeutic potential
            """,
            "gene": """
                Analyze this genetic data:
                - Gene expression patterns
                - Mutations and variants
                - Pathway involvement
                - Disease associations
            """,
            "drug": """
                Analyze this drug data:
                - Mechanism of action
                - Efficacy predictions
                - Safety profile
                - Market potential
            """,
            "clinical": """
                Analyze this clinical trial data:
                - Statistical significance
                - Safety signals
                - Efficacy endpoints
                - Regulatory implications
            """
        }
        
        analysis_prompt = prompts.get(analysis_type, "Perform general biotech analysis")
        
        full_prompt = f"""
        {analysis_prompt}
        
        Data: {data}
        
        Provide detailed scientific analysis with supporting evidence.
        """
        
        response = self.llm.invoke(full_prompt)
        return response.content
        
    async def _arun(self, data: str, analysis_type: str) -> str:
        """Async biotech analysis"""
        return await asyncio.to_thread(self._run, data, analysis_type)


class GeminiLangChainService:
    """Service for Google Gemini + LangChain integration"""
    
    def __init__(self, model_name: str = "gemini-2.0-flash-exp", temperature: float = 0.7):
        # Initialize Gemini LLM
        self.llm = ChatGoogleGenerativeAI(
            model=model_name,
            temperature=temperature,
            google_api_key=os.getenv("GOOGLE_API_KEY"),
            convert_system_message_to_human=True,
            streaming=True
        )
        
        # Create tools
        self.tools = [
            GeminiWebSearchTool(self.llm),
            GeminiCodeExecutionTool(),
            GeminiBiotechAnalysisTool(self.llm)
        ]
        
        # Create prompt template
        self.prompt = ChatPromptTemplate.from_messages([
            ("system", "{system_prompt}"),
            MessagesPlaceholder(variable_name="chat_history"),
            ("human", "{input}"),
            MessagesPlaceholder(variable_name="agent_scratchpad")
        ])
        
        # Memory for conversation history
        self.memory = ConversationBufferMemory(
            memory_key="chat_history",
            return_messages=True
        )
        
        logger.info("Gemini LangChain service initialized", model=model_name)
        
    def create_agent(self, system_prompt: str, additional_tools: List[BaseTool] = None) -> AgentExecutor:
        """Create a Gemini-powered agent with tools"""
        all_tools = self.tools.copy()
        if additional_tools:
            all_tools.extend(additional_tools)
            
        # Create tool-calling agent
        agent = create_tool_calling_agent(
            llm=self.llm,
            tools=all_tools,
            prompt=self.prompt
        )
        
        # Create executor
        executor = AgentExecutor(
            agent=agent,
            tools=all_tools,
            verbose=True,
            handle_parsing_errors=True,
            max_iterations=5,
            memory=self.memory
        )
        
        # Set system prompt
        executor.input_keys = ["input", "system_prompt"]
        
        return executor
        
    async def execute_with_tools(
        self, 
        task: str, 
        system_prompt: str = "You are a helpful AI assistant.",
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Execute a task using Gemini with tools"""
        try:
            # Create agent
            agent = self.create_agent(system_prompt)
            
            # Add context to task if provided
            if context:
                task = f"{task}\n\nContext: {context}"
                
            # Execute
            result = await agent.ainvoke({
                "input": task,
                "system_prompt": system_prompt
            })
            
            return {
                "success": True,
                "output": result.get("output", ""),
                "intermediate_steps": result.get("intermediate_steps", []),
                "tools_used": [step[0].tool for step in result.get("intermediate_steps", [])]
            }
            
        except Exception as e:
            logger.error(f"Gemini execution failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "output": ""
            }
            
    async def quick_response(self, prompt: str) -> str:
        """Get a quick response without tools"""
        try:
            response = await self.llm.ainvoke(prompt)
            return response.content
        except Exception as e:
            logger.error(f"Quick response failed: {e}")
            return f"Error: {str(e)}"


# Biotech-specific agent creator
def create_gemini_biotech_agent(
    agent_type: str = "scientist",
    verbose: bool = True
) -> AgentExecutor:
    """Create a biotech-specific Gemini agent"""
    
    system_prompts = {
        "scientist": """You are a senior research scientist with expertise in:
            - Molecular biology and genetics
            - Drug discovery and development
            - Clinical trial design
            - Bioinformatics and data analysis
            Use web search to find current research, execute code for analysis, 
            and provide evidence-based recommendations.""",
            
        "executive": """You are a biotech executive focused on:
            - Strategic decision-making
            - Market analysis and competitive intelligence
            - R&D portfolio management
            - Financial planning and fundraising
            Search for market data, analyze trends with code, and make data-driven decisions.""",
            
        "engineer": """You are a biotech engineer specializing in:
            - Laboratory automation and robotics
            - Bioinformatics pipeline development
            - Data processing and visualization
            - ML/AI applications in biotech
            Write and execute code for analysis, search for technical solutions."""
    }
    
    service = GeminiLangChainService()
    system_prompt = system_prompts.get(agent_type, system_prompts["scientist"])
    
    return service.create_agent(system_prompt)


# Function to demonstrate Gemini's function calling capability
async def demonstrate_gemini_function_calling():
    """Show Gemini's native function calling abilities"""
    
    # Define functions that Gemini can call
    def calculate_drug_efficacy(dose: float, ic50: float, hill_coefficient: float = 1.0) -> float:
        """Calculate drug efficacy using Hill equation"""
        return dose ** hill_coefficient / (ic50 ** hill_coefficient + dose ** hill_coefficient)
        
    def predict_protein_stability(sequence: str, temperature: float = 37.0) -> Dict[str, Any]:
        """Predict protein stability (mock implementation)"""
        # In real implementation, this would use actual prediction models
        stability_score = len(sequence) * 0.1 - temperature * 0.01
        return {
            "stability_score": stability_score,
            "melting_temperature": temperature + 20,
            "half_life_hours": max(1, stability_score * 10)
        }
        
    # Convert to LangChain tools
    efficacy_tool = StructuredTool.from_function(
        func=calculate_drug_efficacy,
        name="calculate_drug_efficacy",
        description="Calculate drug efficacy using Hill equation"
    )
    
    stability_tool = StructuredTool.from_function(
        func=predict_protein_stability,
        name="predict_protein_stability",
        description="Predict protein stability from sequence"
    )
    
    # Create agent with these tools
    service = GeminiLangChainService()
    agent = service.create_agent(
        system_prompt="You are a biotech researcher with access to analysis tools.",
        additional_tools=[efficacy_tool, stability_tool]
    )
    
    # Test function calling
    result = await agent.ainvoke({
        "input": "Calculate the efficacy of a drug with dose 10uM and IC50 of 2.5uM, then predict stability of protein sequence MKTVRQERLKSIVRILERSKEPVSGAQ at body temperature",
        "system_prompt": "Use the provided tools to perform calculations"
    })
    
    return result