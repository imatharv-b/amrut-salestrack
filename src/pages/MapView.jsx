import { useState, useEffect, useRef } from 'react'
import { DEMO_MODE, DEMO_STORES, DEMO_VISITS, getStoreOutstanding } from '../lib/demoData'
import { supabase } from '../lib/supabase'

export default function MapView() {
  const [stores, setStores] = useState([])
  const [mapLoaded, setMapLoaded] = useState(false)
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersRef = useRef([])

  const today = new Date().toISOString().split('T')[0]
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]

  useEffect(() => {
    loadStoresAndVisits()
    loadGoogleMaps()
  }, [])

  useEffect(() => {
    if (mapLoaded && stores.length > 0) {
      renderMarkers()
    }
  }, [mapLoaded, stores])

  async function loadStoresAndVisits() {
    if (DEMO_MODE) {
      // Find latest visit for each store
      const allStores = DEMO_STORES.map(s => {
        const storeVisits = DEMO_VISITS.filter(v => v.store_id === s.id).sort((a,b) => new Date(b.visited_date) - new Date(a.visited_date))
        const lastVisit = storeVisits.length > 0 ? storeVisits[0] : null
        
        return {
          ...s,
          last_visit_date: lastVisit?.visited_date,
          last_remark: lastVisit?.remarks,
          outstanding: getStoreOutstanding(s.id)
        }
      })
      setStores(allStores)
    } else {
      // Real DB logic goes here
    }
  }

  function loadGoogleMaps() {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_KEY
    if (!apiKey) return setMapLoaded(false)
    if (window.google?.maps) return initMap()

    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`
    script.async = true
    script.defer = true
    script.onload = () => initMap()
    document.head.appendChild(script)
  }

  function initMap() {
    if (!mapRef.current) return
    mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
      center: { lat: 21.4552, lng: 80.1982 },
      zoom: 10,
      disableDefaultUI: true,
      zoomControl: true,
    })
    setMapLoaded(true)
  }

  function getPinColor(lastVisitDate) {
    if (!lastVisitDate || lastVisitDate < thirtyDaysAgo) return '#ef4444' // Red: > 30 days
    if (lastVisitDate === today) return '#22c55e' // Green: Today
    if (lastVisitDate >= sevenDaysAgo) return '#eab308' // Yellow: This week
    return '#3b82f6' // Blue: 8-30 days
  }

  function renderMarkers() {
    markersRef.current.forEach(m => m.setMap(null))
    markersRef.current = []
    if (!mapInstanceRef.current) return

    const bounds = new window.google.maps.LatLngBounds()

    stores.forEach(store => {
      if (!store.gps_lat || !store.gps_lng) return

      const pinColor = getPinColor(store.last_visit_date)
      
      const marker = new window.google.maps.Marker({
        position: { lat: store.gps_lat, lng: store.gps_lng },
        map: mapInstanceRef.current,
        title: store.name,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 9,
          fillColor: pinColor,
          fillOpacity: 1,
          strokeColor: '#fff',
          strokeWeight: 2,
        },
      })

      const formattedLastVisit = store.last_visit_date 
        ? new Date(store.last_visit_date).toLocaleDateString('en-IN')
        : 'Never visited'

      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="padding:4px; max-width:200px">
            <h3 style="font-weight:bold; font-size:14px; margin-bottom:4px; color:#111827">${store.name}</h3>
            <p style="font-size:12px; color:#4b5563; margin-bottom:2px">Last Visit: <span style="font-weight:600">${formattedLastVisit}</span></p>
            <p style="font-size:12px; color:#4b5563; margin-bottom:6px">Balance: <span style="font-weight:bold; color:${store.outstanding > 0 ? '#dc2626' : '#16a34a'}">₹${store.outstanding.toLocaleString('en-IN')}</span></p>
            ${store.last_remark ? `<p style="font-size:11px; color:#6b7280; font-style:italic; border-top:1px solid #e5e7eb; padding-top:4px">"${store.last_remark}"</p>` : ''}
          </div>
        `,
      })

      marker.addListener('click', () => {
        infoWindow.open(mapInstanceRef.current, marker)
      })

      markersRef.current.push(marker)
      bounds.extend({ lat: store.gps_lat, lng: store.gps_lng })
    })

    if (markersRef.current.length > 0) {
      mapInstanceRef.current.fitBounds(bounds, 50)
    }
  }

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_KEY

  return (
    <div className="page-container md:pb-6 !p-0">
      <div className="px-4 py-4 bg-white border-b border-gray-100 flex items-center justify-between z-10 relative shadow-sm">
        <h1 className="text-xl font-bold text-gray-800">Live Map</h1>
        <div className="flex gap-3 text-xs font-medium">
          <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-green-500 border border-white"></div>Today</span>
          <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-yellow-500 border border-white"></div>This Week</span>
          <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-red-500 border border-white"></div>30+ Days</span>
        </div>
      </div>

      {!apiKey ? (
        <div className="h-[80vh] flex flex-col items-center justify-center bg-gray-100 m-4 rounded-2xl border-2 border-dashed border-gray-300">
           <span className="text-4xl mb-3">📍</span>
           <p className="font-semibold text-gray-700">Google Maps API Key required in .env</p>
        </div>
      ) : (
        <div ref={mapRef} style={{ height: 'calc(100vh - 120px)' }} className="w-full" />
      )}
    </div>
  )
}
