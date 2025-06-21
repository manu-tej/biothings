from fastapi import APIRouter, HTTPException, Query
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from datetime import datetime
from enum import Enum
import logging
import random

logger = logging.getLogger(__name__)

router = APIRouter()


class EquipmentType(str, Enum):
    PCR = "PCR"
    CENTRIFUGE = "Centrifuge"
    INCUBATOR = "Incubator"
    MICROSCOPE = "Microscope"
    SPECTROPHOTOMETER = "Spectrophotometer"
    FLOW_CYTOMETER = "Flow Cytometer"


class EquipmentStatus(str, Enum):
    RUNNING = "running"
    IDLE = "idle"
    MAINTENANCE = "maintenance"
    ERROR = "error"


class ExperimentStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class Equipment(BaseModel):
    id: str
    name: str
    type: EquipmentType
    status: EquipmentStatus
    temperature: Optional[float] = None
    speed: Optional[int] = None
    progress: float = 0.0
    time_remaining: Optional[str] = None
    parameters: Dict[str, Any] = {}


class Experiment(BaseModel):
    id: str
    name: str
    type: str
    status: ExperimentStatus
    start_date: str
    estimated_completion: str
    researcher: str
    equipment: List[str]
    parameters: Dict[str, Any] = {}
    progress: float = 0.0
    notes: Optional[str] = None


class ExperimentCreateRequest(BaseModel):
    name: str
    type: str
    researcher: str
    equipment: List[str]
    parameters: Dict[str, Any] = {}
    notes: Optional[str] = None


# In-memory storage for demo
equipment_db = {
    "pcr-001": Equipment(
        id="pcr-001",
        name="PCR Thermocycler #1",
        type=EquipmentType.PCR,
        status=EquipmentStatus.RUNNING,
        temperature=72.0,
        progress=0.85,
        time_remaining="15 min",
        parameters={"cycles": 30, "denaturation_temp": 95}
    ),
    "centrifuge-001": Equipment(
        id="centrifuge-001",
        name="High-Speed Centrifuge",
        type=EquipmentType.CENTRIFUGE,
        status=EquipmentStatus.IDLE,
        speed=0,
        progress=0.0,
        parameters={"max_speed": 15000}
    ),
    "incubator-001": Equipment(
        id="incubator-001",
        name="CO2 Incubator #1",
        type=EquipmentType.INCUBATOR,
        status=EquipmentStatus.RUNNING,
        temperature=37.0,
        progress=1.0,
        parameters={"co2_level": 5.0, "humidity": 95}
    ),
    "microscope-001": Equipment(
        id="microscope-001",
        name="Confocal Microscope",
        type=EquipmentType.MICROSCOPE,
        status=EquipmentStatus.MAINTENANCE,
        progress=0.0,
        parameters={"magnification": "100x"}
    )
}

experiments_db = {}


@router.get("/equipment", response_model=List[Equipment])
async def list_equipment(
    status: EquipmentStatus = Query(default=None),
    type: EquipmentType = Query(default=None)
):
    """Get list of laboratory equipment with optional filtering"""
    equipment_list = list(equipment_db.values())
    
    # Apply filters
    if status:
        equipment_list = [e for e in equipment_list if e.status == status]
    if type:
        equipment_list = [e for e in equipment_list if e.type == type]
    
    # Simulate real-time updates
    for equipment in equipment_list:
        if equipment.status == EquipmentStatus.RUNNING:
            # Update progress
            equipment.progress = min(1.0, equipment.progress + random.uniform(0, 0.05))
            
            # Update temperature with slight variations
            if equipment.temperature:
                equipment.temperature += random.uniform(-0.2, 0.2)
    
    return equipment_list


@router.get("/equipment/{equipment_id}", response_model=Equipment)
async def get_equipment(equipment_id: str):
    """Get details of specific equipment"""
    if equipment_id not in equipment_db:
        raise HTTPException(status_code=404, detail="Equipment not found")
    
    equipment = equipment_db[equipment_id]
    
    # Simulate real-time updates
    if equipment.status == EquipmentStatus.RUNNING:
        equipment.progress = min(1.0, equipment.progress + random.uniform(0, 0.05))
        if equipment.temperature:
            equipment.temperature += random.uniform(-0.2, 0.2)
    
    return equipment


@router.put("/equipment/{equipment_id}/control")
async def control_equipment(
    equipment_id: str,
    action: str,
    parameters: Dict[str, Any] = {}
):
    """Control equipment (start, stop, pause, set parameters)"""
    if equipment_id not in equipment_db:
        raise HTTPException(status_code=404, detail="Equipment not found")
    
    equipment = equipment_db[equipment_id]
    
    if action == "start":
        if equipment.status == EquipmentStatus.MAINTENANCE:
            raise HTTPException(status_code=400, detail="Equipment is under maintenance")
        equipment.status = EquipmentStatus.RUNNING
        equipment.progress = 0.0
        
    elif action == "stop":
        equipment.status = EquipmentStatus.IDLE
        equipment.progress = 0.0
        equipment.time_remaining = None
        
    elif action == "pause":
        if equipment.status == EquipmentStatus.RUNNING:
            equipment.status = EquipmentStatus.IDLE
            
    elif action == "set_parameters":
        equipment.parameters.update(parameters)
        if "temperature" in parameters:
            equipment.temperature = parameters["temperature"]
        if "speed" in parameters:
            equipment.speed = parameters["speed"]
    
    else:
        raise HTTPException(status_code=400, detail="Invalid action")
    
    logger.info(f"Equipment {equipment_id} control: {action}")
    
    return {
        "status": "success",
        "equipment_id": equipment_id,
        "action": action,
        "new_status": equipment.status
    }


@router.get("/experiments", response_model=List[Experiment])
async def list_experiments(
    status: ExperimentStatus = Query(default=None),
    researcher: str = Query(default=None)
):
    """Get list of experiments with optional filtering"""
    # Add some default experiments if empty
    if not experiments_db:
        experiments_db["exp-001"] = Experiment(
            id="exp-001",
            name="Protein Expression Analysis",
            type="Molecular Biology",
            status=ExperimentStatus.IN_PROGRESS,
            start_date=datetime.utcnow().isoformat(),
            estimated_completion=datetime.utcnow().isoformat(),
            researcher="CSO Agent",
            equipment=["pcr-001", "centrifuge-001"],
            progress=0.65
        )
        experiments_db["exp-002"] = Experiment(
            id="exp-002",
            name="Cell Viability Assay",
            type="Cell Culture",
            status=ExperimentStatus.PENDING,
            start_date=datetime.utcnow().isoformat(),
            estimated_completion=datetime.utcnow().isoformat(),
            researcher="Research Manager",
            equipment=["incubator-001", "microscope-001"],
            progress=0.0
        )
    
    experiments_list = list(experiments_db.values())
    
    # Apply filters
    if status:
        experiments_list = [e for e in experiments_list if e.status == status]
    if researcher:
        experiments_list = [e for e in experiments_list if e.researcher == researcher]
    
    # Simulate progress updates
    for experiment in experiments_list:
        if experiment.status == ExperimentStatus.IN_PROGRESS:
            experiment.progress = min(1.0, experiment.progress + random.uniform(0, 0.02))
    
    return experiments_list


@router.post("/experiments", response_model=Experiment)
async def create_experiment(request: ExperimentCreateRequest):
    """Create a new experiment"""
    experiment_id = f"exp-{int(datetime.utcnow().timestamp())}"
    
    # Check equipment availability
    for equipment_id in request.equipment:
        if equipment_id not in equipment_db:
            raise HTTPException(status_code=400, detail=f"Equipment {equipment_id} not found")
        
        equipment = equipment_db[equipment_id]
        if equipment.status == EquipmentStatus.MAINTENANCE:
            raise HTTPException(
                status_code=400, 
                detail=f"Equipment {equipment_id} is under maintenance"
            )
    
    experiment = Experiment(
        id=experiment_id,
        name=request.name,
        type=request.type,
        status=ExperimentStatus.PENDING,
        start_date=datetime.utcnow().isoformat(),
        estimated_completion=datetime.utcnow().isoformat(),  # Should be calculated based on experiment type
        researcher=request.researcher,
        equipment=request.equipment,
        parameters=request.parameters,
        notes=request.notes,
        progress=0.0
    )
    
    experiments_db[experiment_id] = experiment
    logger.info(f"Created experiment: {experiment_id}")
    
    return experiment


@router.put("/experiments/{experiment_id}/status")
async def update_experiment_status(
    experiment_id: str,
    status: ExperimentStatus
):
    """Update experiment status"""
    if experiment_id not in experiments_db:
        raise HTTPException(status_code=404, detail="Experiment not found")
    
    experiment = experiments_db[experiment_id]
    old_status = experiment.status
    experiment.status = status
    
    # Handle status transitions
    if status == ExperimentStatus.IN_PROGRESS and old_status == ExperimentStatus.PENDING:
        # Start using equipment
        for equipment_id in experiment.equipment:
            if equipment_id in equipment_db:
                equipment = equipment_db[equipment_id]
                if equipment.status == EquipmentStatus.IDLE:
                    equipment.status = EquipmentStatus.RUNNING
                    equipment.progress = 0.0
    
    elif status in [ExperimentStatus.COMPLETED, ExperimentStatus.CANCELLED, ExperimentStatus.FAILED]:
        # Free up equipment
        for equipment_id in experiment.equipment:
            if equipment_id in equipment_db:
                equipment = equipment_db[equipment_id]
                equipment.status = EquipmentStatus.IDLE
                equipment.progress = 0.0
    
    logger.info(f"Updated experiment {experiment_id} status from {old_status} to {status}")
    
    return {
        "status": "success",
        "experiment_id": experiment_id,
        "old_status": old_status,
        "new_status": status
    }


@router.get("/experiments/{experiment_id}/logs")
async def get_experiment_logs(
    experiment_id: str,
    limit: int = Query(default=50, ge=1, le=500)
):
    """Get logs for a specific experiment"""
    if experiment_id not in experiments_db:
        raise HTTPException(status_code=404, detail="Experiment not found")
    
    # Generate some sample logs
    logs = []
    for i in range(min(limit, 10)):
        logs.append({
            "timestamp": datetime.utcnow().isoformat(),
            "level": "info" if i % 3 != 0 else "warning",
            "message": f"Experiment step {i+1} completed",
            "details": {
                "temperature": 37.0 + random.uniform(-0.5, 0.5),
                "ph": 7.4 + random.uniform(-0.1, 0.1)
            }
        })
    
    return {
        "experiment_id": experiment_id,
        "logs": logs,
        "total_logs": len(logs)
    }


@router.get("/laboratory/status")
async def get_laboratory_status():
    """Get overall laboratory status and metrics"""
    equipment_list = list(equipment_db.values())
    experiments_list = list(experiments_db.values())
    
    return {
        "equipment": {
            "total": len(equipment_list),
            "online": len([e for e in equipment_list if e.status != EquipmentStatus.MAINTENANCE]),
            "running": len([e for e in equipment_list if e.status == EquipmentStatus.RUNNING]),
            "idle": len([e for e in equipment_list if e.status == EquipmentStatus.IDLE]),
            "maintenance": len([e for e in equipment_list if e.status == EquipmentStatus.MAINTENANCE])
        },
        "experiments": {
            "total": len(experiments_list),
            "active": len([e for e in experiments_list if e.status == ExperimentStatus.IN_PROGRESS]),
            "pending": len([e for e in experiments_list if e.status == ExperimentStatus.PENDING]),
            "completed": len([e for e in experiments_list if e.status == ExperimentStatus.COMPLETED])
        },
        "environment": {
            "temperature": 22.5 + random.uniform(-0.5, 0.5),
            "humidity": 45 + random.uniform(-2, 2),
            "air_quality": "Good"
        }
    }