import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { DEMO_MODE, DEMO_STORES, DEMO_ROUTES, DEMO_COLLECTIONS, getRouteName } from '../lib/demoData'
import { supabase } from '../lib/supabase'

export default function RecordCollection() {
  const { profile } = useAuth()
  const [stores, setStores] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStore, setSelectedStore] = useState(null)
  const [amount, setAmount] = useState('')
  const [paymentMode, setPaymentMode] = useState('cash')
  const [collectionDate, setCollectionDate] = useState(new Date().toISOString().split('T')[0])
  const [remarks, setRemarks] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    loadStores()
  }, [])

  async function loadStores() {
    if (DEMO_MODE) {
      setStores(DEMO_STORES)
    } else {
      const { data } = await supabase
        .from('stores')
        .select('*, routes(name)')
        .eq('is_active', true)
        .order('name')
      setStores(data || [])
    }
  }

  const filteredStores = stores.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.village?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.owner_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  async function handleSubmit(e) {
    e.preventDefault()
    if (!selectedStore || !amount) return
    setLoading(true)

    try {
      if (DEMO_MODE) {
        DEMO_COLLECTIONS.push({
          id: `col-${Date.now()}`,
          store_id: selectedStore.id,
          salesman_id: profile?.id || 'demo-salesman-1',
          amount: Number(amount),
          payment_mode: paymentMode,
          collection_date: collectionDate,
          remarks,
          created_at: new Date().toISOString(),
        })
      } else {
        const { error } = await supabase.from('collections').insert({
          store_id: selectedStore.id,
          salesman_id: profile.id,
          amount: Number(amount),
          payment_mode: paymentMode,
          collection_date: collectionDate,
          remarks,
        })
        if (error) throw error
      }

      setSuccess(true)
      setAmount('')
      setRemarks('')
      setSelectedStore(null)
      setSearchTerm('')
      
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      alert('Error saving collection: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="mb-6 animate-fade-in-up">
        <h1 className="text-xl font-bold text-gray-800">Record Collection / वसूली दर्ज करें</h1>
        <p className="text-sm text-gray-500 mt-1">Collect payment from dealer</p>
      </div>

      {/* Success */}
      {success && (
        <div className="mb-4 p-4 rounded-xl bg-green-50 border border-green-200 text-green-700 text-center animate-fade-in-up">
          <span className="text-2xl block mb-1">💰✅</span>
          <p className="font-semibold">Collection Saved!</p>
          <p className="text-xs text-green-500">वसूली सफलतापूर्वक दर्ज हो गई</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Store Search */}
        {!selectedStore ? (
          <div className="animate-fade-in-up">
            <label className="input-label">Select Dealer / दुकान चुनें</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="🔍 Search by name, village..."
              className="input-field mb-3"
            />
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {filteredStores.map(store => (
                <button
                  key={store.id}
                  type="button"
                  onClick={() => setSelectedStore(store)}
                  className="w-full text-left p-3.5 bg-white rounded-xl border border-gray-200 
                    hover:border-brand-300 hover:bg-brand-50 active:scale-[0.98] transition-all duration-150"
                >
                  <p className="font-semibold text-sm text-gray-800">{store.name}</p>
                  <p className="text-xs text-gray-500">
                    {store.village} • {DEMO_MODE ? getRouteName(store.route_id) : store.routes?.name}
                  </p>
                </button>
              ))}
              {filteredStores.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">No stores found</p>
              )}
            </div>
          </div>
        ) : (
          <div className="animate-fade-in-up">
            <label className="input-label">Selected Store</label>
            <div className="p-4 bg-brand-50 rounded-xl border-2 border-brand-200 flex items-center justify-between">
              <div>
                <p className="font-semibold text-brand-800">{selectedStore.name}</p>
                <p className="text-xs text-brand-600">{selectedStore.village}</p>
              </div>
              <button
                type="button"
                onClick={() => { setSelectedStore(null); setSearchTerm('') }}
                className="text-xs text-brand-600 font-medium underline"
              >
                Change
              </button>
            </div>
          </div>
        )}

        {/* Amount */}
        {selectedStore && (
          <div className="animate-fade-in-up">
            <label className="input-label">Amount / राशि (₹)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-gray-400">₹</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="input-field text-2xl font-bold pl-10 text-center h-16"
                required
                min="1"
                inputMode="numeric"
              />
            </div>
          </div>
        )}

        {/* Payment Mode */}
        {selectedStore && (
          <div className="animate-fade-in-up">
            <label className="input-label">Payment Mode / भुगतान का तरीका</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMode('cash')}
                className={`p-4 rounded-xl border-2 text-center transition-all duration-150
                  ${paymentMode === 'cash' 
                    ? 'border-brand-500 bg-brand-50 shadow-sm' 
                    : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
              >
                <span className="text-2xl block mb-1">💵</span>
                <span className={`text-sm font-semibold ${paymentMode === 'cash' ? 'text-brand-700' : 'text-gray-600'}`}>
                  Cash / नकद
                </span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMode('upi')}
                className={`p-4 rounded-xl border-2 text-center transition-all duration-150
                  ${paymentMode === 'upi' 
                    ? 'border-brand-500 bg-brand-50 shadow-sm' 
                    : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
              >
                <span className="text-2xl block mb-1">📱</span>
                <span className={`text-sm font-semibold ${paymentMode === 'upi' ? 'text-brand-700' : 'text-gray-600'}`}>
                  UPI
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Date */}
        {selectedStore && (
          <div className="animate-fade-in-up">
            <label className="input-label">Date / तारीख</label>
            <input
              type="date"
              value={collectionDate}
              onChange={(e) => setCollectionDate(e.target.value)}
              className="input-field"
            />
          </div>
        )}

        {/* Remarks */}
        {selectedStore && (
          <div className="animate-fade-in-up">
            <label className="input-label">Remarks / टिप्पणी (optional)</label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g., Against bill #142"
              className="input-field"
            />
          </div>
        )}

        {/* Submit */}
        {selectedStore && amount && (
          <div className="animate-fade-in-up pt-2">
            <button
              type="submit"
              disabled={loading}
              className="btn-primary text-xl py-5 bg-gradient-to-r from-amber-500 to-amber-600 
                shadow-amber-500/25"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </span>
              ) : (
                <>Save Collection 💰</>
              )}
            </button>
          </div>
        )}
      </form>
    </div>
  )
}
