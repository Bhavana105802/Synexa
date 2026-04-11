import logging
from typing import List, Tuple, Optional

from langchain.schema import Document

from app.config import settings
from app.services.vector_store import load_vectorstore

logger = logging.getLogger(__name__)

FETCH_MULTIPLIER = 3


def retrieve_relevant_chunks(
    question: str,
    user_id: str = "default",
    document_id: str = "default",
    top_k: Optional[int] = None,
) -> List[Tuple[Document, float]]:
    k = top_k or settings.TOP_K_RESULTS
    fetch_k = k * FETCH_MULTIPLIER

    logger.info(
        f"[Retriever] user='{user_id}' doc='{document_id}' "
        f"fetch={fetch_k}→top_k={k} | q='{question[:70]}'"
    )

    store = load_vectorstore(user_id, document_id)

    raw = store.similarity_search_with_score(question, k=fetch_k)
    if not raw:
        logger.warning("[Retriever] FAISS returned no results.")
        return []

    scored = [
        (doc, round(1.0 / (1.0 + float(dist)), 4))
        for doc, dist in raw
    ]

    scored.sort(key=lambda x: x[1], reverse=True)
    final = scored[:k]

    logger.info(
        f"[Retriever] Returning {len(final)} chunks. "
        f"Top score: {final[0][1] if final else 'N/A'}"
    )
    return final