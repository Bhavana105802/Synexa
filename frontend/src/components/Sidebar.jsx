import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Zap, Plus, FileText, MessageSquare,
  ChevronLeft, ChevronRight, Trash2,
  Search, Clock, LayoutDashboard, MoreHorizontal,
  Pencil, Check, X, LogOut, UserCircle2, FolderOpen,
} from 'lucide-react'
import { useChat } from '../context/ChatContext'
import { useAuth } from '../context/AuthContext'
import { uploadDocument } from '../services/api'
import clsx from 'clsx'

// ── 3-dot chat menu ───────────────────────────────────────────
function ChatMenu({ chatId, onClose }) {
  const { deleteSession, renameSession } = useChat()
  const [renaming, setRenaming] = useState(false)
  const [nameVal, setNameVal]   = useState('')
  const menuRef  = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  useEffect(() => { if (renaming) inputRef.current?.focus() }, [renaming])

  const confirmRename = () => {
    const t = nameVal.trim()
    if (t) renameSession(chatId, t)
    setRenaming(false)
    onClose()
  }

  return (
    <motion.div
      ref={menuRef}
      initial={{ opacity: 0, scale: 0.92, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, y: -4 }}
      transition={{ duration: 0.12 }}
      className="absolute right-0 top-8 z-50 w-44 bg-[#1E293B] border border-white/[0.08]
                 rounded-xl shadow-xl overflow-hidden"
      onClick={e => e.stopPropagation()}
    >
      {renaming ? (
        <div className="p-2">
          <input
            ref={inputRef}
            value={nameVal}
            onChange={e => setNameVal(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter')  confirmRename()
              if (e.key === 'Escape') { setRenaming(false); onClose() }
            }}
            placeholder="New name…"
            className="w-full bg-[#0F172A] border border-white/[0.08] rounded-lg
                       px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-600
                       focus:outline-none focus:border-blue-500/50"
          />
          <div className="flex gap-1.5 mt-1.5">
            <button onClick={confirmRename}
              className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg
                         bg-blue-600 hover:bg-blue-500 text-white text-xs transition-colors">
              <Check size={11} /> Save
            </button>
            <button onClick={() => { setRenaming(false); onClose() }}
              className="px-2 py-1.5 rounded-lg hover:bg-white/5 text-slate-500
                         hover:text-slate-300 text-xs transition-colors">
              <X size={11} />
            </button>
          </div>
        </div>
      ) : (
        <>
          <button onClick={() => setRenaming(true)}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-slate-300
                       hover:bg-white/5 transition-colors">
            <Pencil size={12} className="text-slate-500" /> Rename
          </button>
          <div className="h-px bg-white/[0.06] mx-2" />
          <button onClick={() => { deleteSession(chatId); onClose() }}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-red-400
                       hover:bg-red-500/10 transition-colors">
            <Trash2 size={12} /> Delete
          </button>
        </>
      )}
    </motion.div>
  )
}

// ── Main Sidebar ──────────────────────────────────────────────
export default function Sidebar() {
  const navigate  = useNavigate()
  const {
    chats, activeChat, switchChat,
    documents,
    createChat,
    sidebarCollapsed, setSidebarCollapsed,
  } = useChat()
  const { isLoggedIn, displayName, user, logout } = useAuth()

  const [search,   setSearch]   = useState('')
  const [openMenu, setOpenMenu] = useState(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

  // ── "New Chat" → open file picker → upload → createChat ──
  const handleNewChat = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileChange = useCallback(async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''   // reset so same file can be re-picked

    setUploading(true)
    try {
      const data = await uploadDocument(file)
      // data = { document_id, chat_id, filename, chunks_created }
      // createChat(chatId, documentId, documentName, file)
      createChat(data.chat_id, data.document_id, data.filename, file)
      navigate('/chat')
    } catch (err) {
      const detail = err.response?.data?.detail
      if (err.response?.status === 401) {
        navigate('/signin')
      } else {
        alert(detail || 'Upload failed. Please try again.')
      }
    } finally {
      setUploading(false)
    }
  }, [createChat, navigate])

  const filteredChats = chats.filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase())
  )

  // ── Collapsed rail ────────────────────────────────────
  if (sidebarCollapsed) {
    return (
      <div className="flex flex-col h-full w-16 bg-[#0B1222] items-center py-3 gap-2">
        {/* Hidden file input */}
        <input ref={fileInputRef} type="file"
          accept=".pdf,.docx,.txt" className="hidden"
          onChange={handleFileChange} />

        <button onClick={() => setSidebarCollapsed(false)}
          className="p-2 rounded-xl hover:bg-white/5 text-slate-500 hover:text-slate-300 transition-colors"
          title="Expand sidebar">
          <ChevronRight size={16} />
        </button>

        <button onClick={handleNewChat} disabled={uploading}
          className="w-10 h-10 rounded-xl bg-blue-600 hover:bg-blue-500 flex items-center
                     justify-center text-white transition-colors shadow-lg shadow-blue-900/30
                     disabled:opacity-50"
          title={uploading ? 'Uploading…' : 'New Chat'}>
          <Plus size={16} />
        </button>

        <button onClick={() => navigate('/documents')}
          className="w-10 h-10 rounded-xl hover:bg-white/5 flex items-center justify-center
                     text-slate-500 hover:text-slate-300 transition-colors"
          title="Documents">
          <FolderOpen size={16} />
        </button>

        <div className="w-8 h-px bg-white/[0.06] my-1" />

        <div className="flex-1 overflow-y-auto w-full flex flex-col items-center gap-1.5 py-1">
          {chats.map(chat => (
            <button key={chat.id}
              onClick={() => { switchChat(chat.id); navigate('/chat') }}
              title={chat.title}
              className={clsx('w-10 h-10 rounded-xl flex items-center justify-center transition-all',
                activeChat?.id === chat.id
                  ? 'bg-blue-500/15 text-blue-400 border border-blue-500/25'
                  : 'hover:bg-white/5 text-slate-600 hover:text-slate-300')}>
              <MessageSquare size={15} />
            </button>
          ))}
        </div>

        <button
          onClick={() => isLoggedIn ? logout() : navigate('/signup')}
          title={isLoggedIn ? `Logout (${displayName})` : 'Sign Up'}
          className="w-10 h-10 rounded-xl hover:bg-white/5 flex items-center justify-center
                     text-slate-500 hover:text-slate-300 transition-colors mt-auto">
          {isLoggedIn
            ? <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center
                               text-white text-[11px] font-bold">
                {displayName[0].toUpperCase()}
              </div>
            : <UserCircle2 size={18} />}
        </button>
      </div>
    )
  }

  // ── Full sidebar ──────────────────────────────────────
  return (
    <div className="flex flex-col h-full w-[260px] bg-[#0B1222] overflow-hidden select-none">

      {/* Hidden file input for New Chat upload */}
      <input ref={fileInputRef} type="file"
        accept=".pdf,.docx,.txt" className="hidden"
        onChange={handleFileChange} />

      {/* Logo + collapse */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3
                      border-b border-white/[0.06] flex-shrink-0">
        <div className="flex items-center gap-1">
          <div className="flex items-center justify-center">
  <img src="/logo.png" alt="Synexa" className="w-8 h-8 object-contain" />
</div>
          <span className="text-gradient text-xl font-bold tracking-wide drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]">Synexa</span>
        </div>
        <button onClick={() => setSidebarCollapsed(true)}
          className="p-1.5 rounded-lg hover:bg-white/5 text-slate-500
                     hover:text-slate-300 transition-colors"
          title="Collapse sidebar">
          <ChevronLeft size={15} />
        </button>
      </div>

      {/* Action buttons */}
      <div className="px-3 py-3 space-y-1 border-b border-white/[0.06] flex-shrink-0">

        {/* New Chat → file picker */}
        <button onClick={handleNewChat} disabled={uploading}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm
                     font-medium bg-blue-600 hover:bg-blue-500 text-white
                     transition-all shadow-lg shadow-blue-900/30 disabled:opacity-60">
          <Plus size={15} />
          {uploading ? 'Uploading…' : 'New Chat'}
        </button>

        <button onClick={() => navigate('/documents')}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm
                     hover:bg-white/5 text-slate-400 hover:text-slate-200 transition-all">
          <FolderOpen size={15} /> Documents
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-5 min-h-0"
           style={{ scrollbarWidth: 'thin' }}>

        {/* Search */}
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-600" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search chats…"
            className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg
                       pl-7 pr-3 py-2 text-xs text-slate-300 placeholder-slate-600
                       focus:outline-none focus:border-blue-500/40 transition-colors" />
        </div>

        {/* ── SECTION 1: CHATS ───────────────────────────── */}
        <div>
          <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest mb-2 px-1
                        flex items-center gap-1.5">
            <MessageSquare size={9} /> Chats
          </p>

          {filteredChats.length === 0 ? (
            <div className="flex flex-col items-center py-7 gap-2">
              <MessageSquare size={22} className="text-slate-700" />
              <p className="text-[11px] text-slate-600 text-center leading-relaxed">
                No chats yet.<br />Click <strong className="text-slate-500">New Chat</strong> to start.
              </p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {filteredChats.map(chat => (
                <div key={chat.id}
                  onClick={() => { switchChat(chat.id); navigate('/chat') }}
                  className={clsx(
                    'group relative flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-150',
                    activeChat?.id === chat.id
                      ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      : 'hover:bg-white/[0.04] text-slate-400 hover:text-slate-200'
                  )}>
                  <MessageSquare size={12} className="flex-shrink-0 text-slate-600 mt-px" />
                  <div className="min-w-0 flex-1 pr-5">
                    <p className="text-xs font-medium truncate">{chat.title}</p>
                    <p className="text-[10px] text-slate-600 font-mono mt-0.5 truncate">
                      {chat.documentName}
                    </p>
                  </div>

                  <button
                    onClick={e => {
                      e.stopPropagation()
                      setOpenMenu(openMenu === chat.id ? null : chat.id)
                    }}
                    className={clsx(
                      'absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md',
                      'text-slate-600 hover:text-slate-300 hover:bg-white/5 transition-all',
                      'opacity-0 group-hover:opacity-100',
                      openMenu === chat.id && 'opacity-100 bg-white/5 text-slate-300'
                    )}>
                    <MoreHorizontal size={13} />
                  </button>

                  <AnimatePresence>
                    {openMenu === chat.id && (
                      <ChatMenu chatId={chat.id} onClose={() => setOpenMenu(null)} />
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-white/[0.06] px-3 py-3 flex-shrink-0">
        {isLoggedIn ? (
          <div className="flex items-center gap-3">
            <button
  onClick={() => navigate('/dashboard')}
  className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center
             text-white text-[13px] font-bold flex-shrink-0
             hover:scale-105 transition-transform"
  title="Go to Dashboard"
>
  {displayName[0].toUpperCase()}
</button>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-200 truncate leading-none">
                {displayName}
              </p>
              <p className="text-[10px] text-slate-600 truncate mt-0.5">
                {user?.email}
              </p>
            </div>
            <button onClick={() => { logout(); navigate('/chat') }}
              title="Logout"
              className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-600
                         hover:text-red-400 transition-colors flex-shrink-0">
              <LogOut size={14} />
            </button>
          </div>
        ) : (
          <button onClick={() => navigate('/signup')}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl
                       text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white
                       transition-all shadow-lg shadow-blue-900/30">
            Sign Up Free
          </button>
        )}
      </div>
    </div>
  )
}
