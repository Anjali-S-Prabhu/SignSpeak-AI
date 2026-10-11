"""
Model Loader — safely loads gesture_model.keras.
Returns None if the model file is missing, without crashing the server.
"""
import os
from pathlib import Path
from typing import Optional

from app.config.settings import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)

# Singleton model instance
_model = None
_label_encoder = None
_model_loaded: bool = False


def load_model():
    """
    Attempt to load the Keras model and label encoder.
    Sets module-level _model, _label_encoder, and _model_loaded flags.
    Safe — never raises; logs warnings if files are missing.
    """
    global _model, _label_encoder, _model_loaded

    model_path = Path(settings.model_path)
    if not model_path.exists():
        logger.warning(
            f"[ModelLoader] Model file not found at '{model_path}'. "
            "Running in demo mode — predictions will be random."
        )
        _model = None
        _label_encoder = None
        _model_loaded = False
        return

    try:
        # Lazy import to avoid startup overhead if TF is slow
        import tensorflow as tf  # type: ignore
        import pickle
        
        _model = tf.keras.models.load_model(str(model_path))
        
        encoder_path = model_path.parent / "label_encoder.pkl"
        if encoder_path.exists():
            with open(encoder_path, "rb") as f:
                _label_encoder = pickle.load(f)
            logger.info(f"[ModelLoader] Label encoder loaded successfully from '{encoder_path}'")
        else:
            logger.warning(f"[ModelLoader] Label encoder not found at '{encoder_path}'. Standard mapping will be used.")
            _label_encoder = None
            
        _model_loaded = True
        logger.info(f"[ModelLoader] Model loaded successfully from '{model_path}'")
    except Exception as exc:
        logger.error(f"[ModelLoader] Failed to load model: {exc}")
        _model = None
        _label_encoder = None
        _model_loaded = False


def get_model():
    """Return the loaded Keras model instance, or None."""
    return _model


def get_label_encoder():
    """Return the loaded scikit-learn LabelEncoder instance, or None."""
    return _label_encoder


def is_model_loaded() -> bool:
    """Return True if the model is available for inference."""
    return _model_loaded
