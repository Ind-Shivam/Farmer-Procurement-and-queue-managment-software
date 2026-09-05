import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { centres, slots } from '../data/centres.js'
import { useBookings } from '../context/useBookings.js'
import { findBookingByTokenOrMobile } from '../utils/booking.js'
import { getQueueSummary } from '../utils/queue.js'
import { findCentre, findSlot } from '../utils/slots.js'

function BookingDetails() {
  const { bookingId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { bookings, lookupBooking, loading } = useBookings()
  const [copied, setCopied] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [asyncBooking, setAsyncBooking] = useState(null)
  const [searching, setSearching] = useState(false)

  const isNewBooking = location.state?.isNewBooking ?? false

  // 1. Synchronous lookup from local/state bookings
  const localMatch = useMemo(() => {
    return findBookingByTokenOrMobile(bookings, bookingId)
  }, [bookings, bookingId])

  // 2. Async lookup from Firestore if not found locally
  useEffect(() => {
    let isMounted = true
    if (localMatch || !bookingId || !lookupBooking) {
      return
    }

    Promise.resolve().then(() => {
      if (isMounted) setSearching(true)
      return lookupBooking(bookingId)
    })
      .then((res) => {
        if (isMounted) setAsyncBooking(res)
      })
      .catch(() => {
        if (isMounted) setAsyncBooking(null)
      })
      .finally(() => {
        if (isMounted) setSearching(false)
      })

    return () => {
      isMounted = false
    }
  }, [bookingId, localMatch, lookupBooking])

  const booking = localMatch || asyncBooking

  const centre = useMemo(() => {
    return booking ? findCentre(centres, booking.centreId) : null
  }, [booking])

  const slot = useMemo(() => {
    return booking ? findSlot(slots, booking.slotId) : null
  }, [booking])

  const queueSummary = useMemo(() => {
    return booking ? getQueueSummary(bookings, booking) : null
  }, [bookings, booking])

  function handleCopyToken() {
    if (booking?.token) {
      navigator.clipboard.writeText(booking.token)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }

  function handlePrintSlip() {
    const slip = document.querySelector('.printable-area')
    if (!slip) return

    const printWindow = window.open('', '_blank', 'width=900,height=1200')
    if (!printWindow) {
      window.print()
      return
    }

    const stylesheetLinks = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
      .map((link) => `<link rel="stylesheet" href="${link.href}">`)
      .join('')

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>KisanSetu Token ${booking?.token || ''}</title>
          ${stylesheetLinks}
          <style>
            @page { size: A4 portrait; margin: 10mm; }
            html, body { margin: 0; padding: 0; background: #fff; }
            body { width: 190mm; }
            .printable-area {
              visibility: visible !important;
              position: static !important;
              width: 190mm !important;
              min-height: 0 !important;
              margin: 0 !important;
              padding: 10mm !important;
              box-sizing: border-box !important;
              border: 2px solid #000 !important;
              border-radius: 0 !important;
              box-shadow: none !important;
              gap: 10px !important;
              overflow: hidden !important;
            }
            .printable-area * { visibility: visible !important; }
            .no-print { display: none !important; }
          </style>
        </head>
        <body>${slip.outerHTML}</body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    printWindow.onload = () => {
      window.setTimeout(() => {
        printWindow.print()
        printWindow.close()
      }, 250)
    }
  }

  function handleSearch(e) {
    e.preventDefault()
    if (!searchQuery.trim()) return
    const clean = searchQuery.trim()
    navigate(`/booking/${clean}`)
  }

  if (loading || searching) {
    return (
      <div className="page page-narrow">
        <div className="not-found-card panel" style={{ textAlign: 'center', padding: '40px' }}>
          <div className="animate-spin" style={{ fontSize: '32px', marginBottom: '16px' }}>⏳</div>
          <h2>Looking up Booking Record...</h2>
          <p className="text-muted">Fetching latest token and queue status from database.</p>
        </div>
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="page page-narrow">
        <div className="not-found-card panel">
          <div className="not-found-icon">🔍</div>
          <h1>Booking Record Not Found</h1>
          <p className="lede">
            We could not find any active booking matching Token or Mobile <code>{bookingId}</code>.
          </p>
          <form className="search-token-form" onSubmit={handleSearch}>
            <input
              type="text"
              placeholder="Enter Token (e.g. KC-2026-0101) or Mobile (e.g. 9876500001)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button type="submit" className="btn btn-primary">
              Search Booking
            </button>
          </form>
          <div className="token-suggestions">
            <span>Try searching by sample token or mobile:</span>
            <div className="token-pills">
              {bookings.slice(0, 4).map((b) => (
                <Link key={b.token} to={`/booking/${b.token}`} className="token-link-pill">
                  {b.token} ({b.name} · {b.mobile})
                </Link>
              ))}
            </div>
          </div>
          <div className="actions" style={{ marginTop: '24px' }}>
            <Link className="btn btn-primary" to="/book">
              Book a New Slot
            </Link>
            <Link className="btn" to="/">
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const bookingStatus = booking.status || 'Booked'
  const paymentStatus = booking.paymentStatus || 'Pending'

  return (
    <div className="page page-narrow">
      {/* Confirmation celebration banner */}
      {isNewBooking && (
        <div className="celebrate-banner" role="status">
          <div className="celebrate-icon">🎉</div>
          <div>
            <h2>Slot Booked Successfully!</h2>
            <p>Your official procurement token has been generated and saved to Firestore.</p>
          </div>
        </div>
      )}

      <div className="details-header-row no-print">
        <div>
          <p className="eyebrow">Procurement Token Confirmation</p>
          <h1>Token Receipt &amp; Pass</h1>
        </div>
        <div className="header-actions">
          <button className="btn btn-sm" onClick={handlePrintSlip} title="Print this receipt">
            🖨️ Print Slip
          </button>
        </div>
      </div>

      {/* Quick Lookup Bar in Details */}
      <div className="panel no-print" style={{ marginBottom: '20px', padding: '16px 20px' }}>
        <form className="search-token-form" onSubmit={handleSearch} style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            placeholder="Search another Token or Mobile number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ flex: 1 }}
          />
          <button type="submit" className="btn btn-secondary btn-sm">
            Lookup
          </button>
        </form>
      </div>

      {/* Official Printable Token Slip Card */}
      <div className="token-slip-card printable-area">
        <div className="slip-top-brand">
          <div className="gov-emblem">🌾</div>
          <div className="slip-title-box">
            <h3>APMC AGRICULTURAL PROCUREMENT PASS</h3>
            <p>Department of Agriculture &amp; Farmers Welfare · Govt of Maharashtra</p>
          </div>
          <div className="slip-watermark">VERIFIED</div>
        </div>

        {/* Large Token & Queue Highlight */}
        <div className="token-hero-box">
          <div className="token-display">
            <span className="token-caption">OFFICIAL TOKEN NUMBER</span>
            <strong className="token-code">{booking.token}</strong>
            <button
              type="button"
              className="btn-copy-token no-print"
              onClick={handleCopyToken}
              title="Copy token to clipboard"
            >
              {copied ? '✓ Copied!' : '📋 Copy Token'}
            </button>
          </div>

          <div className="queue-metric-box">
            <div className="q-metric">
              <span className="q-label">Queue Position</span>
              <strong className="q-val text-primary">
                {queueSummary.position ? `#${queueSummary.position}` : '—'}
              </strong>
            </div>
            <div className="q-metric">
              <span className="q-label">Farmers Ahead</span>
              <strong className="q-val">{queueSummary.peopleAhead}</strong>
            </div>
            <div className="q-metric">
              <span className="q-label">Est. Wait Time</span>
              <strong className="q-val text-accent">{queueSummary.waitLabel}</strong>
            </div>
          </div>
        </div>

        {/* Status Callout with Booking & Payment Statuses */}
        <div className="slip-status-pill-row">
          <span className="status-indicator-pill">
            📋 Booking Status: <strong>{bookingStatus}</strong>
          </span>
          <span className="status-indicator-pill">
            💳 Payment Status: <strong>{paymentStatus}</strong>
          </span>
          <span className="status-indicator-pill">
            📅 Issued: <strong>{new Date(booking.createdAt).toLocaleDateString('en-IN')}</strong>
          </span>
        </div>

        {/* Details Grid */}
        <div className="slip-data-grid">
          <div className="slip-data-group">
            <h4>Farmer Information</h4>
            <dl className="slip-dl">
              <div>
                <dt>Farmer Name</dt>
                <dd><strong>{booking.name}</strong></dd>
              </div>
              <div>
                <dt>Mobile Number</dt>
                <dd>+91 {booking.mobile}</dd>
              </div>
              <div>
                <dt>Village / Taluka</dt>
                <dd>{booking.village}</dd>
              </div>
              <div>
                <dt>Vehicle Registration</dt>
                <dd className="vehicle-badge">{booking.vehicleNumber}</dd>
              </div>
            </dl>
          </div>

          <div className="slip-data-group">
            <h4>Procurement &amp; Schedule</h4>
            <dl className="slip-dl">
              <div>
                <dt>Centre Name</dt>
                <dd><strong>{centre?.name || booking.centreId}</strong></dd>
              </div>
              <div>
                <dt>Location</dt>
                <dd>{centre?.location || 'Mandi Yard'}</dd>
              </div>
              <div>
                <dt>Procurement Date</dt>
                <dd><strong>{booking.date}</strong></dd>
              </div>
              <div>
                <dt>Time Slot Window</dt>
                <dd className="time-highlight">🕒 {slot?.label || '09:00 – 11:00'}</dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Produce Summary Box */}
        <div className="produce-summary-box">
          <div className="produce-item">
            <span className="p-label">Registered Crop</span>
            <strong className="p-val">🌾 {booking.crop}</strong>
          </div>
          <div className="produce-divider" />
          <div className="produce-item">
            <span className="p-label">Quantity Declared</span>
            <strong className="p-val">{booking.quantity} Quintals</strong>
          </div>
          <div className="produce-divider" />
          <div className="produce-item">
            <span className="p-label">Helpline</span>
            <strong className="p-val">{centre?.contact || '+91 7152 245012'}</strong>
          </div>
        </div>

        {/* Instructions checklist */}
        <div className="slip-guidelines">
          <h5>Gate Entry Instructions for Farmer:</h5>
          <ul>
            <li>Please arrive at the yard gate <strong>15 minutes before</strong> your time window.</li>
            <li>Carry your physical <strong>Aadhaar Card, Land 7/12 Extract, and Bank Passbook copy</strong>.</li>
            <li>Keep this token number handy on SMS or physical print for weighbridge entry.</li>
          </ul>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="actions details-actions-bar no-print">
        <Link
          className="btn btn-primary"
          to={`/queue?centre=${booking.centreId}&date=${booking.date}&token=${booking.token}`}
        >
          Track Live Queue Board →
        </Link>
        <Link className="btn" to="/book">
          Book Another Slot
        </Link>
        <Link className="btn" to="/">
          Farmer Portal Home
        </Link>
      </div>
    </div>
  )
}

export default BookingDetails
