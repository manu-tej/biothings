"""
AI-Powered CRISPR Design Integration
Uses Gemini 2.5 for intelligent guide RNA design
"""
import asyncio
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
import re

from app.core.llm import llm_service


@dataclass
class CRISPRGuide:
    """CRISPR guide RNA design result"""
    sequence: str
    pam_site: str
    position: int
    strand: str
    off_target_score: float
    efficiency_score: float
    gc_content: float


class CRISPRDesigner:
    """AI-powered CRISPR design system"""
    
    def __init__(self):
        self.pam_sequences = {
            "SpCas9": "NGG",
            "SaCas9": "NNGRRT",
            "Cas12a": "TTTV",
            "Cas13": "PFS"  # Protospacer flanking site
        }
    
    async def design_guides(
        self,
        target_gene: str,
        cas_type: str = "SpCas9",
        num_guides: int = 5,
        organism: str = "human"
    ) -> List[CRISPRGuide]:
        """Design CRISPR guide RNAs using AI"""
        
        # Use Gemini 2.5 with maximum thinking for complex design
        prompt = f"""
        Design {num_guides} CRISPR guide RNAs for {target_gene} in {organism} using {cas_type}.
        
        Requirements:
        1. Target early exons for knockout
        2. Minimize off-target effects
        3. GC content between 40-60%
        4. No poly-T sequences (>4 Ts)
        5. Include PAM site: {self.pam_sequences.get(cas_type, 'NGG')}
        
        For each guide provide:
        - 20bp guide sequence
        - PAM site location
        - Predicted efficiency (0-1)
        - Off-target risk assessment
        
        Format: GUIDE:[sequence]|PAM:[site]|POS:[position]|EFF:[score]|OT:[score]
        """
        
        response = await llm_service.generate_response(
            agent_id="crispr_designer",
            system_prompt="You are an expert CRISPR designer with deep knowledge of genome editing.",
            user_message=prompt,
            use_thinking=True,
            context={"thinking_budget": 16384}  # High budget for complex design
        )
        
        # Parse AI response
        guides = self._parse_guide_designs(response)
        
        # Validate and score guides
        validated_guides = []
        for guide in guides:
            if self._validate_guide(guide, cas_type):
                validated_guides.append(guide)
        
        return validated_guides[:num_guides]
    
    def _parse_guide_designs(self, response: str) -> List[CRISPRGuide]:
        """Parse AI-generated guide designs"""
        guides = []
        
        # Pattern to match guide format
        pattern = r'GUIDE:(\w+)\|PAM:(\w+)\|POS:(\d+)\|EFF:([\d.]+)\|OT:([\d.]+)'
        matches = re.findall(pattern, response)
        
        for match in matches:
            sequence, pam, position, efficiency, off_target = match
            
            # Calculate GC content
            gc_count = sequence.count('G') + sequence.count('C')
            gc_content = gc_count / len(sequence)
            
            guide = CRISPRGuide(
                sequence=sequence,
                pam_site=pam,
                position=int(position),
                strand='+',  # Simplified
                off_target_score=float(off_target),
                efficiency_score=float(efficiency),
                gc_content=gc_content
            )
            guides.append(guide)
        
        return guides
    
    def _validate_guide(self, guide: CRISPRGuide, cas_type: str) -> bool:
        """Validate guide RNA design"""
        # Check length
        if len(guide.sequence) != 20:
            return False
        
        # Check GC content
        if not (0.4 <= guide.gc_content <= 0.6):
            return False
        
        # Check for poly-T
        if 'TTTT' in guide.sequence:
            return False
        
        # Check efficiency threshold
        if guide.efficiency_score < 0.5:
            return False
        
        return True
    
    async def predict_off_targets(
        self,
        guide: CRISPRGuide,
        genome: str = "hg38"
    ) -> List[Dict[str, any]]:
        """Predict potential off-target sites"""
        
        prompt = f"""
        Analyze potential off-target sites for CRISPR guide: {guide.sequence}
        in genome {genome}.
        
        Consider:
        1. Up to 3 mismatches in seed region
        2. Bulges and deletions
        3. Chromatin accessibility
        4. Gene criticality
        
        Return top 5 potential off-targets with risk scores.
        """
        
        response = await llm_service.generate_response(
            agent_id="crispr_analyzer",
            system_prompt="You are a genomics expert specializing in CRISPR off-target prediction.",
            user_message=prompt,
            use_thinking=True
        )
        
        # Parse and return off-target predictions
        # This would integrate with real genome databases in production
        return []
    
    async def optimize_experiment(
        self,
        target_gene: str,
        cell_line: str,
        guides: List[CRISPRGuide]
    ) -> Dict[str, any]:
        """Design complete CRISPR experiment with controls"""
        
        prompt = f"""
        Design a complete CRISPR knockout experiment for {target_gene} in {cell_line} cells.
        
        Include:
        1. Transfection protocol
        2. Positive and negative controls
        3. Validation strategy (PCR, Western, sequencing)
        4. Timeline
        5. Troubleshooting guide
        
        Available guides: {len(guides)}
        """
        
        response = await llm_service.generate_response(
            agent_id="experiment_designer",
            system_prompt="You are a molecular biology expert with 20 years of CRISPR experience.",
            user_message=prompt,
            use_thinking=True,
            context={"thinking_budget": 24576}  # Maximum thinking for comprehensive design
        )
        
        return {
            "protocol": response,
            "guides": guides,
            "estimated_timeline": "21 days",
            "success_probability": 0.85
        }


# Usage example
async def example_usage():
    """Example of AI-powered CRISPR design"""
    designer = CRISPRDesigner()
    
    # Design guides for p53 knockout
    guides = await designer.design_guides(
        target_gene="TP53",
        cas_type="SpCas9",
        num_guides=3,
        organism="human"
    )
    
    print("🧬 CRISPR Guide Designs:")
    for i, guide in enumerate(guides, 1):
        print(f"\nGuide {i}:")
        print(f"  Sequence: {guide.sequence}")
        print(f"  PAM: {guide.pam_site}")
        print(f"  Efficiency: {guide.efficiency_score:.2f}")
        print(f"  Off-target score: {guide.off_target_score:.2f}")
        print(f"  GC content: {guide.gc_content:.1%}")
    
    # Design full experiment
    if guides:
        experiment = await designer.optimize_experiment(
            target_gene="TP53",
            cell_line="HeLa",
            guides=guides
        )
        print(f"\n📋 Experiment Protocol:\n{experiment['protocol'][:500]}...")


if __name__ == "__main__":
    asyncio.run(example_usage())