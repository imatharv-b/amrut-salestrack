export const DEMO_MODE = !import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL === '' || import.meta.env.VITE_SUPABASE_URL === 'https://placeholder.supabase.co'

export const DEMO_ROUTES = [
  { id: 'r_gondia', name: 'GONDIA-HQ', description: 'City and surrounding Goregaon area' },
  { id: 'r_tirora', name: 'TIRORA', description: 'Tirora and adjacent villages' },
  { id: 'r_amgaon', name: 'AMGAON-SAL', description: 'Amgaon and Salekasa taluka' }
]

export const DEMO_USERS = {
  manager: {
    email: 'manager@amrut.com', password: 'manager123',
    profile: { id: 'u_manager', name: 'Rajesh Patil', phone: '9876543210', role: 'manager', route_id: null }
  },
  salesman: {
    email: 'salesman@amrut.com', password: 'salesman123',
    profile: { id: 'u_salesman1', name: 'Sunil Gawande', phone: '9000000001', role: 'salesman', route_id: 'r_gondia' }
  },
  salesman2: {
    email: 'kiran@amrut.com', password: 'salesman123',
    profile: { id: 'u_salesman2', name: 'Kiran Deshmukh', phone: '9000000002', role: 'salesman', route_id: 'r_tirora' }
  }
}

export const DEMO_STORES = [
  { id: 's1', name: 'Shri Ganesh Krishi Kendra', route_id: 'r_gondia', village: 'Goregaon', gps_lat: 21.3122, gps_lng: 80.0888, contact_person: 'Ramesh B', phone: '9111', dealer_category: 'A', credit_limit: 500000 },
  { id: 's2', name: 'Mauli Krishi Seva', route_id: 'r_gondia', village: 'Gondia City', gps_lat: 21.4552, gps_lng: 80.1982, contact_person: 'Vikas p', phone: '9112', dealer_category: 'A', credit_limit: 200000 },
  { id: 's3', name: 'Sai Agro Center', route_id: 'r_gondia', village: 'Gondia Rural', gps_lat: 21.4650, gps_lng: 80.2000, contact_person: 'Kishor', phone: '9113', dealer_category: 'B', credit_limit: 150000 },
  { id: 's4', name: 'Balaji Agro Services', route_id: 'r_tirora', village: 'Tirora', gps_lat: 21.4011, gps_lng: 79.9877, contact_person: 'Suresh Thakre', phone: '9114', dealer_category: 'A', credit_limit: 300000 },
  { id: 's5', name: 'Krishi Mitra Center', route_id: 'r_tirora', village: 'Sukdi', gps_lat: 21.4111, gps_lng: 79.9911, contact_person: 'Manoj D', phone: '9115', dealer_category: 'B', credit_limit: 100000 },
  { id: 's6', name: 'Jai Kisan Fertilizer', route_id: 'r_tirora', village: 'Arjuni', gps_lat: 21.4300, gps_lng: 79.9500, contact_person: 'Gopal N', phone: '9116', dealer_category: 'C', credit_limit: 50000 },
  { id: 's7', name: 'Amrut Dealers Amgaon', route_id: 'r_amgaon', village: 'Amgaon', gps_lat: 21.3833, gps_lng: 80.3588, contact_person: 'Nitin Deshpande', phone: '9117', dealer_category: 'A', credit_limit: 400000 },
  { id: 's8', name: 'Kisaan Sewa Kendra', route_id: 'r_amgaon', village: 'Salekasa', gps_lat: 21.5200, gps_lng: 80.0500, contact_person: 'Prakash M', phone: '9118', dealer_category: 'B', credit_limit: 150000 },
  { id: 's9', name: 'Shivaji Agro Sales', route_id: 'r_amgaon', village: 'Deori', gps_lat: 21.0500, gps_lng: 80.4600, contact_person: 'Ajay Singh', phone: '9119', dealer_category: 'A', credit_limit: 500000 },
  { id: 's10', name: 'Mahalaxmi Krishi', route_id: 'r_amgaon', village: 'Sadak Arjuni', gps_lat: 21.1300, gps_lng: 80.0600, contact_person: 'Deepesh R', phone: '9120', dealer_category: 'C', credit_limit: 40000 }
]

const todayNum = Date.now()
const today = new Date().toISOString().split('T')[0]
const _2days = new Date(todayNum - 2 * 86400000).toISOString().split('T')[0]
const _5days = new Date(todayNum - 5 * 86400000).toISOString().split('T')[0]
const _15days = new Date(todayNum - 15 * 86400000).toISOString().split('T')[0]
const _45days = new Date(todayNum - 45 * 86400000).toISOString().split('T')[0]

export const DEMO_VISITS = [
  { id: 'v1', store_id: 's1', salesman_id: 'u_salesman1', visited_date: today, remarks: 'Owner wants 10 more boxes next week.', photo_url: null, created_at: new Date(todayNum).toISOString() },
  { id: 'v2', store_id: 's2', salesman_id: 'u_salesman1', visited_date: _2days, remarks: 'Payment follow up.', photo_url: null, created_at: new Date(todayNum - 2*86400000).toISOString() },
  { id: 'v3', store_id: 's3', salesman_id: 'u_salesman1', visited_date: _45days, remarks: 'Shop was closed.', photo_url: null, created_at: new Date(todayNum - 45*86400000).toISOString() },
  { id: 'v4', store_id: 's4', salesman_id: 'u_salesman2', visited_date: today, remarks: 'Stock is full. Doing well.', photo_url: null, created_at: new Date(todayNum).toISOString() },
  { id: 'v5', store_id: 's5', salesman_id: 'u_salesman2', visited_date: _5days, remarks: 'Discussed new discounts.', photo_url: null, created_at: new Date(todayNum - 5*86400000).toISOString() },
  { id: 'v6', store_id: 's6', salesman_id: 'u_salesman2', visited_date: _15days, remarks: 'Competitor product is moving fast.', photo_url: null, created_at: new Date(todayNum - 15*86400000).toISOString() },
  { id: 'v7', store_id: 's7', salesman_id: 'u_salesman1', visited_date: _45days, remarks: 'Need to visit soon.', photo_url: null, created_at: new Date(todayNum - 45*86400000).toISOString() }
]

export const DEMO_INVOICES = [
  { id: 'i1', store_id: 's1', invoice_number: 'INV-001', invoice_date: _15days, total_amount: 55000, description: 'Bio NPK Supply', created_at: '2026-04-01' },
  { id: 'i2', store_id: 's2', invoice_number: 'INV-002', invoice_date: _45days, total_amount: 120000, description: 'Bulk order', created_at: '2026-03-01' },
  { id: 'i3', store_id: 's4', invoice_number: 'INV-003', invoice_date: _5days, total_amount: 30000, description: 'Trial supply', created_at: '2026-04-10' },
  { id: 'i4', store_id: 's7', invoice_number: 'INV-004', invoice_date: _45days, total_amount: 450000, description: 'Season opening stock', created_at: '2026-02-15' },
]

export const DEMO_COLLECTIONS = [
  { id: 'c1', store_id: 's1', salesman_id: 'u_salesman1', amount: 15000, payment_mode: 'cash', payment_date: _5days, remarks: 'Partial payment', invoice_id: 'i1', created_at: '2026-04-10' },
  { id: 'c2', store_id: 's2', salesman_id: 'u_salesman1', amount: 50000, payment_mode: 'upi', payment_date: _15days, remarks: 'Bank transfer', invoice_id: 'i2', created_at: '2026-04-01' },
  { id: 'c3', store_id: 's2', salesman_id: 'u_salesman1', amount: 30000, payment_mode: 'cash', payment_date: today, remarks: 'Cash handed over', invoice_id: 'i2', created_at: today },
  { id: 'c4', store_id: 's7', salesman_id: 'u_salesman1', amount: 100000, payment_mode: 'upi', payment_date: _15days, remarks: 'First tranche', invoice_id: 'i4', created_at: '2026-04-01' }
]

export function getStoreName(id) { return DEMO_STORES.find(s => s.id === id)?.name || 'Unknown' }
export function getRouteName(id) { return DEMO_ROUTES.find(r => r.id === id)?.name || 'Unknown' }
export function getSalesmanName(id) { 
  if (id === DEMO_USERS.salesman.profile.id) return DEMO_USERS.salesman.profile.name
  if (id === DEMO_USERS.salesman2.profile.id) return DEMO_USERS.salesman2.profile.name
  return 'Unknown'
}

export function getStoreOutstanding(storeId) {
  const store = DEMO_STORES.find(s => s.id === storeId)
  if (!store) return 0
  const invoiced = DEMO_INVOICES.filter(i => i.store_id === storeId).reduce((sum, i) => sum + Number(i.total_amount), 0)
  const collected = DEMO_COLLECTIONS.filter(c => c.store_id === storeId).reduce((sum, c) => sum + Number(c.amount), 0)
  return invoiced - collected
}
