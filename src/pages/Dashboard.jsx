import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import StatCard from '../components/StatCard'
import Modal from '../components/Modal'
import { supabase } from '../lib/supabase'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts'

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
  const [dailyCoverage, setDailyCoverage] = useState([])
  const [loading, setLoading] = useState(true)

  // Drill-down state
  const [selectedSalesman, setSelectedSalesman] = useState(null)
  const [salesmanModalData, setSalesmanModalData] = useState(null)

  // Raw data refs for drill-down
  const [rawData, setRawData] = useState({
    collections: [], stores: [], salesmen: [], attendance: []
  })

  const today = new Date().toISOString().split('T')[0]
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
  const nowDate = new Date()
  const firstDayOfMonth = new Date(nowDate.getFullYear(), nowDate.getMonth(), 1).toISOString().split('T')[0]
  const lastDayOfMonth = new Date(nowDate.getFullYear(), nowDate.getMonth() + 1, 0).toISOString().split('T')[0]

  useEffect(() => { loadDashboardData() }, [])

  async function loadDashboardData() {
    setLoading(true)
    try {
      const [storesRes, visitsRes, collectionsRes, invoicesRes, usersRes, attendanceRes, assignmentsRes] = await Promise.all([
        supabase.from('stores').select('id, name, village, route_id'),
        supabase.from('visits').select('id, store_id, salesman_id, visited_date'),
        supabase.from('collections').select('id, store_id, salesman_id, amount, payment_date, payment_mode, remarks'),
        supabase.from('invoices').select('id, store_id, total_amount, invoice_date'),
        supabase.from('users').select('id, name').eq('role', 'salesman'),
        supabase.from('attendance').select('id, salesman_id, date, status')
          .gte('date', firstDayOfMonth)
          .lte('date', lastDayOfMonth),
        supabase.from('daily_route_assignments').select('*').eq('assigned_date', today)
      ])

      const stores = storesRes.data || []
      const visits = visitsRes.data || []
      const collections = collectionsRes.data || []
      const invoices = invoicesRes.data || []
      const salesmen = usersRes.data || []
      const attendance = attendanceRes.data || []
      const assignmentsToday = assignmentsRes.data || []

      // Save raw data for drill-down
      setRawData({ collections, stores, salesmen, attendance })

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

      // Salesman chart - store salesman IDs for click mapping
      const salesmanTotals = {}
      const salesmanIdMap = {}
      monthCols.forEach(c => {
        const sm = salesmen.find(s => s.id === c.salesman_id)
        const sName = sm?.name || 'Unknown'
        salesmanTotals[sName] = (salesmanTotals[sName] || 0) + Number(c.amount)
        if (sm) salesmanIdMap[sName] = sm.id
      })
      setSalesmanChartData(Object.keys(salesmanTotals).map(name => ({
        name, amount: salesmanTotals[name], salesmanId: salesmanIdMap[name] || null
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

      // Daily Coverage
      const salesmanCoverage = []
      salesmen.forEach(sm => {
        const routesAssigned = assignmentsToday.filter(a => a.salesman_id === sm.id).map(a => a.route_id)
        if (routesAssigned.length > 0) {
          const targetStores = stores.filter(s => routesAssigned.includes(s.route_id))
          const visitedStoreIds = new Set(visits.filter(v => v.visited_date === today && v.salesman_id === sm.id).map(v => v.store_id))
          const targetVisitedCount = targetStores.filter(s => visitedStoreIds.has(s.id)).length
          const coveragePercent = targetStores.length > 0 ? Math.round((targetVisitedCount / targetStores.length) * 100) : 0
          salesmanCoverage.push({
            id: sm.id,
            name: sm.name,
            targetStores: targetStores.length,
            visitedStores: targetVisitedCount,
            coveragePercent
          })
        }
      })
      salesmanCoverage.sort((a, b) => b.coveragePercent - a.coveragePercent)
      setDailyCoverage(salesmanCoverage)

    } catch (err) {
      console.error('Dashboard load error:', err)
    } finally {
      setLoading(false)
    }
  }

  // Handle salesman bar click
  function handleBarClick(data) {
    if (!data || !data.salesmanId) return
    const smId = data.salesmanId
    const smName = data.name

    // Get this month's collections for this salesman
    const smCollections = rawData.collections
      .filter(c => c.salesman_id === smId && c.payment_date >= firstDayOfMonth)
      .sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date))

    // Map store details
    const storeCollections = smCollections.map(c => {
      const store = rawData.stores.find(s => s.id === c.store_id)
      return {
        ...c,
        store_name: store?.name || 'Unknown Store',
        store_village: store?.village || ''
      }
    })

    // Store-wise aggregation
    const storeAgg = {}
    smCollections.forEach(c => {
      if (!storeAgg[c.store_id]) {
        const store = rawData.stores.find(s => s.id === c.store_id)
        storeAgg[c.store_id] = {
          name: store?.name || 'Unknown',
          village: store?.village || '',
          total: 0,
          count: 0
        }
      }
      storeAgg[c.store_id].total += Number(c.amount)
      storeAgg[c.store_id].count += 1
    })

    // Attendance for this salesman this month
    const smAttendance = rawData.attendance.filter(a => a.salesman_id === smId)
    const presentDays = smAttendance.filter(a => a.status === 'approved').length
    const pendingDays = smAttendance.filter(a => a.status === 'pending').length
    const rejectedDays = smAttendance.filter(a => a.status === 'rejected').length

    // Count working days so far this month (exclude Sundays)
    let workingDays = 0
    const monthStart = new Date(nowDate.getFullYear(), nowDate.getMonth(), 1)
    const todayDate = new Date()
    for (let d = new Date(monthStart); d <= todayDate; d.setDate(d.getDate() + 1)) {
      if (d.getDay() !== 0) workingDays++ // exclude Sunday
    }

    const totalCollected = smCollections.reduce((sum, c) => sum + Number(c.amount), 0)

    setSalesmanModalData({
      name: smName,
      salesmanId: smId,
      collections: storeCollections,
      storeAgg: Object.values(storeAgg).sort((a, b) => b.total - a.total),
      totalCollected,
      storesCollectedFrom: Object.keys(storeAgg).length,
      attendance: { present: presentDays, pending: pendingDays, rejected: rejectedDays, workingDays }
    })
    setSelectedSalesman(smName)
  }

  function closeModal() {
    setSelectedSalesman(null)
    setSalesmanModalData(null)
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
            {/* Salesman Collections Bar Chart — CLICKABLE */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 animate-fade-in-up">
              <h2 className="font-bold text-gray-800 mb-1">Salesman Collections (This Month)</h2>
              <p className="text-xs text-gray-400 mb-4">👆 Click on a bar to see store-wise breakdown</p>
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
                      <Bar
                        dataKey="amount"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={60}
                        onClick={(data) => handleBarClick(data)}
                        style={{ cursor: 'pointer' }}
                      >
                        {salesmanChartData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={selectedSalesman === entry.name ? '#1e40af' : '#3b82f6'}
                            className="transition-all duration-200"
                          />
                        ))}
                      </Bar>
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

            {/* Daily Route Coverage */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-fade-in-up">
              <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
                <h2 className="font-bold text-gray-800">Today's Route Coverage</h2>
                <span className="text-[10px] bg-brand-100 text-brand-800 px-2 py-0.5 rounded font-bold uppercase tracking-wider">Today</span>
              </div>
              <div className="p-5">
                {dailyCoverage.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">No routes assigned today.</p>
                ) : (
                  <div className="space-y-5">
                    {dailyCoverage.map(sm => (
                      <div key={sm.id}>
                        <div className="flex justify-between items-end mb-1.5">
                          <p className="text-sm font-bold text-gray-800">{sm.name}</p>
                          <p className="text-xs font-bold text-brand-600">{sm.coveragePercent}%</p>
                        </div>
                        <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${sm.coveragePercent === 100 ? 'bg-emerald-500' : 'bg-brand-500'}`} style={{ width: `${sm.coveragePercent}%` }} />
                        </div>
                        <p className="text-[10px] text-gray-500 mt-1.5 font-medium">{sm.visitedStores} of {sm.targetStores} assigned stores visited</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Salesman Drill-Down Modal */}
      <Modal isOpen={!!selectedSalesman} onClose={closeModal} title={`${selectedSalesman} — Collections Detail`} size="xl">
        {salesmanModalData && (
          <div className="space-y-5">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-3 text-center border border-emerald-200">
                <p className="text-xl font-bold text-emerald-700">₹{salesmanModalData.totalCollected.toLocaleString('en-IN')}</p>
                <p className="text-[10px] text-emerald-600 font-semibold mt-1">Total Collected</p>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-3 text-center border border-blue-200">
                <p className="text-xl font-bold text-blue-700">{salesmanModalData.storesCollectedFrom}</p>
                <p className="text-[10px] text-blue-600 font-semibold mt-1">Stores Collected</p>
              </div>
              <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-3 text-center border border-amber-200">
                <p className="text-xl font-bold text-amber-700">{salesmanModalData.attendance.present}</p>
                <p className="text-[10px] text-amber-600 font-semibold mt-1">Days Present</p>
              </div>
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-3 text-center border border-gray-200">
                <p className="text-xl font-bold text-gray-700">
                  {salesmanModalData.attendance.workingDays > 0
                    ? Math.round((salesmanModalData.attendance.present / salesmanModalData.attendance.workingDays) * 100)
                    : 0}%
                </p>
                <p className="text-[10px] text-gray-500 font-semibold mt-1">Attendance %</p>
              </div>
            </div>

            {/* Store-wise Aggregation */}
            <div>
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                Store-wise Collection Summary / दुकान वार वसूली
              </h4>
              {salesmanModalData.storeAgg.length === 0 ? (
                <p className="text-sm text-gray-400 italic py-4 text-center">No collections this month</p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Store</th>
                        <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Village</th>
                        <th className="text-center px-4 py-2.5 font-semibold text-gray-600">Visits</th>
                        <th className="text-right px-4 py-2.5 font-semibold text-gray-600">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {salesmanModalData.storeAgg.map((s, i) => (
                        <tr key={i} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-2.5 font-medium text-gray-800">{s.name}</td>
                          <td className="px-4 py-2.5 text-gray-500 text-xs">{s.village}</td>
                          <td className="px-4 py-2.5 text-center">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-brand-100 text-brand-700 font-bold text-xs">{s.count}</span>
                          </td>
                          <td className="px-4 py-2.5 text-right font-bold text-emerald-700">₹{s.total.toLocaleString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Detailed Transaction Log */}
            <div>
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                All Transactions / सभी लेनदेन
              </h4>
              {salesmanModalData.collections.length === 0 ? (
                <p className="text-sm text-gray-400 italic py-4 text-center">No transactions this month</p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Date</th>
                        <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Store</th>
                        <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Mode</th>
                        <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Remarks</th>
                        <th className="text-right px-4 py-2.5 font-semibold text-gray-600">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {salesmanModalData.collections.map(c => (
                        <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-2.5 text-gray-700 whitespace-nowrap">
                            {new Date(c.payment_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                          </td>
                          <td className="px-4 py-2.5">
                            <p className="font-medium text-gray-800 text-xs">{c.store_name}</p>
                            <p className="text-[10px] text-gray-400">{c.store_village}</p>
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="px-2 py-0.5 bg-gray-200 rounded text-[10px] font-semibold uppercase">{c.payment_mode || '—'}</span>
                          </td>
                          <td className="px-4 py-2.5 text-gray-500 text-xs max-w-[120px] truncate">{c.remarks || '—'}</td>
                          <td className="px-4 py-2.5 text-right font-bold text-emerald-700 whitespace-nowrap">₹{Number(c.amount).toLocaleString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
