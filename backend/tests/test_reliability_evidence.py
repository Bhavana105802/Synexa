import pytest
from langchain_core.documents import Document
from app.services.rag_pipeline import determine_evidence_level, _build_context_and_sources


def test_determine_evidence_level_strong():
    # 2 chunks with high scores
    scores = [0.85, 0.72]
    level = determine_evidence_level(scores=scores, chunk_count=2, is_refusal=False)
    assert level == "STRONG EVIDENCE"


def test_determine_evidence_level_limited():
    # 1 chunk with moderate score
    scores = [0.45]
    level = determine_evidence_level(scores=scores, chunk_count=1, is_refusal=False)
    assert level == "LIMITED EVIDENCE"

    # 2 chunks with lower scores
    scores_low = [0.25, 0.20]
    level_low = determine_evidence_level(scores=scores_low, chunk_count=2, is_refusal=False)
    assert level_low == "LIMITED EVIDENCE"


def test_determine_evidence_level_insufficient():
    # Refusal triggered
    level = determine_evidence_level(scores=[0.9], chunk_count=1, is_refusal=True)
    assert level == "INSUFFICIENT EVIDENCE"

    # Zero chunks or empty scores
    assert determine_evidence_level(scores=[], chunk_count=0, is_refusal=False) == "INSUFFICIENT EVIDENCE"

    # Scores below threshold
    assert determine_evidence_level(scores=[0.05], chunk_count=1, is_refusal=False) == "INSUFFICIENT EVIDENCE"


def test_build_context_and_sources_evidence_items():
    doc1 = Document(
        page_content="Synexa uses FAISS vector search and BM25.",
        metadata={"document_name": "overview.pdf", "page": 2, "source": "data/overview.pdf"}
    )
    doc2 = Document(
        page_content="Cross-encoder reranks top 5 passages.",
        metadata={"document_name": "overview.pdf", "page": 3, "source": "data/overview.pdf"}
    )

    results = [(doc1, 0.82), (doc2, 0.55)]
    context, sources, scores, evidence = _build_context_and_sources(results)

    assert "Synexa uses FAISS" in context
    assert len(sources) == 2
    assert len(evidence) == 2
    assert evidence[0]["document"] == "overview.pdf"
    assert evidence[0]["page"] == 3  # 0-indexed + 1
    assert evidence[0]["relevance"] == "High Relevance"
    assert evidence[1]["relevance"] == "Moderate Relevance"
