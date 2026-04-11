import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquare, Trash2, Clock, ChevronRight } from 'lucide-react'
import { useChat } from '../context/ChatContext'
import clsx from 'clsx'

export default function ChatHistory({ compact = false }) {
  const { sessions, activeSessionId, switchSession, deleteSession } = useChat()
  const [hovered, setHovered] = useState(null)

  // Only sessions with messages
  const history = sessions.filter(s => s.messages.length > 0)

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
        <MessageSquare size={18} className="text-slate-700" />
        <p className="text-xs text-slate-600">No chat history yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-0.5">
      <AnimatePresence initial={false}>
        {history.map((session, i) => {
          const isActive   = session.id === activeSessionId
          const msgCount   = session.messages.length
          const lastMsg    = session.messages[session.messages.length - 1]
          const timeStr    = lastMsg?.timestamp
            ? new Date(lastMsg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : ''

          return (
            <motion.div
              key={session.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8, height: 0 }}
              transition={{ duration: 0.15, delay: i * 0.03 }}
              onMouseEnter={() => setHovered(session.id)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => switchSession(session.id)}
              className={clsx(
                'group flex items-start gap-2.5 px-2.5 py-2.5 rounded-xl cursor-pointer transition-all duration-150',
                isActive
                  ? 'bg-blue-500/10 border border-blue-500/15'
                  : 'hover:bg-white/[0.04] border border-transparent'
              )}
            >
              {/* Icon */}
              <div className={clsx(
                'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5',
                isActive ? 'bg-blue-500/20' : 'bg-white/5'
              )}>
                <MessageSquare size={12} className={isActive ? 'text-blue-400' : 'text-slate-500'} />
              </div>

              {/* Text */}
              {!compact && (
                <div className="flex-1 min-w-0">
                  <p className={clsx(
                    'text-xs font-medium truncate leading-relaxed',
                    isActive ? 'text-blue-300' : 'text-slate-400'
                  )}>
                    {session.title}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Clock size={9} className="text-slate-700" />
                    <span className="text-[10px] text-slate-600 font-mono">{timeStr}</span>
                    <span className="text-[10px] text-slate-700">·</span>
                    <span className="text-[10px] text-slate-600">{msgCount} msg{msgCount !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className={clsx(
                'flex items-center gap-1 flex-shrink-0 transition-opacity duration-150',
                hovered === session.id ? 'opacity-100' : 'opacity-0'
              )}>
                <button
                  onClick={e => { e.stopPropagation(); deleteSession(session.id) }}
                  className="p-1 rounded-md hover:bg-red-500/10 text-slate-600 hover:text-red-400 transition-colors"
                >
                  <Trash2 size={11} />
                </button>
              </div>

              {!compact && isActive && (
                <ChevronRight size={12} className="text-blue-400 flex-shrink-0 mt-1" />
              )}
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
