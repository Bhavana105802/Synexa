import { useRef, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Send, Sparkles, FileText,
  PanelRight, PanelRightClose, Upload, UserCircle2,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useChat } from '../context/ChatContext'
import { useAuth } from '../context/AuthContext'
import { askQuestion } from '../services/api'
import MessageBubble, { TypingIndicator } from './MessageBubble'
import AnswerModeSelector from './AnswerModeSelector'
import clsx from 'clsx'

export default function ChatBox() {
  const navigate = useNavigate()
  const {
    messages, addMessage, isLoading, setIsLoading,
    activeDocument, activeChat,
    viewerOpen, setViewerOpen,
  } = useChat()

  const { isGuest, isLoggedIn, displayName } = useAuth()

  const [input, setInput] = useState('')
  const [mode, setMode] = useState('simple')

  const bottomRef = useRef(null)
  const textareaRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px'
  }, [input])

  const sendMessage = async (question) => {
    const q = (question || input).trim()
    if (!q || isLoading) return

    if (!activeChat?.id) {
      addMessage({
        role: 'ai',
        content: '⚠️ Please upload a document first before asking questions.',
        sources: [],
        confidence: 0,
      })
      return
    }

    setInput('')
    addMessage({ role: 'user', content: q })
    setIsLoading(true)

    try {
      const data = await askQuestion(q, mode, activeChat.id)
      addMessage({
        role: 'ai',
        content: data.answer,
        sources: data.sources || [],
        confidence: data.confidence,
        mode: data.mode,
      })
    } catch (err) {
      const detail = err.response?.data?.detail
      const msg = err.response?.status === 401
        ? '🔒 Session expired. Please sign in again.'
        : `**Error:** ${detail || err.message || 'Backend error'}`
      addMessage({ role: 'ai', content: msg, sources: [], confidence: 0 })
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="flex flex-col h-full w-full bg-[#0F172A] overflow-hidden relative">

      {/* Top Bar */}
      <div className="flex items-center gap-3 px-5 py-2.5 border-b border-white/[0.06] bg-[#0F172A] flex-shrink-0">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]" />
          <div className="min-w-0">
            <h2 className="font-semibold text-[13px] text-white truncate">
              {activeDocument ? activeDocument.name : 'Synexa Chat'}
            </h2>
            {activeDocument && (
              <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                {activeDocument.chunks} chunks indexed
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isLoggedIn && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06]">
              <div className="w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center text-white text-[9px] font-bold">
                {displayName[0].toUpperCase()}
              </div>
              <span className="text-[11px] text-slate-400">{displayName}</span>
            </div>
          )}

          {!activeDocument && (
            <button
              onClick={() => navigate('/upload')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-400"
            >
              <Upload size={12} /> Upload PDF
            </button>
          )}

          {isGuest && (
            <button onClick={() => navigate('/signup')}>
              <UserCircle2 size={12} />
            </button>
          )}

          <button onClick={() => setViewerOpen(p => !p)}>
            {viewerOpen ? <PanelRightClose size={14} /> : <PanelRight size={14} />}
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto min-h-0 flex flex-col">
        <div className="py-6 pb-32 space-y-6 max-w-3xl mx-auto w-full px-4 flex flex-col">
          <AnimatePresence>
            {messages.length === 0
              ? <EmptyState activeDocument={activeDocument} onSuggestion={sendMessage} />
              : messages.map(msg => <MessageBubble key={msg.id} message={msg} />)
            }
          </AnimatePresence>

          {isLoading && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Floating Input */}
      <div className="absolute bottom-0 left-0 w-full px-6 pb-5 pt-3 
                      bg-gradient-to-t from-[#0F172A] via-[#0F172A]/90 to-transparent">

        <div className="max-w-3xl mx-auto w-full">

          <div className="mb-2 flex justify-start">
  <div className="max-w-fit">
    <AnswerModeSelector value={mode} onChange={setMode} />
  </div>
</div>

          <div className={clsx(
  'flex items-center gap-3 bg-[#1E293B] border border-white/[0.08]',
  'rounded-2xl px-4 py-2.5 shadow-lg',
            input ? 'border-blue-500/50' : ''
          )}>

            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={isLoading}
              placeholder={
                activeDocument
                  ? `Ask anything about ${activeDocument.name}…`
                  : 'Start typing...'
              }
              className="flex-1 bg-transparent text-sm text-slate-100 placeholder-slate-500
                         resize-none outline-none min-h-[20px] max-h-[120px]"
            />

            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => sendMessage()}
              disabled={!input.trim() || isLoading}
              className={clsx(
                'w-9 h-9 rounded-xl flex items-center justify-center',
                input.trim()
                  ? 'bg-blue-600 hover:bg-blue-500'
                  : 'bg-white/[0.05]'
              )}
            >
              <Send size={14} />
            </motion.button>

          </div>
        </div>
      </div>
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────
function EmptyState({ activeDocument, onSuggestion }) {
  const suggestions = [
    'What is this document about?',
    'Summarize the key points',
    'What are the main conclusions?',
    'List the most important topics',
  ]
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center min-h-[60vh] px-8 text-center gap-7"
    >
      <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20
                      flex items-center justify-center">
        <Sparkles size={28} className="text-blue-400" />
      </div>
      <div className="max-w-xs">
        <h3 className="font-semibold text-xl text-slate-200 mb-2">
          {activeDocument ? `Chat with ${activeDocument.name}` : 'Start a conversation'}
        </h3>
        <p className="text-sm text-slate-500 leading-relaxed">
          {activeDocument
            ? 'Ask questions about your document.'
            : 'Upload a PDF to start chatting.'}
        </p>
      </div>
      {activeDocument && (
        <div className="grid grid-cols-2 gap-2.5 w-full max-w-md">
          {suggestions.map((s, i) => (
            <motion.button
              key={i}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onSuggestion(s)}
              className="flex items-start gap-2.5 p-3.5 rounded-xl text-left
                         bg-[#1E293B] border border-white/[0.06]
                         hover:border-blue-500/30 transition-all"
            >
              <FileText size={12} className="text-blue-400 mt-0.5 flex-shrink-0" />
              <span className="text-xs text-slate-400 leading-relaxed">{s}</span>
            </motion.button>
          ))}
        </div>
      )}
    </motion.div>
  )
}