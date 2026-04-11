import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, FileText, CheckCircle, XCircle, Loader, X } from 'lucide-react'
import { uploadDocument } from '../services/api'
import { useChat } from '../context/ChatContext'
import { useNavigate } from 'react-router-dom'
import clsx from 'clsx'

function phaseLabel(progress) {
  if (progress < 100) return 'Uploading file…'
  return 'Indexing document — please wait…'
}

function classifyError(err) {
  if (err.response) {
    // Backend replied — use its detail message
    const status = err.response.status
    const detail = err.response.data?.detail

    if (status === 401) return 'Please sign in before uploading.'
    if (status === 413) return 'File is too large. Please compress it and try again.'
    if (status === 422) return detail || 'File could not be processed. Check the format.'
    return detail || `Server error (${status}). Please try again.`
  }

  if (err.request) {
    if (err.code === 'ECONNABORTED') {
      return (
        'The upload is taking longer than expected. ' +
        'Your document may still be processing — check back in a moment before retrying.'
      )
    }
    return (
      'No response from server. ' +
      'The document may still be processing. ' +
      'Please wait a moment, then refresh the page.'
    )
  }

  // Request could not be sent (config/CORS/network-down before send)
  return `Unexpected error: ${err.message || 'unknown'}`
}

export default function UploadArea() {
  const { addDocument } = useChat()
  const navigate = useNavigate()

  const [status,       setStatus]       = useState('idle')
  const [progress,     setProgress]     = useState(0)
  const [errorMsg,     setErrorMsg]     = useState('')
  const [selectedFile, setSelectedFile] = useState(null)

  const onDrop = useCallback(async (acceptedFiles, rejectedFiles) => {
    if (rejectedFiles.length > 0) {
      setStatus('error')
      setErrorMsg('Unsupported file type.')
      return
    }
    const file = acceptedFiles[0]
    if (!file) return

    setSelectedFile(file)
    setStatus('uploading')
    setProgress(0)
    setErrorMsg('')

    try {
      const data = await uploadDocument(file, (pct) => setProgress(pct))

      if (!data?.document_id) {
        throw new Error('Unexpected response from server — missing document_id.')
      }

      // addDocument shim → createChat(chatId, documentId, name, file, fileUrl, pdfUrl)
      addDocument({
        chatId:     data.chat_id,
        documentId: data.document_id,
        id:         data.chat_id,
        name:       data.filename,
        chunks:     data.chunks_created,
        uploadedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        file,
        fileUrl:    data.file_url ?? null,   
        pdfUrl:     data.pdf_url  ?? null,   
      })

      setStatus('success')
      setTimeout(() => navigate('/chat'), 1500)

    } catch (err) {
      console.error('[UploadArea] upload error:', err)
      setStatus('error')
      setErrorMsg(classifyError(err))
    }
  }, [addDocument, navigate])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
    },
    maxFiles: 1,
    disabled: status === 'uploading',
  })

  const reset = () => {
    setStatus('idle')
    setProgress(0)
    setSelectedFile(null)
    setErrorMsg('')
  }

  return (
    <div className="w-full max-w-xl mx-auto">
      <AnimatePresence mode="wait">

        {/* ── Idle / error ─────────────────────────────── */}
        {(status === 'idle' || status === 'error') && (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div
              {...getRootProps()}
              className={clsx(
                'relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-200',
                isDragActive
                  ? 'border-accent bg-accent/5 shadow-glow-blue scale-[1.01]'
                  : 'border-white/10 hover:border-accent/30 hover:bg-white/2'
              )}
            >
              <input {...getInputProps()} />
              <motion.div
                animate={isDragActive ? { scale: 1.1 } : { scale: 1 }}
                className="flex flex-col items-center gap-4"
              >
                <div className={clsx(
                  'w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-200',
                  isDragActive
                    ? 'bg-accent/20 border border-accent/40'
                    : 'bg-navy-800 border border-white/10'
                )}>
                  <Upload size={28} className={isDragActive ? 'text-accent' : 'text-slate-500'} />
                </div>
                <div>
                  <p className="font-display font-semibold text-slate-200 text-base">
                    {isDragActive ? 'Drop your file here' : 'Drag & drop your file'}
                  </p>
                  <p className="text-sm text-slate-500 mt-1">
                    or <span className="text-accent hover:underline">browse files</span>
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-600 font-mono">
                  <span className="badge">PDF</span>
                  <span className="badge">DOCX</span>
                  <span className="badge">TXT</span>
                  <span className="badge">PNG</span>
                </div>
              </motion.div>
            </div>

            {status === 'error' && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-2 mt-3 px-4 py-3 rounded-xl
                           bg-red-500/10 border border-red-500/20"
              >
                <XCircle size={15} className="text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-400 leading-relaxed flex-1">{errorMsg}</p>
                <button onClick={reset} className="text-red-500 hover:text-red-300 flex-shrink-0">
                  <X size={14} />
                </button>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* ── Uploading ────────────────────────────────── */}
        {status === 'uploading' && (
          <motion.div
            key="uploading"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-navy-800 border border-white/5 rounded-2xl p-8"
          >
            {/* File info row */}
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20
                              flex items-center justify-center flex-shrink-0">
                <FileText size={20} className="text-accent" />
              </div>
              <div className="min-w-0">
                <p className="font-display font-semibold text-slate-200 text-sm truncate">
                  {selectedFile?.name}
                </p>
                <p className="text-xs text-slate-500 mt-0.5 font-mono">
                  {(selectedFile?.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <div className="ml-auto">
                <Loader size={16} className="text-accent animate-spin" />
              </div>
            </div>

            {/* Progress bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-mono text-slate-500">
                <span>{phaseLabel(progress)}</span>
                {progress < 100
                  ? <span className="text-accent">{progress}%</span>
                  : <span className="text-accent animate-pulse">working…</span>
                }
              </div>

              <div className="h-1.5 bg-navy-700 rounded-full overflow-hidden">
                {progress < 100 ? (
                  /* Deterministic bar — mirrors actual byte transfer */
                  <motion.div
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3 }}
                    className="h-full bg-gradient-to-r from-accent to-blue-400 rounded-full"
                  />
                ) : (
                  /* Indeterminate shimmer — signals backend indexing work */
                  <motion.div
                    animate={{ x: ['-100%', '100%'] }}
                    transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
                    className="h-full w-1/2 bg-gradient-to-r from-transparent
                               via-accent to-transparent rounded-full"
                  />
                )}
              </div>

              

              {/* Extra patience message for large files already in indexing phase */}
              {progress >= 100 && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 5 }}    // appears after 5 s in indexing phase
                  className="text-[10px] text-slate-500 pt-1"
                >
                </motion.p>
              )}
            </div>
          </motion.div>
        )}

        {/* ── Success ──────────────────────────────────── */}
        {status === 'success' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-8 text-center"
          >
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/30
                            flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={28} className="text-emerald-400" />
            </div>
            <p className="font-display font-semibold text-emerald-300 text-base">
              Document indexed!
            </p>
            <p className="text-sm text-slate-400 mt-1">{selectedFile?.name}</p>
            <p className="text-xs text-slate-600 font-mono mt-3">Redirecting to chat…</p>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  )
}
