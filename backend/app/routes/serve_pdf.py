import logging
import os

from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import FileResponse

from app.services.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get(
    "/document/{document_id}/pdf",
    summary="Serve converted PDF for viewer",
    description=(
        "Returns the PDF version of a DOCX or TXT document. "
        "Native PDFs are served directly from the client (no request needed). "
        "Requires JWT auth."
    ),
    tags=["Documents"],
    response_class=FileResponse,
)
async def serve_document_pdf(
    document_id: str,
    user_id: str = Depends(get_current_user),
):
    try:
        from app.services.database import get_documents_collection
        doc = await get_documents_collection().find_one({"_id": document_id})
    except Exception as e:
        logger.error(f"[ServePDF] DB error: {e}")
        raise HTTPException(status_code=500, detail="Database error.")

    if not doc:
        raise HTTPException(status_code=404, detail=f"Document '{document_id}' not found.")

    if doc.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Access denied.")

    pdf_path: str | None = doc.get("pdf_path")

    if not pdf_path:
        saved_path = doc.get("saved_path", "")
        if saved_path.lower().endswith(".pdf") and os.path.isfile(saved_path):
            pdf_path = saved_path
        else:
            raise HTTPException(
                status_code=404,
                detail=(
                    f"No PDF available for document '{document_id}'. "
                    "The file may not have been converted (LibreOffice unavailable at upload time)."
                ),
            )

    if not os.path.isfile(pdf_path):
        raise HTTPException(
            status_code=404,
            detail=f"Converted PDF file missing on disk: {pdf_path}",
        )

    filename = os.path.basename(pdf_path)
    logger.info(f"[ServePDF] Serving '{filename}' for doc='{document_id}' user='{user_id}'")

    return FileResponse(
        path=pdf_path,
        media_type="application/pdf",
        filename=filename,
        headers={"Cache-Control": "private, max-age=300"},
    )