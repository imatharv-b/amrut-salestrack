import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import LoadingSpinner from './components/LoadingSpinner'

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
  )
}
