export default function StoreCard({ store, outstanding, routeName, onClick }) {
  const getOutstandingColor = (amount) => {
    if (amount <= 0) return 'badge-green'
    if (amount <= 10000) return 'badge-amber'
    return 'badge-red'
  }

  return (
    <div 
      className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm 
        active:scale-[0.98] transition-all duration-150 cursor-pointer hover:shadow-md"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-800 truncate">{store.name}</h3>
          <p className="text-sm text-gray-500">{store.village}, {store.district}</p>
        </div>
        {outstanding !== undefined && (
          <span className={getOutstandingColor(outstanding)}>
            ₹{outstanding?.toLocaleString('en-IN')}
          </span>
        )}
      </div>
      
      <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
        {routeName && (
          <span className="inline-flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            {routeName}
          </span>
        )}
        {store.owner_name && (
          <span className="inline-flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            {store.owner_name}
          </span>
        )}
      </div>
    </div>
  )
}
