import { Routes, Route, useLocation } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import Navigation from './components/Navigation'
import Home from './pages/Home'
import Register from './pages/Register'
import Login from './pages/Login'
import Donate from './pages/Donate'
import Dashboard from './pages/Dashboard'
import Admin from './pages/Admin'
import ResetPassword from './pages/ResetPassword'
import Trophies from './pages/Trophies'
const Awards = Trophies
import Messages from './pages/Messages'
const LegacyIntake = lazy(() => import('./pages/LegacyIntake'))

function App() {
  const location = useLocation()
  const hideNav = location.pathname === '/legacy' || location.pathname === '/alumni'
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-700 via-purple-600 to-purple-700">
      {!hideNav && <Navigation />}
      <Suspense fallback={<div className="text-white p-4">Loading...</div>}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/donate" element={<Donate />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/awards" element={<Awards />} />
        <Route path="/trophies" element={<Awards />} />
        <Route path="/legacy" element={<LegacyIntake />} />
        <Route path="/alumni" element={<LegacyIntake />} />
      </Routes>
      </Suspense>
    </div>
  )
}

export default App
