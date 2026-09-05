import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { centres, windows } from '../data/centres.js'
import { useAuth } from '../context/useAuth.js'
import { useBookings } from '../context/useBookings.js'
import { getFarmerMobile, getFarmerTokens, getLastBookingToken } from '../utils/storage.js'
import { normalizeMobile } from '../utils/validation.js'

function FarmerPortal() {
  const { userProfile, currentUser, userRole } = useAuth()
  const { bookings, centres: dynamicCentres } = useBookings()
  const [showSupportModal, setShowSupportModal] = useState(false)

  const allCentres = useMemo(
    () => (dynamicCentres && dynamicCentres.length > 0 ? dynamicCentres : centres),
    [dynamicCentres],
  )

  const currentUserUid = currentUser?.uid || ''
  const userMobile = normalizeMobile(userProfile?.mobile)
  const storedMobile = normalizeMobile(getFarmerMobile())
  const storedTokens = useMemo(() => getFarmerTokens(), [])
  const lastToken = useMemo(() => getLastBookingToken(), [])
  const farmerName = userProfile?.name || currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Farmer'

  // Multi-layered identification of farmer's bookings
  const farmerBookings = useMemo(() => {
    const userTokensSet = new Set(storedTokens)
    if (lastToken) userTokensSet.add(lastToken)

    const filtered = (bookings || []).filter((booking) => {
      const bMobile = normalizeMobile(booking.mobile)
      const isOwner = currentUserUid && booking.ownerUid && booking.ownerUid === currentUserUid
      const isProfileMobile = userMobile && bMobile && bMobile === userMobile
      const isStoredMobile = storedMobile && bMobile && bMobile === storedMobile
      const isUserToken = booking.token && userTokensSet.has(booking.token)
      const isNameMatch =
        farmerName &&
        farmerName !== 'Farmer' &&
        booking.name &&
        booking.name.toLowerCase().trim() === farmerName.toLowerCase().trim()

      return Boolean(isOwner || isProfileMobile || isStoredMobile || isUserToken || isNameMatch)
    })

    if (filtered.length > 0) {
      return [...filtered].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
    }

    // Fallback 1: If user has a last booked token, find it in bookings
    if (lastToken) {
      const found = (bookings || []).find((b) => b.token === lastToken)
      if (found) return [found]
    }

    // No fallback to other farmers' bookings. A brand-new farmer should see an empty dashboard until they create their own booking.
    return []
  }, [bookings, currentUserUid, userMobile, storedMobile, storedTokens, lastToken, farmerName])

  // Identify active booking for the current farmer
  const activeBooking = useMemo(() => {
    if (!farmerBookings || farmerBookings.length === 0) return null
    const match = farmerBookings.find((booking) => !['Completed', 'Cancelled', 'Rejected'].includes(booking.status))
    return match || farmerBookings[0] || null
  }, [farmerBookings])

  // Calculate totals and metrics
  const totalQuintals = useMemo(() => {
    const sum = farmerBookings.reduce((acc, b) => acc + (Number(b.quantity) || 0), 0)
    return sum
  }, [farmerBookings])

  const recentPaymentAmount = useMemo(() => {
    if (activeBooking?.quantity) {
      const rates = { Wheat: 2275, Paddy: 2183, Soybean: 4600, Cotton: 6620, Mustard: 5450, Gram: 5440, Maize: 2090 }
      const rate = rates[activeBooking.crop] || 2275
      return Number(activeBooking.quantity) * rate
    }
    return 0
  }, [activeBooking])

  // Centre name lookup
  const centreName = useMemo(() => {
    if (!activeBooking) return 'No booking yet'
    const found = allCentres.find((c) => c.id === activeBooking.centreId)
    return found ? found.name : activeBooking.centreId || 'Unknown centre'
  }, [activeBooking, allCentres])

  // Display slot date & time
  const slotDateDisplay = activeBooking?.date || 'None Scheduled'
  const slotTimeDisplay = useMemo(() => {
    if (!activeBooking?.slotId) return ''
    const parts = activeBooking.slotId.split('_')
    const winKey = parts[2] || ''
    const foundWindow = windows.find((w) => w.key === winKey)
    return foundWindow ? foundWindow.label : winKey
  }, [activeBooking])

  // Token code
  const tokenCode = activeBooking?.token || ''

  // Status badge config
  const statusConfig = useMemo(() => {
    if (!activeBooking) {
      return { label: 'No Active Booking', className: 'badge-status-empty', icon: 'event_busy' }
    }
    const status = activeBooking.status || 'Booked'
    switch (status) {
      case 'At Gate':
        return { label: 'At Gate (Serving)', className: 'badge-status-serving', icon: 'meeting_room' }
      case 'Quality Check':
        return { label: 'Quality Check Stage', className: 'badge-status-serving', icon: 'fact_check' }
      case 'Weighment':
        return { label: 'Weighment in Progress', className: 'badge-status-serving', icon: 'scale' }
      case 'Accepted':
        return { label: 'Produce Accepted', className: 'badge-status-accepted', icon: 'verified' }
      case 'Completed':
        return { label: 'Procurement Complete', className: 'badge-status-completed', icon: 'check_circle' }
      case 'Cancelled':
        return { label: 'Cancelled', className: 'badge-status-cancelled', icon: 'cancel' }
      case 'Rejected':
        return { label: 'Rejected', className: 'badge-status-cancelled', icon: 'error' }
      default:
        return { label: status || 'Scheduled', className: 'status-badge-scheduled', icon: 'schedule' }
    }
  }, [activeBooking])

  // Recent procurement history list
  const historyList = useMemo(() => {
    if (!farmerBookings || farmerBookings.length === 0) return []

    return farmerBookings.slice(0, 5).map((b) => ({
      id: b.token,
      date: b.date || 'Unknown date',
      crop: b.crop || 'Unknown crop',
      quantity: String(b.quantity || 0),
      status: b.status || 'Booked',
      paymentStatus: b.paymentStatus || 'Pending',
    }))
  }, [farmerBookings])

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
            <h2 className="kpi-main-value">
              {activeBooking ? `${slotDateDisplay}${slotTimeDisplay ? `, ${slotTimeDisplay}` : ''}` : 'None Scheduled'}
            </h2>
            <p className="kpi-subtext">{activeBooking ? centreName : 'Book a mandi slot anytime'}</p>
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
            <span className="kpi-label">Estimated MSP Value</span>
          </div>
          <div className="kpi-value-block">
            <h2 className="kpi-main-value">
              {recentPaymentAmount > 0 ? `₹${recentPaymentAmount.toLocaleString('en-IN')}` : '₹0'}
            </h2>
            <p className={`kpi-subtext ${activeBooking?.paymentStatus === 'Completed' ? 'kpi-status-success' : ''}`}>
              {activeBooking ? `Status: ${activeBooking.paymentStatus || 'Pending'}` : 'No active transactions'}
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
            <span className="kpi-label">Total Produce Registered</span>
          </div>
          <div className="kpi-value-block">
            <h2 className="kpi-main-value">{totalQuintals} Quintals</h2>
            <p className="kpi-subtext">{activeBooking ? `${activeBooking.crop || 'Crop'} (Govt. MSP)` : 'Rabi / Kharif Season'}</p>
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
            <span className={statusConfig.className}>
              <span className="material-symbols-outlined status-badge-icon" aria-hidden="true">
                {statusConfig.icon}
              </span>
              {statusConfig.label}
            </span>
          </div>

          {activeBooking ? (
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
                      Center: <strong>{centreName}</strong>
                    </span>
                    <span className="token-info-item">
                      <span className="material-symbols-outlined" aria-hidden="true">calendar_month</span>
                      {slotDateDisplay} {slotTimeDisplay ? `• ${slotTimeDisplay}` : ''}
                    </span>
                    <div className="token-meta-tags">
                      <span className="token-crop-pill">
                        🌾 {activeBooking.crop} &bull; {activeBooking.quantity} Qtl
                      </span>
                      {activeBooking.vehicleNumber && (
                        <span className="token-crop-pill" style={{ background: '#f1f5f9', color: '#334155', borderColor: '#cbd5e1' }}>
                          🚛 {activeBooking.vehicleNumber}
                        </span>
                      )}
                    </div>
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
                  to={`/queue?token=${tokenCode}`}
                  className="btn-modify-booking"
                >
                  Track Live Queue
                </Link>
              </div>
            </div>
          ) : (
            <div className="active-booking-empty-content">
              <div className="empty-booking-left">
                <div className="empty-booking-icon-box" aria-hidden="true">
                  <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>calendar_today</span>
                </div>
                <div className="empty-booking-text">
                  <h4>No Active Mandi Reservation</h4>
                  <p>You do not have any upcoming procurement slots booked. Reserve a slot now to receive your official token pass.</p>
                </div>
              </div>
              <Link to="/book" className="btn-book-now-cta">
                <span className="material-symbols-outlined text-sm" aria-hidden="true">add_circle</span>
                <span>Book Mandi Slot Now</span>
              </Link>
            </div>
          )}
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

            <Link to={tokenCode ? `/booking/${tokenCode}` : '/queue'} className="btn-quick-secondary">
              <span className="material-symbols-outlined btn-action-icon" aria-hidden="true">hourglass_empty</span>
              <span>Live Queue Board</span>
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
                <th>Token</th>
                <th>Date</th>
                <th>Crop</th>
                <th>Quantity (Qtl)</th>
                <th>Procurement Status</th>
                <th>Payment</th>
              </tr>
            </thead>
            <tbody>
              {historyList.length > 0 ? (
                historyList.map((row) => (
                  <tr key={row.id}>
                    <td className="cell-token">
                      <Link to={`/booking/${row.id}`} style={{ fontWeight: '700', color: '#064e3b', textDecoration: 'underline' }}>
                        #{row.id}
                      </Link>
                    </td>
                    <td className="cell-date">{row.date}</td>
                    <td className="cell-crop">{row.crop}</td>
                    <td className="cell-qty">{row.quantity} Qtl</td>
                    <td className="cell-status">
                      <span className="status-pill-processed">
                        {row.status}
                      </span>
                    </td>
                    <td className="cell-payment">
                      <span style={{ fontSize: '13px', fontWeight: '600', color: row.paymentStatus === 'Completed' ? '#166534' : '#b45309' }}>
                        {row.paymentStatus}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                    No procurement records found yet. Book a slot to get started!
                  </td>
                </tr>
              )}
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

