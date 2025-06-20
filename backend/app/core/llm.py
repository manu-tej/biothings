"""
LLM Integration Service for Agent Intelligence
"""
import os
from typing import Dict, List, Optional, Any
from enum import Enum
import asyncio
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic
from langchain.schema import HumanMessage, SystemMessage, AIMessage
from langchain.callbacks.base import AsyncCallbackHandler
from pydantic import BaseModel, Field
import structlog

logger = structlog.get_logger()


class LLMProvider(str, Enum):
    OPENAI = "openai"
    ANTHROPIC = "anthropic"


class LLMConfig(BaseModel):
    provider: LLMProvider = Field(default=LLMProvider.OPENAI)
    model: str = Field(default="gpt-4-turbo-preview")
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    max_tokens: int = Field(default=4000)
    api_key: Optional[str] = None


class StreamingCallbackHandler(AsyncCallbackHandler):
    """Handler for streaming LLM responses"""
    
    def __init__(self, agent_id: str, callback_func):
        self.agent_id = agent_id
        self.callback_func = callback_func
        self.accumulated_text = ""
    
    async def on_llm_new_token(self, token: str, **kwargs) -> None:
        self.accumulated_text += token
        await self.callback_func(self.agent_id, token, self.accumulated_text)


class LLMService:
    """Service for managing LLM interactions"""
    
    def __init__(self):
        self.config = self._load_config()
        self.llm = self._initialize_llm()
        self._conversation_history: Dict[str, List[Any]] = {}
    
    def _load_config(self) -> LLMConfig:
        """Load LLM configuration from environment"""
        provider = os.getenv("LLM_PROVIDER", "openai")
        
        if provider == "openai":
            api_key = os.getenv("OPENAI_API_KEY")
            model = os.getenv("LLM_MODEL", "gpt-4-turbo-preview")
        else:
            api_key = os.getenv("ANTHROPIC_API_KEY")
            model = os.getenv("LLM_MODEL", "claude-3-opus-20240229")
        
        return LLMConfig(
            provider=LLMProvider(provider),
            model=model,
            temperature=float(os.getenv("LLM_TEMPERATURE", "0.7")),
            max_tokens=int(os.getenv("LLM_MAX_TOKENS", "4000")),
            api_key=api_key
        )
    
    def _initialize_llm(self):
        """Initialize the LLM based on provider"""
        if not self.config.api_key:
            logger.warning(f"No API key found for {self.config.provider}. Using mock mode.")
            return None
        
        if self.config.provider == LLMProvider.OPENAI:
            return ChatOpenAI(
                model=self.config.model,
                temperature=self.config.temperature,
                max_tokens=self.config.max_tokens,
                api_key=self.config.api_key,
                streaming=True
            )
        else:
            return ChatAnthropic(
                model=self.config.model,
                temperature=self.config.temperature,
                max_tokens=self.config.max_tokens,
                api_key=self.config.api_key,
                streaming=True
            )
    
    async def generate_response(
        self,
        agent_id: str,
        system_prompt: str,
        user_message: str,
        context: Optional[Dict[str, Any]] = None,
        streaming_callback=None
    ) -> str:
        """Generate LLM response for an agent"""
        
        # Use mock response if no LLM configured
        if not self.llm:
            return await self._generate_mock_response(agent_id, user_message)
        
        try:
            # Build messages
            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=self._build_context_message(user_message, context))
            ]
            
            # Add conversation history if exists
            if agent_id in self._conversation_history:
                messages[1:1] = self._conversation_history[agent_id][-10:]  # Last 10 messages
            
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
            logger.error(f"LLM generation failed: {e}", agent_id=agent_id)
            return await self._generate_mock_response(agent_id, user_message)
    
    def _build_context_message(self, user_message: str, context: Optional[Dict[str, Any]]) -> str:
        """Build message with context"""
        if not context:
            return user_message
        
        context_parts = [f"{k}: {v}" for k, v in context.items()]
        return f"{user_message}\n\nContext:\n" + "\n".join(context_parts)
    
    async def _generate_mock_response(self, agent_id: str, message: str) -> str:
        """Generate mock response when LLM is not available"""
        mock_responses = {
            "CEO": "Based on our strategic analysis, I recommend we proceed with the proposed initiative. This aligns with our company vision and has strong potential for ROI.",
            "COO": "I've reviewed the operational requirements. We can implement this with our current resources, though we'll need to optimize our workflow processes.",
            "CSO": "From a scientific perspective, this approach is sound. The methodology follows best practices and we have the necessary expertise on the team.",
            "CFO": "The financial projections look promising. With proper budget allocation and cost controls, we can achieve a 15-20% margin on this project.",
            "CTO": "The technical infrastructure can support this. I recommend we use a phased rollout approach to minimize risk and ensure system stability."
        }
        
        agent_type = agent_id.split("-")[0].upper()
        base_response = mock_responses.get(agent_type, "I've analyzed the situation and recommend we proceed cautiously.")
        
        return f"{base_response}\n\nRegarding '{message}': This requires further analysis, but initial assessment is positive."
    
    async def analyze_inter_agent_communication(
        self,
        sender_id: str,
        receiver_id: str,
        message: str,
        message_history: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Analyze and potentially enhance inter-agent communication"""
        
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
                user_message=analysis_prompt
            )
            
            # Parse response (in production, use structured output)
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


# Global instance
llm_service = LLMService()