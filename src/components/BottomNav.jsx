import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const salesmanLinks = [
  { to: '/', label: 'Home', icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg> },
  { to: '/attendance', label: 'Attend', icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg> },
  { to: '/visit', label: 'Visit', icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
  { to: '/collect', label: 'Collect', icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg> },
  { to: '/my-visits', label: 'History', icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
]

const managerLinks = [
  { to: '/', label: 'Dash', icon: <span className="text-xl leading-none">📊</span> },
  { to: '/attendance', label: 'Attend', icon: <span className="text-xl leading-none">📋</span> },
  { to: '/map', label: 'Map', icon: <span className="text-xl leading-none">🗺️</span> },
  { to: '/ledger', label: 'Ledger', icon: <span className="text-xl leading-none">🧾</span> },
]

const extraManagerMenu = [
  { to: '/performance', label: 'Salesman Performance', icon: '👥' },
  { to: '/visit-report', label: 'Visit Report', icon: '📅' },
  { to: '/routes', label: 'Manage Routes', icon: '🛣️' },
  { to: '/stores', label: 'Manage Stores', icon: '🏪' },
  { to: '/users', label: 'Manage Users', icon: '🛡️' },
]

export default function BottomNav() {
  const location = useLocation()
  const { isManager } = useAuth()
  const [showMenu, setShowMenu] = useState(false)

  const linksToUse = isManager ? managerLinks : salesmanLinks
  const isExtraMenuActive = isManager && extraManagerMenu.some(m => m.to === location.pathname)

  return (
    <>
      {/* Mobile Drawer Menu for Managers */}
      {isManager && (
        <div className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity md:hidden ${showMenu ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setShowMenu(false)}>
          <div className={`absolute bottom-16 left-0 right-0 bg-white rounded-t-3xl shadow-2xl transition-transform transform ${showMenu ? 'translate-y-0' : 'translate-y-full'}`} onClick={e => e.stopPropagation()}>
            <div className="p-5 pb-8">
              <h3 className="text-lg font-bold text-gray-800 mb-4 px-2">More Options</h3>
              <div className="grid grid-cols-3 gap-4">
                {extraManagerMenu.map(item => (
                  <NavLink key={item.to} to={item.to} onClick={() => setShowMenu(false)} className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-gray-50 active:scale-95 transition-transform border border-gray-100">
                    <span className="text-2xl">{item.icon}</span>
                    <span className="text-[10px] font-semibold text-gray-600 text-center leading-tight">{item.label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-t border-gray-200 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] md:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
          {linksToUse.map((link) => {
            const isActive = location.pathname === link.to
            return (
              <NavLink key={link.to} to={link.to} className={`flex flex-col items-center justify-center w-14 h-full gap-0.5 transition-all duration-200 ${isActive ? 'text-brand-600' : 'text-gray-400 active:text-gray-600'}`}>
                <div className={`transition-transform duration-200 flex items-center justify-center h-6 ${isActive ? 'scale-110' : ''}`}>{link.icon}</div>
                <span className={`text-[10px] font-semibold ${isActive ? 'text-brand-600' : 'text-gray-400'}`}>{link.label}</span>
                {isActive && <div className="absolute bottom-1 w-6 h-1 bg-brand-600 rounded-full" />}
              </NavLink>
            )
          })}
          
          {/* Extra Menu Button for Managers */}
          {isManager && (
            <button onClick={() => setShowMenu(!showMenu)} className={`flex flex-col items-center justify-center w-14 h-full gap-0.5 transition-all duration-200 ${isExtraMenuActive || showMenu ? 'text-brand-600' : 'text-gray-400 active:text-gray-600'}`}>
              <div className={`transition-transform duration-200 flex items-center justify-center h-6 ${(isExtraMenuActive || showMenu) ? 'scale-110' : ''}`}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
              </div>
              <span className={`text-[10px] font-semibold ${isExtraMenuActive || showMenu ? 'text-brand-600' : 'text-gray-400'}`}>Menu</span>
              {(isExtraMenuActive || showMenu) && <div className="absolute bottom-1 w-6 h-1 bg-brand-600 rounded-full" />}
            </button>
          )}
        </div>
      </nav>
    </>
  )
}
