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

      {/* Mobile top bar */}
      <header className="md:hidden sticky top-0 z-30 bg-white/90 backdrop-blur-lg border-b border-gray-100">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg gradient-brand flex items-center justify-center text-white font-bold text-sm shadow-md">
              A
            </div>
            <h1 className="font-bold text-base text-gray-800">SalesTrack</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-medium">
              {profile?.full_name?.split(' ')[0]}
            </span>
            <button
              onClick={signOut}
              className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Main content area */}
      <main className={`${isManager ? 'md:ml-64' : ''}`}>
        <Outlet />
      </main>

      {/* Mobile bottom nav for salesman */}
      {isSalesman && <BottomNav />}
      {/* Manager also gets bottom nav on mobile for quick access */}
      {isManager && <BottomNav />}
    </div>
  )
}
