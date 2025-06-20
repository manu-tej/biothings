"""
Base Agent for BioThings Executive AI
Clean, simplified implementation
"""
from typing import Dict, Any, Optional, List
from datetime import datetime
from abc import ABC, abstractmethod
from app.core.llm import llm_service
from app.core.messaging import message_broker


class BaseAgent(ABC):
    """Base class for all executive agents"""
    
    def __init__(self, agent_type: str):
        self.agent_id = f"{agent_type.lower()}_agent"
        self.agent_type = agent_type
        self.system_prompt = self._get_system_prompt()
        self.active_tasks = []
        
    @abstractmethod
    def _get_system_prompt(self) -> str:
        """Each agent must define their system prompt"""
        pass
    
    async def process_task(self, task: str, context: Optional[Dict] = None) -> Dict[str, Any]:
        """Process a task using the agent's expertise"""
        try:
            # Build comprehensive prompt
            prompt = f"""
Task: {task}

Context: {context or 'No additional context provided'}

Please provide:
1. Analysis of the task
2. Recommended approach
3. Specific actions to take
4. Success criteria
5. Potential risks and mitigation

Be specific and actionable in your response.
"""
            
            # Get AI response
            response = await llm_service.generate_response(
                agent_id=self.agent_id,
                system_prompt=self.system_prompt,
                user_message=prompt,
                context=context,
                use_thinking=self._is_complex_task(task)
            )
            
            # Track task
            task_record = {
                "task": task,
                "response": response,
                "timestamp": datetime.utcnow().isoformat(),
                "context": context
            }
            self.active_tasks.append(task_record)
            
            # Broadcast update
            if message_broker:
                await message_broker.publish(
                    "agent.update",
                    {
                        "agent_id": self.agent_id,
                        "agent_type": self.agent_type,
                        "task": task,
                        "status": "completed"
                    }
                )
            
            return {
                "success": True,
                "agent_id": self.agent_id,
                "task": task,
                "response": response,
                "timestamp": task_record["timestamp"]
            }
            
        except Exception as e:
            return {
                "success": False,
                "agent_id": self.agent_id,
                "task": task,
                "error": str(e)
            }
    
    async def collaborate(self, target_agent: str, message: str) -> Dict[str, Any]:
        """Send a message to another agent"""
        try:
            # Format inter-agent communication
            collab_prompt = f"""
Format this message for professional inter-department communication:

To: {target_agent}
Message: {message}

Make it clear, actionable, and professional.
"""
            
            formatted_message = await llm_service.generate_response(
                agent_id=self.agent_id,
                system_prompt=self.system_prompt,
                user_message=collab_prompt,
                use_thinking=False  # Simple formatting task
            )
            
            # Send through message broker
            if message_broker:
                await message_broker.publish(
                    f"agent.message.{target_agent}",
                    {
                        "from": self.agent_id,
                        "to": target_agent,
                        "message": formatted_message,
                        "timestamp": datetime.utcnow().isoformat()
                    }
                )
            
            return {
                "success": True,
                "message": formatted_message,
                "to": target_agent
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    def _is_complex_task(self, task: str) -> bool:
        """Determine if a task requires deep thinking"""
        complex_indicators = [
            "strategy", "analyze", "design", "optimize",
            "plan", "research", "evaluate", "complex"
        ]
        task_lower = task.lower()
        return any(indicator in task_lower for indicator in complex_indicators)
    
    def get_status(self) -> Dict[str, Any]:
        """Get current agent status"""
        return {
            "agent_id": self.agent_id,
            "agent_type": self.agent_type,
            "active": True,
            "tasks_completed": len(self.active_tasks),
            "last_task": self.active_tasks[-1] if self.active_tasks else None
        }
    
    def clear_history(self):
        """Clear task history"""
        self.active_tasks = []
        llm_service.clear_history(self.agent_id)