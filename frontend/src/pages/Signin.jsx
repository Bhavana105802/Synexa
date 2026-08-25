import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Zap, ArrowRight, Loader } from 'lucide-react'
import AuthInput from '../components/AuthInput'
import { useAuth } from '../context/AuthContext'
import { loginUser } from '../services/api'
import { useChat } from '../context/ChatContext'

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}

function validate({ email, password }) {
  const errs = {}
  if (!email.trim())                    errs.email    = 'Email is required.'
  else if (!/\S+@\S+\.\S+/.test(email)) errs.email    = 'Enter a valid email address.'
  if (!password)                        errs.password = 'Password is required.'
  else if (password.length < 6)         errs.password = 'Password must be at least 6 characters.'
  return errs
}

export default function Signin() {
  const navigate = useNavigate()
  const { login }     = useAuth()
  const { documents } = useChat()

  const [form, setForm]           = useState({ email: '', password: '' })
  const [rememberMe, setRememberMe] = useState(false)
  const [errors, setErrors]       = useState({})
  const [loading, setLoading]     = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const set = (field) => (e) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }))
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }))
  }

  const redirectAfterLogin = () =>
    navigate(documents.length > 0 ? '/chat' : '/upload', { replace: true })

  const handleSignin = async (e) => {
    e.preventDefault()
    const errs = validate(form)
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setLoading(true)
    try {
      // Real backend login → get JWT token
      const loginData = await loginUser(form.email.trim(), form.password)
      const name = form.email.split('@')[0]
      login({ name, email: form.email.trim(), token: loginData.access_token })
      redirectAfterLogin()
    } catch (err) {
      setErrors({ submit: err.message || 'Sign-in failed. Check your credentials.' })
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    setGoogleLoading(true)
    try {
      await new Promise(r => setTimeout(r, 1000))
      login({ name: 'Google User', email: 'user@gmail.com' })
      redirectAfterLogin()
    } catch {
      setErrors({ submit: 'Google sign-in failed. Please try again.' })
    } finally {
      setGoogleLoading(false)
    }
  }

  const busy = loading || googleLoading

  return (
    <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center px-4">
      <div className="pointer-events-none fixed inset-0 flex items-center justify-center">
        <div className="w-[600px] h-[400px] rounded-full bg-blue-600/5 blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="relative w-full max-w-[420px]"
      >

        {/* Card */}
        <div className="bg-[#1E293B] border border-white/[0.06] rounded-2xl p-8 shadow-xl shadow-black/40">
        {/* Logo */}
        <div className="flex items-center justify-center gap-1 mb-8">
          <div className="flex items-center justify-center">
  <img src="/logo.png" alt="Evidentra" className="w-8 h-8 object-contain" />
</div>
          <span className="text-gradient text-2xl font-bold tracking-wide drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]">Evidentra</span>
        </div>

          <form onSubmit={handleSignin} noValidate className="space-y-4">
            <AuthInput label="Email address" type="email"    value={form.email}    onChange={set('email')}    placeholder="you@example.com" autoComplete="email"            error={errors.email}    disabled={busy} />
            <AuthInput label="Password"      type="password" value={form.password} onChange={set('password')} placeholder="Your password"    autoComplete="current-password" error={errors.password} disabled={busy} />

            <div className="flex items-center justify-between pt-0.5">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div onClick={() => setRememberMe(p => !p)}
                  className={`w-4 h-4 rounded flex items-center justify-center border transition-all
                              duration-150 cursor-pointer flex-shrink-0
                              ${rememberMe ? 'bg-blue-600 border-blue-500' : 'bg-transparent border-white/[0.15] group-hover:border-white/30'}`}>
                  {rememberMe && (
                    <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                      <path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <span className="text-xs text-slate-400 select-none">Remember me</span>
              </label>
              <button type="button" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
                Forgot password?
              </button>
            </div>

            {errors.submit && (
              <p className="text-[12px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5">
                {errors.submit}
              </p>
            )}

            <motion.button whileTap={{ scale: 0.97 }} type="submit" disabled={busy}
              className="w-full flex items-center justify-center gap-2 py-3 px-5 rounded-xl
                         bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed
                         text-white font-semibold text-sm transition-all duration-200
                         hover:shadow-lg hover:shadow-blue-900/40 mt-1">
              {loading ? <><Loader size={15} className="animate-spin" /> Signing in…</> : <>Sign In <ArrowRight size={15} /></>}
            </motion.button>
          </form>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-white/[0.06]" />
            <span className="text-[11px] text-slate-600 font-medium uppercase tracking-wider">or</span>
            <div className="flex-1 h-px bg-white/[0.06]" />
          </div>

          <motion.button whileTap={{ scale: 0.97 }} type="button" onClick={handleGoogle} disabled={busy}
            className="w-full flex items-center justify-center gap-3 py-3 px-5 rounded-xl
                       bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.08]
                       hover:border-white/[0.14] disabled:opacity-60 disabled:cursor-not-allowed
                       text-slate-300 text-sm font-medium transition-all duration-200">
            {googleLoading ? <Loader size={15} className="animate-spin text-slate-500" /> : <GoogleIcon />}
            Continue with Google
          </motion.button>

          <p className="text-center text-[13px] text-slate-500 mt-7">
            Don't have an account?{' '}
            <Link to="/signup" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">Create one free</Link>
          </p>
        </div>

        <div className="flex items-center justify-center mt-5">
          <Link to="/" className="text-[12px] text-slate-700 hover:text-slate-400 transition-colors">← Back to home</Link>
        </div>
      </motion.div>
    </div>
  )
}
