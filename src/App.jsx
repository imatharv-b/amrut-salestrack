import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import LoadingSpinner from './components/LoadingSpinner'
import React from 'react'

// Auth Pages
import Login from './pages/Login'
import Signup from './pages/Signup'

// Salesman Pages
import SalesmanHome from './pages/SalesmanHome'
import LogVisit from './pages/LogVisit'
import RecordCollection from './pages/RecordCollection'
import MyVisits from './pages/MyVisits'
import MapView from './pages/MapView' 

// Manager Dashboard Pages
import Dashboard from './pages/Dashboard'
import CollectionsLedger from './pages/CollectionsLedger'
import SalesmanPerformance from './pages/SalesmanPerformance'
import ManageRoutes from './pages/ManageRoutes'
import ManageStores from './pages/ManageStores'
import ManageUsers from './pages/ManageUsers'

import { syncOfflineVisits } from './lib/syncVisits'
import { useEffect } from 'react'

// Error Boundary to prevent white screen on uncaught render errors
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('App Error Boundary caught:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center gradient-brand-light p-6">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-xl border border-red-100 text-center">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
              ⚠️
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Something went wrong</h2>
            <p className="text-gray-500 text-sm mb-6">
              {this.state.error?.message || 'An unexpected error occurred. Please try refreshing.'}
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => { window.location.href = '/' }}
                className="px-5 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-semibold shadow-md shadow-brand-600/25 hover:bg-brand-700 active:scale-95 transition-all"
              >
                Go Home
              </button>
              <button
                onClick={() => { window.location.reload() }}
                className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200 active:scale-95 transition-all"
              >
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

function ProtectedRoute({ children, requireRole }) {
  const { user, isManager, isSalesman } = useAuth()
  
  if (!user) return <Navigate to="/login" replace />
  
  if (requireRole === 'manager' && !isManager) return <Navigate to="/" replace />
  if (requireRole === 'salesman' && !isSalesman) return <Navigate to="/" replace />
  
  return children
}

export default function App() {
  const { user, loading, isManager, isSalesman } = useAuth()

  useEffect(() => {
    window.addEventListener('online', syncOfflineVisits)
    // Try to sync on mount in case it came back online when app was closed
    syncOfflineVisits()
    
    return () => window.removeEventListener('online', syncOfflineVisits)
  }, [])

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center gradient-brand-light"><LoadingSpinner size="lg" text="Loading Amrut SalesTrack..." /></div>
  }

  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
        <Route path="/signup" element={!user ? <Signup /> : <Navigate to="/" />} />

        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            
            {/* Default Routing based on Role */}
            <Route path="/" element={
               isManager ? <Dashboard /> : (isSalesman ? <SalesmanHome /> : <div>No Assigned Role</div>)
            } />

            {/* Manager Specific Routes */}
            {isManager && (
              <>
                <Route path="/map" element={<MapView />} />
                <Route path="/ledger" element={<CollectionsLedger />} />
                <Route path="/performance" element={<SalesmanPerformance />} />
                <Route path="/routes" element={<ManageRoutes />} />
                <Route path="/stores" element={<ManageStores />} />
                <Route path="/users" element={<ManageUsers />} />
              </>
            )}

            {/* Salesman Specific Routes */}
            {isSalesman && (
              <>
                <Route path="/visit" element={<LogVisit />} />
                <Route path="/collect" element={<RecordCollection />} />
                <Route path="/my-visits" element={<MyVisits />} />
                <Route path="/map" element={<MapView />} />
              </>
            )}

            {/* Catch-all redirect to Home */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </ErrorBoundary>
  )
}
