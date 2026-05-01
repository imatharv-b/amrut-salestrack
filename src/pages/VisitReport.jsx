import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
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

      // Load stores
      let storesQuery = supabase.from('stores').select('id, name, village, route_id').order('name')
      const { data: storesData, error: storesErr } = await storesQuery
      if (storesErr) throw storesErr
      setStores(storesData || [])

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

      {/* The Grid Table */}
      {loading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto" style={{ borderWidth: '3px' }} />
          <p className="text-sm text-gray-400 mt-3">Loading visits...</p>
        </div>
      ) : relevantStores.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
          <span className="text-4xl block mb-3">📋</span>
          <p className="text-sm text-gray-500">No visits recorded for {monthName}</p>
          <p className="text-xs text-gray-400 mt-1">इस महीने कोई विजिट रिकॉर्ड नहीं</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-fade-in-up" style={{ animationDelay: '120ms' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse" style={{ minWidth: `${180 + daysInMonth * 36}px` }}>
              <thead>
                <tr className="bg-gray-800 text-white">
                  <th className="text-left px-3 py-3 font-bold sticky left-0 bg-gray-800 z-10 min-w-[160px]">
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
                {relevantStores.map((store, idx) => (
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
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-brand-100 text-brand-700 font-bold" 
                              title={visit.remarks || 'Visited'}>
                              ✓
                            </span>
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
      )}

      {/* Legend */}
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
    </div>
  )
}
