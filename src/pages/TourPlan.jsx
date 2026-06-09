import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import Modal from '../components/Modal'
import EmptyState from '../components/EmptyState'

export default function TourPlan() {
  const { profile } = useAuth()
  const today = new Date()
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(today.getFullYear())
  const [salesmen, setSalesmen] = useState([])
  const [selectedSalesman, setSelectedSalesman] = useState(null)
  
  const [routes, setRoutes] = useState([])
  const [userRoutes, setUserRoutes] = useState([])
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)

  // Modal State
  const [modalOpen, setModalOpen] = useState(false)
  const [activeDate, setActiveDate] = useState(null) // e.g., '2026-06-05'
  const [activeDateRoutes, setActiveDateRoutes] = useState([]) // Route IDs selected in modal
  const [saving, setSaving] = useState(false)

  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate()
  const firstDayOfWeek = new Date(selectedYear, selectedMonth - 1, 1).getDay()

  useEffect(() => { loadInitial() }, [])
  useEffect(() => { 
    if (selectedSalesman) loadMonthData() 
  }, [selectedMonth, selectedYear, selectedSalesman])

  async function loadInitial() {
    try {
      const [uRes, rRes, urRes] = await Promise.all([
        supabase.from('users').select('*').eq('role', 'salesman').order('name'),
        supabase.from('routes').select('*').order('name'),
        supabase.from('user_routes').select('*')
      ])
      const sm = uRes.data || []
      setSalesmen(sm)
      setRoutes(rRes.data || [])
      setUserRoutes(urRes.data || [])
      if (sm.length > 0) setSelectedSalesman(sm[0].id)
    } catch (err) {
      console.error(err)
    }
  }

  async function loadMonthData() {
    if (!selectedSalesman) return
    setLoading(true)
    try {
      const startDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`
      const endDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${daysInMonth}`

      const { data } = await supabase.from('daily_route_assignments')
        .select('*')
        .eq('salesman_id', selectedSalesman)
        .gte('assigned_date', startDate)
        .lte('assigned_date', endDate)

      setAssignments(data || [])
    } catch (err) {
      console.error('Failed to load assignments:', err)
    } finally {
      setLoading(false)
    }
  }

  function navigateMonth(dir) {
    let m = selectedMonth + dir
    let y = selectedYear
    if (m > 12) { m = 1; y += 1 }
    else if (m < 1) { m = 12; y -= 1 }
    setSelectedMonth(m)
    setSelectedYear(y)
  }

  function openDayModal(day) {
    const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const existingRoutes = assignments.filter(a => a.assigned_date === dateStr).map(a => a.route_id)
    setActiveDate(dateStr)
    setActiveDateRoutes(existingRoutes)
    setModalOpen(true)
  }

  function toggleRouteSelection(routeId) {
    setActiveDateRoutes(prev => 
      prev.includes(routeId) ? prev.filter(id => id !== routeId) : [...prev, routeId]
    )
  }

  async function saveDayAssignments() {
    setSaving(true)
    try {
      // 1. Delete existing for this day
      await supabase.from('daily_route_assignments')
        .delete()
        .eq('salesman_id', selectedSalesman)
        .eq('assigned_date', activeDate)

      // 2. Insert new selections
      if (activeDateRoutes.length > 0) {
        const inserts = activeDateRoutes.map(rid => ({
          salesman_id: selectedSalesman,
          route_id: rid,
          assigned_date: activeDate,
          assigned_by: profile?.id
        }))
        await supabase.from('daily_route_assignments').insert(inserts)
      }

      setModalOpen(false)
      loadMonthData() // reload month data
    } catch (err) {
      alert('Failed to save assignments: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const activeSalesmanData = salesmen.find(s => s.id === selectedSalesman)
  const activeSalesmanName = activeSalesmanData?.name || 'Select Salesman'

  // Filter routes to only those assigned to this salesman in their profile
  const assignedRouteIds = userRoutes.filter(ur => ur.user_id === selectedSalesman).map(ur => ur.route_id)
  if (activeSalesmanData?.route_id && !assignedRouteIds.includes(activeSalesmanData.route_id)) {
    assignedRouteIds.push(activeSalesmanData.route_id)
  }
  const salesmanAvailableRoutes = routes.filter(r => assignedRouteIds.includes(r.id))

  return (
    <div className="page-container md:pb-6">
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in-up">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Tour Plan Planner</h1>
          <p className="text-sm text-gray-500">Plan routes day-by-day for each salesman</p>
        </div>
        
        {/* Salesman Selector */}
        <select 
          value={selectedSalesman || ''} 
          onChange={(e) => setSelectedSalesman(e.target.value)}
          className="input-field max-w-xs font-bold text-brand-700 bg-brand-50 border-brand-200"
        >
          {salesmen.map(sm => <option key={sm.id} value={sm.id}>{sm.name}</option>)}
        </select>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center gap-3 mb-6 animate-fade-in-up" style={{ animationDelay: '50ms' }}>
        <button onClick={() => navigateMonth(-1)} className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-all shadow-sm">
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div className="flex-1 text-center">
          <p className="text-lg font-bold text-gray-800">{monthName}</p>
          <p className="text-xs text-gray-400 mt-0.5">Monthly Tour Calendar</p>
        </div>
        <button onClick={() => navigateMonth(1)} className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-all shadow-sm">
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-3 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto" style={{ borderWidth: '3px' }} />
        </div>
      ) : !selectedSalesman ? (
        <EmptyState icon="👥" title="No Salesman Selected" description="Please add or select a salesman to plan their tour." />
      ) : (
        /* Calendar Grid */
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          {/* Days Header */}
          <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200 text-center">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className={`py-3 text-xs font-bold uppercase tracking-wider ${day === 'Sun' ? 'text-red-500' : 'text-gray-500'}`}>
                {day}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 auto-rows-[100px] sm:auto-rows-[120px]">
            {/* Blank spaces for first day */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`blank-${i}`} className="border-b border-r border-gray-100 bg-gray-50/50" />
            ))}

            {/* Actual Days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              const dayOfWeek = new Date(selectedYear, selectedMonth - 1, day).getDay()
              const isSunday = dayOfWeek === 0
              
              const dayAssignments = assignments.filter(a => a.assigned_date === dateStr)
              const hasRoutes = dayAssignments.length > 0
              const isToday = dateStr === today.toISOString().split('T')[0]

              return (
                <button
                  key={day}
                  onClick={() => openDayModal(day)}
                  className={`relative p-2 border-b border-r border-gray-100 text-left transition-all hover:bg-brand-50 active:bg-brand-100 flex flex-col items-start justify-start group
                    ${isSunday ? 'bg-red-50/30' : 'bg-white'}
                    ${isToday ? 'ring-2 ring-inset ring-brand-500' : ''}`}
                >
                  <span className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full mb-1
                    ${isToday ? 'bg-brand-500 text-white' : isSunday ? 'text-red-500' : 'text-gray-700 group-hover:text-brand-600'}`}>
                    {day}
                  </span>
                  
                  <div className="flex-1 w-full overflow-y-auto hide-scrollbar space-y-1">
                    {dayAssignments.map(a => {
                      const rName = routes.find(r => r.id === a.route_id)?.name || 'Unknown'
                      return (
                        <div key={a.route_id} className="text-[10px] sm:text-xs bg-brand-100 text-brand-800 px-1.5 py-0.5 rounded font-semibold truncate" title={rName}>
                          {rName}
                        </div>
                      )
                    })}
                  </div>

                  {!hasRoutes && !isSunday && (
                    <span className="absolute inset-0 m-auto flex items-center justify-center opacity-0 group-hover:opacity-100 text-brand-400 text-2xl font-light">
                      +
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Assignment Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={`Plan for ${new Date(activeDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })}`} size="md">
        <p className="text-sm text-gray-500 mb-4">Assign routes to <strong>{activeSalesmanName}</strong> for this date.</p>
        
        <div className="max-h-64 overflow-y-auto space-y-2 mb-6">
          {salesmanAvailableRoutes.map(r => {
            const isSelected = activeDateRoutes.includes(r.id)
            return (
              <label key={r.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${isSelected ? 'bg-brand-50 border-brand-300 ring-1 ring-brand-300' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleRouteSelection(r.id)}
                  className="w-5 h-5 text-brand-600 rounded border-gray-300 focus:ring-brand-500"
                />
                <span className={`font-semibold ${isSelected ? 'text-brand-800' : 'text-gray-700'}`}>{r.name}</span>
              </label>
            )
          })}
          {salesmanAvailableRoutes.length === 0 && <p className="text-sm text-gray-500 text-center">No routes available for this salesman. Assign them in Manage Users.</p>}
        </div>

        <button 
          onClick={saveDayAssignments} 
          disabled={saving}
          className="btn-primary w-full py-3"
        >
          {saving ? 'Saving...' : 'Save Tour Plan for Day'}
        </button>
      </Modal>
    </div>
  )
}
