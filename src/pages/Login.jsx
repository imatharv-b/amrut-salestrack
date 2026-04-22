import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { DEMO_MODE, DEMO_USERS } from '../lib/demoData'

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
      if (DEMO_MODE) {
        // Demo mode login
        const manager = DEMO_USERS.manager
        const salesman = DEMO_USERS.salesman
        
        if (email === manager.email && password === manager.password) {
          // Simulate login — profile is set via localStorage in demo mode
          localStorage.setItem('demo_user', JSON.stringify(manager.profile))
          window.location.reload()
          return
        } else if (email === salesman.email && password === salesman.password) {
          localStorage.setItem('demo_user', JSON.stringify(salesman.profile))
          window.location.reload()
          return
        } else {
          throw new Error('Invalid credentials. Use demo accounts shown below.')
        }
      }

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
          <div className="w-20 h-20 rounded-2xl gradient-brand flex items-center justify-center text-white 
            font-bold text-3xl shadow-xl shadow-brand-600/30 mx-auto mb-4">
            A
          </div>
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
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="input-field"
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label htmlFor="password" className="input-label">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="input-field"
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-medium">
              {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="btn-primary mt-2"
          >
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

        {DEMO_MODE && (
          <div className="mt-6 p-4 rounded-xl bg-blue-50 border border-blue-200">
            <p className="text-xs font-semibold text-blue-700 mb-2">🔑 Demo Mode — Supabase not connected</p>
            <div className="space-y-1.5 text-xs text-blue-600">
              <p><strong>Manager:</strong> manager@amrut.com / manager123</p>
              <p><strong>Salesman:</strong> salesman@amrut.com / salesman123</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
