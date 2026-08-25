import logging
import os
import json
import asyncio
from typing import Dict, Any, List, Tuple, AsyncGenerator

from langchain_core.documents import Document
from langchain_core.messages import HumanMessage


from app.config import settings
from app.services.hybrid_retriever import hybrid_retrieve
from app.services.reranker import rerank_documents
from app.services.qa_engine import get_llm
from app.services.vector_store import resolve_document_id

logger = logging.getLogger(__name__)

NOT_FOUND = "Information not found in documents. I could not find enough supporting evidence in the selected documents to answer this reliably."
SIMILARITY_THRESHOLD = 0.15

_RULES = """\
STRICT RULES — follow without exception:
1. Answer ONLY using the text in the Context section below.
2. DO NOT use any prior knowledge or training data.
3. DO NOT generate code, formulas, or examples unless they appear word-for-word in the context.
4. If the answer is not found in the context, respond with EXACTLY: "Information not found in documents."
5. DO NOT guess, infer, or make up any information.\
"""

PROMPT_TEMPLATES = {
    "simple": """\
{rules}

{history_block}Context:
{context}

Question: {question}

Answer (from context only):""",

    "detailed": """\
{rules}

{history_block}Context:
{context}

Question: {question}

Detailed Answer (from context only):""",

    "exam": """\
{rules}
Structure as:
- Definition
- Explanation
- Example (only if explicitly in context)

{history_block}Context:
{context}

Question: {question}

Exam-Style Answer (from context only):""",
}


def determine_evidence_level(
    scores: List[float],
    chunk_count: int,
    is_refusal: bool = False,
) -> str:
    """
    Deterministic evidence support state calculation:
    - STRONG EVIDENCE: >= 2 relevant retrieved chunks with strong reranking / similarity scores (max >= 0.60 or avg >= 0.50).
    - LIMITED EVIDENCE: >= 1 relevant retrieved chunk meeting similarity threshold, but coverage is partial.
    - INSUFFICIENT EVIDENCE: No relevant chunks, low similarity scores, or model refusal triggered.
    """
    if is_refusal or chunk_count == 0 or not scores:
        return "INSUFFICIENT EVIDENCE"
    top_score = max(scores) if scores else 0.0
    avg_score = sum(scores) / len(scores) if scores else 0.0
    if chunk_count >= 2 and (top_score >= 0.60 or avg_score >= 0.50):
        return "STRONG EVIDENCE"
    elif chunk_count >= 1 and top_score >= SIMILARITY_THRESHOLD:
        return "LIMITED EVIDENCE"
    return "INSUFFICIENT EVIDENCE"


def _build_context_and_sources(
    results: List[Tuple[Document, float]]
) -> Tuple[str, List[Dict], List[float], List[Dict]]:
    context_parts: List[str] = []
    sources_seen: set = set()
    sources: List[Dict] = []
    scores: List[float] = []
    evidence_items: List[Dict] = []

    for doc, score in results:
        # Parent-Child Hierarchical Context Reconstruction
        passage_text = doc.metadata.get("parent_text", doc.page_content.strip())
        context_parts.append(passage_text)
        scores.append(score)

        raw = doc.metadata.get("source", "unknown")
        display_name = doc.metadata.get("document_name", os.path.basename(raw))
        page_num = int(doc.metadata.get("page", 0)) + 1
        raw_content = doc.page_content.strip()

        key = f"{display_name}::{page_num}"
        if key not in sources_seen:
            sources_seen.add(key)
            sources.append({"document": display_name, "page": page_num})

        # Structured safe evidence item for Evidence Inspector
        relevance_tag = (
            "High Relevance" if score >= 0.70
            else "Moderate Relevance" if score >= 0.35
            else "Context Match"
        )
        evidence_items.append({
            "document": display_name,
            "page": page_num,
            "excerpt": raw_content[:320] if len(raw_content) > 320 else raw_content,
            "relevance": relevance_tag,
        })

    return "\n\n---\n\n".join(context_parts), sources, scores, evidence_items


def _build_prompt(question: str, context: str, history: str, mode: str) -> str:
    history_block = f"Chat History:\n{history}\n\n" if history else ""
    template = PROMPT_TEMPLATES.get(mode, PROMPT_TEMPLATES["simple"])
    return template.format(
        rules=_RULES,
        history_block=history_block,
        context=context,
        question=question,
    )


async def _load_history_for_chat(chat_id: str) -> str:
    try:
        from app.services.memory import get_chat_history, format_history_for_prompt
        msgs = await get_chat_history(chat_id)
        return format_history_for_prompt(msgs)
    except Exception as e:
        logger.warning(f"[RAG] Could not load history: {e}")
        return ""


async def _save_pair_to_chat(chat_id: str, question: str, answer: str) -> None:
    try:
        from app.services.memory import save_message
        await save_message(chat_id, "user", question)
        await save_message(chat_id, "assistant", answer)
    except Exception as e:
        logger.warning(f"[RAG] Could not save to MongoDB: {e}")


async def run_rag_pipeline(
    question: str,
    mode: str = "simple",
    chat_id: str = None,
    user_id: str = "default",
    document_id: str = "default",
) -> Dict[str, Any]:
    """Standard non-streaming RAG execution."""
    resolved_chat_id = chat_id

    if chat_id:
        from app.services.memory import get_chat
        chat_doc = await get_chat(chat_id)
        if not chat_doc:
            raise ValueError(f"Chat '{chat_id}' not found.")

        user_id = chat_doc["user_id"]
        document_id = chat_doc["document_id"]
    else:
        document_id = resolve_document_id(user_id, document_id or "default")

    history_str = await _load_history_for_chat(resolved_chat_id) if resolved_chat_id else ""

    # 1. Hybrid Search (FAISS + BM25 + Reciprocal Rank Fusion)
    candidates = hybrid_retrieve(
        question,
        user_id=user_id,
        document_id=document_id,
        top_k=settings.TOP_K_RESULTS * 2,
    )

    if not candidates:
        if resolved_chat_id:
            await _save_pair_to_chat(resolved_chat_id, question, NOT_FOUND)
        return {
            "answer": NOT_FOUND,
            "sources": [],
            "evidence": [],
            "evidence_level": "INSUFFICIENT EVIDENCE",
            "confidence": 0.0,
            "mode": mode,
            "document_id": document_id,
            "chat_id": resolved_chat_id,
            "highlight_text": "",
        }

    # 2. Two-Stage Cross-Encoder Reranking
    reranked = rerank_documents(
        query=question,
        candidates=candidates,
        top_k=settings.TOP_K_RESULTS,
    )

    filtered = [(d, s) for d, s in reranked if s >= SIMILARITY_THRESHOLD]
    if not filtered:
        filtered = reranked[:2]  # Fallback to top 2 candidates if below threshold

    context, sources, scores, evidence = _build_context_and_sources(filtered)
    confidence = round(sum(scores) / len(scores), 4) if scores else 0.0
    highlight_text = filtered[0][0].page_content.strip()[:300] if filtered else ""

    prompt = _build_prompt(question, context, history_str, mode)

    llm = get_llm()
    try:
        response = llm.invoke([HumanMessage(content=prompt)])
        answer = response.content if hasattr(response, "content") else str(response)
    except Exception:
        answer = str(llm.invoke(prompt))

    answer = answer.strip()

    _signals = [
        "information not found", "not found in document",
        "not present in", "not mentioned in", "cannot be found",
        "no information", "i don't have", "i do not have",
        "not enough evidence", "insufficient evidence",
    ]
    is_refusal = any(sig in answer.lower() for sig in _signals)
    if is_refusal:
        answer = NOT_FOUND
        sources = []
        evidence = []
        highlight_text = ""
        evidence_level = "INSUFFICIENT EVIDENCE"
    else:
        evidence_level = determine_evidence_level(scores, len(filtered), is_refusal=False)

    if resolved_chat_id:
        await _save_pair_to_chat(resolved_chat_id, question, answer)

    return {
        "answer": answer,
        "sources": sources,
        "evidence": evidence,
        "evidence_level": evidence_level,
        "confidence": confidence,
        "mode": mode,
        "document_id": document_id,
        "chat_id": resolved_chat_id,
        "highlight_text": highlight_text,
    }


async def stream_rag_pipeline(
    question: str,
    mode: str = "simple",
    chat_id: str = None,
    user_id: str = "default",
    document_id: str = "default",
) -> AsyncGenerator[str, None]:
    """Server-Sent Events (SSE) streaming generator yielding word-by-word token payloads."""
    # First get context & sources
    rag_res = await run_rag_pipeline(
        question=question,
        mode=mode,
        chat_id=chat_id,
        user_id=user_id,
        document_id=document_id,
    )

    # Initial metadata frame
    meta_frame = {
        "type": "meta",
        "sources": rag_res["sources"],
        "evidence": rag_res.get("evidence", []),
        "evidence_level": rag_res.get("evidence_level", "INSUFFICIENT EVIDENCE"),
        "confidence": rag_res["confidence"],
        "highlight_text": rag_res["highlight_text"],
        "chat_id": rag_res["chat_id"],
    }
    yield f"data: {json.dumps(meta_frame)}\n\n"
    await asyncio.sleep(0.01)

    full_answer = rag_res["answer"]

    # Stream answer tokens word by word
    words = full_answer.split(" ")
    for idx, word in enumerate(words):
        chunk_text = word + (" " if idx < len(words) - 1 else "")
        token_frame = {"type": "token", "content": chunk_text}
        yield f"data: {json.dumps(token_frame)}\n\n"
        await asyncio.sleep(0.02)  # Simulate smooth typewriter effect

    # Final completion frame
    yield "data: [DONE]\n\n"