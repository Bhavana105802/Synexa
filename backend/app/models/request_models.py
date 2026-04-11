from pydantic import BaseModel, Field
from typing import Literal, Optional


class QueryRequest(BaseModel):
    question: str = Field(
        ...,
        min_length=3,
        max_length=1000,
        example="What is this document about?",
    )

    mode: Literal["simple", "detailed", "exam"] = Field(
        default="simple",
    )

    chat_id: Optional[str] = Field(
        default=None,
        description=(
            "chat_id returned by POST /upload. "
            "Backend resolves document_id + user_id from this. "
            "If omitted, falls back to document_id."
        ),
        example="chat_abc123def456",
    )

    document_id: Optional[str] = Field(
        default=None,
        description="Fallback: document_id from POST /upload (deprecated — use chat_id).",
        example="doc_abc123def456",
    )