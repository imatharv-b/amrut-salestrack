import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { writeFileSync } from 'fs'

// Generate a unique build ID on every build
const buildId = Date.now().toString(36)

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'generate-version-file',
      buildStart() {
        // Write version.json to public/ so it gets deployed as a static file
        writeFileSync('public/version.json', JSON.stringify({ buildId }))
      }
    }
  ],
  define: {
    // Inject the build ID into the app's JS bundle at compile time
    '__APP_BUILD_ID__': JSON.stringify(buildId)
  }
})
