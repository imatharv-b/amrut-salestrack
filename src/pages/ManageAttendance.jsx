import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import StatCard from '../components/StatCard'

export default function ManageAttendance() {
  const { profile } = useAuth()
  const [activeTab, setActiveTab] = useState('daily') // 'daily' | 'monthly'
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [records, setRecords] = useState([])
  const [salesmen, setSalesmen] = useState([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(null)

  // Monthly analysis state
  const now = new Date()
  const [analysisMonth, setAnalysisMonth] = useState(now.getMonth())
  const [analysisYear, setAnalysisYear] = useState(now.getFullYear())
  const [monthlyRecords, setMonthlyRecords] = useState([])
  const [monthlyLoading, setMonthlyLoading] = useState(false)

  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    loadData()
  }, [selectedDate])

  useEffect(() => {
    if (activeTab === 'monthly') loadMonthlyData()
  }, [activeTab, analysisMonth, analysisYear])

  async function loadData() {
    setLoading(true)
    try {
      // Load all salesmen
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'salesman')
        .order('name')

      if (usersError) throw usersError
      setSalesmen(usersData || [])

      // Load attendance for selected date
      const { data: attData, error: attError } = await supabase
        .from('attendance')
        .select('*, users!attendance_salesman_id_fkey(name)')
        .eq('date', selectedDate)

      if (attError) {
        // If the join fails, try without it
        const { data: attData2 } = await supabase
          .from('attendance')
          .select('*')
          .eq('date', selectedDate)
        setRecords(attData2 || [])
      } else {
        setRecords(attData || [])
      }
    } catch (err) {
      console.error('Failed to load attendance data:', err)
    } finally {
      setLoading(false)
    }
  }

  async function loadMonthlyData() {
    setMonthlyLoading(true)
    try {
      if (salesmen.length === 0) {
        const { data: usersData } = await supabase
          .from('users').select('*').eq('role', 'salesman').order('name')
        setSalesmen(usersData || [])
      }

      const startDate = `${analysisYear}-${String(analysisMonth + 1).padStart(2, '0')}-01`
      const daysInMonth = new Date(analysisYear, analysisMonth + 1, 0).getDate()
      const endDate = `${analysisYear}-${String(analysisMonth + 1).padStart(2, '0')}-${daysInMonth}`

      const { data: attData, error } = await supabase
        .from('attendance')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)

      if (error) throw error
      setMonthlyRecords(attData || [])
    } catch (err) {
      console.error('Failed to load monthly attendance:', err)
    } finally {
      setMonthlyLoading(false)
    }
  }

  async function handleUpdateStatus(recordId, newStatus) {
    setUpdating(recordId)
    try {
      const { error } = await supabase
        .from('attendance')
        .update({ 
          status: newStatus, 
          approved_by: profile?.id 
        })
        .eq('id', recordId)

      if (error) throw error

      // Refresh data
      await loadData()
    } catch (err) {
      console.error('Failed to update attendance:', err)
      alert('Failed to update: ' + (err.message || 'Unknown error'))
    } finally {
      setUpdating(null)
    }
  }

  async function handleDeleteRecord(recordId) {
    if (!confirm('Are you sure you want to mark this person as absent (delete attendance)?')) return
    setUpdating(recordId)
    try {
      const { error } = await supabase.from('attendance').delete().eq('id', recordId)
      if (error) throw error
      await loadData()
    } catch (err) {
      console.error('Failed to delete attendance:', err)
      alert('Failed to update: ' + (err.message || 'Unknown error'))
    } finally {
      setUpdating(null)
    }
  }

  // Build display list — show all salesmen merged with their attendance records
  const displayList = salesmen.map(sm => {
    const record = records.find(r => r.salesman_id === sm.id)
    return { salesman: sm, record: record || null }
  })

  const totalSalesmen = salesmen.length
  const totalPresent = records.filter(r => r.status === 'approved').length
  const totalPending = records.filter(r => r.status === 'pending').length
  const totalAbsent = totalSalesmen - records.length

  function getStatusStyle(status) {
    switch (status) {
      case 'approved':
        return { bg: 'bg-emerald-50', border: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-700', icon: '✅', label: 'Present' }
      case 'rejected':
        return { bg: 'bg-red-50', border: 'border-red-200', badge: 'bg-red-100 text-red-700', icon: '❌', label: 'Rejected' }
      case 'pending':
        return { bg: 'bg-amber-50', border: 'border-amber-200', badge: 'bg-amber-100 text-amber-700', icon: '⏳', label: 'Pending' }
      default:
        return { bg: 'bg-gray-50', border: 'border-gray-200', badge: 'bg-gray-100 text-gray-500', icon: '—', label: 'Absent' }
    }
  }

  function navigateDate(days) {
    const d = new Date(selectedDate + 'T00:00:00')
    d.setDate(d.getDate() + days)
    const newDate = d.toISOString().split('T')[0]
    if (newDate <= today) setSelectedDate(newDate)
  }

  // Monthly analysis helpers
  const daysInAnalysisMonth = new Date(analysisYear, analysisMonth + 1, 0).getDate()
  const analysisMonthName = new Date(analysisYear, analysisMonth).toLocaleString('en-IN', { month: 'long', year: 'numeric' })

  function isSunday(day) {
    return new Date(analysisYear, analysisMonth, day).getDay() === 0
  }

  function navigateAnalysisMonth(delta) {
    let m = analysisMonth + delta
    let y = analysisYear
    if (m < 0) { m = 11; y-- }
    if (m > 11) { m = 0; y++ }
    if (y > now.getFullYear() || (y === now.getFullYear() && m > now.getMonth())) return
    setAnalysisMonth(m)
    setAnalysisYear(y)
  }

  function getAttendanceForDay(salesmanId, day) {
    const dateStr = `${analysisYear}-${String(analysisMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return monthlyRecords.find(r => r.salesman_id === salesmanId && r.date === dateStr)
  }

  function getSalesmanMonthlyStats(salesmanId) {
    const smRecords = monthlyRecords.filter(r => r.salesman_id === salesmanId)
    const present = smRecords.filter(r => r.status === 'approved').length
    const pending = smRecords.filter(r => r.status === 'pending').length
    const rejected = smRecords.filter(r => r.status === 'rejected').length

    // Calculate working days (exclude Sundays, and don't count future days)
    let workingDays = 0
    const todayDate = new Date()
    for (let d = 1; d <= daysInAnalysisMonth; d++) {
      const dayDate = new Date(analysisYear, analysisMonth, d)
      if (dayDate > todayDate) break
      if (dayDate.getDay() !== 0) workingDays++
    }
    const absent = workingDays - present - pending - rejected
    const percentage = workingDays > 0 ? Math.round((present / workingDays) * 100) : 0

    return { present, pending, rejected, absent: Math.max(0, absent), workingDays, percentage }
  }

  function getDayStatusColor(record) {
    if (!record) return ''
    switch (record.status) {
      case 'approved': return 'bg-emerald-500 text-white'
      case 'pending': return 'bg-amber-400 text-white'
      case 'rejected': return 'bg-red-500 text-white'
      default: return 'bg-gray-300 text-white'
    }
  }

  function getDayStatusIcon(record) {
    if (!record) return ''
    switch (record.status) {
      case 'approved': return '✓'
      case 'pending': return '?'
      case 'rejected': return '✗'
      default: return ''
    }
  }

  return (
    <div className="page-container md:pb-6">
      {/* Header */}
      <div className="mb-6 animate-fade-in-up">
        <h1 className="text-2xl font-bold text-gray-800">Attendance / हाजिरी</h1>
        <p className="text-sm text-gray-500">Approve or reject salesman attendance</p>
      </div>

      {/* Tab Switcher */}
      <div className="flex bg-gray-100 rounded-xl p-1 mb-6 max-w-sm animate-fade-in-up">
        <button
          onClick={() => setActiveTab('daily')}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all duration-200 ${
            activeTab === 'daily' 
              ? 'bg-white text-gray-800 shadow-sm' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          📅 Daily View
        </button>
        <button
          onClick={() => setActiveTab('monthly')}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all duration-200 ${
            activeTab === 'monthly' 
              ? 'bg-white text-gray-800 shadow-sm' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          📊 Monthly Analysis
        </button>
      </div>

      {/* ============ DAILY VIEW ============ */}
      {activeTab === 'daily' && (
        <>
          {/* Date Navigation */}
          <div className="flex items-center gap-3 mb-6 animate-fade-in-up" style={{ animationDelay: '50ms' }}>
            <button
              onClick={() => navigateDate(-1)}
              className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center
                hover:bg-gray-50 active:scale-95 transition-all shadow-sm"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex-1 text-center">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                max={today}
                className="input-field text-center font-semibold max-w-[200px] mx-auto"
              />
              <p className="text-xs text-gray-400 mt-1">
                {selectedDate === today ? "Today / आज" : new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
              </p>
            </div>
            <button
              onClick={() => navigateDate(1)}
              disabled={selectedDate === today}
              className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center
                hover:bg-gray-50 active:scale-95 transition-all shadow-sm disabled:opacity-30"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-4 gap-2 mb-6 stagger-children">
            <div className="animate-fade-in-up">
              <StatCard icon="👥" label="Total" value={totalSalesmen} color="brand" />
            </div>
            <div className="animate-fade-in-up">
              <StatCard icon="✅" label="Present" value={totalPresent} color="brand" />
            </div>
            <div className="animate-fade-in-up">
              <StatCard icon="⏳" label="Pending" value={totalPending} color="amber" />
            </div>
            <div className="animate-fade-in-up">
              <StatCard icon="🚫" label="Absent" value={totalAbsent} color="brand" />
            </div>
          </div>

          {/* Loading */}
          {loading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-3 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto" style={{ borderWidth: '3px' }} />
            </div>
          ) : (
            /* Salesman Cards */
            <div className="space-y-3 animate-fade-in-up" style={{ animationDelay: '150ms' }}>
              {displayList.length === 0 ? (
                <div className="text-center py-10 bg-white rounded-2xl border border-gray-100">
                  <span className="text-4xl mb-3 block">👥</span>
                  <p className="text-sm text-gray-500">No salesmen found</p>
                  <p className="text-xs text-gray-400 mt-1">कोई सेल्समैन नहीं मिला</p>
                </div>
              ) : (
                displayList.map(({ salesman, record }) => {
                  const status = record?.status || null
                  const style = getStatusStyle(status)
                  
                  return (
                    <div
                      key={salesman.id}
                      className={`rounded-2xl border-2 ${record ? style.border : 'border-gray-200'} ${record ? style.bg : 'bg-white'} 
                        p-4 transition-all duration-200 shadow-sm`}
                    >
                      <div className="flex items-center justify-between">
                        {/* Salesman Info */}
                        <div className="flex items-center gap-3">
                          <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm shadow-sm shrink-0
                            ${record ? 'bg-gradient-to-br from-brand-500 to-brand-700 text-white' : 'bg-gray-200 text-gray-500'}`}>
                            {salesman.name?.charAt(0) || '?'}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-800 text-sm">{salesman.name}</p>
                            <p className="text-xs text-gray-500">
                              {record 
                                ? `🕐 Check-in: ${record.check_in_time}`
                                : '— Not marked / हाजिरी नहीं लगाई'
                              }
                            </p>
                            {record?.lat && record?.lng && (
                              <p className="text-[10px] text-gray-400 mt-0.5">📍 {record.lat.toFixed(4)}, {record.lng.toFixed(4)}</p>
                            )}
                          </div>
                        </div>

                        {/* Status / Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          {!record ? (
                            <span className="text-xs text-gray-400 font-semibold bg-gray-100 px-3 py-1.5 rounded-full">
                              Absent
                            </span>
                          ) : status === 'pending' ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleUpdateStatus(record.id, 'approved')}
                                disabled={updating === record.id}
                                className="px-3 py-2 bg-emerald-500 text-white text-xs font-bold rounded-xl 
                                  shadow-md shadow-emerald-500/25 hover:bg-emerald-600 active:scale-95 transition-all
                                  disabled:opacity-50"
                              >
                                {updating === record.id ? '...' : '✓ Approve'}
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(record.id, 'rejected')}
                                disabled={updating === record.id}
                                className="px-3 py-2 bg-red-500 text-white text-xs font-bold rounded-xl 
                                  shadow-md shadow-red-500/25 hover:bg-red-600 active:scale-95 transition-all
                                  disabled:opacity-50"
                              >
                                {updating === record.id ? '...' : '✗ Reject'}
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold ${style.badge}`}>
                                {style.icon} {style.label}
                              </span>
                              <div className="flex flex-col gap-1">
                                <button
                                  onClick={() => handleUpdateStatus(record.id, 'pending')}
                                  disabled={updating === record.id}
                                  className="px-2 py-1 bg-white text-gray-600 border border-gray-200 text-[10px] font-bold rounded-lg hover:bg-gray-50 active:scale-95 transition-all disabled:opacity-50"
                                >
                                  Reset
                                </button>
                                <button
                                  onClick={() => handleDeleteRecord(record.id)}
                                  disabled={updating === record.id}
                                  className="px-2 py-1 bg-white text-red-600 border border-red-200 text-[10px] font-bold rounded-lg hover:bg-red-50 active:scale-95 transition-all disabled:opacity-50"
                                >
                                  Mark Absent
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          )}
        </>
      )}

      {/* ============ MONTHLY ANALYSIS VIEW ============ */}
      {activeTab === 'monthly' && (
        <>
          {/* Month Navigation */}
          <div className="flex items-center gap-3 mb-6 animate-fade-in-up" style={{ animationDelay: '50ms' }}>
            <button onClick={() => navigateAnalysisMonth(-1)}
              className="w-9 h-9 rounded-xl bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-all shadow-sm">
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-sm font-bold text-gray-800 min-w-[140px] text-center">{analysisMonthName}</span>
            <button onClick={() => navigateAnalysisMonth(1)}
              disabled={analysisYear === now.getFullYear() && analysisMonth === now.getMonth()}
              className="w-9 h-9 rounded-xl bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-all shadow-sm disabled:opacity-30">
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {monthlyLoading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto" style={{ borderWidth: '3px' }} />
              <p className="text-sm text-gray-400 mt-3">Loading attendance data...</p>
            </div>
          ) : (
            <div className="space-y-4 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
              {salesmen.map(sm => {
                const stats = getSalesmanMonthlyStats(sm.id)
                return (
                  <div key={sm.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    {/* Salesman Header */}
                    <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white flex items-center justify-center font-bold shadow-sm">
                          {sm.name?.charAt(0) || '?'}
                        </div>
                        <div>
                          <p className="font-bold text-gray-800">{sm.name}</p>
                          <p className="text-xs text-gray-400">{analysisMonthName}</p>
                        </div>
                      </div>
                      {/* Quick Stats */}
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                          <span className="text-emerald-600 font-bold text-sm">{stats.present}</span>
                          <span className="text-emerald-600 text-[10px] font-semibold">Present</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-red-50 px-3 py-1.5 rounded-lg border border-red-200">
                          <span className="text-red-600 font-bold text-sm">{stats.absent}</span>
                          <span className="text-red-600 text-[10px] font-semibold">Absent</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
                          <span className="text-amber-600 font-bold text-sm">{stats.pending}</span>
                          <span className="text-amber-600 text-[10px] font-semibold">Pending</span>
                        </div>
                        <div className={`px-3 py-1.5 rounded-lg font-bold text-sm ${
                          stats.percentage >= 80 ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                          stats.percentage >= 50 ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                          'bg-red-100 text-red-700 border border-red-200'
                        }`}>
                          {stats.percentage}%
                        </div>
                      </div>
                    </div>

                    {/* Calendar Grid */}
                    <div className="px-5 py-4 overflow-x-auto">
                      <div className="flex gap-1 min-w-[500px]">
                        {Array.from({ length: daysInAnalysisMonth }, (_, i) => i + 1).map(day => {
                          const record = getAttendanceForDay(sm.id, day)
                          const sunday = isSunday(day)
                          const dayDate = new Date(analysisYear, analysisMonth, day)
                          const isFuture = dayDate > new Date()

                          return (
                            <div key={day} className="flex flex-col items-center" style={{ minWidth: '26px' }}>
                              <span className={`text-[9px] font-semibold mb-1 ${sunday ? 'text-red-400' : 'text-gray-400'}`}>
                                {new Date(analysisYear, analysisMonth, day).toLocaleString('en-IN', { weekday: 'narrow' })}
                              </span>
                              <div
                                className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold transition-all
                                  ${isFuture ? 'bg-gray-100 text-gray-300' :
                                    sunday ? 'bg-red-100 text-red-400' :
                                    record ? getDayStatusColor(record) :
                                    'bg-gray-200 text-gray-400'
                                  }`}
                                title={`${day} - ${
                                  isFuture ? 'Future' :
                                  sunday ? 'Sunday' :
                                  record ? record.status :
                                  'Absent'
                                }`}
                              >
                                {isFuture ? '' : sunday ? 'S' : record ? getDayStatusIcon(record) : '—'}
                              </div>
                              <span className={`text-[8px] mt-0.5 ${sunday ? 'text-red-400' : 'text-gray-400'}`}>{day}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Legend */}
                    <div className="px-5 pb-3 flex items-center gap-3 text-[10px] text-gray-400 border-t border-gray-50 pt-2">
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500 inline-block" /> Present</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-400 inline-block" /> Pending</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500 inline-block" /> Rejected</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-200 inline-block" /> Absent</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-100 inline-block" /> Sunday</span>
                    </div>
                  </div>
                )
              })}
              {salesmen.length === 0 && (
                <div className="text-center py-10 bg-white rounded-2xl border border-gray-100">
                  <span className="text-4xl mb-3 block">👥</span>
                  <p className="text-sm text-gray-500">No salesmen found</p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
