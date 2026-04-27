/**
 * Version checker — silently cleans up old service workers and caches
 * on every page load. No forced reloads — Vercel headers handle cache
 * invalidation, this is just a cleanup utility.
 */

// Clean up any leftover service workers from the old PWA setup
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(reg => {
      reg.unregister()
      console.log('[Cleanup] Unregistered service worker:', reg.scope)
    })
  })
}

// Clean up any leftover CacheStorage entries
if ('caches' in window) {
  caches.keys().then(names => {
    names.forEach(name => {
      caches.delete(name)
      console.log('[Cleanup] Deleted cache:', name)
    })
  })
}
