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
    const printWindow = window.open('', '_blank', 'width=950,height=1200')
    if (!printWindow) {
      window.print()
      return
    }

    const mspRates = {
      Wheat: 2275,
      Paddy: 2183,
      Soybean: 4600,
      Cotton: 6620,
      Mustard: 5450,
      Gram: 5440,
      Maize: 2090,
    }
    const cropRate = mspRates[booking?.crop] || 2275
    const estPayout = ((parseFloat(booking?.quantity) || 1) * cropRate).toLocaleString('en-IN')
    const formattedDate = booking?.date || '2026-08-30'
    const slotLabel = slot?.label || (booking?.slotId ? booking.slotId.split('_')[2] : '09:00 – 11:00')
    const centreTitle = centre?.name || booking?.centreId || 'APMC Procurement Mandi'
    const centreLoc = centre?.location || 'APMC Market Yard, Maharashtra'
    const centrePhone = centre?.contact || '+91 7152 245012'
    const issuedDate = new Date(booking?.createdAt || Date.now()).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })

    const printHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>KisanSetu Official Token Pass - ${booking?.token || 'Receipt'}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@600;700;800&display=swap" rel="stylesheet">
  <style>
    @page {
      size: A4 portrait;
      margin: 8mm 10mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #f8fafc;
      color: #0f172a;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      padding: 12px;
      display: flex;
      justify-content: center;
    }
    .print-container {
      width: 100%;
      max-width: 800px;
      background: #ffffff;
      border: 2.5px solid #064e3b;
      border-radius: 16px;
      padding: 24px 28px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
      position: relative;
      overflow: hidden;
    }
    /* Top Decorative Security Bar */
    .top-security-bar {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 6px;
      background: linear-gradient(90deg, #064e3b 0%, #10b981 50%, #064e3b 100%);
    }
    /* Header & Branding */
    .slip-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px dashed #cbd5e1;
      padding-bottom: 14px;
      margin-bottom: 16px;
    }
    .brand-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .emblem-box {
      width: 48px;
      height: 48px;
      border-radius: 10px;
      background: #ecfdf5;
      border: 1.5px solid #a7f3d0;
      display: grid;
      place-items: center;
      font-size: 24px;
    }
    .title-block h1 {
      font-size: 15px;
      font-weight: 800;
      color: #064e3b;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      margin-bottom: 2px;
    }
    .title-block p {
      font-size: 11.5px;
      color: #64748b;
      font-weight: 500;
    }
    .verified-stamp {
      border: 2px solid #059669;
      background: #f0fdf4;
      color: #059669;
      font-size: 11px;
      font-weight: 800;
      padding: 4px 10px;
      border-radius: 6px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      display: flex;
      align-items: center;
      gap: 4px;
      transform: rotate(-2deg);
    }
    /* Hero Token Box */
    .token-hero {
      background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
      border: 2px solid #10b981;
      border-radius: 12px;
      padding: 16px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 14px;
    }
    .token-left {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .token-eyebrow {
      font-size: 10.5px;
      font-weight: 800;
      letter-spacing: 0.1em;
      color: #047857;
      text-transform: uppercase;
    }
    .token-number {
      font-family: 'JetBrains Mono', monospace;
      font-size: 30px;
      font-weight: 800;
      color: #064e3b;
      letter-spacing: 0.04em;
      line-height: 1.1;
    }
    .queue-metrics-row {
      display: flex;
      gap: 10px;
    }
    .q-box {
      background: #ffffff;
      border: 1px solid #a7f3d0;
      border-radius: 8px;
      padding: 6px 12px;
      text-align: center;
      min-width: 82px;
      box-shadow: 0 1px 2px rgba(0,0,0,0.04);
    }
    .q-box .q-title {
      font-size: 9.5px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      margin-bottom: 2px;
    }
    .q-box .q-data {
      font-size: 15px;
      font-weight: 800;
      color: #064e3b;
    }
    .q-box .q-data.accent {
      color: #b45309;
    }
    /* Status Badges */
    .status-bar {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 14px;
    }
    .status-pill {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      padding: 4px 10px;
      border-radius: 9999px;
      font-size: 11.5px;
      color: #334155;
    }
    .status-pill strong {
      color: #0f172a;
    }
    .status-pill.green {
      background: #ecfdf5;
      border-color: #a7f3d0;
      color: #065f46;
    }
    .status-pill.amber {
      background: #fef3c7;
      border-color: #fde68a;
      color: #92400e;
    }
    /* 2-Column Grid */
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
      margin-bottom: 14px;
    }
    .info-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 14px;
    }
    .info-card h3 {
      font-size: 11.5px;
      font-weight: 800;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin-bottom: 8px;
      padding-bottom: 4px;
      border-bottom: 1.5px solid #e2e8f0;
    }
    .data-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12.5px;
      padding: 4px 0;
    }
    .data-row .lbl {
      color: #64748b;
      font-weight: 500;
    }
    .data-row .val {
      color: #0f172a;
      font-weight: 600;
      text-align: right;
    }
    .vehicle-plate {
      background: #0f172a;
      color: #f8fafc;
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 4px;
      letter-spacing: 0.05em;
    }
    .slot-badge {
      background: #ecfdf5;
      color: #047857;
      border: 1px solid #a7f3d0;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 6px;
      font-size: 11.5px;
    }
    /* Produce & Valuation Strip */
    .produce-strip {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      padding: 12px 14px;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      text-align: center;
      margin-bottom: 14px;
    }
    .p-col {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .p-col .p-lbl {
      font-size: 9.5px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
    }
    .p-col .p-val {
      font-size: 13.5px;
      font-weight: 800;
      color: #0f172a;
    }
    .p-col .p-val.highlight {
      color: #047857;
      font-size: 14px;
    }
    /* Instructions */
    .instructions-card {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 14px;
      background: #ffffff;
      margin-bottom: 14px;
    }
    .instructions-card h4 {
      font-size: 10.5px;
      font-weight: 800;
      color: #334155;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 4px;
    }
    .instructions-card ul {
      padding-left: 16px;
      font-size: 11px;
      color: #475569;
      line-height: 1.45;
    }
    .instructions-card ul li strong {
      color: #0f172a;
    }
    /* Footer */
    .auth-footer-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      padding-top: 8px;
      border-top: 1px dashed #cbd5e1;
      font-size: 10.5px;
      color: #64748b;
    }
    .stamp-box {
      text-align: center;
      border: 1px dashed #94a3b8;
      border-radius: 6px;
      padding: 4px 12px;
      font-size: 9.5px;
      color: #64748b;
    }
    .stamp-box strong {
      display: block;
      color: #064e3b;
      font-size: 10.5px;
      margin-bottom: 1px;
    }
  </style>
</head>
<body>
  <div class="print-container">
    <div class="top-security-bar"></div>

    <!-- 1. Header -->
    <div class="slip-header">
      <div class="brand-left">
        <div class="emblem-box">🌾</div>
        <div class="title-block">
          <h1>APMC AGRICULTURAL PROCUREMENT PASS</h1>
          <p>Department of Agriculture &amp; Farmers Welfare &bull; Govt. of Maharashtra</p>
        </div>
      </div>
      <div class="verified-stamp">
        ✓ VERIFIED PASS
      </div>
    </div>

    <!-- 2. Hero Token Box -->
    <div class="token-hero">
      <div class="token-left">
        <span class="token-eyebrow">OFFICIAL PROCUREMENT TOKEN</span>
        <div class="token-number">#${booking?.token || ''}</div>
      </div>
      <div class="queue-metrics-row">
        <div class="q-box">
          <div class="q-title">Queue Slot</div>
          <div class="q-data">#${queueSummary?.position || '1'}</div>
        </div>
        <div class="q-box">
          <div class="q-title">Ahead</div>
          <div class="q-data">${queueSummary?.peopleAhead ?? '0'}</div>
        </div>
        <div class="q-box">
          <div class="q-title">Est. Wait</div>
          <div class="q-data accent">${queueSummary?.waitLabel || '10 min'}</div>
        </div>
      </div>
    </div>

    <!-- 3. Status Bar -->
    <div class="status-bar">
      <span class="status-pill green">
        📋 Booking: <strong>${booking?.status || 'Booked'}</strong>
      </span>
      <span class="status-pill ${(booking?.paymentStatus || 'Pending') === 'Completed' ? 'green' : 'amber'}">
        💳 Payment: <strong>${booking?.paymentStatus || 'Pending'}</strong>
      </span>
      <span class="status-pill">
        📅 Issued On: <strong>${issuedDate}</strong>
      </span>
      <span class="status-pill">
        🔒 Security: <strong>Govt. Digital Token</strong>
      </span>
    </div>

    <!-- 4. 2-Column Info Grid -->
    <div class="info-grid">
      <!-- Farmer Details -->
      <div class="info-card">
        <h3>Farmer Profile</h3>
        <div class="data-row">
          <span class="lbl">Farmer Name</span>
          <span class="val"><strong>${booking?.name || 'Farmer'}</strong></span>
        </div>
        <div class="data-row">
          <span class="lbl">Mobile Number</span>
          <span class="val">+91 ${booking?.mobile || ''}</span>
        </div>
        <div class="data-row">
          <span class="lbl">Village / Taluka</span>
          <span class="val">${booking?.village || 'Not specified'}</span>
        </div>
        <div class="data-row">
          <span class="lbl">Vehicle Reg. No.</span>
          <span class="val"><span class="vehicle-plate">${booking?.vehicleNumber || 'MH-32-AB-1002'}</span></span>
        </div>
      </div>

      <!-- Schedule & Center -->
      <div class="info-card">
        <h3>Procurement &amp; Mandi Center</h3>
        <div class="data-row">
          <span class="lbl">Procurement Center</span>
          <span class="val"><strong>${centreTitle}</strong></span>
        </div>
        <div class="data-row">
          <span class="lbl">Yard Location</span>
          <span class="val">${centreLoc}</span>
        </div>
        <div class="data-row">
          <span class="lbl">Reporting Date</span>
          <span class="val"><strong>${formattedDate}</strong></span>
        </div>
        <div class="data-row">
          <span class="lbl">Assigned Time Slot</span>
          <span class="val"><span class="slot-badge">🕒 ${slotLabel}</span></span>
        </div>
      </div>
    </div>

    <!-- 5. Produce & MSP Details -->
    <div class="produce-strip">
      <div class="p-col">
        <span class="p-lbl">Registered Crop</span>
        <span class="p-val">🌾 ${booking?.crop || 'Wheat'}</span>
      </div>
      <div class="p-col">
        <span class="p-lbl">Quantity Declared</span>
        <span class="p-val">${booking?.quantity || 1} Quintals</span>
      </div>
      <div class="p-col">
        <span class="p-lbl">Govt. MSP Rate</span>
        <span class="p-val">₹${cropRate.toLocaleString('en-IN')} / Qtl</span>
      </div>
      <div class="p-col">
        <span class="p-lbl">Est. Total Value</span>
        <span class="p-val highlight">₹${estPayout}</span>
      </div>
    </div>

    <!-- 6. Instructions -->
    <div class="instructions-card">
      <h4>Official Gate Entry &amp; Weighbridge Instructions</h4>
      <ul>
        <li>Please arrive at the Mandi Entry Gate <strong>15 minutes prior</strong> to your time slot (${slotLabel}).</li>
        <li>Present this digital token pass along with original <strong>Aadhaar Card, Land 7/12 (Satbara) Extract, and Bank Passbook</strong>.</li>
        <li>Proceed directly to the moisture check counter and electronic weighbridge upon token callout on the live queue screen.</li>
      </ul>
    </div>

    <!-- 7. Footer Seal & Barcode -->
    <div class="auth-footer-row">
      <div>
        <div style="font-family: 'JetBrains Mono', monospace; font-size: 10px; font-weight: 700; color: #475569; letter-spacing: 0.1em; margin-bottom: 2px;">
          ||| | |||| || ||| ||||| || |||| |||
        </div>
        <div>Auth ID: KS-${booking?.token || ''}-${Date.now().toString(36).toUpperCase()}</div>
      </div>
      <div class="stamp-box">
        <strong>APMC MANDI DESK</strong>
        <span>e-Procurement Verified Pass</span>
      </div>
      <div style="text-align: right;">
        <div>Helpline: <strong>${centrePhone}</strong></div>
        <div>Toll-Free: <strong>1800-267-2026</strong></div>
      </div>
    </div>
  </div>
</body>
</html>`

    printWindow.document.open()
    printWindow.document.write(printHtml)
    printWindow.document.close()

    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 450)
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
