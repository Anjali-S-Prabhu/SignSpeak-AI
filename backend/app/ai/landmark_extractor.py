"""
Landmark Extractor — server-side MediaPipe hand detection.
Used as a fallback when the client cannot run MediaPipe (e.g., no WebGL).
The primary path is client-side MediaPipe → send landmarks to /detect.
"""
from typing import Optional, List
import numpy as np

from app.utils.logger import get_logger

logger = get_logger(__name__)

_hands = None


def get_hands_detector():
    """Lazy-initialize MediaPipe Hands on the server."""
    global _hands
    if _hands is None:
        try:
            import mediapipe as mp  # type: ignore
            mp_hands = mp.solutions.hands
            _hands = mp_hands.Hands(
                static_image_mode=False,
                max_num_hands=1,
                model_complexity=1,
                min_detection_confidence=0.7,
                min_tracking_confidence=0.5,
            )
            logger.info("[LandmarkExtractor] MediaPipe Hands initialized")
        except ImportError:
            logger.warning("[LandmarkExtractor] MediaPipe not installed; server-side extraction unavailable")
    return _hands


def extract_landmarks_from_frame(frame_bgr: np.ndarray) -> Optional[List[float]]:
    """
    Run MediaPipe on a BGR frame and return flat landmark list (63 values).
    Returns None if no hand is detected.
    
    Args:
        frame_bgr: OpenCV BGR frame

    Returns:
        List of 63 floats or None
    """
    import cv2
    hands = get_hands_detector()
    if hands is None:
        return None

    frame_rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
    frame_rgb.flags.writeable = False
    results = hands.process(frame_rgb)
    frame_rgb.flags.writeable = True

    if not results.multi_hand_landmarks:
        return None

    hand_lms = results.multi_hand_landmarks[0]
    return [coord for lm in hand_lms.landmark for coord in (lm.x, lm.y, lm.z)]
