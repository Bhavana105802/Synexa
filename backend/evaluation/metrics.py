"""
metrics.py — Pure, deterministic evaluation metrics for the Synexa RAG pipeline.

All metrics in this module are computed directly from actual retrieved chunk metadata,
lexical/semantic ground truth matches, and pipeline execution latencies.
No synthetic, simulated, or hallucinated values are generated.
"""

from typing import List, Dict, Any, Optional, Set
import re


def tokenize(text: str) -> Set[str]:
    """Tokenize string into lowercase alphanumeric words."""
    if not text:
        return set()
    return set(re.findall(r"\w+", text.lower()))


def evaluate_hit_at_k(
    retrieved_chunks: List[Dict[str, Any]],
    expected_document: Optional[str] = None,
    expected_pages: Optional[List[int]] = None,
    expected_keywords: Optional[List[str]] = None,
) -> Optional[bool]:
    """
    Hit@K: Evaluates whether at least one chunk in top-K retrieved results satisfies
    the ground truth criteria (matching document name, matching page, or containing expected keywords).
    
    Returns:
        True: If at least one retrieved chunk satisfies the ground truth.
        False: If ground truth was provided, but none of the retrieved chunks satisfied it.
        None: If no ground truth (document, pages, or keywords) was provided (metric unavailable).
    """
    has_ground_truth = bool(expected_document or expected_pages or expected_keywords)
    if not has_ground_truth:
        return None

    if not retrieved_chunks:
        return False

    for chunk in retrieved_chunks:
        doc_name = chunk.get("document_name") or chunk.get("source") or ""
        page_num = chunk.get("page")
        content = chunk.get("content", "")

        # 1. Document name check (if specified)
        doc_match = True
        if expected_document:
            doc_match = expected_document.lower() in doc_name.lower()

        # 2. Page number check (if specified)
        page_match = True
        if expected_pages:
            # Check 0-indexed or 1-indexed page matching
            page_match = (
                (page_num in expected_pages)
                or ((page_num + 1) in expected_pages if page_num is not None else False)
            )

        # 3. Evidence keyword check (if specified)
        kw_match = True
        if expected_keywords:
            content_lower = content.lower()
            kw_match = any(kw.lower() in content_lower for kw in expected_keywords)

        if doc_match and page_match and kw_match:
            return True

    return False


def evaluate_keyword_recall(
    retrieved_context: str,
    expected_keywords: Optional[List[str]] = None,
) -> Optional[float]:
    """
    Evidence Recall@K: Measures the percentage of expected evidence keywords present in the aggregated retrieved context.
    
    Returns:
        float (0.0 to 1.0): Fraction of expected keywords found.
        None: If expected_keywords is empty or not provided.
    """
    if not expected_keywords:
        return None

    if not retrieved_context:
        return 0.0

    context_lower = retrieved_context.lower()
    matched = sum(1 for kw in expected_keywords if kw.lower() in context_lower)
    return round(matched / len(expected_keywords), 4)


def evaluate_refusal_correctness(
    answer: str,
    is_refusal_expected: bool = False,
    refusal_signal: str = "Information not found in documents.",
) -> bool:
    """
    Refusal / Fallback Correctness:
    Verifies whether the system correctly outputs the standard refusal when queried on out-of-domain or ungrounded topics,
    or does NOT output refusal when valid context exists.
    """
    standard_refusal = refusal_signal.strip().lower()
    actual_answer = answer.strip().lower()

    refused = (
        standard_refusal in actual_answer
        or "information not found" in actual_answer
        or "not found in document" in actual_answer
    )

    if is_refusal_expected:
        return refused
    else:
        return not refused


def evaluate_lexical_grounding(
    answer: str,
    retrieved_context: str,
) -> Optional[float]:
    """
    Lexical Answer Grounding:
    Calculates the proportion of informative words in the generated answer that appear
    directly in the retrieved context (checking lexical grounding).
    
    Returns:
        float (0.0 to 1.0): Lexical overlap score.
        None: If answer is standard refusal or empty.
    """
    if not answer or not retrieved_context:
        return None

    if "information not found in documents" in answer.lower():
        return None

    stopwords = {
        "a", "about", "above", "after", "again", "against", "all", "am", "an", "and",
        "any", "are", "aren't", "as", "at", "be", "because", "been", "before", "being",
        "below", "between", "both", "but", "by", "can't", "cannot", "could", "couldn't",
        "did", "didn't", "do", "does", "doesn't", "doing", "don't", "down", "during",
        "each", "few", "for", "from", "further", "had", "hadn't", "has", "hasn't",
        "have", "haven't", "having", "he", "he'd", "he'll", "he's", "her", "here",
        "here's", "hers", "herself", "him", "himself", "his", "how", "how's", "i",
        "i'd", "i'll", "i'm", "i've", "if", "in", "into", "is", "isn't", "it", "it's",
        "its", "itself", "let's", "me", "more", "most", "mustn't", "my", "myself",
        "no", "nor", "not", "of", "off", "on", "once", "only", "or", "other", "ought",
        "our", "ours", "ourselves", "out", "over", "own", "same", "shan't", "she",
        "she'd", "she'll", "she's", "should", "shouldn't", "so", "some", "such",
        "than", "that", "that's", "the", "their", "theirs", "them", "themselves",
        "then", "there", "there's", "these", "they", "they'd", "they'll", "they're",
        "they've", "this", "those", "through", "to", "too", "under", "until", "up",
        "very", "was", "wasn't", "we", "we'd", "we'll", "we're", "we've", "were",
        "weren't", "what", "what's", "when", "when's", "where", "where's", "which",
        "while", "who", "who's", "whom", "why", "why's", "with", "won't", "would",
        "wouldn't", "you", "you'd", "you'll", "you're", "you've", "your", "yours",
        "yourself", "yourselves"
    }

    answer_tokens = tokenize(answer)
    informative_tokens = [t for t in answer_tokens if t not in stopwords and len(t) > 2]

    if not informative_tokens:
        return 1.0

    context_tokens = tokenize(retrieved_context)
    grounded_count = sum(1 for t in informative_tokens if t in context_tokens)

    return round(grounded_count / len(informative_tokens), 4)
