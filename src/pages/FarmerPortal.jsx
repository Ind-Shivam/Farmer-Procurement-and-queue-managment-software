import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { SLOT_DATES, centres, slots } from '../data/centres.js'
import { useBookings } from '../context/useBookings.js'
import { availableSeatCount, totalCapacityForCentreDate } from '../utils/slots.js'

function FarmerPortal() {
  const navigate = useNavigate()
  const { bookings } = useBookings()
  const [tokenInput, setTokenInput] = useState('')
  const today = SLOT_DATES[0]

  function handleQuickLookup(e) {
    e.preventDefault()
    if (!tokenInput.trim()) return
    const clean = tokenInput.trim()
    navigate(`/booking/${clean}`)
  }

  return (
    <div className="page portal-page">
      {/* Hero Section */}
      <section className="portal-hero">
        <div className="hero-content">
          <span className="hero-pill">🌾 SIH26032 · KisanSetu Q-Ease</span>
          <h1 className="hero-title">
            Book Mandi Slots.<br />
            Skip the Waiting Queue.
          </h1>
          <p className="hero-lede">
            Transparent, zero-wait agricultural procurement for farmers. Reserve your time window
            in advance, receive your digital token, and monitor live queue positions from your phone.
          </p>

          <div className="hero-actions">
            <Link className="btn btn-primary btn-lg" to="/book">
              📅 Book Procurement Slot
            </Link>
            <Link className="btn btn-secondary btn-lg" to="/centres">
              🏢 View Centres &amp; Capacity
            </Link>
            <Link className="btn btn-secondary btn-lg" to="/queue">
              📊 Live Queue Board
            </Link>
          </div>
        </div>

        {/* Quick Token & Mobile Search Box */}
        <div className="hero-card panel">
          <h3>🎫 Track Your Booking</h3>
          <p className="subtext">Enter your Token number or 10-digit registered mobile number to track status or reprint pass.</p>
          <form className="quick-token-form" onSubmit={handleQuickLookup}>
            <input
              type="text"
              placeholder="e.g. KC-2026-0101 or 9876500001"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
            />
            <button type="submit" className="btn btn-primary">
              Track Booking →
            </button>
          </form>
          <div className="quick-sample-tokens">
            <small>Recent sample tokens:</small>
            <div className="token-pills-mini">
              {bookings.slice(0, 3).map((b) => (
                <Link key={b.token} to={`/booking/${b.token}`} className="mini-pill">
                  {b.token} ({b.name})
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Live Centres Overview for Today */}
      <section className="portal-section">
        <div className="section-header-flex">
          <div>
            <p className="eyebrow">Procurement Yards</p>
            <h2>Today&apos;s Mandi Yard Availability ({today})</h2>
          </div>
          <Link to="/centres" className="btn btn-secondary btn-sm">
            View All Centres &amp; Dates →
          </Link>
        </div>

        <div className="centres-summary-grid">
          {centres.map((centre) => {
            const avail = availableSeatCount(slots, bookings, centre.id, today)
            const total = totalCapacityForCentreDate(slots, centre.id, today)
            const isFull = avail === 0
            const isNearly = avail > 0 && avail <= 4

            return (
              <div key={centre.id} className="centre-summary-card panel">
                <div className="card-top-row">
                  <span className={`status-badge ${isFull ? 'status-full' : isNearly ? 'status-nearly' : 'status-avail'}`}>
                    {isFull ? '🔴 Full' : isNearly ? `⚠️ ${avail} slots left` : `🟢 ${avail} slots available`}
                  </span>
                  <span className="badge badge-neutral">Cap: {total}</span>
                </div>
                <h3>{centre.name}</h3>
                <p className="summary-loc">📍 {centre.location}</p>
                <div className="summary-meta">
                  <span>⏰ {centre.openingHours}</span>
                  <span>📞 {centre.contact}</span>
                </div>
                <div className="summary-actions">
                  <Link
                    to={`/book?centre=${centre.id}&date=${today}`}
                    className={`btn btn-sm btn-primary ${isFull ? 'disabled' : ''}`}
                  >
                    {isFull ? 'Full for Today' : 'Book at this Centre'}
                  </Link>
                  <Link to={`/queue?centre=${centre.id}&date=${today}`} className="btn btn-sm">
                    Live Queue
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* 3-Step Workflow Guide */}
      <section className="portal-section">
        <p className="eyebrow">How KisanSetu Works</p>
        <h2>Smart Procurement in 3 Easy Steps</h2>

        <div className="workflow-steps-grid">
          <div className="step-card panel">
            <div className="step-number">01</div>
            <h3>Choose Centre &amp; Produce</h3>
            <p>
              Select your nearest procurement mandi yard, declare your crop type (Paddy, Wheat, Soybean, etc.) and quantity in quintals.
            </p>
          </div>

          <div className="step-card panel">
            <div className="step-number">02</div>
            <h3>Pick a Guaranteed Slot</h3>
            <p>
              Browse live available time windows. Lock in your slot to prevent mandi yard gridlock and avoid peak-hour rush.
            </p>
          </div>

          <div className="step-card panel">
            <div className="step-number">03</div>
            <h3>Get Token &amp; Track Live</h3>
            <p>
              Receive your official digital token (e.g. <code>KC-2026-0104</code>). Watch counter queue numbers from home and arrive right on schedule.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}

export default FarmerPortal
