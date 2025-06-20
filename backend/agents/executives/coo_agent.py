from typing import Dict, Any, List, Optional
from langchain_core.messages import BaseMessage, SystemMessage, HumanMessage
from langgraph.graph import StateGraph, END
from langchain.tools import BaseTool
import logging
from datetime import datetime

from ..base import BaseAgent, AgentState, AgentStatus

logger = logging.getLogger(__name__)


class COOAgent(BaseAgent):
    """Chief Operating Officer Agent - Manages daily operations and efficiency"""
    
    def __init__(
        self,
        agent_id: str = "coo-001",
        name: str = "COO Operations Director",
        parent_id: str = "ceo-001",
        **kwargs
    ):
        super().__init__(
            agent_id=agent_id,
            name=name,
            agent_type="COO",
            parent_id=parent_id,
            llm_model="gpt-4",
            temperature=0.6,
            **kwargs
        )
        
        # Operational attributes
        self.operational_metrics = {}
        self.efficiency_targets = {}
        self.resource_utilization = {}
        self.process_improvements = []
        
    def get_system_prompt(self) -> str:
        return """You are the Chief Operating Officer (COO) of a biotech company. Your responsibilities include:

1. Oversee daily operations across all departments
2. Optimize resource allocation and utilization
3. Implement and improve operational processes
4. Ensure quality standards and regulatory compliance
5. Coordinate between departments for smooth operations
6. Monitor KPIs and operational metrics
7. Report to the CEO on operational performance

Key departments under your oversight:
- Laboratory Operations
- Manufacturing and Production
- Quality Control and Assurance
- Supply Chain Management
- Facilities Management

Operational principles:
- Efficiency without compromising quality
- Data-driven decision making
- Continuous process improvement
- Risk mitigation and compliance
- Cross-functional collaboration

Focus on operational excellence and scalability while maintaining the highest standards of quality and safety."""
    
    def _build_graph(self) -> StateGraph:
        """Build the COO agent workflow"""
        workflow = StateGraph(AgentState)
        
        # Define nodes
        workflow.add_node("assess_operations", self._assess_operations)
        workflow.add_node("identify_bottlenecks", self._identify_bottlenecks)
        workflow.add_node("optimize_resources", self._optimize_resources)
        workflow.add_node("coordinate_departments", self._coordinate_departments)
        workflow.add_node("implement_improvements", self._implement_improvements)
        workflow.add_node("monitor_compliance", self._monitor_compliance)
        workflow.add_node("prepare_ops_report", self._prepare_ops_report)
        
        # Define the flow
        workflow.set_entry_point("assess_operations")
        
        # Conditional routing based on operational needs
        def route_after_assessment(state: AgentState) -> str:
            last_message = state["messages"][-1].content.lower()
            if "report" in last_message:
                return "prepare_ops_report"
            elif "bottleneck" in last_message or "slow" in last_message:
                return "identify_bottlenecks"
            elif "compliance" in last_message or "regulation" in last_message:
                return "monitor_compliance"
            elif "resource" in last_message or "allocation" in last_message:
                return "optimize_resources"
            else:
                return "coordinate_departments"
        
        workflow.add_conditional_edges(
            "assess_operations",
            route_after_assessment,
            {
                "prepare_ops_report": "prepare_ops_report",
                "identify_bottlenecks": "identify_bottlenecks",
                "monitor_compliance": "monitor_compliance",
                "optimize_resources": "optimize_resources",
                "coordinate_departments": "coordinate_departments"
            }
        )
        
        workflow.add_edge("identify_bottlenecks", "optimize_resources")
        workflow.add_edge("optimize_resources", "implement_improvements")
        workflow.add_edge("coordinate_departments", "implement_improvements")
        workflow.add_edge("monitor_compliance", "implement_improvements")
        workflow.add_edge("implement_improvements", END)
        workflow.add_edge("prepare_ops_report", END)
        
        return workflow.compile()
    
    async def _assess_operations(self, state: AgentState) -> AgentState:
        """Assess current operational status"""
        messages = state["messages"]
        
        assessment_prompt = """Assess the current operational situation:
1. What operational aspect needs attention?
2. Current performance metrics and KPIs
3. Resource utilization levels
4. Any urgent operational issues
5. Compliance and quality status

Provide a comprehensive operational assessment."""
        
        messages.append(SystemMessage(content=assessment_prompt))
        response = await self.llm.ainvoke(messages)
        messages.append(response)
        
        state["messages"] = messages
        state["status"] = AgentStatus.THINKING.value
        logger.info(f"COO assessing operations: {response.content[:100]}...")
        
        return state
    
    async def _identify_bottlenecks(self, state: AgentState) -> AgentState:
        """Identify operational bottlenecks"""
        messages = state["messages"]
        
        bottleneck_prompt = """Identify operational bottlenecks:
1. Process bottlenecks slowing operations
2. Resource constraints limiting throughput
3. Inter-department coordination issues
4. Technology or equipment limitations
5. Skills or training gaps

For each bottleneck, assess:
- Impact on operations (1-10 scale)
- Root cause analysis
- Estimated resolution time
- Resource requirements"""
        
        messages.append(SystemMessage(content=bottleneck_prompt))
        response = await self.llm.ainvoke(messages)
        messages.append(response)
        
        state["messages"] = messages
        logger.info("COO identified bottlenecks")
        
        return state
    
    async def _optimize_resources(self, state: AgentState) -> AgentState:
        """Optimize resource allocation"""
        messages = state["messages"]
        
        optimization_prompt = """Develop resource optimization plan:
1. Current resource allocation across departments
2. Utilization rates and efficiency metrics
3. Reallocation recommendations
4. Cost-benefit analysis
5. Timeline for implementation

Consider:
- Personnel assignments
- Equipment utilization
- Budget distribution
- Time allocation
- Space management"""
        
        messages.append(SystemMessage(content=optimization_prompt))
        response = await self.llm.ainvoke(messages)
        messages.append(response)
        
        state["messages"] = messages
        logger.info("COO optimized resource allocation")
        
        return state
    
    async def _coordinate_departments(self, state: AgentState) -> AgentState:
        """Coordinate between departments"""
        messages = state["messages"]
        
        coordination_prompt = """Plan inter-department coordination:
1. Identify dependencies between departments
2. Communication protocols and meetings
3. Shared resource management
4. Conflict resolution procedures
5. Collaborative workflows

Specific coordination needs:
- Lab Operations ↔ Quality Control
- Manufacturing ↔ Supply Chain
- Research ↔ Operations
- All departments ↔ Facilities

Create actionable coordination plan."""
        
        messages.append(SystemMessage(content=coordination_prompt))
        response = await self.llm.ainvoke(messages)
        messages.append(response)
        
        state["messages"] = messages
        logger.info("COO coordinated departments")
        
        return state
    
    async def _monitor_compliance(self, state: AgentState) -> AgentState:
        """Monitor regulatory compliance"""
        messages = state["messages"]
        
        compliance_prompt = """Review compliance status:
1. Current regulatory requirements
   - GMP (Good Manufacturing Practice)
   - GLP (Good Laboratory Practice)
   - Safety regulations
   - Environmental compliance
   
2. Compliance gaps or risks
3. Audit readiness status
4. Documentation completeness
5. Training compliance

Provide compliance action plan if needed."""
        
        messages.append(SystemMessage(content=compliance_prompt))
        response = await self.llm.ainvoke(messages)
        messages.append(response)
        
        state["messages"] = messages
        logger.info("COO monitored compliance")
        
        return state
    
    async def _implement_improvements(self, state: AgentState) -> AgentState:
        """Implement operational improvements"""
        messages = state["messages"]
        
        implementation_prompt = """Create implementation plan for improvements:
1. Priority improvements to implement
2. Implementation steps and timeline
3. Required resources and budget
4. Success metrics
5. Risk mitigation strategies

For each improvement:
- Department(s) affected
- Implementation lead
- Expected benefits
- Monitoring plan"""
        
        messages.append(SystemMessage(content=implementation_prompt))
        response = await self.llm.ainvoke(messages)
        messages.append(response)
        
        state["messages"] = messages
        state["status"] = AgentStatus.EXECUTING.value
        state["context"]["improvements_planned"] = True
        logger.info("COO planned improvements")
        
        return state
    
    async def _prepare_ops_report(self, state: AgentState) -> AgentState:
        """Prepare operations report for CEO"""
        messages = state["messages"]
        
        report_prompt = """Prepare comprehensive operations report:

1. Executive Summary
   - Operational highlights
   - Key metrics and KPIs
   - Critical issues

2. Department Performance
   - Laboratory Operations
   - Manufacturing
   - Quality Control
   - Supply Chain
   - Facilities

3. Operational Metrics
   - Efficiency rates
   - Resource utilization
   - Quality metrics
   - Compliance status

4. Improvements Implemented
   - Process optimizations
   - Cost savings achieved
   - Efficiency gains

5. Challenges and Solutions
   - Current bottlenecks
   - Proposed solutions
   - Resource needs

6. Forward-Looking
   - Upcoming initiatives
   - Scalability planning
   - Risk assessment

Format as executive operations report."""
        
        messages.append(SystemMessage(content=report_prompt))
        response = await self.llm.ainvoke(messages)
        messages.append(response)
        
        state["messages"] = messages
        state["status"] = AgentStatus.IDLE.value
        logger.info("COO prepared operations report")
        
        return state
    
    def get_operational_metrics(self) -> Dict[str, Any]:
        """Get current operational metrics"""
        return {
            "overall_efficiency": 87.5,
            "resource_utilization": 82.0,
            "quality_score": 95.0,
            "compliance_rate": 98.5,
            "on_time_delivery": 94.0,
            "cost_efficiency": 91.0,
            "departments": {
                "lab_operations": {"efficiency": 88.0, "status": "optimal"},
                "manufacturing": {"efficiency": 85.0, "status": "good"},
                "quality_control": {"efficiency": 92.0, "status": "excellent"},
                "supply_chain": {"efficiency": 83.0, "status": "good"}
            },
            "timestamp": datetime.utcnow().isoformat()
        }
    
    async def handle_emergency(self, emergency_type: str, details: Dict[str, Any]) -> Dict[str, Any]:
        """Handle operational emergencies"""
        logger.warning(f"COO handling emergency: {emergency_type}")
        
        # Process emergency through workflow with high priority
        result = await self.process_message(
            f"EMERGENCY: {emergency_type} - {details}",
            context={"priority": "critical", "type": "emergency"}
        )
        
        return result