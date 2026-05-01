import { supabase } from './supabase'

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

  for (const visit of queue) {
    try {
      const { error } = await supabase.from('visits').insert({
        store_id: visit.store_id,
        salesman_id: visit.salesman_id,
        visited_date: visit.visited_date,
        remarks: visit.remarks,
        stock_remaining: visit.stock_remaining,
        follow_up_date: visit.follow_up_date,
        follow_up_note: visit.follow_up_note,
        lat: visit.lat,
        lng: visit.lng,
      })
      if (error) throw error
      toRemove.push(visit._offline_id)
    } catch (err) {
      console.error('Failed to sync specific visit:', err)
    }
  }

  if (toRemove.length > 0) {
    const newQueue = queue.filter(v => !toRemove.includes(v._offline_id))
    localStorage.setItem('offline_visits_queue', JSON.stringify(newQueue))
    alert(`✅ Successfully synced ${toRemove.length} queued field visits!`)
  }
}
