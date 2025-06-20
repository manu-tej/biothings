"""
Google Gemini 2.5 LLM Service
Clean, production-ready implementation
"""
import os
from typing import Dict, List, Optional
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.schema import SystemMessage, HumanMessage, AIMessage


class LLMService:
    """Gemini 2.5 LLM Service with optimized thinking mode"""
    
    def __init__(self):
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise ValueError("GOOGLE_API_KEY environment variable not set")
        
        # Initialize Gemini 2.5 Flash
        self.model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
        self.thinking_budget = int(os.getenv("GEMINI_THINKING_BUDGET", "8192"))
        
        self.llm = ChatGoogleGenerativeAI(
            model=self.model,
            google_api_key=api_key,
            temperature=0.7,
            convert_system_message_to_human=True,
            max_output_tokens=8192,
        )
        
        # Conversation memory (limited to prevent memory bloat)
        self.conversations: Dict[str, List] = {}
        self.max_history = 20  # Keep last 20 messages per agent
    
    async def generate_response(
        self,
        agent_id: str,
        system_prompt: str,
        user_message: str,
        context: Optional[Dict] = None,
        use_thinking: bool = True
    ) -> str:
        """Generate AI response with optional thinking mode"""
        
        # Initialize conversation if needed
        if agent_id not in self.conversations:
            self.conversations[agent_id] = []
        
        # Build message list
        messages = [SystemMessage(content=system_prompt)]
        
        # Add conversation history (last 10 messages)
        messages.extend(self.conversations[agent_id][-10:])
        
        # Add context if provided
        if context:
            context_msg = f"\n\nContext: {context}"
            user_message = f"{user_message}{context_msg}"
        
        # Add current message
        messages.append(HumanMessage(content=user_message))
        
        try:
            # Configure thinking based on complexity
            if use_thinking and self._needs_thinking(user_message):
                # Use thinking mode for complex queries
                config = {
                    "model_kwargs": {
                        "thinking_budget": self.thinking_budget
                    }
                }
                response = await self.llm.ainvoke(messages, config=config)
            else:
                # Fast mode for simple queries
                response = await self.llm.ainvoke(messages)
            
            # Store in history
            self.conversations[agent_id].extend([
                HumanMessage(content=user_message),
                response
            ])
            
            # Keep history manageable
            if len(self.conversations[agent_id]) > self.max_history:
                self.conversations[agent_id] = self.conversations[agent_id][-self.max_history:]
            
            return response.content
            
        except Exception as e:
            print(f"LLM Error: {e}")
            return f"I apologize, but I encountered an error: {str(e)}"
    
    def _needs_thinking(self, message: str) -> bool:
        """Determine if a query needs thinking mode"""
        thinking_keywords = [
            "design", "analyze", "optimize", "plan", "strategy",
            "complex", "protocol", "experiment", "research", "discover",
            "why", "how", "explain", "compare", "evaluate"
        ]
        message_lower = message.lower()
        return any(keyword in message_lower for keyword in thinking_keywords)
    
    def clear_history(self, agent_id: str):
        """Clear conversation history for an agent"""
        if agent_id in self.conversations:
            self.conversations[agent_id] = []
    
    def get_usage_stats(self, agent_id: str) -> Dict[str, float]:
        """Get usage statistics"""
        if agent_id not in self.conversations:
            return {"messages": 0, "estimated_cost": 0.0}
        
        message_count = len(self.conversations[agent_id])
        # Rough estimate: 150 tokens per message average
        avg_tokens = 150
        total_tokens = message_count * avg_tokens
        
        # Gemini 2.5 Flash pricing: $0.15/1M input, $0.60/1M output
        # Assume 3:1 input/output ratio
        input_tokens = total_tokens * 0.75
        output_tokens = total_tokens * 0.25
        
        input_cost = (input_tokens / 1_000_000) * 0.15
        output_cost = (output_tokens / 1_000_000) * 0.60
        
        return {
            "messages": message_count,
            "estimated_tokens": total_tokens,
            "estimated_cost": round(input_cost + output_cost, 4)
        }


# Global instance
llm_service = LLMService()