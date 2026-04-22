import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import StatCard from '../components/StatCard'
import { DEMO_MODE, DEMO_VISITS, DEMO_COLLECTIONS, DEMO_STORES, DEMO_ROUTES, getStoreName, getStoreOutstanding } from '../lib/demoData'
import { supabase } from '../lib/supabase'

export default function SalesmanHome() {
  const { profile } = useAuth()
  const [todayVisits, setTodayVisits] = useState([])
  const [todayCollections, setTodayCollections] = useState([])
  const [loading, setLoading] = useState(true)

  const today = new Date().toISOString().split('T')[0]
  const greeting = getGreeting()

  function getGreeting() {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good Morning ☀️'
    if (hour < 17) return 'Good Afternoon 🌤️'
    return 'Good Evening 🌙'
  }

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      if (DEMO_MODE) {
        setTodayVisits(DEMO_VISITS.filter(v => v.visit_date === today))
        setTodayCollections(DEMO_COLLECTIONS.filter(c => c.collection_date === today))
      } else {
        const { data: visits } = await supabase
          .from('visits')
          .select('*, stores(name, village)')
          .eq('salesman_id', profile?.id)
          .eq('visit_date', today)

        const { data: collections } = await supabase
          .from('collections')
          .select('*, stores(name)')
          .eq('salesman_id', profile?.id)
          .eq('collection_date', today)

        setTodayVisits(visits || [])
        setTodayCollections(collections || [])
      }
    } catch (err) {
      console.error('Error loading data:', err)
    } finally {
      setLoading(false)
    }
  }

  const totalCollectedToday = todayCollections.reduce((sum, c) => sum + Number(c.amount), 0)

  return (
    <div className="page-container">
      {/* Greeting */}
      <div className="mb-6 animate-fade-in-up">
        <p className="text-sm text-gray-500 font-medium">{greeting}</p>
        <h1 className="text-2xl font-bold text-gray-800">
          {profile?.full_name?.split(' ')[0] || 'Salesman'}
        </h1>
        <p className="text-xs text-gray-400 mt-0.5">
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-6 stagger-children">
        <div className="animate-fade-in-up">
          <StatCard 
            icon="🏪" 
            label="Visits Today" 
            value={todayVisits.length}
            sub="दुकानें visited"
            color="brand" 
          />
        </div>
        <div className="animate-fade-in-up">
          <StatCard 
            icon="💰" 
            label="Collected Today" 
            value={`₹${totalCollectedToday.toLocaleString('en-IN')}`}
            sub="आज की वसूली"
            color="amber" 
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-6 animate-fade-in-up" style={{ animationDelay: '150ms' }}>
        <h2 className="section-header">Quick Actions / त्वरित कार्य</h2>
        <div className="grid grid-cols-2 gap-3">
          <Link
            to="/visit"
            className="flex flex-col items-center gap-2 p-5 bg-brand-50 rounded-2xl border-2 border-brand-100
              active:scale-[0.97] transition-all duration-150 hover:border-brand-300 hover:shadow-md"
          >
            <div className="w-12 h-12 rounded-xl gradient-brand flex items-center justify-center shadow-md shadow-brand-600/25">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-brand-700">Log Visit</span>
            <span className="text-[10px] text-brand-500">विजिट दर्ज करें</span>
          </Link>
          
          <Link
            to="/collect"
            className="flex flex-col items-center gap-2 p-5 bg-amber-50 rounded-2xl border-2 border-amber-100
              active:scale-[0.97] transition-all duration-150 hover:border-amber-300 hover:shadow-md"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-md shadow-amber-500/25">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-amber-700">Record Collection</span>
            <span className="text-[10px] text-amber-500">वसूली दर्ज करें</span>
          </Link>
        </div>
      </div>

      {/* Today's Activity */}
      <div className="animate-fade-in-up" style={{ animationDelay: '200ms' }}>
        <h2 className="section-header">Today's Activity / आज की गतिविधि</h2>
        
        {todayVisits.length === 0 && todayCollections.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-2xl border border-gray-100">
            <span className="text-4xl mb-3 block">📝</span>
            <p className="text-sm text-gray-500">No activity yet today</p>
            <p className="text-xs text-gray-400">आज अभी तक कोई गतिविधि नहीं</p>
          </div>
        ) : (
          <div className="space-y-2">
            {todayVisits.map(visit => (
              <div key={visit.id} className="bg-white rounded-xl p-3.5 border border-gray-100 flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-brand-100 flex items-center justify-center shrink-0">
                  <span className="text-sm">🏪</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">
                    {DEMO_MODE ? getStoreName(visit.store_id) : visit.stores?.name}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{visit.remarks || 'Visit logged'}</p>
                </div>
                <span className="badge-green text-[10px]">Visit ✓</span>
              </div>
            ))}
            {todayCollections.map(col => (
              <div key={col.id} className="bg-white rounded-xl p-3.5 border border-gray-100 flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                  <span className="text-sm">💰</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">
                    {DEMO_MODE ? getStoreName(col.store_id) : col.stores?.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    ₹{Number(col.amount).toLocaleString('en-IN')} • {col.payment_mode?.toUpperCase()}
                  </p>
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
