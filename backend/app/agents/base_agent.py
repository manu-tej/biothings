"""
Base Agent with Real LLM Integration
"""
from typing import Dict, Any, Optional, List
from datetime import datetime
import asyncio
from pydantic import BaseModel, Field
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolExecutor, ToolInvocation
import structlog
from app.core.llm import llm_service
from app.core.messaging import message_broker

logger = structlog.get_logger()


class AgentState(BaseModel):
    """State model for agent workflows"""
    messages: List[Dict[str, Any]] = Field(default_factory=list)
    current_task: Optional[str] = None
    context: Dict[str, Any] = Field(default_factory=dict)
    decisions: List[Dict[str, Any]] = Field(default_factory=list)
    metrics: Dict[str, Any] = Field(default_factory=dict)


class BaseAgent:
    """Base class for all executive agents with LLM capabilities"""
    
    def __init__(self, agent_id: str, agent_type: str, department: str):
        self.agent_id = agent_id
        self.agent_type = agent_type
        self.department = department
        self.system_prompt = self._get_system_prompt()
        self.graph = self._build_graph()
        self.is_active = True
        self._current_state = AgentState()
        
    def _get_system_prompt(self) -> str:
        """Get role-specific system prompt"""
        prompts = {
            "CEO": """You are the CEO of a cutting-edge biotech company. Your responsibilities include:
                - Setting strategic vision and company direction
                - Making high-level decisions on research priorities
                - Coordinating between departments
                - Ensuring company growth and profitability
                - Managing stakeholder relationships
                
                Always think strategically and consider long-term implications. Be decisive but data-driven.""",
                
            "COO": """You are the COO of a biotech company. Your responsibilities include:
                - Overseeing daily operations
                - Optimizing processes and workflows
                - Managing resource allocation
                - Ensuring operational efficiency
                - Coordinating between teams
                
                Focus on practical implementation and operational excellence.""",
                
            "CSO": """You are the Chief Science Officer of a biotech company. Your responsibilities include:
                - Leading scientific research and development
                - Evaluating new technologies and methodologies
                - Ensuring scientific rigor and compliance
                - Managing research teams and projects
                - Translating science into business opportunities
                
                Maintain scientific integrity while considering commercial viability.""",
                
            "CFO": """You are the CFO of a biotech company. Your responsibilities include:
                - Managing financial planning and analysis
                - Overseeing budgets and cost control
                - Ensuring financial compliance
                - Evaluating investment opportunities
                - Managing investor relations
                
                Balance fiscal responsibility with strategic investment needs.""",
                
            "CTO": """You are the CTO of a biotech company. Your responsibilities include:
                - Overseeing technology infrastructure
                - Managing lab automation and data systems
                - Ensuring cybersecurity and data integrity
                - Evaluating new technologies
                - Leading digital transformation
                
                Focus on scalable, secure, and innovative technology solutions."""
        }
        
        return prompts.get(self.agent_type, "You are an executive agent in a biotech company.")
    
    def _build_graph(self) -> StateGraph:
        """Build the agent's decision graph"""
        graph = StateGraph(AgentState)
        
        # Define nodes
        graph.add_node("analyze", self._analyze_situation)
        graph.add_node("decide", self._make_decision)
        graph.add_node("execute", self._execute_action)
        graph.add_node("communicate", self._communicate_results)
        
        # Define edges
        graph.add_edge("analyze", "decide")
        graph.add_edge("decide", "execute")
        graph.add_edge("execute", "communicate")
        graph.add_edge("communicate", END)
        
        graph.set_entry_point("analyze")
        
        return graph.compile()
    
    async def _analyze_situation(self, state: AgentState) -> AgentState:
        """Analyze current situation using LLM"""
        try:
            # Build analysis prompt
            analysis_prompt = f"""
            Current Task: {state.current_task}
            Context: {state.context}
            Recent Messages: {state.messages[-5:] if state.messages else 'None'}
            
            Analyze the situation and identify:
            1. Key challenges and opportunities
            2. Required resources or information
            3. Potential risks
            4. Recommended approach
            """
            
            # Get LLM analysis
            analysis = await llm_service.generate_response(
                agent_id=self.agent_id,
                system_prompt=self.system_prompt,
                user_message=analysis_prompt,
                context=state.context
            )
            
            # Update state
            state.context["analysis"] = analysis
            state.messages.append({
                "type": "analysis",
                "content": analysis,
                "timestamp": datetime.utcnow().isoformat()
            })
            
            logger.info("Situation analyzed", agent_id=self.agent_id)
            return state
            
        except Exception as e:
            logger.error(f"Analysis failed: {e}", agent_id=self.agent_id)
            state.context["analysis_error"] = str(e)
            return state
    
    async def _make_decision(self, state: AgentState) -> AgentState:
        """Make decision based on analysis"""
        try:
            # Build decision prompt
            decision_prompt = f"""
            Based on the analysis: {state.context.get('analysis', 'No analysis available')}
            
            Make a concrete decision including:
            1. Specific action to take
            2. Success criteria
            3. Timeline
            4. Required resources
            5. Key stakeholders to involve
            """
            
            # Get LLM decision
            decision = await llm_service.generate_response(
                agent_id=self.agent_id,
                system_prompt=self.system_prompt,
                user_message=decision_prompt,
                context=state.context
            )
            
            # Parse and structure decision
            decision_data = {
                "decision": decision,
                "timestamp": datetime.utcnow().isoformat(),
                "agent_id": self.agent_id,
                "task": state.current_task
            }
            
            state.decisions.append(decision_data)
            state.context["current_decision"] = decision_data
            
            logger.info("Decision made", agent_id=self.agent_id, decision=decision[:100])
            return state
            
        except Exception as e:
            logger.error(f"Decision making failed: {e}", agent_id=self.agent_id)
            state.context["decision_error"] = str(e)
            return state
    
    async def _execute_action(self, state: AgentState) -> AgentState:
        """Execute the decided action"""
        try:
            decision = state.context.get("current_decision", {})
            
            # Simulate action execution (in real system, this would interface with actual systems)
            execution_result = {
                "status": "executed",
                "decision": decision.get("decision", ""),
                "timestamp": datetime.utcnow().isoformat(),
                "metrics": {
                    "execution_time": 0.5,
                    "resources_used": ["compute", "database"],
                    "confidence": 0.85
                }
            }
            
            # Update metrics
            state.metrics.update(execution_result["metrics"])
            state.context["execution_result"] = execution_result
            
            logger.info("Action executed", agent_id=self.agent_id)
            return state
            
        except Exception as e:
            logger.error(f"Execution failed: {e}", agent_id=self.agent_id)
            state.context["execution_error"] = str(e)
            return state
    
    async def _communicate_results(self, state: AgentState) -> AgentState:
        """Communicate results to relevant parties"""
        try:
            # Build communication message
            execution_result = state.context.get("execution_result", {})
            decision = state.context.get("current_decision", {})
            
            message = {
                "agent_id": self.agent_id,
                "agent_type": self.agent_type,
                "department": self.department,
                "task": state.current_task,
                "decision": decision.get("decision", ""),
                "execution_status": execution_result.get("status", "unknown"),
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
        """Process a task through the agent's workflow"""
        try:
            # Initialize state
            self._current_state = AgentState(
                current_task=task,
                context=context or {}
            )
            
            # Run through graph
            final_state = await self.graph.ainvoke(self._current_state)
            
            # Return results
            return {
                "success": True,
                "agent_id": self.agent_id,
                "task": task,
                "decisions": final_state.decisions,
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
    
    async def collaborate_with_agent(self, target_agent_id: str, message: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Collaborate with another agent"""
        try:
            # Enhance message with LLM
            collaboration_prompt = f"""
            You need to collaborate with {target_agent_id}.
            Original message: {message}
            Context: {context}
            
            Craft a professional inter-departmental message that:
            1. Clearly states the purpose
            2. Provides necessary context
            3. Specifies what you need
            4. Suggests next steps
            """
            
            enhanced_message = await llm_service.generate_response(
                agent_id=self.agent_id,
                system_prompt=self.system_prompt,
                user_message=collaboration_prompt
            )
            
            # Send message through message broker
            collaboration_data = {
                "from_agent": self.agent_id,
                "to_agent": target_agent_id,
                "message": enhanced_message,
                "original_message": message,
                "context": context,
                "timestamp": datetime.utcnow().isoformat()
            }
            
            await message_broker.publish(
                f"agent.collaboration.{target_agent_id}",
                collaboration_data
            )
            
            return {
                "success": True,
                "message_sent": enhanced_message,
                "target": target_agent_id
            }
            
        except Exception as e:
            logger.error(f"Collaboration failed: {e}", agent_id=self.agent_id)
            return {
                "success": False,
                "error": str(e)
            }
    
    def get_status(self) -> Dict[str, Any]:
        """Get current agent status"""
        return {
            "agent_id": self.agent_id,
            "agent_type": self.agent_type,
            "department": self.department,
            "is_active": self.is_active,
            "current_task": self._current_state.current_task,
            "metrics": self._current_state.metrics,
            "last_decision": self._current_state.decisions[-1] if self._current_state.decisions else None
        }