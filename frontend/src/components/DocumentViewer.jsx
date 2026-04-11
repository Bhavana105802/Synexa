import { useRef, useEffect, useCallback, useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import {
  FileText, ZoomIn, ZoomOut, ChevronLeft,
  ChevronRight, RotateCcw, PanelRightClose,
} from 'lucide-react'
import { useChat } from '../context/ChatContext'
import { getToken } from '../services/api'
import clsx from 'clsx'
import 'react-pdf/dist/Page/AnnotationLayer.css'

pdfjs.GlobalWorkerOptions.workerSrc =
  `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

function getFileType(name) {
  return name?.split('.').pop()?.toLowerCase() ?? ''
}

export default function DocumentViewer() {
  const {
    activeDocument,
    currentPage, setCurrentPage,
    numPages,    setNumPages,
    zoomLevel,   setZoomLevel,
    highlightedPage,
    setViewerOpen,
  } = useChat()

  const scrollRef   = useRef(null)
  const [pageLoading,    setPageLoading]    = useState(false)

  // ── Endpoint-fetch state (old records without pdfUrl) ─────
  // Only used when activeDocument.pdfUrl is null and file type
  // is TXT or DOCX.  For native PDFs this is never triggered.
  const [fetchedUrl,  setFetchedUrl]  = useState(null)
  const [fetching,    setFetching]    = useState(false)
  const [fetchError,  setFetchError]  = useState('')

  const fileType = getFileType(activeDocument?.name)
  const isPdf    = fileType === 'pdf'
  const needsConv = !isPdf   // TXT, DOCX, etc. need a converted PDF

  // Reset fetch state when the active document changes
  useEffect(() => {
    setFetchedUrl(null)
    setFetching(false)
    setFetchError('')
    setPageLoading(false)
  }, [activeDocument?.documentId])

  // Scroll content area to top on page change
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [currentPage])

  const onDocumentLoadSuccess = useCallback(
    ({ numPages: n }) => {
      setNumPages(n)
      // Clamp current page if it exceeds the new document's range
      setCurrentPage(p => Math.min(p, n))
    },
    [setNumPages, setCurrentPage],
  )

  const goTo = useCallback(
    (p) => setCurrentPage(Math.max(1, Math.min(numPages || 1, p))),
    [numPages, setCurrentPage],
  )

  // ── Resolve the best PDF source ───────────────────────────
  // For native PDFs:  pdfUrl (if backend produced one) → file → fileUrl
  // For TXT / DOCX:   pdfUrl only — never pass raw .txt/.docx to react-pdf
  let pdfSource = null

  if (isPdf) {
    pdfSource = activeDocument?.pdfUrl
      ?? activeDocument?.file
      ?? activeDocument?.fileUrl
      ?? null
  } else {
    // Prefer the stored URL; fall back to the blob fetched from the endpoint
    pdfSource = activeDocument?.pdfUrl ?? fetchedUrl ?? null
  }

  // ── Trigger endpoint fetch for old records missing pdfUrl ─
  // Runs once per document (guarded by fetching + fetchedUrl + fetchError).
  // Uses a side-effect-inside-render pattern that is safe here because
  // it is guarded by a boolean flag and executes at most once per doc.
  const shouldFetch =
    needsConv &&
    !activeDocument?.pdfUrl &&
    !fetchedUrl &&
    !fetching &&
    !fetchError &&
    activeDocument?.documentId

  if (shouldFetch) {
    setFetching(true)
    ;(async () => {
      try {
        const token = getToken()
        const res   = await fetch(
          `/document/${encodeURIComponent(activeDocument.documentId)}/pdf`,
          { headers: token ? { Authorization: `Bearer ${token}` } : {} },
        )
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.detail || `HTTP ${res.status}`)
        }
        const blob = await res.blob()
        setFetchedUrl(URL.createObjectURL(blob))
      } catch (err) {
        console.error('[DocumentViewer] endpoint fetch failed:', err)
        setFetchError(err.message || 'Could not load converted PDF.')
      } finally {
        setFetching(false)
      }
    })()
  }

  // ── Empty state ───────────────────────────────────────────
  if (!activeDocument) {
    return (
      <div className="flex flex-col h-full w-full bg-[#080F1E]">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06] bg-[#0B1222]">
          <FileText size={13} className="text-slate-600" />
          <span className="text-xs text-slate-600 flex-1">Document Preview</span>
          <button
            onClick={() => setViewerOpen(false)}
            className="text-slate-600 hover:text-slate-400"
          >
            <PanelRightClose size={13} />
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
          Upload a document to preview
        </div>
      </div>
    )
  }

  // ── Toolbar ───────────────────────────────────────────────
  // Page nav shown once numPages is known (all file types once loaded)
  const toolbar = (
    <div className="flex items-center gap-2 px-3 py-2 border-b border-white/[0.06] bg-[#0B1222] flex-shrink-0">

      <FileText size={12} className="text-blue-400 flex-shrink-0" />
      <span className="text-xs text-slate-400 flex-1 truncate min-w-0">
        {activeDocument.name}
      </span>

      {/* Page nav — visible for all file types once numPages is known */}
      {numPages && (
        <>
          <button
            onClick={() => goTo(currentPage - 1)}
            disabled={currentPage <= 1}
            className="text-slate-400 hover:text-white disabled:opacity-30 transition-opacity"
            title="Previous page"
          >
            <ChevronLeft size={13} />
          </button>

          <span className="text-xs text-slate-400 tabular-nums whitespace-nowrap">
            {currentPage} / {numPages}
          </span>

          <button
            onClick={() => goTo(currentPage + 1)}
            disabled={currentPage >= numPages}
            className="text-slate-400 hover:text-white disabled:opacity-30 transition-opacity"
            title="Next page"
          >
            <ChevronRight size={13} />
          </button>

          <div className="w-px h-4 bg-white/[0.08]" />
        </>
      )}

      {/* Zoom */}
      <button
        onClick={() => setZoomLevel(z => Math.max(0.5, +(z - 0.15).toFixed(2)))}
        className="text-slate-400 hover:text-white transition-colors"
        title="Zoom out"
      >
        <ZoomOut size={13} />
      </button>
      <span className="text-xs text-slate-500 w-9 text-center tabular-nums">
        {Math.round(zoomLevel * 100)}%
      </span>
      <button
        onClick={() => setZoomLevel(z => Math.min(3.0, +(z + 0.15).toFixed(2)))}
        className="text-slate-400 hover:text-white transition-colors"
        title="Zoom in"
      >
        <ZoomIn size={13} />
      </button>
      <button
        onClick={() => setZoomLevel(1)}
        className="text-slate-500 hover:text-white transition-colors"
        title="Reset zoom"
      >
        <RotateCcw size={12} />
      </button>

      <div className="w-px h-4 bg-white/[0.08]" />
      <button
        onClick={() => setViewerOpen(false)}
        className="text-slate-500 hover:text-white transition-colors"
        title="Close viewer"
      >
        <PanelRightClose size={13} />
      </button>
    </div>
  )

  // ── Fetching spinner (TXT/DOCX endpoint fetch in progress) ─
  if (fetching) {
    return (
      <div className="flex flex-col h-full w-full bg-[#080F1E]">
        {toolbar}
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-500">
          <div className="w-5 h-5 border-2 border-slate-600 border-t-blue-400
                          rounded-full animate-spin" />
          <p className="text-xs">Loading {fileType.toUpperCase()} preview…</p>
        </div>
      </div>
    )
  }

  // ── No source available ───────────────────────────────────
  if (!pdfSource) {
    return (
      <div className="flex flex-col h-full w-full bg-[#080F1E]">
        {toolbar}
        <div className="flex-1 flex flex-col items-center justify-center gap-2
                        text-center px-8">
          <p className="text-red-400 text-sm font-medium">Preview unavailable</p>
          <p className="text-slate-500 text-xs leading-relaxed max-w-xs">
            {fetchError
              ? fetchError
              : needsConv
                ? `${fileType.toUpperCase()} documents must be converted to PDF at upload time. ` +
                  'Ensure reportlab (TXT) or LibreOffice (DOCX) is installed on the server, ' +
                  'then re-upload the file.'
                : 'Re-upload the document to restore the preview.'}
          </p>
          <p className="text-slate-600 text-xs mt-1">
            RAG chat still works normally.
          </p>
        </div>
      </div>
    )
  }

  // ── Unified react-pdf viewer ──────────────────────────────
  return (
    <div className="flex flex-col h-full w-full bg-[#080F1E]">
      {toolbar}

      <div ref={scrollRef} className="flex-1 overflow-auto bg-[#080F1E]">
        <div className="flex flex-col items-center py-4 px-4 gap-3">

          {/* Per-page spinner — shown while react-pdf paints the canvas */}
          {pageLoading && (
            <div className="flex items-center gap-2 text-slate-500 text-xs py-1">
              <div className="w-4 h-4 border-2 border-slate-600 border-t-blue-400
                              rounded-full animate-spin flex-shrink-0" />
              Rendering page {currentPage}…
            </div>
          )}

          <Document
            file={pdfSource}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={
              <div className="flex flex-col items-center justify-center h-48 gap-3
                              text-slate-500 text-xs">
                <div className="w-5 h-5 border-2 border-slate-600 border-t-blue-400
                                rounded-full animate-spin" />
                Loading document…
              </div>
            }
            error={
              <div className="flex flex-col items-center justify-center h-48 gap-2
                              text-center px-6">
                <p className="text-red-400 text-sm font-medium">
                  Failed to render document.
                </p>
                <p className="text-slate-600 text-xs">
                  {needsConv
                    ? 'The converted PDF could not be rendered. Re-upload the file.'
                    : 'The PDF may be corrupted. Try re-uploading.'}
                </p>
              </div>
            }
          >
            {/* Single page — O(1) DOM nodes regardless of document length */}
            <div
              className={clsx(
                'rounded-xl overflow-hidden',
                highlightedPage === currentPage
                  ? 'ring-2 ring-blue-500'
                  : 'ring-1 ring-white/[0.06]',
              )}
            >
              <Page
                key={`page-${currentPage}`}
                pageNumber={currentPage}
                scale={zoomLevel}
                renderAnnotationLayer={false}
                renderTextLayer={false}
                onRenderSuccess={() => setPageLoading(false)}
                onRenderError={()  => setPageLoading(false)}
                loading={() => { setPageLoading(true); return null }}
              />
            </div>
          </Document>

          {/* Bottom page nav for easy access after reading */}
          {numPages && (
            <div className="flex items-center gap-3 py-2">
              <button
                onClick={() => goTo(currentPage - 1)}
                disabled={currentPage <= 1}
                className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06]
                           text-slate-400 hover:text-white hover:border-white/20
                           disabled:opacity-30 transition-all text-xs"
              >
                ← Prev
              </button>
              <span className="text-xs text-slate-500 tabular-nums">
                {currentPage} / {numPages}
              </span>
              <button
                onClick={() => goTo(currentPage + 1)}
                disabled={currentPage >= numPages}
                className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06]
                           text-slate-400 hover:text-white hover:border-white/20
                           disabled:opacity-30 transition-all text-xs"
              >
                Next →
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
