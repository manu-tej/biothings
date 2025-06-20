"""
CFO Agent - Chief Financial Officer
Manages financial planning, budgeting, resource allocation, and investment decisions
"""

from typing import Dict, Any, List, Optional
from datetime import datetime
import uuid
from langchain_core.messages import HumanMessage, AIMessage
from langgraph.graph import StateGraph, END
from backend.agents.base.agent import BaseAgent, AgentState
from backend.models.agent_models import AgentType, TaskPriority, TaskStatus
from backend.models.task_models import Task
from backend.config import get_settings

settings = get_settings()


class CFOAgent(BaseAgent):
    """Chief Financial Officer Agent"""
    
    def __init__(self):
        super().__init__(
            agent_id=f"cfo_{uuid.uuid4().hex[:8]}",
            name="Chief Financial Officer",
            agent_type=AgentType.EXECUTIVE,
            department="Finance",
            reporting_to="ceo"
        )
        
        self.financial_metrics = {
            "budget": 10000000,  # $10M initial budget
            "burn_rate": 250000,  # $250k/month
            "runway_months": 40,
            "roi_target": 0.25,  # 25% ROI target
            "risk_tolerance": "moderate"
        }
        
        self.resource_pools = {
            "r&d": {"allocated": 4000000, "spent": 0, "projects": []},
            "operations": {"allocated": 3000000, "spent": 0, "projects": []},
            "marketing": {"allocated": 1000000, "spent": 0, "projects": []},
            "infrastructure": {"allocated": 2000000, "spent": 0, "projects": []}
        }
        
    def _build_graph(self) -> StateGraph:
        """Build the CFO decision workflow"""
        workflow = StateGraph(AgentState)
        
        # Add nodes for financial decision-making
        workflow.add_node("analyze_financial_request", self._analyze_financial_request)
        workflow.add_node("evaluate_budget", self._evaluate_budget)
        workflow.add_node("assess_roi", self._assess_roi)
        workflow.add_node("risk_analysis", self._risk_analysis)
        workflow.add_node("make_financial_decision", self._make_financial_decision)
        workflow.add_node("allocate_resources", self._allocate_resources)
        workflow.add_node("financial_reporting", self._financial_reporting)
        
        # Define the flow
        workflow.set_entry_point("analyze_financial_request")
        
        workflow.add_edge("analyze_financial_request", "evaluate_budget")
        workflow.add_edge("evaluate_budget", "assess_roi")
        workflow.add_edge("assess_roi", "risk_analysis")
        workflow.add_edge("risk_analysis", "make_financial_decision")
        
        # Conditional edges based on decision
        workflow.add_conditional_edges(
            "make_financial_decision",
            self._route_financial_decision,
            {
                "allocate": "allocate_resources",
                "report": "financial_reporting",
                "reject": END
            }
        )
        
        workflow.add_edge("allocate_resources", "financial_reporting")
        workflow.add_edge("financial_reporting", END)
        
        return workflow.compile()
    
    async def _analyze_financial_request(self, state: AgentState) -> AgentState:
        """Analyze incoming financial requests"""
        messages = state["messages"]
        latest_message = messages[-1] if messages else None
        
        if not latest_message:
            return state
            
        # Extract financial details from request
        request_type = "budget_allocation"  # Default
        if "investment" in str(latest_message.content).lower():
            request_type = "investment"
        elif "cost" in str(latest_message.content).lower():
            request_type = "cost_analysis"
        elif "report" in str(latest_message.content).lower():
            request_type = "financial_report"
            
        state["metadata"]["request_type"] = request_type
        state["metadata"]["analysis_timestamp"] = datetime.utcnow().isoformat()
        
        analysis_message = AIMessage(
            content=f"Analyzing {request_type} request. Evaluating financial implications..."
        )
        state["messages"].append(analysis_message)
        
        return state
    
    async def _evaluate_budget(self, state: AgentState) -> AgentState:
        """Evaluate budget availability and constraints"""
        metadata = state.get("metadata", {})
        
        # Calculate available budget
        total_allocated = sum(pool["allocated"] for pool in self.resource_pools.values())
        total_spent = sum(pool["spent"] for pool in self.resource_pools.values())
        available_budget = self.financial_metrics["budget"] - total_spent
        
        budget_health = "healthy" if available_budget > 2000000 else "constrained"
        
        metadata["budget_analysis"] = {
            "total_budget": self.financial_metrics["budget"],
            "allocated": total_allocated,
            "spent": total_spent,
            "available": available_budget,
            "health_status": budget_health,
            "burn_rate": self.financial_metrics["burn_rate"],
            "runway_months": available_budget / self.financial_metrics["burn_rate"]
        }
        
        budget_message = AIMessage(
            content=f"Budget Analysis Complete:\n"
                    f"- Available: ${available_budget:,.2f}\n"
                    f"- Runway: {metadata['budget_analysis']['runway_months']:.1f} months\n"
                    f"- Status: {budget_health}"
        )
        state["messages"].append(budget_message)
        state["metadata"] = metadata
        
        return state
    
    async def _assess_roi(self, state: AgentState) -> AgentState:
        """Assess return on investment potential"""
        metadata = state.get("metadata", {})
        request_type = metadata.get("request_type", "")
        
        # Simulate ROI calculation based on request type
        roi_estimates = {
            "r&d_project": {"min": 0.15, "expected": 0.35, "max": 0.60},
            "infrastructure": {"min": 0.05, "expected": 0.15, "max": 0.25},
            "marketing": {"min": 0.10, "expected": 0.20, "max": 0.40},
            "operations": {"min": 0.08, "expected": 0.18, "max": 0.30}
        }
        
        # Default ROI if type not found
        project_type = "r&d_project"  # Default to R&D
        roi = roi_estimates.get(project_type, {"min": 0.10, "expected": 0.20, "max": 0.30})
        
        meets_target = roi["expected"] >= self.financial_metrics["roi_target"]
        
        metadata["roi_assessment"] = {
            "project_type": project_type,
            "roi_range": roi,
            "target_roi": self.financial_metrics["roi_target"],
            "meets_target": meets_target,
            "recommendation": "proceed" if meets_target else "reconsider"
        }
        
        roi_message = AIMessage(
            content=f"ROI Assessment:\n"
                    f"- Expected ROI: {roi['expected']*100:.1f}%\n"
                    f"- Target ROI: {self.financial_metrics['roi_target']*100:.1f}%\n"
                    f"- Recommendation: {metadata['roi_assessment']['recommendation']}"
        )
        state["messages"].append(roi_message)
        state["metadata"] = metadata
        
        return state
    
    async def _risk_analysis(self, state: AgentState) -> AgentState:
        """Perform financial risk analysis"""
        metadata = state.get("metadata", {})
        
        # Risk factors to consider
        risk_factors = {
            "market_risk": 0.3,
            "execution_risk": 0.25,
            "regulatory_risk": 0.15,
            "technology_risk": 0.35,
            "financial_risk": 0.20
        }
        
        # Calculate composite risk score
        risk_score = sum(risk_factors.values()) / len(risk_factors)
        
        # Determine risk level
        if risk_score < 0.2:
            risk_level = "low"
        elif risk_score < 0.4:
            risk_level = "moderate"
        else:
            risk_level = "high"
            
        acceptable = risk_level in ["low", "moderate"] and self.financial_metrics["risk_tolerance"] != "conservative"
        
        metadata["risk_analysis"] = {
            "risk_factors": risk_factors,
            "composite_score": risk_score,
            "risk_level": risk_level,
            "acceptable": acceptable,
            "mitigation_required": risk_level == "high"
        }
        
        risk_message = AIMessage(
            content=f"Risk Analysis:\n"
                    f"- Risk Level: {risk_level}\n"
                    f"- Composite Score: {risk_score:.2f}\n"
                    f"- Acceptable: {'Yes' if acceptable else 'No'}"
        )
        state["messages"].append(risk_message)
        state["metadata"] = metadata
        
        return state
    
    async def _make_financial_decision(self, state: AgentState) -> AgentState:
        """Make final financial decision based on all analyses"""
        metadata = state.get("metadata", {})
        
        # Extract analysis results
        budget_healthy = metadata.get("budget_analysis", {}).get("health_status") == "healthy"
        roi_acceptable = metadata.get("roi_assessment", {}).get("meets_target", False)
        risk_acceptable = metadata.get("risk_analysis", {}).get("acceptable", False)
        
        # Decision logic
        if budget_healthy and roi_acceptable and risk_acceptable:
            decision = "approve"
            action = "allocate"
        elif metadata.get("request_type") == "financial_report":
            decision = "generate_report"
            action = "report"
        else:
            decision = "reject"
            action = "reject"
            
        metadata["financial_decision"] = {
            "decision": decision,
            "timestamp": datetime.utcnow().isoformat(),
            "factors": {
                "budget_healthy": budget_healthy,
                "roi_acceptable": roi_acceptable,
                "risk_acceptable": risk_acceptable
            }
        }
        
        decision_message = AIMessage(
            content=f"Financial Decision: {decision.upper()}\n"
                    f"Based on comprehensive analysis of budget, ROI, and risk factors."
        )
        state["messages"].append(decision_message)
        state["metadata"] = metadata
        state["next_action"] = action
        
        return state
    
    def _route_financial_decision(self, state: AgentState) -> str:
        """Route based on financial decision"""
        return state.get("next_action", "reject")
    
    async def _allocate_resources(self, state: AgentState) -> AgentState:
        """Allocate financial resources"""
        metadata = state.get("metadata", {})
        
        # Simulate resource allocation
        allocation = {
            "amount": 500000,  # $500k allocation
            "department": "r&d",
            "project_id": f"proj_{uuid.uuid4().hex[:8]}",
            "allocation_date": datetime.utcnow().isoformat(),
            "expected_completion": "6 months"
        }
        
        # Update resource pool
        self.resource_pools[allocation["department"]]["projects"].append(allocation["project_id"])
        
        metadata["resource_allocation"] = allocation
        
        allocation_message = AIMessage(
            content=f"Resources Allocated:\n"
                    f"- Amount: ${allocation['amount']:,}\n"
                    f"- Department: {allocation['department'].upper()}\n"
                    f"- Project ID: {allocation['project_id']}\n"
                    f"- Timeline: {allocation['expected_completion']}"
        )
        state["messages"].append(allocation_message)
        state["metadata"] = metadata
        
        return state
    
    async def _financial_reporting(self, state: AgentState) -> AgentState:
        """Generate financial reports"""
        metadata = state.get("metadata", {})
        
        # Generate comprehensive financial report
        report = {
            "report_date": datetime.utcnow().isoformat(),
            "financial_health": {
                "total_budget": self.financial_metrics["budget"],
                "burn_rate": self.financial_metrics["burn_rate"],
                "runway_months": self.financial_metrics["runway_months"]
            },
            "department_allocations": {
                dept: {
                    "allocated": info["allocated"],
                    "spent": info["spent"],
                    "utilization": (info["spent"] / info["allocated"] * 100) if info["allocated"] > 0 else 0
                }
                for dept, info in self.resource_pools.items()
            },
            "recent_decisions": metadata.get("financial_decision", {}),
            "recommendations": [
                "Optimize R&D spending for higher ROI",
                "Consider increasing marketing budget by 20%",
                "Review infrastructure costs for efficiency"
            ]
        }
        
        metadata["financial_report"] = report
        
        # Create task for report distribution
        report_task = Task(
            task_id=f"task_{uuid.uuid4().hex[:8]}",
            title="Distribute Financial Report",
            description="Q4 Financial Report ready for board review",
            assigned_to="ceo",
            created_by=self.agent_id,
            priority=TaskPriority.HIGH,
            status=TaskStatus.PENDING,
            metadata={"report": report}
        )
        
        state["tasks"].append(report_task)
        
        report_message = AIMessage(
            content=f"Financial Report Generated:\n"
                    f"- Runway: {report['financial_health']['runway_months']} months\n"
                    f"- Burn Rate: ${report['financial_health']['burn_rate']:,}/month\n"
                    f"- Key Recommendation: {report['recommendations'][0]}"
        )
        state["messages"].append(report_message)
        state["metadata"] = metadata
        
        return state
    
    async def analyze_financial_health(self) -> Dict[str, Any]:
        """Analyze overall financial health"""
        total_spent = sum(pool["spent"] for pool in self.resource_pools.values())
        available = self.financial_metrics["budget"] - total_spent
        
        return {
            "health_score": 0.85 if available > 5000000 else 0.65,
            "budget_utilization": total_spent / self.financial_metrics["budget"],
            "runway_months": available / self.financial_metrics["burn_rate"],
            "risk_assessment": "moderate",
            "recommendations": [
                "Maintain current burn rate",
                "Focus on high-ROI projects",
                "Build 6-month reserve fund"
            ]
        }