"""POST /speak — convert text to speech via pyttsx3."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.speech_service import speak, stop_speaking
from app.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter()


class SpeakRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=500, description="Text to speak")


class SpeakResponse(BaseModel):
    success: bool
    message: str


@router.post("", response_model=SpeakResponse)
async def speak_text(request: SpeakRequest):
    """
    Trigger TTS for the given text using pyttsx3.
    Runs in a background thread; returns immediately.
    """
    text = request.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text cannot be empty")

    triggered = speak(text)
    return SpeakResponse(
        success=triggered,
        message="Speaking" if triggered else "Skipped (duplicate or muted)",
    )


@router.delete("")
async def stop_speech():
    """Stop any ongoing TTS playback."""
    stop_speaking()
    return {"message": "Speech stopped"}
