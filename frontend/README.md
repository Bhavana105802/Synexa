# DocMind — RAG Frontend

A modern AI document assistant frontend built with React + Vite + Tailwind CSS.

## Tech Stack

| Tool | Purpose |
|---|---|
| React 18 + Vite | Framework & build tool |
| Tailwind CSS | Styling |
| Framer Motion | Animations |
| Axios | HTTP requests to FastAPI backend |
| react-pdf | PDF rendering in the viewer panel |
| react-dropzone | Drag-and-drop file upload |
| react-markdown | Markdown rendering in chat |
| Lucide React | Icons |

---

## Setup

### 1. Install dependencies
```bash
cd frontend
npm install
```

### 2. Make sure the backend is running
```bash
# In the backend folder:
uvicorn app.main:app --reload
# Should be running at http://127.0.0.1:8000
```

### 3. Start the frontend dev server
```bash
npm run dev
# Opens at http://localhost:5173
```

> **Note:** Vite proxies `/upload` and `/ask` requests to `http://127.0.0.1:8000` automatically — no CORS issues.

---

## Pages

| Route | Page | Description |
|---|---|---|
| `/` | Landing | Hero, features, CTA |
| `/dashboard` | Dashboard | Document list, recent questions |
| `/upload` | Upload | Drag-and-drop PDF upload |
| `/chat` | Chat | 3-panel: Sidebar + Chat + PDF Viewer |

---

## Features

- **3-panel chat layout** — Sidebar, Chat, Document Viewer
- **Drag-and-drop upload** with progress bar
- **Markdown rendering** in AI responses
- **Source citations** — click to jump to PDF page
- **Confidence score** — animated progress bar
- **Answer modes** — Simple / Detailed / Exam
- **Typing indicator** — animated dots while AI responds
- **Copy response** button on each AI message
- **Collapsible sidebar** and document viewer
- **Dark mode toggle**
- **Auto-scroll** on new messages
- **Responsive layout**

---

## Folder Structure

```
src/
├── components/
│   ├── Sidebar.jsx          # Left panel: docs, history, controls
│   ├── ChatBox.jsx          # Center: messages + input
│   ├── MessageBubble.jsx    # Individual message with markdown
│   ├── DocumentViewer.jsx   # Right: PDF preview with react-pdf
│   ├── UploadArea.jsx       # Dropzone with progress bar
│   └── AnswerModeSelector.jsx  # Simple/Detailed/Exam toggle
├── pages/
│   ├── Landing.jsx          # /
│   ├── Dashboard.jsx        # /dashboard
│   ├── Upload.jsx           # /upload
│   └── Chat.jsx             # /chat
├── services/
│   └── api.js               # All axios calls to backend
├── context/
│   └── ChatContext.jsx      # Global state (docs, messages, etc.)
├── App.jsx                  # Router + ChatProvider
├── main.jsx                 # Entry point
└── index.css                # Tailwind + global styles
```

---

## Build for production

```bash
npm run build
# Output in dist/ folder
```
