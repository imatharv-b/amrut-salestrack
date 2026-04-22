import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { DEMO_MODE, DEMO_USERS } from '../lib/demoData'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  // Fetch user profile with role
  async function fetchProfile(userId) {
    if (DEMO_MODE) {
      const demoProfileStr = localStorage.getItem('demo_user')
      if (demoProfileStr) {
        setProfile(JSON.parse(demoProfileStr))
      }
      return
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error
      setProfile(data)
    } catch (err) {
      console.error('Error fetching profile:', err)
      setProfile(null)
    }
  }

  useEffect(() => {
    if (DEMO_MODE) {
      const demoProfileStr = localStorage.getItem('demo_user')
      if (demoProfileStr) {
        const p = JSON.parse(demoProfileStr)
        setUser({ id: p.id, email: p.role === 'manager' ? 'manager@amrut.com' : 'salesman@amrut.com' })
        setProfile(p)
      }
      setLoading(false)
      return
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null)
        if (session?.user) {
          await fetchProfile(session.user.id)
        } else {
          setProfile(null)
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  // Sign in with email/password
  async function signIn(email, password) {
    if (DEMO_MODE) {
       if (email === DEMO_USERS.manager.email && password === DEMO_USERS.manager.password) {
         localStorage.setItem('demo_user', JSON.stringify(DEMO_USERS.manager.profile))
         window.location.reload()
         return
       } else if (email === DEMO_USERS.salesman.email && password === DEMO_USERS.salesman.password) {
         localStorage.setItem('demo_user', JSON.stringify(DEMO_USERS.salesman.profile))
         window.location.reload()
         return
       }
       throw new Error('Invalid demo credentials')
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  // Sign up new user (Salesman Flow)
  async function signUp(email, password, name, phone) {
    if (DEMO_MODE) {
       throw new Error('Registration is disabled via Demo Mode')
    }

    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error

    // Generate the public profile
    if (data?.user) {
      const { error: profileError } = await supabase.from('users').insert({
        id: data.user.id,
        name,
        phone,
        role: 'salesman' // Automatic default setup
      })
      if (profileError) throw profileError
    }

    return data
  }

  // Sign out
  async function signOut() {
    if (DEMO_MODE) {
      localStorage.removeItem('demo_user')
      setUser(null)
      setProfile(null)
      window.location.href='/login'
      return
    }

    const { error } = await supabase.auth.signOut()
    if (error) throw error
    setUser(null)
    setProfile(null)
  }

  const value = {
    user,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    isManager: profile?.role === 'manager',
    isSalesman: profile?.role === 'salesman',
  }

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
