"""
Biotech Agent powered by Google Gemini with advanced capabilities
"""
from typing import Dict, Any, Optional, List
from datetime import datetime
from langgraph.graph import StateGraph, END
from pydantic import BaseModel, Field
import structlog
from app.core.gemini_langchain import (
    GeminiLangChainService,
    create_gemini_biotech_agent
)
from app.core.messaging import message_broker
from app.workflows.biotech_workflows import WorkflowStatus
import json

logger = structlog.get_logger()


class GeminiAgentState(BaseModel):
    """State for Gemini-powered agent workflows"""
    messages: List[Dict[str, Any]] = Field(default_factory=list)
    current_task: Optional[str] = None
    context: Dict[str, Any] = Field(default_factory=dict)
    decisions: List[Dict[str, Any]] = Field(default_factory=list)
    research_data: Dict[str, Any] = Field(default_factory=dict)
    code_outputs: List[Dict[str, Any]] = Field(default_factory=list)
    web_search_results: List[Dict[str, Any]] = Field(default_factory=list)
    analysis_results: Dict[str, Any] = Field(default_factory=dict)
    metrics: Dict[str, Any] = Field(default_factory=dict)


class GeminiBiotechAgent:
    """
    Advanced biotech agent using Google Gemini's capabilities
    """
    
    def __init__(
        self, 
        agent_id: str, 
        agent_type: str, 
        department: str,
        model_name: str = "gemini-2.0-flash-exp"
    ):
        self.agent_id = agent_id
        self.agent_type = agent_type
        self.department = department
        self.model_name = model_name
        
        # Initialize Gemini service
        self.gemini_service = GeminiLangChainService(model_name=model_name)
        
        # Create specialized agent based on type
        self.langchain_agent = self._create_specialized_agent()
        
        # Build workflow graph
        self.graph = self._build_workflow_graph()
        
        # State management
        self.is_active = True
        self._current_state = GeminiAgentState()
        
        logger.info(
            "Gemini biotech agent initialized",
            agent_id=agent_id,
            agent_type=agent_type,
            model=model_name
        )
        
    def _create_specialized_agent(self):
        """Create agent with role-specific configuration"""
        agent_configs = {
            "CEO": {
                "type": "executive",
                "focus": ["strategy", "market", "leadership"]
            },
            "CSO": {
                "type": "scientist",
                "focus": ["research", "discovery", "clinical"]
            },
            "CTO": {
                "type": "engineer",
                "focus": ["technology", "automation", "data"]
            },
            "CFO": {
                "type": "executive",
                "focus": ["finance", "investment", "budget"]
            },
            "COO": {
                "type": "executive",
                "focus": ["operations", "efficiency", "scaling"]
            }
        }
        
        config = agent_configs.get(self.agent_type, {"type": "scientist", "focus": []})
        
        # Create system prompt with focus areas
        system_prompt = f"""You are the {self.agent_type} of an innovative biotech company.
        
        Your key focus areas: {', '.join(config['focus'])}
        
        You have access to:
        - Web search for current information and research
        - Code execution for data analysis and visualization
        - Biotech-specific analysis tools
        
        Always:
        - Use web search to get current data before making decisions
        - Execute code to analyze data and create visualizations
        - Provide evidence-based recommendations
        - Consider both scientific merit and business impact
        """
        
        return self.gemini_service.create_agent(system_prompt)
        
    def _build_workflow_graph(self) -> StateGraph:
        """Build the agent's decision workflow"""
        graph = StateGraph(GeminiAgentState)
        
        # Define workflow nodes
        graph.add_node("gather_information", self._gather_information)
        graph.add_node("analyze_data", self._analyze_data)
        graph.add_node("generate_insights", self._generate_insights)
        graph.add_node("make_decision", self._make_decision)
        graph.add_node("create_action_plan", self._create_action_plan)
        graph.add_node("communicate", self._communicate_results)
        
        # Define workflow edges
        graph.add_edge("gather_information", "analyze_data")
        graph.add_edge("analyze_data", "generate_insights")
        graph.add_edge("generate_insights", "make_decision")
        graph.add_edge("make_decision", "create_action_plan")
        graph.add_edge("create_action_plan", "communicate")
        graph.add_edge("communicate", END)
        
        graph.set_entry_point("gather_information")
        
        return graph.compile()
        
    async def _gather_information(self, state: GeminiAgentState) -> GeminiAgentState:
        """Gather information using web search"""
        try:
            search_prompt = f"""
            Task: {state.current_task}
            Context: {json.dumps(state.context, indent=2)}
            
            Search for relevant information including:
            1. Current market data and trends
            2. Recent scientific breakthroughs
            3. Competitor activities
            4. Regulatory updates
            5. Industry best practices
            
            Focus on {self.department} perspective.
            """
            
            result = await self.langchain_agent.ainvoke({
                "input": search_prompt,
                "system_prompt": f"Gather comprehensive information as {self.agent_type}"
            })
            
            state.web_search_results.append({
                "query": state.current_task,
                "results": result.get("output", ""),
                "timestamp": datetime.utcnow().isoformat(),
                "tools_used": result.get("tools_used", [])
            })
            
            state.messages.append({
                "type": "information_gathering",
                "content": result.get("output", ""),
                "timestamp": datetime.utcnow().isoformat()
            })
            
            return state
            
        except Exception as e:
            logger.error(f"Information gathering failed: {e}", agent_id=self.agent_id)
            state.messages.append({
                "type": "error",
                "content": f"Failed to gather information: {str(e)}",
                "timestamp": datetime.utcnow().isoformat()
            })
            return state
            
    async def _analyze_data(self, state: GeminiAgentState) -> GeminiAgentState:
        """Analyze data using code execution"""
        try:
            # Prepare data from previous step
            gathered_info = state.web_search_results[-1]["results"] if state.web_search_results else ""
            
            analysis_prompt = f"""
            Based on the gathered information:
            {gathered_info}
            
            Perform data analysis:
            1. Write Python code to process and analyze the data
            2. Create visualizations (charts, graphs)
            3. Calculate key metrics and KPIs
            4. Identify patterns and trends
            5. Generate statistical insights
            
            Focus on {self.department} metrics.
            """
            
            result = await self.langchain_agent.ainvoke({
                "input": analysis_prompt,
                "system_prompt": f"Analyze data as {self.agent_type} using code execution"
            })
            
            state.code_outputs.append({
                "purpose": "data_analysis",
                "output": result.get("output", ""),
                "timestamp": datetime.utcnow().isoformat(),
                "tools_used": result.get("tools_used", [])
            })
            
            state.analysis_results["data_analysis"] = result.get("output", "")
            
            return state
            
        except Exception as e:
            logger.error(f"Data analysis failed: {e}", agent_id=self.agent_id)
            state.analysis_results["error"] = str(e)
            return state
            
    async def _generate_insights(self, state: GeminiAgentState) -> GeminiAgentState:
        """Generate insights from analysis"""
        try:
            insights_prompt = f"""
            Information gathered: {state.web_search_results[-1]["results"] if state.web_search_results else ""}
            Analysis results: {state.analysis_results.get("data_analysis", "")}
            
            Generate actionable insights:
            1. Key findings and their implications
            2. Opportunities identified
            3. Risks and challenges
            4. Competitive advantages
            5. Strategic recommendations
            
            Provide insights from {self.agent_type} perspective for {self.department}.
            """
            
            result = await self.gemini_service.execute_with_tools(
                task=insights_prompt,
                system_prompt=f"Generate strategic insights as {self.agent_type}"
            )
            
            state.analysis_results["insights"] = result.get("output", "")
            
            state.messages.append({
                "type": "insights",
                "content": result.get("output", ""),
                "timestamp": datetime.utcnow().isoformat()
            })
            
            return state
            
        except Exception as e:
            logger.error(f"Insight generation failed: {e}", agent_id=self.agent_id)
            state.analysis_results["insights_error"] = str(e)
            return state
            
    async def _make_decision(self, state: GeminiAgentState) -> GeminiAgentState:
        """Make strategic decision based on analysis"""
        try:
            decision_prompt = f"""
            Task: {state.current_task}
            Research: {state.web_search_results[-1]["results"][:1000] if state.web_search_results else ""}
            Analysis: {state.analysis_results.get("data_analysis", "")[:1000]}
            Insights: {state.analysis_results.get("insights", "")[:1000]}
            
            Make a strategic decision that includes:
            1. Recommended course of action
            2. Expected outcomes (quantified)
            3. Success metrics and KPIs
            4. Risk mitigation strategies
            5. Resource requirements
            6. Timeline with milestones
            
            Decision should align with {self.department} objectives.
            """
            
            result = await self.langchain_agent.ainvoke({
                "input": decision_prompt,
                "system_prompt": f"Make data-driven decision as {self.agent_type}"
            })
            
            decision_data = {
                "decision": result.get("output", ""),
                "timestamp": datetime.utcnow().isoformat(),
                "agent_id": self.agent_id,
                "agent_type": self.agent_type,
                "task": state.current_task,
                "based_on": {
                    "web_searches": len(state.web_search_results),
                    "code_executions": len(state.code_outputs),
                    "has_insights": bool(state.analysis_results.get("insights"))
                }
            }
            
            state.decisions.append(decision_data)
            state.context["current_decision"] = decision_data
            
            return state
            
        except Exception as e:
            logger.error(f"Decision making failed: {e}", agent_id=self.agent_id)
            state.context["decision_error"] = str(e)
            return state
            
    async def _create_action_plan(self, state: GeminiAgentState) -> GeminiAgentState:
        """Create detailed action plan"""
        try:
            plan_prompt = f"""
            Decision made: {state.context.get("current_decision", {}).get("decision", "")}
            
            Create a detailed action plan:
            1. Write Python code for implementation tools/dashboards
            2. Generate project timeline with Gantt chart
            3. Create resource allocation plan
            4. Define success metrics tracking
            5. Establish monitoring and reporting
            
            Make it executable and measurable.
            """
            
            result = await self.langchain_agent.ainvoke({
                "input": plan_prompt,
                "system_prompt": f"Create executable action plan as {self.agent_type}"
            })
            
            state.context["action_plan"] = {
                "plan": result.get("output", ""),
                "timestamp": datetime.utcnow().isoformat(),
                "tools_used": result.get("tools_used", [])
            }
            
            # Update metrics
            state.metrics.update({
                "decisions_made": len(state.decisions),
                "analyses_performed": len(state.code_outputs),
                "searches_conducted": len(state.web_search_results),
                "completion_time": datetime.utcnow().isoformat()
            })
            
            return state
            
        except Exception as e:
            logger.error(f"Action plan creation failed: {e}", agent_id=self.agent_id)
            state.context["action_plan_error"] = str(e)
            return state
            
    async def _communicate_results(self, state: GeminiAgentState) -> GeminiAgentState:
        """Communicate results to stakeholders"""
        try:
            # Prepare comprehensive summary
            summary = {
                "agent_id": self.agent_id,
                "agent_type": self.agent_type,
                "department": self.department,
                "task": state.current_task,
                "decision": state.context.get("current_decision", {}).get("decision", ""),
                "action_plan": state.context.get("action_plan", {}).get("plan", "")[:500] + "...",
                "metrics": state.metrics,
                "tools_used": {
                    "web_searches": len(state.web_search_results),
                    "code_executions": len(state.code_outputs),
                    "analyses": len(state.analysis_results)
                },
                "timestamp": datetime.utcnow().isoformat()
            }
            
            # Publish to message broker
            await message_broker.publish(
                f"agent.{self.agent_type.lower()}.update",
                summary
            )
            
            # Send WebSocket update
            await message_broker.publish(
                "websocket.broadcast",
                {
                    "type": "gemini_agent_update",
                    "data": summary
                }
            )
            
            state.messages.append({
                "type": "communication",
                "content": summary,
                "timestamp": datetime.utcnow().isoformat()
            })
            
            logger.info(
                "Results communicated",
                agent_id=self.agent_id,
                metrics=state.metrics
            )
            
            return state
            
        except Exception as e:
            logger.error(f"Communication failed: {e}", agent_id=self.agent_id)
            state.messages.append({
                "type": "error",
                "content": f"Failed to communicate results: {str(e)}",
                "timestamp": datetime.utcnow().isoformat()
            })
            return state
            
    async def process_task(
        self, 
        task: str, 
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Process a task through the complete workflow"""
        try:
            # Initialize state
            self._current_state = GeminiAgentState(
                current_task=task,
                context=context or {}
            )
            
            # Run through workflow
            final_state = await self.graph.ainvoke(self._current_state)
            
            # Return comprehensive results
            return {
                "success": True,
                "agent_id": self.agent_id,
                "task": task,
                "decision": final_state.decisions[-1] if final_state.decisions else None,
                "action_plan": final_state.context.get("action_plan"),
                "insights": final_state.analysis_results.get("insights"),
                "metrics": final_state.metrics,
                "web_searches": len(final_state.web_search_results),
                "code_outputs": len(final_state.code_outputs),
                "messages": final_state.messages
            }
            
        except Exception as e:
            logger.error(
                f"Task processing failed: {e}",
                agent_id=self.agent_id,
                task=task
            )
            return {
                "success": False,
                "agent_id": self.agent_id,
                "task": task,
                "error": str(e)
            }
            
    async def quick_analysis(self, query: str) -> str:
        """Quick analysis without full workflow"""
        try:
            result = await self.gemini_service.execute_with_tools(
                task=query,
                system_prompt=f"You are the {self.agent_type}. Provide quick analysis.",
                context={"department": self.department}
            )
            return result.get("output", "No response generated")
        except Exception as e:
            logger.error(f"Quick analysis failed: {e}", agent_id=self.agent_id)
            return f"Error: {str(e)}"
            
    def get_status(self) -> Dict[str, Any]:
        """Get current agent status"""
        return {
            "agent_id": self.agent_id,
            "agent_type": self.agent_type,
            "department": self.department,
            "model": self.model_name,
            "is_active": self.is_active,
            "current_task": self._current_state.current_task,
            "decisions_made": len(self._current_state.decisions),
            "analyses_performed": len(self._current_state.code_outputs),
            "web_searches": len(self._current_state.web_search_results),
            "capabilities": [
                "web_search",
                "code_execution",
                "biotech_analysis",
                "data_visualization",
                "strategic_planning"
            ],
            "metrics": self._current_state.metrics
        }