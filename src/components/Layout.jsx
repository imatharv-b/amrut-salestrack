import { Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import BottomNav from './BottomNav'
import Sidebar from './Sidebar'

export default function Layout() {
  const { isManager, isSalesman, profile, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop sidebar for manager */}
      {isManager && <Sidebar />}

      {/* Top bar — always visible for salesman, mobile-only for manager (manager has sidebar on desktop) */}
      <header className={`${isManager ? 'md:hidden' : ''} sticky top-0 z-30 bg-white/95 backdrop-blur-xl border-b border-gray-100 shadow-sm`}>
        <div className="flex items-center justify-between px-4 h-14 max-w-5xl mx-auto">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="Amrut" className="w-8 h-8 rounded-lg shadow-sm" />
            <div>
              <h1 className="font-bold text-base text-gray-800 leading-tight">Amrut SalesTrack</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                {profile?.name?.charAt(0) || profile?.full_name?.charAt(0) || 'U'}
              </div>
              <span className="text-xs text-gray-600 font-semibold hidden sm:inline">
                {profile?.name?.split(' ')[0] || profile?.full_name?.split(' ')[0] || ''}
              </span>
            </div>
            <button
              onClick={signOut}
              title="Sign Out"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 text-gray-500 
                hover:bg-red-50 hover:text-red-500 transition-colors text-sm font-medium border border-gray-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main content area */}
      <main className={`${isManager ? 'md:ml-64' : ''}`}>
        <Outlet />
      </main>

      {/* Mobile bottom nav */}
      {isSalesman && <BottomNav />}
      {isManager && <BottomNav />}
    </div>
  )
}
