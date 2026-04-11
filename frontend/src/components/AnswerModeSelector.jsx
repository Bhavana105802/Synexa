import { motion } from 'framer-motion'
import { Zap, BookOpen, GraduationCap } from 'lucide-react'
import clsx from 'clsx'

const MODES = [
  { id: 'simple',   label: 'Simple',   icon: Zap,           desc: 'Quick, concise answer' },
  { id: 'detailed', label: 'Detailed', icon: BookOpen,       desc: 'Full explanation' },
  { id: 'exam',     label: 'Exam',     icon: GraduationCap, desc: 'Structured academic format' },
]

export default function AnswerModeSelector({ value, onChange }) {
  return (
    <div className="flex items-center gap-0.5 bg-[#1E293B] border border-white/[0.06] rounded-xl p-1">
      {MODES.map(mode => (
        <button
          key={mode.id}
          onClick={() => onChange(mode.id)}
          title={mode.desc}
          className={clsx(
            'relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-150',
            value === mode.id ? 'text-white' : 'text-slate-500 hover:text-slate-300'
          )}
        >
          {value === mode.id && (
            <motion.div
              layoutId="mode-bg"
              className="absolute inset-0 bg-blue-600 rounded-lg"
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            />
          )}
          <mode.icon size={12} className="relative z-10 flex-shrink-0" />
          <span className="relative z-10">{mode.label}</span>
        </button>
      ))}
    </div>
  )
}
