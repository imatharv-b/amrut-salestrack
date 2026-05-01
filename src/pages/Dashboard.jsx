import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import StatCard from '../components/StatCard'
import { supabase } from '../lib/supabase'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

export default function Dashboard() {
  const { profile } = useAuth()
  const [stats, setStats] = useState({
    monthCollections: 0,
    totalOutstanding: 0,
    todayVisits: 0,
    storesNotVisited30Days: 0
  })
  const [salesmanChartData, setSalesmanChartData] = useState([])
  const [topOverdue, setTopOverdue] = useState([])
  const [loading, setLoading] = useState(true)

  const today = new Date().toISOString().split('T')[0]
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
  const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]

  useEffect(() => { loadDashboardData() }, [])

  async function loadDashboardData() {
    setLoading(true)
    try {
      const [storesRes, visitsRes, collectionsRes, invoicesRes, usersRes] = await Promise.all([
        supabase.from('stores').select('id, name, village, route_id'),
        supabase.from('visits').select('id, store_id, salesman_id, visited_date'),
        supabase.from('collections').select('id, store_id, salesman_id, amount, payment_date'),
        supabase.from('invoices').select('id, store_id, total_amount, invoice_date'),
        supabase.from('users').select('id, name').eq('role', 'salesman'),
      ])

      const stores = storesRes.data || []
      const visits = visitsRes.data || []
      const collections = collectionsRes.data || []
      const invoices = invoicesRes.data || []
      const salesmen = usersRes.data || []

      // 1. Month collections
      const monthCols = collections.filter(c => c.payment_date >= firstDayOfMonth)
      const monthTotal = monthCols.reduce((sum, c) => sum + Number(c.amount), 0)

      // 2. Outstanding balance per store
      let totalOutstanding = 0
      stores.forEach(s => {
        const inv = invoices.filter(i => i.store_id === s.id).reduce((sum, i) => sum + Number(i.total_amount || 0), 0)
        const col = collections.filter(c => c.store_id === s.id).reduce((sum, c) => sum + Number(c.amount || 0), 0)
        totalOutstanding += (inv - col)
      })

      // 3. Visits today
      const visitsToday = visits.filter(v => v.visited_date === today).length

      // 4. Stores not visited in 30+ days
      const storeVisitDates = {}
      visits.forEach(v => {
        if (!storeVisitDates[v.store_id] || v.visited_date > storeVisitDates[v.store_id]) {
          storeVisitDates[v.store_id] = v.visited_date
        }
      })
      let notVisitedCount = 0
      stores.forEach(s => {
        const lastVisit = storeVisitDates[s.id]
        if (!lastVisit || lastVisit < thirtyDaysAgo) notVisitedCount++
      })

      setStats({
        monthCollections: monthTotal,
        totalOutstanding: Math.max(0, totalOutstanding),
        todayVisits: visitsToday,
        storesNotVisited30Days: notVisitedCount
      })

      // Salesman chart
      const salesmanTotals = {}
      monthCols.forEach(c => {
        const sm = salesmen.find(s => s.id === c.salesman_id)
        const sName = sm?.name || 'Unknown'
        salesmanTotals[sName] = (salesmanTotals[sName] || 0) + Number(c.amount)
      })
      setSalesmanChartData(Object.keys(salesmanTotals).map(name => ({
        name, amount: salesmanTotals[name]
      })))

      // Top overdue
      const overdueList = stores.map(s => {
        const storeInv = invoices.filter(i => i.store_id === s.id)
        const inv = storeInv.reduce((sum, i) => sum + Number(i.total_amount || 0), 0)
        const col = collections.filter(c => c.store_id === s.id).reduce((sum, c) => sum + Number(c.amount || 0), 0)
        const outstanding = inv - col

        let daysOverdue = 0
        if (storeInv.length > 0 && outstanding > 0) {
          const oldest = storeInv.sort((a, b) => new Date(a.invoice_date) - new Date(b.invoice_date))[0]
          daysOverdue = Math.ceil(Math.abs(new Date() - new Date(oldest.invoice_date)) / 86400000)
        }

        return { id: s.id, name: s.name, village: s.village, outstanding, daysOverdue }
      })
        .filter(s => s.outstanding > 0)
        .sort((a, b) => b.outstanding - a.outstanding)
        .slice(0, 10)

      setTopOverdue(overdueList)
    } catch (err) {
      console.error('Dashboard load error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-container md:pb-6">
      <div className="mb-6 animate-fade-in-up">
        <h1 className="text-2xl font-bold text-gray-800">Overview Dashboard</h1>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="w-8 h-8 border-brand-200 border-t-brand-600 rounded-full animate-spin" style={{ borderWidth: '3px' }} />
        </div>
      ) : (
        <>
          {/* 4 Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 stagger-children">
            <div className="animate-fade-in-up">
              <StatCard icon="💰" label="Month Collections" value={`₹${stats.monthCollections.toLocaleString('en-IN')}`} color="amber" />
            </div>
            <div className="animate-fade-in-up">
              <StatCard icon="📉" label="Total Outstanding" value={`₹${stats.totalOutstanding.toLocaleString('en-IN')}`} color="red" />
            </div>
            <div className="animate-fade-in-up">
              <StatCard icon="🏃‍♂️" label="Visits Today" value={stats.todayVisits} color="brand" />
            </div>
            <div className="animate-fade-in-up">
              <StatCard icon="⚠️" label="30+ Days Unvisited" value={stats.storesNotVisited30Days} color="red" />
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Salesman Collections Bar Chart */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 animate-fade-in-up">
              <h2 className="font-bold text-gray-800 mb-4">Salesman Collections (This Month)</h2>
              <div className="h-64">
                {salesmanChartData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-gray-400 text-sm">No collections this month</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={salesmanChartData} margin={{ left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="name" fontSize={12} tick={{ fill: '#6b7280' }} axisLine={false} tickLine={false} />
                      <YAxis fontSize={12} tick={{ fill: '#6b7280' }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v / 1000}k`} />
                      <Tooltip
                        formatter={(value) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Collections']}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        cursor={{ fill: '#f3f4f6' }}
                      />
                      <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={60} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Top 10 Overdue Dealers */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-fade-in-up">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="font-bold text-gray-800">Top 10 Overdue Krishi Kendras</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500">
                    <tr>
                      <th className="text-left px-5 py-3 font-semibold">Kendra Name</th>
                      <th className="text-left px-5 py-3 font-semibold">Village</th>
                      <th className="text-center px-5 py-3 font-semibold">Days Overdue</th>
                      <th className="text-right px-5 py-3 font-semibold">Amount Due</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {topOverdue.map(store => (
                      <tr key={store.id} className="hover:bg-gray-50">
                        <td className="px-5 py-3 font-medium text-gray-800">{store.name}</td>
                        <td className="px-5 py-3 text-gray-600">{store.village}</td>
                        <td className="px-5 py-3 text-center">
                          <span className={`badge ${store.daysOverdue >= 30 ? 'badge-red' : 'badge-amber'}`}>
                            {store.daysOverdue} days
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right font-bold text-red-600">
                          ₹{store.outstanding.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                    {topOverdue.length === 0 && (
                      <tr>
                        <td colSpan="4" className="text-center py-6 text-gray-400">No overdue Krishi Kendras found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
