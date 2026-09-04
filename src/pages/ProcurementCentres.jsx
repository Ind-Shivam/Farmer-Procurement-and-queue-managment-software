import { useState } from 'react'
import { Link } from 'react-router-dom'
import { SLOT_DATES, centres, slots } from '../data/centres.js'
import { useBookings } from '../context/useBookings.js'
import {
  availableSeatCount,
  slotsForCentreDate,
  totalCapacityForCentreDate,
} from '../utils/slots.js'

function ProcurementCentres() {
  const { bookings, centres: dynamicCentres } = useBookings()
  const displayCentres = dynamicCentres && dynamicCentres.length > 0 ? dynamicCentres : centres
  const [selectedDate, setSelectedDate] = useState(SLOT_DATES[0])

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Government Procurement Network</p>
          <h1>Procurement Centres &amp; Slot Availability</h1>
          <p className="lede">
            Check live slot capacity, operating hours, and accepted crops across all
            district mandi yards. Select a centre to reserve your slot directly.
          </p>
        </div>
      </div>

      {/* Date Filter Tabs */}
      <div className="date-filter-bar">
        <span className="filter-label">Select Date:</span>
        <div className="pill-group" role="tablist" aria-label="Procurement Dates">
          {SLOT_DATES.map((date, idx) => {
            const isSelected = selectedDate === date
            const dateObj = new Date(date)
            const formatted = dateObj.toLocaleDateString('en-IN', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
            })
            const label = idx === 0 ? `Today (${formatted})` : idx === 1 ? `Tomorrow (${formatted})` : formatted

            return (
              <button
                key={date}
                type="button"
                role="tab"
                aria-selected={isSelected}
                className={`pill-btn ${isSelected ? 'active' : ''}`}
                onClick={() => setSelectedDate(date)}
              >
                <span className="material-symbols-outlined text-sm">calendar_month</span>
                <span>{label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Centres Grid */}
      <div className="centres-grid">
        {displayCentres.map((centre) => {
          const availCount = availableSeatCount(slots, bookings, centre.id, selectedDate)
          const totalCap = totalCapacityForCentreDate(slots, centre.id, selectedDate)
          const bookedCount = Math.max(0, totalCap - availCount)
          const fillPercent = totalCap > 0 ? Math.round((bookedCount / totalCap) * 100) : 0
          const centreSlots = slotsForCentreDate(slots, centre.id, selectedDate)

          const isFull = availCount === 0
          const isNearlyFull = availCount > 0 && availCount <= 4

          return (
            <article key={centre.id} className="centre-card">
              <div className="centre-card-header">
                <div className="centre-badge-row">
                  <span className={`status-badge ${isFull ? 'status-full' : isNearlyFull ? 'status-nearly' : 'status-avail'}`}>
                    {isFull ? '🔴 Fully Booked' : isNearlyFull ? `⚠️ Limited Slots (${availCount} left)` : `🟢 ${availCount} Slots Available`}
                  </span>
                  <span className="badge badge-neutral">Cap: {totalCap}</span>
                </div>
                <h2 className="centre-name">{centre.name}</h2>
                <p className="centre-location">📍 {centre.location}</p>
              </div>

              <div className="centre-card-body">
                <div className="centre-meta-list">
                  <div className="meta-item">
                    <span className="meta-label">⏰ Operating Hours</span>
                    <span className="meta-value">{centre.openingHours}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">📞 Mandi Helpline</span>
                    <span className="meta-value">{centre.contact}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">🌾 Accepted Crops</span>
                    <div className="crop-tags">
                      {centre.acceptedCrops.map((c) => (
                        <span key={c} className="crop-tag">{c}</span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Capacity Progress Bar */}
                <div className="capacity-bar-container">
                  <div className="capacity-labels">
                    <span>Occupancy Fill Rate</span>
                    <strong>{fillPercent}% Booked</strong>
                  </div>
                  <div className="progress-track" role="progressbar" aria-valuenow={fillPercent} aria-valuemin="0" aria-valuemax="100">
                    <div
                      className={`progress-fill ${fillPercent >= 100 ? 'fill-full' : fillPercent >= 75 ? 'fill-warn' : 'fill-ok'}`}
                      style={{ width: `${Math.min(100, fillPercent)}%` }}
                    />
                  </div>
                </div>

                {/* Slot Window Breakdown */}
                <div className="slot-mini-preview">
                  <span className="mini-title">Slot Windows for {selectedDate}:</span>
                  <div className="mini-slots-row">
                    {centreSlots.map((s) => {
                      const taken = (s.reserved || 0) + bookings.filter((b) => b.slotId === s.id).length
                      const remaining = Math.max(0, s.capacity - taken)
                      const sFull = remaining === 0
                      return (
                        <div key={s.id} className={`mini-slot-chip ${sFull ? 'chip-full' : remaining <= 2 ? 'chip-warn' : 'chip-ok'}`}>
                          <span className="chip-time">{s.label.split(' – ')[0]}</span>
                          <span className="chip-count">{sFull ? 'Full' : `${remaining} left`}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              <div className="centre-card-footer">
                <Link
                  to={`/book?centre=${centre.id}&date=${selectedDate}`}
                  className={`btn btn-primary btn-block ${isFull ? 'disabled' : ''}`}
                >
                  {isFull ? 'Centre Full for Date' : `Book Slot at ${centre.name} →`}
                </Link>
                <Link
                  to={`/queue?centre=${centre.id}&date=${selectedDate}`}
                  className="btn btn-secondary btn-block"
                >
                  View Live Queue
                </Link>
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}

export default ProcurementCentres
