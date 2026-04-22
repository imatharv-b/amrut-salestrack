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
  const [formData, setFormData] = useState({
    route_id: '', name: '', owner_name: '', phone: '', village: '', district: 'Gondia',
    lat: '', lng: '', opening_balance: 0,
  })

  useEffect(() => { loadData() }, [])

  async function loadData() {
    if (DEMO_MODE) {
      setStores(DEMO_STORES)
      setRoutes(DEMO_ROUTES)
    } else {
      const [storeRes, routeRes] = await Promise.all([
        supabase.from('stores').select('*').order('name'),
        supabase.from('routes').select('*').order('name'),
      ])
      setStores(storeRes.data || [])
      setRoutes(routeRes.data || [])
    }
    setLoading(false)
  }

  const filtered = stores.filter(s => {
    const matchRoute = !filterRoute || s.route_id === filterRoute
    const matchSearch = !searchTerm || 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.village?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.owner_name?.toLowerCase().includes(searchTerm.toLowerCase())
    return matchRoute && matchSearch
  })

  function openAdd() {
    setEditStore(null)
    setFormData({ route_id: '', name: '', owner_name: '', phone: '', village: '', district: 'Gondia', lat: '', lng: '', opening_balance: 0 })
    setModalOpen(true)
  }

  function openEdit(store) {
    setEditStore(store)
    setFormData({
      route_id: store.route_id, name: store.name, owner_name: store.owner_name || '',
      phone: store.phone || '', village: store.village || '', district: store.district || 'Gondia',
      lat: store.lat || '', lng: store.lng || '', opening_balance: store.opening_balance || 0,
    })
    setModalOpen(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    const saveData = { ...formData, lat: formData.lat ? Number(formData.lat) : null, lng: formData.lng ? Number(formData.lng) : null, opening_balance: Number(formData.opening_balance) || 0 }

    if (DEMO_MODE) {
      if (editStore) {
        const idx = DEMO_STORES.findIndex(s => s.id === editStore.id)
        if (idx !== -1) DEMO_STORES[idx] = { ...DEMO_STORES[idx], ...saveData }
      } else {
        DEMO_STORES.push({ id: `store-${Date.now()}`, ...saveData, is_active: true, created_at: new Date().toISOString() })
      }
    } else {
      if (editStore) {
        await supabase.from('stores').update(saveData).eq('id', editStore.id)
      } else {
        await supabase.from('stores').insert({ ...saveData, is_active: true })
      }
    }
    setModalOpen(false)
    loadData()
  }

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-4 animate-fade-in-up">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Manage Stores</h1>
          <p className="text-sm text-gray-500">{stores.length} dealers/Krishi Kendras</p>
        </div>
        <button onClick={openAdd} className="px-4 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-semibold shadow-md shadow-brand-600/25 hover:bg-brand-700 active:scale-95 transition-all">
          + Add Store
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-2 mb-5 animate-fade-in-up" style={{ animationDelay: '50ms' }}>
        <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
          placeholder="🔍 Search stores, villages, owners..." className="input-field flex-1 text-sm" />
        <select value={filterRoute} onChange={e => setFilterRoute(e.target.value)} className="input-field md:w-48 text-sm">
          <option value="">All Routes</option>
          {routes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      </div>

      {/* Store Table (desktop) / Cards (mobile) */}
      {loading ? (
        <div className="text-center py-8">
          <div className="w-8 h-8 border-3 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto" style={{ borderWidth: '3px' }} />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon="🏪" title="No stores found" description="Add your first dealer/Krishi Kendra" />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-fade-in-up">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Store Name</th>
                  <th className="text-left px-4 py-3 font-semibold">Owner</th>
                  <th className="text-left px-4 py-3 font-semibold">Village</th>
                  <th className="text-left px-4 py-3 font-semibold">Route</th>
                  <th className="text-right px-4 py-3 font-semibold">Outstanding</th>
                  <th className="text-center px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(store => {
                  const outstanding = DEMO_MODE ? getStoreOutstanding(store.id) : 0
                  return (
                    <tr key={store.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-800">{store.name}</td>
                      <td className="px-4 py-3 text-gray-600">{store.owner_name}</td>
                      <td className="px-4 py-3 text-gray-600">{store.village}</td>
                      <td className="px-4 py-3">
                        <span className="badge-blue">{DEMO_MODE ? getRouteName(store.route_id) : store.route_id}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-bold">
                        <span className={outstanding > 10000 ? 'text-red-600' : outstanding > 0 ? 'text-amber-600' : 'text-green-600'}>
                          ₹{outstanding.toLocaleString('en-IN')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => openEdit(store)} className="text-gray-400 hover:text-brand-600 transition-colors mr-2">✏️</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3 stagger-children">
            {filtered.map(store => {
              const outstanding = DEMO_MODE ? getStoreOutstanding(store.id) : 0
              return (
                <div key={store.id} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm animate-fade-in-up"
                  onClick={() => openEdit(store)}>
                  <div className="flex items-start justify-between mb-1">
                    <div>
                      <p className="font-semibold text-gray-800">{store.name}</p>
                      <p className="text-xs text-gray-500">{store.owner_name} • {store.village}</p>
                    </div>
                    <span className={outstanding > 10000 ? 'badge-red' : outstanding > 0 ? 'badge-amber' : 'badge-green'}>
                      ₹{outstanding.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <span className="badge-blue text-[10px] mt-1">{DEMO_MODE ? getRouteName(store.route_id) : ''}</span>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Add/Edit Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editStore ? 'Edit Store' : 'Add New Store'} size="md">
        <form onSubmit={handleSave} className="space-y-4">
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
              <label className="input-label">Owner Name</label>
              <input type="text" value={formData.owner_name} onChange={e => setFormData({...formData, owner_name: e.target.value})} className="input-field" />
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
              <label className="input-label">District</label>
              <input type="text" value={formData.district} onChange={e => setFormData({...formData, district: e.target.value})} className="input-field" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="input-label">Latitude</label>
              <input type="number" step="any" value={formData.lat} onChange={e => setFormData({...formData, lat: e.target.value})} className="input-field" placeholder="21.4552" />
            </div>
            <div>
              <label className="input-label">Longitude</label>
              <input type="number" step="any" value={formData.lng} onChange={e => setFormData({...formData, lng: e.target.value})} className="input-field" placeholder="80.1982" />
            </div>
          </div>
          <div>
            <label className="input-label">Opening Balance (₹)</label>
            <input type="number" value={formData.opening_balance} onChange={e => setFormData({...formData, opening_balance: e.target.value})} className="input-field" />
          </div>
          <button type="submit" className="btn-primary">{editStore ? 'Update Store' : 'Add Store'}</button>
        </form>
      </Modal>
    </div>
  )
}
