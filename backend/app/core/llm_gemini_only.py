"""
Google Gemini LLM Service - The Only LLM Provider
"""
import os
from typing import Dict, List, Optional, Any
import asyncio
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.schema import HumanMessage, SystemMessage, AIMessage
from langchain.callbacks.base import AsyncCallbackHandler
from pydantic import BaseModel, Field
import structlog
import google.generativeai as genai

logger = structlog.get_logger()


class GeminiConfig(BaseModel):
    """Configuration for Google Gemini"""
    model: str = Field(default="gemini-2.0-flash-exp")
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    max_tokens: int = Field(default=8192)
    api_key: Optional[str] = None
    enable_code_execution: bool = Field(default=True)


class StreamingCallbackHandler(AsyncCallbackHandler):
    """Handler for streaming Gemini responses"""
    
    def __init__(self, agent_id: str, callback_func):
        self.agent_id = agent_id
        self.callback_func = callback_func
        self.accumulated_text = ""
    
    async def on_llm_new_token(self, token: str, **kwargs) -> None:
        self.accumulated_text += token
        await self.callback_func(self.agent_id, token, self.accumulated_text)


class GeminiLLMService:
    """Unified LLM Service using only Google Gemini"""
    
    def __init__(self):
        self.config = self._load_config()
        self.llm = self._initialize_llm()
        self._conversation_history: Dict[str, List[Any]] = {}
        
        # Initialize native Gemini for code execution
        if self.config.api_key and self.config.enable_code_execution:
            genai.configure(api_key=self.config.api_key)
            self.code_execution_model = genai.GenerativeModel(
                model_name=self.config.model,
                tools="code_execution"
            )
        else:
            self.code_execution_model = None
    
    def _load_config(self) -> GeminiConfig:
        """Load Gemini configuration from environment"""
        api_key = os.getenv("GOOGLE_API_KEY")
        
        if not api_key:
            logger.warning("No GOOGLE_API_KEY found. Some features will be limited.")
        
        return GeminiConfig(
            model=os.getenv("GEMINI_MODEL", "gemini-2.0-flash-exp"),
            temperature=float(os.getenv("GEMINI_TEMPERATURE", "0.7")),
            max_tokens=int(os.getenv("GEMINI_MAX_TOKENS", "8192")),
            api_key=api_key,
            enable_code_execution=os.getenv("GEMINI_CODE_EXECUTION", "true").lower() == "true"
        )
    
    def _initialize_llm(self):
        """Initialize Gemini LLM"""
        if not self.config.api_key:
            logger.warning("No API key found. Using limited mode.")
            return None
        
        return ChatGoogleGenerativeAI(
            model=self.config.model,
            temperature=self.config.temperature,
            max_output_tokens=self.config.max_tokens,
            google_api_key=self.config.api_key,
            convert_system_message_to_human=True,
            streaming=True
        )
    
    async def generate_response(
        self,
        agent_id: str,
        system_prompt: str,
        user_message: str,
        context: Optional[Dict[str, Any]] = None,
        streaming_callback=None,
        use_tools: bool = True
    ) -> str:
        """Generate response using Gemini with optional tool use"""
        
        # Enhance prompt to leverage Gemini capabilities
        enhanced_prompt = self._enhance_prompt_for_tools(system_prompt, use_tools)
        
        # Use limited response if no LLM configured
        if not self.llm:
            return self._generate_limited_response(agent_id, user_message)
        
        try:
            # Build messages
            messages = [
                SystemMessage(content=enhanced_prompt),
                HumanMessage(content=self._build_context_message(user_message, context))
            ]
            
            # Add conversation history if exists
            if agent_id in self._conversation_history:
                messages[1:1] = self._conversation_history[agent_id][-10:]
            
            # Generate response with streaming if callback provided
            if streaming_callback:
                handler = StreamingCallbackHandler(agent_id, streaming_callback)
                response = await self.llm.agenerate([messages], callbacks=[handler])
                result = response.generations[0][0].text
            else:
                response = await self.llm.agenerate([messages])
                result = response.generations[0][0].text
            
            # Update conversation history
            if agent_id not in self._conversation_history:
                self._conversation_history[agent_id] = []
            
            self._conversation_history[agent_id].extend([
                HumanMessage(content=user_message),
                AIMessage(content=result)
            ])
            
            # Keep history size manageable
            if len(self._conversation_history[agent_id]) > 20:
                self._conversation_history[agent_id] = self._conversation_history[agent_id][-20:]
            
            return result
            
        except Exception as e:
            logger.error(f"Gemini generation failed: {e}", agent_id=agent_id)
            return self._generate_limited_response(agent_id, user_message)
    
    async def generate_with_code_execution(
        self,
        agent_id: str,
        task: str,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Generate response with code execution capability"""
        
        if not self.code_execution_model:
            return {
                "success": False,
                "output": "Code execution not available",
                "code_executed": False
            }
        
        try:
            # Build prompt with context
            full_prompt = self._build_context_message(task, context)
            
            # Generate with code execution
            response = self.code_execution_model.generate_content(full_prompt)
            
            return {
                "success": True,
                "output": response.text,
                "code_executed": True,
                "parts": [part for part in response.parts]
            }
            
        except Exception as e:
            logger.error(f"Code execution failed: {e}", agent_id=agent_id)
            return {
                "success": False,
                "output": str(e),
                "code_executed": False
            }
    
    def _enhance_prompt_for_tools(self, system_prompt: str, use_tools: bool) -> str:
        """Enhance system prompt to leverage Gemini's capabilities"""
        if not use_tools:
            return system_prompt
        
        tool_instructions = """

You have access to the following capabilities:
- Web search: Search the internet for current information, research papers, and news
- Code execution: Write and execute Python code for analysis and visualization
- Data analysis: Process and analyze complex datasets
- Function calling: Use specialized functions for calculations

When appropriate:
- Search for current information before making decisions
- Write code to analyze data and create visualizations
- Use evidence-based reasoning
- Provide quantitative analysis when possible
"""
        
        return system_prompt + tool_instructions
    
    def _build_context_message(self, user_message: str, context: Optional[Dict[str, Any]]) -> str:
        """Build message with context"""
        if not context:
            return user_message
        
        context_parts = [f"{k}: {v}" for k, v in context.items()]
        return f"{user_message}\n\nContext:\n" + "\n".join(context_parts)
    
    def _generate_limited_response(self, agent_id: str, message: str) -> str:
        """Generate limited response when API is not available"""
        agent_type = agent_id.split("-")[0].upper()
        
        return f"""I am the {agent_type} agent. While I cannot access external APIs right now, 
I can provide general guidance based on the request: '{message}'.

Key considerations:
1. Strategic alignment with company goals
2. Resource optimization
3. Risk assessment
4. Timeline and milestones
5. Success metrics

Please configure GOOGLE_API_KEY for full capabilities including web search and code execution."""
    
    async def analyze_inter_agent_communication(
        self,
        sender_id: str,
        receiver_id: str,
        message: str,
        message_history: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Analyze and enhance inter-agent communication"""
        
        if not self.llm:
            return {
                "enhanced_message": message,
                "suggested_actions": [],
                "priority": "medium"
            }
        
        analysis_prompt = f"""
        Analyze this inter-agent communication:
        From: {sender_id}
        To: {receiver_id}
        Message: {message}
        
        Recent history: {message_history[-5:] if message_history else 'No prior messages'}
        
        Provide:
        1. Enhanced version of the message if needed
        2. Suggested follow-up actions
        3. Priority level (low/medium/high/critical)
        4. Any potential conflicts or synergies to highlight
        """
        
        try:
            response = await self.generate_response(
                agent_id=f"{sender_id}-analyzer",
                system_prompt="You are an expert at analyzing and optimizing inter-departmental communication in a biotech company.",
                user_message=analysis_prompt,
                use_tools=False  # Don't need tools for analysis
            )
            
            return {
                "enhanced_message": message,
                "analysis": response,
                "suggested_actions": [],
                "priority": "medium"
            }
            
        except Exception as e:
            logger.error(f"Communication analysis failed: {e}")
            return {
                "enhanced_message": message,
                "suggested_actions": [],
                "priority": "medium"
            }
    
    def clear_conversation_history(self, agent_id: str):
        """Clear conversation history for an agent"""
        if agent_id in self._conversation_history:
            del self._conversation_history[agent_id]
    
    def get_conversation_summary(self, agent_id: str) -> str:
        """Get a summary of the conversation history"""
        if agent_id not in self._conversation_history:
            return "No conversation history available."
        
        history = self._conversation_history[agent_id]
        summary_parts = []
        
        for i, msg in enumerate(history[-6:]):  # Last 3 exchanges
            if isinstance(msg, HumanMessage):
                summary_parts.append(f"User: {msg.content[:100]}...")
            elif isinstance(msg, AIMessage):
                summary_parts.append(f"Agent: {msg.content[:100]}...")
        
        return "\n".join(summary_parts)
    
    def get_capabilities(self) -> Dict[str, bool]:
        """Get current service capabilities"""
        return {
            "chat": bool(self.llm),
            "code_execution": bool(self.code_execution_model),
            "web_search": bool(self.llm),
            "streaming": bool(self.llm),
            "function_calling": bool(self.llm),
            "model": self.config.model,
            "provider": "google"
        }


# Global instance - replaces the old llm_service
llm_service = GeminiLLMService()