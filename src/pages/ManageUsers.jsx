import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import Modal from '../components/Modal'
import EmptyState from '../components/EmptyState'

export default function ManageUsers() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState([])
  const [routes, setRoutes] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editUser, setEditUser] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', phone: '', role: 'salesman', route_id: ''
  })

  useEffect(() => { loadData() }, [])

  async function loadData() {
    try {
      const [usersRes, routesRes] = await Promise.all([
        supabase.from('users').select('*').order('created_at', { ascending: false }),
        supabase.from('routes').select('*').order('name')
      ])
      setUsers(usersRes.data || [])
      setRoutes(routesRes.data || [])
    } catch (err) {
      console.error('Error fetching admin data:', err)
    } finally { setLoading(false) }
  }

  function getRouteName(routeId) {
    if (!routeId) return '—'
    return routes.find(r => r.id === routeId)?.name || '—'
  }

  function openAdd() {
    setEditUser(null); setError(''); setSuccessMsg('')
    setFormData({ name: '', email: '', password: '', phone: '', role: 'salesman', route_id: '' })
    setModalOpen(true)
  }

  function openEdit(u) {
    setEditUser(u); setError(''); setSuccessMsg('')
    setFormData({ name: u.name || '', email: '', password: '', phone: u.phone || '', role: u.role, route_id: u.route_id || '' })
    setModalOpen(true)
  }

  async function handleSave(e) {
    e.preventDefault(); setSaving(true); setError(''); setSuccessMsg('')
    try {
      if (editUser) {
        const updateData = { name: formData.name, phone: formData.phone, role: formData.role, route_id: formData.route_id || null }
        const { error: e2 } = await supabase.from('users').update(updateData).eq('id', editUser.id)
        if (e2) throw e2
        setSuccessMsg('User updated successfully!')
        setTimeout(() => { setModalOpen(false); loadData() }, 1000)
      } else {
        if (!formData.email || !formData.password) throw new Error('Email and password are required')
        if (formData.password.length < 6) throw new Error('Password must be at least 6 characters')
        
        // 1. Create a temporary Supabase client to sign up the user without logging the manager out
        const tempSupabase = await import('@supabase/supabase-js').then(m => m.createClient(
          import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co',
          import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key',
          { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
        ))
        
        // Use a timeout promise to prevent hanging
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Request timed out. Please try again.')), 10000))
        
        // 2. Create auth user via temporary client
        const authPromise = tempSupabase.auth.signUp({ email: formData.email, password: formData.password })
        const { data: signUpData, error: signUpErr } = await Promise.race([authPromise, timeoutPromise])
        
        if (signUpErr) throw signUpErr
        if (!signUpData?.user) throw new Error('Failed to create user account')
        
        // 3. Insert profile using the MAIN client (which is still authenticated as the manager, passing RLS)
        const profilePromise = supabase.from('users').insert({
          id: signUpData.user.id, name: formData.name, phone: formData.phone,
          role: formData.role, route_id: formData.route_id || null
        })
        const { error: profileErr } = await Promise.race([profilePromise, timeoutPromise])
        if (profileErr) throw profileErr
        
        setSuccessMsg(`${formData.name} added successfully!`)
        setTimeout(() => { setModalOpen(false); loadData() }, 1500)
      }
    } catch (err) {
      console.error('Save error:', err)
      setError(err.message || 'Operation failed. Please try again.')
    } finally { 
      setSaving(false) 
    }
  }

  async function assignRoute(userId, routeId) {
    try {
      const { error: e2 } = await supabase.from('users').update({ route_id: routeId || null }).eq('id', userId)
      if (e2) throw e2
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, route_id: routeId || null } : u))
    } catch (err) { alert('Error assigning route: ' + err.message) }
  }

  async function handleDelete(u) {
    if (u.id === currentUser?.id) { alert('Cannot delete your own account!'); return }
    if (!confirm(`Remove user "${u.name}"? They will lose access.`)) return
    try {
      const { error: e2 } = await supabase.from('users').delete().eq('id', u.id)
      if (e2) throw e2
      loadData()
    } catch (err) { alert('Delete error: ' + err.message) }
  }

  const salesmen = users.filter(u => u.role === 'salesman')
  const managers = users.filter(u => u.role === 'manager')

  return (
    <div className="page-container md:pb-6">
      <div className="flex items-center justify-between mb-6 animate-fade-in-up">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Manage Users</h1>
          <p className="text-sm text-gray-500">{salesmen.length} salesmen • {managers.length} managers</p>
        </div>
        <button onClick={openAdd} className="px-4 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-semibold shadow-md shadow-brand-600/25 hover:bg-brand-700 active:scale-95 transition-all">+ Add Salesman</button>
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><div className="w-8 h-8 border-brand-200 border-t-brand-600 rounded-full animate-spin" style={{borderWidth:'3px'}}></div></div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-fade-in-up">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-6 py-4 font-semibold">User Details</th>
                  <th className="text-left px-6 py-4 font-semibold">Phone</th>
                  <th className="text-center px-6 py-4 font-semibold">Role</th>
                  <th className="text-left px-6 py-4 font-semibold">Assigned Route</th>
                  <th className="text-center px-6 py-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-gray-800">{u.name}</p>
                      <p className="text-xs text-gray-400 font-mono mt-0.5">{u.id.substring(0,8)}...</p>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{u.phone || 'N/A'}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${u.role === 'manager' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{u.role.toUpperCase()}</span>
                    </td>
                    <td className="px-6 py-4">
                      {u.role === 'manager' ? (
                        <span className="text-gray-400 italic text-xs">Unrestricted</span>
                      ) : (
                        <select value={u.route_id || ''} onChange={(e) => assignRoute(u.id, e.target.value)}
                          className="p-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 max-w-[160px]">
                          <option value="">-- Unassigned --</option>
                          {routes.map(r => (<option key={r.id} value={r.id}>{r.name}</option>))}
                        </select>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button onClick={() => openEdit(u)} className="text-gray-400 hover:text-brand-600 transition-colors mr-2" title="Edit">✏️</button>
                      {u.id !== currentUser?.id && (
                        <button onClick={() => handleDelete(u)} className="text-gray-400 hover:text-red-500 transition-colors" title="Delete">🗑️</button>
                      )}
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr><td colSpan="5" className="py-10"><EmptyState title="No users found" /></td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3 stagger-children">
            {users.map(u => (
              <div key={u.id} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm animate-fade-in-up">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-gray-800">{u.name}</p>
                    <p className="text-xs text-gray-500">{u.phone || 'No phone'}</p>
                  </div>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${u.role === 'manager' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{u.role.toUpperCase()}</span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  {u.role === 'salesman' ? (
                    <select value={u.route_id || ''} onChange={(e) => assignRoute(u.id, e.target.value)}
                      className="p-1.5 border border-gray-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 flex-1 mr-2">
                      <option value="">-- Unassigned --</option>
                      {routes.map(r => (<option key={r.id} value={r.id}>{r.name}</option>))}
                    </select>
                  ) : (
                    <span className="text-gray-400 italic text-xs">Unrestricted access</span>
                  )}
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(u)} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500">✏️</button>
                    {u.id !== currentUser?.id && (
                      <button onClick={() => handleDelete(u)} className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center text-gray-500">🗑️</button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {users.length === 0 && <EmptyState title="No users found" icon="👥" />}
          </div>
        </>
      )}

      {/* Add/Edit User Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editUser ? 'Edit User' : 'Add New Salesman'} size="md">
        <form onSubmit={handleSave} className="space-y-4">
          {!editUser && (
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs font-medium mb-2">
              <strong>⚠️ Important:</strong> If you receive emails from Supabase instead of instant login, you must disable <strong>"Confirm email"</strong> in your Supabase Dashboard ➔ Authentication ➔ Providers ➔ Email.
            </div>
          )}
          {error && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-medium">{error}</div>}
          {successMsg && <div className="p-3 rounded-xl bg-green-50 border border-green-200 text-green-600 text-sm font-medium">{successMsg}</div>}
          <div>
            <label className="input-label">Full Name</label>
            <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="input-field" placeholder="e.g. Sunil Deshmukh" required />
          </div>
          {!editUser && (
            <>
              <div>
                <label className="input-label">Email Address</label>
                <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="input-field" placeholder="salesman@example.com" required />
              </div>
              <div>
                <label className="input-label">Password</label>
                <input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="input-field" placeholder="Min 6 characters" required minLength={6} />
              </div>
            </>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="input-label">Phone</label>
              <input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="input-field" placeholder="9876543210" />
            </div>
            <div>
              <label className="input-label">Role</label>
              <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="input-field">
                <option value="salesman">Salesman</option>
                <option value="manager">Manager</option>
              </select>
            </div>
          </div>
          <div>
            <label className="input-label">Assign Route</label>
            <select value={formData.route_id} onChange={e => setFormData({...formData, route_id: e.target.value})} className="input-field">
              <option value="">-- No Route --</option>
              {routes.map(r => (<option key={r.id} value={r.id}>{r.name}</option>))}
            </select>
          </div>
          <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : (editUser ? 'Update User' : 'Add Salesman')}</button>
        </form>
      </Modal>
    </div>
  )
}
