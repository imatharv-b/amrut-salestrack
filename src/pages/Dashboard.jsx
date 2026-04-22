import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import StatCard from '../components/StatCard'
import { DEMO_MODE, DEMO_VISITS, DEMO_COLLECTIONS, DEMO_STORES, DEMO_INVOICES, getStoreOutstanding, getStoreName, getSalesmanName } from '../lib/demoData'
import { supabase } from '../lib/supabase'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'

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

  const today = new Date().toISOString().split('T')[0]
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
  const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]

  useEffect(() => { loadDashboardData() }, [])

  async function loadDashboardData() {
    if (DEMO_MODE) {
      // 1. Metric: Total Collections this Month
      const monthCols = DEMO_COLLECTIONS.filter(c => c.payment_date >= firstDayOfMonth)
      const monthTotal = monthCols.reduce((sum, c) => sum + Number(c.amount), 0)

      // 2. Metric: Outstanding Balance (all dealers)
      const totalOut = DEMO_STORES.reduce((sum, s) => sum + getStoreOutstanding(s.id), 0)

      // 3. Metric: Visits done today
      const visitsToday = DEMO_VISITS.filter(v => v.visited_date === today).length

      // 4. Metric: Stores not visited in 30+ days
      let notVisitedCount = 0
      const storeVisitDates = {}
      DEMO_VISITS.forEach(v => {
        if (!storeVisitDates[v.store_id] || v.visited_date > storeVisitDates[v.store_id]) {
          storeVisitDates[v.store_id] = v.visited_date
        }
      })
      DEMO_STORES.forEach(s => {
        const lastVisit = storeVisitDates[s.id]
        if (!lastVisit || lastVisit < thirtyDaysAgo) notVisitedCount++
      })

      setStats({
        monthCollections: monthTotal,
        totalOutstanding: totalOut,
        todayVisits: visitsToday,
        storesNotVisited30Days: notVisitedCount
      })

      // Bar Chart: Salesman-wise collections this month
      const salesmanTotals = {}
      monthCols.forEach(c => {
        const sName = getSalesmanName(c.salesman_id)
        salesmanTotals[sName] = (salesmanTotals[sName] || 0) + Number(c.amount)
      })
      setSalesmanChartData(Object.keys(salesmanTotals).map(name => ({
        name, amount: salesmanTotals[name]
      })))

      // Top 10 Overdue Dealers
      // In absence of invoice due_dates, we define overdue as simply highest outstanding balance
      const overdueList = DEMO_STORES.map(s => {
        const outstanding = getStoreOutstanding(s.id)
        
        // Find latest invoice date to approximate "days overdue" (simplified logic)
        // A real app would track individual invoices and their due dates.
        const storeVisits = DEMO_VISITS.filter(v => v.store_id === s.id)
        const storeInvoices = DEMO_INVOICES?.filter(i => i.store_id === s.id) || []
        
        let daysOverdue = 0
        if (storeInvoices.length > 0 && outstanding > 0) {
           const oldestUnpaid = storeInvoices.sort((a,b) => new Date(a.invoice_date) - new Date(b.invoice_date))[0]
           const diffTime = Math.abs(new Date() - new Date(oldestUnpaid.invoice_date))
           daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        }

        return {
          id: s.id,
          name: s.name,
          village: s.village,
          outstanding,
          daysOverdue
        }
      })
      .filter(s => s.outstanding > 0)
      .sort((a, b) => b.outstanding - a.outstanding)
      .slice(0, 10)

      setTopOverdue(overdueList)

    } else {
      // Supabase logic would aggregate similarly here based on user requested queries.
      // E.g., RPC calls or fetching raw data and processing similarly.
    }
  }

  return (
    <div className="page-container md:pb-6">
      <div className="mb-6 animate-fade-in-up">
        <h1 className="text-2xl font-bold text-gray-800">Overview Dashboard</h1>
      </div>

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
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesmanChartData} margin={{ left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" fontSize={12} tick={{ fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <YAxis fontSize={12} tick={{ fill: '#6b7280' }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v/1000}k`} />
                <Tooltip 
                  formatter={(value) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Collections']}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  cursor={{ fill: '#f3f4f6' }}
                />
                <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={60} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top 10 Overdue Dealers */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-fade-in-up">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-800">Top 10 Overdue Dealers</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="text-left px-5 py-3 font-semibold">Dealer Name</th>
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
                    <td colSpan="4" className="text-center py-6 text-gray-400">No overdue dealers found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
