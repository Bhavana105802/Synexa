import pytest
from evaluation.metrics import (
    evaluate_hit_at_k,
    evaluate_keyword_recall,
    evaluate_refusal_correctness,
    evaluate_lexical_grounding,
)


def test_evaluate_hit_at_k():
    chunks = [
        {"document_name": "report.pdf", "page": 1, "content": "Company revenue grew 25% in 2025."},
        {"document_name": "spec.txt", "page": 0, "content": "System architecture overview."},
    ]

    # Matching document & keyword
    assert evaluate_hit_at_k(chunks, expected_document="report.pdf", expected_keywords=["revenue"]) is True
    # Non-matching keyword
    assert evaluate_hit_at_k(chunks, expected_document="report.pdf", expected_keywords=["non_existent_term"]) is False
    # Ground truth missing
    assert evaluate_hit_at_k(chunks) is None


def test_evaluate_keyword_recall():
    context = "Synexa provides dense FAISS retrieval and sparse BM25 search."
    keywords = ["FAISS", "BM25", "Reciprocal"]

    recall = evaluate_keyword_recall(context, keywords)
    assert recall == pytest.approx(0.6667, abs=0.01)

    # Empty keywords
    assert evaluate_keyword_recall(context, []) is None


def test_evaluate_refusal_correctness():
    refusal_answer = "Information not found in documents."
    factual_answer = "The system uses FAISS IndexFlatL2."

    # When refusal is expected (out-of-domain query)
    assert evaluate_refusal_correctness(refusal_answer, is_refusal_expected=True) is True
    assert evaluate_refusal_correctness(factual_answer, is_refusal_expected=True) is False

    # When answer is expected (grounded query)
    assert evaluate_refusal_correctness(factual_answer, is_refusal_expected=False) is True
    assert evaluate_refusal_correctness(refusal_answer, is_refusal_expected=False) is False


def test_evaluate_lexical_grounding():
    context = "Synexa architecture uses parent child chunking with hierarchical text splitting."
    answer = "Synexa architecture relies on hierarchical text splitting."

    grounding = evaluate_lexical_grounding(answer, context)
    assert grounding is not None
    assert grounding > 0.8

    # Refusal has no grounding score
    assert evaluate_lexical_grounding("Information not found in documents.", context) is None
