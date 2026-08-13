import { useEffect, useState } from 'react'
import { Eye, EyeOff, ArrowLeft } from 'lucide-react'
import { ApiError } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { useHomepage } from '../hooks/useHomepage'
import SiteBrand from '../components/SiteBrand'

interface LoginProps {
  onNavigate: (page: string) => void
  /** After sign-in, parent may already route via onNavigate('dashboard'). */
  nextPath?: string | null
}

export default function Login({ onNavigate, nextPath }: LoginProps) {
  const { login, register, canRegister, refreshSetup, admin, loading: authLoading } = useAuth()
  const { content } = useHomepage()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [title, setTitle] = useState('Administrator')
  const [phone, setPhone] = useState('')
  const [remember, setRemember] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    void refreshSetup()
  }, [refreshSetup])

  useEffect(() => {
    if (!authLoading && admin) onNavigate('dashboard')
  }, [authLoading, admin, onNavigate])

  useEffect(() => {
    if (canRegister) setMode('register')
    else setMode('login')
  }, [canRegister])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'register') {
        await register({ email, password, fullName, title, phone })
      } else {
        await login(email, password)
      }
      onNavigate(nextPath?.includes('check-in') ? 'check-in' : 'dashboard')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong')
      await refreshSetup()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen min-h-[100dvh] flex bg-[#F7F5F2]">
      <div className="hidden lg:flex lg:w-[46%] relative overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1438032005730-c779502df39b?auto=format&fit=crop&w=1600&q=80"
          alt=""
          className="absolute inset-0 w-full h-full object-cover animate-ken-burns"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(165deg, rgba(20,28,43,0.88) 0%, rgba(31,45,77,0.72) 55%, rgba(20,28,43,0.9) 100%)',
          }}
        />
        <div className="absolute inset-0 landing-grain opacity-30 mix-blend-overlay" />
        <div className="relative z-10 flex flex-col justify-between p-10 xl:p-14 text-white w-full">
          <p className="font-display text-2xl font-semibold tracking-tight">
            <SiteBrand content={content} variant="on-dark" className="text-2xl" />
          </p>
          <div className="animate-fade-in-slow">
            <div className="w-10 h-px bg-accent-soft/70 mb-6" />
            <p className="font-display text-3xl xl:text-4xl font-medium leading-snug max-w-sm mb-4">
              A quieter way to run the house of God.
            </p>
            <p className="text-white/65 text-sm max-w-xs leading-relaxed">
              Sign in to manage members, check-in, and giving for your congregation.
            </p>
          </div>
        </div>
      </div>

      <div className="w-full lg:w-[54%] flex items-start sm:items-center justify-center px-5 sm:px-10 py-10 sm:py-12 relative overflow-y-auto safe-pb">
        <div
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            background:
              'radial-gradient(ellipse at 100% 0%, rgba(154,123,79,0.07), transparent 40%)',
          }}
        />
        <div className="relative w-full max-w-[400px]">
          <button
            type="button"
            onClick={() => onNavigate('landing')}
            className="flex items-center gap-2 text-[#8A91A0] hover:text-ink text-sm mb-10 transition-colors"
          >
            <ArrowLeft size={15} />
            Back to homepage
          </button>

          <div className="animate-fade-in">
            <p className="lg:hidden font-display text-2xl font-semibold text-ink mb-8">
              <SiteBrand content={content} variant="on-light" className="text-2xl" />
            </p>
            <h1 className="font-display text-[2rem] sm:text-3xl font-semibold text-ink mb-2 leading-tight">
              {mode === 'register' ? 'Create admin account' : 'Welcome back'}
            </h1>
            <p className="text-[#5C6578] text-sm mb-6 leading-relaxed">
              {mode === 'register'
                ? 'First-time setup — only one primary admin can be created'
                : nextPath?.includes('check-in')
                  ? 'Sign in to open fingerprint member check-in'
                  : 'Sign in to your church portal'}
            </p>

            {canRegister && (
              <div className="flex gap-1 mb-6 p-1 rounded-md bg-[#EFEBE6]">
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className={`flex-1 py-2 rounded text-sm font-medium transition-colors ${
                    mode === 'register' ? 'bg-white text-ink shadow-sm' : 'text-[#8A91A0]'
                  }`}
                >
                  Create account
                </button>
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className={`flex-1 py-2 rounded text-sm font-medium transition-colors ${
                    mode === 'login' ? 'bg-white text-ink shadow-sm' : 'text-[#8A91A0]'
                  }`}
                >
                  Sign in
                </button>
              </div>
            )}

            {!canRegister && mode === 'register' && (
              <div className="mb-5 rounded-md bg-[#F8EDE9] border border-[#E8C9C3] px-3 py-2.5 text-xs text-danger">
                An admin account already exists. Registration is closed.
              </div>
            )}

            {error && (
              <div className="mb-5 rounded-md bg-[#F8EDE9] border border-[#E8C9C3] px-3 py-2.5 text-xs text-danger">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-[#3D4555] mb-1.5">Full name</label>
                    <input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Rev. John Mensah"
                      required
                      className="input-field w-full px-3.5 py-2.5 rounded-md text-sm text-ink placeholder-[#A8AEB8]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-[#3D4555] mb-1.5">Title</label>
                      <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="input-field w-full px-3.5 py-2.5 rounded-md text-sm text-ink"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#3D4555] mb-1.5">Phone</label>
                      <input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+233…"
                        className="input-field w-full px-3.5 py-2.5 rounded-md text-sm text-ink placeholder-[#A8AEB8]"
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-[#3D4555] mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="pastor@yourchurch.org"
                  required
                  className="input-field w-full px-3.5 py-2.5 rounded-md text-sm text-ink placeholder-[#A8AEB8]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#3D4555] mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="input-field w-full px-3.5 py-2.5 pr-11 rounded-md text-sm text-ink"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#A8AEB8] hover:text-[#5C6578]"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {mode === 'login' && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-[#E4E0DA]"
                  />
                  <span className="text-sm text-[#5C6578]">Remember me</span>
                </label>
              )}

              <button
                type="submit"
                disabled={loading || (mode === 'register' && !canRegister)}
                className="btn-primary w-full py-3 rounded-md text-sm font-medium flex items-center justify-center disabled:opacity-50 mt-2"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : mode === 'register' ? (
                  'Create admin account'
                ) : (
                  'Sign in'
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
