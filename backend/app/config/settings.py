from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    debug: bool = True

    # CORS
    cors_origins: List[str] = [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
    ]

    # Model
    model_path: str = "trained_models/gesture_model.keras"

    # Gesture labels (from Roboflow dataset)
    gesture_labels: List[str] = [
        "angry", "aunt", "big", "boy", "brother", "busy", "can", "cat", "cry", "day", 
        "drink", "eat", "excuse", "excuse me", "father", "finish", "forget", "girl", 
        "good", "grandma", "grandpa", "happy", "hello", "help", "home", "how", 
        "i don't know", "i don-t know", "i know", "i love you", "i understand", 
        "iam fine", "like", "love", "me", "meet", "more", "mother", "name", "need", 
        "nice", "night", "no", "not", "please", "sad", "same", "sister", "so-so", 
        "sorry", "stop", "thankyou", "uncle", "what's up", "what-s up", "wrong", 
        "yes", "you"
    ]

    # Confidence threshold for valid prediction
    confidence_threshold: float = 0.60

    # History persistence
    history_file: str = "history.json"

    model_config = {
        "protected_namespaces": (),
        "env_file": ".env",
        "env_file_encoding": "utf-8",
    }


settings = Settings()
