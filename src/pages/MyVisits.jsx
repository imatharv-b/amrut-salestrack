import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import EmptyState from '../components/EmptyState'

export default function MyVisits() {
  const { profile } = useAuth()
  const [visits, setVisits] = useState([])
  const [loading, setLoading] = useState(true)
  const [dateFilter, setDateFilter] = useState('all')

  useEffect(() => { loadVisits() }, [dateFilter])

  async function loadVisits() {
    setLoading(true)
    try {
      let query = supabase.from('visits').select('*, stores(name, village)').eq('salesman_id', profile?.id).order('visited_date', { ascending: false })
      if (dateFilter === 'today') query = query.eq('visited_date', new Date().toISOString().split('T')[0])
      else if (dateFilter === 'week') query = query.gte('visited_date', new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0])
      const { data } = await query.limit(50)
      setVisits(data || [])
    } catch (err) { console.error(err) } finally { setLoading(false) }
  }

  return (
    <div className="page-container">
      <div className="mb-5 animate-fade-in-up"><h1 className="text-xl font-bold text-gray-800">My Visits / मेरी विजिट्स</h1></div>
      <div className="flex gap-2 mb-5 animate-fade-in-up" style={{ animationDelay: '50ms' }}>
        {[{ key: 'all', label: 'All' }, { key: 'today', label: 'Today' }, { key: 'week', label: 'This Week' }].map(f => (
          <button key={f.key} onClick={() => setDateFilter(f.key)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${dateFilter === f.key ? 'bg-brand-600 text-white shadow-md shadow-brand-600/25' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>{f.label}</button>
        ))}
      </div>
      {loading ? (
        <div className="text-center py-8"><div className="w-8 h-8 border-3 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto" style={{ borderWidth: '3px' }} /></div>
      ) : visits.length === 0 ? (
        <EmptyState icon="📋" title="No visits found" description="Start logging visits to see them here" />
      ) : (
        <div className="space-y-3 stagger-children">
          {visits.map(visit => (
            <div key={visit.id} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm animate-fade-in-up">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold text-gray-800">🏪 {visit.stores?.name || 'Store'}</p>
                  <p className="text-xs text-gray-500">{visit.stores?.village ? visit.stores.village + ' • ' : ''}{new Date(visit.visited_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
                <span className="badge-green">✓</span>
              </div>
              {visit.remarks && (<p className="text-sm text-gray-600 bg-gray-50 p-2.5 rounded-lg mt-1">💬 {visit.remarks}</p>)}
              {visit.stock_remaining && (<p className="text-sm text-blue-600 bg-blue-50 p-2.5 rounded-lg mt-1.5">📦 Stock: {visit.stock_remaining}</p>)}
              {visit.follow_up_date && (
                <div className="mt-1.5 p-2.5 rounded-lg bg-amber-50 border border-amber-100">
                  <p className="text-sm text-amber-700 font-medium">📅 Follow-up: {new Date(visit.follow_up_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  {visit.follow_up_note && (<p className="text-xs text-amber-600 mt-0.5">{visit.follow_up_note}</p>)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
