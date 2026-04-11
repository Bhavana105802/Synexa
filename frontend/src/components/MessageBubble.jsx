import { useState } from 'react'
import { motion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import { Copy, Check, Bot, TrendingUp } from 'lucide-react'
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
  const isUser = message.role === 'user'

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2200)
  }

  const handleSourceClick = (page) => {
    setViewerOpen(true)
    setTimeout(() => jumpToPage(page), 80)
  }

  const confidencePct = message.confidence != null
    ? Math.round(message.confidence * 100)
    : null

  const barColor =
    confidencePct >= 75 ? 'bg-emerald-500' :
    confidencePct >= 50 ? 'bg-yellow-500'  : 'bg-red-500'

  const textColor =
    confidencePct >= 75 ? 'text-emerald-400' :
    confidencePct >= 50 ? 'text-yellow-400'  : 'text-red-400'

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
                        flex items-center justify-center flex-shrink-0 mt-0.5">
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
    ? 'bg-blue-600 text-white rounded-2xl rounded-tr-sm'
    : 'bg-[#1E293B] border border-white/[0.06] text-slate-200 rounded-2xl rounded-tl-sm w-full'
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

  {/* ✅ CONFIDENCE INSIDE BUBBLE */}
  {!isUser && confidencePct !== null && (
    <div className={clsx(
      'absolute bottom-2 right-3 text-xs font-semibold',
      confidencePct >= 75 ? 'text-emerald-400' :
      confidencePct >= 50 ? 'text-yellow-400' :
      'text-red-400'
    )}>
      {confidencePct}%
    </div>
  )}

</div>

        {/* AI extras: sources + confidence + copy */}
        {!isUser && (
          <div className="w-full space-y-2.5 pl-0.5">

            {/* Source chips — show only page number */}
            {message.sources?.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider mr-0.5">
                  Sources
                </span>
                {/* Deduplicate by page number */}
                {[...new Map(message.sources.map(s => [s.page, s])).values()].map((src, i) => (
                  <button
                    key={i}
                    onClick={() => handleSourceClick(src.page)}
                    title={`Jump to page ${src.page}`}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg
                               bg-[#0F172A] border border-white/[0.08]
                               hover:border-blue-500/60 hover:bg-blue-500/10
                               text-[11px] font-mono font-medium
                               text-slate-400 hover:text-blue-400
                               transition-all duration-150 cursor-pointer"
                  >
                    <svg width="9" height="11" viewBox="0 0 9 11" fill="none" className="opacity-50">
                      <path d="M1 1h5l2 2v7H1V1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
                      <path d="M6 1v2h2" stroke="currentColor" strokeWidth="1.2"/>
                    </svg>
                    Page {src.page}
                  </button>
                ))}
              </div>
            )}

            

            {/* Copy button */}
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-[11px] transition-colors
                         text-slate-600 hover:text-slate-300"
            >
              {copied
                ? <><Check size={11} className="text-emerald-400" /><span className="text-emerald-400">Copied!</span></>
                : <><Copy size={11} /><span>Copy response</span></>
              }
            </button>
          </div>
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
