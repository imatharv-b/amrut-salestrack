import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import StatCard from '../components/StatCard'

export default function ManageAttendance() {
  const { profile } = useAuth()
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [records, setRecords] = useState([])
  const [salesmen, setSalesmen] = useState([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(null)

  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    loadData()
  }, [selectedDate])

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

  return (
    <div className="page-container md:pb-6">
      {/* Header */}
      <div className="mb-6 animate-fade-in-up">
        <h1 className="text-2xl font-bold text-gray-800">Attendance / हाजिरी</h1>
        <p className="text-sm text-gray-500">Approve or reject salesman attendance</p>
      </div>

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
                        <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold ${style.badge}`}>
                          {style.icon} {style.label}
                        </span>
                      )}
                    </div>
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
