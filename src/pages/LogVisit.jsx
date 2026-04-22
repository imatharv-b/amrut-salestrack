import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { DEMO_MODE, DEMO_ROUTES, DEMO_STORES, DEMO_VISITS, getStoreName } from '../lib/demoData'
import { supabase } from '../lib/supabase'
import { queueOfflineVisit } from '../lib/syncVisits'

export default function LogVisit() {
  const { profile } = useAuth()
  const [routes, setRoutes] = useState([])
  const [stores, setStores] = useState([])
  const [selectedRoute, setSelectedRoute] = useState('')
  const [selectedStore, setSelectedStore] = useState('')
  const [remarks, setRemarks] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [offlineSaved, setOfflineSaved] = useState(false)
  const [gps, setGps] = useState(null)
  const [gpsLoading, setGpsLoading] = useState(true)

  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    loadRoutes()
    captureGPS()
  }, [])

  useEffect(() => {
    if (selectedRoute) {
      loadStores(selectedRoute)
    }
  }, [selectedRoute])

  function captureGPS() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude })
          setGpsLoading(false)
        },
        (err) => {
          console.warn('GPS error:', err)
          setGpsLoading(false)
        },
        { enableHighAccuracy: true, timeout: 10000 }
      )
    } else {
      setGpsLoading(false)
    }
  }

  async function loadRoutes() {
    if (DEMO_MODE) {
      setRoutes(DEMO_ROUTES)
    } else {
      const { data } = await supabase.from('routes').select('*').order('name')
      setRoutes(data || [])
    }
  }

  async function loadStores(routeId) {
    if (DEMO_MODE) {
      setStores(DEMO_STORES.filter(s => s.route_id === routeId))
    } else {
      const { data } = await supabase
        .from('stores')
        .select('*')
        .eq('route_id', routeId)
        .eq('is_active', true)
        .order('name')
      setStores(data || [])
    }
    setSelectedStore('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!selectedStore) return
    setLoading(true)

    try {
      const visitPayload = {
        store_id: selectedStore,
        salesman_id: profile?.id || 'demo-salesman-1',
        visit_date: today,
        remarks,
        lat: gps?.lat,
        lng: gps?.lng,
      }

      if (!navigator.onLine) {
        // You are offline, push to LocalStorage Queue
        queueOfflineVisit(visitPayload)
        setOfflineSaved(true)
      } else {
        // Online, process directly
        if (DEMO_MODE) {
          DEMO_VISITS.push({
            id: `visit-${Date.now()}`,
            ...visitPayload,
            created_at: new Date().toISOString(),
          })
        } else {
          const { error } = await supabase.from('visits').insert(visitPayload)
          if (error) throw error
        }
        setSuccess(true)
      }

      setRemarks('')
      setSelectedStore('')
      
      setTimeout(() => {
        setSuccess(false)
        setOfflineSaved(false)
      }, 4000)
    } catch (err) {
      alert('Error saving visit: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const selectedStoreName = stores.find(s => s.id === selectedStore)?.name

  return (
    <div className="page-container">
      {/* Page header */}
      <div className="mb-6 animate-fade-in-up">
        <h1 className="text-xl font-bold text-gray-800">Log Visit / विजिट दर्ज करें</h1>
        <p className="text-sm text-gray-500 mt-1">
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
        </p>
      </div>

      {/* GPS Status */}
      <div className={`mb-4 p-3 rounded-xl flex items-center gap-2 text-sm animate-fade-in-up ${
        gpsLoading ? 'bg-gray-100 text-gray-500' : 
        gps ? 'bg-green-50 text-green-600 border border-green-200' : 
        'bg-amber-50 text-amber-600 border border-amber-200'
      }`}>
        {gpsLoading ? (
          <>
            <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            Getting location...
          </>
        ) : gps ? (
          <>
            <span>📍</span>
            GPS captured ({gps.lat.toFixed(4)}, {gps.lng.toFixed(4)})
          </>
        ) : (
          <>
            <span>⚠️</span>
            GPS not available. Visit will be saved without location.
          </>
        )}
      </div>

      {/* Success message */}
      {success && (
        <div className="mb-4 p-4 rounded-xl bg-green-50 border border-green-200 text-green-700 text-center animate-fade-in-up">
          <span className="text-2xl block mb-1">✅</span>
          <p className="font-semibold">Visit Recorded!</p>
          <p className="text-xs text-green-500">विजिट सफलतापूर्वक दर्ज हो गई</p>
        </div>
      )}

      {/* Offline Success message */}
      {offlineSaved && (
        <div className="mb-4 p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-center animate-fade-in-up">
          <span className="text-2xl block mb-1">📶</span>
          <p className="font-semibold">Saved Offline</p>
          <p className="text-xs text-blue-500">Visit recorded locally. Will sync when internet returns.</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
        {/* Route selection */}
        <div>
          <label className="input-label">Select Route / रूट चुनें</label>
          <select
            value={selectedRoute}
            onChange={(e) => setSelectedRoute(e.target.value)}
            className="input-field"
            required
          >
            <option value="">-- Choose Route --</option>
            {routes.map(route => (
              <option key={route.id} value={route.id}>{route.name}</option>
            ))}
          </select>
        </div>

        {/* Store selection */}
        {selectedRoute && (
          <div className="animate-fade-in-up">
            <label className="input-label">Select Store / दुकान चुनें</label>
            {stores.length === 0 ? (
              <p className="text-sm text-gray-400 py-3">No stores on this route</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {stores.map(store => (
                  <label 
                    key={store.id}
                    className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all duration-150
                      ${selectedStore === store.id 
                        ? 'border-brand-500 bg-brand-50 shadow-sm' 
                        : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                  >
                    <input
                      type="radio"
                      name="store"
                      value={store.id}
                      checked={selectedStore === store.id}
                      onChange={(e) => setSelectedStore(e.target.value)}
                      className="sr-only"
                    />
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0
                      ${selectedStore === store.id ? 'border-brand-600 bg-brand-600' : 'border-gray-300'}`}>
                      {selectedStore === store.id && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{store.name}</p>
                      <p className="text-xs text-gray-500">{store.village}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Remarks */}
        {selectedStore && (
          <div className="animate-fade-in-up">
            <label className="input-label">Remarks / टिप्पणी</label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Enter visit notes..."
              className="input-field min-h-[100px] resize-none"
              rows={3}
            />
          </div>
        )}

        {/* Submit */}
        {selectedStore && (
          <div className="animate-fade-in-up pt-2">
            <button 
              type="submit" 
              disabled={loading}
              className="btn-primary text-xl py-5"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </span>
              ) : (
                <>Visit Done ✓</>
              )}
            </button>
          </div>
        )}
      </form>
    </div>
  )
}
