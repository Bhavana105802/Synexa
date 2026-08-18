import pytest
from langchain.schema import Document
from app.services.hybrid_retriever import reciprocal_rank_fusion


def test_reciprocal_rank_fusion():
    doc1 = Document(page_content="Document 1 content about RAG", metadata={"chunk_id": "c1", "document_name": "d1"})
    doc2 = Document(page_content="Document 2 content about BM25", metadata={"chunk_id": "c2", "document_name": "d2"})

    dense_results = [(doc1, 0.9), (doc2, 0.5)]
    sparse_results = [(doc2, 4.2), (doc1, 1.1)]

    fused = reciprocal_rank_fusion(dense_results, sparse_results, top_k=2)

    assert len(fused) == 2
    # Both documents present, scored and normalized
    doc_ids = [d.metadata["chunk_id"] for d, score in fused]
    assert "c1" in doc_ids
    assert "c2" in doc_ids
    assert fused[0][1] <= 1.0
