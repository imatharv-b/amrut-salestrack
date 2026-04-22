import { supabase } from './supabase'
import { DEMO_MODE, DEMO_VISITS } from './demoData'

/**
 * Pushes a visit to LocalStorage when offline
 */
export function queueOfflineVisit(visitData) {
  const queueRaw = localStorage.getItem('offline_visits_queue')
  const queue = queueRaw ? JSON.parse(queueRaw) : []
  
  queue.push({
    ...visitData,
    _offline_id: `temp-${Date.now()}`
  })
  
  localStorage.setItem('offline_visits_queue', JSON.stringify(queue))
}

/**
 * Sweeps LocalStorage queue when online and pushes to Supabase.
 * Binds to window 'online' event inside App.jsx
 */
export async function syncOfflineVisits() {
  if (!navigator.onLine) return

  const queueRaw = localStorage.getItem('offline_visits_queue')
  if (!queueRaw) return
  
  const queue = JSON.parse(queueRaw)
  if (queue.length === 0) return

  console.log(`📡 Internet Restored! Syncing ${queue.length} offline visits...`)

  const toRemove = []

  // Attempt to sync each one individually immediately payload by payload
  for (const visit of queue) {
    try {
      if (DEMO_MODE) {
        // Mock Push
        DEMO_VISITS.push({
          id: `visit-synced-${Date.now()}`,
          store_id: visit.store_id,
          salesman_id: visit.salesman_id,
          visited_date: visit.visited_date,
          remarks: `[AUTO-SYNCED] ${visit.remarks}`,
          lat: visit.lat,
          lng: visit.lng,
          created_at: new Date().toISOString()
        })
      } else {
        // Live Supabase Sync
        const { error } = await supabase.from('visits').insert({
          store_id: visit.store_id,
          salesman_id: visit.salesman_id,
          visited_date: visit.visited_date,
          remarks: visit.remarks,
          lat: visit.lat,
          lng: visit.lng,
        })
        if (error) throw error
      }
      
      // If no error, flag for removal
      toRemove.push(visit._offline_id)
    } catch (err) {
      console.error('Failed to sync specific visit:', err)
      // We skip pushing it to `toRemove`. It stays in the queue to be retried next time.
    }
  }

  if (toRemove.length > 0) {
    // Purge successful synced objects
    const newQueue = queue.filter(v => !toRemove.includes(v._offline_id))
    localStorage.setItem('offline_visits_queue', JSON.stringify(newQueue))
    
    // Alert the user on UI
    alert(`✅ Successfully synced ${toRemove.length} queued field visits!`)
  }
}
