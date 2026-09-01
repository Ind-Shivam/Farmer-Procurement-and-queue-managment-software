import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BOOKING_STATUSES, PAYMENT_STATUSES, SLOT_DATES, centres } from '../data/centres.js'
import { useBookings } from '../context/useBookings.js'

function AdminDashboard() {
  const { bookings, refreshData, refreshing, isFirebaseActive } = useBookings()
  const [selectedDate, setSelectedDate] = useState(SLOT_DATES[0]) // Today by default
  const [selectedCentre, setSelectedCentre] = useState('all')
  const [selectedProcStatus, setSelectedProcStatus] = useState('all')
  const [selectedPayStatus, setSelectedPayStatus] = useState('all')

  const today = SLOT_DATES[0]

  // Calculate High-level Executive KPIs across all bookings
  const kpiStats = useMemo(() => {
    // 1. Total unique farmers (by unique mobile number)
    const uniqueMobiles = new Set(bookings.map((b) => b.mobile).filter(Boolean))
    const totalFarmers = uniqueMobiles.size

    // 2. Today's bookings count
    const todayBookingsList = bookings.filter((b) => b.date === today)
    const todayBookings = todayBookingsList.length

    // 3. Waiting farmers (Active in line)
    const waitingFarmers = bookings.filter((b) =>
      ['Booked', 'At Gate', 'Quality Check', 'Weighment'].includes(b.status || 'Booked'),
    ).length

    // 4. Completed procurements
    const completedProcurements = bookings.filter((b) => b.status === 'Completed').length

    // 5. Pending payments
    const pendingPayments = bookings.filter((b) => (b.paymentStatus || 'Pending') === 'Pending').length

    // 6. Centre-wise booking counts & metrics
    const centreWise = centres.map((centre) => {
      const allCentreBookings = bookings.filter((b) => b.centreId === centre.id)
      const todayCentreBookings = allCentreBookings.filter((b) => b.date === today)
      const completedCount = allCentreBookings.filter((b) => b.status === 'Completed').length
      const waitingCount = allCentreBookings.filter((b) =>
        ['Booked', 'At Gate', 'Quality Check', 'Weighment'].includes(b.status || 'Booked'),
      ).length
      const totalProduceQty = allCentreBookings.reduce((sum, b) => sum + (Number(b.quantity) || 0), 0)

      return {
        ...centre,
        totalBookings: allCentreBookings.length,
        todayBookings: todayCentreBookings.length,
        waitingCount,
        completedCount,
        totalProduceQty,
      }
    })

    return {
      totalFarmers,
      todayBookings,
      waitingFarmers,
      completedProcurements,
      pendingPayments,
      centreWise,
    }
  }, [bookings, today])

  // Filter the Bookings List based on the 4 filters
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      if (selectedDate !== 'all' && b.date !== selectedDate) return false
      if (selectedCentre !== 'all' && b.centreId !== selectedCentre) return false
      if (selectedProcStatus !== 'all' && (b.status || 'Booked') !== selectedProcStatus) return false
      if (selectedPayStatus !== 'all' && (b.paymentStatus || 'Pending') !== selectedPayStatus) return false
      return true
    })
  }, [bookings, selectedDate, selectedCentre, selectedProcStatus, selectedPayStatus])

  return (
    <div className="page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <p className="eyebrow">District Agriculture Directorate &bull; Admin Console</p>
          <h1>District Mandi Capacity &amp; Procurement Admin</h1>
          <p className="lede">
            District-wide executive overview of farmer registrations, mandi slot fill rates, queue loads, and payment tracking.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            type="button"
            className={`btn btn-sm ${refreshing ? 'btn-secondary' : 'btn-primary'}`}
            onClick={refreshData}
            disabled={refreshing}
            title="Refresh database records"
          >
            {refreshing ? '🔄 Refreshing...' : '🔄 Refresh Live Data'}
          </button>
          <span className={`badge ${isFirebaseActive ? 'badge-accent' : 'badge-neutral'}`}>
            {isFirebaseActive ? '🔥 Firestore Live' : '⚡ Local State'}
          </span>
        </div>
      </div>

      {/* Top Level KPIs (6 Required Metrics) */}
      <div className="stat-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
        <div className="stat-card">
          <span className="stat-tag">👨‍🌾 Total Farmers</span>
          <strong className="stat-num text-primary">{kpiStats.totalFarmers}</strong>
          <span className="stat-sub">Unique registered producers</span>
        </div>

        <div className="stat-card">
          <span className="stat-tag">📅 Today&apos;s Bookings</span>
          <strong className="stat-num">{kpiStats.todayBookings}</strong>
          <span className="stat-sub">Scheduled for {today}</span>
        </div>

        <div className="stat-card">
          <span className="stat-tag">⏳ Waiting Farmers</span>
          <strong className="stat-num text-accent">{kpiStats.waitingFarmers}</strong>
          <span className="stat-sub">In queue / At Gate / Testing</span>
        </div>

        <div className="stat-card">
          <span className="stat-tag">✅ Completed</span>
          <strong className="stat-num text-success">{kpiStats.completedProcurements}</strong>
          <span className="stat-sub">Procurements weighed &amp; passed</span>
        </div>

        <div className="stat-card">
          <span className="stat-tag">💳 Pending Payments</span>
          <strong className="stat-num" style={{ color: '#f59e0b' }}>{kpiStats.pendingPayments}</strong>
          <span className="stat-sub">Direct bank transfer pending</span>
        </div>
      </div>

      {/* Centre-wise Booking Count Breakdown Table */}
      <div className="panel" style={{ marginTop: '24px' }}>
        <div className="table-header-bar">
          <h3>🏢 Centre-Wise Booking Summary</h3>
          <span className="badge badge-accent">3 Mandi Yards Connected</span>
        </div>
        <div className="table-wrap">
          <table className="queue-table">
            <thead>
              <tr>
                <th>Procurement Centre</th>
                <th>Location</th>
                <th>Today&apos;s Bookings</th>
                <th>Total Bookings</th>
                <th>Waiting in Line</th>
                <th>Completed</th>
                <th>Total Produce Scheduled</th>
              </tr>
            </thead>
            <tbody>
              {kpiStats.centreWise.map((c) => (
                <tr key={c.id}>
                  <td>
                    <strong>{c.name}</strong>
                  </td>
                  <td>{c.location}</td>
                  <td>
                    <span className="badge badge-neutral">{c.todayBookings} today</span>
                  </td>
                  <td>
                    <strong>{c.totalBookings}</strong>
                  </td>
                  <td>
                    <span className={c.waitingCount > 0 ? 'text-accent' : 'text-muted'}>
                      {c.waitingCount} waiting
                    </span>
                  </td>
                  <td>
                    <span className="text-success">{c.completedCount} done</span>
                  </td>
                  <td>
                    <strong>{c.totalProduceQty} Quintals</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Filter Controls (Date, Centre, Procurement Status, Payment Status) */}
      <div className="panel" style={{ marginTop: '24px' }}>
        <div className="table-header-bar" style={{ marginBottom: '16px' }}>
          <h3>🔍 Filter Procurement Records</h3>
          <span className="badge badge-neutral">{filteredBookings.length} Matching Records</span>
        </div>

        <div className="queue-controls-card" style={{ background: 'transparent', padding: 0, border: 'none' }}>
          <div className="control-group">
            <label htmlFor="admin-filter-date">📅 Date</label>
            <select
              id="admin-filter-date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            >
              <option value="all">All Dates</option>
              {SLOT_DATES.map((d, idx) => (
                <option key={d} value={d}>
                  {d} {idx === 0 ? '(Today)' : idx === 1 ? '(Tomorrow)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="control-group">
            <label htmlFor="admin-filter-centre">🏢 Mandi Centre</label>
            <select
              id="admin-filter-centre"
              value={selectedCentre}
              onChange={(e) => setSelectedCentre(e.target.value)}
            >
              <option value="all">All Centres</option>
              {centres.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="control-group">
            <label htmlFor="admin-filter-status">📋 Procurement Status</label>
            <select
              id="admin-filter-status"
              value={selectedProcStatus}
              onChange={(e) => setSelectedProcStatus(e.target.value)}
            >
              <option value="all">All Statuses</option>
              {BOOKING_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          <div className="control-group">
            <label htmlFor="admin-filter-payment">💳 Payment Status</label>
            <select
              id="admin-filter-payment"
              value={selectedPayStatus}
              onChange={(e) => setSelectedPayStatus(e.target.value)}
            >
              <option value="all">All Payment Statuses</option>
              {PAYMENT_STATUSES.map((pst) => (
                <option key={pst} value={pst}>
                  {pst}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filtered Records Table */}
        <div className="table-wrap" style={{ marginTop: '20px' }}>
          {filteredBookings.length === 0 ? (
            <div className="empty-queue-notice" style={{ padding: '30px', textAlign: 'center' }}>
              <p>No procurement records match the chosen filter criteria.</p>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={() => {
                  setSelectedDate('all')
                  setSelectedCentre('all')
                  setSelectedProcStatus('all')
                  setSelectedPayStatus('all')
                }}
                style={{ marginTop: '10px' }}
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <table className="queue-table">
              <thead>
                <tr>
                  <th>Token</th>
                  <th>Farmer Name &amp; Contact</th>
                  <th>Village</th>
                  <th>Centre</th>
                  <th>Date &amp; Slot</th>
                  <th>Crop &amp; Quantity</th>
                  <th>Vehicle</th>
                  <th>Status</th>
                  <th>Payment</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((b) => (
                  <tr key={b.token}>
                    <td>
                      <Link to={`/booking/${b.token}`}>
                        <strong className="token-mono">{b.token}</strong>
                      </Link>
                    </td>
                    <td>
                      <strong>{b.name}</strong>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted, #666)' }}>
                        +91 {b.mobile}
                      </div>
                    </td>
                    <td>{b.village}</td>
                    <td>{centres.find((c) => c.id === b.centreId)?.name || b.centreId}</td>
                    <td>
                      {b.date}
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted, #666)' }}>
                        🕒 {b.slotId ? b.slotId.split('_')[2] : '09-11'}
                      </div>
                    </td>
                    <td>
                      <strong>🌾 {b.crop}</strong> ({b.quantity} q)
                    </td>
                    <td>
                      <code>{b.vehicleNumber}</code>
                    </td>
                    <td>
                      <span
                        className={`status-pill ${
                          b.status === 'Completed'
                            ? 'pill-next'
                            : ['At Gate', 'Quality Check', 'Weighment'].includes(b.status)
                            ? 'pill-serving'
                            : 'pill-waiting'
                        }`}
                      >
                        {b.status || 'Booked'}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-neutral">{b.paymentStatus || 'Pending'}</span>
                    </td>
                    <td>
                      <Link to={`/booking/${b.token}`} className="btn-table-action">
                        View Pass
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="actions" style={{ marginTop: '24px' }}>
        <Link className="btn btn-primary" to="/staff">
          Open Mandi Staff Console
        </Link>
        <Link className="btn" to="/queue">
          Live Farmer Queue Board
        </Link>
        <Link className="btn" to="/">
          Farmer Portal
        </Link>
      </div>
    </div>
  )
}

export default AdminDashboard
