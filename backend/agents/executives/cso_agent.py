from typing import Dict, Any, List, Optional
from langchain_core.messages import BaseMessage, SystemMessage, HumanMessage
from langgraph.graph import StateGraph, END
from langchain.tools import BaseTool
import logging
from datetime import datetime

from ..base import BaseAgent, AgentState, AgentStatus

logger = logging.getLogger(__name__)


class CSOAgent(BaseAgent):
    """Chief Scientific Officer Agent - Leads research and development"""
    
    def __init__(
        self,
        agent_id: str = "cso-001",
        name: str = "CSO Research Director",
        parent_id: str = "ceo-001",
        **kwargs
    ):
        super().__init__(
            agent_id=agent_id,
            name=name,
            agent_type="CSO",
            parent_id=parent_id,
            llm_model="gpt-4",
            temperature=0.7,
            **kwargs
        )
        
        # Scientific attributes
        self.research_pipeline = []
        self.active_projects = {}
        self.publication_queue = []
        self.patent_applications = []
        self.collaboration_partners = []
        
    def get_system_prompt(self) -> str:
        return """You are the Chief Scientific Officer (CSO) of a biotech company. Your responsibilities include:

1. Lead scientific strategy and research direction
2. Oversee all R&D projects and experiments
3. Ensure scientific rigor and innovation
4. Manage intellectual property and patents
5. Foster scientific collaborations
6. Guide technology adoption and methodology
7. Report research progress to CEO

Key areas under your leadership:
- Drug Discovery and Development
- Molecular Biology Research
- Bioinformatics and Computational Biology
- Clinical Research Planning
- Scientific Publications and IP

Scientific principles:
- Evidence-based decision making
- Reproducibility and transparency
- Innovation balanced with feasibility
- Ethical research practices
- Collaborative science

You manage research teams and ensure the company stays at the forefront of biotech innovation."""
    
    def _build_graph(self) -> StateGraph:
        """Build the CSO agent workflow"""
        workflow = StateGraph(AgentState)
        
        # Define nodes
        workflow.add_node("analyze_research_request", self._analyze_research_request)
        workflow.add_node("evaluate_scientific_merit", self._evaluate_scientific_merit)
        workflow.add_node("design_research_strategy", self._design_research_strategy)
        workflow.add_node("allocate_research_resources", self._allocate_research_resources)
        workflow.add_node("review_research_progress", self._review_research_progress)
        workflow.add_node("assess_ip_potential", self._assess_ip_potential)
        workflow.add_node("prepare_scientific_report", self._prepare_scientific_report)
        
        # Define the flow
        workflow.set_entry_point("analyze_research_request")
        
        # Conditional routing based on request type
        def route_after_analysis(state: AgentState) -> str:
            last_message = state["messages"][-1].content.lower()
            if "report" in last_message or "progress" in last_message:
                return "review_research_progress"
            elif "patent" in last_message or "ip" in last_message:
                return "assess_ip_potential"
            elif "merit" in last_message or "feasibility" in last_message:
                return "evaluate_scientific_merit"
            else:
                return "design_research_strategy"
        
        workflow.add_conditional_edges(
            "analyze_research_request",
            route_after_analysis,
            {
                "review_research_progress": "review_research_progress",
                "assess_ip_potential": "assess_ip_potential",
                "evaluate_scientific_merit": "evaluate_scientific_merit",
                "design_research_strategy": "design_research_strategy"
            }
        )
        
        workflow.add_edge("evaluate_scientific_merit", "design_research_strategy")
        workflow.add_edge("design_research_strategy", "allocate_research_resources")
        workflow.add_edge("allocate_research_resources", "prepare_scientific_report")
        workflow.add_edge("review_research_progress", "prepare_scientific_report")
        workflow.add_edge("assess_ip_potential", "prepare_scientific_report")
        workflow.add_edge("prepare_scientific_report", END)
        
        return workflow.compile()
    
    async def _analyze_research_request(self, state: AgentState) -> AgentState:
        """Analyze incoming research request or query"""
        messages = state["messages"]
        
        analysis_prompt = """Analyze the research-related request:
1. What is the scientific question or objective?
2. Which research areas are involved?
3. What is the potential impact on our pipeline?
4. Required expertise and resources
5. Alignment with company research strategy

Provide scientific context and initial assessment."""
        
        messages.append(SystemMessage(content=analysis_prompt))
        response = await self.llm.ainvoke(messages)
        messages.append(response)
        
        state["messages"] = messages
        state["status"] = AgentStatus.THINKING.value
        logger.info(f"CSO analyzing research request: {response.content[:100]}...")
        
        return state
    
    async def _evaluate_scientific_merit(self, state: AgentState) -> AgentState:
        """Evaluate scientific merit and feasibility"""
        messages = state["messages"]
        
        evaluation_prompt = """Evaluate the scientific merit:
1. Scientific validity and hypothesis strength
2. Novelty and innovation potential
3. Technical feasibility assessment
4. Required methodologies and techniques
5. Potential risks and limitations
6. Expected timeline and milestones

Rate each aspect (1-10) and provide rationale.
Consider:
- Current scientific literature
- Available technology
- Team expertise
- Competitive landscape"""
        
        messages.append(SystemMessage(content=evaluation_prompt))
        response = await self.llm.ainvoke(messages)
        messages.append(response)
        
        state["messages"] = messages
        logger.info("CSO evaluated scientific merit")
        
        return state
    
    async def _design_research_strategy(self, state: AgentState) -> AgentState:
        """Design comprehensive research strategy"""
        messages = state["messages"]
        
        strategy_prompt = """Design detailed research strategy:

1. Research Objectives
   - Primary goals
   - Secondary objectives
   - Success criteria

2. Experimental Design
   - Key experiments and controls
   - Statistical considerations
   - Sample size calculations

3. Methodology
   - Techniques to be employed
   - Equipment requirements
   - Data collection plans

4. Timeline
   - Phase 1: Proof of concept
   - Phase 2: Optimization
   - Phase 3: Validation
   - Phase 4: Scale-up

5. Risk Mitigation
   - Technical risks
   - Biological variability
   - Regulatory considerations

6. Expected Outcomes
   - Scientific deliverables
   - Potential publications
   - IP opportunities"""
        
        messages.append(SystemMessage(content=strategy_prompt))
        response = await self.llm.ainvoke(messages)
        messages.append(response)
        
        state["messages"] = messages
        logger.info("CSO designed research strategy")
        
        return state
    
    async def _allocate_research_resources(self, state: AgentState) -> AgentState:
        """Allocate resources for research projects"""
        messages = state["messages"]
        
        allocation_prompt = """Plan research resource allocation:

1. Personnel Assignment
   - Lead scientist(s)
   - Research team composition
   - Collaborators needed

2. Equipment and Facilities
   - Laboratory space requirements
   - Specialized equipment
   - Core facility usage

3. Materials and Reagents
   - Critical reagents
   - Biological materials
   - Consumables estimate

4. Budget Allocation
   - Personnel costs
   - Materials budget
   - Equipment/services
   - Contingency (15%)

5. External Resources
   - CRO partnerships
   - Academic collaborations
   - Consultant needs

Provide detailed resource plan with justification."""
        
        messages.append(SystemMessage(content=allocation_prompt))
        response = await self.llm.ainvoke(messages)
        messages.append(response)
        
        state["messages"] = messages
        state["context"]["resources_allocated"] = True
        logger.info("CSO allocated research resources")
        
        return state
    
    async def _review_research_progress(self, state: AgentState) -> AgentState:
        """Review ongoing research progress"""
        messages = state["messages"]
        
        review_prompt = """Review current research progress:

1. Active Projects Status
   - Milestones achieved
   - Delays or challenges
   - Key findings to date

2. Data Quality Assessment
   - Reproducibility checks
   - Statistical significance
   - Data integrity

3. Team Performance
   - Productivity metrics
   - Collaboration effectiveness
   - Training needs

4. Innovation Pipeline
   - New discoveries
   - Unexpected findings
   - Pivot opportunities

5. Competitive Intelligence
   - Industry developments
   - Competitor activities
   - Market opportunities

Provide comprehensive progress assessment."""
        
        messages.append(SystemMessage(content=review_prompt))
        response = await self.llm.ainvoke(messages)
        messages.append(response)
        
        state["messages"] = messages
        logger.info("CSO reviewed research progress")
        
        return state
    
    async def _assess_ip_potential(self, state: AgentState) -> AgentState:
        """Assess intellectual property potential"""
        messages = state["messages"]
        
        ip_prompt = """Assess intellectual property potential:

1. Patentability Analysis
   - Novel aspects
   - Non-obviousness
   - Industrial applicability
   - Prior art search needs

2. IP Strategy
   - Patent vs trade secret
   - Geographic coverage
   - Continuation strategies

3. Commercial Value
   - Market size estimation
   - Licensing potential
   - Competitive advantage

4. Filing Timeline
   - Priority applications
   - PCT considerations
   - National phase planning

5. Freedom to Operate
   - Existing patent landscape
   - Potential conflicts
   - Workaround strategies

Provide IP recommendation and action plan."""
        
        messages.append(SystemMessage(content=ip_prompt))
        response = await self.llm.ainvoke(messages)
        messages.append(response)
        
        state["messages"] = messages
        logger.info("CSO assessed IP potential")
        
        return state
    
    async def _prepare_scientific_report(self, state: AgentState) -> AgentState:
        """Prepare comprehensive scientific report"""
        messages = state["messages"]
        
        report_prompt = """Prepare scientific report for executive team:

1. Executive Summary
   - Key scientific achievements
   - Major discoveries
   - Strategic recommendations

2. Research Portfolio
   - Active projects overview
   - Progress against milestones
   - Resource utilization

3. Scientific Highlights
   - Breakthrough findings
   - Publication submissions
   - Conference presentations

4. Innovation Pipeline
   - New research initiatives
   - Technology adoptions
   - Collaboration opportunities

5. Intellectual Property
   - Patents filed/granted
   - Trade secrets established
   - Licensing activities

6. Challenges and Solutions
   - Technical hurdles
   - Resource constraints
   - Proposed solutions

7. Future Outlook
   - Upcoming milestones
   - Strategic priorities
   - Investment needs

Format as executive scientific report."""
        
        messages.append(SystemMessage(content=report_prompt))
        response = await self.llm.ainvoke(messages)
        messages.append(response)
        
        state["messages"] = messages
        state["status"] = AgentStatus.IDLE.value
        logger.info("CSO prepared scientific report")
        
        return state
    
    def get_research_metrics(self) -> Dict[str, Any]:
        """Get current research metrics"""
        return {
            "active_projects": 12,
            "projects_on_track": 10,
            "publications_ytd": 8,
            "patents_filed": 3,
            "success_rate": 75.0,
            "innovation_index": 8.5,
            "collaboration_score": 9.0,
            "areas": {
                "drug_discovery": {"projects": 4, "status": "advancing"},
                "molecular_biology": {"projects": 3, "status": "active"},
                "bioinformatics": {"projects": 3, "status": "expanding"},
                "clinical_research": {"projects": 2, "status": "planning"}
            },
            "pipeline_value": "$125M",
            "timestamp": datetime.utcnow().isoformat()
        }
    
    async def evaluate_research_proposal(self, proposal: Dict[str, Any]) -> Dict[str, Any]:
        """Evaluate a new research proposal"""
        logger.info(f"CSO evaluating research proposal: {proposal.get('title', 'Untitled')}")
        
        # Process through workflow
        result = await self.process_message(
            f"Evaluate research proposal: {proposal}",
            context={"type": "proposal_evaluation", "proposal": proposal}
        )
        
        return result