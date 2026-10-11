"""GET /camera — list available camera devices (server-side info)."""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import List

router = APIRouter()


class CameraInfo(BaseModel):
    message: str
    note: str


@router.get("", response_model=CameraInfo)
async def camera_info():
    """
    Informational endpoint.
    Camera access is handled entirely client-side via WebRTC/getUserMedia.
    This endpoint confirms the backend is ready to receive frames.
    """
    return CameraInfo(
        message="Camera access is handled in the browser via getUserMedia.",
        note="Send detected landmarks to POST /detect for gesture recognition.",
    )
