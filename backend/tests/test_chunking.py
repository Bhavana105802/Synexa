import pytest
from langchain.schema import Document
from app.services.chunking import chunk_documents


def test_parent_child_chunking():
    doc = Document(
        page_content=(
            "Synexa is an advanced Retrieval-Augmented Generation platform. "
            "It combines dense vector embeddings with sparse BM25 search. "
            "Cross-Encoder reranking improves retrieval precision by scoring passages. "
            "Server-Sent Events allow real-time token streaming to the frontend."
        ),
        metadata={"source": "test_doc.txt"}
    )

    chunks = chunk_documents([doc], parent_chunk_size=300, child_chunk_size=100)

    assert len(chunks) > 0
    first_chunk = chunks[0]
    assert "parent_id" in first_chunk.metadata
    assert "parent_text" in first_chunk.metadata
    assert "chunk_id" in first_chunk.metadata
    assert first_chunk.metadata["document_name"] == "test_doc.txt"
