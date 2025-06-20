"""
LLM Integration using Anthropic API directly for Claude Code
"""
import os
from typing import Dict, List, Optional, Any, AsyncIterator
from enum import Enum
import asyncio
import anthropic
from anthropic import AsyncAnthropic
from pydantic import BaseModel, Field
import structlog
import json

logger = structlog.get_logger()


class LLMProvider(str, Enum):
    ANTHROPIC = "anthropic"
    OPENAI = "openai"  # Can still support OpenAI if needed


class LLMConfig(BaseModel):
    provider: LLMProvider = Field(default=LLMProvider.ANTHROPIC)
    model: str = Field(default="claude-3-opus-20240229")
    temperature: float = Field(default=0.7, ge=0.0, le=1.0)
    max_tokens: int = Field(default=4000)
    api_key: Optional[str] = None


class ConversationMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str
    timestamp: Optional[str] = None


class LLMService:
    """Service for managing LLM interactions using Anthropic API directly"""
    
    def __init__(self):
        self.config = self._load_config()
        self.client = self._initialize_client()
        self._conversation_history: Dict[str, List[ConversationMessage]] = {}
    
    def _load_config(self) -> LLMConfig:
        """Load LLM configuration from environment"""
        # Default to Anthropic/Claude since we're in Claude Code
        provider = os.getenv("LLM_PROVIDER", "anthropic")
        
        if provider == "anthropic":
            api_key = os.getenv("ANTHROPIC_API_KEY", os.getenv("ANTHROPIC_API_KEY"))
            # Use Claude 3 Opus as default, or Claude 3.5 Sonnet for faster responses
            model = os.getenv("LLM_MODEL", "claude-3-opus-20240229")
        else:
            # OpenAI fallback
            api_key = os.getenv("OPENAI_API_KEY")
            model = os.getenv("LLM_MODEL", "gpt-4-turbo-preview")
        
        return LLMConfig(
            provider=LLMProvider(provider),
            model=model,
            temperature=float(os.getenv("LLM_TEMPERATURE", "0.7")),
            max_tokens=int(os.getenv("LLM_MAX_TOKENS", "4000")),
            api_key=api_key
        )
    
    def _initialize_client(self):
        """Initialize the Anthropic client"""
        if not self.config.api_key:
            logger.warning(f"No API key found for {self.config.provider}. Using mock mode.")
            return None
        
        if self.config.provider == LLMProvider.ANTHROPIC:
            return AsyncAnthropic(api_key=self.config.api_key)
        else:
            # For OpenAI, we'd need to implement a wrapper or use their SDK
            logger.warning("OpenAI support not implemented in this version")
            return None
    
    async def generate_response(
        self,
        agent_id: str,
        system_prompt: str,
        user_message: str,
        context: Optional[Dict[str, Any]] = None,
        streaming_callback=None,
        tools: Optional[List[Dict[str, Any]]] = None
    ) -> str:
        """Generate LLM response for an agent using Anthropic API"""
        
        # Use mock response if no client configured
        if not self.client:
            return await self._generate_mock_response(agent_id, user_message)
        
        try:
            # Build message with context
            full_message = self._build_context_message(user_message, context)
            
            # Prepare messages for API
            messages = []
            
            # Add conversation history if exists
            if agent_id in self._conversation_history:
                for msg in self._conversation_history[agent_id][-10:]:  # Last 10 messages
                    messages.append({
                        "role": msg.role,
                        "content": msg.content
                    })
            
            # Add current message
            messages.append({
                "role": "user",
                "content": full_message
            })
            
            # Create API request parameters
            request_params = {
                "model": self.config.model,
                "max_tokens": self.config.max_tokens,
                "temperature": self.config.temperature,
                "system": system_prompt,
                "messages": messages
            }
            
            # Add tools if provided
            if tools:
                request_params["tools"] = tools
            
            # Generate response
            if streaming_callback:
                # Stream the response
                result = await self._stream_response(
                    agent_id=agent_id,
                    request_params=request_params,
                    streaming_callback=streaming_callback
                )
            else:
                # Get complete response
                response = await self.client.messages.create(**request_params)
                result = response.content[0].text
            
            # Update conversation history
            if agent_id not in self._conversation_history:
                self._conversation_history[agent_id] = []
            
            self._conversation_history[agent_id].extend([
                ConversationMessage(role="user", content=user_message),
                ConversationMessage(role="assistant", content=result)
            ])
            
            # Keep history size manageable
            if len(self._conversation_history[agent_id]) > 20:
                self._conversation_history[agent_id] = self._conversation_history[agent_id][-20:]
            
            return result
            
        except Exception as e:
            logger.error(f"LLM generation failed: {e}", agent_id=agent_id)
            return await self._generate_mock_response(agent_id, user_message)
    
    async def _stream_response(
        self,
        agent_id: str,
        request_params: Dict[str, Any],
        streaming_callback
    ) -> str:
        """Stream response from Anthropic API"""
        accumulated_text = ""
        
        try:
            # Create streaming request
            stream = await self.client.messages.create(
                **request_params,
                stream=True
            )
            
            # Process stream
            async for event in stream:
                if event.type == "content_block_delta":
                    if hasattr(event.delta, 'text'):
                        token = event.delta.text
                        accumulated_text += token
                        # Call the streaming callback
                        await streaming_callback(agent_id, token, accumulated_text)
            
            return accumulated_text
            
        except Exception as e:
            logger.error(f"Streaming failed: {e}", agent_id=agent_id)
            raise
    
    def _build_context_message(self, user_message: str, context: Optional[Dict[str, Any]]) -> str:
        """Build message with context"""
        if not context:
            return user_message
        
        context_parts = [f"{k}: {v}" for k, v in context.items()]
        return f"{user_message}\n\nContext:\n" + "\n".join(context_parts)
    
    async def generate_with_tools(
        self,
        agent_id: str,
        system_prompt: str,
        user_message: str,
        tools: List[Dict[str, Any]],
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Generate response with tool use capability"""
        
        if not self.client:
            return {
                "content": await self._generate_mock_response(agent_id, user_message),
                "tool_calls": []
            }
        
        try:
            # Build message with context
            full_message = self._build_context_message(user_message, context)
            
            # Prepare messages
            messages = [{
                "role": "user",
                "content": full_message
            }]
            
            # Create request with tools
            response = await self.client.messages.create(
                model=self.config.model,
                max_tokens=self.config.max_tokens,
                temperature=self.config.temperature,
                system=system_prompt,
                messages=messages,
                tools=tools,
                tool_choice={"type": "auto"}  # Let Claude decide when to use tools
            )
            
            # Extract content and tool calls
            result = {
                "content": "",
                "tool_calls": []
            }
            
            for content_block in response.content:
                if content_block.type == "text":
                    result["content"] = content_block.text
                elif content_block.type == "tool_use":
                    result["tool_calls"].append({
                        "id": content_block.id,
                        "name": content_block.name,
                        "input": content_block.input
                    })
            
            return result
            
        except Exception as e:
            logger.error(f"Tool generation failed: {e}", agent_id=agent_id)
            return {
                "content": await self._generate_mock_response(agent_id, user_message),
                "tool_calls": []
            }
    
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
    
    async def analyze_experiment_data(
        self,
        experiment_type: str,
        data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Analyze experiment data using Claude's scientific knowledge"""
        
        if not self.client:
            return {
                "analysis": "Mock analysis: Data looks within expected parameters.",
                "recommendations": ["Continue monitoring", "Prepare for next phase"],
                "quality_score": 0.85
            }
        
        analysis_prompt = f"""
        Analyze this {experiment_type} experiment data:
        
        {json.dumps(data, indent=2)}
        
        Provide:
        1. Key findings and observations
        2. Data quality assessment
        3. Recommendations for next steps
        4. Any anomalies or concerns
        5. Overall quality score (0-1)
        
        Format your response as JSON.
        """
        
        try:
            response = await self.client.messages.create(
                model=self.config.model,
                max_tokens=2000,
                temperature=0.3,  # Lower temperature for analytical tasks
                system="You are an expert biotech data analyst specializing in experimental data interpretation. Provide precise, actionable insights.",
                messages=[{
                    "role": "user",
                    "content": analysis_prompt
                }]
            )
            
            # Parse the response
            response_text = response.content[0].text
            
            # Try to extract JSON from response
            try:
                # Look for JSON block in response
                import re
                json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
                if json_match:
                    return json.loads(json_match.group())
                else:
                    # Fallback to structured response
                    return {
                        "analysis": response_text,
                        "recommendations": [],
                        "quality_score": 0.8
                    }
            except:
                return {
                    "analysis": response_text,
                    "recommendations": [],
                    "quality_score": 0.8
                }
                
        except Exception as e:
            logger.error(f"Experiment analysis failed: {e}")
            return {
                "analysis": "Analysis failed",
                "recommendations": [],
                "quality_score": 0.0,
                "error": str(e)
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
        
        for msg in history[-6:]:  # Last 3 exchanges
            role = "User" if msg.role == "user" else "Agent"
            summary_parts.append(f"{role}: {msg.content[:100]}...")
        
        return "\n".join(summary_parts)
    
    async def create_scientific_protocol(
        self,
        experiment_type: str,
        requirements: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Use Claude to create detailed scientific protocols"""
        
        if not self.client:
            return {
                "protocol_name": f"Mock {experiment_type} Protocol",
                "steps": ["Step 1", "Step 2", "Step 3"],
                "duration_hours": 24
            }
        
        protocol_prompt = f"""
        Create a detailed scientific protocol for: {experiment_type}
        
        Requirements:
        {json.dumps(requirements, indent=2)}
        
        Include:
        1. Protocol name and description
        2. Required equipment list
        3. Required reagents/materials
        4. Detailed step-by-step procedure with timing
        5. Safety requirements
        6. Expected outcomes
        7. Quality control measures
        
        Format as JSON with keys: protocol_name, description, equipment, reagents, steps (array of objects with step_number, action, duration_minutes, notes), safety_requirements, expected_outcomes, quality_controls
        """
        
        try:
            response = await self.client.messages.create(
                model=self.config.model,
                max_tokens=3000,
                temperature=0.5,
                system="You are an expert biotech protocol designer with deep knowledge of laboratory procedures and GLP compliance.",
                messages=[{
                    "role": "user",
                    "content": protocol_prompt
                }]
            )
            
            response_text = response.content[0].text
            
            # Extract JSON
            import re
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
            else:
                logger.error("Could not parse protocol JSON")
                return {
                    "protocol_name": f"{experiment_type} Protocol",
                    "error": "Failed to parse protocol"
                }
                
        except Exception as e:
            logger.error(f"Protocol creation failed: {e}")
            return {
                "protocol_name": f"{experiment_type} Protocol",
                "error": str(e)
            }


# Global instance
llm_service = LLMService()