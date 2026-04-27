import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { DEMO_MODE, DEMO_STORES, DEMO_ROUTES } from '../lib/demoData'
import { supabase } from '../lib/supabase'

export default function AddStore() {
  const { profile } = useAuth()
  const [routes, setRoutes] = useState([])
  const [stores, setStores] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [formData, setFormData] = useState({
    route_id: '', name: '', contact_person: '', phone: '', village: '',
  })

  useEffect(() => { loadData() }, [])

  async function loadData() {
    if (DEMO_MODE) {
      setRoutes(DEMO_ROUTES)
      setStores(DEMO_STORES)
    } else {
      const [routeRes, storeRes] = await Promise.all([
        supabase.from('routes').select('*').order('name'),
        supabase.from('stores').select('*, routes(name)').order('name'),
      ])
      setRoutes(routeRes.data || [])
      setStores(storeRes.data || [])
    }
  }

  const filteredStores = stores.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.village?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.contact_person?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      const saveData = {
        route_id: formData.route_id || null,
        name: formData.name,
        contact_person: formData.contact_person || null,
        phone: formData.phone || null,
        village: formData.village || null,
        dealer_category: 'B',
        credit_limit: 0,
      }

      if (DEMO_MODE) {
        DEMO_STORES.push({ id: `store-${Date.now()}`, ...saveData, created_at: new Date().toISOString() })
      } else {
        const { error: e2 } = await supabase.from('stores').insert(saveData)
        if (e2) throw e2
      }

      setSuccess(true)
      setShowForm(false)
      setFormData({ route_id: '', name: '', contact_person: '', phone: '', village: '' })
      loadData()
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err.message || 'Failed to add store')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page-container">
      <div className="mb-5 animate-fade-in-up">
        <h1 className="text-xl font-bold text-gray-800">कृषी केंद्र / Krishi Kendras</h1>
        <p className="text-sm text-gray-500 mt-1">{stores.length} stores registered</p>
      </div>

      {/* Success */}
      {success && (
        <div className="mb-4 p-4 rounded-xl bg-green-50 border border-green-200 text-green-700 text-center animate-fade-in-up">
          <span className="text-2xl block mb-1">🏪✅</span>
          <p className="font-semibold">Krishi Kendra Added!</p>
          <p className="text-xs text-green-500">कृषी केंद्र सफलतापूर्वक जोड़ा गया</p>
        </div>
      )}

      {/* Add button */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full mb-5 p-4 rounded-xl border-2 border-dashed border-brand-300 bg-brand-50 
            text-brand-700 font-semibold text-sm flex items-center justify-center gap-2
            hover:bg-brand-100 active:scale-[0.98] transition-all duration-150 animate-fade-in-up"
        >
          <span className="text-xl">+</span>
          Add New Krishi Kendra / नवीन कृषी केंद्र जोडा
        </button>
      )}

      {/* Add Form */}
      {showForm && (
        <div className="mb-5 bg-white rounded-2xl border border-gray-200 p-5 shadow-sm animate-fade-in-up">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-800">New Krishi Kendra</h2>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
          </div>

          {error && (
            <div className="mb-3 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="input-label">Store Name / कृषी केंद्राचे नाव *</label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                placeholder="e.g., Shri Ganesh Krishi Kendra"
                className="input-field"
                required
              />
            </div>

            <div>
              <label className="input-label">Route / रूट</label>
              <select
                value={formData.route_id}
                onChange={e => setFormData({...formData, route_id: e.target.value})}
                className="input-field"
              >
                <option value="">-- Select Route --</option>
                {routes.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="input-label">Owner / मालक</label>
                <input
                  type="text"
                  value={formData.contact_person}
                  onChange={e => setFormData({...formData, contact_person: e.target.value})}
                  placeholder="e.g., Ramesh Patil"
                  className="input-field"
                />
              </div>
              <div>
                <label className="input-label">Phone / फोन</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                  placeholder="e.g., 9876543210"
                  className="input-field"
                />
              </div>
            </div>

            <div>
              <label className="input-label">Village / गाव</label>
              <input
                type="text"
                value={formData.village}
                onChange={e => setFormData({...formData, village: e.target.value})}
                placeholder="e.g., Gondia, Tirora"
                className="input-field"
              />
            </div>

            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={saving} className="btn-primary flex-1">
                {saving ? 'Saving...' : '🏪 Add Krishi Kendra'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-all">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Store List */}
      <div className="animate-fade-in-up" style={{ animationDelay: '100ms' }}>
        <div className="mb-3">
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="🔍 Search stores..."
            className="input-field text-sm"
          />
        </div>

        {filteredStores.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-2xl border border-gray-100">
            <span className="text-4xl mb-3 block">🏪</span>
            <p className="text-sm text-gray-500">No stores found</p>
            <p className="text-xs text-gray-400">कोई कृषी केंद्र नहीं मिला</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredStores.map(store => (
              <div key={store.id} className="bg-white rounded-xl p-3.5 border border-gray-100 shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800 text-sm">🏪 {store.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {store.village && `📍 ${store.village}`}
                      {store.contact_person && ` • 👤 ${store.contact_person}`}
                      {store.phone && ` • 📞 ${store.phone}`}
                    </p>
                  </div>
                  {store.dealer_category && (
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      store.dealer_category === 'A' ? 'bg-green-100 text-green-700' : 
                      store.dealer_category === 'B' ? 'bg-blue-100 text-blue-700' : 
                      'bg-gray-100 text-gray-600'
                    }`}>{store.dealer_category}</span>
                  )}
                </div>
                {DEMO_MODE ? null : store.routes?.name && (
                  <span className="badge-blue text-[10px] mt-1.5 inline-block">{store.routes.name}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
