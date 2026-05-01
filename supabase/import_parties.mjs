// Import Party List Excel into Supabase stores table
// Run with: node supabase/import_parties.mjs

import { createClient } from '@supabase/supabase-js'
import XLSX from 'xlsx'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

// --- CONFIG: Update these if needed ---
const SUPABASE_URL = 'https://pxdmizopizkxikmzaljj.supabase.co'
const SUPABASE_KEY = 'sb_publishable_V9veX0n5WEK1bSBm0BQfNw_EolIz0Ld'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// Read Excel
const wb = XLSX.readFile(path.join(rootDir, 'PARTY LIST feb 2026.xlsx'))
const ws = wb.Sheets['Sheet1']
const rows = XLSX.utils.sheet_to_json(ws, { header: 1 })

// Parse village from store name: "AMBULE KK CHANDORI" → village = "CHANDORI"
// Also handles "KRISHNA KK KAMARGAON (GOREGAON)" → village = "KAMARGAON (GOREGAON)"
function parseVillage(name) {
  if (!name) return ''
  // Try to extract text after "KK ", "K.K ", "KENDRA "
  const patterns = [
    /\bKK\s+(.+)$/i,
    /\bK\.K\s+(.+)$/i,
    /\bKENDRA\s+(.+)$/i,
    /\bCENTER\s+(.+)$/i,
    /\bAGRO\s+(.+)$/i,
  ]
  for (const p of patterns) {
    const m = name.match(p)
    if (m) return m[1].trim()
  }
  // If brackets exist, use content in brackets
  const bracketMatch = name.match(/\(([^)]+)\)/)
  if (bracketMatch) return bracketMatch[1].trim()
  return ''
}

// Build store records
const stores = []
for (let i = 1; i < rows.length; i++) {
  const row = rows[i]
  const name = row[1]
  if (!name || typeof name !== 'string' || name.trim() === '') continue
  
  const phone = row[2] ? String(row[2]).trim() : ''
  const village = parseVillage(name)
  
  stores.push({
    name: name.trim(),
    village: village,
    phone: phone,
    contact_person: '',  // Not in the Excel
    dealer_category: 'B', // Default
    credit_limit: 0,
  })
}

console.log(`\n📋 Found ${stores.length} stores to import\n`)
console.log('Sample:')
stores.slice(0, 5).forEach(s => console.log(`  ${s.name} | Village: ${s.village} | Phone: ${s.phone}`))
console.log('  ...\n')

// First, log in as manager to pass RLS
// We need manager credentials to insert stores
const email = process.argv[2]
const password = process.argv[3]

if (!email || !password) {
  console.log('⚠️  Usage: node supabase/import_parties.mjs <manager-email> <manager-password>')
  console.log('   Example: node supabase/import_parties.mjs ajay@bioamrut.com YourPassword123')
  console.log('\n   This is needed to authenticate and pass RLS policies.\n')
  process.exit(1)
}

console.log(`🔐 Logging in as ${email}...`)
const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({ email, password })
if (authErr) {
  console.error('❌ Login failed:', authErr.message)
  process.exit(1)
}
console.log('✅ Logged in!\n')

// Insert in batches of 50
const BATCH_SIZE = 50
let inserted = 0
let skipped = 0
let errors = 0

for (let i = 0; i < stores.length; i += BATCH_SIZE) {
  const batch = stores.slice(i, i + BATCH_SIZE)
  const { data, error } = await supabase.from('stores').insert(batch)
  
  if (error) {
    console.error(`❌ Batch ${Math.floor(i/BATCH_SIZE)+1} error:`, error.message)
    // Try one by one for this batch
    for (const store of batch) {
      const { error: singleErr } = await supabase.from('stores').insert(store)
      if (singleErr) {
        if (singleErr.code === '23505') {
          skipped++
        } else {
          console.error(`  ❌ ${store.name}: ${singleErr.message}`)
          errors++
        }
      } else {
        inserted++
      }
    }
  } else {
    inserted += batch.length
    process.stdout.write(`  ✅ Imported ${inserted}/${stores.length}\r`)
  }
}

console.log(`\n\n🎉 DONE!`)
console.log(`   ✅ Inserted: ${inserted}`)
console.log(`   ⏭️  Skipped (duplicate): ${skipped}`)
console.log(`   ❌ Errors: ${errors}`)
console.log(`\n   Total stores in your app now include all ${inserted} new entries.`)
console.log(`   Refresh bioamrut.com to see them!\n`)

await supabase.auth.signOut()
