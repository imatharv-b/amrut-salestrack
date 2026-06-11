import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import StatCard from '../components/StatCard'
import { supabase } from '../lib/supabase'

export default function SalesmanHome() {
  const { profile, signOut } = useAuth()
  const [todayVisits, setTodayVisits] = useState([])
  const [todayCollections, setTodayCollections] = useState([])
  const [dailyRoutes, setDailyRoutes] = useState([])
  const [assignedStores, setAssignedStores] = useState([])
  const [broadcasts, setBroadcasts] = useState([])
  const [loading, setLoading] = useState(true)
  const today = new Date().toISOString().split('T')[0]

  function getGreeting() {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good Morning'
    if (hour < 17) return 'Good Afternoon'
    return 'Good Evening'
  }

  useEffect(() => { loadData() }, [])

  async function loadData() {
    try {
      const [vRes, cRes, dailyRes, broadcastRes] = await Promise.all([
        supabase.from('visits').select('*, stores(name, village)').eq('salesman_id', profile?.id).eq('visited_date', today),
        supabase.from('collections').select('*, stores(name)').eq('salesman_id', profile?.id).eq('payment_date', today),
        supabase.from('daily_route_assignments').select('*, routes(name)').eq('salesman_id', profile?.id).eq('assigned_date', today),
        supabase.from('chat_messages').select('message, created_at').is('receiver_id', null).order('created_at', { ascending: false }).limit(3)
      ])
      setTodayVisits(vRes.data || [])
      setTodayCollections(cRes.data || [])
      setBroadcasts(broadcastRes.data || [])
      const routes = dailyRes.data || []
      setDailyRoutes(routes)

      if (routes.length > 0) {
        const routeIds = routes.map(r => r.route_id)
        const { data: storeData } = await supabase.from('stores').select('id, name, village, route_id').in('route_id', routeIds).order('name')
        setAssignedStores(storeData || [])
      }
    } catch (err) { console.error(err) } finally { setLoading(false) }
  }

  const totalCollectedToday = todayCollections.reduce((sum, c) => sum + Number(c.amount), 0)

  return (
    <div className="page-container">
      <div className="mb-6 animate-fade-in-up flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{getGreeting()} ☀️</p>
          <h1 className="text-2xl font-bold text-gray-800">{profile?.name?.split(' ')[0] || 'Salesman'}</h1>
          <p className="text-xs text-gray-400 mt-0.5">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
        <button onClick={signOut} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all shadow-sm active:scale-95 text-sm font-bold mt-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          Logout
        </button>
      </div>

      {broadcasts.length > 0 && (
        <div className="mb-6 animate-fade-in-up bg-amber-50 border border-amber-200 rounded-xl overflow-hidden shadow-sm relative overflow-hidden">
          <div className="bg-gradient-to-r from-amber-400 to-amber-500 px-4 py-2.5 flex items-center gap-2 shadow-sm relative z-10">
            <span className="text-xl animate-pulse">📢</span>
            <h3 className="font-bold text-white text-sm tracking-wide uppercase">Manager Announcements</h3>
          </div>
          <div className="divide-y divide-amber-100/50 relative z-10">
            {broadcasts.map((b, i) => (
              <div key={i} className="p-4 bg-white/40 backdrop-blur-sm hover:bg-white/60 transition-colors">
                <p className="text-gray-800 text-[15px] whitespace-pre-wrap leading-snug font-medium">{b.message}</p>
                <p className="text-[10px] text-amber-600 mt-2 font-bold uppercase tracking-wider">
                  {new Date(b.created_at).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {dailyRoutes.length > 0 && (
        <div className="mb-6 animate-fade-in-up bg-brand-50 border border-brand-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center shrink-0 text-xl">🎯</div>
            <div>
              <h3 className="font-bold text-brand-800 text-sm">Today's Assigned Route</h3>
              <p className="text-xs text-brand-600 mt-0.5 font-medium">{dailyRoutes.map(d => d.routes?.name).join(', ')}</p>
            </div>
          </div>
          
          <div className="mt-3 bg-white rounded-lg border border-brand-100 overflow-hidden">
            <div className="bg-brand-100/50 px-3 py-2 border-b border-brand-100 flex justify-between items-center">
              <p className="text-xs font-bold text-brand-800">Target Stores for Today</p>
              <span className="text-[10px] bg-brand-200 text-brand-800 px-2 py-0.5 rounded font-bold">{assignedStores.length} Stores</span>
            </div>
            <div className="max-h-48 overflow-y-auto divide-y divide-gray-50">
              {assignedStores.length === 0 ? (
                <p className="text-xs text-gray-500 p-3 text-center">No stores found in this route.</p>
              ) : (
                assignedStores.map(store => (
                  <div key={store.id} className="p-2.5 flex justify-between items-center hover:bg-gray-50 transition-colors">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{store.name}</p>
                      <p className="text-[10px] text-gray-500">{store.village || 'No village specified'}</p>
                    </div>
                    {todayVisits.some(v => v.store_id === store.id) ? (
                      <span className="text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded-md font-bold">✓ Visited</span>
                    ) : (
                      <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-1 rounded-md font-medium">Pending</span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mb-6 stagger-children">
        <div className="animate-fade-in-up"><StatCard icon="🏪" label="Visits Today" value={todayVisits.length} sub="दुकानें visited" color="brand" /></div>
        <div className="animate-fade-in-up"><StatCard icon="💰" label="Collected Today" value={`₹${totalCollectedToday.toLocaleString('en-IN')}`} sub="आज की वसूली" color="amber" /></div>
      </div>

      <div className="mb-6 animate-fade-in-up" style={{ animationDelay: '150ms' }}>
        <h2 className="section-header">Quick Actions / त्वरित कार्य</h2>
        <div className="grid grid-cols-4 gap-2">
          <Link to="/attendance" className="flex flex-col items-center gap-2 p-3 bg-teal-50 rounded-2xl border-2 border-teal-100 active:scale-[0.97] transition-all duration-150 hover:border-teal-300 hover:shadow-md">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center shadow-md shadow-teal-500/25"><svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg></div>
            <span className="text-[11px] font-semibold text-teal-700">Attendance</span>
            <span className="text-[10px] text-teal-500">हाजिरी</span>
          </Link>
          <Link to="/visit" className="flex flex-col items-center gap-2 p-3 bg-brand-50 rounded-2xl border-2 border-brand-100 active:scale-[0.97] transition-all duration-150 hover:border-brand-300 hover:shadow-md">
            <div className="w-11 h-11 rounded-xl gradient-brand flex items-center justify-center shadow-md shadow-brand-600/25"><svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg></div>
            <span className="text-[11px] font-semibold text-brand-700">Log Visit</span>
            <span className="text-[10px] text-brand-500">विजिट दर्ज</span>
          </Link>
          <Link to="/collect" className="flex flex-col items-center gap-2 p-3 bg-amber-50 rounded-2xl border-2 border-amber-100 active:scale-[0.97] transition-all duration-150 hover:border-amber-300 hover:shadow-md">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-md shadow-amber-500/25"><svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg></div>
            <span className="text-[11px] font-semibold text-amber-700">Collect</span>
            <span className="text-[10px] text-amber-500">वसूली</span>
          </Link>
          <Link to="/add-store" className="flex flex-col items-center gap-2 p-3 bg-purple-50 rounded-2xl border-2 border-purple-100 active:scale-[0.97] transition-all duration-150 hover:border-purple-300 hover:shadow-md">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-md shadow-purple-500/25"><svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg></div>
            <span className="text-[11px] font-semibold text-purple-700">Add Store</span>
            <span className="text-[10px] text-purple-500">कृषी केंद्र</span>
          </Link>
        </div>
      </div>

      <div className="animate-fade-in-up" style={{ animationDelay: '200ms' }}>
        <h2 className="section-header">Today's Activity / आज की गतिविधि</h2>
        {loading ? (
          <div className="flex justify-center p-8"><div className="w-8 h-8 border-brand-200 border-t-brand-600 rounded-full animate-spin" style={{ borderWidth: '3px' }} /></div>
        ) : todayVisits.length === 0 && todayCollections.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-2xl border border-gray-100">
            <span className="text-4xl mb-3 block">📝</span>
            <p className="text-sm text-gray-500">No activity yet today</p>
            <p className="text-xs text-gray-400">आज अभी तक कोई गतिविधि नहीं</p>
          </div>
        ) : (
          <div className="space-y-2">
            {todayVisits.map(v => (
              <div key={v.id} className="bg-white rounded-xl p-3.5 border border-gray-100 flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-brand-100 flex items-center justify-center shrink-0"><span className="text-sm">🏪</span></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{v.stores?.name || 'Store'}</p>
                  <p className="text-xs text-gray-500 truncate">{v.remarks || 'Visit logged'}</p>
                </div>
                <span className="badge-green text-[10px]">Visit ✓</span>
              </div>
            ))}
            {todayCollections.map(c => (
              <div key={c.id} className="bg-white rounded-xl p-3.5 border border-gray-100 flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center shrink-0"><span className="text-sm">💰</span></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{c.stores?.name || 'Store'}</p>
                  <p className="text-xs text-gray-500">₹{Number(c.amount).toLocaleString('en-IN')} • {c.payment_mode?.toUpperCase()}</p>
                </div>
                <span className="badge-amber text-[10px]">₹ Collected</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
