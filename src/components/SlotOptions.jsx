import { getSlotStatus, remainingSeats, statusLabel } from '../utils/slots.js'

function SlotOptions({ slots = [], bookings = [], value, onChange, error }) {
  if (slots.length === 0) {
    return (
      <div className="date-notice-info-bar">
        <span className="material-symbols-outlined text-sm">info</span>
        <span>No procurement slots configured for this centre and date combination.</span>
      </div>
    )
  }

  return (
    <div>
      <div className="time-slots-grid" role="radiogroup" aria-label="Procurement Time Slots">
        {slots.map((slot) => {
          const status = getSlotStatus(slot, bookings)
          const remaining = remainingSeats(slot, bookings)
          const isFull = status === 'full'
          const isSelected = value === slot.id

          return (
            <label
              key={slot.id}
              className={`time-slot-card ${isSelected ? 'selected' : ''} ${isFull ? 'disabled' : ''}`}
            >
              <input
                type="radio"
                name="slotId"
                value={slot.id}
                checked={isSelected}
                disabled={isFull}
                onChange={() => onChange(slot.id)}
                style={{ display: 'none' }}
              />
              <div className="slot-card-top-row">
                <span className="slot-card-time">
                  <span className="material-symbols-outlined text-sm" style={{ color: '#003527' }}>schedule</span>
                  {slot.label}
                </span>
                {isFull ? (
                  <span className="date-status-badge badge-cap-red" style={{ width: 'auto', padding: '2px 8px' }}>
                    FULL
                  </span>
                ) : status === 'fast' ? (
                  <span className="date-status-badge badge-cap-yellow" style={{ width: 'auto', padding: '2px 8px' }}>
                    FAST FILLING
                  </span>
                ) : (
                  <span className="date-status-badge badge-cap-green" style={{ width: 'auto', padding: '2px 8px' }}>
                    AVAILABLE
                  </span>
                )}
              </div>

              <div className="slot-card-bottom-row">
                <span>
                  {isFull ? (
                    <strong style={{ color: '#ba1a1a' }}>0 slots available</strong>
                  ) : remaining === 1 ? (
                    <strong style={{ color: '#854d0e' }}>⚡ Only 1 slot left!</strong>
                  ) : (
                    <span><strong>{remaining}</strong> of {slot.capacity} slots left</span>
                  )}
                </span>
                {isSelected && (
                  <span className="slot-card-selected-tag">
                    <span className="material-symbols-outlined text-sm filled" style={{ color: '#003527' }}>check_circle</span>
                    Selected
                  </span>
                )}
              </div>
            </label>
          )
        })}
      </div>
      {error && (
        <div style={{ color: '#ba1a1a', fontSize: '13px', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span className="material-symbols-outlined text-sm">error</span>
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}

export default SlotOptions
