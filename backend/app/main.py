import logging
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles          # ← NEW

from app.routes import upload, query
from app.routes.auth import router as auth_router
from app.routes import serve_pdf                     # ← NEW
from app.config import settings
from app.services.database import connect_db, close_db

# ── Logging ───────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

# ── App ───────────────────────────────────────────────────────
app = FastAPI(
    title="Synexa RAG API",
    description=(
        "Per-document RAG with JWT auth, MongoDB chat history, "
        "FAISS retrieval, and strict no-hallucination mode."
    ),
    version="3.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ──────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Lifecycle ─────────────────────────────────────────────────
@app.on_event("startup")
async def startup_event():
    os.makedirs(settings.DOCUMENTS_DIR,   exist_ok=True)
    os.makedirs(settings.VECTORSTORE_DIR, exist_ok=True)
    # Ensure converted-PDF subdir exists so StaticFiles doesn't error
    os.makedirs(os.path.join(settings.DOCUMENTS_DIR, "converted"), exist_ok=True)

    try:
        await connect_db()
        logger.info("MongoDB connected — auth + chat history enabled.")
    except Exception as e:
        logger.warning(f"MongoDB unavailable: {e}. Auth will not work.")

    logger.info("=" * 60)
    logger.info("Synexa RAG Backend v3 started.")
    logger.info(f"  LLM Provider   : {settings.LLM_PROVIDER}")
    logger.info(f"  Embedding Model: {settings.EMBEDDING_MODEL}")
    logger.info(f"  Documents Dir  : {settings.DOCUMENTS_DIR}")
    logger.info(f"  VectorStore    : {settings.VECTORSTORE_DIR}/<user>/<doc>/")
    logger.info(f"  Static files   : /files  →  {settings.DOCUMENTS_DIR}")
    logger.info("  API Docs       : http://127.0.0.1:8000/docs")
    logger.info("=" * 60)


@app.on_event("shutdown")
async def shutdown_event():
    await close_db()


# ── Routers ───────────────────────────────────────────────────
app.include_router(auth_router)          # /auth/signup  /auth/login
app.include_router(upload.router)        # /upload
app.include_router(query.router)         # /ask
app.include_router(serve_pdf.router)     # /document/{id}/pdf  ← NEW


# ── Static file serving ───────────────────────────────────────
# Serves the raw uploaded files AND converted PDFs.
# URL: /files/<filename>  →  data/documents/<filename>
# URL: /files/converted/<user>/<doc>/<file>.pdf
#
# NOTE: mount() must come AFTER include_router() so FastAPI
# matches API routes before falling through to static files.
app.mount(
    "/files",
    StaticFiles(directory=settings.DOCUMENTS_DIR),
    name="files",
)


# ── Health ────────────────────────────────────────────────────
@app.get("/", tags=["Health"])
async def root():
    return {
        "status":  "online",
        "version": "3.0.0",
        "message": "Synexa RAG API — visit /docs",
    }


@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "healthy"}
