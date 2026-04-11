import logging
import os
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends

from app.config import settings
from app.models.response_models import UploadResponse
from app.services.file_loader import load_document, is_supported_file
from app.services.chunking import chunk_documents
from app.services.vector_store import add_documents_to_vectorstore
from app.utils.helpers import save_upload_file, get_supported_extensions_str
from app.services.auth import get_current_user
from app.services.pdf_converter import convert_to_pdf, is_convertible

logger = logging.getLogger(__name__)
router = APIRouter()

CONVERTED_DIR = os.path.join(settings.DOCUMENTS_DIR, "converted")

_BASE_URL = os.getenv("API_BASE_URL", "http://127.0.0.1:8000")


def _file_url(relative_to_docs_dir: str) -> str:
    docs_dir = os.path.abspath(settings.DOCUMENTS_DIR)
    abs_path = os.path.abspath(relative_to_docs_dir)
    rel = os.path.relpath(abs_path, docs_dir)
    rel = rel.replace("\\", "/")
    return f"{_BASE_URL}/files/{rel}"


@router.post(
    "/upload",
    response_model=UploadResponse,
    summary="Upload and index a document",
    description=(
        "Upload a PDF, DOCX, or TXT file. Requires JWT auth. "
        "Returns document_id + chat_id + file_url (+ pdf_url for DOCX/TXT). "
        "Use chat_id in POST /ask."
    ),
    tags=["Documents"],
)
async def upload_document(
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user),
):
    filename = file.filename or "unknown"
    document_id = "doc_" + uuid.uuid4().hex[:12]

    if not is_supported_file(filename):
        raise HTTPException(
            status_code=400,
            detail=(
                f"Unsupported file type: '{filename}'. "
                f"Accepted: {get_supported_extensions_str()}"
            ),
        )

    logger.info(f"[Upload] user='{user_id}' doc='{document_id}' file='{filename}'")

    try:
        file_bytes = await file.read()
        if not file_bytes:
            raise HTTPException(status_code=400, detail="Uploaded file is empty.")

        saved_path, original_filename = save_upload_file(
            upload_file_bytes=file_bytes,
            filename=filename,
            documents_dir=settings.DOCUMENTS_DIR,
        )

        raw_file_url = _file_url(saved_path)
        logger.info(f"[Upload] Raw file URL: {raw_file_url}")

        pdf_path: str | None = None
        pdf_url: str | None = None

        if is_convertible(original_filename):
            try:
                user_converted_dir = os.path.join(CONVERTED_DIR, user_id, document_id)
                pdf_path = convert_to_pdf(saved_path, user_converted_dir)
                pdf_url = _file_url(pdf_path)
                logger.info(f"[Upload] PDF URL: {pdf_url}")
            except RuntimeError as e:
                logger.warning(f"[Upload] PDF conversion skipped: {e}")

        try:
            documents = load_document(saved_path)
        except ImportError as e:
            raise HTTPException(status_code=501, detail=f"Dependency missing: {e}")
        except (RuntimeError, ValueError) as e:
            raise HTTPException(status_code=422, detail=str(e))

        for doc in documents:
            doc.metadata["document_name"] = original_filename
            doc.metadata["user_id"] = user_id
            doc.metadata["document_id"] = document_id

        chunks = chunk_documents(documents)
        if not chunks:
            raise HTTPException(
                status_code=422,
                detail=(
                    f"No text extracted from '{filename}'. "
                    "For scanned PDFs, ensure Tesseract OCR is installed."
                ),
            )

        total_vectors = add_documents_to_vectorstore(
            chunks, user_id=user_id, document_id=document_id,
        )

        chat_id = None
        try:
            from app.services.memory import create_chat
            chat_id = await create_chat(
                user_id=user_id,
                document_id=document_id,
                title=original_filename,
            )
            logger.info(f"[Upload] Chat created: '{chat_id}'")
        except Exception as e:
            logger.warning(f"[Upload] Could not create chat in MongoDB: {e}")
            chat_id = "chat_" + document_id[4:]

        try:
            from app.services.database import get_documents_collection
            await get_documents_collection().insert_one({
                "_id": document_id,
                "user_id": user_id,
                "filename": original_filename,
                "upload_time": datetime.now(timezone.utc),
                "num_chunks": len(chunks),
                "file_type": documents[0].metadata.get("file_type", "unknown"),
                "saved_path": saved_path,
                "pdf_path": pdf_path,
                "file_url": raw_file_url,
                "pdf_url": pdf_url,
            })
        except Exception as e:
            logger.warning(f"[Upload] MongoDB document save skipped: {e}")

        logger.info(
            f"[Upload] ✅ '{original_filename}' → "
            f"{len(chunks)} chunks | chat='{chat_id}'"
        )

        return UploadResponse(
            message="Document indexed successfully",
            filename=original_filename,
            document_id=document_id,
            chat_id=chat_id,
            chunks_created=len(chunks),
            file_url=raw_file_url,
            pdf_url=pdf_url,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Upload] Unexpected error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))