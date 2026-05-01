import { useState, useEffect, Fragment } from 'react'
import { supabase } from '../lib/supabase'
import EmptyState from '../components/EmptyState'

export default function CollectionsLedger() {
  const [ledgers, setLedgers] = useState([])
  const [routes, setRoutes] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRoute, setFilterRoute] = useState('')
  const [expandedStoreId, setExpandedStoreId] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadLedgers()
  }, [])

  async function loadLedgers() {
    setLoading(true)
    try {
      // Fetch stores, routes, invoices, collections from Supabase
      const [storesRes, routesRes, invoicesRes, collectionsRes, usersRes] = await Promise.all([
        supabase.from('stores').select('*').order('name'),
        supabase.from('routes').select('*').order('name'),
        supabase.from('invoices').select('*'),
        supabase.from('collections').select('*'),
        supabase.from('users').select('id, name').eq('role', 'salesman'),
      ])

      const stores = storesRes.data || []
      const routesList = routesRes.data || []
      const invoices = invoicesRes.data || []
      const collections = collectionsRes.data || []
      const salesmen = usersRes.data || []

      setRoutes(routesList)

      // Helper to get route name
      function getRouteName(routeId) {
        if (!routeId) return '—'
        return routesList.find(r => r.id === routeId)?.name || '—'
      }

      // Helper to get salesman name
      function getSalesmanName(salesmanId) {
        if (!salesmanId) return '—'
        return salesmen.find(s => s.id === salesmanId)?.name || '—'
      }

      const ledgerData = stores.map(store => {
        const storeInvoices = invoices.filter(i => i.store_id === store.id)
        const storeCollections = collections
          .filter(c => c.store_id === store.id)
          .sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date))
          .map(c => ({ ...c, salesman_name: getSalesmanName(c.salesman_id) }))

        const totalInvoiced = storeInvoices.reduce((sum, i) => sum + Number(i.total_amount || 0), 0)
        const totalCollected = storeCollections.reduce((sum, c) => sum + Number(c.amount || 0), 0)

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
    } catch (err) {
      console.error('Failed to load ledger data:', err)
    } finally {
      setLoading(false)
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
        <p className="text-sm text-gray-500">Track invoices, collections, and balance per Krishi Kendra</p>
      </div>

      <div className="flex gap-3 mb-6 animate-fade-in-up" style={{ animationDelay: '50ms' }}>
        <input 
          type="text" 
          placeholder="🔍 Search Krishi Kendra or village" 
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

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="w-8 h-8 border-brand-200 border-t-brand-600 rounded-full animate-spin" style={{borderWidth:'3px'}} />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-5 py-4 font-semibold w-1/3">Krishi Kendra</th>
                  <th className="text-left px-5 py-4 font-semibold">Route</th>
                  <th className="text-right px-5 py-4 font-semibold whitespace-nowrap">Total Invoiced</th>
                  <th className="text-right px-5 py-4 font-semibold whitespace-nowrap">Total Collected</th>
                  <th className="text-right px-5 py-4 font-semibold">Balance</th>
                  <th className="text-center px-4 py-4 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredLedgers.length === 0 ? (
                  <tr><td colSpan="6" className="py-10"><EmptyState title="No Krishi Kendras found" /></td></tr>
                ) : filteredLedgers.map(store => (
                  <Fragment key={store.id}>
                    <tr className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => toggleExpand(store.id)}>
                      <td className="px-5 py-4 min-w-[150px]">
                        <p className="font-semibold text-gray-800">{store.name}</p>
                        <p className="text-xs text-gray-500">{store.village}</p>
                      </td>
                      <td className="px-5 py-4 text-gray-600 whitespace-nowrap">{store.route_name}</td>
                      <td className="px-5 py-4 text-right text-gray-700 whitespace-nowrap">₹{store.total_invoiced.toLocaleString('en-IN')}</td>
                      <td className="px-5 py-4 text-right text-green-700 whitespace-nowrap">₹{store.total_collected.toLocaleString('en-IN')}</td>
                      <td className="px-5 py-4 text-right whitespace-nowrap">
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
                          <div className="pl-4 overflow-x-auto">
                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Payment History</h4>
                            {store.collections.length === 0 ? (
                              <p className="text-sm text-gray-400 italic">No payments recorded</p>
                            ) : (
                              <table className="w-full text-left text-sm mt-2 min-w-[400px]">
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
                                       <td className="py-2 text-gray-700 whitespace-nowrap">{new Date(c.payment_date).toLocaleDateString('en-IN')}</td>
                                       <td className="py-2 text-gray-700 whitespace-nowrap">{c.salesman_name}</td>
                                       <td className="py-2 text-gray-700 uppercase text-xs font-semibold"><span className="px-2 py-1 bg-gray-200 rounded">{c.payment_mode}</span></td>
                                       <td className="py-2 text-gray-500 text-xs max-w-xs truncate">{c.remarks || '-'}</td>
                                       <td className="py-2 text-right font-semibold text-green-700 whitespace-nowrap">₹{Number(c.amount).toLocaleString('en-IN')}</td>
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
      )}
    </div>
  )
}
