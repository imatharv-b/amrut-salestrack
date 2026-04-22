import { useState, useEffect } from 'react'
import Modal from '../components/Modal'
import EmptyState from '../components/EmptyState'
import { DEMO_MODE, DEMO_ROUTES, DEMO_STORES } from '../lib/demoData'
import { supabase } from '../lib/supabase'

export default function ManageRoutes() {
  const [routes, setRoutes] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editRoute, setEditRoute] = useState(null)
  const [formData, setFormData] = useState({ name: '', description: '' })

  useEffect(() => { loadRoutes() }, [])

  async function loadRoutes() {
    if (DEMO_MODE) {
      setRoutes(DEMO_ROUTES.map(r => ({
        ...r,
        store_count: DEMO_STORES.filter(s => s.route_id === r.id).length,
      })))
    } else {
      const { data } = await supabase.from('routes').select('*, stores(count)').order('name')
      setRoutes((data || []).map(r => ({ ...r, store_count: r.stores?.[0]?.count || 0 })))
    }
    setLoading(false)
  }

  function openAdd() {
    setEditRoute(null)
    setFormData({ name: '', description: '' })
    setModalOpen(true)
  }

  function openEdit(route) {
    setEditRoute(route)
    setFormData({ name: route.name, description: route.description || '' })
    setModalOpen(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    if (DEMO_MODE) {
      if (editRoute) {
        const idx = DEMO_ROUTES.findIndex(r => r.id === editRoute.id)
        if (idx !== -1) { DEMO_ROUTES[idx] = { ...DEMO_ROUTES[idx], ...formData } }
      } else {
        DEMO_ROUTES.push({ id: `route-${Date.now()}`, ...formData, created_at: new Date().toISOString() })
      }
    } else {
      if (editRoute) {
        await supabase.from('routes').update(formData).eq('id', editRoute.id)
      } else {
        await supabase.from('routes').insert(formData)
      }
    }
    setModalOpen(false)
    loadRoutes()
  }

  async function handleDelete(route) {
    if (!confirm(`Delete route "${route.name}"? This cannot be undone.`)) return
    if (DEMO_MODE) {
      const idx = DEMO_ROUTES.findIndex(r => r.id === route.id)
      if (idx !== -1) DEMO_ROUTES.splice(idx, 1)
    } else {
      await supabase.from('routes').delete().eq('id', route.id)
    }
    loadRoutes()
  }

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-6 animate-fade-in-up">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Manage Routes</h1>
          <p className="text-sm text-gray-500">{routes.length} routes configured</p>
        </div>
        <button onClick={openAdd} className="px-4 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-semibold 
          shadow-md shadow-brand-600/25 hover:bg-brand-700 active:scale-95 transition-all">
          + Add Route
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="w-8 h-8 border-3 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto" style={{ borderWidth: '3px' }} />
        </div>
      ) : routes.length === 0 ? (
        <EmptyState icon="🗺️" title="No routes yet" description="Add your first sales route to get started" />
      ) : (
        <div className="space-y-3 stagger-children">
          {routes.map(route => (
            <div key={route.id} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex items-center justify-between animate-fade-in-up">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                  <span className="text-lg">🗺️</span>
                </div>
                <div>
                  <p className="font-semibold text-gray-800">{route.name}</p>
                  <p className="text-xs text-gray-500">
                    {route.store_count} stores • {route.description || 'No description'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => openEdit(route)}
                  className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 transition-colors">
                  ✏️
                </button>
                <button onClick={() => handleDelete(route)}
                  className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center text-gray-500 transition-colors">
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editRoute ? 'Edit Route' : 'Add New Route'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="input-label">Route Name</label>
            <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
              className="input-field" placeholder="e.g., AJIT" required />
          </div>
          <div>
            <label className="input-label">Description (optional)</label>
            <input type="text" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}
              className="input-field" placeholder="Brief description" />
          </div>
          <button type="submit" className="btn-primary">
            {editRoute ? 'Update Route' : 'Add Route'}
          </button>
        </form>
      </Modal>
    </div>
  )
}
