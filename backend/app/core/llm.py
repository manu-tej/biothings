"""
LLM Service - Google Gemini Only
"""
import os
from typing import Dict, List, Optional, Any
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.schema import HumanMessage, SystemMessage, AIMessage
import structlog

logger = structlog.get_logger()


class LLMService:
    """Simple Gemini-only LLM Service"""
    
    def __init__(self):
        api_key = os.getenv("GOOGLE_API_KEY")
        model = os.getenv("GEMINI_MODEL", "gemini-2.0-flash-exp")
        
        if api_key:
            self.llm = ChatGoogleGenerativeAI(
                model=model,
                google_api_key=api_key,
                temperature=0.7,
                convert_system_message_to_human=True
            )
        else:
            logger.warning("No GOOGLE_API_KEY found")
            self.llm = None
            
        self._history: Dict[str, List[Any]] = {}
    
    async def generate_response(
        self,
        agent_id: str,
        system_prompt: str,
        user_message: str,
        context: Optional[Dict[str, Any]] = None,
        streaming_callback=None
    ) -> str:
        """Generate response using Gemini"""
        
        if not self.llm:
            return f"Configure GOOGLE_API_KEY to enable {agent_id}"
        
        try:
            # Build message with context
            if context:
                context_str = "\n".join([f"{k}: {v}" for k, v in context.items()])
                user_message = f"{user_message}\n\nContext:\n{context_str}"
            
            # Build messages
            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=user_message)
            ]
            
            # Add history
            if agent_id in self._history:
                messages[1:1] = self._history[agent_id][-10:]
            
            # Generate response
            response = await self.llm.agenerate([messages])
            result = response.generations[0][0].text
            
            # Update history
            if agent_id not in self._history:
                self._history[agent_id] = []
            self._history[agent_id].extend([
                HumanMessage(content=user_message),
                AIMessage(content=result)
            ])
            
            return result
            
        except Exception as e:
            logger.error(f"Gemini error: {e}")
            return f"Error: {str(e)}"
    
    async def analyze_inter_agent_communication(
        self,
        sender_id: str,
        receiver_id: str,
        message: str,
        message_history: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Simple inter-agent analysis"""
        return {
            "enhanced_message": message,
            "suggested_actions": [],
            "priority": "medium"
        }
    
    def clear_conversation_history(self, agent_id: str):
        """Clear history"""
        if agent_id in self._history:
            del self._history[agent_id]
    
    def get_conversation_summary(self, agent_id: str) -> str:
        """Get summary"""
        if agent_id not in self._history:
            return "No history"
        return f"{len(self._history[agent_id])} messages in history"


# Global instance
llm_service = LLMService()