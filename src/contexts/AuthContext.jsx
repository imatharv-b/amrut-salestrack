import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const initDone = useRef(false)

  // Fetch user profile with role
  async function fetchProfile(userId) {
    try {
      const { data, error } = await supabase.from('users').select('*').eq('id', userId).single()
      if (error) throw error
      setProfile(data)
    } catch (err) {
      console.error('Error fetching profile:', err)
      setProfile(null)
    }
  }

  useEffect(() => {
    // Safety timeout — never leave the app stuck on loading
    const safetyTimer = setTimeout(() => {
      if (loading) { console.warn('[Auth] Safety timeout: forcing loading=false after 8s'); setLoading(false) }
    }, 8000)

    // Get initial session
    supabase.auth.getSession()
      .then(async ({ data: { session } }) => {
        if (initDone.current) return
        initDone.current = true
        setUser(session?.user ?? null)
        if (session?.user) {
          try { await fetchProfile(session.user.id) }
          catch (err) { console.error('Failed to fetch profile on init:', err); setProfile(null) }
        }
      })
      .catch((err) => { console.error('Failed to get auth session:', err); initDone.current = true; setUser(null); setProfile(null) })
      .finally(() => { setLoading(false) })

    // Listen for auth changes (only for SUBSEQUENT changes, not the initial one)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!initDone.current) return
        setUser(session?.user ?? null)
        if (session?.user) {
          try { await fetchProfile(session.user.id) }
          catch (err) { console.error('Profile fetch error on auth change:', err); setProfile(null) }
        } else { setProfile(null) }
      }
    )

    return () => { clearTimeout(safetyTimer); subscription.unsubscribe() }
  }, [])

  // Sign in with email/password
  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  // Sign up new user (Salesman Flow)
  async function signUp(email, password, name, phone) {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    if (data?.user) {
      const { error: profileError } = await supabase.from('users').insert({ id: data.user.id, name, phone, role: 'salesman' })
      if (profileError) throw profileError
    }
    return data
  }

  // Sign out
  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    setUser(null)
    setProfile(null)
  }

  const value = { user, profile, loading, signIn, signUp, signOut, isManager: profile?.role === 'manager', isSalesman: profile?.role === 'salesman', isViewer: profile?.role === 'viewer' }

  return (<AuthContext.Provider value={value}>{children}</AuthContext.Provider>)
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
