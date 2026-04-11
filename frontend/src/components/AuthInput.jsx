import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import clsx from 'clsx'

export default function AuthInput({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  error,
  autoComplete,
  disabled = false,
}) {
  // For password fields: toggle visibility
  const [visible, setVisible] = useState(false)
  const isPassword = type === 'password'
  const inputType  = isPassword ? (visible ? 'text' : 'password') : type

  return (
    <div className="flex flex-col gap-1.5">
      {/* Label */}
      {label && (
        <label className="text-xs font-medium text-slate-400 tracking-wide">
          {label}
        </label>
      )}

      {/* Input wrapper */}
      <div className="relative">
        <input
          type={inputType}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          disabled={disabled}
          className={clsx(
            // Base
            'w-full bg-[#0F172A] border rounded-xl px-4 py-3',
            'text-sm text-slate-200 placeholder-slate-600',
            'transition-all duration-200 outline-none',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            // Right padding for password toggle
            isPassword && 'pr-11',
            // Border state
            error
              ? 'border-red-500/60 focus:border-red-500/80 focus:ring-2 focus:ring-red-500/10'
              : 'border-white/[0.08] focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/10'
          )}
        />

        {/* Password visibility toggle */}
        {isPassword && (
          <button
            type="button"
            onClick={() => setVisible(v => !v)}
            tabIndex={-1}
            className="absolute right-3 top-1/2 -translate-y-1/2
                       text-slate-600 hover:text-slate-400 transition-colors"
          >
            {visible ? <Eye size={15} /> : <EyeOff size={15} />}
          </button>
        )}
      </div>

      {/* Inline error */}
      {error && (
        <p className="text-[11px] text-red-400 leading-snug">{error}</p>
      )}
    </div>
  )
}
