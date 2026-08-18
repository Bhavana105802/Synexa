import os
import pickle
import logging
import re
from typing import List, Tuple, Dict, Any
from rank_bm25 import BM25Okapi
from langchain_core.documents import Document


from app.config import settings
from app.services.vector_store import load_vectorstore

logger = logging.getLogger(__name__)


def _tokenize(text: str) -> List[str]:
    """Tokenize text into lowercase alphanumeric tokens for BM25 indexing."""
    return re.findall(r'\w+', text.lower())


def _bm25_path(user_id: str, document_id: str) -> str:
    path = os.path.join(settings.VECTORSTORE_DIR, user_id, document_id)
    os.makedirs(path, exist_ok=True)
    return os.path.join(path, "bm25.pkl")


def save_bm25_index(chunks: List[Document], user_id: str, document_id: str) -> None:
    """Build and save BM25 sparse index alongside FAISS index."""
    if not chunks:
        return

    corpus = [_tokenize(doc.page_content) for doc in chunks]
    bm25 = BM25Okapi(corpus)

    data = {
        "bm25": bm25,
        "chunks": chunks,
    }

    file_path = _bm25_path(user_id, document_id)
    with open(file_path, "wb") as f:
        pickle.dump(data, f)

    logger.info(f"[BM25] Saved sparse index with {len(chunks)} documents to '{file_path}'")


def search_bm25(
    query: str,
    user_id: str,
    document_id: str,
    top_k: int = 10,
) -> List[Tuple[Document, float]]:
    """Query BM25 index for sparse keyword matches."""
    file_path = _bm25_path(user_id, document_id)
    if not os.path.exists(file_path):
        logger.warning(f"[BM25] Index file not found: '{file_path}'")
        return []

    try:
        with open(file_path, "rb") as f:
            data = pickle.load(f)

        bm25: BM25Okapi = data["bm25"]
        chunks: List[Document] = data["chunks"]

        tokenized_query = _tokenize(query)
        if not tokenized_query:
            return []

        scores = bm25.get_scores(tokenized_query)
        top_indices = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)[:top_k]

        results = []
        for idx in top_indices:
            score = float(scores[idx])
            if score > 0:
                results.append((chunks[idx], score))

        logger.info(f"[BM25] Retrived {len(results)} matches for query '{query[:30]}'")
        return results

    except Exception as e:
        logger.error(f"[BM25] Search failed: {e}", exc_info=True)
        return []


def reciprocal_rank_fusion(
    dense_results: List[Tuple[Document, float]],
    sparse_results: List[Tuple[Document, float]],
    top_k: int = 7,
    rrf_k: int = 60,
) -> List[Tuple[Document, float]]:
    """
    Reciprocal Rank Fusion (RRF) algorithm to combine Dense (FAISS) and Sparse (BM25) ranks.
    Formula: RRF_score(doc) = sum(1 / (rrf_k + rank_m(doc)))
    """
    rrf_scores: Dict[str, float] = {}
    doc_map: Dict[str, Document] = {}

    # Helper to create unique key for deduplication
    def _doc_key(doc: Document) -> str:
        content = doc.page_content.strip()
        doc_id = doc.metadata.get("chunk_id", content[:100])
        return f"{doc.metadata.get('document_name', '')}::{doc_id}"

    # Process Dense Results
    for rank, (doc, score) in enumerate(dense_results, start=1):
        key = _doc_key(doc)
        doc_map[key] = doc
        rrf_scores[key] = rrf_scores.get(key, 0.0) + (1.0 / (rrf_k + rank))

    # Process Sparse Results
    for rank, (doc, score) in enumerate(sparse_results, start=1):
        key = _doc_key(doc)
        if key not in doc_map:
            doc_map[key] = doc
        rrf_scores[key] = rrf_scores.get(key, 0.0) + (1.0 / (rrf_k + rank))

    # Sort candidates by combined RRF score
    sorted_keys = sorted(rrf_scores.keys(), key=lambda k: rrf_scores[k], reverse=True)[:top_k]

    # Normalize RRF scores relative to theoretical maximum (2 / (rrf_k + 1))
    max_possible_rrf = 2.0 / (rrf_k + 1)
    
    fused_results = []
    for key in sorted_keys:
        norm_score = min(round(rrf_scores[key] / max_possible_rrf, 4), 1.0)
        fused_results.append((doc_map[key], norm_score))

    logger.info(f"[RRF] Fused {len(dense_results)} dense + {len(sparse_results)} sparse → {len(fused_results)} candidates")
    return fused_results


def hybrid_retrieve(
    query: str,
    user_id: str = "default",
    document_id: str = "default",
    top_k: int = 7,
) -> List[Tuple[Document, float]]:
    """
    Execute Hybrid Dense (FAISS) + Sparse (BM25) search with Reciprocal Rank Fusion.
    """
    # 1. Dense retrieval via FAISS
    dense_results: List[Tuple[Document, float]] = []
    try:
        store = load_vectorstore(user_id=user_id, document_id=document_id)
        docs_and_scores = store.similarity_search_with_score(query, k=top_k * 2)
        # FAISS returns L2 distance (lower is better), convert to similarity score 1/(1+dist)
        for doc, score in docs_and_scores:
            sim = 1.0 / (1.0 + float(score))
            dense_results.append((doc, sim))
    except Exception as e:
        logger.warning(f"[Hybrid] Dense FAISS retrieval failed: {e}")

    # 2. Sparse retrieval via BM25
    sparse_results = search_bm25(query, user_id=user_id, document_id=document_id, top_k=top_k * 2)

    # Fallback logic if one search mode is unavailable
    if not dense_results and not sparse_results:
        logger.warning("[Hybrid] Both dense and sparse search returned 0 results.")
        return []
    if not dense_results:
        return sparse_results[:top_k]
    if not sparse_results:
        return dense_results[:top_k]

    # 3. Reciprocal Rank Fusion
    return reciprocal_rank_fusion(dense_results, sparse_results, top_k=top_k)
