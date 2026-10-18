import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.app.core.config import settings
from backend.app.api.v1.api import api_router

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("disasterpulse_rag")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup event
    logger.info("==================================================")
    logger.info("🚀 DisasterPulse RAG Backend API is starting up...")
    logger.info(f"   Environment : {settings.ENVIRONMENT}")
    logger.info(f"   LLM Model   : {settings.LLM_MODEL}")
    logger.info(f"   Docs URL    : http://localhost:8000/docs")
    logger.info("==================================================")
    yield
    # Shutdown event
    logger.info("🛑 DisasterPulse RAG Backend API is shutting down...")


app = FastAPI(
    title="DisasterPulse RAG API",
    description="Sistem RAG Tergrounding untuk Intelijen Tanggap Darurat Bencana & Survei BPS dengan Google Gemini & PostgreSQL pgvector",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Setup CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Daftarkan Router v1
app.include_router(api_router, prefix="/api/v1")


@app.get(
    "/health",
    tags=["Health"],
    summary="Health Check API",
    status_code=status.HTTP_200_OK
)
async def health_check():
    return {
        "status": "healthy",
        "service": "DisasterPulse RAG API",
        "version": "1.0.0",
        "llm_model": settings.LLM_MODEL,
        "environment": settings.ENVIRONMENT
    }


@app.get(
    "/",
    tags=["Root"],
    include_in_schema=False
)
async def root():
    return JSONResponse(
        content={
            "message": "Selamat datang di DisasterPulse RAG API",
            "docs": "/docs",
            "health": "/health"
        }
    )
