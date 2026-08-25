# Synexa Real RAG Evaluation Suite 🧪

A deterministic, empirical evaluation framework for **Synexa**. This framework executes queries directly against live vector stores and BM25 indices created by the application, measuring retrieval quality, guardrail efficacy, and latencies without simulation or fake percentages.

---

## 🎯 Key Design Principles

1. **Direct Pipeline Execution**: Unlike mock benchmark scripts, this suite imports and calls the real `hybrid_retrieve()`, `rerank_documents()`, and `run_rag_pipeline()` functions from the backend services.
2. **Safe & Non-Destructive**: Invokes RAG operations with `chat_id=None`, ensuring zero mutations or writes to MongoDB chat history collections.
3. **Transparent & Honest Metrics**: If ground truth (e.g., expected document name, pages, or evidence keywords) is absent, the metric is explicitly marked `N/A` rather than hallucinating an arbitrary percentage.
4. **Failure & Guardrail Testing**: Explicitly tests out-of-domain queries, adversarial prompt injections, and missing vector indices to verify that negative prompt constraints and error handlers function correctly.

---

## 📁 Module Structure

```
backend/
└── evaluation/
    ├── dataset.json             # Benchmark test cases & template dataset
    ├── metrics.py               # Deterministic metric calculation functions
    ├── run_evaluation.py        # Async benchmark runner CLI
    ├── evaluation_results.json  # Output structured benchmark report (generated on run)
    └── README.md                # Documentation & usage guide
```

---

## 🚀 Running the Evaluation

Ensure you are inside the `backend` directory with your virtual environment activated:

```bash
cd backend
# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
source .venv/bin/activate
```

### 1. Run Retrieval-Only Benchmark (Fastest, no LLM required)
Evaluates Dense FAISS + Sparse BM25 + Cross-Encoder reranking and measures retrieval latency:

```bash
python -m evaluation.run_evaluation --skip-llm
```

### 2. Run Full End-to-End RAG Evaluation (Retrieval + Answer Generation)
Evaluates both retrieval and LLM answer generation, measuring refusal correctness and generation latency:

```bash
python -m evaluation.run_evaluation
```

### 3. CLI Options

| Flag | Default | Description |
|---|---|---|
| `--dataset` | `evaluation/dataset.json` | Path to dataset JSON file. |
| `--output` | `evaluation/evaluation_results.json` | Path to save output report. |
| `--top-k` | `5` | Number of top retrieved chunks to inspect. |
| `--mode` | `simple` | Answer generation mode (`simple`, `detailed`, or `exam`). |
| `--skip-llm` | `False` | Skip LLM answer generation and benchmark retrieval only. |

---

## 📝 How to Add Real Evaluation Questions

To evaluate your own uploaded documents, add entries into `backend/evaluation/dataset.json`:

```json
{
  "id": "eval_my_doc_001",
  "is_template": false,
  "category": "domain_factual",
  "question": "What is the warranty period for Model X?",
  "user_id": "<YOUR_USER_ID>",
  "document_id": "<YOUR_DOCUMENT_ID>",
  "expected_source_document": "product_manual.pdf",
  "expected_pages": [4],
  "expected_evidence_keywords": ["warranty", "24 months", "parts"],
  "expected_answer_contains": ["24 months"],
  "allow_refusal": false,
  "notes": "Tests warranty period extraction from page 4."
}
```

### Where to Find `user_id` and `document_id`:
- Check the folder names inside `backend/vectorstore/`: `vectorstore/<user_id>/<document_id>/`.
- Or inspect the response payload returned by `POST /upload` when uploading via the UI or API.

---

## 📊 Measured Metrics

- **Hit@K**: Returns `True` if at least one chunk among the top $K$ results satisfies the ground truth (matching `expected_source_document`, `expected_pages`, or `expected_evidence_keywords`).
- **Evidence Recall@K**: Fraction of specified `expected_evidence_keywords` present in the combined retrieved context.
- **Guardrail Refusal Accuracy**: Proportion of out-of-domain / adversarial queries correctly refused with `"Information not found in documents."`
- **Mean Retrieval Latency**: Wall-clock duration of FAISS dense search + BM25 sparse search + RRF fusion + FlashRank reranking.
- **Mean Generation Latency**: Wall-clock duration of LLM context synthesis.
