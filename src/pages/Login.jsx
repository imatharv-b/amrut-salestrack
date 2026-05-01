import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await signIn(email, password)
      navigate('/')
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col gradient-brand-light">
      {/* Top section with branding */}
      <div className="flex-1 flex items-end justify-center pb-8 pt-16">
        <div className="text-center animate-fade-in-up">
          <img src="/logo.png" alt="Amrut Biochem" className="w-20 h-20 rounded-2xl shadow-xl shadow-brand-600/30 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800">Amrut SalesTrack</h1>
          <p className="text-sm text-gray-500 mt-1">Field Sales Tracking Platform</p>
          <p className="text-xs text-gray-400 mt-0.5">Amrut Biochem • Gondia</p>
        </div>
      </div>

      {/* Login form */}
      <div className="flex-1 bg-white rounded-t-3xl shadow-2xl shadow-gray-200/50 px-6 pt-8 pb-10 animate-fade-in-up"
        style={{ animationDelay: '100ms' }}
      >
        <h2 className="text-lg font-bold text-gray-800 mb-6">Sign In / लॉगिन करें</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="input-label">Email</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email" className="input-field" required autoComplete="email" />
          </div>

          <div>
            <label htmlFor="password" className="input-label">Password</label>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" className="input-field" required autoComplete="current-password" />
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-medium">{error}</div>
          )}

          <button type="submit" disabled={loading} className="btn-primary mt-2">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Signing in...
              </span>
            ) : (
              'Sign In →'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
