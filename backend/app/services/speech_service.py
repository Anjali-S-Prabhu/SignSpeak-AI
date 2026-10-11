"""
Speech Service — converts text to speech using pyttsx3.
Runs TTS in a background thread to avoid blocking the event loop.
Prevents duplicate speech for the same text.
"""
import threading
from app.utils.logger import get_logger

logger = get_logger(__name__)

_last_spoken: str = ""
_engine = None
_lock = threading.Lock()


def _get_engine():
    """Lazy-initialize pyttsx3 engine (thread-safe)."""
    global _engine
    if _engine is None:
        try:
            import pyttsx3  # type: ignore
            _engine = pyttsx3.init()
            _engine.setProperty("rate", 150)    # words per minute
            _engine.setProperty("volume", 1.0)  # 0.0 – 1.0
            logger.info("[SpeechService] pyttsx3 engine initialized")
        except Exception as exc:
            logger.warning(f"[SpeechService] Could not init pyttsx3: {exc}")
    return _engine


def speak(text: str) -> bool:
    """
    Speak the given text asynchronously.
    Skips if the same text was just spoken.
    
    Returns:
        True if speech was triggered, False otherwise
    """
    global _last_spoken

    text = text.strip()
    if not text:
        return False

    if text == _last_spoken:
        logger.debug("[SpeechService] Skipping duplicate speech")
        return False

    _last_spoken = text

    def _speak_thread():
        with _lock:
            engine = _get_engine()
            if engine is None:
                logger.error("[SpeechService] TTS engine unavailable")
                return
            try:
                engine.say(text)
                engine.runAndWait()
                logger.info(f"[SpeechService] Spoke: '{text}'")
            except Exception as exc:
                logger.error(f"[SpeechService] Speech error: {exc}")

    t = threading.Thread(target=_speak_thread, daemon=True)
    t.start()
    return True


def stop_speaking():
    """Stop any ongoing speech."""
    engine = _get_engine()
    if engine:
        try:
            engine.stop()
        except Exception:
            pass
