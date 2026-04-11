import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Zap, FileText, Search, Shield, ArrowRight, Star, MessageSquare, Brain } from 'lucide-react'

const FEATURES = [
  {
    icon: Brain,
    title: 'Semantic Understanding',
    desc: 'Goes beyond keyword search — understands the meaning of your question and finds contextually relevant answers.',
  },
  {
    icon: FileText,
    title: 'Multi-Document Knowledge',
    desc: 'Upload multiple PDFs and ask questions across your entire document library in one unified interface.',
  },
  {
    icon: Search,
    title: 'Source Citations',
    desc: 'Every answer comes with exact page references so you can verify and explore the original source material.',
  },
  {
    icon: Shield,
    title: 'Runs Locally',
    desc: 'Your documents never leave your machine. The entire RAG pipeline runs locally with open-source models.',
  },
]

const STEPS = [
  { num: '01', title: 'Upload your PDF', desc: 'Drag and drop any PDF document.' },
  { num: '02', title: 'Ask a question', desc: 'Type any question in natural language.' },
  { num: '03', title: 'Get cited answers', desc: 'Receive answers with source page references.' },
]

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-navy-900 overflow-x-hidden">
      {/* Background grid */}
      <div className="fixed inset-0 bg-grid-pattern bg-grid opacity-40 pointer-events-none" />
      <div className="fixed inset-0 bg-hero-gradient pointer-events-none" />

      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-5 max-w-7xl mx-auto">
        <div className="flex items-center gap-1">
          <div className="flex items-center justify-center">
  <img src="/logo.png" alt="Synexa" className="w-8 h-8 object-contain" />
</div>
<span className="text-gradient text-xl font-bold tracking-wide drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]">Synexa</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/signin')}
            className="btn-ghost text-sm"
          >
            Sign In
          </button>
          <button
            onClick={() => navigate('/signup')}
            className="btn-primary text-sm"
          >
            Get Started
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 flex flex-col items-center text-center px-6 pt-20 pb-24 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-xs font-mono text-accent mb-8">
            <Star size={10} fill="currentColor" />
            RAG-powered · Open source · Runs locally
          </div>

          <h1 className="font-display font-extrabold text-5xl md:text-7xl text-white leading-[1.05] tracking-tight mb-6">
            Chat with your{' '}
            <span className="text-gradient">documents</span>
            <br />intelligently.
          </h1>

          <p className="text-lg text-slate-400 leading-relaxed max-w-2xl mx-auto mb-10">
            Synexa uses retrieval-augmented generation to let you ask natural language questions
            about your PDFs and get precise, cited answers powered by local AI.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/upload')}
              className="btn-primary flex items-center gap-2 text-base px-7 py-3.5"
            >
              Start Chatting with Your Documents
              <ArrowRight size={16} />
            </motion.button>
          </div>
        </motion.div>

        {/* Hero visual */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mt-16 w-full max-w-2xl"
        >
          <div className="bg-navy-800 border border-white/5 rounded-2xl overflow-hidden shadow-panel">
            {/* Fake browser chrome */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-navy-900/50">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
              <div className="flex-1 mx-4 bg-navy-700 rounded-md px-3 py-1 text-[10px] text-slate-600 font-mono">
                localhost:5173/chat
              </div>
            </div>
            {/* Fake chat preview */}
            <div className="p-5 space-y-4">
              <FakeChatMessage role="user" text="What are the key skills of the candidate?" />
              <FakeChatMessage
                role="ai"
                text="The candidate has expertise in **Python**, **React**, and **SQL**. They have 3+ years of backend experience and contributed to open-source RAG frameworks."
                sources={[{ doc: 'resume.pdf', page: 2 }]}
                confidence={92}
              />
            </div>
          </div>
        </motion.div>
      </section>

      {/* How it works */}
      <section className="relative z-10 px-6 py-16 max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-xs font-mono text-accent uppercase tracking-widest mb-3">How it works</p>
          <h2 className="font-display font-bold text-3xl text-white">Three steps to instant answers</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {STEPS.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="card relative"
            >
              <p className="font-display font-black text-5xl text-accent/10 absolute top-4 right-4">{step.num}</p>
              <p className="font-display font-bold text-white text-base mb-2 relative z-10">{step.title}</p>
              <p className="text-sm text-slate-500 relative z-10">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 px-6 py-16 max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-xs font-mono text-accent uppercase tracking-widest mb-3">Features</p>
          <h2 className="font-display font-bold text-3xl text-white">Built for serious document work</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {FEATURES.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="card flex gap-4"
            >
              <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0">
                <f.icon size={18} className="text-accent" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-white text-sm mb-1">{f.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 px-6 py-20 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-xl mx-auto"
        >
          <h2 className="font-display font-extrabold text-4xl text-white mb-4">
            Ready to ask your documents anything?
          </h2>
          <p className="text-slate-400 mb-8 text-sm">Upload your first PDF and start getting AI-powered answers in seconds.</p>
          <button
            onClick={() => navigate('/upload')}
            className="btn-primary inline-flex items-center gap-2 text-base px-8 py-3.5"
          >
            Upload Your First Document <ArrowRight size={16} />
          </button>
        </motion.div>
      </section>
    </div>
  )
}

function FakeChatMessage({ role, text, sources, confidence }) {
  return (
    <div className={`flex items-start gap-3 ${role === 'user' ? 'flex-row-reverse' : ''}`}>
      <div className={`w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0
        ${role === 'user' ? 'bg-accent/20' : 'bg-navy-700 border border-white/5'}`}>
        {role === 'user'
          ? <div className="w-2.5 h-2.5 rounded-full bg-accent" />
          : <Zap size={12} className="text-accent" />
        }
      </div>
      <div className={`max-w-[80%] px-3.5 py-2.5 rounded-xl text-xs leading-relaxed
        ${role === 'user' ? 'bg-accent text-white rounded-tr-sm' : 'bg-navy-700 text-slate-300 rounded-tl-sm'}`}
      >
        <p dangerouslySetInnerHTML={{ __html: text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
        {sources && (
          <div className="mt-2 flex items-center gap-2">
            {sources.map((s, i) => (
              <span key={i} className="inline-flex items-center gap-1 text-[10px] bg-navy-800 border border-white/5 rounded-md px-2 py-0.5 text-slate-500">
                <FileText size={9} /> {s.doc} p.{s.page}
              </span>
            ))}
            {confidence && (
              <span className="text-[10px] text-emerald-400 font-mono ml-auto">{confidence}%</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
