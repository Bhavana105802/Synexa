import logging
from typing import Dict, Any, List
from langchain_core.documents import Document
from langchain_core.messages import HumanMessage

from app.services.qa_engine import get_llm

logger = logging.getLogger(__name__)

SUMMARY_PROMPT = """\
Analyze the document text below and provide a concise executive summary.

Format your response exactly as:
SUMMARY: <3 key bullet points summarizing main insights>
TOPICS: <3 to 5 comma-separated topic tags>

Document Sample:
{text_sample}
"""


def generate_document_intelligence(chunks: List[Document]) -> Dict[str, Any]:
    """Generate executive summary and topic tags for an uploaded document."""
    if not chunks:
        return {
            "summary": "Empty document.",
            "topics": [],
            "word_count": 0,
            "est_read_time_min": 0,
        }

    full_text = " ".join([c.page_content for c in chunks])
    word_count = len(full_text.split())
    read_time = max(1, round(word_count / 200))

    text_sample = full_text[:4000]

    try:
        llm = get_llm()
        res = llm.invoke([HumanMessage(content=SUMMARY_PROMPT.format(text_sample=text_sample))])
        output = res.content if hasattr(res, "content") else str(res)

        summary_bullets = []
        topics = []

        for line in output.split("\n"):
            line = line.strip()
            if line.startswith("SUMMARY:"):
                summary_bullets.append(line.replace("SUMMARY:", "").strip())
            elif line.startswith("TOPICS:"):
                raw_topics = line.replace("TOPICS:", "").strip()
                topics = [t.strip() for t in raw_topics.split(",") if t.strip()]
            elif line.startswith("- ") or line.startswith("* "):
                summary_bullets.append(line[2:].strip())

        summary = "\n".join(summary_bullets) if summary_bullets else output[:300]

        return {
            "summary": summary,
            "topics": topics,
            "word_count": word_count,
            "est_read_time_min": read_time,
        }

    except Exception as e:
        logger.warning(f"[Summarizer] Automated summary failed: {e}")
        return {
            "summary": f"Document indexed ({len(chunks)} sections, ~{word_count} words).",
            "topics": ["Document"],
            "word_count": word_count,
            "est_read_time_min": read_time,
        }
