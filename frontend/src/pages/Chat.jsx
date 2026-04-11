import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Sidebar from '../components/Sidebar'
import ChatBox from '../components/ChatBox'
import DocumentViewer from '../components/DocumentViewer'
import { useChat } from '../context/ChatContext'
import { useNavigate } from 'react-router-dom'

export default function Chat() {
  const { viewerOpen, setViewerOpen, sidebarCollapsed, activeChat } = useChat()
  const navigate = useNavigate()

  // Auto-collapse viewer on narrow screens
  useEffect(() => {
    const handle = () => {
      if (window.innerWidth < 1200) setViewerOpen(false)
      else setViewerOpen(true)
    }
    handle()
    window.addEventListener('resize', handle)
    return () => window.removeEventListener('resize', handle)
  }, [setViewerOpen])

  // ── Debug ─────────────────────────────────────────────
  console.log('[Chat] activeChat:', activeChat)

  const sideW = sidebarCollapsed ? '64px' : '260px'

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0F172A]">

      {/* LEFT — Sidebar */}
      <div
        className="h-full flex-shrink-0 border-r border-white/[0.06] overflow-hidden"
        style={{
          width: sideW,
          transition: 'width 0.28s cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        <Sidebar />
      </div>

      {/* CENTER — Chat or empty-state guard */}
      <div className="h-full flex-1 min-w-0 overflow-hidden flex flex-col">
        {activeChat ? (
          <ChatBox />
        ) : (
          // Guard: shown when no chat exists yet (e.g. first visit or after
          // all chats deleted). Prompts user to upload rather than showing
          // a broken blank ChatBox.
          <div className="flex flex-col items-center justify-center h-full gap-4
                          text-center px-8">
            <p className="text-slate-400 font-medium">No active chat</p>
            <p className="text-slate-600 text-sm">Upload a document to get started.</p>
            <button
              onClick={() => navigate('/upload')}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500
                         text-white text-sm transition-all"
            >
              Upload a Document
            </button>
          </div>
        )}
      </div>

      {/* RIGHT — PDF Viewer (only meaningful when activeChat exists) */}
      <AnimatePresence initial={false}>
        {viewerOpen && activeChat && (
          <motion.div
            key="pdf-viewer"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: '40vw', opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 28 }}
            className="h-full flex-shrink-0 border-l border-white/[0.06] overflow-hidden"
            style={{ minWidth: 0 }}
          >
            <div className="w-full h-full">
              <DocumentViewer />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
