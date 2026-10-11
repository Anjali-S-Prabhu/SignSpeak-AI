"""POST /detect — receive MediaPipe landmarks and return gesture prediction."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional

from app.services.gesture_service import predict_gesture
from app.services.history_service import add_record
from app.ai.model_loader import is_model_loaded
from app.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter()


class DetectRequest(BaseModel):
    landmarks: List[float] = Field(
        ...,
        description="Flat array of 63 floats: 21 landmarks × (x, y, z)",
        min_length=63,
        max_length=63,
    )
    sentence: Optional[str] = Field(None, description="Current accumulated sentence for history")


class DetectResponse(BaseModel):
    gesture: str
    confidence: float
    prediction_time_ms: float
    model_loaded: bool


@router.post("", response_model=DetectResponse)
async def detect_gesture(request: DetectRequest):
    """
    Accepts 63-value landmark array from the browser (MediaPipe output).
    Returns the predicted gesture with confidence score.
    """
    if len(request.landmarks) != 63:
        raise HTTPException(status_code=422, detail="landmarks must have exactly 63 values (21 × x,y,z)")
        
    import math
    if any(math.isnan(v) or math.isinf(v) for v in request.landmarks):
        raise HTTPException(status_code=422, detail="Landmarks contain NaN or Infinity")
        
    if all(v == 0 for v in request.landmarks):
        raise HTTPException(status_code=422, detail="Landmarks cannot be all zeros")

    gesture, confidence, pred_time = predict_gesture(request.landmarks)

    # Persist to history if confidence is sufficient
    if confidence >= 0.6:
        add_record(gesture, confidence, request.sentence)

    return DetectResponse(
        gesture=gesture,
        confidence=confidence,
        prediction_time_ms=pred_time,
        model_loaded=is_model_loaded(),
    )
