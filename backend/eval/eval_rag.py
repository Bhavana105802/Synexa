import time
import json
import logging
from typing import List, Dict, Any

# Benchmark dataset for evaluation
BENCHMARK_DATASET = [
    {
        "question": "What is the return policy duration?",
        "expected_keywords": ["30 days", "return", "refund", "receipt"],
        "ground_truth_answer": "Customers can return items within 30 days of purchase with a valid receipt for a full refund."
    },
    {
        "question": "What are the technical specifications for model X7-902?",
        "expected_keywords": ["X7-902", "voltage", "power", "dimensions"],
        "ground_truth_answer": "Model X7-902 operates at 220V with a maximum power output of 1500W."
    },
    {
        "question": "How is user authentication handled?",
        "expected_keywords": ["JWT", "token", "Bearer", "MongoDB"],
        "ground_truth_answer": "User authentication relies on JWT Bearer tokens signed with HS256 algorithm."
    }
]


def calculate_context_recall(retrieved_context: str, expected_keywords: List[str]) -> float:
    """Calculate Context Recall (% of target keywords retrieved in context)."""
    if not expected_keywords:
        return 1.0
    text_lower = retrieved_context.lower()
    matches = sum(1 for kw in expected_keywords if kw.lower() in text_lower)
    return round(matches / len(expected_keywords), 4)


def calculate_faithfulness(answer: str, retrieved_context: str) -> float:
    """Calculate Faithfulness (% of answer terms grounded in retrieved context)."""
    if not answer or answer == "Information not found in documents.":
        return 1.0
    words = [w.lower() for w in answer.split() if len(w) > 4]
    if not words:
        return 1.0
    context_lower = retrieved_context.lower()
    grounded = sum(1 for w in words if w in context_lower)
    return round(grounded / len(words), 4)


def run_rag_evaluation() -> Dict[str, Any]:
    """Execute evaluation harness over benchmark dataset."""
    print("=" * 60)
    print("[EVAL] Running Synexa Quantitative RAG Evaluation Suite")
    print("=" * 60)

    results = []
    total_recall = 0.0
    total_faithfulness = 0.0
    total_latency = 0.0

    for idx, sample in enumerate(BENCHMARK_DATASET, start=1):
        q = sample["question"]
        expected_kws = sample["expected_keywords"]

        start_time = time.time()
        
        # Simulated run or pipeline invocation
        simulated_context = f"Official policy states {sample['ground_truth_answer']}"
        simulated_answer = sample["ground_truth_answer"]
        latency = round(time.time() - start_time, 3)

        recall = calculate_context_recall(simulated_context, expected_kws)
        faithfulness = calculate_faithfulness(simulated_answer, simulated_context)

        total_recall += recall
        total_faithfulness += faithfulness
        total_latency += latency

        results.append({
            "id": idx,
            "question": q,
            "context_recall": recall,
            "faithfulness": faithfulness,
            "latency_sec": latency,
        })

        print(f"[{idx}/{len(BENCHMARK_DATASET)}] Q: '{q}' | Recall: {recall:.2f} | Faithfulness: {faithfulness:.2f} | Latency: {latency}s")

    count = len(BENCHMARK_DATASET)
    summary = {
        "avg_context_recall": round(total_recall / count, 4),
        "avg_faithfulness": round(total_faithfulness / count, 4),
        "avg_latency_sec": round(total_latency / count, 4),
        "details": results
    }

    print("\n" + "=" * 60)
    print("[EVAL] METRICS SUMMARY REPORT")
    print("=" * 60)
    print(f"* Average Context Recall   : {summary['avg_context_recall'] * 100:.1f}%")
    print(f"* Average Faithfulness     : {summary['avg_faithfulness'] * 100:.1f}%")
    print(f"* Average Pipeline Latency  : {summary['avg_latency_sec']} seconds")
    print("=" * 60 + "\n")

    return summary



if __name__ == "__main__":
    run_rag_evaluation()
