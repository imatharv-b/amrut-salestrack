import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Custom hook to fit map bounds to markers
function MapBounds({ stores }) {
  const map = useMap()
  
  useEffect(() => {
    if (stores.length === 0) return
    const bounds = L.latLngBounds()
    let hasPoints = false
    
    stores.forEach(store => {
      if (store.gps_lat && store.gps_lng) {
        bounds.extend([store.gps_lat, store.gps_lng])
        hasPoints = true
      }
    })
    
    if (hasPoints) {
      map.fitBounds(bounds, { padding: [50, 50] })
    }
  }, [stores, map])
  
  return null
}

export default function MapView() {
  const [stores, setStores] = useState([])
  const [loading, setLoading] = useState(true)

  const today = new Date().toISOString().split('T')[0]
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]

  useEffect(() => { 
    loadStoresAndVisits() 
  }, [])

  async function loadStoresAndVisits() {
    setLoading(true)
    try {
      const [storesRes, visitsRes, invoicesRes, collectionsRes] = await Promise.all([
        supabase.from('stores').select('*'),
        supabase.from('visits').select('store_id, visited_date, remarks').order('visited_date', { ascending: false }),
        supabase.from('invoices').select('store_id, total_amount'),
        supabase.from('collections').select('store_id, amount'),
      ])
      
      const allStores = (storesRes.data || []).map(s => {
        const storeVisits = (visitsRes.data || []).filter(v => v.store_id === s.id)
        const lastVisit = storeVisits[0] || null
        
        const inv = (invoicesRes.data || []).filter(i => i.store_id === s.id).reduce((sum, i) => sum + Number(i.total_amount || 0), 0)
        const col = (collectionsRes.data || []).filter(c => c.store_id === s.id).reduce((sum, c) => sum + Number(c.amount || 0), 0)
        
        return { 
          ...s, 
          last_visit_date: lastVisit?.visited_date, 
          last_remark: lastVisit?.remarks, 
          outstanding: Math.max(0, inv - col) 
        }
      })
      
      // Only keep stores with valid GPS coordinates
      setStores(allStores.filter(s => s.gps_lat && s.gps_lng))
    } catch (err) { 
      console.error(err) 
    } finally {
      setLoading(false)
    }
  }

  function getPinColor(lastVisitDate) {
    if (!lastVisitDate || lastVisitDate < thirtyDaysAgo) return '#ef4444' // Red
    if (lastVisitDate === today) return '#22c55e' // Green
    if (lastVisitDate >= sevenDaysAgo) return '#eab308' // Yellow
    return '#3b82f6' // Blue
  }

  function createCustomIcon(color) {
    return L.divIcon({
      className: 'custom-leaflet-icon',
      html: `<div style="background-color: ${color}; width: 18px; height: 18px; border-radius: 50%; border: 2.5px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9],
      popupAnchor: [0, -10]
    })
  }

  return (
    <div className="page-container md:pb-6 !p-0 flex flex-col min-h-[calc(100vh-56px)] md:min-h-screen">
      <div className="px-4 py-4 bg-white border-b border-gray-100 flex flex-wrap gap-2 items-center justify-between z-10 relative shadow-sm shrink-0">
        <h1 className="text-xl font-bold text-gray-800">Live Map</h1>
        <div className="flex gap-3 text-xs font-medium">
          <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-green-500 border border-white"></div>Today</span>
          <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-yellow-500 border border-white"></div>This Week</span>
          <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-red-500 border border-white"></div>30+ Days</span>
        </div>
      </div>
      
      <div className="flex-1 relative w-full h-[calc(100vh-120px)] md:h-auto z-0">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-20">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-3 border-brand-200 border-t-brand-600 rounded-full animate-spin" style={{ borderWidth: '3px' }} />
              <p className="text-sm text-gray-500 font-medium">Loading Map Data...</p>
            </div>
          </div>
        ) : stores.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-20">
             <div className="text-center p-6 bg-white rounded-2xl border border-gray-100 shadow-sm">
                <span className="text-4xl mb-3 block">📍</span>
                <p className="font-semibold text-gray-700">No stores with GPS data</p>
                <p className="text-xs text-gray-500 mt-1">Add coordinates to Krishi Kendras to see them on map</p>
             </div>
          </div>
        ) : (
          <MapContainer 
            center={[21.4552, 80.1982]} // Default center (Gondia)
            zoom={10} 
            className="w-full h-full"
            zoomControl={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            />
            
            <MapBounds stores={stores} />

            {stores.map(store => {
              const formattedLastVisit = store.last_visit_date ? new Date(store.last_visit_date).toLocaleDateString('en-IN') : 'Never visited'
              
              return (
                <Marker 
                  key={store.id} 
                  position={[store.gps_lat, store.gps_lng]} 
                  icon={createCustomIcon(getPinColor(store.last_visit_date))}
                >
                  <Popup>
                    <div style={{ padding: '0px', minWidth: '160px' }}>
                      <h3 style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '4px', color: '#111827', margin: 0 }}>
                        {store.name}
                      </h3>
                      {store.village && <p style={{ fontSize: '11px', color: '#6b7280', margin: '0 0 6px 0' }}>{store.village}</p>}
                      
                      <p style={{ fontSize: '12px', color: '#4b5563', margin: '0 0 2px 0' }}>
                        Last Visit: <span style={{ fontWeight: '600' }}>{formattedLastVisit}</span>
                      </p>
                      
                      <p style={{ fontSize: '12px', color: '#4b5563', margin: '0 0 6px 0' }}>
                        Balance: <span style={{ fontWeight: 'bold', color: store.outstanding > 0 ? '#dc2626' : '#16a34a' }}>
                          ₹{store.outstanding.toLocaleString('en-IN')}
                        </span>
                      </p>
                      
                      {store.last_remark && (
                        <p style={{ fontSize: '11px', color: '#6b7280', fontStyle: 'italic', borderTop: '1px solid #e5e7eb', paddingTop: '6px', margin: 0 }}>
                          "{store.last_remark}"
                        </p>
                      )}
                    </div>
                  </Popup>
                </Marker>
              )
            })}
          </MapContainer>
        )}
      </div>
    </div>
  )
}
