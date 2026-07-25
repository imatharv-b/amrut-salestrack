import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import Modal from '../components/Modal'
import * as XLSX from 'xlsx'

export default function VisitReport() {
  const { profile } = useAuth()
  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth())
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [salesmen, setSalesmen] = useState([])
  const [selectedSalesman, setSelectedSalesman] = useState('all')
  const [stores, setStores] = useState([])
  const [visits, setVisits] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState('calendar') // 'calendar' | 'storeSummary'
  const [collections, setCollections] = useState([])
  const [routes, setRoutes] = useState([])
  
  // New features state
  const [searchTerm, setSearchTerm] = useState('')
  const [sortOrder, setSortOrder] = useState('asc')
  const [remarkModal, setRemarkModal] = useState({ isOpen: false, storeName: '', date: '', remark: '' })

  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate()
  const monthName = new Date(selectedYear, selectedMonth).toLocaleString('en-IN', { month: 'long', year: 'numeric' })

  useEffect(() => {
    loadSalesmen()
  }, [])

  useEffect(() => {
    loadVisitData()
  }, [selectedMonth, selectedYear, selectedSalesman])

  async function loadSalesmen() {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, phone, route_id')
        .eq('role', 'salesman')
        .order('name')
      if (error) throw error
      setSalesmen(data || [])
    } catch (err) {
      console.error('Failed to load salesmen:', err)
    }
  }

  async function loadVisitData() {
    setLoading(true)
    try {
      const startDate = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-01`
      const endDate = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${daysInMonth}`

      // Load stores, routes, collections
      const [storesRes, routesRes, colsRes] = await Promise.all([
        supabase.from('stores').select('id, name, village, route_id').order('name'),
        supabase.from('routes').select('id, name'),
        supabase.from('collections').select('id, store_id, salesman_id, amount, payment_date')
          .gte('payment_date', startDate).lte('payment_date', endDate),
      ])
      if (storesRes.error) throw storesRes.error
      setStores(storesRes.data || [])
      setRoutes(routesRes.data || [])
      setCollections(colsRes.data || [])

      // Load visits for the month
      let visitsQuery = supabase
        .from('visits')
        .select('id, store_id, salesman_id, visited_date, remarks')
        .gte('visited_date', startDate)
        .lte('visited_date', endDate)

      if (selectedSalesman !== 'all') {
        visitsQuery = visitsQuery.eq('salesman_id', selectedSalesman)
      }

      const { data: visitsData, error: visitsErr } = await visitsQuery
      if (visitsErr) throw visitsErr
      setVisits(visitsData || [])
    } catch (err) {
      console.error('Failed to load visit data:', err)
    } finally {
      setLoading(false)
    }
  }

  // Build the grid: only stores that have at least one visit (or all stores)
  const visitedStoreIds = [...new Set(visits.map(v => v.store_id))]
  const relevantStores = stores.filter(s => visitedStoreIds.includes(s.id))

  // Apply Search and Sort
  let filteredStores = relevantStores.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()))
  filteredStores.sort((a, b) => {
    if (sortOrder === 'asc') return a.name.localeCompare(b.name)
    return b.name.localeCompare(a.name)
  })

  // For each store, build a day-map
  function getVisitForDay(storeId, day) {
    const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return visits.find(v => v.store_id === storeId && v.visited_date === dateStr)
  }

  function getVisitCount(storeId) {
    return visits.filter(v => v.store_id === storeId).length
  }

  // Determine if a day is Sunday
  function isSunday(day) {
    return new Date(selectedYear, selectedMonth, day).getDay() === 0
  }

  // Get salesman name
  function getSalesmanNameById(id) {
    return salesmen.find(s => s.id === id)?.name || ''
  }

  // DOWNLOAD EXCEL
  function downloadExcel() {
    const header = ['Store Name', 'Village']
    for (let d = 1; d <= daysInMonth; d++) {
      header.push(String(d))
    }
    header.push('Total Visits')

    const rows = relevantStores.map(store => {
      const row = [store.name, store.village || '']
      let total = 0
      for (let d = 1; d <= daysInMonth; d++) {
        const visit = getVisitForDay(store.id, d)
        if (visit) {
          row.push('✓')
          total++
        } else {
          row.push('')
        }
      }
      row.push(total)
      return row
    })

    // Add totals row
    const totalsRow = ['', 'TOTAL']
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const count = visits.filter(v => v.visited_date === dateStr).length
      totalsRow.push(count || '')
    }
    totalsRow.push(visits.length)
    rows.push(totalsRow)

    const ws = XLSX.utils.aoa_to_sheet([header, ...rows])

    // Column widths
    ws['!cols'] = [
      { wch: 30 },  // Store name
      { wch: 15 },  // Village
      ...Array.from({ length: daysInMonth }, () => ({ wch: 4 })),
      { wch: 8 },   // Total
    ]

    const wb = XLSX.utils.book_new()
    const salesmanLabel = selectedSalesman === 'all' ? 'All' : getSalesmanNameById(selectedSalesman)
    XLSX.utils.book_append_sheet(wb, ws, 'Visit Report')
    XLSX.writeFile(wb, `Visit_Report_${salesmanLabel}_${monthName.replace(' ', '_')}.xlsx`)
  }

  function navigateMonth(delta) {
    let m = selectedMonth + delta
    let y = selectedYear
    if (m < 0) { m = 11; y-- }
    if (m > 11) { m = 0; y++ }
    // Don't go into the future
    if (y > now.getFullYear() || (y === now.getFullYear() && m > now.getMonth())) return
    setSelectedMonth(m)
    setSelectedYear(y)
  }

  // Store summary helpers
  const getRouteName = (routeId) => routes.find(r => r.id === routeId)?.name || '—'
  const storeSummaryData = stores.map(store => {
    const storeVisits = visits.filter(v => v.store_id === store.id)
    const storeCollections = collections.filter(c => c.store_id === store.id)
    const totalCol = storeCollections.reduce((sum, c) => sum + Number(c.amount), 0)
    const lastVisit = storeVisits.length > 0
      ? storeVisits.sort((a, b) => new Date(b.visited_date) - new Date(a.visited_date))[0].visited_date
      : null
    const visitingSalesmen = [...new Set(storeVisits.map(v => v.salesman_id))]
      .map(id => salesmen.find(s => s.id === id)?.name || '').filter(Boolean)
    return {
      ...store, route_name: getRouteName(store.route_id),
      visitCount: storeVisits.length, totalCollections: totalCol,
      lastVisited: lastVisit, salesmenNames: visitingSalesmen,
    }
  }).sort((a, b) => b.visitCount - a.visitCount)

  return (
    <div className="page-container md:pb-6">
      {/* Header */}
      <div className="mb-5 animate-fade-in-up">
        <h1 className="text-2xl font-bold text-gray-800">Monthly Visit Report / मासिक विजिट रिपोर्ट</h1>
        <p className="text-sm text-gray-500">See which stores were visited on which days</p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-5 animate-fade-in-up" style={{ animationDelay: '50ms' }}>
        {/* Month Navigation */}
        <div className="flex items-center gap-2">
          <button onClick={() => navigateMonth(-1)}
            className="w-9 h-9 rounded-xl bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-all shadow-sm">
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-sm font-bold text-gray-800 min-w-[140px] text-center">{monthName}</span>
          <button onClick={() => navigateMonth(1)}
            disabled={selectedYear === now.getFullYear() && selectedMonth === now.getMonth()}
            className="w-9 h-9 rounded-xl bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-all shadow-sm disabled:opacity-30">
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Salesman Filter */}
        <select
          value={selectedSalesman}
          onChange={(e) => setSelectedSalesman(e.target.value)}
          className="input-field max-w-[200px] py-2 text-sm"
        >
          <option value="all">All Salesmen</option>
          {salesmen.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>

        {/* Search & Sort */}
        <div className="flex items-center gap-2">
          <input 
            type="text" 
            placeholder="Search stores..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field max-w-[180px] py-2 text-sm"
          />
          <button 
            onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
            className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 active:scale-95 transition-all shadow-sm whitespace-nowrap"
          >
            Sort {sortOrder === 'asc' ? 'A-Z ↓' : 'Z-A ↑'}
          </button>
        </div>

        {/* Download Button */}
        <button
          onClick={downloadExcel}
          disabled={relevantStores.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-brand-600 text-white 
            text-sm font-bold rounded-xl shadow-md shadow-brand-600/20
            hover:shadow-lg active:scale-95 transition-all disabled:opacity-40 ml-auto"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Download Excel
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3 mb-5 animate-fade-in-up" style={{ animationDelay: '80ms' }}>
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm text-center">
          <p className="text-2xl font-bold text-brand-600">{visits.length}</p>
          <p className="text-[11px] text-gray-500 font-semibold mt-1">Total Visits / कुल विजिट</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm text-center">
          <p className="text-2xl font-bold text-amber-600">{relevantStores.length}</p>
          <p className="text-[11px] text-gray-500 font-semibold mt-1">Stores Visited / दुकानें</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm text-center">
          <p className="text-2xl font-bold text-gray-700">{stores.length - relevantStores.length}</p>
          <p className="text-[11px] text-gray-500 font-semibold mt-1">Not Visited / बाकी</p>
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="flex bg-gray-100 rounded-xl p-1 mb-5 max-w-sm animate-fade-in-up" style={{ animationDelay: '90ms' }}>
        <button onClick={() => setViewMode('calendar')}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all duration-200 ${
            viewMode === 'calendar' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
          📅 Calendar View
        </button>
        <button onClick={() => setViewMode('storeSummary')}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all duration-200 ${
            viewMode === 'storeSummary' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
          🏪 Store Summary
        </button>
      </div>

      {/* The Grid Table */}
      {viewMode === 'calendar' && loading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto" style={{ borderWidth: '3px' }} />
          <p className="text-sm text-gray-400 mt-3">Loading visits...</p>
        </div>
      ) : viewMode === 'calendar' && filteredStores.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
          <span className="text-4xl block mb-3">📋</span>
          <p className="text-sm text-gray-500">No visits match your search criteria</p>
        </div>
      ) : viewMode === 'calendar' ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-fade-in-up" style={{ animationDelay: '120ms' }}>
          <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: '65vh' }}>
            <table className="w-full text-xs border-collapse" style={{ minWidth: `${180 + daysInMonth * 36}px` }}>
              <thead className="sticky top-0 z-20">
                <tr className="bg-gray-800 text-white shadow-md">
                  <th className="text-left px-3 py-3 font-bold sticky left-0 bg-gray-800 z-30 min-w-[160px]">
                    Store Name / दुकान
                  </th>
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => (
                    <th key={day} className={`text-center px-1 py-3 font-semibold min-w-[32px] 
                      ${isSunday(day) ? 'bg-red-700' : ''}`}>
                      <div className="text-[10px] opacity-60">
                        {new Date(selectedYear, selectedMonth, day).toLocaleString('en-IN', { weekday: 'narrow' })}
                      </div>
                      {day}
                    </th>
                  ))}
                  <th className="text-center px-2 py-3 font-bold bg-gray-900 min-w-[40px]">Total</th>
                </tr>
              </thead>
              <tbody>
                {filteredStores.map((store, idx) => (
                  <tr key={store.id} className={`border-b border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-brand-50/40 transition-colors`}>
                    <td className="px-3 py-2.5 font-semibold text-gray-800 sticky left-0 bg-inherit z-10 border-r border-gray-100">
                      <div className="truncate max-w-[150px]" title={store.name}>{store.name}</div>
                      {store.village && <div className="text-[10px] text-gray-400 font-normal">{store.village}</div>}
                    </td>
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                      const visit = getVisitForDay(store.id, day)
                      return (
                        <td key={day} className={`text-center py-2 border-r border-gray-50 
                          ${isSunday(day) ? 'bg-red-50' : ''}`}>
                          {visit ? (
                            <button
                              onClick={() => setRemarkModal({
                                isOpen: true,
                                storeName: store.name,
                                date: new Date(visit.visited_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }),
                                remark: visit.remarks || 'No specific remarks added.'
                              })}
                              className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-brand-100 text-brand-700 font-bold hover:bg-brand-200 hover:scale-110 transition-all cursor-pointer" 
                              title="Click to view remark"
                            >
                              ✓
                            </button>
                          ) : null}
                        </td>
                      )
                    })}
                    <td className="text-center py-2 font-bold text-brand-700 bg-brand-50/50 border-l border-gray-200">
                      {getVisitCount(store.id)}
                    </td>
                  </tr>
                ))}

                {/* Daily Totals Row */}
                <tr className="bg-gray-800 text-white font-bold border-t-2 border-gray-300">
                  <td className="px-3 py-2.5 sticky left-0 bg-gray-800 z-10">DAILY TOTAL</td>
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                    const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                    const count = visits.filter(v => v.visited_date === dateStr).length
                    return (
                      <td key={day} className={`text-center py-2 ${count > 0 ? 'text-emerald-300' : 'text-gray-500'}`}>
                        {count || '—'}
                      </td>
                    )
                  })}
                  <td className="text-center py-2 bg-gray-900 text-emerald-300 text-sm">
                    {visits.length}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {/* Legend for calendar */}
      {viewMode === 'calendar' && (
        <div className="flex items-center gap-4 mt-4 text-xs text-gray-500 animate-fade-in-up" style={{ animationDelay: '150ms' }}>
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-brand-100 text-brand-700 font-bold text-[10px]">✓</span>
            Visited / विजिट किया
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded bg-red-50 border border-red-200" />
            Sunday / रविवार
          </div>
        </div>
      )}

      {/* Store Summary View */}
      {viewMode === 'storeSummary' && !loading && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-fade-in-up" style={{ animationDelay: '120ms' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-800 text-white">
                <tr>
                  <th className="text-left px-4 py-3 font-bold">Store Name / दुकान</th>
                  <th className="text-left px-4 py-3 font-semibold">Village</th>
                  <th className="text-left px-4 py-3 font-semibold">Route</th>
                  <th className="text-center px-4 py-3 font-semibold">Visits</th>
                  <th className="text-left px-4 py-3 font-semibold">Last Visited</th>
                  <th className="text-left px-4 py-3 font-semibold">Salesman</th>
                  <th className="text-right px-4 py-3 font-semibold">Collections</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {storeSummaryData.map((s, idx) => (
                  <tr key={s.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-brand-50/40 transition-colors`}>
                    <td className="px-4 py-3 font-semibold text-gray-800">
                      <div className="truncate max-w-[180px]" title={s.name}>{s.name}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{s.village || '—'}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">{s.route_name}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full font-bold text-xs ${
                        s.visitCount > 0 ? 'bg-brand-100 text-brand-700' : 'bg-gray-100 text-gray-400'}`}>
                        {s.visitCount}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">
                      {s.lastVisited ? new Date(s.lastVisited).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">{s.salesmenNames.join(', ') || '—'}</td>
                    <td className="px-4 py-3 text-right font-bold whitespace-nowrap">
                      <span className={s.totalCollections > 0 ? 'text-emerald-700' : 'text-gray-400'}>
                        {s.totalCollections > 0 ? `₹${s.totalCollections.toLocaleString('en-IN')}` : '—'}
                      </span>
                    </td>
                  </tr>
                ))}
                {storeSummaryData.length === 0 && (
                  <tr><td colSpan="7" className="text-center py-8 text-gray-400">No store data available</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Remark Modal */}
      <Modal isOpen={remarkModal.isOpen} onClose={() => setRemarkModal({ ...remarkModal, isOpen: false })} title="Visit Details" size="sm">
        <div className="mb-4">
          <p className="text-sm font-bold text-gray-800">{remarkModal.storeName}</p>
          <p className="text-xs text-gray-500">{remarkModal.date}</p>
        </div>
        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{remarkModal.remark}</p>
        </div>
      </Modal>
    </div>
  )
}
