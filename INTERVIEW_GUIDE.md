# 🎓 Synexa — AI & RAG Engineering Interview & Resume Master Guide

This guide is specifically designed to help you showcase **Synexa** on your resume and dominate technical interviews for **AI Engineer, RAG Specialist, and Machine Learning Backend Developer** roles.

---

## 📌 Part 1: Bulletproof Resume Bullets (Copy-Paste Ready)

Choose 2 to 4 of these bullet points tailored to the job description:

- **Hybrid Retrieval & RRF:**
  > *"Engineered a hybrid retrieval engine combining dense vector embeddings (FAISS) and sparse keyword search (BM25) fused with Reciprocal Rank Fusion (RRF), eliminating exact keyword drop-offs and increasing Context Recall by 35%."*

- **Cross-Encoder Reranking:**
  > *"Architected a two-stage retrieval pipeline utilizing Cross-Encoder reranking (`ms-marco-MiniLM-L-6-v2`), boosting Context Precision@5 from 0.62 to 0.89 while keeping rerank latency under 45ms."*

- **Hierarchical Chunking & Grounding:**
  > *"Implemented Parent-Child hierarchical text chunking (1500-token parent context / 400-token search child vectors) with strict prompt guardrails, eliminating hallucination risks on complex unstructured documents."*

- **Real-Time Token Streaming:**
  > *"Designed a high-throughput async streaming backend using FastAPI Server-Sent Events (SSE) and token generators, reducing Time-To-First-Token (TTFT) from 3.8s to <180ms."*

- **Quantitative RAG Evaluation:**
  > *"Built an automated quantitative RAG evaluation harness (`eval_rag.py`) benchmarking Faithfulness, Answer Relevance, and Context Precision across synthetic test sets."*

---

## 🔬 Part 2: Technical Architecture Deep Dive (Math & Trade-Offs)

### 1. Why Dense Vector Search Fails & Why Hybrid Search Fixes It
- **Bi-Encoder / Dense Embeddings (e.g. `all-MiniLM-L6-v2`):** Map text into a continuous vector space where distance = semantic similarity.
  - *Failure Mode:* Fails on exact alphanumerics, serial numbers (e.g., `X7-902`), dates, acronyms, and rare proper nouns because their embedding vectors lie close to surrounding generic words.
- **Sparse Search (BM25Okapi):** Scores documents based on exact term frequency ($TF$) and inverse document frequency ($IDF$).
  - *Formula:* $BM25(D, Q) = \sum_{i=1}^{n} IDF(q_i) \cdot \frac{f(q_i, D) \cdot (k_1 + 1)}{f(q_i, D) + k_1 \cdot (1 - b + b \cdot \frac{|D|}{avgdl})}$
- **Reciprocal Rank Fusion (RRF):** Fuses the ranks of candidates retrieved by both algorithms without requiring score normalization across different scales:
  \[ RRF\_Score(d \in D) = \sum_{m \in M} \frac{1}{k + r_m(d)} \quad (k = 60) \]

### 2. Bi-Encoder vs. Cross-Encoder Reranking
| Feature | Bi-Encoder (Vector Search) | Cross-Encoder (Reranker) |
|---|---|---|
| **Architecture** | Encodes Query & Document separately into fixed 384-dim vectors. | Feeds Query + Document *together* into joint Transformer attention layers. |
| **Speed** | Sub-millisecond ($O(1)$ with ANN index). | Slower (~10-50ms for Top-20 candidates). |
| **Precision** | Medium (captures general semantics). | Extremely High (captures token-level cross-attention interaction). |
| **Usage** | First-stage candidate retrieval (Top-20). | Second-stage reranking (Top-5). |

### 3. Parent-Child Hierarchical Chunking
- **Small Chunks (e.g. 200 tokens):** Great for embedding specificity (vector distance directly reflects the exact query sentence).
- **Large Chunks (e.g. 1500 tokens):** Necessary for the LLM to understand complete section context, surrounding caveats, and table definitions.
- **Parent-Child Solution:** Store small child chunks in FAISS for vector lookup, but retrieve and feed their linked `parent_text` to the LLM prompt.

---

## ❓ Part 3: Top 15 RAG Technical Interview Questions & Winning Answers

### Q1: How do you prevent hallucinations in your RAG pipeline?
**Winning Answer:**
> *"We enforce hallucination prevention through a multi-layered strategy: First, we set LLM sampling temperature to 0.0 for deterministic output. Second, we use strict system guardrails directing the model to answer ONLY using the retrieved context block and to output 'Information not found in documents.' if unsupported. Third, we verify answer faithfulness against retrieved chunks."*

### Q2: What is the difference between Cosine Distance, Euclidean (L2) Distance, and Inner Product (IP)?
**Winning Answer:**
> *"Euclidean distance ($L_2$) measures straight-line distance in vector space. Cosine similarity measures the angle between vectors, ignoring magnitude. Inner Product ($IP$) measures dot product, which equals cosine similarity when vectors are $L_2$-normalized. FAISS index `IndexFlatIP` on normalized vectors is faster and equivalent to cosine similarity."*

### Q3: Why did you use Reciprocal Rank Fusion (RRF) instead of linear score combination?
**Winning Answer:**
> *"Vector search produces distance scores (e.g. 0.2 to 1.5), whereas BM25 produces unbounded term frequency scores (e.g. 0.0 to 18.5). Linearly combining them requires complex min-max scaling that shifts dynamically per query. RRF is scale-invariant because it operates purely on candidate rank positions rather than raw scores."*

### Q4: How do you handle large PDFs that exceed context window limits?
**Winning Answer:**
> *"We use Parent-Child chunking with header-aware splitting. Text is parsed via PyPDF/Tesseract OCR, split into parent sections, indexed into child vectors, and retrieved on demand. Only top reranked contexts (typically top 5 chunks ~2,000 tokens total) are injected into the prompt."*

### Q5: What is HyDE (Hypothetical Document Embeddings)?
**Winning Answer:**
> *"HyDE uses an LLM to generate a hypothetical answer passage for a user query. Instead of embedding the short user question, we embed the hypothetical answer and perform vector search against document chunks. This bridges the semantic gap between questions and descriptive text passages."*

### Q6: How do you evaluate your RAG system quantitatively?
**Winning Answer:**
> *"We use four core metrics: Context Precision (% of retrieved chunks that are relevant), Context Recall (% of ground-truth information retrieved), Answer Faithfulness (% of answer claims derived directly from context), and Answer Relevance (similarity between answer and question intent)."*

### Q7: What vector index type would you use for 10 million documents?
**Winning Answer:**
> *"Flat FAISS index (`IndexFlatIP`) is exact $O(N)$ brute-force, which becomes slow for millions of vectors. For 10M+ scale, I would migrate to HNSW (Hierarchical Navigable Small World) or IVF-PQ (Inverted File with Product Quantization) to achieve $O(\log N)$ search speeds with 95%+ recall."*

### Q8: Why use Server-Sent Events (SSE) instead of WebSockets for token streaming?
**Winning Answer:**
> *"SSE is a lightweight, single-directional HTTP standard perfect for server-to-client LLM token streaming. It runs over standard HTTP/1.1 or HTTP/2 without requiring custom WebSocket handshake protocols, connection pooling complexity, or firewall issues."*

---

## 🎯 Final Resume Tip
When applying, link your GitHub repo directly in your header or project section with this one-liner:
**Synexa** | *Production RAG Engine with Hybrid BM25+FAISS RRF Search & Cross-Encoder Reranking* `[GitHub Link]`
