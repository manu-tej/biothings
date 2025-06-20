from langchain.tools import BaseTool
from typing import Optional, Type
from pydantic import BaseModel, Field
import random
from datetime import datetime, timedelta


class EquipmentStatusInput(BaseModel):
    equipment_id: str = Field(description="The ID of the equipment to check")


class EquipmentStatusTool(BaseTool):
    name = "check_equipment_status"
    description = "Check the current status and availability of laboratory equipment"
    args_schema: Type[BaseModel] = EquipmentStatusInput
    
    def _run(self, equipment_id: str) -> str:
        """Check equipment status"""
        # Simulate equipment status check
        equipment_db = {
            "pcr-001": {
                "name": "PCR Thermocycler #1",
                "status": "available",
                "last_maintenance": "2025-01-15",
                "next_calibration": "2025-02-15"
            },
            "centrifuge-001": {
                "name": "High-Speed Centrifuge #1",
                "status": "in_use",
                "current_user": "Lab Tech Alpha",
                "available_at": (datetime.utcnow() + timedelta(hours=2)).isoformat()
            },
            "microscope-001": {
                "name": "Fluorescence Microscope #1",
                "status": "maintenance",
                "expected_ready": "2025-01-22"
            }
        }
        
        if equipment_id in equipment_db:
            equipment = equipment_db[equipment_id]
            return f"Equipment: {equipment['name']}\nStatus: {equipment['status']}\n" + \
                   "\n".join([f"{k}: {v}" for k, v in equipment.items() if k not in ['name', 'status']])
        else:
            return f"Equipment {equipment_id} not found in database"
    
    async def _arun(self, equipment_id: str) -> str:
        """Async version"""
        return self._run(equipment_id)


class ExperimentProtocolInput(BaseModel):
    experiment_type: str = Field(description="Type of experiment (e.g., PCR, Western Blot, Cell Culture)")


class ExperimentProtocolTool(BaseTool):
    name = "get_experiment_protocol"
    description = "Retrieve standard operating procedures for common experiments"
    args_schema: Type[BaseModel] = ExperimentProtocolInput
    
    def _run(self, experiment_type: str) -> str:
        """Get experiment protocol"""
        protocols = {
            "PCR": """Standard PCR Protocol:
1. Prepare reaction mix (25μL total):
   - 12.5μL 2X PCR Master Mix
   - 1μL Forward primer (10μM)
   - 1μL Reverse primer (10μM)
   - 1μL Template DNA (10-100ng)
   - 9.5μL Nuclease-free water

2. PCR cycling conditions:
   - Initial denaturation: 95°C for 3 min
   - 35 cycles of:
     * Denaturation: 95°C for 30 sec
     * Annealing: 55-65°C for 30 sec
     * Extension: 72°C for 1 min/kb
   - Final extension: 72°C for 5 min
   - Hold at 4°C

3. Verify product by gel electrophoresis""",
            
            "Cell Culture": """Cell Culture Maintenance Protocol:
1. Check cells daily for:
   - Confluency (passage at 70-80%)
   - Contamination signs
   - Media color change

2. Media change (every 2-3 days):
   - Warm media to 37°C
   - Aspirate old media
   - Add fresh media gently

3. Passaging cells:
   - Remove media
   - Wash with PBS
   - Add trypsin, incubate 5 min at 37°C
   - Neutralize with media
   - Centrifuge and resuspend
   - Plate at appropriate density"""
        }
        
        protocol = protocols.get(experiment_type.upper(), 
                                f"Protocol for {experiment_type} not found. Available protocols: {', '.join(protocols.keys())}")
        
        return protocol
    
    async def _arun(self, experiment_type: str) -> str:
        """Async version"""
        return self._run(experiment_type)


class InventoryCheckInput(BaseModel):
    item_name: str = Field(description="Name of the inventory item to check")


class InventoryCheckTool(BaseTool):
    name = "check_inventory"
    description = "Check the current stock levels of laboratory supplies and reagents"
    args_schema: Type[BaseModel] = InventoryCheckInput
    
    def _run(self, item_name: str) -> str:
        """Check inventory levels"""
        # Simulate inventory database
        inventory = {
            "pipette tips": {"quantity": 5000, "unit": "units", "reorder_level": 1000, "status": "adequate"},
            "cell culture media": {"quantity": 10, "unit": "L", "reorder_level": 5, "status": "adequate"},
            "fbs": {"quantity": 2, "unit": "L", "reorder_level": 5, "status": "low"},
            "ethanol": {"quantity": 20, "unit": "L", "reorder_level": 10, "status": "adequate"},
            "primers": {"quantity": 50, "unit": "nmol", "reorder_level": 20, "status": "adequate"}
        }
        
        item_lower = item_name.lower()
        for key, value in inventory.items():
            if item_lower in key:
                return f"Item: {key}\nQuantity: {value['quantity']} {value['unit']}\n" + \
                       f"Status: {value['status']}\nReorder level: {value['reorder_level']} {value['unit']}"
        
        return f"Item '{item_name}' not found in inventory"
    
    async def _arun(self, item_name: str) -> str:
        """Async version"""
        return self._run(item_name)


# Export available tools
LAB_TOOLS = [
    EquipmentStatusTool(),
    ExperimentProtocolTool(),
    InventoryCheckTool()
]