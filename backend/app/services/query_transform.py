import logging
from typing import List
from langchain_core.messages import HumanMessage

from app.services.qa_engine import get_llm

logger = logging.getLogger(__name__)

HYDE_PROMPT = """\
Please write a short, hypothetical passage from an official document or textbook that answers the question below.
Do NOT explain yourself. Write ONLY the hypothetical content passage (2-4 sentences).

Question: {question}
Hypothetical Answer Passage:"""

MULTI_QUERY_PROMPT = """\
You are an AI assistant helping to improve vector retrieval.
Generate 2 alternative search queries for the user question below.
Separate each query with a newline. Do not number them or add extra text.

Original Question: {question}
Alternative Queries:"""


def generate_hyde_passage(question: str) -> str:
    """
    Generate Hypothetical Document Embedding (HyDE) passage.
    Transforms raw question into a hypothetical answer passage for better dense vector alignment.
    """
    try:
        llm = get_llm()
        prompt = HYDE_PROMPT.format(question=question)
        res = llm.invoke([HumanMessage(content=prompt)])
        passage = res.content if hasattr(res, "content") else str(res)
        passage = passage.strip()
        logger.info(f"[HyDE] Generated hypothetical passage ({len(passage)} chars)")
        return passage
    except Exception as e:
        logger.warning(f"[HyDE] Generation failed ({e}). Falling back to original question.")
        return question


def generate_query_expansions(question: str) -> List[str]:
    """
    Multi-Query Expansion.
    Generates alternative search queries to improve retrieval recall.
    """
    queries = [question]
    try:
        llm = get_llm()
        prompt = MULTI_QUERY_PROMPT.format(question=question)
        res = llm.invoke([HumanMessage(content=prompt)])
        raw = res.content if hasattr(res, "content") else str(res)
        
        for line in raw.strip().split("\n"):
            line = line.strip().lstrip("0123456789.- ")
            if line and line.lower() != question.lower() and len(line) > 5:
                queries.append(line)
        
        logger.info(f"[MultiQuery] Expanded into {len(queries)} search queries")
    except Exception as e:
        logger.warning(f"[MultiQuery] Expansion failed ({e}).")

    return queries[:3]
