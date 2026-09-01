import { getSlotStatus, remainingSeats, statusLabel } from '../utils/slots.js'

function SlotOptions({ slots = [], bookings = [], value, onChange, error }) {
  if (slots.length === 0) {
    return (
      <div className="slot-empty-notice">
        <p>⚠️ No procurement slots configured for this centre and date combination.</p>
      </div>
    )
  }

  return (
    <div className="slot-selector-container">
      <div className="slot-grid" role="radiogroup" aria-label="Procurement Time Slots">
        {slots.map((slot) => {
          const status = getSlotStatus(slot, bookings)
          const remaining = remainingSeats(slot, bookings)
          const isFull = status === 'full'
          const isSelected = value === slot.id

          return (
            <label
              key={slot.id}
              className={`slot-card slot-status-${status} ${isSelected ? 'selected' : ''} ${isFull ? 'disabled' : ''}`}
            >
              <input
                type="radio"
                name="slotId"
                value={slot.id}
                checked={isSelected}
                disabled={isFull}
                onChange={() => onChange(slot.id)}
                className="slot-radio-input"
              />
              <div className="slot-card-header">
                <span className="slot-time-title">🕒 {slot.label}</span>
                <span className={`slot-badge badge-${status}`}>
                  {statusLabel(status)}
                </span>
              </div>
              <div className="slot-card-footer">
                <span className="slot-seat-count">
                  {isFull ? (
                    <strong className="text-danger">0 seats available</strong>
                  ) : remaining === 1 ? (
                    <strong className="text-warning">⚡ Only 1 seat left!</strong>
                  ) : (
                    <span><strong>{remaining}</strong> of {slot.capacity} seats left</span>
                  )}
                </span>
                {isSelected && <span className="slot-selected-mark">✓ Selected</span>}
              </div>
            </label>
          )
        })}
      </div>
      {error && <div className="field-error-msg">⚠️ {error}</div>}
    </div>
  )
}

export default SlotOptions
