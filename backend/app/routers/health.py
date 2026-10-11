"""GET /health — server and model health check."""
from fastapi import APIRouter
from pydantic import BaseModel

from app.ai.model_loader import is_model_loaded

router = APIRouter()


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    version: str


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """
    Returns server status and whether the gesture model is loaded.
    Frontend uses this to show 'Model not loaded' warning.
    """
    return HealthResponse(
        status="ok",
        model_loaded=is_model_loaded(),
        version="1.0.0",
    )
