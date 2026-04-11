import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  FileText, Upload, MessageSquare, Zap, ChevronRight,
  Clock, Plus, LogOut, Settings, Edit3, Camera,
  Shield, Bell, Star, Activity, BookOpen,
  BarChart2, Layers, ChevronDown, UserCircle2,
} from 'lucide-react'
import { useChat } from '../context/ChatContext'
import { useAuth, getGreeting } from '../context/AuthContext'
import clsx from 'clsx'

// ── Sub-components ────────────────────────────────────────────

function initials(name = '') {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'
}

function Avatar({ name, size = 'md' }) {
  const sz = size === 'lg' ? 'w-16 h-16 text-xl' : 'w-9 h-9 text-sm'
  return (
    <div className={clsx(
      sz,
      'rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700',
      'flex items-center justify-center font-bold text-white flex-shrink-0',
      'border-2 border-blue-400/20 shadow-lg shadow-blue-900/30 select-none'
    )}>
      {initials(name)}
    </div>
  )
}

function PlanBadge({ plan = 'Free' }) {
  return (
    <span className={clsx(
      'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold',
      plan === 'Pro'
        ? 'bg-amber-500/15 text-amber-400 border border-amber-500/25'
        : 'bg-slate-700/60 text-slate-400 border border-white/[0.06]'
    )}>
      {plan === 'Pro' && <Star size={9} fill="currentColor" />}
      {plan}
    </span>
  )
}

function StorageBar({ chunks = 0 }) {
  // 1 chunk ≈ ~0.5 KB of text; visual indicator only
  const usedMB   = Math.min(+(chunks * 0.0005).toFixed(1), 100)
  const limitMB  = 100
  const pct      = Math.min(100, Math.round((usedMB / limitMB) * 100)) || 0
  const color    = pct > 80 ? 'from-red-500 to-red-600'
                 : pct > 55 ? 'from-amber-500 to-amber-600'
                 :             'from-blue-500 to-blue-600'
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-slate-500">Storage</span>
        <span className="font-mono text-slate-400">{usedMB} / {limitMB} MB</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.9, ease: 'easeOut', delay: 0.3 }}
          className={clsx('h-full rounded-full bg-gradient-to-r', color)}
        />
      </div>
      <p className="text-[10px] text-slate-600">{pct}% used</p>
    </div>
  )
}

function QuickAction({ icon: Icon, label, desc, onClick, accent = false }) {
  return (
    <motion.button
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={clsx(
        'flex items-center gap-3 p-3.5 rounded-xl text-left w-full border transition-all duration-150',
        accent
          ? 'bg-blue-600/10 border-blue-500/25 hover:bg-blue-600/20 hover:border-blue-500/40'
          : 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06] hover:border-white/10'
      )}
    >
      <div className={clsx(
        'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
        accent ? 'bg-blue-500/20' : 'bg-white/[0.05]'
      )}>
        <Icon size={15} className={accent ? 'text-blue-400' : 'text-slate-400'} />
      </div>
      <div className="min-w-0">
        <p className={clsx('text-xs font-semibold truncate', accent ? 'text-blue-300' : 'text-slate-300')}>
          {label}
        </p>
        <p className="text-[10px] text-slate-600 truncate mt-0.5">{desc}</p>
      </div>
    </motion.button>
  )
}

function StatCard({ label, value, icon: Icon, color, bg, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-[#1E293B] border border-white/[0.06] rounded-2xl p-5
                 hover:border-white/10 transition-all duration-200 flex items-center gap-4"
    >
      <div className={clsx('w-11 h-11 rounded-xl border flex items-center justify-center flex-shrink-0', bg)}>
        <Icon size={18} className={color} />
      </div>
      <div>
        <p className="font-bold text-2xl text-white leading-none">{value}</p>
        <p className="text-xs text-slate-500 mt-1">{label}</p>
      </div>
    </motion.div>
  )
}

// ── Guest Banner ──────────────────────────────────────────────
function GuestBanner({ navigate }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-blue-500/8 border border-blue-500/20 rounded-2xl px-5 py-4
                 flex items-center gap-4 mb-6"
    >
      <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/20
                      flex items-center justify-center flex-shrink-0">
        <UserCircle2 size={20} className="text-blue-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-200">You're browsing as a guest</p>
        <p className="text-xs text-slate-500 mt-0.5">
          Sign up to save your chats and access them from any device.
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={() => navigate('/upload')}
          className="px-3 py-1.5 rounded-lg text-xs text-slate-400
                     hover:bg-white/5 hover:text-slate-200 border border-white/[0.06]
                     transition-all"
        >
          Continue as Guest
        </button>
        <button
          onClick={() => navigate('/signup')}
          className="px-3 py-1.5 rounded-lg text-xs font-medium text-white
                     bg-blue-600 hover:bg-blue-500 transition-all"
        >
          Sign Up Free
        </button>
      </div>
    </motion.div>
  )
}

// ── Main Dashboard ────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate()
  const { documents, sessions, setActiveDocument } = useChat()
  const { user, isLoggedIn, isGuest, displayName, logout } = useAuth()

  const [menuOpen, setMenuOpen] = useState(false)

  // Derived stats
  const totalChunks    = documents.reduce((acc, d) => acc + (d.chunks || 0), 0)
  const totalQuestions = sessions.reduce((acc, s) =>
    acc + s.messages.filter(m => m.role === 'user').length, 0)
  const totalSessions  = sessions.filter(s => s.messages.length > 0).length

  const recentQuestions = sessions
    .flatMap(s => s.messages.filter(m => m.role === 'user').map(m => ({ ...m, sessionId: s.id })))
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 5)

  const stats = [
    { label: 'Documents',       value: documents.length, icon: FileText,      color: 'text-blue-400',   bg: 'bg-blue-400/10 border-blue-400/20',    delay: 0.05 },
    { label: 'Total Chunks',    value: totalChunks,      icon: Layers,        color: 'text-violet-400', bg: 'bg-violet-400/10 border-violet-400/20', delay: 0.10 },
    { label: 'Questions Asked', value: totalQuestions,   icon: MessageSquare, color: 'text-emerald-400',bg: 'bg-emerald-400/10 border-emerald-400/20',delay: 0.15 },
    { label: 'Chat Sessions',   value: totalSessions,    icon: Activity,      color: 'text-amber-400',  bg: 'bg-amber-400/10 border-amber-400/20',   delay: 0.20 },
  ]

  // Handle logout: clear auth, keep chat/docs, go to /chat
  const handleLogout = () => {
    setMenuOpen(false)
    logout()
    navigate('/chat')
  }

  return (
    <div className="min-h-screen bg-[#0F172A]">

      {/* ── Sticky top nav ──────────────────────────────────── */}
      <div className="sticky top-0 z-30 flex items-center justify-between px-8 py-4
                      border-b border-white/[0.06] bg-[#0F172A]/90 backdrop-blur-md">
        {/* Logo */}
        <div className="flex items-center gap-1">
          <div className="flex items-center justify-center">
  <img src="/logo.png" alt="Synexa" className="w-8 h-8 object-contain" />
</div>
          <span className="text-gradient text-xl font-bold tracking-wide drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]">Synexa</span>
        </div>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-1">
          {[
            { label: 'Chat',   path: '/chat'   },
            { label: 'Upload', path: '/upload' },
          ].map(({ label, path }) => (
            <button key={path} onClick={() => navigate(path)}
              className="px-3 py-1.5 rounded-lg text-sm text-slate-400
                         hover:text-slate-200 hover:bg-white/5 transition-all">
              {label}
            </button>
          ))}
        </div>

        {/* Profile trigger — or Sign In/Up for guests */}
        {isGuest ? (
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/signin')}
              className="px-3 py-1.5 rounded-lg text-sm text-slate-400
                         hover:bg-white/5 border border-white/[0.06] transition-all">
              Sign In
            </button>
            <button onClick={() => navigate('/signup')}
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-white
                         bg-blue-600 hover:bg-blue-500 transition-all">
              Sign Up
            </button>
          </div>
        ) : (
          <div className="relative">
            <button
              onClick={() => setMenuOpen(p => !p)}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl
                         hover:bg-white/5 border border-transparent hover:border-white/[0.06]
                         transition-all duration-150"
            >
              <Avatar name={user?.name} />
              <div className="hidden sm:block text-left">
                <p className="text-xs font-semibold text-slate-200 leading-none">{user?.name}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{user?.email}</p>
              </div>
              <ChevronDown size={13}
                className={clsx('text-slate-600 transition-transform duration-200 ml-0.5',
                  menuOpen && 'rotate-180')} />
            </button>

            {/* Dropdown */}
            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0,  scale: 1   }}
                  exit={{   opacity: 0, y: -6, scale: 0.95 }}
                  transition={{ duration: 0.14 }}
                  className="absolute right-0 top-14 w-52 bg-[#1E293B] border border-white/[0.08]
                             rounded-2xl shadow-xl shadow-black/50 overflow-hidden z-50"
                >
                  <div className="px-4 py-3.5 border-b border-white/[0.06]">
                    <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">{user?.email}</p>
                    <div className="mt-2"><PlanBadge plan={user?.plan} /></div>
                  </div>
                  <div className="py-1.5">
                    {[
                      { icon: Settings, label: 'Settings'       },
                      { icon: Bell,     label: 'Notifications'  },
                      { icon: Shield,   label: 'Security'       },
                    ].map(item => (
                      <button key={item.label} onClick={() => setMenuOpen(false)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm
                                   text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-all">
                        <item.icon size={14} className="text-slate-600" /> {item.label}
                      </button>
                    ))}
                  </div>
                  <div className="border-t border-white/[0.06] py-1.5">
                    <button onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm
                                 text-red-400 hover:bg-red-500/10 transition-all">
                      <LogOut size={14} /> Sign out
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* ── Page body ────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* Guest banner */}
        {isGuest && <GuestBanner navigate={navigate} />}

        {/* Page title + time-based greeting */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <p className="text-[10px] font-mono text-slate-600 uppercase tracking-widest mb-1">Overview</p>
          <h1 className="text-2xl font-bold text-white">
            {isLoggedIn
              ? `${getGreeting()}, ${displayName.split(' ')[0]} 👋`
              : 'Dashboard'
            }
          </h1>
          {isLoggedIn && (
            <p className="text-sm text-slate-500 mt-1">Here's what's happening with your documents.</p>
          )}
        </motion.div>

        {/* Two-column layout */}
        <div className="flex flex-col xl:flex-row gap-6">

          {/* ── LEFT column ──────────────────────────────── */}
          <div className="flex-1 min-w-0 space-y-6">

            {/* Stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {stats.map(s => <StatCard key={s.label} {...s} />)}
            </div>

            {/* Documents */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22 }}
              className="bg-[#1E293B] border border-white/[0.06] rounded-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
                <div className="flex items-center gap-2.5">
                  <BookOpen size={15} className="text-slate-500" />
                  <h2 className="font-semibold text-sm text-white">Documents</h2>
                  {documents.length > 0 && (
                    <span className="text-[10px] font-mono bg-white/[0.06] text-slate-500
                                     px-2 py-0.5 rounded-full">{documents.length}</span>
                  )}
                </div>
                <button onClick={() => navigate('/upload')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs
                             bg-blue-600/10 border border-blue-500/20 text-blue-400
                             hover:bg-blue-600/20 hover:border-blue-500/40 transition-all">
                  <Plus size={11} /> Upload
                </button>
              </div>

              {documents.length === 0 ? (
                <div onClick={() => navigate('/upload')}
                  className="flex flex-col items-center justify-center py-16 cursor-pointer
                             hover:bg-white/[0.02] transition-all gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.06]
                                  flex items-center justify-center">
                    <Upload size={20} className="text-slate-600" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-slate-500">No documents yet</p>
                    <p className="text-xs text-slate-700 mt-1">Upload a PDF to get started</p>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-white/[0.04]">
                  {documents.map((doc, i) => (
                    <motion.div key={doc.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.25 + i * 0.05 }}
                      onClick={() => { setActiveDocument(doc); navigate('/chat') }}
                      className="flex items-center gap-4 px-5 py-3.5 cursor-pointer
                                 hover:bg-white/[0.03] transition-all group">
                      <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20
                                      flex items-center justify-center flex-shrink-0">
                        <FileText size={14} className="text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-200 truncate
                                      group-hover:text-white transition-colors">{doc.name}</p>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-[10px] text-slate-600 font-mono">{doc.chunks} chunks</span>
                          <span className="w-1 h-1 rounded-full bg-slate-700" />
                          <span className="text-[10px] text-slate-600">{doc.uploadedAt}</span>
                        </div>
                      </div>
                      <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg
                                      bg-white/[0.04] border border-white/[0.06]">
                        <BarChart2 size={10} className="text-slate-600" />
                        <span className="text-[10px] font-mono text-slate-500">{doc.chunks}</span>
                      </div>
                      <ChevronRight size={14}
                        className="text-slate-700 group-hover:text-slate-400
                                   group-hover:translate-x-0.5 transition-all" />
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Recent questions */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.28 }}
              className="bg-[#1E293B] border border-white/[0.06] rounded-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
                <div className="flex items-center gap-2.5">
                  <Activity size={15} className="text-slate-500" />
                  <h2 className="font-semibold text-sm text-white">Recent Questions</h2>
                </div>
                <button onClick={() => navigate('/chat')}
                  className="text-xs text-blue-400 hover:text-blue-300 flex items-center
                             gap-1 transition-colors">
                  Open chat <ChevronRight size={11} />
                </button>
              </div>

              {recentQuestions.length === 0 ? (
                <div onClick={() => navigate('/chat')}
                  className="flex flex-col items-center justify-center py-12 cursor-pointer
                             hover:bg-white/[0.02] transition-all gap-3">
                  <MessageSquare size={22} className="text-slate-700" />
                  <p className="text-sm text-slate-600">No questions yet — start chatting</p>
                </div>
              ) : (
                <div className="divide-y divide-white/[0.04]">
                  {recentQuestions.map((msg, i) => (
                    <motion.div key={msg.id || i}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 + i * 0.04 }}
                      onClick={() => navigate('/chat')}
                      className="flex items-start gap-3 px-5 py-3.5 cursor-pointer
                                 hover:bg-white/[0.03] transition-all group">
                      <div className="w-6 h-6 rounded-lg bg-white/[0.04] border border-white/[0.06]
                                      flex items-center justify-center flex-shrink-0 mt-0.5">
                        <MessageSquare size={10} className="text-slate-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-400 group-hover:text-slate-200
                                      transition-colors line-clamp-2 leading-relaxed">{msg.content}</p>
                        {msg.timestamp && (
                          <p className="text-[10px] text-slate-700 mt-1 flex items-center gap-1">
                            <Clock size={9} />
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                      </div>
                      <ChevronRight size={12}
                        className="text-slate-700 group-hover:text-slate-500 flex-shrink-0 mt-1 transition-colors" />
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>

          {/* ── RIGHT column — profile card ──────────────── */}
          <div className="xl:w-[288px] flex-shrink-0 space-y-5">

            {isLoggedIn ? (
              <>
                {/* Profile card */}
                <motion.div
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.18 }}
                  className="bg-[#1E293B] border border-white/[0.06] rounded-2xl overflow-hidden"
                >
                  {/* Cover strip */}
                  <div className="h-20 bg-gradient-to-br from-blue-600/30 via-blue-900/20 to-transparent relative">
                    <div className="absolute inset-0 opacity-20"
                         style={{ backgroundImage: 'radial-gradient(circle at 70% 50%, rgba(59,130,246,0.4), transparent 60%)' }} />
                  </div>

                  <div className="px-5 pb-5">
                    {/* Avatar row */}
                    <div className="flex items-end justify-between -mt-8 mb-4">
                      <div className="relative">
                        <Avatar name={user?.name} size="lg" />
                        <button className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full
                                           bg-[#1E293B] border border-white/[0.10]
                                           flex items-center justify-center hover:bg-white/10 transition-colors">
                          <Camera size={11} className="text-slate-400" />
                        </button>
                      </div>
                      <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border
                                         border-white/[0.08] text-xs text-slate-400
                                         hover:bg-white/5 hover:text-slate-200 transition-all">
                        <Edit3 size={11} /> Edit
                      </button>
                    </div>

                    {/* Name + plan + email */}
                    <div className="mb-5">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-bold text-white text-[15px] leading-tight">{user?.name}</h3>
                        <PlanBadge plan={user?.plan} />
                      </div>
                      <p className="text-xs text-slate-500">{user?.email}</p>
                      {user?.joined && (
                        <p className="text-[10px] text-slate-700 mt-1">Member since {user.joined}</p>
                      )}
                    </div>

                    {/* Storage */}
                    <StorageBar chunks={totalChunks} />

                    {/* Upgrade CTA */}
                    {user?.plan !== 'Pro' && (
                      <motion.button whileTap={{ scale: 0.97 }}
                        className="w-full mt-4 flex items-center justify-center gap-2 py-2.5
                                   rounded-xl bg-gradient-to-r from-amber-500/15 to-amber-600/15
                                   border border-amber-500/25 text-amber-400 text-xs font-semibold
                                   hover:from-amber-500/25 hover:to-amber-600/25 transition-all">
                        <Star size={12} fill="currentColor" /> Upgrade to Pro
                      </motion.button>
                    )}
                  </div>
                </motion.div>

                {/* Account details */}
                <motion.div
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.24 }}
                  className="bg-[#1E293B] border border-white/[0.06] rounded-2xl p-5"
                >
                  <h3 className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-4">
                    Account Details
                  </h3>
                  <div className="space-y-3">
                    {[
                      { label: 'Plan',          value: user?.plan || 'Free'             },
                      { label: 'Documents',     value: `${documents.length} uploaded`  },
                      { label: 'Questions',     value: `${totalQuestions} asked`       },
                      { label: 'Chat Sessions', value: `${totalSessions} total`        },
                      { label: 'Member since',  value: user?.joined || '—'             },
                    ].map(row => (
                      <div key={row.label} className="flex items-center justify-between">
                        <span className="text-[11px] text-slate-600">{row.label}</span>
                        <span className="text-[11px] text-slate-300 font-medium">{row.value}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </>
            ) : (
              /* Guest: compact sign-up card */
              <motion.div
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.18 }}
                className="bg-[#1E293B] border border-white/[0.06] rounded-2xl p-6 text-center"
              >
                <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20
                                flex items-center justify-center mx-auto mb-4">
                  <UserCircle2 size={28} className="text-blue-400" />
                </div>
                <h3 className="font-bold text-white text-sm mb-1.5">Create a free account</h3>
                <p className="text-xs text-slate-500 leading-relaxed mb-5">
                  Sign up to save your chat history, manage documents, and access your workspace from anywhere.
                </p>
                <div className="space-y-2">
                  <button onClick={() => navigate('/signup')}
                    className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500
                               text-white text-sm font-semibold transition-all">
                    Sign Up Free
                  </button>
                  <button onClick={() => navigate('/signin')}
                    className="w-full py-2.5 rounded-xl border border-white/[0.08]
                               text-slate-400 hover:text-slate-200 hover:bg-white/5
                               text-sm transition-all">
                    Sign In
                  </button>
                </div>
              </motion.div>
            )}

            {/* Logout — only when logged in */}
            {isLoggedIn && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl
                           border border-white/[0.06] text-xs text-slate-500
                           hover:border-red-500/30 hover:bg-red-500/5 hover:text-red-400
                           transition-all duration-200"
              >
                <LogOut size={13} /> Sign out
              </motion.button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
