import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { SLOT_DATES, centres, windows } from '../data/centres.js'
import { useBookings } from '../context/useBookings.js'
import { findBookingByTokenOrMobile } from '../utils/booking.js'
import { getLiveQueueForSlot, getQueueSummary } from '../utils/queue.js'
import { findCentre, findSlot } from '../utils/slots.js'

function QueueStatus() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { bookings, notifications, refreshData, refreshing, isFirebaseActive } = useBookings()

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
    <div className="page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <p className="eyebrow">Real-Time Mandi Operations · Live Feed</p>
          <h1>Live Procurement Queue Board</h1>
          <p className="lede">
            Track live token callouts, estimated counter waiting times, procurement statuses, and payment progression.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            type="button"
            className={`btn btn-sm ${refreshing ? 'btn-secondary' : 'btn-primary'}`}
            onClick={refreshData}
            disabled={refreshing}
            title="Re-fetch latest queue and status from Firestore"
          >
            {refreshing ? '🔄 Refreshing...' : '🔄 Refresh Queue'}
          </button>
          <span className={`badge ${isFirebaseActive ? 'badge-accent' : 'badge-neutral'}`}>
            {isFirebaseActive ? '🔥 Firestore Connected' : '⚡ Local Mode'}
          </span>
        </div>
      </div>

      {/* Quick Token & Mobile Lookup Bar */}
      <div className="token-lookup-bar panel">
        <form className="lookup-form" onSubmit={handleTokenSearch}>
          <div className="lookup-input-group" style={{ flex: 1 }}>
            <span className="lookup-icon">🎫</span>
            <input
              type="text"
              placeholder="Enter Token (e.g. KC-2026-0101) or Mobile (e.g. 9876500001)..."
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary">
            Find My Status in Queue →
          </button>
        </form>

        {activeToken && (
          <div className="active-token-status" style={{ marginTop: '12px' }}>
            {activeBooking ? (
              <div className="token-found-badge">
                <span>
                  Showing position for <strong>{activeBooking.token}</strong> ({activeBooking.name} &bull; {activeBooking.status || 'Booked'})
                </span>
                <Link to={`/booking/${activeBooking.token}`} className="link-underlined" style={{ marginLeft: '12px' }}>
                  View Full Pass Slip
                </Link>
              </div>
            ) : (
              <span className="token-not-found">
                ⚠️ No booking found for &ldquo;{activeToken}&rdquo;. Check your token number or mobile digits.
              </span>
            )}
          </div>
        )}
      </div>

      {/* Detailed Highlight Card for Active Queried Token */}
      {activeBooking && userQueueSummary && (
        <div className="panel" style={{ border: '2px solid var(--primary, #16a34a)', background: 'var(--card-bg, #fff)', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
            <div>
              <span className="badge badge-accent" style={{ marginBottom: '6px', display: 'inline-block' }}>
                🌾 YOUR RESERVATION DETAILS
              </span>
              <h2 style={{ margin: '4px 0' }}>Token: {activeBooking.token}</h2>
              <p className="text-muted" style={{ margin: 0 }}>
                Farmer: <strong>{activeBooking.name}</strong> &bull; +91 {activeBooking.mobile} &bull; 🚗 {activeBooking.vehicleNumber}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <span className="status-pill pill-serving" style={{ fontSize: '0.9rem', padding: '6px 12px' }}>
                📋 Procurement: <strong>{activeBooking.status || 'Booked'}</strong>
              </span>
              <span className="status-pill pill-next" style={{ fontSize: '0.9rem', padding: '6px 12px' }}>
                💳 Payment: <strong>{activeBooking.paymentStatus || 'Pending'}</strong>
              </span>
            </div>
          </div>

          <div className="stat-row" style={{ marginTop: '12px', marginBottom: '12px' }}>
            <div className="stat-card">
              <span className="stat-tag">🏢 Centre &amp; Slot</span>
              <strong className="stat-num" style={{ fontSize: '1.25rem' }}>
                {findCentre(centres, activeBooking.centreId)?.name || activeBooking.centreId}
              </strong>
              <span className="stat-sub">
                📅 {activeBooking.date} &bull; 🕒 {activeSlotInfo?.label || '09:00 – 11:00'}
              </span>
            </div>

            <div className="stat-card">
              <span className="stat-tag">📍 Queue Position</span>
              <strong className="stat-num text-primary">
                {userQueueSummary.position ? `#${userQueueSummary.position}` : '—'}
              </strong>
              <span className="stat-sub">
                {userQueueSummary.statusLabel}
              </span>
            </div>

            <div className="stat-card">
              <span className="stat-tag">👥 Farmers Ahead</span>
              <strong className="stat-num">{userQueueSummary.peopleAhead}</strong>
              <span className="stat-sub">Vehicles in line before you</span>
            </div>

            <div className="stat-card">
              <span className="stat-tag">⏱️ Est. Waiting Time</span>
              <strong className="stat-num text-accent">{userQueueSummary.waitLabel}</strong>
              <span className="stat-sub">Calculated at 8 mins/vehicle</span>
            </div>
          </div>

          {/* In-app status update alerts for this specific farmer */}
          {tokenNotifications.length > 0 && (
            <div style={{ background: '#f0fdf4', borderLeft: '4px solid var(--primary, #16a34a)', padding: '10px 14px', borderRadius: '6px', marginTop: '12px' }}>
              <strong>🔔 Latest Notification from Mandi:</strong>
              <p style={{ margin: '4px 0 0 0', color: '#166534', fontSize: '0.9rem' }}>
                {tokenNotifications[0].message}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Queue Filter Controls */}
      <div className="queue-controls-card panel">
        <div className="control-group">
          <label htmlFor="q-centre">🏢 Procurement Centre</label>
          <select
            id="q-centre"
            value={selectedCentre}
            onChange={(e) => {
              setSelectedCentre(e.target.value)
              setSearchParams({ centre: e.target.value, date: selectedDate, window: selectedWindow })
            }}
          >
            {centres.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="control-group">
          <label htmlFor="q-date">📅 Date</label>
          <select
            id="q-date"
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value)
              setSearchParams({ centre: selectedCentre, date: e.target.value, window: selectedWindow })
            }}
          >
            {SLOT_DATES.map((d, idx) => (
              <option key={d} value={d}>
                {d} {idx === 0 ? '(Today)' : idx === 1 ? '(Tomorrow)' : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="control-group">
          <label htmlFor="q-window">🕒 Time Slot Window</label>
          <select
            id="q-window"
            value={selectedWindow}
            onChange={(e) => {
              setSelectedWindow(e.target.value)
              setSearchParams({ centre: selectedCentre, date: selectedDate, window: e.target.value })
            }}
          >
            {windows.map((w) => (
              <option key={w.key} value={w.key}>
                {w.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Live Board KPI Stats */}
      <div className="stat-row board-stat-row">
        <div className="stat-card stat-serving">
          <span className="stat-tag">🟢 Counter 1 Serving</span>
          <strong className="stat-num">{nowServing ? nowServing.token : 'None'}</strong>
          <span className="stat-sub">{nowServing ? `${nowServing.name} · ${nowServing.crop}` : 'Counter idle'}</span>
        </div>

        <div className="stat-card stat-next">
          <span className="stat-tag">⚡ Next in Line</span>
          <strong className="stat-num">{nextInLine ? nextInLine.token : 'None'}</strong>
          <span className="stat-sub">{nextInLine ? `${nextInLine.name} (${nextInLine.vehicleNumber})` : 'Waiting for arrivals'}</span>
        </div>

        <div className="stat-card">
          <span className="stat-tag">👥 Total Scheduled</span>
          <strong className="stat-num">{queueList.length}</strong>
          <span className="stat-sub">Farmers for this time window</span>
        </div>

        <div className="stat-card">
          <span className="stat-tag">🌾 Mandi Location</span>
          <strong className="stat-num" style={{ fontSize: '1.15rem' }}>{centreInfo?.name || 'Mandi Yard'}</strong>
          <span className="stat-sub">📞 {centreInfo?.contact || '+91 7152 245012'}</span>
        </div>
      </div>

      {/* Live Queue Table */}
      <div className="panel queue-table-panel">
        <div className="table-header-bar">
          <h3>
            📋 Live Queue Order for {centreInfo?.name} · {selectedDate} ({windows.find((w) => w.key === selectedWindow)?.label})
          </h3>
          <span className="badge badge-accent">{queueList.length} Farmers Scheduled</span>
        </div>

        {queueList.length === 0 ? (
          <div className="empty-queue-notice">
            <p>No farmers currently queued for this specific time slot.</p>
            <Link
              to={`/book?centre=${selectedCentre}&date=${selectedDate}`}
              className="btn btn-primary"
              style={{ marginTop: '12px' }}
            >
              Book this Slot Now
            </Link>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="queue-table">
              <thead>
                <tr>
                  <th>Pos</th>
                  <th>Token Number</th>
                  <th>Farmer Name</th>
                  <th>Produce</th>
                  <th>Vehicle</th>
                  <th>Procurement Status</th>
                  <th>Payment Status</th>
                  <th>Est. Wait</th>
                  <th>Actions</th>
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
                      className={`queue-row ${isUser ? 'row-user-active' : ''} ${item.position === 1 ? 'row-serving' : ''}`}
                    >
                      <td>
                        <span className="pos-badge">#{item.position}</span>
                      </td>
                      <td>
                        <strong className="token-mono">{item.token}</strong>
                        {isUser && <span className="your-token-tag">YOU</span>}
                      </td>
                      <td>{item.name}</td>
                      <td>
                        {item.crop} <small className="text-muted">({item.quantity} q)</small>
                      </td>
                      <td>
                        <code className="vehicle-code">{item.vehicleNumber}</code>
                      </td>
                      <td>
                        <span
                          className={`status-pill ${
                            currentStatus === 'Completed'
                              ? 'pill-next'
                              : ['At Gate', 'Quality Check', 'Weighment'].includes(currentStatus)
                              ? 'pill-serving'
                              : 'pill-waiting'
                          }`}
                        >
                          {currentStatus}
                        </span>
                      </td>
                      <td>
                        <span className="badge badge-neutral">{currentPayment}</span>
                      </td>
                      <td>{item.waitLabel}</td>
                      <td>
                        <Link to={`/booking/${item.token}`} className="btn-table-action">
                          Details
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

      {/* Helpful Mandi Entry Tips */}
      <div className="info-cards-grid">
        <div className="card">
          <h3>🚚 Yard Entry Procedure</h3>
          <p>Present your token number at Gate 1 for weighbridge gross measurement before entering the auction platform.</p>
        </div>
        <div className="card">
          <h3>⏱️ Wait Time Calculation</h3>
          <p>Procurement takes approximately 8 minutes per vehicle (sampling, moisture test, and unloading).</p>
        </div>
        <div className="card">
          <h3>🔔 Real-Time Notifications</h3>
          <p>Watch this live board or refresh your pass. Whenever staff updates your stage, your status reflects here instantly.</p>
        </div>
      </div>
    </div>
  )
}

export default QueueStatus
