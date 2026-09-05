import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import RoleRoute from './components/RoleRoute.jsx'
import { useAuth } from './context/useAuth.js'
import AppLayout from './layouts/AppLayout.jsx'
import AdminDashboard from './pages/AdminDashboard.jsx'
import BookSlot from './pages/BookSlot.jsx'
import BookingDetails from './pages/BookingDetails.jsx'
import FarmerPortal from './pages/FarmerPortal.jsx'
import FarmerRegistration from './pages/FarmerRegistration.jsx'
import FarmerSignup from './pages/FarmerSignup.jsx'
import Login from './pages/Login.jsx'
import NotFound from './pages/NotFound.jsx'
import ProcurementCentres from './pages/ProcurementCentres.jsx'
import QueueStatus from './pages/QueueStatus.jsx'
import StaffDashboard from './pages/StaffDashboard.jsx'
import Unauthorized from './pages/Unauthorized.jsx'

function RootLanding() {
  const { userRole } = useAuth()

  if (userRole === 'admin') return <Navigate to="/admin" replace />
  if (userRole === 'staff') return <Navigate to="/staff" replace />
  if (userRole === 'farmer') return <FarmerPortal />

  return <Navigate to="/login" replace />
}

function App() {
  return (
    <Routes>
      {/* Standalone Authentication Pages (No Sidebar, No Top Search Bar) */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<FarmerSignup />} />

      {/* Main Authenticated Layout with Sidebar & Header */}
      <Route element={<AppLayout />}>
        {/* Error / Unauthorized */}
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* Protected Application Routes */}
        <Route element={<ProtectedRoute />}>
          {/* Farmer-facing portal and booking actions */}
          <Route path="/" element={<RootLanding />} />
          <Route element={<RoleRoute allowedRoles={['farmer']} />}>
            <Route path="/centres" element={<ProcurementCentres />} />
            <Route path="/register" element={<FarmerRegistration />} />
            <Route path="/book" element={<BookSlot />} />
            <Route path="/queue" element={<QueueStatus />} />
            <Route path="/booking" element={<BookingDetails />} />
            <Route path="/booking/:bookingId" element={<BookingDetails />} />
          </Route>

          {/* Staff operations console */}
          <Route element={<RoleRoute allowedRoles={['staff', 'admin']} />}>
            <Route path="/staff" element={<StaffDashboard />} />
          </Route>

          {/* District Admin Executive Dashboard */}
          <Route element={<RoleRoute allowedRoles={['admin']} />}>
            <Route path="/admin" element={<AdminDashboard />} />
          </Route>
        </Route>

        {/* 404 Fallback */}
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}

export default App

