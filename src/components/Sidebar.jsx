import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const managerLinks = [
  { to: '/', label: 'Overview Dashboard', icon: '📊' },
  { to: '/map', label: 'Live Map', icon: '🗺️' },
  { to: '/ledger', label: 'Collections Ledger', icon: '🧾' },
  { to: '/performance', label: 'Salesman Performance', icon: '👥' },
]

export default function Sidebar() {
  const { profile, signOut } = useAuth()
  const location = useLocation()

  return (
    <aside className="hidden md:flex flex-col w-64 bg-gray-900 text-white min-h-screen fixed left-0 top-0 z-30">
      {/* Brand Header */}
      <div className="p-5 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-brand flex items-center justify-center text-white font-bold text-lg shadow-lg">
            A
          </div>
          <div>
            <h1 className="font-bold text-base text-white">Amrut SalesTrack</h1>
            <p className="text-xs text-gray-400">Field Sales Manager</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {managerLinks.map((link) => {
          const isActive = location.pathname === link.to
          return (
            <NavLink
              key={link.to}
              to={link.to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium 
                transition-all duration-200
                ${isActive 
                  ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/25' 
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
            >
              <span className="text-lg w-7 text-center">{link.icon}</span>
              {link.label}
            </NavLink>
          )
        })}
      </nav>

      {/* User section */}
      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-brand-600 flex items-center justify-center text-white font-bold text-sm">
            {profile?.full_name?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{profile?.full_name || 'User'}</p>
            <p className="text-xs text-gray-400 capitalize">{profile?.role || 'Manager'}</p>
          </div>
        </div>
        <button
          onClick={signOut}
          className="w-full text-left px-3 py-2 rounded-xl text-sm text-gray-400 
            hover:text-red-400 hover:bg-gray-800 transition-colors duration-200 
            flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sign Out
        </button>
      </div>
    </aside>
  )
}
