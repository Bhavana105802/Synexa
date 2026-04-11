import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Document, Page, pdfjs } from 'react-pdf'
import {
  FileText, ChevronLeft, ChevronRight,
  ZoomIn, ZoomOut, X, Plus, Trash2,
} from 'lucide-react'
import { useChat } from '../context/ChatContext'
import { uploadDocument, getToken } from '../services/api'
import 'react-pdf/dist/Page/AnnotationLayer.css'

pdfjs.GlobalWorkerOptions.workerSrc =
  `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

export default function Documents() {
  const navigate  = useNavigate()
  const { documents, createChat, deleteDocument } = useChat()
  const fileInputRef = useRef(null)

  const [selected,  setSelected]  = useState(null)
  const [numPages,  setNumPages]  = useState(null)
  const [pageNum,   setPageNum]   = useState(1)
  const [zoom,      setZoom]      = useState(1.0)
  const [uploading, setUploading] = useState(false)

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setUploading(true)
    try {
      const res = await uploadDocument(file)
      console.log('[Documents] upload response:', res)

      // Pass all 6 args — fileUrl + pdfUrl survive page refresh
      createChat(
        res.chat_id,
        res.document_id,
        res.filename,
        file,
        res.file_url  ?? null,
        res.pdf_url   ?? null,
      )
      navigate('/chat')
    } catch (err) {
      console.error('[Documents] upload error:', err)
      alert(err.response?.data?.detail || 'Upload failed.')
    } finally {
      setUploading(false)
    }
  }

  // Any record with a documentId can attempt a preview
  const hasSource = (doc) => Boolean(doc?.documentId)

  return (
    <div className="flex h-screen bg-[#0F172A] overflow-hidden">

      {/* ── Left panel ───────────────────────────────────── */}
      <div className="w-72 flex-shrink-0 border-r border-white/[0.06] flex flex-col">

        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <button
            onClick={() => navigate('/chat')}
            className="flex items-center gap-1.5 text-slate-500 hover:text-slate-300
                       text-xs transition-colors"
          >
            <ChevronLeft size={14} /> Back to Chat
          </button>
          <input
            ref={fileInputRef} type="file"
            accept=".pdf,.docx,.txt" className="hidden"
            onChange={handleUpload}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600
                       hover:bg-blue-500 text-white text-xs transition-all disabled:opacity-50"
          >
            <Plus size={12} />
            {uploading ? 'Uploading…' : 'Upload'}
          </button>
        </div>

        <div className="px-4 py-3 border-b border-white/[0.06]">
          <h1 className="font-bold text-white text-base">Documents</h1>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {documents.length} file{documents.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {documents.length === 0 ? (
            <div className="flex flex-col items-center py-12 gap-3">
              <FileText size={28} className="text-slate-700" />
              <p className="text-xs text-slate-600 text-center leading-relaxed">
                No documents yet.<br />Upload a file to get started.
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500
                           text-white text-xs transition-all"
              >
                Upload File
              </button>
            </div>
          ) : (
            documents.map(doc => (
              <div
                key={doc.documentId}
                className={`group w-full flex items-start gap-3 px-3 py-3 rounded-xl
                            transition-all duration-150
                            ${selected?.documentId === doc.documentId
                              ? 'bg-blue-500/10 border border-blue-500/20'
                              : 'hover:bg-white/[0.04]'}`}
              >
                <button
                  onClick={() => { setSelected(doc); setPageNum(1); setNumPages(null) }}
                  className="flex items-start gap-3 flex-1 min-w-0 text-left"
                >
                  <div className="w-9 h-9 rounded-lg bg-slate-800 border border-white/[0.06]
                                  flex items-center justify-center flex-shrink-0 mt-0.5">
                    <FileText size={16} className="text-blue-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-slate-200 truncate">
                      {doc.documentName}
                    </p>
                    <p className="text-[10px] text-slate-600 font-mono mt-0.5">
                      {doc.documentId}
                    </p>
                  </div>
                </button>

                <button
                  onClick={async (e) => {
                    e.stopPropagation()
                    if (!window.confirm(
                      `Delete "${doc.documentName}"?\n\nThis will permanently remove:\n• The document\n• Its vectorstore\n• All chats linked to it`
                    )) return
                    if (selected?.documentId === doc.documentId) setSelected(null)
                    await deleteDocument(doc.documentId)
                  }}
                  title="Delete document and all linked chats"
                  className="flex-shrink-0 p-1.5 rounded-lg text-slate-700
                             hover:text-red-400 hover:bg-red-500/10
                             opacity-0 group-hover:opacity-100
                             transition-all duration-150 mt-0.5"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Right panel ──────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selected && hasSource(selected) ? (
          <DocumentPreview
            selected={selected}
            numPages={numPages}
            setNumPages={setNumPages}
            pageNum={pageNum}
            setPageNum={setPageNum}
            zoom={zoom}
            setZoom={setZoom}
            onClose={() => setSelected(null)}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-4
                          text-center px-8">
            <FileText size={40} className="text-slate-700" />
            <div>
              <p className="text-slate-400 font-medium">Select a document to preview</p>
              <p className="text-slate-600 text-sm mt-1">
                Choose a file from the list on the left
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function DocumentPreview({
  selected, numPages, setNumPages,
  pageNum, setPageNum, zoom, setZoom, onClose,
}) {
  const [fetchedPdfUrl, setFetchedPdfUrl] = useState(null)
  const [fetching,      setFetching]      = useState(false)
  const [fetchError,    setFetchError]    = useState('')
  const [pageLoading,   setPageLoading]   = useState(false)

  const fileType = selected.documentName?.split('.').pop()?.toLowerCase() ?? ''
  const isPdf    = fileType === 'pdf'
  const needsConv = !isPdf

  // ── Resolve PDF source ────────────────────────────────────
  let fileSource = null

  if (isPdf) {
    fileSource = selected.file ?? selected.fileUrl ?? null
  } else {
    fileSource = selected.pdfUrl    
              ?? fetchedPdfUrl      
              ?? null
  }
  const needsFetch =
    needsConv &&
    !selected.pdfUrl &&
    !fetchedPdfUrl &&
    !fetching &&
    !fetchError &&
    selected.documentId

  if (needsFetch) {
    setFetching(true)
    ;(async () => {
      try {
        const token = getToken()
        const res   = await fetch(
          `/document/${encodeURIComponent(selected.documentId)}/pdf`,
          { headers: token ? { Authorization: `Bearer ${token}` } : {} },
        )
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.detail || `HTTP ${res.status}`)
        }
        const blob   = await res.blob()
        setFetchedPdfUrl(URL.createObjectURL(blob))
      } catch (err) {
        console.error('[DocumentPreview] fetch failed:', err)
        setFetchError(err.message || 'Could not load converted PDF.')
      } finally {
        setFetching(false)
      }
    })()
  }

  // ── Fetching spinner ──────────────────────────────────────
  if (fetching) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-500">
        <div className="w-5 h-5 border-2 border-slate-600 border-t-blue-400
                        rounded-full animate-spin" />
        <p className="text-xs">Loading {fileType.toUpperCase()} preview…</p>
      </div>
    )
  }

  // ── No source available ───────────────────────────────────
  if (!fileSource) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3
                      text-center px-8">
        <p className="text-red-400 text-sm font-medium">Preview unavailable</p>
        <p className="text-slate-500 text-xs leading-relaxed max-w-sm">
          {fetchError
            ? fetchError
            : isPdf
              ? 'Re-upload the file to restore the preview.'
              : 'This document was not converted to PDF at upload time. ' +
                'Ensure reportlab (TXT) or LibreOffice (DOCX) is installed ' +
                'on the server, then re-upload the file.'}
        </p>
        <p className="text-slate-600 text-xs">RAG chat still works normally.</p>
      </div>
    )
  }

  // ── Toolbar + viewer ──────────────────────────────────────
  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06]
                      bg-[#0F172A] flex-shrink-0">
        <p className="text-sm font-medium text-slate-200 truncate max-w-xs">
          {selected.documentName}
        </p>
        <div className="flex items-center gap-2">

          {/* Zoom */}
          <button
            onClick={() => setZoom(z => Math.max(0.5, +(z - 0.1).toFixed(2)))}
            className="p-1.5 rounded-lg hover:bg-white/5 text-slate-500
                       hover:text-slate-300 transition-colors"
            title="Zoom out"
          >
            <ZoomOut size={14} />
          </button>
          <span className="text-[11px] text-slate-500 font-mono w-10 text-center tabular-nums">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom(z => Math.min(2.5, +(z + 0.1).toFixed(2)))}
            className="p-1.5 rounded-lg hover:bg-white/5 text-slate-500
                       hover:text-slate-300 transition-colors"
            title="Zoom in"
          >
            <ZoomIn size={14} />
          </button>

          <div className="w-px h-4 bg-white/[0.08] mx-1" />

          {/* Page nav */}
          <button
            onClick={() => setPageNum(p => Math.max(1, p - 1))}
            disabled={pageNum <= 1}
            className="p-1.5 rounded-lg hover:bg-white/5 text-slate-500
                       hover:text-slate-300 transition-colors disabled:opacity-30"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="text-[11px] text-slate-400 font-mono tabular-nums">
            {pageNum} / {numPages || '—'}
          </span>
          <button
            onClick={() => setPageNum(p => Math.min(numPages || p, p + 1))}
            disabled={pageNum >= (numPages || 1)}
            className="p-1.5 rounded-lg hover:bg-white/5 text-slate-500
                       hover:text-slate-300 transition-colors disabled:opacity-30"
          >
            <ChevronRight size={14} />
          </button>

          <div className="w-px h-4 bg-white/[0.08] mx-1" />

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/5 text-slate-500
                       hover:text-slate-300 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Viewer — one page at a time, scrolls to top on page change */}
      <div className="flex-1 overflow-y-auto bg-[#0B1222] flex flex-col
                      items-center py-6 gap-3">

        {/* Per-page render spinner */}
        {pageLoading && (
          <div className="flex items-center gap-2 text-slate-500 text-xs">
            <div className="w-4 h-4 border-2 border-slate-600 border-t-blue-400
                            rounded-full animate-spin flex-shrink-0" />
            Rendering page {pageNum}…
          </div>
        )}

        <Document
          file={fileSource}
          onLoadSuccess={({ numPages: n }) => {
            setNumPages(n)
            setPageNum(p => Math.min(p, n))
          }}
          loading={<p className="text-slate-500 text-sm mt-12">Loading…</p>}
          error={
            <div className="flex flex-col items-center gap-2 mt-12 text-center px-8">
              <p className="text-red-400 text-sm font-medium">Failed to render document.</p>
              <p className="text-slate-500 text-xs max-w-xs leading-relaxed">
                {isPdf
                  ? 'The PDF may be corrupted. Try re-uploading.'
                  : 'The converted PDF could not be rendered. Re-upload the file.'}
              </p>
            </div>
          }
        >
          {/* ── SINGLE PAGE — replaces Array.from(...).map(p => <Page />) ── */}
          <div className="shadow-xl shadow-black/40">
            <Page
              key={`preview-page-${pageNum}`}
              pageNumber={pageNum}
              scale={zoom}
              renderTextLayer={false}
              renderAnnotationLayer={false}
              onRenderSuccess={() => setPageLoading(false)}
              onRenderError={()  => setPageLoading(false)}
              loading={() => { setPageLoading(true); return null }}
            />
          </div>
        </Document>

        {/* Bottom page nav */}
        {numPages && numPages > 1 && (
          <div className="flex items-center gap-3 py-2">
            <button
              onClick={() => setPageNum(p => Math.max(1, p - 1))}
              disabled={pageNum <= 1}
              className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06]
                         text-slate-400 hover:text-white hover:border-white/20
                         disabled:opacity-30 transition-all text-xs"
            >
              ← Prev
            </button>
            <span className="text-xs text-slate-500 tabular-nums">
              {pageNum} / {numPages}
            </span>
            <button
              onClick={() => setPageNum(p => Math.min(numPages, p + 1))}
              disabled={pageNum >= numPages}
              className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06]
                         text-slate-400 hover:text-white hover:border-white/20
                         disabled:opacity-30 transition-all text-xs"
            >
              Next →
            </button>
          </div>
        )}

      </div>
    </>
  )
}
