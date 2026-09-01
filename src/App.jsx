import { Route, Routes } from 'react-router-dom'
import AppLayout from './layouts/AppLayout.jsx'
import FarmerPortal from './pages/FarmerPortal.jsx'
import ProcurementCentres from './pages/ProcurementCentres.jsx'
import FarmerRegistration from './pages/FarmerRegistration.jsx'
import BookSlot from './pages/BookSlot.jsx'
import QueueStatus from './pages/QueueStatus.jsx'
import BookingDetails from './pages/BookingDetails.jsx'
import StaffDashboard from './pages/StaffDashboard.jsx'
import AdminDashboard from './pages/AdminDashboard.jsx'
import NotFound from './pages/NotFound.jsx'

function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<FarmerPortal />} />
        <Route path="/centres" element={<ProcurementCentres />} />
        <Route path="/register" element={<FarmerRegistration />} />
        <Route path="/book" element={<BookSlot />} />
        <Route path="/queue" element={<QueueStatus />} />
        <Route path="/booking" element={<BookingDetails />} />
        <Route path="/booking/:bookingId" element={<BookingDetails />} />
        <Route path="/staff" element={<StaffDashboard />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}

export default App
