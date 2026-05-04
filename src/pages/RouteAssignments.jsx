import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import StatCard from '../components/StatCard'
import EmptyState from '../components/EmptyState'

export default function RouteAssignments() {
  const { profile } = useAuth()
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [salesmen, setSalesmen] = useState([])
  const [routes, setRoutes] = useState([])
  const [userRoutes, setUserRoutes] = useState([])
  const [dailyAssignments, setDailyAssignments] = useState([])
  const [stores, setStores] = useState([])
  const [visits, setVisits] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(null) // ID of salesman being updated

  const today = new Date().toISOString().split('T')[0]

  useEffect(() => { loadData() }, [selectedDate])

  async function loadData() {
    setLoading(true)
    try {
      const [uRes, rRes, urRes, daRes, sRes, vRes] = await Promise.all([
        supabase.from('users').select('*').eq('role', 'salesman').order('name'),
        supabase.from('routes').select('*').order('name'),
        supabase.from('user_routes').select('*'),
        supabase.from('daily_route_assignments').select('*').eq('assigned_date', selectedDate),
        supabase.from('stores').select('id, route_id'),
        supabase.from('visits').select('id, store_id, salesman_id').eq('visited_date', selectedDate)
      ])

      setSalesmen(uRes.data || [])
      setRoutes(rRes.data || [])
      setUserRoutes(urRes.data || [])
      setDailyAssignments(daRes.data || [])
      setStores(sRes.data || [])
      setVisits(vRes.data || [])
    } catch (err) {
      console.error('Failed to load route assignments:', err)
    } finally {
      setLoading(false)
    }
  }

  async function toggleDailyAssignment(salesmanId, routeId) {
    setSaving(`${salesmanId}-${routeId}`)
    try {
      const existing = dailyAssignments.find(da => da.salesman_id === salesmanId && da.route_id === routeId)
      
      if (existing) {
        await supabase.from('daily_route_assignments').delete().eq('id', existing.id)
        setDailyAssignments(prev => prev.filter(da => da.id !== existing.id))
      } else {
        const newAssignment = {
          salesman_id: salesmanId,
          route_id: routeId,
          assigned_date: selectedDate,
          assigned_by: profile?.id
        }
        const { data, error } = await supabase.from('daily_route_assignments').insert(newAssignment).select()
        if (error) throw error
        if (data && data[0]) {
          setDailyAssignments(prev => [...prev, data[0]])
        }
      }
    } catch (err) {
      console.error('Failed to toggle assignment:', err)
      alert('Error updating assignment: ' + err.message)
    } finally {
      setSaving(null)
    }
  }

  function navigateDate(days) {
    const d = new Date(selectedDate + 'T00:00:00')
    d.setDate(d.getDate() + days)
    setSelectedDate(d.toISOString().split('T')[0])
  }

  // Calculate Route Analysis Stats
  let totalAssignedRoutes = 0
  let totalTargetStores = 0
  let totalVisitedStores = 0

  salesmen.forEach(sm => {
    const smAssignments = dailyAssignments.filter(da => da.salesman_id === sm.id).map(da => da.route_id)
    totalAssignedRoutes += smAssignments.length
    
    // Find stores in these assigned routes
    const targetStoresForSm = stores.filter(s => smAssignments.includes(s.route_id))
    totalTargetStores += targetStoresForSm.length

    // Find visits by this salesman to those stores
    const targetStoreIds = targetStoresForSm.map(s => s.id)
    const visitsBySm = visits.filter(v => v.salesman_id === sm.id && targetStoreIds.includes(v.store_id))
    // Count unique stores visited
    const uniqueVisits = new Set(visitsBySm.map(v => v.store_id)).size
    totalVisitedStores += uniqueVisits
  })

  const coveragePercent = totalTargetStores > 0 ? Math.round((totalVisitedStores / totalTargetStores) * 100) : 0

  return (
    <div className="page-container md:pb-6">
      {/* Header */}
      <div className="mb-6 animate-fade-in-up">
        <h1 className="text-2xl font-bold text-gray-800">Daily Route Assignments</h1>
        <p className="text-sm text-gray-500">Task salesmen and analyze route coverage</p>
      </div>

      {/* Date Navigation */}
      <div className="flex items-center gap-3 mb-6 animate-fade-in-up" style={{ animationDelay: '50ms' }}>
        <button
          onClick={() => navigateDate(-1)}
          className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-all shadow-sm"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div className="flex-1 text-center">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="input-field text-center font-semibold max-w-[200px] mx-auto"
          />
          <p className="text-xs text-gray-400 mt-1">
            {selectedDate === today ? "Today / आज" : new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
          </p>
        </div>
        <button
          onClick={() => navigateDate(1)}
          className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-all shadow-sm"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-2 mb-6 stagger-children">
        <div className="animate-fade-in-up">
          <StatCard icon="🗺️" label="Routes Assigned" value={totalAssignedRoutes} color="brand" />
        </div>
        <div className="animate-fade-in-up">
          <StatCard icon="🏪" label="Target Stores" value={totalTargetStores} color="amber" />
        </div>
        <div className="animate-fade-in-up">
          <StatCard icon="✅" label="Coverage" value={`${coveragePercent}%`} sub={`${totalVisitedStores} visited`} color="brand" />
        </div>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="text-center py-8">
          <div className="w-8 h-8 border-3 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto" style={{ borderWidth: '3px' }} />
        </div>
      ) : (
        /* Salesman Cards */
        <div className="space-y-4 animate-fade-in-up" style={{ animationDelay: '150ms' }}>
          {salesmen.length === 0 ? (
            <EmptyState icon="👥" title="No salesmen found" description="Add salesmen to assign them routes." />
          ) : (
            salesmen.map((sm) => {
              // Show ALL routes as per user request so manager can assign any route
              let smAvailableRoutes = routes.map(r => r.id)
              
              const smAssignments = dailyAssignments.filter(da => da.salesman_id === sm.id).map(da => da.route_id)
              
              // Compute individual analysis
              const smTargetStores = stores.filter(s => smAssignments.includes(s.route_id))
              const smVisits = visits.filter(v => v.salesman_id === sm.id && smTargetStores.some(s => s.id === v.store_id))
              const smUniqueVisits = new Set(smVisits.map(v => v.store_id)).size
              const smCoverage = smTargetStores.length > 0 ? Math.round((smUniqueVisits / smTargetStores.length) * 100) : 0

              return (
                <div key={sm.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                  {/* Salesman Header */}
                  <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-sm">
                        {sm.name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">{sm.name}</p>
                        <p className="text-xs text-gray-500">{routes.length} total routes</p>
                      </div>
                    </div>
                    {smAssignments.length > 0 && (
                      <div className="text-right">
                        <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">Coverage</p>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-green-500" style={{ width: `${smCoverage}%` }} />
                          </div>
                          <span className="text-xs font-bold text-gray-700">{smCoverage}%</span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Routes Assignment List */}
                  <div className="p-3">
                    {smAvailableRoutes.length === 0 ? (
                      <p className="text-xs text-gray-500 text-center py-2">No routes assigned to this salesman in profile.</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {smAvailableRoutes.map(routeId => {
                          const route = routes.find(r => r.id === routeId)
                          if (!route) return null
                          
                          const isAssignedToday = smAssignments.includes(routeId)
                          const isUpdating = saving === `${sm.id}-${routeId}`
                          
                          // Store count for this specific route
                          const routeStores = stores.filter(s => s.route_id === routeId).length
                          
                          return (
                            <button
                              key={routeId}
                              onClick={() => toggleDailyAssignment(sm.id, routeId)}
                              disabled={isUpdating}
                              className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all
                                ${isAssignedToday 
                                  ? 'bg-brand-50 border-brand-300 ring-1 ring-brand-300 shadow-sm' 
                                  : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                }
                                ${isUpdating ? 'opacity-50' : 'active:scale-[0.98]'}`}
                            >
                              <div>
                                <p className={`text-sm font-semibold ${isAssignedToday ? 'text-brand-800' : 'text-gray-700'}`}>
                                  {route.name}
                                </p>
                                <p className="text-[10px] text-gray-500 mt-0.5">{routeStores} stores</p>
                              </div>
                              <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0
                                ${isAssignedToday ? 'bg-brand-600 border-brand-600 text-white' : 'border-gray-300'}`}>
                                {isAssignedToday && <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
