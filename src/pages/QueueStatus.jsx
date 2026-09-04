import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { SLOT_DATES, centres, windows } from '../data/centres.js'
import { useBookings } from '../context/useBookings.js'
import { findBookingByTokenOrMobile } from '../utils/booking.js'
import { getLiveQueueForSlot, getQueueSummary } from '../utils/queue.js'
import { findCentre, findSlot } from '../utils/slots.js'

function QueueStatus() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { bookings, notifications, refreshData, refreshing } = useBookings()

  const initialToken = searchParams.get('token') || ''
  const initialCentre = searchParams.get('centre') || centres[0].id
  const initialDate = searchParams.get('date') || SLOT_DATES[0]
  const initialWindow = searchParams.get('window') || windows[0].key

  const [tokenInput, setTokenInput] = useState(initialToken)
  const [activeToken, setActiveToken] = useState(initialToken)
  const [selectedCentre, setSelectedCentre] = useState(initialCentre)
  const [selectedDate, setSelectedDate] = useState(initialDate)
  const [selectedWindow, setSelectedWindow] = useState(initialWindow)

  // Construct target slot ID
  const currentSlotId = `${selectedCentre}_${selectedDate}_${selectedWindow}`

  // Look up active token or mobile if provided
  const activeBooking = useMemo(() => {
    return activeToken ? findBookingByTokenOrMobile(bookings, activeToken) : null
  }, [bookings, activeToken])

  // Get live queue for currently filtered centre + date + slot
  const queueList = useMemo(() => {
    return getLiveQueueForSlot(bookings, selectedCentre, selectedDate, currentSlotId)
  }, [bookings, selectedCentre, selectedDate, currentSlotId])

  // Get queue summary for active token
  const userQueueSummary = useMemo(() => {
    return activeBooking ? getQueueSummary(bookings, activeBooking) : null
  }, [bookings, activeBooking])

  const centreInfo = useMemo(() => findCentre(centres, selectedCentre), [selectedCentre])
  const activeSlotInfo = useMemo(() => {
    if (!activeBooking) return null
    return findSlot(null, activeBooking.slotId) || { label: windows.find((w) => w.key === selectedWindow)?.label }
  }, [activeBooking, selectedWindow])

  // Notifications relevant to active booking
  const tokenNotifications = useMemo(() => {
    if (!activeBooking) return []
    return (notifications || []).filter(
      (n) => n.token === activeBooking.token || n.recipientMobile === activeBooking.mobile,
    )
  }, [activeBooking, notifications])

  function handleTokenSearch(e) {
    e.preventDefault()
    if (!tokenInput.trim()) return
    const clean = tokenInput.trim()
    const found = findBookingByTokenOrMobile(bookings, clean)
    if (found) {
      setActiveToken(found.token)
      setSelectedCentre(found.centreId)
      setSelectedDate(found.date)
      const winKey = found.slotId ? found.slotId.split('_')[2] : windows[0].key
      setSelectedWindow(winKey || windows[0].key)
      setSearchParams({ token: found.token, centre: found.centreId, date: found.date, window: winKey || windows[0].key })
    } else {
      setActiveToken(clean)
    }
  }

  const nowServing = queueList.find((item) => item.position === 1)
  const nextInLine = queueList.find((item) => item.position === 2)

  return (
    <div className="queue-page-container">
      {/* 1. Header Bar */}
      <div className="queue-header-bar">
        <div>
          <span className="queue-eyebrow">Real-Time Mandi Operations &bull; Live Feed</span>
          <h1 className="queue-page-title">Live Procurement Queue Board</h1>
          <p className="queue-page-lede">
            Track live token callouts, estimated counter waiting times, procurement stages, and payment progression.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <span className="queue-live-pulse-tag">
            <span className="material-symbols-outlined text-sm filled" style={{ color: '#166534' }}>sensors</span>
            Live Queue Active
          </span>
          <button
            type="button"
            className="btn-refresh-queue"
            onClick={refreshData}
            disabled={refreshing}
            title="Refresh latest queue data"
          >
            <span className="material-symbols-outlined text-sm">refresh</span>
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* 2. Quick Token & Mobile Lookup Bar */}
      <div className="queue-search-card">
        <form className="queue-search-form" onSubmit={handleTokenSearch}>
          <div className="queue-search-input-wrap">
            <span className="material-symbols-outlined queue-search-icon">search</span>
            <input
              type="text"
              placeholder="Enter Token (e.g. KC-2026-0101) or 10-digit Mobile..."
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              className="queue-search-input"
            />
          </div>
          <button type="submit" className="btn-queue-search-action">
            <span>Find My Status</span>
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </button>
        </form>

        {activeToken && (
          <div>
            {activeBooking ? (
              <div className="queue-token-result-banner">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="material-symbols-outlined text-sm" style={{ color: '#003527' }}>check_circle</span>
                  <span>
                    Showing position for <strong>{activeBooking.token}</strong> ({activeBooking.name} &bull; {activeBooking.status || 'Booked'})
                  </span>
                </div>
                <Link to={`/booking/${activeBooking.token}`} className="btn-view-details-link">
                  <span>View Full Pass Slip</span>
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </Link>
              </div>
            ) : (
              <div className="queue-token-notfound">
                <span className="material-symbols-outlined text-sm">warning</span>
                <span>No booking found for &ldquo;{activeToken}&rdquo;. Please verify your token number or registered mobile.</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. Detailed Highlight Card for Active Queried Token */}
      {activeBooking && userQueueSummary && (
        <div className="user-reservation-card">
          <div className="user-reservation-header">
            <div>
              <span className="user-reservation-tag">
                <span className="material-symbols-outlined text-sm" style={{ color: '#4059aa' }}>verified</span>
                YOUR RESERVATION DETAILS
              </span>
              <h2 className="user-reservation-token-title">Token: {activeBooking.token}</h2>
              <p className="user-reservation-farmer-desc" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                <span>Farmer: <strong>{activeBooking.name}</strong></span>
                <span>&bull;</span>
                <span className="material-symbols-outlined text-sm" style={{ fontSize: '15px' }}>call</span>
                <span>+91 {activeBooking.mobile}</span>
                <span>&bull;</span>
                <span className="material-symbols-outlined text-sm" style={{ fontSize: '15px' }}>local_shipping</span>
                <span>{activeBooking.vehicleNumber}</span>
              </p>
            </div>
            <div className="user-reservation-badges">
              <span className={`badge-status-pill ${activeBooking.status === 'Completed' ? 'pill-status-completed' : ['At Gate', 'Quality Check', 'Weighment'].includes(activeBooking.status) ? 'pill-status-serving' : 'pill-status-booked'}`}>
                <span className="material-symbols-outlined text-sm">assignment</span>
                Procurement: <strong>{activeBooking.status || 'Booked'}</strong>
              </span>
              <span className={`badge-status-pill ${activeBooking.paymentStatus === 'Completed' ? 'pill-status-paid' : 'pill-status-pending'}`}>
                <span className="material-symbols-outlined text-sm">payments</span>
                Payment: <strong>{activeBooking.paymentStatus || 'Pending'}</strong>
              </span>
            </div>
          </div>

          <div className="user-reservation-metrics-grid">
            {/* Metric 1 */}
            <div className="user-metric-box">
              <span className="user-metric-tag">
                <span className="material-symbols-outlined text-sm">location_city</span>
                Centre &amp; Slot
              </span>
              <div className="user-metric-val">
                {findCentre(centres, activeBooking.centreId)?.name || activeBooking.centreId}
              </div>
              <span className="user-metric-sub" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>calendar_month</span>
                <span>{activeBooking.date}</span>
                <span>&bull;</span>
                <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>schedule</span>
                <span>{activeSlotInfo?.label || '09:00 – 11:00'}</span>
              </span>
            </div>

            {/* Metric 2 */}
            <div className="user-metric-box">
              <span className="user-metric-tag">
                <span className="material-symbols-outlined text-sm">pin_drop</span>
                Queue Position
              </span>
              <div className="user-metric-val" style={{ color: '#003527', fontSize: '24px' }}>
                {userQueueSummary.position ? `#${userQueueSummary.position}` : '—'}
              </div>
              <span className="user-metric-sub">
                {userQueueSummary.statusLabel}
              </span>
            </div>

            {/* Metric 3 */}
            <div className="user-metric-box">
              <span className="user-metric-tag">
                <span className="material-symbols-outlined text-sm">groups</span>
                Farmers Ahead
              </span>
              <div className="user-metric-val" style={{ fontSize: '24px' }}>
                {userQueueSummary.peopleAhead}
              </div>
              <span className="user-metric-sub">Vehicles in line before you</span>
            </div>

            {/* Metric 4 */}
            <div className="user-metric-box">
              <span className="user-metric-tag">
                <span className="material-symbols-outlined text-sm">schedule</span>
                Est. Waiting Time
              </span>
              <div className="user-metric-val" style={{ color: '#854d0e', fontSize: '18px' }}>
                {userQueueSummary.waitLabel}
              </div>
              <span className="user-metric-sub">Calculated at 8 mins/vehicle</span>
            </div>
          </div>

          {/* In-app Notification Alert */}
          {tokenNotifications.length > 0 && (
            <div style={{ background: '#f0fdf4', borderLeft: '4px solid #16a34a', padding: '12px 16px', borderRadius: '8px', marginTop: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#064e3b', fontWeight: '700', fontSize: '13px' }}>
                <span className="material-symbols-outlined text-sm">notifications</span>
                <span>Latest Update from Mandi Staff:</span>
              </div>
              <p style={{ margin: '4px 0 0 0', color: '#166534', fontSize: '13px' }}>
                {tokenNotifications[0].message}
              </p>
            </div>
          )}
        </div>
      )}

      {/* 4. Queue Filter Controls */}
      <div className="queue-filters-row">
        <div className="filter-card">
          <label className="filter-label" htmlFor="q-centre">
            <span className="material-symbols-outlined text-sm" style={{ color: '#4059aa' }}>location_city</span>
            Procurement Centre
          </label>
          <select
            id="q-centre"
            value={selectedCentre}
            onChange={(e) => {
              setSelectedCentre(e.target.value)
              setSearchParams({ centre: e.target.value, date: selectedDate, window: selectedWindow })
            }}
            className="filter-select-input"
          >
            {centres.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-card">
          <label className="filter-label" htmlFor="q-date">
            <span className="material-symbols-outlined text-sm" style={{ color: '#003527' }}>calendar_today</span>
            Date
          </label>
          <select
            id="q-date"
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value)
              setSearchParams({ centre: selectedCentre, date: e.target.value, window: selectedWindow })
            }}
            className="filter-select-input"
          >
            {SLOT_DATES.map((d, idx) => (
              <option key={d} value={d}>
                {d} {idx === 0 ? '(Today)' : idx === 1 ? '(Tomorrow)' : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-card">
          <label className="filter-label" htmlFor="q-window">
            <span className="material-symbols-outlined text-sm" style={{ color: '#854d0e' }}>schedule</span>
            Time Slot Window
          </label>
          <select
            id="q-window"
            value={selectedWindow}
            onChange={(e) => {
              setSelectedWindow(e.target.value)
              setSearchParams({ centre: selectedCentre, date: selectedDate, window: e.target.value })
            }}
            className="filter-select-input"
          >
            {windows.map((w) => (
              <option key={w.key} value={w.key}>
                {w.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 5. Live Board KPI Stats */}
      <div className="queue-board-stats-grid">
        <div className="board-kpi-card serving">
          <span className="board-kpi-tag" style={{ color: '#166534' }}>
            <span className="material-symbols-outlined text-sm filled" style={{ color: '#166534' }}>check_circle</span>
            Counter 1 Serving
          </span>
          <div className="board-kpi-val" style={{ color: '#003527' }}>
            {nowServing ? nowServing.token : 'None'}
          </div>
          <span className="board-kpi-sub">
            {nowServing ? `${nowServing.name} · ${nowServing.crop}` : 'Counter is currently open'}
          </span>
        </div>

        <div className="board-kpi-card next">
          <span className="board-kpi-tag" style={{ color: '#854d0e' }}>
            <span className="material-symbols-outlined text-sm" style={{ color: '#854d0e' }}>bolt</span>
            Next in Line
          </span>
          <div className="board-kpi-val" style={{ color: '#854d0e' }}>
            {nextInLine ? nextInLine.token : 'None'}
          </div>
          <span className="board-kpi-sub">
            {nextInLine ? `${nextInLine.name} (${nextInLine.vehicleNumber})` : 'Waiting for arrivals'}
          </span>
        </div>

        <div className="board-kpi-card total">
          <span className="board-kpi-tag" style={{ color: '#4059aa' }}>
            <span className="material-symbols-outlined text-sm" style={{ color: '#4059aa' }}>groups</span>
            Total Scheduled
          </span>
          <div className="board-kpi-val" style={{ color: '#0d1c2e' }}>
            {queueList.length} Farmers
          </div>
          <span className="board-kpi-sub">For this selected window</span>
        </div>

        <div className="board-kpi-card centre">
          <span className="board-kpi-tag" style={{ color: '#404944' }}>
            <span className="material-symbols-outlined text-sm" style={{ color: '#404944' }}>pin_drop</span>
            Mandi Location
          </span>
          <div className="board-kpi-val" style={{ fontSize: '15px', fontFamily: 'inherit' }}>
            {centreInfo?.name || 'Mandi Yard'}
          </div>
          <span className="board-kpi-sub">📞 {centreInfo?.contact || '+91 7152 245012'}</span>
        </div>
      </div>

      {/* 6. Live Queue Table */}
      <div className="queue-table-card">
        <div className="table-header-flex">
          <h3 className="table-header-title">
            <span className="material-symbols-outlined" style={{ color: '#003527' }}>format_list_numbered</span>
            Queue Order: {centreInfo?.name} &bull; {selectedDate} ({windows.find((w) => w.key === selectedWindow)?.label})
          </h3>
          <span style={{ fontSize: '12px', fontWeight: '700', background: '#eff4ff', color: '#4059aa', padding: '4px 12px', borderRadius: '9999px' }}>
            {queueList.length} Scheduled
          </span>
        </div>

        {queueList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 20px', color: '#64748b' }}>
            <p style={{ margin: '0 0 12px 0', fontSize: '14px' }}>No farmers currently queued for this specific time slot window.</p>
            <Link
              to={`/book?centre=${selectedCentre}&date=${selectedDate}`}
              className="btn btn-primary"
              style={{ padding: '8px 18px', fontSize: '13px' }}
            >
              Book this Slot Now
            </Link>
          </div>
        ) : (
          <div className="queue-table-responsive">
            <table className="queue-data-table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>Queue #</th>
                  <th>Token</th>
                  <th>Farmer Name</th>
                  <th>Crop &amp; Quantity</th>
                  <th>Vehicle</th>
                  <th>Procurement Stage</th>
                  <th>Payment</th>
                  <th>Est. Wait</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {queueList.map((item) => {
                  const isUser = activeBooking?.token === item.token
                  const currentStatus = item.status || 'Booked'
                  const currentPayment = item.paymentStatus || 'Pending'

                  return (
                    <tr
                      key={item.token}
                      className={`${isUser ? 'queue-row-user' : ''} ${item.position === 1 ? 'queue-row-serving' : ''}`}
                    >
                      <td>
                        <span className="pos-circle-tag">#{item.position}</span>
                      </td>
                      <td>
                        <span className="token-cell-code">{item.token}</span>
                        {isUser && <span className="you-pill-badge">YOU</span>}
                      </td>
                      <td style={{ fontWeight: '600' }}>{item.name}</td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <span className="material-symbols-outlined text-sm" style={{ color: '#003527' }}>grass</span>
                          <span>{item.crop}</span>
                        </span>{' '}
                        <small style={{ color: '#64748b' }}>({item.quantity} q)</small>
                      </td>
                      <td>
                        <code style={{ background: '#eff4ff', padding: '2px 6px', borderRadius: '4px', fontSize: '12px', color: '#003527', fontWeight: '700' }}>
                          {item.vehicleNumber}
                        </code>
                      </td>
                      <td>
                        <span
                          className={`badge-status-pill ${
                            currentStatus === 'Completed'
                              ? 'pill-status-completed'
                              : ['At Gate', 'Quality Check', 'Weighment'].includes(currentStatus)
                              ? 'pill-status-serving'
                              : 'pill-status-booked'
                          }`}
                        >
                          {currentStatus}
                        </span>
                      </td>
                      <td>
                        <span className={`badge-status-pill ${currentPayment === 'Completed' ? 'pill-status-paid' : 'pill-status-pending'}`}>
                          {currentPayment}
                        </span>
                      </td>
                      <td style={{ fontWeight: '600', color: item.position === 1 ? '#166534' : '#0d1c2e' }}>
                        {item.waitLabel}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <Link to={`/booking/${item.token}`} className="btn-view-details-link">
                          <span>Details</span>
                          <span className="material-symbols-outlined text-xs">arrow_forward</span>
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 7. Mandi Entry Instructions Cards */}
      <div className="queue-info-cards-grid">
        <div className="queue-info-card">
          <h4>
            <span className="material-symbols-outlined text-sm" style={{ color: '#003527' }}>local_shipping</span>
            Yard Entry Protocol
          </h4>
          <p>Present your token at Gate 1 for weighbridge gross measurement before proceeding to the auction and unloading platform.</p>
        </div>
        <div className="queue-info-card">
          <h4>
            <span className="material-symbols-outlined text-sm" style={{ color: '#854d0e' }}>timer</span>
            Wait Time Calculation
          </h4>
          <p>Procurement takes approximately 8 minutes per vehicle (sampling test, moisture verification, and weighment).</p>
        </div>
        <div className="queue-info-card">
          <h4>
            <span className="material-symbols-outlined text-sm" style={{ color: '#4059aa' }}>notifications_active</span>
            Live Stage Alerts
          </h4>
          <p>This board refreshes automatically. Whenever mandi staff records your stage, your vehicle position updates here in real-time.</p>
        </div>
      </div>
    </div>
  )
}

export default QueueStatus
