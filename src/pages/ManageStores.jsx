import { useState, useEffect } from 'react'
import Modal from '../components/Modal'
import EmptyState from '../components/EmptyState'
import { DEMO_MODE, DEMO_STORES, DEMO_ROUTES, getRouteName, getStoreOutstanding } from '../lib/demoData'
import { supabase } from '../lib/supabase'

export default function ManageStores() {
  const [stores, setStores] = useState([])
  const [routes, setRoutes] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editStore, setEditStore] = useState(null)
  const [filterRoute, setFilterRoute] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    route_id: '', name: '', contact_person: '', phone: '', village: '',
    gps_lat: '', gps_lng: '', credit_limit: 0, dealer_category: 'B',
  })

  useEffect(() => { loadData() }, [])

  async function loadData() {
    if (DEMO_MODE) {
      setStores(DEMO_STORES); setRoutes(DEMO_ROUTES)
    } else {
      try {
        const [storeRes, routeRes] = await Promise.all([
          supabase.from('stores').select('*').order('name'),
          supabase.from('routes').select('*').order('name'),
        ])
        setStores(storeRes.data || []); setRoutes(routeRes.data || [])
      } catch (err) { console.error('Load error:', err) }
    }
    setLoading(false)
  }

  function getRouteNameById(routeId) {
    if (DEMO_MODE) return getRouteName(routeId)
    return routes.find(r => r.id === routeId)?.name || '—'
  }

  const filtered = stores.filter(s => {
    const matchRoute = !filterRoute || s.route_id === filterRoute
    const matchSearch = !searchTerm || 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.village?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.contact_person?.toLowerCase().includes(searchTerm.toLowerCase())
    return matchRoute && matchSearch
  })

  function openAdd() {
    setEditStore(null); setError('')
    setFormData({ route_id: '', name: '', contact_person: '', phone: '', village: '', gps_lat: '', gps_lng: '', credit_limit: 0, dealer_category: 'B' })
    setModalOpen(true)
  }

  function openEdit(store) {
    setEditStore(store); setError('')
    setFormData({
      route_id: store.route_id, name: store.name, contact_person: store.contact_person || '',
      phone: store.phone || '', village: store.village || '',
      gps_lat: store.gps_lat || '', gps_lng: store.gps_lng || '',
      credit_limit: store.credit_limit || 0, dealer_category: store.dealer_category || 'B',
    })
    setModalOpen(true)
  }

  async function handleSave(e) {
    e.preventDefault(); setSaving(true); setError('')
    const saveData = {
      route_id: formData.route_id || null, name: formData.name,
      contact_person: formData.contact_person || null, phone: formData.phone || null,
      village: formData.village || null,
      gps_lat: formData.gps_lat ? Number(formData.gps_lat) : null,
      gps_lng: formData.gps_lng ? Number(formData.gps_lng) : null,
      credit_limit: Number(formData.credit_limit) || 0,
      dealer_category: formData.dealer_category || 'B',
    }
    try {
      if (DEMO_MODE) {
        if (editStore) {
          const idx = DEMO_STORES.findIndex(s => s.id === editStore.id)
          if (idx !== -1) DEMO_STORES[idx] = { ...DEMO_STORES[idx], ...saveData }
        } else {
          DEMO_STORES.push({ id: `store-${Date.now()}`, ...saveData, created_at: new Date().toISOString() })
        }
      } else {
        if (editStore) {
          const { error: e2 } = await supabase.from('stores').update(saveData).eq('id', editStore.id)
          if (e2) throw e2
        } else {
          const { error: e2 } = await supabase.from('stores').insert(saveData)
          if (e2) throw e2
        }
      }
      setModalOpen(false); loadData()
    } catch (err) {
      setError(err.message || 'Failed to save store.')
    } finally { setSaving(false) }
  }

  async function handleDelete(store) {
    if (!confirm(`Delete "${store.name}"?`)) return
    try {
      if (DEMO_MODE) { DEMO_STORES.splice(DEMO_STORES.findIndex(s => s.id === store.id), 1) }
      else { const { error: e2 } = await supabase.from('stores').delete().eq('id', store.id); if (e2) throw e2 }
      loadData()
    } catch (err) { alert('Delete error: ' + err.message) }
  }

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-4 animate-fade-in-up">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Manage Stores</h1>
          <p className="text-sm text-gray-500">{stores.length} dealers/Krishi Kendras</p>
        </div>
        <button onClick={openAdd} className="px-4 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-semibold shadow-md shadow-brand-600/25 hover:bg-brand-700 active:scale-95 transition-all">+ Add Store</button>
      </div>
      <div className="flex flex-col md:flex-row gap-2 mb-5 animate-fade-in-up" style={{ animationDelay: '50ms' }}>
        <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="🔍 Search stores, villages, owners..." className="input-field flex-1 text-sm" />
        <select value={filterRoute} onChange={e => setFilterRoute(e.target.value)} className="input-field md:w-48 text-sm">
          <option value="">All Routes</option>
          {routes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-8"><div className="w-8 h-8 border-3 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto" style={{ borderWidth: '3px' }} /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon="🏪" title="No stores found" description="Add your first dealer/Krishi Kendra" />
      ) : (
        <>
          <div className="hidden md:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-fade-in-up">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Store Name</th>
                  <th className="text-left px-4 py-3 font-semibold">Contact Person</th>
                  <th className="text-left px-4 py-3 font-semibold">Village</th>
                  <th className="text-left px-4 py-3 font-semibold">Route</th>
                  <th className="text-center px-4 py-3 font-semibold">Category</th>
                  <th className="text-right px-4 py-3 font-semibold">Credit Limit</th>
                  <th className="text-center px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(store => (
                  <tr key={store.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800">{store.name}</td>
                    <td className="px-4 py-3 text-gray-600">{store.contact_person || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{store.village || '—'}</td>
                    <td className="px-4 py-3"><span className="badge-blue">{getRouteNameById(store.route_id)}</span></td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${store.dealer_category === 'A' ? 'bg-green-100 text-green-700' : store.dealer_category === 'B' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>{store.dealer_category || '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-gray-700">₹{Number(store.credit_limit || 0).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => openEdit(store)} className="text-gray-400 hover:text-brand-600 transition-colors mr-2">✏️</button>
                      <button onClick={() => handleDelete(store)} className="text-gray-400 hover:text-red-500 transition-colors">🗑️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="md:hidden space-y-3 stagger-children">
            {filtered.map(store => (
              <div key={store.id} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm animate-fade-in-up" onClick={() => openEdit(store)}>
                <div className="flex items-start justify-between mb-1">
                  <div>
                    <p className="font-semibold text-gray-800">{store.name}</p>
                    <p className="text-xs text-gray-500">{store.contact_person || '—'} • {store.village || '—'}</p>
                  </div>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${store.dealer_category === 'A' ? 'bg-green-100 text-green-700' : store.dealer_category === 'B' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>{store.dealer_category || '—'}</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="badge-blue text-[10px]">{getRouteNameById(store.route_id)}</span>
                  <span className="text-xs text-gray-500">₹{Number(store.credit_limit || 0).toLocaleString('en-IN')}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editStore ? 'Edit Store' : 'Add New Krishi Kendra / Store'} size="md">
        <form onSubmit={handleSave} className="space-y-4">
          {error && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-medium">{error}</div>}
          <div>
            <label className="input-label">Route</label>
            <select value={formData.route_id} onChange={e => setFormData({...formData, route_id: e.target.value})} className="input-field" required>
              <option value="">Select Route</option>
              {routes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div>
            <label className="input-label">Store / Krishi Kendra Name</label>
            <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="input-field" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="input-label">Contact Person</label>
              <input type="text" value={formData.contact_person} onChange={e => setFormData({...formData, contact_person: e.target.value})} className="input-field" />
            </div>
            <div>
              <label className="input-label">Phone</label>
              <input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="input-field" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="input-label">Village / Town</label>
              <input type="text" value={formData.village} onChange={e => setFormData({...formData, village: e.target.value})} className="input-field" />
            </div>
            <div>
              <label className="input-label">Dealer Category</label>
              <select value={formData.dealer_category} onChange={e => setFormData({...formData, dealer_category: e.target.value})} className="input-field">
                <option value="A">A — Premium</option>
                <option value="B">B — Regular</option>
                <option value="C">C — Small</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="input-label">Latitude</label>
              <input type="number" step="any" value={formData.gps_lat} onChange={e => setFormData({...formData, gps_lat: e.target.value})} className="input-field" placeholder="21.4552" />
            </div>
            <div>
              <label className="input-label">Longitude</label>
              <input type="number" step="any" value={formData.gps_lng} onChange={e => setFormData({...formData, gps_lng: e.target.value})} className="input-field" placeholder="80.1982" />
            </div>
          </div>
          <div>
            <label className="input-label">Credit Limit (₹)</label>
            <input type="number" value={formData.credit_limit} onChange={e => setFormData({...formData, credit_limit: e.target.value})} className="input-field" />
          </div>
          <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : (editStore ? 'Update Store' : 'Add Store')}</button>
        </form>
      </Modal>
    </div>
  )
}
