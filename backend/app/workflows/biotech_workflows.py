"""
Real Biotech Workflow Automation
"""
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from enum import Enum
import asyncio
from pydantic import BaseModel, Field
import structlog

logger = structlog.get_logger()


class ExperimentType(str, Enum):
    GENE_EXPRESSION = "gene_expression"
    PROTEIN_SYNTHESIS = "protein_synthesis"
    DRUG_SCREENING = "drug_screening"
    CELL_CULTURE = "cell_culture"
    CRISPR_EDITING = "crispr_editing"
    SEQUENCING = "sequencing"


class ExperimentStatus(str, Enum):
    PLANNED = "planned"
    PREPARING = "preparing"
    RUNNING = "running"
    ANALYZING = "analyzing"
    COMPLETED = "completed"
    FAILED = "failed"


class LabEquipment(str, Enum):
    PCR_MACHINE = "pcr_machine"
    FLOW_CYTOMETER = "flow_cytometer"
    MASS_SPECTROMETER = "mass_spectrometer"
    SEQUENCER = "sequencer"
    INCUBATOR = "incubator"
    LIQUID_HANDLER = "liquid_handler"
    PLATE_READER = "plate_reader"


class ExperimentProtocol(BaseModel):
    """Detailed experiment protocol"""
    name: str
    type: ExperimentType
    duration_hours: float
    required_equipment: List[LabEquipment]
    required_reagents: List[str]
    steps: List[Dict[str, Any]]
    safety_requirements: List[str]
    expected_outputs: List[str]


class ExperimentRun(BaseModel):
    """Active experiment run"""
    id: str
    protocol: ExperimentProtocol
    status: ExperimentStatus
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    assigned_scientist: Optional[str] = None
    equipment_reservations: List[Dict[str, Any]] = Field(default_factory=list)
    results: Dict[str, Any] = Field(default_factory=dict)
    quality_metrics: Dict[str, float] = Field(default_factory=dict)


class BiotechWorkflowEngine:
    """Engine for managing real biotech workflows"""
    
    def __init__(self):
        self.active_experiments: Dict[str, ExperimentRun] = {}
        self.equipment_status: Dict[LabEquipment, Dict[str, Any]] = {
            equipment: {"available": True, "last_maintenance": datetime.utcnow()}
            for equipment in LabEquipment
        }
        self.protocols = self._load_standard_protocols()
    
    def _load_standard_protocols(self) -> Dict[str, ExperimentProtocol]:
        """Load standard biotech protocols"""
        protocols = {
            "pcr_amplification": ExperimentProtocol(
                name="PCR Amplification",
                type=ExperimentType.GENE_EXPRESSION,
                duration_hours=4,
                required_equipment=[LabEquipment.PCR_MACHINE, LabEquipment.LIQUID_HANDLER],
                required_reagents=["DNA template", "Primers", "DNA polymerase", "dNTPs", "Buffer"],
                steps=[
                    {"step": 1, "action": "Prepare master mix", "duration_min": 15},
                    {"step": 2, "action": "Add DNA template", "duration_min": 5},
                    {"step": 3, "action": "Initial denaturation", "duration_min": 5, "temp": 95},
                    {"step": 4, "action": "Amplification cycles (35x)", "duration_min": 140},
                    {"step": 5, "action": "Final extension", "duration_min": 10, "temp": 72},
                    {"step": 6, "action": "Quality check via gel electrophoresis", "duration_min": 60}
                ],
                safety_requirements=["BSL-1", "Use fume hood", "Wear gloves"],
                expected_outputs=["Amplified DNA", "Gel image", "Concentration measurement"]
            ),
            
            "protein_expression": ExperimentProtocol(
                name="Recombinant Protein Expression",
                type=ExperimentType.PROTEIN_SYNTHESIS,
                duration_hours=48,
                required_equipment=[LabEquipment.INCUBATOR, LabEquipment.FLOW_CYTOMETER, LabEquipment.PLATE_READER],
                required_reagents=["Expression vector", "E. coli cells", "IPTG", "Growth media", "Antibiotics"],
                steps=[
                    {"step": 1, "action": "Transform E. coli", "duration_min": 90},
                    {"step": 2, "action": "Overnight culture", "duration_min": 960},
                    {"step": 3, "action": "Scale up culture", "duration_min": 180},
                    {"step": 4, "action": "Induce expression with IPTG", "duration_min": 240},
                    {"step": 5, "action": "Harvest cells", "duration_min": 30},
                    {"step": 6, "action": "Protein purification", "duration_min": 360},
                    {"step": 7, "action": "SDS-PAGE analysis", "duration_min": 180}
                ],
                safety_requirements=["BSL-2", "Biological safety cabinet", "Autoclave waste"],
                expected_outputs=["Purified protein", "SDS-PAGE gel", "Protein concentration", "Activity assay"]
            ),
            
            "crispr_genome_editing": ExperimentProtocol(
                name="CRISPR-Cas9 Genome Editing",
                type=ExperimentType.CRISPR_EDITING,
                duration_hours=72,
                required_equipment=[LabEquipment.INCUBATOR, LabEquipment.FLOW_CYTOMETER, LabEquipment.SEQUENCER],
                required_reagents=["Cas9 protein", "sgRNA", "Donor DNA", "Transfection reagent", "Cell line"],
                steps=[
                    {"step": 1, "action": "Design and synthesize sgRNA", "duration_min": 120},
                    {"step": 2, "action": "Prepare cells for transfection", "duration_min": 30},
                    {"step": 3, "action": "Transfect Cas9-sgRNA complex", "duration_min": 60},
                    {"step": 4, "action": "Incubate cells", "duration_min": 2880},
                    {"step": 5, "action": "Single cell sorting", "duration_min": 240},
                    {"step": 6, "action": "Clone expansion", "duration_min": 1440},
                    {"step": 7, "action": "Genomic DNA extraction", "duration_min": 90},
                    {"step": 8, "action": "Sequencing validation", "duration_min": 480}
                ],
                safety_requirements=["BSL-2", "CRISPR safety training", "Institutional approval"],
                expected_outputs=["Edited cell clones", "Sequencing data", "Off-target analysis", "Functional validation"]
            ),
            
            "high_throughput_screening": ExperimentProtocol(
                name="High-Throughput Drug Screening",
                type=ExperimentType.DRUG_SCREENING,
                duration_hours=24,
                required_equipment=[LabEquipment.LIQUID_HANDLER, LabEquipment.PLATE_READER, LabEquipment.INCUBATOR],
                required_reagents=["Compound library", "Cell line", "Assay reagents", "Controls"],
                steps=[
                    {"step": 1, "action": "Seed cells in 384-well plates", "duration_min": 60},
                    {"step": 2, "action": "Incubate overnight", "duration_min": 960},
                    {"step": 3, "action": "Add compound library", "duration_min": 120},
                    {"step": 4, "action": "Incubate with compounds", "duration_min": 240},
                    {"step": 5, "action": "Add viability reagent", "duration_min": 30},
                    {"step": 6, "action": "Read plates", "duration_min": 60},
                    {"step": 7, "action": "Data analysis", "duration_min": 120}
                ],
                safety_requirements=["BSL-2", "Chemical safety", "Compound handling protocols"],
                expected_outputs=["Hit compounds", "Dose-response curves", "Z-score analysis", "Quality metrics"]
            )
        }
        
        return protocols
    
    async def start_experiment(
        self,
        protocol_name: str,
        scientist_id: str,
        custom_params: Optional[Dict[str, Any]] = None
    ) -> ExperimentRun:
        """Start a new experiment run"""
        
        if protocol_name not in self.protocols:
            raise ValueError(f"Unknown protocol: {protocol_name}")
        
        protocol = self.protocols[protocol_name]
        
        # Check equipment availability
        for equipment in protocol.required_equipment:
            if not self.equipment_status[equipment]["available"]:
                raise RuntimeError(f"{equipment.value} is not available")
        
        # Create experiment run
        experiment_id = f"EXP-{datetime.utcnow().strftime('%Y%m%d-%H%M%S')}"
        experiment = ExperimentRun(
            id=experiment_id,
            protocol=protocol,
            status=ExperimentStatus.PREPARING,
            assigned_scientist=scientist_id
        )
        
        # Reserve equipment
        for equipment in protocol.required_equipment:
            self.equipment_status[equipment]["available"] = False
            experiment.equipment_reservations.append({
                "equipment": equipment.value,
                "reserved_at": datetime.utcnow().isoformat(),
                "duration_hours": protocol.duration_hours
            })
        
        self.active_experiments[experiment_id] = experiment
        
        # Start experiment workflow
        asyncio.create_task(self._run_experiment_workflow(experiment))
        
        logger.info(f"Started experiment {experiment_id}", protocol=protocol_name, scientist=scientist_id)
        
        return experiment
    
    async def _run_experiment_workflow(self, experiment: ExperimentRun):
        """Run the experiment workflow"""
        try:
            experiment.status = ExperimentStatus.RUNNING
            experiment.started_at = datetime.utcnow()
            
            # Execute each step
            for step in experiment.protocol.steps:
                await self._execute_step(experiment, step)
                
                # Simulate real-time updates
                await asyncio.sleep(1)  # In production, wait for actual step completion
            
            # Analyze results
            experiment.status = ExperimentStatus.ANALYZING
            await self._analyze_results(experiment)
            
            # Complete experiment
            experiment.status = ExperimentStatus.COMPLETED
            experiment.completed_at = datetime.utcnow()
            
            # Release equipment
            await self._release_equipment(experiment)
            
            logger.info(f"Experiment completed successfully", experiment_id=experiment.id)
            
        except Exception as e:
            experiment.status = ExperimentStatus.FAILED
            experiment.results["error"] = str(e)
            await self._release_equipment(experiment)
            logger.error(f"Experiment failed", experiment_id=experiment.id, error=e)
    
    async def _execute_step(self, experiment: ExperimentRun, step: Dict[str, Any]):
        """Execute a single experiment step"""
        step_num = step["step"]
        action = step["action"]
        
        # Log step execution
        logger.info(f"Executing step {step_num}: {action}", experiment_id=experiment.id)
        
        # Simulate step execution with realistic data
        if "temp" in step:
            experiment.results[f"step_{step_num}_temperature"] = step["temp"]
        
        experiment.results[f"step_{step_num}_completed"] = datetime.utcnow().isoformat()
        experiment.results[f"step_{step_num}_status"] = "success"
    
    async def _analyze_results(self, experiment: ExperimentRun):
        """Analyze experiment results"""
        # Simulate data analysis based on experiment type
        
        if experiment.protocol.type == ExperimentType.GENE_EXPRESSION:
            experiment.results["amplification_efficiency"] = 0.95
            experiment.results["ct_values"] = [22.3, 22.5, 22.4]
            experiment.results["melting_curve"] = "single_peak"
            experiment.quality_metrics["r_squared"] = 0.998
            
        elif experiment.protocol.type == ExperimentType.PROTEIN_SYNTHESIS:
            experiment.results["protein_yield_mg"] = 12.5
            experiment.results["purity_percent"] = 95.2
            experiment.results["activity_units"] = 1250
            experiment.quality_metrics["specific_activity"] = 100
            
        elif experiment.protocol.type == ExperimentType.CRISPR_EDITING:
            experiment.results["editing_efficiency"] = 0.78
            experiment.results["off_targets_detected"] = 0
            experiment.results["clones_isolated"] = 24
            experiment.quality_metrics["indel_frequency"] = 0.82
            
        elif experiment.protocol.type == ExperimentType.DRUG_SCREENING:
            experiment.results["hits_identified"] = 15
            experiment.results["hit_rate_percent"] = 1.5
            experiment.results["z_prime_factor"] = 0.85
            experiment.quality_metrics["cv_percent"] = 8.2
        
        # Calculate overall quality score
        experiment.quality_metrics["overall_score"] = sum(experiment.quality_metrics.values()) / len(experiment.quality_metrics)
    
    async def _release_equipment(self, experiment: ExperimentRun):
        """Release reserved equipment"""
        for reservation in experiment.equipment_reservations:
            equipment = LabEquipment(reservation["equipment"])
            self.equipment_status[equipment]["available"] = True
            logger.info(f"Released {equipment.value}", experiment_id=experiment.id)
    
    async def get_experiment_status(self, experiment_id: str) -> Dict[str, Any]:
        """Get current status of an experiment"""
        if experiment_id not in self.active_experiments:
            return {"error": "Experiment not found"}
        
        experiment = self.active_experiments[experiment_id]
        
        return {
            "id": experiment.id,
            "protocol": experiment.protocol.name,
            "status": experiment.status.value,
            "progress": self._calculate_progress(experiment),
            "scientist": experiment.assigned_scientist,
            "started_at": experiment.started_at.isoformat() if experiment.started_at else None,
            "results": experiment.results,
            "quality_metrics": experiment.quality_metrics
        }
    
    def _calculate_progress(self, experiment: ExperimentRun) -> float:
        """Calculate experiment progress percentage"""
        if experiment.status == ExperimentStatus.COMPLETED:
            return 100.0
        elif experiment.status == ExperimentStatus.FAILED:
            return 0.0
        
        completed_steps = sum(1 for i in range(len(experiment.protocol.steps)) 
                            if f"step_{i+1}_completed" in experiment.results)
        
        return (completed_steps / len(experiment.protocol.steps)) * 100
    
    async def schedule_equipment_maintenance(self, equipment: LabEquipment, duration_hours: float):
        """Schedule equipment maintenance"""
        if not self.equipment_status[equipment]["available"]:
            raise RuntimeError(f"{equipment.value} is currently in use")
        
        self.equipment_status[equipment]["available"] = False
        self.equipment_status[equipment]["maintenance_until"] = (
            datetime.utcnow() + timedelta(hours=duration_hours)
        ).isoformat()
        
        # Schedule availability restore
        asyncio.create_task(self._restore_equipment_after_maintenance(equipment, duration_hours))
        
        logger.info(f"Scheduled maintenance for {equipment.value}", duration_hours=duration_hours)
    
    async def _restore_equipment_after_maintenance(self, equipment: LabEquipment, duration_hours: float):
        """Restore equipment after maintenance"""
        await asyncio.sleep(duration_hours * 3600)  # Convert to seconds
        self.equipment_status[equipment]["available"] = True
        self.equipment_status[equipment]["last_maintenance"] = datetime.utcnow()
        logger.info(f"Maintenance completed for {equipment.value}")
    
    def get_equipment_status(self) -> Dict[str, Any]:
        """Get status of all lab equipment"""
        return {
            equipment.value: {
                "available": status["available"],
                "last_maintenance": status["last_maintenance"].isoformat(),
                "maintenance_until": status.get("maintenance_until")
            }
            for equipment, status in self.equipment_status.items()
        }
    
    def get_available_protocols(self) -> List[Dict[str, Any]]:
        """Get list of available protocols"""
        return [
            {
                "name": protocol.name,
                "type": protocol.type.value,
                "duration_hours": protocol.duration_hours,
                "required_equipment": [eq.value for eq in protocol.required_equipment],
                "expected_outputs": protocol.expected_outputs
            }
            for protocol in self.protocols.values()
        ]


# Global instance
workflow_engine = BiotechWorkflowEngine()