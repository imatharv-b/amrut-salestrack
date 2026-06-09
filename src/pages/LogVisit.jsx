import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { queueOfflineVisit } from '../lib/syncVisits'

export default function LogVisit() {
  const { profile } = useAuth()
  const [stores, setStores] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStore, setSelectedStore] = useState(null)
  const [remarks, setRemarks] = useState('')
  const [stockRemaining, setStockRemaining] = useState('')
  const [followUpDate, setFollowUpDate] = useState('')
  const [followUpNote, setFollowUpNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [offlineSaved, setOfflineSaved] = useState(false)
  const [gps, setGps] = useState(null)
  const [dailyRoutes, setDailyRoutes] = useState([])
  const todayObj = new Date()
  const today = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, '0')}-${String(todayObj.getDate()).padStart(2, '0')}`

  useEffect(() => {
    loadStores()
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => { },
        { enableHighAccuracy: true, timeout: 10000 }
      )
    }
  }, [])

  async function loadStores() {
    try {
      const [storesRes, dailyRes] = await Promise.all([
        supabase.from('stores').select('*, routes(name)').order('name'),
        supabase.from('daily_route_assignments').select('route_id').eq('salesman_id', profile?.id).eq('assigned_date', today)
      ])
      if (storesRes.error) throw storesRes.error
      setStores(storesRes.data || [])
      setDailyRoutes((dailyRes.data || []).map(d => d.route_id))
    } catch (err) { console.error('Failed to load stores:', err) }
  }

  const filteredStores = stores.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.village?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.contact_person?.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => {
    const aAssigned = dailyRoutes.includes(a.route_id)
    const bAssigned = dailyRoutes.includes(b.route_id)
    if (aAssigned && !bAssigned) return -1
    if (!aAssigned && bAssigned) return 1
    return 0
  })

  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!selectedStore || loading) return
    
    setLoading(true)
    setError(null)

    // 1. Create payload
    const visitPayload = {
      store_id: selectedStore.id, salesman_id: profile?.id,
      visited_date: today, remarks,
      stock_remaining: stockRemaining || null,
      follow_up_date: followUpDate || null, follow_up_note: followUpNote || null,
    }

    if (!navigator.onLine) {
      queueOfflineVisit(visitPayload)
      setRemarks(''); setStockRemaining(''); setFollowUpDate(''); setFollowUpNote('')
      setSelectedStore(null); setSearchTerm('')
      setOfflineSaved(true)
      setTimeout(() => setOfflineSaved(false), 4000)
      setLoading(false)
      return
    }

    try {
      const insertPromise = supabase.from('visits').insert(visitPayload)
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Request timed out. Visit saved offline.')), 10000))
      const { error: dbError } = await Promise.race([insertPromise, timeoutPromise])
      if (dbError) throw dbError

      // Only clear form and show success AFTER confirmed DB insert
      setRemarks(''); setStockRemaining(''); setFollowUpDate(''); setFollowUpNote('')
      setSelectedStore(null); setSearchTerm('')
      setSuccess(true)
      setTimeout(() => setSuccess(false), 4000)
    } catch (err) {
      console.error("Visit insert failed:", err)
      if (err.code === '42501' || err.message?.includes('policy')) {
        setError('❌ This store is not on your assigned route. Visit could not be saved. (RLS policy error)')
      } else {
        setError(`❌ Failed to save visit: ${err.message}`)
      }
      // Also queue offline as fallback
      queueOfflineVisit(visitPayload)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-container">
      <div className="mb-5 animate-fade-in-up">
        <h1 className="text-xl font-bold text-gray-800">Log Visit / विजिट दर्ज करें</h1>
        <p className="text-sm text-gray-500 mt-1">
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
          {gps && <span className="text-green-500 ml-2">📍 GPS Active</span>}
        </p>
      </div>
      {success && (<div className="mb-4 p-4 rounded-xl bg-green-50 border border-green-200 text-green-700 text-center animate-fade-in-up"><span className="text-2xl block mb-1">✅</span><p className="font-semibold">Visit Recorded!</p><p className="text-xs text-green-500">विजिट सफलतापूर्वक दर्ज हो गई</p></div>)}
      {offlineSaved && (<div className="mb-4 p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-center animate-fade-in-up"><span className="text-2xl block mb-1">📶</span><p className="font-semibold">Saved Offline</p><p className="text-xs text-blue-500">Visit recorded locally. Will sync when internet returns.</p></div>)}
      {error && (<div className="mb-4 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-center animate-fade-in-up"><p className="font-semibold text-sm">{error}</p><p className="text-xs text-red-500 mt-1">Queued offline as backup. Contact manager if this persists.</p></div>)}
      <form onSubmit={handleSubmit} className="space-y-5">
        {!selectedStore ? (
          <div className="animate-fade-in-up">
            <label className="input-label">Select Krishi Kendra / कृषी केंद्र चुनें</label>
            <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="🔍 Search by name, village, owner..." className="input-field mb-3" />
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {filteredStores.map(store => {
                const isAssignedToday = dailyRoutes.includes(store.route_id)
                return (
                <button key={store.id} type="button" onClick={() => { setSelectedStore(store); setSearchTerm('') }} className={`w-full text-left p-3.5 bg-white rounded-xl border ${isAssignedToday ? 'border-brand-400 bg-brand-50 shadow-sm' : 'border-gray-200'} hover:border-brand-300 hover:bg-brand-50 active:scale-[0.98] transition-all duration-150`}>
                  <div className="flex justify-between items-start">
                    <p className={`font-semibold text-sm ${isAssignedToday ? 'text-brand-800' : 'text-gray-800'}`}>🏪 {store.name}</p>
                    {isAssignedToday && <span className="text-[10px] bg-brand-600 text-white px-2 py-0.5 rounded font-bold uppercase tracking-wider shadow-sm">Today's Task</span>}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {store.village && `📍 ${store.village}`}
                    {store.contact_person && ` • 👤 ${store.contact_person}`}
                    {store.routes?.name && ` • 🛣️ ${store.routes.name}`}
                  </p>
                </button>
                )
              })}
              {filteredStores.length === 0 && (<p className="text-sm text-gray-400 text-center py-4">No stores found / कोई कृषी केंद्र नहीं मिला</p>)}
            </div>
          </div>
        ) : (
          <div className="animate-fade-in-up">
            <label className="input-label">Selected Krishi Kendra</label>
            <div className="p-4 bg-brand-50 rounded-xl border-2 border-brand-200">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-bold text-brand-800">🏪 {selectedStore.name}</p>
                  <p className="text-xs text-brand-600 mt-0.5">
                    {selectedStore.village && `📍 ${selectedStore.village}`}
                    {selectedStore.contact_person && ` • 👤 ${selectedStore.contact_person}`}
                    {selectedStore.phone && ` • 📞 ${selectedStore.phone}`}
                  </p>
                </div>
                <button type="button" onClick={() => setSelectedStore(null)} className="text-xs text-brand-600 font-medium underline">Change</button>
              </div>
            </div>
          </div>
        )}
        {selectedStore && (
          <div className="animate-fade-in-up">
            <label className="input-label">Stock Remaining / शिल्लक माल</label>
            <textarea value={stockRemaining} onChange={(e) => setStockRemaining(e.target.value)} placeholder="e.g., Kesar Shakti 5 bags, Black Gold 10 Bottle, F Guard 3 bottles..." className="input-field min-h-[80px] resize-none" rows={2} />
            <p className="text-[10px] text-gray-400 mt-1">दुकान में बाकी रहिलेला माल लिहा</p>
          </div>
        )}
        {selectedStore && (
          <div className="animate-fade-in-up">
            <label className="input-label">Visit / Payment Follow-up </label>
            <input type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} className="input-field mb-2" min={today} />
            <input type="text" value={followUpNote} onChange={(e) => setFollowUpNote(e.target.value)} placeholder="e.g., Will pay after selling DAP stock..." className="input-field" />
            <p className="text-[10px] text-gray-400 mt-1">दुकानदार ने कब पैसे देने बोला — तारीख और कारण लिखें</p>
          </div>
        )}
        {selectedStore && (
          <div className="animate-fade-in-up">
            <label className="input-label">Remarks / टिप्पणी</label>
            <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Enter visit notes..." className="input-field min-h-[80px] resize-none" rows={2} />
          </div>
        )}
        {selectedStore && (
          <div className="animate-fade-in-up pt-2">
            <button type="submit" disabled={loading} className="btn-primary text-xl py-5 disabled:opacity-60 disabled:cursor-not-allowed">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  Saving...
                </span>
              ) : 'Visit Done ✓'}
            </button>
          </div>
        )}
      </form>
    </div>
  )
}
