"""
Test script for inter-agent communication
Demonstrates agents communicating and delegating tasks
"""

import asyncio
import uuid
from datetime import datetime
import logging

from backend.services.communication import CommunicationService, AgentMessage
from backend.services.agent_registry import AgentRegistry
from backend.models.agent_models import AgentType, AgentStatus

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def simulate_agent_communication():
    """Simulate agent communication scenario"""
    
    # Initialize services
    comm_service = CommunicationService(redis_url="redis://localhost:6379")
    await comm_service.connect()
    
    registry = AgentRegistry()
    registry.communication = comm_service
    
    # Register some test agents
    ceo_id = "ceo-test-001"
    coo_id = "coo-test-001"
    cfo_id = "cfo-test-001"
    
    # Register CEO
    await registry.register_agent(ceo_id, {
        "name": "Test CEO",
        "agent_type": AgentType.EXECUTIVE.value,
        "department": "executive",
        "subordinates": [coo_id, cfo_id]
    })
    
    # Register COO
    await registry.register_agent(coo_id, {
        "name": "Test COO",
        "agent_type": AgentType.EXECUTIVE.value,
        "department": "operations",
        "reporting_to": ceo_id
    })
    
    # Register CFO
    await registry.register_agent(cfo_id, {
        "name": "Test CFO",
        "agent_type": AgentType.EXECUTIVE.value,
        "department": "finance",
        "reporting_to": ceo_id
    })
    
    logger.info("Agents registered successfully")
    
    # Simulate CEO sending a directive to COO
    directive_message = AgentMessage(
        message_id=str(uuid.uuid4()),
        sender_id=ceo_id,
        recipient_id=coo_id,
        message_type="command",
        payload={
            "command": "optimize_production",
            "parameters": {
                "target_efficiency": 0.95,
                "deadline": "2025-02-01"
            }
        },
        timestamp=datetime.utcnow().isoformat(),
        priority="high"
    )
    
    await comm_service.send_message(directive_message)
    logger.info(f"CEO sent directive to COO: {directive_message.payload['command']}")
    
    # Simulate COO querying CFO for budget
    budget_query = AgentMessage(
        message_id=str(uuid.uuid4()),
        sender_id=coo_id,
        recipient_id=cfo_id,
        message_type="query",
        payload={
            "query": "available_budget_for_production_optimization",
            "context": {
                "project": "efficiency_improvement",
                "estimated_cost": 250000
            }
        },
        timestamp=datetime.utcnow().isoformat(),
        correlation_id=str(uuid.uuid4())
    )
    
    await comm_service.send_message(budget_query)
    logger.info("COO queried CFO for budget information")
    
    # Simulate CFO response
    budget_response = AgentMessage(
        message_id=str(uuid.uuid4()),
        sender_id=cfo_id,
        recipient_id=coo_id,
        message_type="response",
        payload={
            "budget_available": True,
            "allocated_amount": 300000,
            "conditions": ["ROI > 20%", "Quarterly progress reports"]
        },
        timestamp=datetime.utcnow().isoformat(),
        correlation_id=budget_query.correlation_id
    )
    
    await comm_service.send_message(budget_response)
    logger.info("CFO responded with budget approval")
    
    # Simulate broadcast announcement
    announcement = AgentMessage(
        message_id=str(uuid.uuid4()),
        sender_id=ceo_id,
        recipient_id=None,  # Broadcast
        message_type="event",
        payload={
            "event": "strategic_initiative",
            "title": "Production Optimization Project",
            "description": "Company-wide efficiency improvement initiative",
            "start_date": "2025-02-01"
        },
        timestamp=datetime.utcnow().isoformat(),
        priority="high"
    )
    
    await comm_service.send_message(announcement)
    logger.info("CEO broadcast strategic initiative to all agents")
    
    # Get agent hierarchy
    hierarchy = await registry.get_agent_hierarchy()
    logger.info(f"Agent Hierarchy: {hierarchy}")
    
    # Get active agents
    active_agents = await registry.get_active_agents()
    logger.info(f"Active Agents: {len(active_agents)}")
    
    # Get message history
    messages = await comm_service.get_message_history(limit=10)
    logger.info(f"Recent Messages: {len(messages)}")
    
    # Cleanup
    await comm_service.disconnect()
    logger.info("Communication test completed")


async def test_redis_connection():
    """Test basic Redis connection"""
    try:
        import redis.asyncio as redis
        client = await redis.from_url("redis://localhost:6379")
        await client.ping()
        await client.close()
        logger.info("Redis connection successful")
        return True
    except Exception as e:
        logger.error(f"Redis connection failed: {e}")
        return False


async def main():
    """Main test function"""
    print("Testing Inter-Agent Communication System")
    print("=" * 50)
    
    # Test Redis connection first
    if not await test_redis_connection():
        print("\n❌ Redis is not running. Please start Redis first:")
        print("   brew services start redis  (on macOS)")
        print("   or")
        print("   redis-server  (direct command)")
        return
    
    print("\n✅ Redis connection successful")
    print("\nSimulating agent communication...")
    print("-" * 50)
    
    try:
        await simulate_agent_communication()
        print("\n✅ Communication test completed successfully!")
    except Exception as e:
        print(f"\n❌ Communication test failed: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())