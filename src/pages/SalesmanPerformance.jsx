import { useState, useEffect } from 'react'
import { DEMO_MODE, DEMO_USERS, DEMO_VISITS, DEMO_COLLECTIONS, DEMO_STORES, getStoreName, getRouteName } from '../lib/demoData'
import Modal from '../components/Modal'

export default function SalesmanPerformance() {
  const [performance, setPerformance] = useState([])
  const [selectedSalesman, setSelectedSalesman] = useState(null)
  
  const today = new Date()
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]

  useEffect(() => {
    loadPerformance()
  }, [])

  function loadPerformance() {
    if (DEMO_MODE) {
      // Find all salesmen from our demo profiles
      const salesmenIDs = [DEMO_USERS.salesman, DEMO_USERS.salesman2].map(u => u.profile)
      
      const pData = salesmenIDs.map(sm => {
        // Visits this month
        const smVisits = DEMO_VISITS.filter(v => v.salesman_id === sm.id && v.visited_date >= firstDayOfMonth)
        
        // Collections this month
        const smCols = DEMO_COLLECTIONS.filter(c => c.salesman_id === sm.id && c.payment_date >= firstDayOfMonth)
        const totalCol = smCols.reduce((sum, c) => sum + Number(c.amount), 0)

        // Pending stores on route
        const routeStores = DEMO_STORES.filter(s => s.route_id === sm.route_id)
        let pending = 0
        routeStores.forEach(s => {
          const v = DEMO_VISITS.filter(v => v.store_id === s.id).sort((a,b) => new Date(b.visited_date) - new Date(a.visited_date))[0]
          // If no visit, or visit older than 30 days, count as pending
          if (!v || new Date(v.visited_date) < new Date(today - 30 * 86400000)) pending++
        })

        return {
          id: sm.id,
          name: sm.name,
          route_name: getRouteName(sm.route_id),
          monthVisits: smVisits.length,
          monthCollections: totalCol,
          pendingStores: pending,
          totalAssigned: routeStores.length,
          recentLogs: smVisits.sort((a,b) => new Date(b.visited_date) - new Date(a.visited_date))
        }
      })

      setPerformance(pData)
    }
  }

  return (
    <div className="page-container md:pb-6">
      <div className="mb-6 animate-fade-in-up">
        <h1 className="text-2xl font-bold text-gray-800">Salesman Performance</h1>
        <p className="text-sm text-gray-500">Overview of activities for {today.toLocaleString('en-IN', { month: 'long', year: 'numeric' })}</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-fade-in-up" style={{ animationDelay: '50ms' }}>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left px-6 py-4 font-semibold">Salesman Name</th>
              <th className="text-left px-6 py-4 font-semibold">Primary Route</th>
              <th className="text-center px-6 py-4 font-semibold">Visits (Month)</th>
              <th className="text-right px-6 py-4 font-semibold">Collections (Month)</th>
              <th className="text-center px-6 py-4 font-semibold">Pending Stores</th>
              <th className="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
             {performance.map(p => (
               <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                 <td className="px-6 py-4">
                   <div className="flex items-center gap-3">
                     <div className="w-8 h-8 rounded-full gradient-brand text-white flex items-center justify-center font-bold shadow-sm">
                       {p.name.charAt(0)}
                     </div>
                     <span className="font-semibold text-gray-800">{p.name}</span>
                   </div>
                 </td>
                 <td className="px-6 py-4 text-gray-600">{p.route_name}</td>
                 <td className="px-6 py-4 text-center font-semibold text-brand-600">{p.monthVisits}</td>
                 <td className="px-6 py-4 text-right font-semibold text-amber-600">₹{p.monthCollections.toLocaleString('en-IN')}</td>
                 <td className="px-6 py-4 text-center">
                    <div className="flex flex-col items-center">
                      <span className={`text-lg font-bold ${p.pendingStores > 5 ? 'text-red-500' : 'text-gray-700'}`}>{p.pendingStores}</span>
                      <span className="text-[10px] text-gray-400">out of {p.totalAssigned}</span>
                    </div>
                 </td>
                 <td className="px-6 py-4 text-center">
                    <button onClick={() => setSelectedSalesman(p)} className="text-sm font-semibold text-brand-600 hover:text-brand-800 underline">
                      View Logs
                    </button>
                 </td>
               </tr>
             ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={!!selectedSalesman} onClose={() => setSelectedSalesman(null)} title={`${selectedSalesman?.name} — Visit Logs`} size="md">
        <div className="space-y-4">
           {selectedSalesman?.recentLogs?.length === 0 ? (
             <p className="text-center text-gray-500 py-6">No visits logged this month.</p>
           ) : (
             selectedSalesman?.recentLogs?.map(v => (
               <div key={v.id} className="p-3 bg-white border border-gray-200 rounded-xl shadow-sm">
                 <div className="flex justify-between items-start mb-2">
                   <div>
                     <p className="font-bold text-gray-800">{getStoreName(v.store_id)}</p>
                     <p className="text-xs text-gray-500">{new Date(v.visited_date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
                   </div>
                   <span className="badge-green text-[10px]">Visited</span>
                 </div>
                 {v.remarks ? (
                   <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">{v.remarks}</p>
                 ) : (
                   <p className="text-xs text-gray-400 italic">No remarks added.</p>
                 )}
               </div>
             ))
           )}
        </div>
      </Modal>

    </div>
  )
}
