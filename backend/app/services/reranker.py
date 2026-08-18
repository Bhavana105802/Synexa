import logging
from typing import List, Tuple
from langchain_core.documents import Document


logger = logging.getLogger(__name__)

_reranker_ranker = None
_reranker_initialized = False


def _get_reranker():
    global _reranker_ranker, _reranker_initialized
    if _reranker_initialized:
        return _reranker_ranker

    _reranker_initialized = True
    try:
        from flashrank import Ranker, RerankRequest
        _reranker_ranker = Ranker(model_name="ms-marco-MiniLM-L-6-v2", cache_dir="./opt/flashrank")
        logger.info("[Reranker] Initialized FlashRank cross-encoder: 'ms-marco-MiniLM-L-6-v2'")
    except Exception as e:
        logger.warning(f"[Reranker] FlashRank unavailable ({e}). Using pass-through fallback.")
        _reranker_ranker = None

    return _reranker_ranker


def rerank_documents(
    query: str,
    candidates: List[Tuple[Document, float]],
    top_k: int = 5,
) -> List[Tuple[Document, float]]:
    """
    Two-Stage Reranking Stage using Cross-Encoder.
    Takes candidate chunks from Hybrid Search and reranks them with fine-grained cross-attention scoring.
    """
    if not candidates:
        return []

    ranker = _get_reranker()
    if ranker is None:
        # Fallback pass-through
        return candidates[:top_k]

    try:
        from flashrank import RerankRequest

        passages = [
            {"id": idx, "text": doc.page_content, "meta": doc.metadata}
            for idx, (doc, score) in enumerate(candidates)
        ]

        rerank_req = RerankRequest(query=query, passages=passages)
        rerank_results = ranker.rerank(rerank_req)

        reranked_docs: List[Tuple[Document, float]] = []
        for res in rerank_results[:top_k]:
            idx = res["id"]
            orig_doc = candidates[idx][0]
            new_score = round(float(res.get("score", candidates[idx][1])), 4)
            reranked_docs.append((orig_doc, new_score))

        logger.info(f"[Reranker] Reranked {len(candidates)} candidates → top {len(reranked_docs)}")
        return reranked_docs

    except Exception as e:
        logger.warning(f"[Reranker] Cross-encoder scoring failed ({e}). Returning original ranks.")
        return candidates[:top_k]
