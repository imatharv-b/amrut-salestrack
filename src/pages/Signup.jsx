import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import LoadingSpinner from '../components/LoadingSpinner'

export default function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const { signUp } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await signUp(email, password, name, phone)
      setSuccess(true)
      setTimeout(() => navigate('/'), 3000)
    } catch (err) {
      setError(err.message || 'Failed to create account')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen gradient-brand-light flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-lg border border-brand-100 text-center animate-fade-in-up">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
            ✓
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Registration Successful</h2>
          <p className="text-gray-500 mb-6">Your salesman account has been created. Awaiting manager route assignment.</p>
          <LoadingSpinner text="Redirecting..." size="sm" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen gradient-brand-light flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-xl shadow-brand-900/5 border border-brand-50 animate-fade-in-up">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-brand-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-brand-600/30">
            <span className="text-3xl text-white">🌱</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Amrut SalesTrack</h1>
          <p className="text-brand-600 font-medium">Sales Registration Setup</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm mb-6 border border-red-100 text-center animate-pulse">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="input-label">Full Name</label>
            <input 
              type="text" 
              required 
              className="input-field"
              placeholder="e.g. Sunil Deshmukh"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="input-label">Phone Number</label>
            <input 
              type="tel" 
              required 
              className="input-field"
              placeholder="e.g. 9876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div>
            <label className="input-label">Email Address</label>
            <input 
              type="email" 
              required 
              className="input-field"
              placeholder="salesman@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="input-label">Password Setup</label>
            <input 
              type="password" 
              required 
              className="input-field tracking-widest"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className={`w-full py-3.5 rounded-xl text-white font-bold text-lg shadow-lg shadow-brand-600/30 transition-all ${
              loading ? 'bg-brand-400' : 'bg-brand-600 hover:bg-brand-700 active:scale-95'
            }`}
          >
            {loading ? 'Creating Profile...' : 'Register Account'}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-gray-500 font-medium">
          Already registered?{' '}
          <Link to="/login" className="text-brand-600 hover:text-brand-800 transition-colors">
            Sign In Securely
          </Link>
        </p>
      </div>
    </div>
  )
}
