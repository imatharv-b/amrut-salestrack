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
    name: '', email: '', password: '', phone: '', role: 'salesman', route_ids: []
  })

  useEffect(() => { loadData() }, [])

  async function loadData() {
    try {
      const [usersRes, routesRes, userRoutesRes] = await Promise.all([
        supabase.from('users').select('*').order('created_at', { ascending: false }),
        supabase.from('routes').select('*').order('name'),
        supabase.from('user_routes').select('*')
      ])
      
      const allRoutes = routesRes.data || []
      const allUserRoutes = userRoutesRes.data || []
      
      const usersData = (usersRes.data || []).map(u => {
        // Find assigned routes for this user
        const assigned = allUserRoutes.filter(ur => ur.user_id === u.id).map(ur => ur.route_id)
        // Ensure legacy route_id is included if not in user_routes (fallback)
        if (u.route_id && !assigned.includes(u.route_id)) {
          assigned.push(u.route_id)
        }
        return { ...u, assigned_routes: assigned }
      })
      
      setUsers(usersData)
      setRoutes(allRoutes)
    } catch (err) {
      console.error('Error fetching admin data:', err)
    } finally { setLoading(false) }
  }

  function getRouteNames(routeIds) {
    if (!routeIds || routeIds.length === 0) return '—'
    return routeIds.map(id => routes.find(r => r.id === id)?.name).filter(Boolean).join(', ')
  }

  function openAdd() {
    setEditUser(null); setError(''); setSuccessMsg('')
    setFormData({ name: '', email: '', password: '', phone: '', role: 'salesman', route_ids: [] })
    setModalOpen(true)
  }

  function openEdit(u) {
    setEditUser(u); setError(''); setSuccessMsg('')
    setFormData({ name: u.name || '', email: '', password: '', phone: u.phone || '', role: u.role, route_ids: u.assigned_routes || [] })
    setModalOpen(true)
  }

  function toggleRouteSelection(routeId) {
    setFormData(prev => {
      const isSelected = prev.route_ids.includes(routeId)
      if (isSelected) {
        return { ...prev, route_ids: prev.route_ids.filter(id => id !== routeId) }
      } else {
        return { ...prev, route_ids: [...prev.route_ids, routeId] }
      }
    })
  }

  async function handleSave(e) {
    e.preventDefault(); setSaving(true); setError(''); setSuccessMsg('')
    try {
      let targetUserId = editUser?.id
      
      if (editUser) {
        const primaryRouteId = formData.route_ids.length > 0 ? formData.route_ids[0] : null
        const updateData = { name: formData.name, phone: formData.phone, role: formData.role, route_id: primaryRouteId }
        const { error: e2 } = await supabase.from('users').update(updateData).eq('id', editUser.id)
        if (e2) throw e2
      } else {
        if (!formData.email || !formData.password) throw new Error('Email and password are required')
        if (formData.password.length < 6) throw new Error('Password must be at least 6 characters')
        
        // Create user via temp client
        const { createClient } = await import('@supabase/supabase-js')
        const tempSupabase = createClient(
          import.meta.env.VITE_SUPABASE_URL,
          import.meta.env.VITE_SUPABASE_ANON_KEY,
          { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
        )
        
        const { data: signUpData, error: signUpErr } = await tempSupabase.auth.signUp({ 
          email: formData.email, 
          password: formData.password 
        })
        
        if (signUpErr) throw signUpErr
        if (!signUpData?.user) throw new Error('Failed to create user account')
        
        targetUserId = signUpData.user.id
        const primaryRouteId = formData.route_ids.length > 0 ? formData.route_ids[0] : null
        
        // Insert profile
        let profileInserted = false
        let lastError = null
        for (let attempt = 1; attempt <= 3; attempt++) {
          const { error: profileErr } = await supabase.from('users').insert({
            id: targetUserId, name: formData.name, phone: formData.phone,
            role: formData.role, route_id: primaryRouteId
          })
          if (!profileErr || profileErr.code === '23505') { profileInserted = true; break }
          lastError = profileErr
          if (attempt < 3) await new Promise(r => setTimeout(r, 1000))
        }
        
        if (!profileInserted) throw new Error(`Auth account created but profile save failed: ${lastError?.message}`)
      }
      
      // Sync multiple routes
      if (formData.role === 'salesman') {
        // Delete old assignments
        await supabase.from('user_routes').delete().eq('user_id', targetUserId)
        
        // Insert new ones
        if (formData.route_ids.length > 0) {
          const routeInserts = formData.route_ids.map(rid => ({ user_id: targetUserId, route_id: rid }))
          await supabase.from('user_routes').insert(routeInserts)
        }
      }

      setSuccessMsg(editUser ? 'User updated successfully!' : `${formData.name} added successfully!`)
      setTimeout(() => { setModalOpen(false); loadData() }, 1000)
      
    } catch (err) {
      console.error('Save error:', err)
      setError(err.message || 'Operation failed. Please try again.')
    } finally { 
      setSaving(false) 
    }
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
  const viewers = users.filter(u => u.role === 'viewer')

  return (
    <div className="page-container md:pb-6">
      <div className="flex items-center justify-between mb-6 animate-fade-in-up">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Manage Users</h1>
          <p className="text-sm text-gray-500">{salesmen.length} salesmen • {managers.length} managers • {viewers.length} viewers</p>
        </div>
        <button onClick={openAdd} className="px-4 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-semibold shadow-md shadow-brand-600/25 hover:bg-brand-700 active:scale-95 transition-all">+ Add User</button>
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
                  <th className="text-left px-6 py-4 font-semibold">Assigned Routes</th>
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
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${u.role === 'manager' ? 'bg-purple-100 text-purple-700' : (u.role === 'viewer' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700')}`}>{u.role.toUpperCase()}</span>
                    </td>
                    <td className="px-6 py-4">
                      {(u.role === 'manager' || u.role === 'viewer') ? (
                        <span className="text-gray-400 italic text-xs">Unrestricted</span>
                      ) : (
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {u.assigned_routes?.length > 0 ? (
                            u.assigned_routes.map(rid => (
                              <span key={rid} className="px-2 py-1 bg-gray-100 border border-gray-200 rounded text-xs text-gray-600">
                                {routes.find(r => r.id === rid)?.name || 'Unknown Route'}
                              </span>
                            ))
                          ) : (
                            <span className="text-gray-400 text-xs">— Unassigned —</span>
                          )}
                        </div>
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
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${u.role === 'manager' ? 'bg-purple-100 text-purple-700' : (u.role === 'viewer' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700')}`}>{u.role.toUpperCase()}</span>
                </div>
                <div className="flex flex-col gap-2 mt-2">
                  {u.role === 'salesman' ? (
                    <div className="flex flex-wrap gap-1">
                      {u.assigned_routes?.length > 0 ? (
                        u.assigned_routes.map(rid => (
                          <span key={rid} className="px-2 py-0.5 bg-gray-100 border border-gray-200 rounded text-[10px] text-gray-600">
                            {routes.find(r => r.id === rid)?.name || 'Unknown'}
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-400 italic text-[10px]">— Unassigned —</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-gray-400 italic text-xs">Unrestricted access</span>
                  )}
                  <div className="flex gap-1 justify-end mt-1">
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
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editUser ? 'Edit User' : 'Add New User'} size="md">
        <form onSubmit={handleSave} className="space-y-4">
          {!editUser && (
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs font-medium mb-2">
              <strong>⚠️ Important:</strong> Go to Supabase Dashboard → Authentication → Providers → Email and <strong>disable "Confirm email"</strong> so users can login immediately.
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
                <option value="viewer">Viewer (Read Only)</option>
              </select>
            </div>
          </div>
          
          {formData.role === 'salesman' && (
            <div>
              <label className="input-label mb-2">Assign Routes (Multiple)</label>
              <div className="max-h-48 overflow-y-auto bg-gray-50 p-2 rounded-xl border border-gray-200 space-y-1">
                {routes.map(r => (
                  <label key={r.id} className="flex items-center gap-3 p-2 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors">
                    <input 
                      type="checkbox" 
                      checked={formData.route_ids.includes(r.id)}
                      onChange={() => toggleRouteSelection(r.id)}
                      className="w-4 h-4 text-brand-600 rounded border-gray-300 focus:ring-brand-500"
                    />
                    <span className="text-sm font-medium text-gray-700">{r.name}</span>
                  </label>
                ))}
                {routes.length === 0 && <p className="text-xs text-gray-500 p-2">No routes available</p>}
              </div>
            </div>
          )}
          
          <button type="submit" disabled={saving} className="btn-primary mt-6">{saving ? 'Saving...' : (editUser ? 'Update User' : 'Create User')}</button>
        </form>
      </Modal>
    </div>
  )
}
