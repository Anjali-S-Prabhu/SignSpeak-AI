"""GET/DELETE /history — retrieve and clear prediction history."""
from fastapi import APIRouter
from typing import List, Optional
from pydantic import BaseModel

from app.services.history_service import get_all, clear_all
from app.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter()


class HistoryRecord(BaseModel):
    id: str
    gesture: str
    confidence: float
    timestamp: str
    sentence: Optional[str] = None


@router.get("", response_model=List[HistoryRecord])
async def get_history():
    """Return all prediction history records, newest first."""
    return get_all()


@router.delete("")
async def clear_history():
    """Clear all prediction history."""
    clear_all()
    return {"message": "History cleared", "count": 0}
