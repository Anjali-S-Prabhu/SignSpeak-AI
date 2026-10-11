"""
Gesture Service — runs model inference on landmark arrays.
Falls back to demo mode (random predictions) if model is not loaded.
"""
import time
import random
import numpy as np
from typing import Tuple

from app.ai.model_loader import get_model, is_model_loaded, get_label_encoder
from app.ai.preprocessor import preprocess_landmarks
from app.config.settings import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)

DEMO_GESTURES = list("ABCDEFGHIJKLMNOPQRSTUVWXYZ")


def predict_gesture(landmarks: list[float]) -> Tuple[str, float, float]:
    """
    Predict gesture from 63-value landmark array.
    
    Args:
        landmarks: Flat list of 63 floats (21 landmarks × x,y,z)

    Returns:
        Tuple of (gesture_label, confidence, prediction_time_ms)
    """
    t_start = time.perf_counter()

    if not is_model_loaded():
        # Demo mode — return a stable random prediction
        seed = int(sum(landmarks[:5]) * 1000) % len(DEMO_GESTURES)
        gesture = DEMO_GESTURES[seed]
        confidence = round(random.uniform(0.55, 0.92), 3)
        pred_time = round((time.perf_counter() - t_start) * 1000, 2)
        logger.debug(f"[GestureService] Demo prediction: {gesture} ({confidence:.2f})")
        return gesture, confidence, pred_time

    try:
        model = get_model()
        encoder = get_label_encoder()
        input_tensor = preprocess_landmarks(landmarks)
        predictions = model.predict(input_tensor, verbose=0)  # type: ignore
        class_idx = int(np.argmax(predictions[0]))
        confidence = float(predictions[0][class_idx])
        
        if encoder:
            gesture = str(encoder.inverse_transform([class_idx])[0])
        else:
            gesture = settings.gesture_labels[class_idx] if class_idx < len(settings.gesture_labels) else "UNKNOWN"
            
        pred_time = round((time.perf_counter() - t_start) * 1000, 2)
        logger.debug(f"[GestureService] Prediction: {gesture} ({confidence:.3f}) in {pred_time}ms")
        return gesture, confidence, pred_time
    except Exception as exc:
        logger.error(f"[GestureService] Prediction error: {exc}")
        return "ERROR", 0.0, 0.0
