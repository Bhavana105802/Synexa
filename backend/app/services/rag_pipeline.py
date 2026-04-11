import logging
import os
from typing import Dict, Any, List, Tuple, Optional

from langchain.schema import Document, HumanMessage

from app.config import settings
from app.services.retriever import retrieve_relevant_chunks
from app.services.qa_engine import get_llm
from app.services.vector_store import resolve_document_id

logger = logging.getLogger(__name__)

NOT_FOUND = "Information not found in documents."
SIMILARITY_THRESHOLD = 0.20

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


def _build_context_and_sources(
    results: List[Tuple[Document, float]]
) -> Tuple[str, List[Dict], List[float]]:
    context_parts: List[str] = []
    sources_seen: set = set()
    sources: List[Dict] = []
    scores: List[float] = []

    for doc, score in results:
        context_parts.append(doc.page_content.strip())
        scores.append(score)

        raw = doc.metadata.get("source", "unknown")
        display_name = doc.metadata.get("document_name", os.path.basename(raw))
        page_num = int(doc.metadata.get("page", 0)) + 1

        key = f"{display_name}::{page_num}"
        if key not in sources_seen:
            sources_seen.add(key)
            sources.append({"document": display_name, "page": page_num})

    return "\n\n---\n\n".join(context_parts), sources, scores


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

    resolved_chat_id = chat_id

    if chat_id:
        from app.services.memory import get_chat
        chat_doc = await get_chat(chat_id)
        if not chat_doc:
            raise ValueError(f"Chat '{chat_id}' not found.")

        user_id = chat_doc["user_id"]
        document_id = chat_doc["document_id"]

        logger.info(
            f"[RAG] chat='{chat_id}' user='{user_id}' "
            f"doc='{document_id}' mode={mode}"
        )
    else:
        document_id = resolve_document_id(user_id, document_id or "default")
        logger.info(
            f"[RAG] (legacy) user='{user_id}' doc='{document_id}' mode={mode}"
        )

    q_short = question[:60]
    logger.info(f"[RAG] q='{q_short}'")

    if resolved_chat_id:
        history_str = await _load_history_for_chat(resolved_chat_id)
    else:
        history_str = ""
        try:
            from app.services.memory import get_chat_history as _old_get, format_history_for_prompt
            from app.services.database import get_chats_collection
            old_doc = await get_chats_collection().find_one(
                {"user_id": user_id, "document_id": document_id}
            )
            if old_doc and old_doc.get("messages"):
                msgs = old_doc["messages"][-10:]
                history_str = format_history_for_prompt(
                    [{"role": m["role"], "content": m["content"]} for m in msgs]
                )
        except Exception:
            pass

    results = retrieve_relevant_chunks(
        question,
        user_id=user_id,
        document_id=document_id,
        top_k=settings.TOP_K_RESULTS,
    )

    if not results:
        logger.warning("[RAG] No chunks retrieved.")
        if resolved_chat_id:
            await _save_pair_to_chat(resolved_chat_id, question, NOT_FOUND)
        return {
            "answer": NOT_FOUND,
            "sources": [],
            "confidence": 0.0,
            "mode": mode,
            "document_id": document_id,
            "chat_id": resolved_chat_id,
            "highlight_text": "",
        }

    results = [(d, s) for d, s in results if s >= SIMILARITY_THRESHOLD]
    if not results:
        logger.warning(f"[RAG] All chunks below threshold {SIMILARITY_THRESHOLD}.")
        if resolved_chat_id:
            await _save_pair_to_chat(resolved_chat_id, question, NOT_FOUND)
        return {
            "answer": NOT_FOUND,
            "sources": [],
            "confidence": 0.0,
            "mode": mode,
            "document_id": document_id,
            "chat_id": resolved_chat_id,
            "highlight_text": "",
        }

    context, sources, scores = _build_context_and_sources(results)
    confidence = round(sum(scores) / len(scores), 4)

    highlight_text = results[0][0].page_content.strip()[:300]

    prompt = _build_prompt(question, context, history_str, mode)
    logger.info(
        f"[RAG] Calling LLM | prompt={len(prompt)} chars | conf={confidence}"
    )

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
        "not available in",
    ]
    if any(sig in answer.lower() for sig in _signals):
        answer = NOT_FOUND
        sources = []
        highlight_text = ""

    if resolved_chat_id:
        await _save_pair_to_chat(resolved_chat_id, question, answer)

    logger.info(f"[RAG] Done | confidence={confidence} | sources={len(sources)}")

    return {
        "answer": answer,
        "sources": sources,
        "confidence": confidence,
        "mode": mode,
        "document_id": document_id,
        "chat_id": resolved_chat_id,
        "highlight_text": highlight_text,
    }