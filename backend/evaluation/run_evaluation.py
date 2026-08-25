"""
run_evaluation.py — Real, non-simulated RAG evaluation runner for Synexa.

Directly calls the live Synexa ingestion and retrieval modules:
- app.services.hybrid_retriever.hybrid_retrieve
- app.services.reranker.rerank_documents
- app.services.rag_pipeline.run_rag_pipeline

Computes honest, empirical metrics from real vector searches and LLM responses.
Does not write or pollute MongoDB chat histories (invokes RAG with chat_id=None).
"""

import os
import sys
import json
import time
import asyncio
import argparse
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

# Force UTF-8 encoding for standard output on Windows
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

# Add backend root to sys.path so app modules import cleanly
_BACKEND_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if _BACKEND_ROOT not in sys.path:
    sys.path.insert(0, _BACKEND_ROOT)

from evaluation.metrics import (
    evaluate_hit_at_k,
    evaluate_keyword_recall,
    evaluate_refusal_correctness,
    evaluate_lexical_grounding,
)


def load_dataset(dataset_path: str) -> Dict[str, Any]:
    if not os.path.isfile(dataset_path):
        raise FileNotFoundError(f"Evaluation dataset file not found at: {dataset_path}")
    with open(dataset_path, "r", encoding="utf-8") as f:
        return json.load(f)


def _is_placeholder(val: Optional[str]) -> bool:
    if not val:
        return True
    placeholders = {"your_user_id", "your_document_id", "replace with", "<", ">"}
    val_lower = val.lower()
    return any(p in val_lower for p in placeholders)


async def evaluate_single_sample(
    sample: Dict[str, Any],
    top_k: int = 5,
    mode: str = "simple",
    skip_llm: bool = False,
) -> Dict[str, Any]:
    """Execute real retrieval and generation for a single test sample."""
    sample_id = sample.get("id", "unknown")
    question = sample.get("question", "").strip()
    user_id = sample.get("user_id", "default")
    doc_id = sample.get("document_id", "default")
    is_template = sample.get("is_template", False)
    category = sample.get("category", "general")
    allow_refusal = sample.get("allow_refusal", False)

    expected_doc = sample.get("expected_source_document")
    expected_pages = sample.get("expected_pages") or []
    expected_keywords = sample.get("expected_evidence_keywords") or []

    result_record = {
        "id": sample_id,
        "category": category,
        "question": question,
        "is_template": is_template,
        "user_id": user_id,
        "document_id": doc_id,
        "status": "PENDING",
        "retrieval": {},
        "generation": {},
        "metrics": {},
        "notes": sample.get("notes", ""),
    }

    # 1. Check for unpopulated template placeholders
    if _is_placeholder(user_id) or _is_placeholder(doc_id) or _is_placeholder(question):
        result_record["status"] = "SKIPPED_TEMPLATE_PLACEHOLDER"
        result_record["notes"] = "Skipped: Sample contains unpopulated template placeholder values."
        return result_record

    # 2. Real Retrieval Execution
    try:
        from app.services.hybrid_retriever import hybrid_retrieve
        from app.services.reranker import rerank_documents

        t_ret_start = time.perf_counter()
        candidates = hybrid_retrieve(
            query=question,
            user_id=user_id,
            document_id=doc_id,
            top_k=top_k * 2,
        )
        reranked = rerank_documents(
            query=question,
            candidates=candidates,
            top_k=top_k,
        )
        retrieval_latency_sec = round(time.perf_counter() - t_ret_start, 4)

        chunk_records = []
        context_texts = []
        for doc, score in reranked:
            chunk_content = doc.page_content.strip()
            parent_text = doc.metadata.get("parent_text", chunk_content)
            context_texts.append(parent_text)
            chunk_records.append({
                "document_name": doc.metadata.get("document_name", ""),
                "page": doc.metadata.get("page"),
                "chunk_id": doc.metadata.get("chunk_id"),
                "score": score,
                "content": chunk_content,
                "content_preview": chunk_content[:150],
            })

        aggregated_context = "\n\n".join(context_texts)

        result_record["retrieval"] = {
            "latency_sec": retrieval_latency_sec,
            "chunks_retrieved": len(chunk_records),
            "top_score": chunk_records[0]["score"] if chunk_records else 0.0,
            "chunks": chunk_records,
        }

        # Compute deterministic retrieval metrics
        hit = evaluate_hit_at_k(
            retrieved_chunks=chunk_records,
            expected_document=expected_doc,
            expected_pages=expected_pages,
            expected_keywords=expected_keywords,
        )
        recall = evaluate_keyword_recall(
            retrieved_context=aggregated_context,
            expected_keywords=expected_keywords,
        )

        result_record["metrics"]["hit_at_k"] = hit
        result_record["metrics"]["evidence_recall_at_k"] = recall

    except FileNotFoundError as e:
        if category == "missing_document_handling":
            result_record["status"] = "PASSED_SAFE_FAILURE"
            result_record["retrieval"] = {"error": f"Safely caught expected missing index: {e}"}
            result_record["metrics"]["safe_handling"] = True
            return result_record
        else:
            result_record["status"] = "ERROR_INDEX_NOT_FOUND"
            result_record["retrieval"] = {"error": str(e)}
            return result_record

    except Exception as e:
        result_record["status"] = "ERROR_RETRIEVAL_FAILED"
        result_record["retrieval"] = {"error": str(e)}
        return result_record

    # 3. Real Answer Generation (if LLM is enabled)
    if not skip_llm:
        try:
            from app.services.rag_pipeline import run_rag_pipeline

            t_gen_start = time.perf_counter()
            rag_output = await run_rag_pipeline(
                question=question,
                mode=mode,
                chat_id=None,  # chat_id=None ensures read-only run without MongoDB chat pollution
                user_id=user_id,
                document_id=doc_id,
            )
            generation_latency_sec = round(time.perf_counter() - t_gen_start, 4)

            answer = rag_output.get("answer", "")
            confidence = rag_output.get("confidence", 0.0)

            refusal_correct = evaluate_refusal_correctness(
                answer=answer,
                is_refusal_expected=allow_refusal,
            )
            grounding_score = evaluate_lexical_grounding(
                answer=answer,
                retrieved_context=aggregated_context,
            )

            result_record["generation"] = {
                "latency_sec": generation_latency_sec,
                "answer": answer,
                "confidence": confidence,
                "refusal_correctness": refusal_correct,
                "lexical_grounding": grounding_score,
            }
            result_record["metrics"]["refusal_correctness"] = refusal_correct
            result_record["metrics"]["lexical_grounding"] = grounding_score

        except Exception as e:
            result_record["generation"] = {"error": str(e)}
            result_record["status"] = "PARTIAL_RETRIEVAL_ONLY"
            return result_record

    result_record["status"] = "EVALUATED"
    return result_record


async def run_evaluation(
    dataset_path: str,
    output_path: str,
    top_k: int = 5,
    mode: str = "simple",
    skip_llm: bool = False,
) -> Dict[str, Any]:
    print("=" * 75)
    print("  SYNEXA REAL RAG EVALUATION BENCHMARK SUITE")
    print("=" * 75)
    print(f"  Dataset        : {dataset_path}")
    print(f"  Top K          : {top_k}")
    print(f"  Answer Mode    : {mode}")
    print(f"  LLM Generation : {'Disabled (--skip-llm)' if skip_llm else 'Enabled'}")
    print("=" * 75 + "\n")

    dataset = load_dataset(dataset_path)
    samples = dataset.get("samples", [])

    if not samples:
        print("[WARN] No samples found in dataset.")
        return {}

    eval_results = []
    print(f"Executing evaluation across {len(samples)} sample(s)...\n")

    for idx, sample in enumerate(samples, start=1):
        s_id = sample.get("id", f"sample_{idx}")
        cat = sample.get("category", "general")
        q = sample.get("question", "")[:65]
        print(f"[{idx}/{len(samples)}] Running '{s_id}' [{cat}]")
        print(f"       Q: \"{q}...\"")

        res = await evaluate_single_sample(
            sample=sample,
            top_k=top_k,
            mode=mode,
            skip_llm=skip_llm,
        )
        eval_results.append(res)

        status_flag = res["status"]
        ret_latency = res.get("retrieval", {}).get("latency_sec", "N/A")
        hit_val = res.get("metrics", {}).get("hit_at_k")
        hit_str = f"Hit@{top_k}: {hit_val}" if hit_val is not None else "Hit: N/A"
        print(f"       -> Status: {status_flag} | Latency: {ret_latency}s | {hit_str}\n")

    # Aggregate Metrics
    total_samples = len(eval_results)
    evaluated_samples = [r for r in eval_results if r["status"] in ("EVALUATED", "PASSED_SAFE_FAILURE")]
    skipped_templates = [r for r in eval_results if r["status"] == "SKIPPED_TEMPLATE_PLACEHOLDER"]
    errored_samples = [r for r in eval_results if "ERROR" in r["status"]]

    # Valid Ground Truth Hit/Recall calculations
    hit_evaluable = [r for r in eval_results if r.get("metrics", {}).get("hit_at_k") is not None]
    hit_rate = (
        round(sum(1 for r in hit_evaluable if r["metrics"]["hit_at_k"] is True) / len(hit_evaluable), 4)
        if hit_evaluable else None
    )

    recall_evaluable = [r for r in eval_results if r.get("metrics", {}).get("evidence_recall_at_k") is not None]
    avg_recall = (
        round(sum(r["metrics"]["evidence_recall_at_k"] for r in recall_evaluable) / len(recall_evaluable), 4)
        if recall_evaluable else None
    )

    # Latencies
    retrieval_latencies = [
        r["retrieval"]["latency_sec"]
        for r in eval_results
        if "latency_sec" in r.get("retrieval", {})
    ]
    avg_ret_latency = (
        round(sum(retrieval_latencies) / len(retrieval_latencies), 4)
        if retrieval_latencies else 0.0
    )

    gen_latencies = [
        r["generation"]["latency_sec"]
        for r in eval_results
        if "latency_sec" in r.get("generation", {})
    ]
    avg_gen_latency = (
        round(sum(gen_latencies) / len(gen_latencies), 4)
        if gen_latencies else None
    )

    # Refusal and Guardrail Accuracy
    refusal_evaluable = [r for r in eval_results if r.get("metrics", {}).get("refusal_correctness") is not None]
    refusal_acc = (
        round(sum(1 for r in refusal_evaluable if r["metrics"]["refusal_correctness"] is True) / len(refusal_evaluable), 4)
        if refusal_evaluable else None
    )

    summary_report = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "configuration": {
            "dataset": dataset_path,
            "top_k": top_k,
            "mode": mode,
            "skip_llm": skip_llm,
        },
        "counts": {
            "total_questions": total_samples,
            "evaluated_questions": len(evaluated_samples),
            "skipped_placeholders": len(skipped_templates),
            "error_questions": len(errored_samples),
        },
        "empirical_metrics": {
            "hit_at_k": {
                "metric_name": f"Hit@{top_k}",
                "value": hit_rate,
                "percentage": f"{hit_rate * 100:.1f}%" if hit_rate is not None else "Not Available",
                "sample_count": len(hit_evaluable),
                "notes": "Calculated only when expected document, page, or evidence keywords are provided." if hit_rate is None else "Evaluated on labeled samples.",
            },
            "evidence_recall_at_k": {
                "metric_name": f"Evidence Recall@{top_k}",
                "value": avg_recall,
                "percentage": f"{avg_recall * 100:.1f}%" if avg_recall is not None else "Not Available",
                "sample_count": len(recall_evaluable),
                "notes": "Calculated only when expected evidence keywords are provided." if avg_recall is None else "Mean recall of ground-truth keywords in retrieved context.",
            },
            "guardrail_refusal_accuracy": {
                "metric_name": "Guardrail Refusal Accuracy",
                "value": refusal_acc,
                "percentage": f"{refusal_acc * 100:.1f}%" if refusal_acc is not None else "Not Available",
                "sample_count": len(refusal_evaluable),
                "notes": "Measures whether out-of-domain and ungrounded queries are safely refused without hallucinations.",
            },
            "mean_retrieval_latency_sec": avg_ret_latency,
            "mean_generation_latency_sec": avg_gen_latency,
        },
        "sample_details": eval_results,
    }

    # Print Formatted Report to stdout
    print("=" * 75)
    print("  EMPIRICAL EVALUATION SUMMARY REPORT")
    print("=" * 75)
    print(f"  * Total Evaluated Questions     : {len(evaluated_samples)} / {total_samples}")
    print(f"  * Skipped Template Placeholders : {len(skipped_templates)}")
    print(f"  * Average Retrieval Latency     : {avg_ret_latency * 1000:.1f} ms ({avg_ret_latency}s)")
    if avg_gen_latency is not None:
        print(f"  * Average LLM Generation Latency: {avg_gen_latency * 1000:.1f} ms ({avg_gen_latency}s)")
    else:
        print("  * Average LLM Generation Latency: Skipped / Not measured")

    print("\n  [DETERMINISTIC RETRIEVAL & ACCURACY METRICS]")
    if hit_rate is not None:
        print(f"  * Hit@{top_k}                        : {hit_rate * 100:.1f}% (across {len(hit_evaluable)} labeled samples)")
    else:
        print(f"  * Hit@{top_k}                        : N/A (Requires labeled expected_document or expected_keywords)")

    if avg_recall is not None:
        print(f"  * Evidence Recall@{top_k}             : {avg_recall * 100:.1f}% (across {len(recall_evaluable)} labeled samples)")
    else:
        print(f"  * Evidence Recall@{top_k}             : N/A (Requires labeled expected_evidence_keywords)")

    if refusal_acc is not None:
        print(f"  * Guardrail Refusal Accuracy    : {refusal_acc * 100:.1f}% (across {len(refusal_evaluable)} test cases)")
    else:
        print("  * Guardrail Refusal Accuracy    : N/A")

    print("=" * 75)

    # Save to output file
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(summary_report, f, indent=2)
    print(f"\n[OK] Structured report saved to: {output_path}\n")

    return summary_report


def main():
    parser = argparse.ArgumentParser(description="Synexa Real RAG Evaluation Runner")
    parser.add_argument(
        "--dataset",
        type=str,
        default=os.path.join(os.path.dirname(__file__), "dataset.json"),
        help="Path to evaluation dataset JSON",
    )
    parser.add_argument(
        "--output",
        type=str,
        default=os.path.join(os.path.dirname(__file__), "evaluation_results.json"),
        help="Path to output results JSON",
    )
    parser.add_argument(
        "--top-k",
        type=int,
        default=5,
        help="Retrieval top-k candidate count (default: 5)",
    )
    parser.add_argument(
        "--mode",
        type=str,
        choices=["simple", "detailed", "exam"],
        default="simple",
        help="Answer generation mode (default: simple)",
    )
    parser.add_argument(
        "--skip-llm",
        action="store_true",
        help="Skip LLM answer generation and benchmark retrieval only",
    )

    args = parser.parse_args()

    asyncio.run(
        run_evaluation(
            dataset_path=args.dataset,
            output_path=args.output,
            top_k=args.top_k,
            mode=args.mode,
            skip_llm=args.skip_llm,
        )
    )


if __name__ == "__main__":
    main()
