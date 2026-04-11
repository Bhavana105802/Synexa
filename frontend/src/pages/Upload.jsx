import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Zap, FileText, Cpu, Database } from 'lucide-react'
import UploadArea from '../components/UploadArea'

const PIPELINE_STEPS = [
  { icon: FileText, label: 'Text extraction',     desc: 'PyPDF reads every page' },
  { icon: Cpu,      label: 'Chunking',             desc: 'Split into 500-char chunks' },
  { icon: Zap,      label: 'Embeddings',           desc: 'all-MiniLM-L6-v2 model' },
  { icon: Database, label: 'FAISS indexing',       desc: 'Stored for fast retrieval' },
]

export default function Upload() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-navy-900 flex flex-col">
      {/* Top bar */}
      <div className="flex items-center gap-4 px-8 py-5 border-b border-white/5">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center">
  <img src="/logo.png" alt="Synexa" className="w-8 h-8 object-contain" />
</div>
          <span className="font-display font-bold text-white">Synexa</span>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-10"
          >
            <p className="text-xs font-mono text-accent uppercase tracking-widest mb-3">Step 1 of 2</p>
            <h1 className="font-display font-extrabold text-3xl text-white mb-3">
              Upload your document
            </h1>
          </motion.div>

          {/* Upload area */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-10"
          >
            <UploadArea />
          </motion.div>

          {/* Pipeline steps */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <p className="text-[10px] font-mono text-slate-600 uppercase tracking-widest text-center mb-5">
              What happens after upload
            </p>
            <div className="grid grid-cols-4 gap-3">
              {PIPELINE_STEPS.map((step, i) => (
                <div key={i} className="relative flex flex-col items-center text-center gap-2">
                  {i < PIPELINE_STEPS.length - 1 && (
                    <div className="absolute top-4 left-[calc(50%+20px)] w-full h-px bg-white/5" />
                  )}
                  <div className="w-9 h-9 rounded-xl bg-navy-800 border border-white/5 flex items-center justify-center z-10">
                    <step.icon size={15} className="text-accent" />
                  </div>
                  <p className="text-[10px] font-display font-semibold text-slate-400">{step.label}</p>
                  <p className="text-[10px] text-slate-600 leading-tight">{step.desc}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
