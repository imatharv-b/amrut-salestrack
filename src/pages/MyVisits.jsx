import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { DEMO_MODE, DEMO_VISITS, getStoreName } from '../lib/demoData'
import { supabase } from '../lib/supabase'
import EmptyState from '../components/EmptyState'

export default function MyVisits() {
  const { profile } = useAuth()
  const [visits, setVisits] = useState([])
  const [loading, setLoading] = useState(true)
  const [dateFilter, setDateFilter] = useState('all')

  useEffect(() => {
    loadVisits()
  }, [dateFilter])

  async function loadVisits() {
    setLoading(true)
    try {
      if (DEMO_MODE) {
        let filtered = [...DEMO_VISITS].sort((a, b) => new Date(b.visit_date) - new Date(a.visit_date))
        
        if (dateFilter === 'today') {
          const today = new Date().toISOString().split('T')[0]
          filtered = filtered.filter(v => v.visit_date === today)
        } else if (dateFilter === 'week') {
          const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
          filtered = filtered.filter(v => v.visit_date >= weekAgo)
        }
        
        setVisits(filtered)
      } else {
        let query = supabase
          .from('visits')
          .select('*, stores(name, village)')
          .eq('salesman_id', profile?.id)
          .order('visit_date', { ascending: false })

        if (dateFilter === 'today') {
          query = query.eq('visit_date', new Date().toISOString().split('T')[0])
        } else if (dateFilter === 'week') {
          const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
          query = query.gte('visit_date', weekAgo)
        }

        const { data } = await query.limit(50)
        setVisits(data || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-container">
      <div className="mb-5 animate-fade-in-up">
        <h1 className="text-xl font-bold text-gray-800">My Visits / मेरी विजिट्स</h1>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-5 animate-fade-in-up" style={{ animationDelay: '50ms' }}>
        {[
          { key: 'all', label: 'All' },
          { key: 'today', label: 'Today' },
          { key: 'week', label: 'This Week' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setDateFilter(f.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200
              ${dateFilter === f.key 
                ? 'bg-brand-600 text-white shadow-md shadow-brand-600/25' 
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Visits list */}
      {loading ? (
        <div className="text-center py-8">
          <div className="w-8 h-8 border-3 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto" style={{ borderWidth: '3px' }} />
        </div>
      ) : visits.length === 0 ? (
        <EmptyState 
          icon="📋"
          title="No visits found"
          description="Start logging visits to see them here"
        />
      ) : (
        <div className="space-y-3 stagger-children">
          {visits.map(visit => (
            <div key={visit.id} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm animate-fade-in-up">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold text-gray-800">
                    {DEMO_MODE ? getStoreName(visit.store_id) : visit.stores?.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {DEMO_MODE ? '' : visit.stores?.village + ' • '}
                    {new Date(visit.visit_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <span className="badge-green">✓</span>
              </div>
              {visit.remarks && (
                <p className="text-sm text-gray-600 bg-gray-50 p-2.5 rounded-lg mt-1">{visit.remarks}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
