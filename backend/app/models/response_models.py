from pydantic import BaseModel, Field
from typing import List, Optional


class UploadResponse(BaseModel):
    message: str = Field(..., example="Document indexed successfully")
    filename: str = Field(..., example="report.pdf")
    document_id: str = Field(..., example="doc_abc123")
    chat_id: str = Field(..., description="Use this in POST /ask")
    chunks_created: int = Field(...)
    file_url: str = Field(..., description="URL to the raw uploaded file")
    pdf_url: Optional[str] = Field(
        default=None,
        description="URL to converted PDF (DOCX/TXT only; null for native PDFs)"
    )


class SourceDocument(BaseModel):
    document: str = Field(..., example="report.pdf")
    page: int = Field(..., example=4)


class QueryResponse(BaseModel):
    answer: str = Field(...)
    sources: List[SourceDocument] = Field(default=[])
    confidence: float = Field(..., ge=0.0, le=1.0)
    mode: str = Field(...)
    chat_id: Optional[str] = Field(default=None)
    document_id: Optional[str] = Field(default=None)
    highlight_text: str = Field(default="")


class ChatInfo(BaseModel):
    chat_id: str = Field(..., example="chat_abc123")
    document_id: str = Field(..., example="doc_abc123")
    title: str = Field(..., example="report.pdf")
    created_at: str = Field(...)
    updated_at: str = Field(...)


class ErrorResponse(BaseModel):
    detail: str = Field(...)