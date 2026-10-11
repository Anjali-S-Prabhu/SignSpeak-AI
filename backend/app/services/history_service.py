"""
History Service — stores prediction records in memory and persists to JSON.
"""
import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import List, Optional

from app.config.settings import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)

_history: List[dict] = []


def _load_from_disk():
    """Load persisted history from JSON file on startup."""
    global _history
    path = Path(settings.history_file)
    if path.exists():
        try:
            _history = json.loads(path.read_text(encoding="utf-8"))
            logger.info(f"[HistoryService] Loaded {len(_history)} records from disk")
        except Exception as exc:
            logger.warning(f"[HistoryService] Could not load history: {exc}")
            _history = []


def _save_to_disk():
    """Persist current history to JSON file."""
    try:
        path = Path(settings.history_file)
        path.write_text(json.dumps(_history, indent=2), encoding="utf-8")
    except Exception as exc:
        logger.warning(f"[HistoryService] Could not save history: {exc}")


# Load on import
_load_from_disk()


def add_record(gesture: str, confidence: float, sentence: Optional[str] = None) -> dict:
    """Add a new prediction record and persist."""
    record = {
        "id": str(uuid.uuid4()),
        "gesture": gesture,
        "confidence": round(confidence, 4),
        "timestamp": datetime.utcnow().isoformat(),
        "sentence": sentence,
    }
    _history.insert(0, record)
    # Keep max 500 records
    if len(_history) > 500:
        _history.pop()
    _save_to_disk()
    return record


def get_all() -> List[dict]:
    """Return all history records (newest first)."""
    return list(_history)


def clear_all():
    """Clear all history records."""
    global _history
    _history = []
    _save_to_disk()
    logger.info("[HistoryService] History cleared")
