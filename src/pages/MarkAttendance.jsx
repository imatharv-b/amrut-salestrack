import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

export default function MarkAttendance() {
  const { profile } = useAuth()
  const [todayRecord, setTodayRecord] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [marking, setMarking] = useState(false)
  const [gps, setGps] = useState(null)

  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    loadAttendance()
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {},
        { enableHighAccuracy: true, timeout: 10000 }
      )
    }
  }, [])

  async function loadAttendance() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('salesman_id', profile?.id)
        .order('date', { ascending: false })
        .limit(8)

      if (error) throw error

      const todayRec = (data || []).find(a => a.date === today)
      setTodayRecord(todayRec || null)
      setHistory((data || []).filter(a => a.date !== today).slice(0, 7))
    } catch (err) {
      console.error('Failed to load attendance:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleMarkAttendance() {
    if (!profile?.id) return
    setMarking(true)
    try {
      const now = new Date()
      const checkInTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

      const { error } = await supabase.from('attendance').insert({
        salesman_id: profile.id,
        date: today,
        check_in_time: checkInTime,
        status: 'pending',
        lat: gps?.lat || null,
        lng: gps?.lng || null,
      })

      if (error) {
        if (error.code === '23505') {
          // Unique constraint — already marked
          alert('Attendance already marked for today!')
        } else {
          throw error
        }
      }

      // Reload to get fresh data
      await loadAttendance()
    } catch (err) {
      console.error('Error marking attendance:', err)
      alert('Failed to mark attendance: ' + (err.message || 'Unknown error'))
    } finally {
      setMarking(false)
    }
  }

  function getStatusConfig(status) {
    switch (status) {
      case 'approved':
        return { label: 'Approved / स्वीकृत', icon: '✅', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-700' }
      case 'rejected':
        return { label: 'Rejected / अस्वीकृत', icon: '❌', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', badge: 'bg-red-100 text-red-700' }
      case 'pending':
        return { label: 'Pending / प्रतीक्षारत', icon: '⏳', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-700' }
      default:
        return { label: 'Unknown', icon: '❓', bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-600', badge: 'bg-gray-100 text-gray-600' }
    }
  }

  function formatDate(dateStr) {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
  }

  if (loading) {
    return (
      <div className="page-container flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto mb-3" style={{ borderWidth: '3px' }} />
          <p className="text-sm text-gray-500">Loading attendance...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="mb-6 animate-fade-in-up">
        <h1 className="text-xl font-bold text-gray-800">Attendance / हाजिरी</h1>
        <p className="text-sm text-gray-500 mt-1">
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          {gps && <span className="text-green-500 ml-2">📍 GPS Active</span>}
        </p>
      </div>

      {/* Today's Status */}
      <div className="mb-6 animate-fade-in-up" style={{ animationDelay: '50ms' }}>
        {todayRecord ? (
          <div className={`p-5 rounded-2xl border-2 ${getStatusConfig(todayRecord.status).border} ${getStatusConfig(todayRecord.status).bg}`}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-gray-800 text-lg">Today's Attendance</h2>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${getStatusConfig(todayRecord.status).badge}`}>
                {getStatusConfig(todayRecord.status).icon} {getStatusConfig(todayRecord.status).label}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/60 rounded-xl p-3">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Check-in Time</p>
                <p className="text-lg font-bold text-gray-800 mt-0.5">{todayRecord.check_in_time}</p>
              </div>
              <div className="bg-white/60 rounded-xl p-3">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Status</p>
                <p className={`text-lg font-bold mt-0.5 ${getStatusConfig(todayRecord.status).text}`}>
                  {todayRecord.status === 'pending' ? 'Waiting...' : todayRecord.status === 'approved' ? 'Present ✓' : 'Rejected'}
                </p>
              </div>
            </div>
            {todayRecord.status === 'pending' && (
              <p className="text-xs text-amber-600 mt-3 text-center font-medium animate-pulse-soft">
                ⏳ Manager will approve your attendance / प्रबंधक आपकी हाजिरी स्वीकृत करेंगे
              </p>
            )}
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-gradient-to-br from-brand-50 to-emerald-50 border-2 border-brand-200 text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-brand-500 to-emerald-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-brand-500/30">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-gray-800 mb-1">Mark Today's Attendance</h2>
            <p className="text-sm text-gray-500 mb-5">आज की हाजिरी दर्ज करें</p>
            <button
              onClick={handleMarkAttendance}
              disabled={marking}
              className="w-full max-w-xs mx-auto py-4 px-8 bg-gradient-to-r from-brand-600 to-emerald-600 text-white 
                font-bold text-lg rounded-2xl shadow-lg shadow-brand-600/30
                active:scale-[0.97] transition-all duration-150 disabled:opacity-50"
            >
              {marking ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Marking...
                </span>
              ) : (
                <>📋 Mark Present / हाजिर</>
              )}
            </button>
            <p className="text-[10px] text-gray-400 mt-3">
              {gps ? `📍 Location: ${gps.lat.toFixed(4)}, ${gps.lng.toFixed(4)}` : '📍 Getting location...'}
            </p>
          </div>
        )}
      </div>

      {/* 7-Day History */}
      <div className="animate-fade-in-up" style={{ animationDelay: '100ms' }}>
        <h2 className="section-header">Recent History / पिछली हाजिरी</h2>
        {history.length === 0 ? (
          <div className="text-center py-8 bg-white rounded-2xl border border-gray-100">
            <span className="text-3xl mb-2 block">📅</span>
            <p className="text-sm text-gray-400">No attendance history yet</p>
            <p className="text-xs text-gray-300 mt-1">अभी तक कोई हाजिरी रिकॉर्ड नहीं</p>
          </div>
        ) : (
          <div className="space-y-2">
            {history.map(record => {
              const cfg = getStatusConfig(record.status)
              return (
                <div key={record.id} className="bg-white rounded-xl p-4 border border-gray-100 flex items-center gap-3 shadow-sm">
                  <div className={`w-10 h-10 rounded-xl ${cfg.bg} flex items-center justify-center text-lg shrink-0`}>
                    {cfg.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800">{formatDate(record.date)}</p>
                    <p className="text-xs text-gray-500">Check-in: {record.check_in_time}</p>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold ${cfg.badge}`}>
                    {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
