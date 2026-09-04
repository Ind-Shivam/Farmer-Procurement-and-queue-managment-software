import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { centres } from '../data/centres.js'
import { useAuth } from '../context/useAuth.js'
import { useBookings } from '../context/useBookings.js'

function FarmerPortal() {
  const { userProfile, currentUser } = useAuth()

  const { bookings } = useBookings()
  const [showSupportModal, setShowSupportModal] = useState(false)

  const farmerName = userProfile?.name || currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Ramesh Singh'

  // Identify active booking for the current farmer or latest system booking
  const activeBooking = useMemo(() => {
    if (!bookings || bookings.length === 0) return null
    // Try to find a scheduled or active booking for current user
    const userPhone = userProfile?.mobile
    if (userPhone) {
      const match = bookings.find((b) => b.mobile === userPhone && !['Completed', 'Cancelled', 'Rejected'].includes(b.status))
      if (match) return match
    }
    // Fallback to latest scheduled booking
    return bookings[0] || null
  }, [bookings, userProfile])

  // Calculate totals and metrics
  const totalQuintals = useMemo(() => {
    const sum = bookings.reduce((acc, b) => acc + (Number(b.quantity) || 0), 0)
    return sum > 0 ? sum : 120
  }, [bookings])

  const recentPaymentAmount = useMemo(() => {
    if (activeBooking?.quantity) {
      return Number(activeBooking.quantity) * 2275 // MSP rate
    }
    return 45000
  }, [activeBooking])

  // Centre name lookup
  const centreName = useMemo(() => {
    if (!activeBooking) return 'Krishi Mandi - Sector A'
    const found = centres.find((c) => c.id === activeBooking.centreId)
    return found ? found.name : 'Krishi Mandi - Sector A'
  }, [activeBooking])

  // Display slot date & time
  const slotDateDisplay = activeBooking?.date || 'Oct 24, 2023'
  const slotTimeDisplay = activeBooking?.slotId ? activeBooking.slotId.split('_')[2] : '10:00 AM'

  // Token code
  const tokenCode = activeBooking?.token || '452'

  // Recent procurement history list
  const historyList = useMemo(() => {
    const staticHistory = [
      { id: 'h1', date: 'Oct 10, 2023', crop: 'Wheat', quantity: '45.5', status: 'Processed' },
      { id: 'h2', date: 'Sep 28, 2023', crop: 'Soybean', quantity: '30.0', status: 'Processed' },
      { id: 'h3', date: 'Sep 15, 2023', crop: 'Wheat', quantity: '44.5', status: 'Processed' },
    ]

    if (!bookings || bookings.length === 0) return staticHistory

    const dynamicRows = bookings.slice(0, 3).map((b) => ({
      id: b.token,
      date: b.date || 'Oct 24, 2023',
      crop: b.crop || 'Wheat',
      quantity: String(b.quantity || 15.0),
      status: b.status === 'Completed' ? 'Processed' : b.status || 'Processed',
    }))

    return dynamicRows.length >= 3 ? dynamicRows : [...dynamicRows, ...staticHistory.slice(dynamicRows.length)]
  }, [bookings])

  return (
    <div className="farmer-dashboard-view">
      {/* 1. Greeting Banner */}
      <section className="dashboard-welcome-banner">
        <h1 className="dashboard-title">Welcome back, {farmerName}</h1>
        <p className="dashboard-subtitle">Here is an overview of your agricultural procurement activities.</p>
      </section>

      {/* 2. Top 3 KPI Summary Cards */}
      <section className="kpi-cards-grid">
        {/* Card 1: Upcoming Slot */}
        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-icon-wrap kpi-icon-slot" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 2v4" />
                <path d="M16 2v4" />
                <rect width="18" height="18" x="3" y="4" rx="2" />
                <path d="M3 10h18" />
              </svg>
            </span>
            <span className="kpi-label">Upcoming Slot</span>
          </div>
          <div className="kpi-value-block">
            <h2 className="kpi-main-value">{slotDateDisplay}, {slotTimeDisplay}</h2>
            <p className="kpi-subtext">{centreName}</p>
          </div>
          <div className="kpi-card-corner-shape" aria-hidden="true" />
        </div>

        {/* Card 2: Recent Payment */}
        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-icon-wrap kpi-icon-payment" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="20" height="14" x="2" y="5" rx="2" />
                <line x1="2" x2="22" y1="10" y2="10" />
                <path d="M6 15h2" />
                <path d="M12 15h6" />
              </svg>
            </span>
            <span className="kpi-label">Recent Payment</span>
          </div>
          <div className="kpi-value-block">
            <h2 className="kpi-main-value">₹{recentPaymentAmount.toLocaleString('en-IN')} processed</h2>
            <p className="kpi-subtext kpi-status-success">
              <span className="check-icon">✓</span> Settled
            </p>
          </div>
          <div className="kpi-card-corner-shape" aria-hidden="true" />
        </div>

        {/* Card 3: Total Procurement */}
        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-icon-wrap kpi-icon-procurement" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
                <path d="m3.3 7 8.7 5 8.7-5" />
                <path d="M12 22V12" />
              </svg>
            </span>
            <span className="kpi-label">Total Procurement</span>
          </div>
          <div className="kpi-value-block">
            <h2 className="kpi-main-value">{totalQuintals} Quintals</h2>
            <p className="kpi-subtext">Wheat (Rabi Season)</p>
          </div>
          <div className="kpi-card-corner-shape" aria-hidden="true" />
        </div>
      </section>

      {/* 3. Middle Two-Column Row (Active Booking & Quick Actions) */}
      <section className="dashboard-middle-grid">
        {/* Left Card: Active Booking */}
        <div className="dashboard-card active-booking-panel">
          <div className="dashboard-card-header">
            <h3 className="card-header-title">Active Booking</h3>
            <span className="status-badge-scheduled">
              <span className="material-symbols-outlined status-badge-icon" aria-hidden="true">schedule</span>
              Scheduled
            </span>
          </div>

          <div className="active-booking-content">
            <div className="active-booking-body">
              <div className="token-icon-box" aria-hidden="true">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
                  <path d="M16 8h-8" />
                  <path d="M16 12h-8" />
                  <path d="M11 16H8" />
                </svg>
              </div>

              <div className="token-details-box">
                <span className="token-upper-label">TOKEN NUMBER</span>
                <h4 className="token-big-code">#{tokenCode}</h4>
                <div className="token-location-row">
                  <span className="token-info-item">
                    <span className="material-symbols-outlined" aria-hidden="true">location_on</span>
                    Center: {centreName}
                  </span>
                  <span className="token-info-item">
                    <span className="material-symbols-outlined" aria-hidden="true">calendar_month</span>
                    {slotDateDisplay} - {slotTimeDisplay}
                  </span>
                </div>
              </div>
            </div>

            <div className="active-booking-actions">
              <Link
                to={`/booking/${tokenCode}`}
                className="btn-download-token"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" x2="12" y1="15" y2="3" />
                </svg>
                <span>Download Token</span>
              </Link>

              <Link
                to="/book"
                className="btn-modify-booking"
              >
                Modify Booking
              </Link>
            </div>
          </div>
        </div>

        {/* Right Card: Quick Actions */}
        <div className="dashboard-card quick-actions-panel">
          <div className="dashboard-card-header no-border">
            <h3 className="card-header-title">Quick Actions</h3>
          </div>

          <div className="quick-actions-buttons-list">
            <Link to="/book" className="btn-quick-primary">
              <span className="material-symbols-outlined btn-action-icon" aria-hidden="true">add_circle</span>
              <span>Book New Slot</span>
            </Link>

            <Link to={`/booking/${tokenCode}`} className="btn-quick-secondary">
              <span className="material-symbols-outlined btn-action-icon" aria-hidden="true">history</span>
              <span>View Payment History</span>
            </Link>

            <button
              type="button"
              className="btn-quick-secondary"
              onClick={() => setShowSupportModal(true)}
            >
              <span className="material-symbols-outlined btn-action-icon" aria-hidden="true">support_agent</span>
              <span>Support Center</span>
            </button>
          </div>
        </div>
      </section>

      {/* 4. Bottom Row: Recent Procurement History Table */}
      <section className="dashboard-card recent-history-card">
        <div className="dashboard-card-header">
          <h3 className="card-header-title">Recent Procurement History</h3>
        </div>

        <div className="table-responsive-container">
          <table className="procurement-history-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Crop</th>
                <th>Quantity (Qtl)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {historyList.map((row) => (
                <tr key={row.id}>
                  <td className="cell-date">{row.date}</td>
                  <td className="cell-crop">{row.crop}</td>
                  <td className="cell-qty">{row.quantity}</td>
                  <td className="cell-status">
                    <span className="status-pill-processed">
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Support Center Modal */}
      {showSupportModal && (
        <div className="agri-modal-overlay" onClick={() => setShowSupportModal(false)}>
          <div className="agri-modal-card panel" onClick={(e) => e.stopPropagation()}>
            <div className="agri-modal-header">
              <h3>
                <span className="material-symbols-outlined" aria-hidden="true">agriculture</span>
                KisanSetu Support Center
              </h3>
              <button type="button" className="btn-close" aria-label="Close support center" onClick={() => setShowSupportModal(false)}>
                <span className="material-symbols-outlined" aria-hidden="true">close</span>
              </button>
            </div>
            <div className="agri-modal-body">
              <p>For immediate mandi yard inquiries, token slot adjustments, or moisture test disputes:</p>
              <div className="support-hotline-box">
                <strong>Toll-Free Mandi Helpline:</strong>
                <span className="hotline-number">
                  <span className="material-symbols-outlined" aria-hidden="true">phone</span>
                  1800-267-2026
                </span>
                <small>Mon - Sat (08:00 AM - 07:00 PM IST)</small>
              </div>
              <p style={{ marginTop: '14px', fontSize: '0.9rem', color: '#64748b' }}>
                District Control Center &bull; Wardha &bull; Nagpur &bull; Amravati Mandi Yards
              </p>
            </div>
            <div className="agri-modal-footer">
              <button type="button" className="btn btn-primary" onClick={() => setShowSupportModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default FarmerPortal
