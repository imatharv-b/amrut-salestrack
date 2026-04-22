import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import EmptyState from '../components/EmptyState'

export default function ManageUsers() {
  const [users, setUsers] = useState([])
  const [routes, setRoutes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

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
    } finally {
      setLoading(false)
    }
  }

  async function assignRoute(userId, routeId) {
    try {
      // routeId can be null if they select "Unassigned"
      const { error } = await supabase
        .from('users')
        .update({ route_id: routeId || null })
        .eq('id', userId)
        
      if (error) throw error
      
      // Update local state to reflect change instantly
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, route_id: routeId || null } : u))
    } catch (err) {
      alert('Error assigning route: ' + err.message)
    }
  }

  return (
    <div className="page-container md:pb-6">
      <div className="mb-6 animate-fade-in-up">
        <h1 className="text-2xl font-bold text-gray-800">Manage Users</h1>
        <p className="text-sm text-gray-500">Assign salesmen to active sales routes</p>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="w-8 h-8 border-3 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-fade-in-up">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-6 py-4 font-semibold">User Details</th>
                <th className="text-left px-6 py-4 font-semibold">Phone</th>
                <th className="text-center px-6 py-4 font-semibold">Account Role</th>
                <th className="text-right px-6 py-4 font-semibold">Assigned Route</th>
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
                    <span className={`badge ${u.role === 'manager' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                      {u.role.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {u.role === 'manager' ? (
                      <span className="text-gray-400 italic text-xs">Unrestricted</span>
                    ) : (
                      <select 
                        value={u.route_id || ''} 
                        onChange={(e) => assignRoute(u.id, e.target.value)}
                        className="p-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 max-w-[160px]"
                      >
                        <option value="">-- Unassigned --</option>
                        {routes.map(r => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                    )}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan="4" className="py-10"><EmptyState title="No users found" /></td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
