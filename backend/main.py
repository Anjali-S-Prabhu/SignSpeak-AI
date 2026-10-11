"""
SignSpeak AI — FastAPI Backend Entry Point
Run with: uvicorn main:app --reload --port 8000
"""
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config.settings import settings
from app.routers import health, camera, detect, speak, history
from app.utils.logger import get_logger

logger = get_logger(__name__)

# =====================================================
# APP FACTORY
# =====================================================

app = FastAPI(
    title="SignSpeak AI API",
    description="Real-time sign language detection backend powered by MediaPipe & TensorFlow",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# =====================================================
# CORS — allow frontend dev server
# =====================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =====================================================
# ROUTERS
# =====================================================

app.include_router(health.router, prefix="", tags=["Health"])
app.include_router(camera.router, prefix="/camera", tags=["Camera"])
app.include_router(detect.router, prefix="/detect", tags=["Detection"])
app.include_router(speak.router, prefix="/speak", tags=["Speech"])
app.include_router(history.router, prefix="/history", tags=["History"])


# =====================================================
# STARTUP / SHUTDOWN EVENTS
# =====================================================

@app.on_event("startup")
async def on_startup():
    logger.info("SignSpeak AI backend starting up…")
    # Pre-load model on startup (non-blocking attempt)
    from app.ai.model_loader import load_model
    load_model()


@app.on_event("shutdown")
async def on_shutdown():
    logger.info("SignSpeak AI backend shutting down…")


# =====================================================
# ENTRYPOINT
# =====================================================

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        log_level="info",
    )
