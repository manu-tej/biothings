"""
BioThings Configuration
Centralized configuration management
"""
import os
from typing import Dict, Any
from pydantic import BaseSettings


class Settings(BaseSettings):
    """Application settings"""
    
    # API Configuration
    api_title: str = "BioThings AI Platform"
    api_version: str = "2.0.0"
    api_description: str = "AI-powered biotech company simulation with Gemini 2.5"
    
    # Server Configuration
    host: str = "0.0.0.0"
    port: int = 8000
    reload: bool = True
    
    # Gemini Configuration
    google_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash"
    gemini_thinking_budget: int = 8192
    
    # Redis Configuration (optional)
    redis_url: str = "redis://localhost:6379"
    use_redis: bool = False
    
    # CORS Configuration
    cors_origins: list = ["http://localhost:3000", "http://localhost:3001"]
    
    # Agent Configuration
    agent_response_timeout: int = 30
    max_conversation_history: int = 20
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


# Global settings instance
settings = Settings()


def get_agent_config(agent_type: str) -> Dict[str, Any]:
    """Get configuration for specific agent type"""
    configs = {
        "CEO": {
            "thinking_budget": 16384,  # Higher for strategic thinking
            "temperature": 0.8,
            "max_tokens": 2048
        },
        "CSO": {
            "thinking_budget": 12288,
            "temperature": 0.7,
            "max_tokens": 2048
        },
        "CFO": {
            "thinking_budget": 8192,
            "temperature": 0.6,
            "max_tokens": 1536
        },
        "CTO": {
            "thinking_budget": 10240,
            "temperature": 0.7,
            "max_tokens": 1536
        },
        "COO": {
            "thinking_budget": 8192,
            "temperature": 0.7,
            "max_tokens": 1536
        }
    }
    
    return configs.get(agent_type, {
        "thinking_budget": settings.gemini_thinking_budget,
        "temperature": 0.7,
        "max_tokens": 1536
    })