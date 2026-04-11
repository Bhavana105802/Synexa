from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.schema import Document
from typing import List
import os
import logging

from app.config import settings

logger = logging.getLogger(__name__)


def chunk_documents(documents: List[Document]) -> List[Document]:
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=settings.CHUNK_SIZE,
        chunk_overlap=settings.CHUNK_OVERLAP,
        separators=["\n\n", "\n", ". ", "! ", "? ", " ", ""],
        strip_whitespace=True,
    )

    chunks = splitter.split_documents(documents)

    enriched = []
    for chunk in chunks:
        chunk.page_content = chunk.page_content.strip()
        if not chunk.page_content:
            continue

        if "document_name" not in chunk.metadata:
            raw_source = chunk.metadata.get("source", "unknown")
            chunk.metadata["document_name"] = os.path.basename(raw_source)

        chunk.metadata.setdefault("file_type", "unknown")

        enriched.append(chunk)

    logger.info(
        f"Chunking: {len(documents)} doc(s) → {len(enriched)} chunks "
        f"(size={settings.CHUNK_SIZE}, overlap={settings.CHUNK_OVERLAP})"
    )

    return enriched