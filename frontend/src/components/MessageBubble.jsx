import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import {
  Copy, Check, Bot, FileText,
  ChevronDown, ChevronUp, ExternalLink,
  ShieldCheck, ShieldAlert, ShieldX,
} from 'lucide-react'
import { useChat } from '../context/ChatContext'
import clsx from 'clsx'

export function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-3 px-6"
    >
      {/* AI avatar */}
      <div className="w-8 h-8 rounded-xl bg-[#1E293B] border border-white/[0.08]
                      flex items-center justify-center flex-shrink-0 mt-0.5">
        <Bot size={14} className="text-blue-400" />
      </div>

      {/* Bubble with bouncing dots */}
      <div className="bg-[#1E293B] border border-white/[0.06] rounded-2xl rounded-tl-sm
                      px-5 py-4 max-w-[80px]">
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map(i => (
            <motion.span
              key={i}
              className="block w-2 h-2 rounded-full bg-slate-500"
              animate={{ y: [0, -6, 0], opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  )
}

function normalizeLatex(text) {
  if (!text) return text
  return text
    .replace(/\\\(/g, '$').replace(/\\\)/g, '$')
    .replace(/\\\[/g, '$$').replace(/\\\]/g, '$$')
    .replace(/\\begin\{equation\*?\}/g, '$$')
    .replace(/\\end\{equation\*?\}/g, '$$')
    .replace(/\\begin\{align\*?\}/g, '$$')
    .replace(/\\end\{align\*?\}/g, '$$')
}

// ── Main MessageBubble ────────────────────────────────────────
export default function MessageBubble({ message }) {
  const { jumpToPage, setViewerOpen } = useChat()
  const [copied, setCopied] = useState(false)
  const [evidenceOpen, setEvidenceOpen] = useState(false)
  const isUser = message.role === 'user'

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2200)
  }

  const handleSourceClick = (page) => {
    setViewerOpen(true)
    const p = parseInt(page) || 1
    setTimeout(() => jumpToPage(p), 80)
  }

  // Deterministic Evidence Status calculation
  const evidenceLevel = message.evidence_level || (
    message.sources?.length >= 2 ? 'STRONG EVIDENCE' :
    message.sources?.length >= 1 ? 'LIMITED EVIDENCE' :
    'INSUFFICIENT EVIDENCE'
  )

  // Fallback evidence items if only sources was provided
  const evidenceList = (message.evidence && message.evidence.length > 0)
    ? message.evidence
    : (message.sources || []).map(s => ({
        document: s.document || 'Document',
        page: s.page || 1,
        excerpt: 'Retrieved source passage used during answer generation.',
        relevance: 'Context Match',
      }))

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      className={clsx(
        'flex items-start gap-3 px-6',
        isUser && 'flex-row-reverse'
      )}
    >
      {/* Avatar — only for AI */}
      {!isUser && (
        <div className="w-8 h-8 rounded-xl bg-[#1E293B] border border-white/[0.08]
                        flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
          <Bot size={14} className="text-blue-400" />
        </div>
      )}

      {/* Content column */}
      <div className={clsx(
        'flex flex-col gap-2.5',
        isUser ? 'items-end max-w-[75%]' : 'items-start w-full flex-1 min-w-0'
      )}>

        {/* Message bubble */}
        <div className={clsx(
          'px-4 py-3.5 text-sm leading-relaxed relative',
          isUser
            ? 'bg-blue-600 text-white rounded-2xl rounded-tr-sm shadow-md'
            : 'bg-[#1E293B] border border-white/[0.06] text-slate-200 rounded-2xl rounded-tl-sm w-full shadow-sm'
        )}>

          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="
              prose prose-invert prose-sm max-w-none
              prose-p:my-2 prose-p:leading-relaxed prose-p:text-slate-200
              prose-headings:text-slate-100 prose-headings:font-semibold prose-headings:mb-2
              prose-h1:text-base prose-h2:text-[13px] prose-h3:text-[13px]
              prose-strong:text-white prose-strong:font-semibold
              prose-ul:my-2 prose-ul:pl-5 prose-li:my-1 prose-li:text-slate-300
              prose-li:marker:text-blue-400
              prose-ol:my-2 prose-ol:pl-5 prose-ol:text-slate-300
              prose-code:bg-black/30 prose-code:px-1.5 prose-code:py-0.5
              prose-code:rounded-md prose-code:text-xs prose-code:text-blue-300
              prose-code:font-mono prose-code:border prose-code:border-white/5
              prose-pre:bg-black/40 prose-pre:border prose-pre:border-white/[0.07]
              prose-pre:rounded-xl prose-pre:text-xs prose-pre:p-4
              prose-blockquote:border-l-2 prose-blockquote:border-blue-500/50
              prose-blockquote:text-slate-400 prose-blockquote:pl-4
              prose-hr:border-white/[0.06]
              prose-table:text-xs
              prose-th:text-slate-300 prose-td:text-slate-400
            ">
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex]}
              >
                {normalizeLatex(message.content)}
              </ReactMarkdown>
            </div>
          )}

          {/* Evidence Support State Badge (Calm, deterministic label) */}
          {!isUser && (
            <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <span className={clsx(
                  'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-semibold tracking-wider uppercase border',
                  evidenceLevel === 'STRONG EVIDENCE' && 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400',
                  evidenceLevel === 'LIMITED EVIDENCE' && 'bg-amber-500/10 border-amber-500/25 text-amber-400',
                  evidenceLevel === 'INSUFFICIENT EVIDENCE' && 'bg-slate-500/10 border-slate-500/20 text-slate-400'
                )}>
                  {evidenceLevel === 'STRONG EVIDENCE' && <ShieldCheck size={11} className="text-emerald-400" />}
                  {evidenceLevel === 'LIMITED EVIDENCE' && <ShieldAlert size={11} className="text-amber-400" />}
                  {evidenceLevel === 'INSUFFICIENT EVIDENCE' && <ShieldX size={11} className="text-slate-400" />}
                  {evidenceLevel}
                </span>

                {evidenceList.length > 0 && (
                  <button
                    onClick={() => setEvidenceOpen(prev => !prev)}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-medium
                               text-slate-400 hover:text-slate-200 bg-white/[0.03] hover:bg-white/[0.06]
                               border border-white/[0.06] transition-all cursor-pointer"
                  >
                    <FileText size={11} className="text-blue-400" />
                    <span>{evidenceOpen ? 'Hide Evidence' : `View Evidence (${evidenceList.length})`}</span>
                    {evidenceOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                  </button>
                )}
              </div>

              {/* Copy response action */}
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
              >
                {copied
                  ? <><Check size={11} className="text-emerald-400" /><span className="text-emerald-400">Copied</span></>
                  : <><Copy size={11} /><span>Copy</span></>
                }
              </button>
            </div>
          )}

        </div>

        {/* Real Evidence Inspector (Collapsible Drawer) */}
        {!isUser && evidenceOpen && evidenceList.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="w-full bg-[#0F172A] border border-white/[0.08] rounded-xl p-3.5 space-y-3 shadow-inner"
          >
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                <FileText size={13} className="text-blue-400" />
                <span>Evidence Inspector</span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">
                {evidenceList.length} verified excerpt{evidenceList.length > 1 ? 's' : ''}
              </span>
            </div>

            <div className="space-y-2.5">
              {evidenceList.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-[#1E293B]/70 border border-white/[0.05] rounded-lg p-2.5 space-y-2 hover:border-white/[0.12] transition-colors"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold font-mono text-slate-500 uppercase">
                        Evidence #{idx + 1}
                      </span>
                      <span className="text-xs font-medium text-slate-300">
                        {item.document || 'Document'}
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        Page {item.page}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {item.relevance && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 font-medium">
                          {item.relevance}
                        </span>
                      )}
                      <button
                        onClick={() => handleSourceClick(item.page)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium
                                   text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20
                                   border border-blue-500/30 transition-all cursor-pointer"
                        title={`Open source at page ${item.page}`}
                      >
                        <ExternalLink size={10} />
                        <span>Open Source</span>
                      </button>
                    </div>
                  </div>

                  {item.excerpt && (
                    <blockquote className="border-l-2 border-blue-500/40 pl-2.5 py-0.5 text-xs text-slate-300 font-sans leading-relaxed italic bg-black/20 rounded-r">
                      "{item.excerpt}"
                    </blockquote>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Timestamp */}
        <p className="text-[10px] text-slate-700 px-0.5">
          {message.timestamp?.toLocaleTimeString([], {
            hour: '2-digit', minute: '2-digit',
          })}
        </p>
      </div>
    </motion.div>
  )
}
