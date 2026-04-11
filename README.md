## Synexa 📄

Synexa is an intelligent document analysis platform that allows users to upload documents and interact with them through natural language queries. It transforms static files into dynamic, searchable knowledge using AI-powered Retrieval-Augmented Generation (RAG).

## 🌐 Overview

Synexa enables users to:

* Upload documents (PDF, DOCX, TXT)
* Automatically process and index content
* Ask questions and receive contextual answers
* View document previews alongside chat responses

The system combines document processing, semantic search, and conversational AI to deliver accurate and context-aware insights.

## 🚀 Features

### 📄 Document Processing

* Supports PDF, DOCX, and TXT formats
* Automatic text extraction and chunking
* Embedding generation for semantic search

### 🤖 AI Chat Interface

* Natural language question answering
* Context-aware responses based on document content
* Chat history linked to documents

### 🖥️ Document Viewer

* Interactive preview with zoom and navigation
* Unified viewing experience across file types
* Side-by-side chat and document interface

### 🧠 Retrieval-Augmented Generation (RAG)

* Semantic search using vector embeddings
* Relevant chunk retrieval using FAISS
* Response generation grounded in document data

### 🔐 User Management

* User authentication (signup/login)
* User-specific documents and chats
* MongoDB-based storage


## 🛠️ Tech Stack

| Category     | Technologies Used                                  |
| ------------ | -------------------------------------------------- |
| Frontend  | React (Vite), Tailwind CSS, Context API, React-PDF |
| Backend   | FastAPI (Python), LangChain                        |
| Database | MongoDB (Atlas)                                    |
| Vector DB | FAISS                                              |
| AI Models | sentence-transformers (MiniLM), Ollama (Phi-3)     |


## 📁 Project Structure

```
Synexa/
│
├── backend/
│   ├── app/
│   ├── vectorstore/
│   ├── data/documents/
│   └── main.py
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── context/
│   │   ├── services/
│   │   └── App.jsx
│   └── index.html
│
└── README.md
```

## Installation and Setup

### 1️⃣ Clone the repository

```
git clone https://github.com/Lahari468/Synexa.git
cd Synexa
```

### 2️⃣ Backend Setup

```
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Create a `.env` file:

```
MONGO_URI=your_mongodb_connection_string
MONGO_DB_NAME=synexa
```

Run the backend:

```
uvicorn app.main:app --reload
```

### 3️⃣ Frontend Setup

```
cd frontend
npm install
npm run dev
```

Frontend runs at:

```
http://localhost:5173
```
## How It Works

1. User uploads a document
2. Backend extracts text and splits into chunks
3. Embeddings are generated and stored in FAISS
4. User asks a question
5. Relevant chunks are retrieved
6. LLM generates a contextual answer

## Future Enhancements

* Real-time upload progress tracking
* Background document processing
* Multi-document querying
* Highlight answers inside documents
* Improved large file handling
