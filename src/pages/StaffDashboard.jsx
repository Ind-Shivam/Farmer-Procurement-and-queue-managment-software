import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BOOKING_STATUSES, PAYMENT_STATUSES, SLOT_DATES, centres } from '../data/centres.js'
import { useBookings } from '../context/useBookings.js'

function StaffDashboard() {
  const { bookings, notifications, updateStatus, resetToSeedData, refreshData, refreshing, isFirebaseActive } = useBookings()
  const [selectedCentre, setSelectedCentre] = useState('all')
  const [selectedDate, setSelectedDate] = useState(SLOT_DATES[0]) // Today's bookings by default
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('queue') // 'queue', 'time', 'token', 'name'
  const [activeCallout, setActiveCallout] = useState(null)
  const [actionNotice, setActionNotice] = useState(null)

  // Filter bookings by centre and date
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      const matchCentre = selectedCentre === 'all' || b.centreId === selectedCentre
      const matchDate = !selectedDate || b.date === selectedDate

      if (!matchCentre || !matchDate) return false

      if (!searchTerm.trim()) return true
      const q = searchTerm.trim().toLowerCase()
      const name = (b.name || '').toLowerCase()
      const mobile = (b.mobile || '').toLowerCase()
      const village = (b.village || '').toLowerCase()
      const token = (b.token || '').toLowerCase()
      const vehicle = (b.vehicleNumber || '').toLowerCase()

      return (
        name.includes(q) ||
        mobile.includes(q) ||
        village.includes(q) ||
        token.includes(q) ||
        vehicle.includes(q)
      )
    })
  }, [bookings, selectedCentre, selectedDate, searchTerm])

  // Sort bookings
  const sortedBookings = useMemo(() => {
    const list = [...filteredBookings]

    if (sortBy === 'token') {
      return list.sort((a, b) => (a.token || '').localeCompare(b.token || ''))
    }
    if (sortBy === 'name') {
      return list.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    }
    if (sortBy === 'time') {
      return list.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''))
    }

    // Default: Sort by Queue Position (Active in line first, then terminal statuses)
    const terminalStatuses = ['Completed', 'Rejected', 'Cancelled', 'No-show']
    return list.sort((a, b) => {
      const aTerm = terminalStatuses.includes(a.status)
      const bTerm = terminalStatuses.includes(b.status)
      if (aTerm && !bTerm) return 1
      if (!aTerm && bTerm) return -1
      return (a.createdAt || '').localeCompare(b.createdAt || '')
    })
  }, [filteredBookings, sortBy])

  // Active in line bookings for current filter
  const activeInLine = useMemo(() => {
    return sortedBookings.filter(
      (b) => !['Completed', 'Rejected', 'Cancelled', 'No-show'].includes(b.status || 'Booked'),
    )
  }, [sortedBookings])

  const nowAtCounter = useMemo(() => {
    return (
      sortedBookings.find((b) => ['At Gate', 'Quality Check', 'Weighment'].includes(b.status)) ||
      activeInLine[0] ||
      null
    )
  }, [sortedBookings, activeInLine])

  // Call Next Farmer Handler
  async function handleCallNext() {
    const nextFarmer = activeInLine.find((b) => (b.status || 'Booked') === 'Booked') || activeInLine[0]
    if (!nextFarmer) {
      setActionNotice('No more waiting farmers in the active queue.')
      setTimeout(() => setActionNotice(null), 4000)
      return
    }

    setActiveCallout(nextFarmer)
    await updateStatus(nextFarmer.token, 'At Gate')
    setActionNotice(`📢 Called Token ${nextFarmer.token} (${nextFarmer.name}) to Gate/Counter!`)
    setTimeout(() => setActiveCallout(null), 6000)
    setTimeout(() => setActionNotice(null), 4000)
  }

  // Quick Action Buttons
  async function handleQuickAction(token, newStatus, paymentStatus) {
    await updateStatus(token, newStatus, paymentStatus)
    setActionNotice(`Updated ${token} status to "${newStatus}" in Firestore.`)
    setTimeout(() => setActionNotice(null), 3500)
  }

  return (
    <div className="page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <p className="eyebrow">Mandi Operator Desk · Live Operations</p>
          <h1>Staff Procurement Queue Console</h1>
          <p className="lede">
            Manage incoming farmer arrivals, call next token, record weighment stages, and update payment statuses in Firestore.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            type="button"
            className={`btn btn-sm ${refreshing ? 'btn-secondary' : 'btn-primary'}`}
            onClick={refreshData}
            disabled={refreshing}
            title="Re-fetch latest bookings from Firestore"
          >
            {refreshing ? '🔄 Refreshing...' : '🔄 Refresh Live Data'}
          </button>
          <span className={`badge ${isFirebaseActive ? 'badge-accent' : 'badge-neutral'}`}>
            {isFirebaseActive ? '🔥 Firestore Live' : '⚡ Local State'}
          </span>
        </div>
      </div>

      {actionNotice && (
        <div className="alert-banner alert-warning" role="status" style={{ animation: 'fadeIn 0.2s ease-in-out' }}>
          <span className="alert-icon">✨</span>
          <div>
            <strong>Action Executed:</strong> {actionNotice}
          </div>
        </div>
      )}

      {activeCallout && (
        <div className="callout-banner animate-pulse" style={{ borderLeft: '6px solid var(--primary, #16a34a)', background: '#ecfdf5', padding: '16px 20px', borderRadius: '8px', marginBottom: '20px' }}>
          <span className="callout-icon" style={{ fontSize: '28px' }}>📢</span>
          <div>
            <strong style={{ fontSize: '1.2rem', color: '#065f46' }}>CALLING TOKEN {activeCallout.token}!</strong>
            <p style={{ margin: '4px 0 0 0', color: '#047857' }}>
              Farmer <strong>{activeCallout.name}</strong> from {activeCallout.village} (Vehicle: <code>{activeCallout.vehicleNumber}</code>) — Please proceed to Weighbridge / Counter 1 for sampling.
            </p>
          </div>
        </div>
      )}

      {/* Filter and Search Controls */}
      <div className="queue-controls-card panel">
        <div className="control-group" style={{ flex: '1 1 200px' }}>
          <label htmlFor="staff-search">🔍 Search Farmer / Token / Village</label>
          <input
            id="staff-search"
            type="text"
            placeholder="Search by name, mobile, village, or token..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="control-group" style={{ flex: '0 1 180px' }}>
          <label htmlFor="staff-centre">🏢 Mandi Yard</label>
          <select
            id="staff-centre"
            value={selectedCentre}
            onChange={(e) => setSelectedCentre(e.target.value)}
          >
            <option value="all">All Mandi Yards</option>
            {centres.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="control-group" style={{ flex: '0 1 160px' }}>
          <label htmlFor="staff-date">📅 Date</label>
          <select
            id="staff-date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          >
            {SLOT_DATES.map((d, idx) => (
              <option key={d} value={d}>
                {d} {idx === 0 ? '(Today)' : idx === 1 ? '(Tomorrow)' : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="control-group" style={{ flex: '0 1 180px' }}>
          <label htmlFor="staff-sort">🔢 Sort By</label>
          <select
            id="staff-sort"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="queue">Queue Position (Active First)</option>
            <option value="time">Arrival Order (Oldest First)</option>
            <option value="token">Token Number (Ascending)</option>
            <option value="name">Farmer Name (A-Z)</option>
          </select>
        </div>
      </div>

      {/* Operational KPI Stats for Today */}
      <div className="stat-row">
        <div className="stat-card">
          <span className="stat-tag">Today&apos;s Bookings</span>
          <strong className="stat-num">{filteredBookings.length}</strong>
          <span className="stat-sub">{selectedDate} ({selectedCentre === 'all' ? 'All Yards' : selectedCentre})</span>
        </div>
        <div className="stat-card">
          <span className="stat-tag">Active in Line</span>
          <strong className="stat-num text-primary">{activeInLine.length}</strong>
          <span className="stat-sub">Waiting / At Gate / Testing</span>
        </div>
        <div className="stat-card">
          <span className="stat-tag">Now at Counter</span>
          <strong className="stat-num text-accent">
            {nowAtCounter ? nowAtCounter.token : 'None'}
          </strong>
          <span className="stat-sub">
            {nowAtCounter ? `${nowAtCounter.name} (${nowAtCounter.status || 'Booked'})` : 'Counter free'}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-tag">Completed Today</span>
          <strong className="stat-num text-success">
            {filteredBookings.filter((b) => b.status === 'Completed').length}
          </strong>
          <span className="stat-sub">Procurement finalized</span>
        </div>
      </div>

      {/* Bookings Queue Table */}
      <div className="panel">
        <div className="table-header-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3>
              📋 Today&apos;s Bookings List ({sortedBookings.length} Found)
            </h3>
            {searchTerm && <small className="text-muted">Filtering for &ldquo;{searchTerm}&rdquo;</small>}
          </div>
          <div className="actions-inline" style={{ display: 'flex', gap: '10px' }}>
            <button
              className="btn btn-primary btn-sm"
              onClick={handleCallNext}
              disabled={activeInLine.length === 0}
            >
              📢 Call Next Farmer
            </button>
            <button
              className="btn btn-sm btn-secondary"
              onClick={resetToSeedData}
              title="Reset to default seed bookings"
            >
              🔄 Reset Sample Data
            </button>
          </div>
        </div>

        {sortedBookings.length === 0 ? (
          <div className="empty-queue-notice" style={{ padding: '32px', textAlign: 'center' }}>
            <p>No bookings found matching the selected centre, date, and search filters.</p>
            {searchTerm && (
              <button className="btn btn-sm btn-secondary" onClick={() => setSearchTerm('')} style={{ marginTop: '10px' }}>
                Clear Search Filter
              </button>
            )}
          </div>
        ) : (
          <div className="table-wrap">
            <table className="queue-table">
              <thead>
                <tr>
                  <th>Pos</th>
                  <th>Token</th>
                  <th>Farmer Details</th>
                  <th>Produce</th>
                  <th>Vehicle</th>
                  <th>Procurement Status</th>
                  <th>Payment Status</th>
                  <th>Quick Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedBookings.map((row, idx) => {
                  const currentStatus = row.status || 'Booked'
                  const currentPayment = row.paymentStatus || 'Pending'
                  const isServing = ['At Gate', 'Quality Check', 'Weighment'].includes(currentStatus)
                  const isCompleted = currentStatus === 'Completed'
                  const isCancelled = ['Cancelled', 'Rejected', 'No-show'].includes(currentStatus)

                  return (
                    <tr
                      key={row.token}
                      className={`${isServing ? 'row-serving' : ''} ${isCompleted ? 'row-completed' : ''} ${isCancelled ? 'row-cancelled' : ''}`}
                    >
                      <td>
                        <span className={`pos-badge ${isServing ? 'badge-serving' : ''}`}>
                          {isCompleted ? '✓' : isCancelled ? '—' : `#${idx + 1}`}
                        </span>
                      </td>
                      <td>
                        <Link to={`/booking/${row.token}`}>
                          <strong className="token-mono">{row.token}</strong>
                        </Link>
                      </td>
                      <td>
                        <strong>{row.name}</strong>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted, #666)' }}>
                          📞 +91 {row.mobile} · 📍 {row.village}
                        </div>
                      </td>
                      <td>
                        <strong>🌾 {row.crop}</strong>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted, #666)' }}>
                          {row.quantity} Quintals
                        </div>
                      </td>
                      <td>
                        <code>{row.vehicleNumber}</code>
                      </td>
                      <td>
                        <select
                          className={`status-select status-tag-${currentStatus.toLowerCase().replace(/\s+/g, '-')}`}
                          value={currentStatus}
                          onChange={(e) => updateStatus(row.token, e.target.value)}
                        >
                          {BOOKING_STATUSES.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select
                          className={`payment-select payment-tag-${currentPayment.toLowerCase()}`}
                          value={currentPayment}
                          onChange={(e) => updateStatus(row.token, null, e.target.value)}
                        >
                          {PAYMENT_STATUSES.map((pst) => (
                            <option key={pst} value={pst}>
                              {pst}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            className="btn btn-sm btn-success"
                            onClick={() => handleQuickAction(row.token, 'Completed', 'Completed')}
                            title="Mark as Completed & Paid"
                            style={{ padding: '3px 7px', fontSize: '0.75rem' }}
                          >
                            ✓ Done
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-danger"
                            onClick={() => handleQuickAction(row.token, 'Rejected')}
                            title="Mark Rejected (Quality failure / Moisture high)"
                            style={{ padding: '3px 7px', fontSize: '0.75rem' }}
                          >
                            🚫 Reject
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-secondary"
                            onClick={() => handleQuickAction(row.token, 'Cancelled')}
                            title="Mark Cancelled"
                            style={{ padding: '3px 7px', fontSize: '0.75rem' }}
                          >
                            ❌ Cancel
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-secondary"
                            onClick={() => handleQuickAction(row.token, 'No-show')}
                            title="Mark No-show (Farmer did not arrive)"
                            style={{ padding: '3px 7px', fontSize: '0.75rem' }}
                          >
                            ⚠️ No-show
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent In-App Notifications Feed */}
      {notifications && notifications.length > 0 && (
        <div className="panel" style={{ marginTop: '24px' }}>
          <div className="table-header-bar">
            <h3>🔔 Live In-App Notifications Audit Log (Recent {Math.min(5, notifications.length)})</h3>
            <span className="badge badge-neutral">Firestore &bull; Real-time</span>
          </div>
          <div className="notification-feed" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '8px 0' }}>
            {notifications.slice(0, 5).map((n) => (
              <div
                key={n.id || n.createdAt}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 14px',
                  background: 'var(--bg-subtle, #f8fafc)',
                  borderRadius: '6px',
                  borderLeft: '4px solid var(--primary, #16a34a)',
                  fontSize: '0.88rem',
                }}
              >
                <div>
                  <strong>{n.token ? `[${n.token}] ` : ''}</strong>
                  <span>{n.message}</span>
                </div>
                <small className="text-muted" style={{ whiteSpace: 'nowrap', marginLeft: '12px' }}>
                  {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </small>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="actions" style={{ marginTop: '24px' }}>
        <Link className="btn btn-primary" to="/admin">
          Open District Admin Overview
        </Link>
        <Link className="btn" to="/">
          Public Farmer Portal
        </Link>
      </div>
    </div>
  )
}

export default StaffDashboard
