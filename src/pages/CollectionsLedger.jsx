import { useState, useEffect, Fragment } from 'react'
import { DEMO_MODE, DEMO_STORES, DEMO_INVOICES, DEMO_COLLECTIONS, DEMO_ROUTES, getRouteName, getSalesmanName } from '../lib/demoData'
import EmptyState from '../components/EmptyState'

export default function CollectionsLedger() {
  const [ledgers, setLedgers] = useState([])
  const [routes, setRoutes] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRoute, setFilterRoute] = useState('')
  const [expandedStoreId, setExpandedStoreId] = useState(null)

  useEffect(() => {
    loadLedgers()
  }, [])

  function loadLedgers() {
    if (DEMO_MODE) {
      setRoutes(DEMO_ROUTES)
      
      const ledgerData = DEMO_STORES.map(store => {
        const storeInvoices = DEMO_INVOICES.filter(i => i.store_id === store.id)
        const storeCollections = DEMO_COLLECTIONS.filter(c => c.store_id === store.id).sort((a,b) => new Date(b.payment_date) - new Date(a.payment_date))
        
        const totalInvoiced = storeInvoices.reduce((sum, i) => sum + Number(i.total_amount), 0)
        const totalCollected = storeCollections.reduce((sum, c) => sum + Number(c.amount), 0)
        
        return {
          ...store,
          route_name: getRouteName(store.route_id),
          total_invoiced: totalInvoiced,
          total_collected: totalCollected,
          outstanding: totalInvoiced - totalCollected,
          collections: storeCollections
        }
      })
      setLedgers(ledgerData)
    }
  }

  const filteredLedgers = ledgers.filter(L => {
    const matchSearch = searchTerm === '' || L.name.toLowerCase().includes(searchTerm.toLowerCase()) || L.village?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchRoute = filterRoute === '' || L.route_id === filterRoute
    return matchSearch && matchRoute
  })

  function toggleExpand(id) {
    setExpandedStoreId(prev => prev === id ? null : id)
  }

  return (
    <div className="page-container md:pb-6">
      <div className="mb-6 animate-fade-in-up">
        <h1 className="text-2xl font-bold text-gray-800">Collections Ledger</h1>
        <p className="text-sm text-gray-500">Track invoices, collections, and balance per dealer</p>
      </div>

      <div className="flex gap-3 mb-6 animate-fade-in-up" style={{ animationDelay: '50ms' }}>
        <input 
          type="text" 
          placeholder="🔍 Search dealer or village" 
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)} 
          className="input-field max-w-sm"
        />
        <select 
          value={filterRoute} 
          onChange={(e) => setFilterRoute(e.target.value)} 
          className="input-field max-w-[200px]"
        >
          <option value="">All Routes</option>
          {routes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-fade-in-up" style={{ animationDelay: '100ms' }}>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left px-5 py-4 font-semibold w-1/3">Dealer Name</th>
              <th className="text-left px-5 py-4 font-semibold">Route</th>
              <th className="text-right px-5 py-4 font-semibold">Total Invoiced</th>
              <th className="text-right px-5 py-4 font-semibold">Total Collected</th>
              <th className="text-right px-5 py-4 font-semibold">Balance</th>
              <th className="text-center px-4 py-4 w-12"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredLedgers.length === 0 ? (
              <tr><td colSpan="6" className="py-10"><EmptyState title="No dealers found" /></td></tr>
            ) : filteredLedgers.map(store => (
              <Fragment key={store.id}>
                <tr className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => toggleExpand(store.id)}>
                  <td className="px-5 py-4">
                    <p className="font-semibold text-gray-800">{store.name}</p>
                    <p className="text-xs text-gray-500">{store.village}</p>
                  </td>
                  <td className="px-5 py-4 text-gray-600">{store.route_name}</td>
                  <td className="px-5 py-4 text-right text-gray-700">₹{store.total_invoiced.toLocaleString('en-IN')}</td>
                  <td className="px-5 py-4 text-right text-green-700">₹{store.total_collected.toLocaleString('en-IN')}</td>
                  <td className="px-5 py-4 text-right">
                    <span className={`font-bold ${store.outstanding > 10000 ? 'text-red-600' : store.outstanding > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                      ₹{store.outstanding.toLocaleString('en-IN')}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <button className="text-gray-400 hover:text-brand-600 transition-colors">
                      <svg className={`w-5 h-5 transform transition-transform ${expandedStoreId === store.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </td>
                </tr>
                {/* Expanded Ledger Row */}
                {expandedStoreId === store.id && (
                  <tr className="bg-gray-50/50">
                    <td colSpan="6" className="px-5 py-4 border-l-4 border-l-brand-500">
                      <div className="pl-4">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Payment History</h4>
                        {store.collections.length === 0 ? (
                          <p className="text-sm text-gray-400 italic">No payments recorded</p>
                        ) : (
                          <table className="w-full text-left text-sm mt-2">
                             <thead>
                               <tr className="text-gray-500 text-xs border-b border-gray-200">
                                 <th className="pb-2 font-medium">Date</th>
                                 <th className="pb-2 font-medium">Collected By</th>
                                 <th className="pb-2 font-medium">Mode</th>
                                 <th className="pb-2 font-medium">Remarks</th>
                                 <th className="pb-2 font-medium text-right">Amount</th>
                               </tr>
                             </thead>
                             <tbody className="divide-y divide-gray-100">
                               {store.collections.map(c => (
                                 <tr key={c.id}>
                                   <td className="py-2 text-gray-700">{new Date(c.payment_date).toLocaleDateString('en-IN')}</td>
                                   <td className="py-2 text-gray-700">{getSalesmanName(c.salesman_id)}</td>
                                   <td className="py-2 text-gray-700 uppercase text-xs font-semibold badge bg-gray-200">{c.payment_mode}</td>
                                   <td className="py-2 text-gray-500 text-xs max-w-xs truncate">{c.remarks || '-'}</td>
                                   <td className="py-2 text-right font-semibold text-green-700">₹{Number(c.amount).toLocaleString('en-IN')}</td>
                                 </tr>
                               ))}
                             </tbody>
                          </table>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
