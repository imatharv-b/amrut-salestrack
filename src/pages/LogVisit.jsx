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
  const today = new Date().toISOString().split('T')[0]

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
      const { data, error } = await supabase.from('stores').select('*, routes(name)').order('name')
      if (error) throw error
      setStores(data || [])
    } catch (err) { console.error('Failed to load stores:', err) }
  }

  const filteredStores = stores.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.village?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.contact_person?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  async function handleSubmit(e) {
    e.preventDefault()
    if (!selectedStore) return
    setLoading(true)
    try {
      const visitPayload = {
        store_id: selectedStore.id, salesman_id: profile?.id,
        visit_date: today, remarks,
        stock_remaining: stockRemaining || null,
        follow_up_date: followUpDate || null, follow_up_note: followUpNote || null,
        lat: gps?.lat || null, lng: gps?.lng || null,
      }
      if (!navigator.onLine) {
        queueOfflineVisit(visitPayload)
        setOfflineSaved(true)
      } else {
        const { error } = await supabase.from('visits').insert(visitPayload)
        if (error) throw error
        setSuccess(true)
      }
      setRemarks(''); setStockRemaining(''); setFollowUpDate(''); setFollowUpNote(''); setSelectedStore(null); setSearchTerm('')
      setTimeout(() => { setSuccess(false); setOfflineSaved(false) }, 4000)
    } catch (err) { alert('Error saving visit: ' + err.message) }
    finally { setLoading(false) }
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
      <form onSubmit={handleSubmit} className="space-y-5">
        {!selectedStore ? (
          <div className="animate-fade-in-up">
            <label className="input-label">Select Krishi Kendra / कृषी केंद्र चुनें</label>
            <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="🔍 Search by name, village, owner..." className="input-field mb-3" />
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {filteredStores.map(store => (
                <button key={store.id} type="button" onClick={() => { setSelectedStore(store); setSearchTerm('') }} className="w-full text-left p-3.5 bg-white rounded-xl border border-gray-200 hover:border-brand-300 hover:bg-brand-50 active:scale-[0.98] transition-all duration-150">
                  <p className="font-semibold text-sm text-gray-800">🏪 {store.name}</p>
                  <p className="text-xs text-gray-500">
                    {store.village && `📍 ${store.village}`}
                    {store.contact_person && ` • 👤 ${store.contact_person}`}
                    {store.routes?.name && ` • 🛣️ ${store.routes.name}`}
                  </p>
                </button>
              ))}
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
            <button type="submit" disabled={loading} className="btn-primary text-xl py-5">
              {loading ? (<span className="flex items-center justify-center gap-2"><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving...</span>) : (<>Visit Done ✓</>)}
            </button>
          </div>
        )}
      </form>
    </div>
  )
}
