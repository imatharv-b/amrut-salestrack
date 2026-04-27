/**
 * Version checker — compares the build ID baked into this JS bundle
 * against the live version.json on the server. If they differ, the user
 * is running stale cached code and gets a hard refresh.
 * 
 * This runs on every page load and on a 5-minute interval.
 */

const BUNDLED_BUILD_ID = typeof __APP_BUILD_ID__ !== 'undefined' ? __APP_BUILD_ID__ : null

async function checkForUpdates() {
  if (!BUNDLED_BUILD_ID) return // dev mode or not built yet

  try {
    // Fetch version.json with cache-busting query param to bypass ALL caches
    const res = await fetch(`/version.json?_t=${Date.now()}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' }
    })
    
    if (!res.ok) return // version.json not found, skip

    const { buildId: serverBuildId } = await res.json()

    if (serverBuildId && serverBuildId !== BUNDLED_BUILD_ID) {
      console.log(`[VersionCheck] New version detected: ${serverBuildId} (running: ${BUNDLED_BUILD_ID}). Refreshing...`)
      
      // Clear all caches before reloading
      if ('caches' in window) {
        const cacheNames = await caches.keys()
        await Promise.all(cacheNames.map(name => caches.delete(name)))
      }
      
      // Hard refresh — bypass browser cache
      window.location.reload()
    }
  } catch (err) {
    // Network error, offline, etc. — silently skip
    console.debug('[VersionCheck] Check failed:', err.message)
  }
}

// Check immediately on page load
checkForUpdates()

// Also check every 5 minutes while the tab is open
setInterval(checkForUpdates, 5 * 60 * 1000)

// Also check when user returns to the tab (e.g. after switching apps)
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    checkForUpdates()
  }
})

export { checkForUpdates }
