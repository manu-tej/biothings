#!/usr/bin/env python3
"""
Migration script: Upgrade BioThings to Gemini 2.5
"""
import os
import sys
import asyncio
from pathlib import Path

# Add backend to path
sys.path.append(str(Path(__file__).parent.parent / "backend"))


async def migrate():
    """Run migration to Gemini 2.5"""
    print("🚀 Starting Gemini 2.5 Migration")
    print("=" * 50)
    
    # 1. Update environment
    print("\n1️⃣ Updating environment variables...")
    env_path = Path(__file__).parent.parent / "backend" / ".env"
    
    if env_path.exists():
        with open(env_path, 'r') as f:
            content = f.read()
        
        # Update model name
        content = content.replace('gemini-2.0-flash-exp', 'gemini-2.5-flash')
        
        # Add thinking budget if not present
        if 'GEMINI_THINKING_BUDGET' not in content:
            content += '\n# Thinking budget (0-24576 tokens)\nGEMINI_THINKING_BUDGET=8192\n'
        
        with open(env_path, 'w') as f:
            f.write(content)
        
        print("✅ Environment updated")
    
    # 2. Update LLM service
    print("\n2️⃣ Updating LLM service...")
    llm_path = Path(__file__).parent.parent / "backend" / "app" / "core" / "llm.py"
    
    if llm_path.exists():
        # Create enhanced version
        new_llm_content = '''"""
Google Gemini 2.5 LLM Service with Thinking Mode
"""
import os
import asyncio
from typing import Dict, List, Optional, Any
from datetime import datetime

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.schema import SystemMessage, HumanMessage, AIMessage
from langchain.memory import ConversationBufferMemory


class LLMService:
    """Enhanced Gemini 2.5 LLM Service with thinking capabilities"""
    
    def __init__(self):
        api_key = os.getenv("GOOGLE_API_KEY")
        model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
        thinking_budget = int(os.getenv("GEMINI_THINKING_BUDGET", "8192"))
        
        if not api_key:
            raise ValueError("GOOGLE_API_KEY environment variable not set")
        
        # Initialize Gemini 2.5 with thinking mode
        self.llm = ChatGoogleGenerativeAI(
            model=model,
            google_api_key=api_key,
            temperature=0.7,
            convert_system_message_to_human=True,
            model_kwargs={
                "thinking_budget": thinking_budget,
                "candidate_count": 1,
                "max_output_tokens": 8192,
            }
        )
        
        # Store conversation history
        self.conversations: Dict[str, List[Any]] = {}
        self.thinking_logs: Dict[str, List[str]] = {}
    
    async def generate_response(
        self,
        agent_id: str,
        system_prompt: str,
        user_message: str,
        context: Optional[Dict] = None,
        use_thinking: bool = True
    ) -> str:
        """Generate response with optional thinking mode"""
        
        # Get conversation history
        if agent_id not in self.conversations:
            self.conversations[agent_id] = []
        
        # Build messages
        messages = [SystemMessage(content=system_prompt)]
        
        # Add conversation history (last 10 messages)
        messages.extend(self.conversations[agent_id][-10:])
        
        # Add context if provided
        if context:
            context_msg = f"\\n\\nContext: {context}"
            messages.append(HumanMessage(content=context_msg))
        
        # Add user message
        messages.append(HumanMessage(content=user_message))
        
        try:
            # Generate response with thinking mode
            if use_thinking:
                response = await self.llm.ainvoke(
                    messages,
                    config={
                        "tags": [f"agent:{agent_id}", "thinking:enabled"],
                        "metadata": {"thinking_enabled": True}
                    }
                )
            else:
                # Fast mode without thinking
                fast_llm = ChatGoogleGenerativeAI(
                    model=os.getenv("GEMINI_MODEL", "gemini-2.5-flash"),
                    google_api_key=os.getenv("GOOGLE_API_KEY"),
                    temperature=0.7,
                    model_kwargs={"thinking_budget": 0}
                )
                response = await fast_llm.ainvoke(messages)
            
            # Store in history
            self.conversations[agent_id].append(HumanMessage(content=user_message))
            self.conversations[agent_id].append(response)
            
            # Log thinking process
            if use_thinking and agent_id not in self.thinking_logs:
                self.thinking_logs[agent_id] = []
            
            if use_thinking:
                self.thinking_logs[agent_id].append(
                    f"{datetime.now()}: Used thinking mode for: {user_message[:50]}..."
                )
            
            return response.content
            
        except Exception as e:
            print(f"Error generating response: {e}")
            return f"I apologize, but I encountered an error: {str(e)}"
    
    async def analyze_multimodal(
        self,
        agent_id: str,
        text: str,
        images: Optional[List[bytes]] = None,
        audio: Optional[bytes] = None
    ) -> Dict[str, Any]:
        """Analyze multimodal inputs using Gemini 2.5"""
        
        messages = []
        content = [{"type": "text", "text": text}]
        
        # Add images if provided
        if images:
            for img in images:
                content.append({
                    "type": "image_url",
                    "image_url": {"url": f"data:image/jpeg;base64,{img}"}
                })
        
        # Note: Audio support coming soon in Gemini 2.5
        if audio:
            print("Audio analysis will be available in next update")
        
        messages.append(HumanMessage(content=content))
        
        response = await self.llm.ainvoke(messages)
        
        return {
            "analysis": response.content,
            "modalities_analyzed": {
                "text": True,
                "images": len(images) if images else 0,
                "audio": bool(audio)
            }
        }
    
    def optimize_thinking_budget(self, complexity: str) -> int:
        """Dynamically adjust thinking budget based on task complexity"""
        budgets = {
            "simple": 0,      # No thinking needed
            "moderate": 4096, # Some reasoning
            "complex": 8192,  # Standard thinking
            "research": 16384, # Deep analysis
            "maximum": 24576  # Full capacity
        }
        return budgets.get(complexity, 8192)
    
    def get_usage_stats(self, agent_id: str) -> Dict[str, Any]:
        """Get usage statistics for cost tracking"""
        if agent_id not in self.conversations:
            return {"messages": 0, "thinking_uses": 0}
        
        return {
            "messages": len(self.conversations[agent_id]),
            "thinking_uses": len(self.thinking_logs.get(agent_id, [])),
            "estimated_cost": self._calculate_cost(agent_id)
        }
    
    def _calculate_cost(self, agent_id: str) -> float:
        """Calculate estimated cost based on usage"""
        # Gemini 2.5 Flash: $0.15/1M input, $0.60/1M output
        messages = len(self.conversations.get(agent_id, []))
        # Rough estimate: 500 tokens per message average
        total_tokens = messages * 500
        
        # 3:1 input/output ratio
        input_tokens = total_tokens * 0.75
        output_tokens = total_tokens * 0.25
        
        input_cost = (input_tokens / 1_000_000) * 0.15
        output_cost = (output_tokens / 1_000_000) * 0.60
        
        return round(input_cost + output_cost, 4)
    
    def clear_history(self, agent_id: str):
        """Clear conversation history for an agent"""
        if agent_id in self.conversations:
            self.conversations[agent_id] = []
        if agent_id in self.thinking_logs:
            self.thinking_logs[agent_id] = []


# Global instance
llm_service = LLMService()
'''
        
        with open(llm_path, 'w') as f:
            f.write(new_llm_content)
        
        print("✅ LLM service upgraded with thinking mode")
    
    # 3. Create test file
    print("\n3️⃣ Creating test file...")
    test_content = '''#!/usr/bin/env python3
"""
Test Gemini 2.5 Features
"""
import asyncio
import sys
import os
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent / "backend"))
os.environ["GOOGLE_API_KEY"] = os.getenv("GOOGLE_API_KEY", "")

from app.core.llm import llm_service


async def test_thinking_mode():
    """Test thinking mode capabilities"""
    print("🧠 Testing Gemini 2.5 Thinking Mode")
    print("=" * 50)
    
    # Test 1: Simple query (no thinking)
    print("\\n1️⃣ Simple Query (no thinking)")
    response = await llm_service.generate_response(
        agent_id="test",
        system_prompt="You are a helpful assistant.",
        user_message="What is 2+2?",
        use_thinking=False
    )
    print(f"Response: {response}")
    
    # Test 2: Complex reasoning (with thinking)
    print("\\n2️⃣ Complex Reasoning (with thinking)")
    response = await llm_service.generate_response(
        agent_id="test",
        system_prompt="You are a biotech research scientist.",
        user_message="Design a CRISPR experiment to knock out the p53 gene in HeLa cells. Include all controls.",
        use_thinking=True
    )
    print(f"Response: {response[:200]}...")
    
    # Test 3: Multi-step problem
    print("\\n3️⃣ Multi-step Problem Solving")
    response = await llm_service.generate_response(
        agent_id="test",
        system_prompt="You are a drug discovery expert.",
        user_message="How would you design a screening campaign for COVID-19 protease inhibitors? Include compound selection, assay design, and hit validation.",
        use_thinking=True
    )
    print(f"Response: {response[:200]}...")
    
    # Show stats
    stats = llm_service.get_usage_stats("test")
    print(f"\\n📊 Usage Stats: {stats}")


async def test_budget_optimization():
    """Test dynamic thinking budget"""
    print("\\n💡 Testing Budget Optimization")
    print("=" * 50)
    
    tasks = [
        ("What is water?", "simple"),
        ("Explain CRISPR", "moderate"),
        ("Design a CAR-T therapy", "complex"),
        ("Review 50 papers on gene therapy", "research")
    ]
    
    for task, complexity in tasks:
        budget = llm_service.optimize_thinking_budget(complexity)
        print(f"\\nTask: {task}")
        print(f"Complexity: {complexity}")
        print(f"Thinking budget: {budget} tokens")


if __name__ == "__main__":
    print("🚀 Gemini 2.5 Feature Test")
    print("=" * 50)
    
    if not os.getenv("GOOGLE_API_KEY"):
        print("❌ Please set GOOGLE_API_KEY environment variable")
        sys.exit(1)
    
    asyncio.run(test_thinking_mode())
    asyncio.run(test_budget_optimization())
'''
    
    test_path = Path(__file__).parent.parent / "test_gemini_25_features.py"
    with open(test_path, 'w') as f:
        f.write(test_content)
    
    os.chmod(test_path, 0o755)
    print("✅ Test file created")
    
    # 4. Update requirements
    print("\n4️⃣ Updating requirements...")
    req_path = Path(__file__).parent.parent / "backend" / "requirements.txt"
    
    if req_path.exists():
        with open(req_path, 'r') as f:
            requirements = f.read()
        
        # Add new dependencies
        new_deps = [
            "# Vector Database",
            "pinecone-client==3.2.2",
            "weaviate-client==4.5.6",
            "",
            "# Streaming & Real-time",
            "aiokafka==0.10.0",
            "",
            "# Lab Equipment APIs (optional)",
            "# illumina-api-client",
            "# thermofisher-sdk",
        ]
        
        if "pinecone-client" not in requirements:
            requirements += "\n" + "\n".join(new_deps)
            
            with open(req_path, 'w') as f:
                f.write(requirements)
            
            print("✅ Requirements updated")
    
    print("\n✅ Migration complete!")
    print("\n📝 Next steps:")
    print("1. Update your GOOGLE_API_KEY in backend/.env")
    print("2. Run: pip install -r backend/requirements.txt")
    print("3. Test: python test_gemini_25_features.py")
    print("4. Start server: cd backend && python -m app.main")


if __name__ == "__main__":
    asyncio.run(migrate())