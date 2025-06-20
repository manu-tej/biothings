"""
Biotech Agent powered by Claude Code + LangChain integration
"""
from typing import Dict, Any, Optional, List
from datetime import datetime
from langgraph.graph import StateGraph, END
from pydantic import BaseModel, Field
import structlog
from app.core.claude_code_langchain_simple import (
    ClaudeCodeLLM, 
    create_claude_code_agent,
    BiotechAnalysisTool
)
from app.core.messaging import message_broker

logger = structlog.get_logger()


class AgentState(BaseModel):
    """State model for agent workflows"""
    messages: List[Dict[str, Any]] = Field(default_factory=list)
    current_task: Optional[str] = None
    context: Dict[str, Any] = Field(default_factory=dict)
    decisions: List[Dict[str, Any]] = Field(default_factory=list)
    metrics: Dict[str, Any] = Field(default_factory=dict)
    research_data: Dict[str, Any] = Field(default_factory=dict)


class ClaudeCodeBiotechAgent:
    """
    Biotech agent that uses Claude Code's native capabilities through LangChain
    """
    
    def __init__(self, agent_id: str, agent_type: str, department: str):
        self.agent_id = agent_id
        self.agent_type = agent_type
        self.department = department
        self.system_prompt = self._get_system_prompt()
        
        # Initialize Claude Code LLM
        self.llm = ClaudeCodeLLM(
            model_name="claude-3-opus-20240229",
            temperature=0.7,
            enable_code_execution=True
        )
        
        # Create LangChain agent with Claude Code
        self.langchain_agent = self._create_specialized_agent()
        
        # Build workflow graph
        self.graph = self._build_graph()
        self.is_active = True
        self._current_state = AgentState()
    
    def _get_system_prompt(self) -> str:
        """Get role-specific system prompt"""
        prompts = {
            "CEO": """You are the CEO of a cutting-edge biotech company. 
                Use web search to track market trends and competitors.
                Execute financial analysis with Python code.
                Make data-driven strategic decisions.""",
                
            "CSO": """You are the Chief Science Officer of a biotech company.
                Search for latest research papers and clinical trials.
                Analyze experimental data with Python.
                Design protocols and evaluate scientific opportunities.""",
                
            "CTO": """You are the CTO of a biotech company.
                Evaluate new technologies through web research.
                Write code to prototype solutions.
                Assess technical infrastructure needs.""",
                
            "CFO": """You are the CFO of a biotech company.
                Search for market data and financial news.
                Perform financial analysis with Python.
                Evaluate investment opportunities."""
        }
        
        return prompts.get(self.agent_type, "You are a biotech executive with access to web search, code execution, and data analysis.")
    
    def _create_specialized_agent(self):
        """Create a LangChain agent with role-specific tools"""
        tools = []
        
        # Add biotech analysis tool for scientific roles
        if self.agent_type in ["CSO", "CTO"]:
            tools.append(BiotechAnalysisTool(llm=self.llm))
        
        # Create the agent
        return create_claude_code_agent(
            additional_tools=tools,
            verbose=True,
            model_name="claude-3-opus-20240229"
        )
    
    def _build_graph(self) -> StateGraph:
        """Build the agent's decision graph"""
        graph = StateGraph(AgentState)
        
        # Define nodes
        graph.add_node("research", self._research_phase)
        graph.add_node("analyze", self._analyze_phase)
        graph.add_node("decide", self._decide_phase)
        graph.add_node("execute", self._execute_phase)
        graph.add_node("communicate", self._communicate_results)
        
        # Define edges
        graph.add_edge("research", "analyze")
        graph.add_edge("analyze", "decide")
        graph.add_edge("decide", "execute")
        graph.add_edge("execute", "communicate")
        graph.add_edge("communicate", END)
        
        graph.set_entry_point("research")
        
        return graph.compile()
    
    async def _research_phase(self, state: AgentState) -> AgentState:
        """Research phase using Claude Code's web search"""
        try:
            research_prompt = f"""
            {self.system_prompt}
            
            Task: {state.current_task}
            Context: {state.context}
            
            Research this thoroughly by:
            1. Searching the web for relevant information
            2. Finding recent data, news, or research papers
            3. Gathering competitive intelligence if applicable
            
            Provide comprehensive research findings.
            """
            
            # Use LangChain agent with Claude Code
            research_results = await self.langchain_agent.arun(research_prompt)
            
            state.research_data = {
                "findings": research_results,
                "timestamp": datetime.utcnow().isoformat(),
                "sources_checked": True
            }
            
            state.messages.append({
                "type": "research",
                "content": research_results,
                "timestamp": datetime.utcnow().isoformat()
            })
            
            logger.info("Research phase completed", agent_id=self.agent_id)
            return state
            
        except Exception as e:
            logger.error(f"Research phase failed: {e}", agent_id=self.agent_id)
            state.research_data["error"] = str(e)
            return state
    
    async def _analyze_phase(self, state: AgentState) -> AgentState:
        """Analysis phase using Claude Code's Python execution"""
        try:
            analysis_prompt = f"""
            Based on the research: {state.research_data.get('findings', 'No research available')}
            
            Analyze this data by:
            1. Writing Python code to process any numerical data
            2. Creating visualizations if helpful
            3. Performing statistical analysis if applicable
            4. Identifying key insights and patterns
            
            Provide data-driven analysis with supporting code and outputs.
            """
            
            analysis = await self.langchain_agent.arun(analysis_prompt)
            
            state.context["analysis"] = analysis
            state.messages.append({
                "type": "analysis",
                "content": analysis,
                "timestamp": datetime.utcnow().isoformat()
            })
            
            logger.info("Analysis phase completed", agent_id=self.agent_id)
            return state
            
        except Exception as e:
            logger.error(f"Analysis phase failed: {e}", agent_id=self.agent_id)
            state.context["analysis_error"] = str(e)
            return state
    
    async def _decide_phase(self, state: AgentState) -> AgentState:
        """Decision phase combining research and analysis"""
        try:
            decision_prompt = f"""
            Research findings: {state.research_data.get('findings', 'No research')}
            Analysis results: {state.context.get('analysis', 'No analysis')}
            
            Make a concrete decision that includes:
            1. Recommended action plan
            2. Expected outcomes and metrics
            3. Risk assessment
            4. Timeline and milestones
            5. Resource requirements
            
            Support your decision with data from research and analysis.
            """
            
            decision = await self.langchain_agent.arun(decision_prompt)
            
            decision_data = {
                "decision": decision,
                "timestamp": datetime.utcnow().isoformat(),
                "agent_id": self.agent_id,
                "task": state.current_task,
                "based_on_research": bool(state.research_data),
                "data_driven": True
            }
            
            state.decisions.append(decision_data)
            state.context["current_decision"] = decision_data
            
            logger.info("Decision made", agent_id=self.agent_id)
            return state
            
        except Exception as e:
            logger.error(f"Decision phase failed: {e}", agent_id=self.agent_id)
            state.context["decision_error"] = str(e)
            return state
    
    async def _execute_phase(self, state: AgentState) -> AgentState:
        """Execute the decision with measurable actions"""
        try:
            execution_prompt = f"""
            Decision to execute: {state.context.get('current_decision', {}).get('decision', '')}
            
            Create an execution plan that includes:
            1. Specific bash commands or Python scripts to run
            2. Files or documents to create
            3. Systems to configure or update
            4. Metrics to track
            
            Show the actual execution steps and their outputs.
            """
            
            execution_result = await self.langchain_agent.arun(execution_prompt)
            
            state.context["execution_result"] = {
                "output": execution_result,
                "status": "completed",
                "timestamp": datetime.utcnow().isoformat()
            }
            
            # Update metrics based on execution
            state.metrics.update({
                "execution_time": datetime.utcnow().isoformat(),
                "tasks_completed": state.metrics.get("tasks_completed", 0) + 1,
                "decisions_executed": state.metrics.get("decisions_executed", 0) + 1
            })
            
            logger.info("Execution completed", agent_id=self.agent_id)
            return state
            
        except Exception as e:
            logger.error(f"Execution phase failed: {e}", agent_id=self.agent_id)
            state.context["execution_error"] = str(e)
            return state
    
    async def _communicate_results(self, state: AgentState) -> AgentState:
        """Communicate results to relevant parties"""
        try:
            # Prepare comprehensive message
            message = {
                "agent_id": self.agent_id,
                "agent_type": self.agent_type,
                "department": self.department,
                "task": state.current_task,
                "research_summary": state.research_data.get("findings", "")[:500] + "...",
                "decision": state.context.get("current_decision", {}).get("decision", ""),
                "execution_status": state.context.get("execution_result", {}).get("status", "unknown"),
                "metrics": state.metrics,
                "timestamp": datetime.utcnow().isoformat()
            }
            
            # Publish to message broker
            await message_broker.publish(
                f"agent.{self.agent_type.lower()}.update",
                message
            )
            
            # Send WebSocket update
            await message_broker.publish(
                "websocket.broadcast",
                {
                    "type": "agent_update",
                    "data": message
                }
            )
            
            state.messages.append({
                "type": "communication",
                "content": message,
                "timestamp": datetime.utcnow().isoformat()
            })
            
            logger.info("Results communicated", agent_id=self.agent_id)
            return state
            
        except Exception as e:
            logger.error(f"Communication failed: {e}", agent_id=self.agent_id)
            state.context["communication_error"] = str(e)
            return state
    
    async def process_task(self, task: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Process a task through the complete workflow"""
        try:
            # Initialize state
            self._current_state = AgentState(
                current_task=task,
                context=context or {}
            )
            
            # Run through graph
            final_state = await self.graph.ainvoke(self._current_state)
            
            # Return comprehensive results
            return {
                "success": True,
                "agent_id": self.agent_id,
                "task": task,
                "research": final_state.research_data,
                "decisions": final_state.decisions,
                "execution": final_state.context.get("execution_result"),
                "metrics": final_state.metrics,
                "messages": final_state.messages
            }
            
        except Exception as e:
            logger.error(f"Task processing failed: {e}", agent_id=self.agent_id, task=task)
            return {
                "success": False,
                "agent_id": self.agent_id,
                "task": task,
                "error": str(e)
            }
    
    async def quick_query(self, query: str) -> str:
        """Quick query using Claude Code without full workflow"""
        enhanced_query = f"{self.system_prompt}\n\n{query}"
        return await self.langchain_agent.arun(enhanced_query)
    
    def get_status(self) -> Dict[str, Any]:
        """Get current agent status"""
        return {
            "agent_id": self.agent_id,
            "agent_type": self.agent_type,
            "department": self.department,
            "is_active": self.is_active,
            "current_task": self._current_state.current_task,
            "has_research": bool(self._current_state.research_data),
            "decisions_made": len(self._current_state.decisions),
            "metrics": self._current_state.metrics,
            "capabilities": [
                "web_search",
                "code_execution",
                "data_analysis",
                "file_operations"
            ]
        }