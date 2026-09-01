import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { CROPS, SLOT_DATES, centres, slots } from '../data/centres.js'
import { useBookings } from '../context/useBookings.js'
import {
  availableSeatCount,
  findCentre,
  slotsForCentreDate,
} from '../utils/slots.js'
import SlotOptions from './SlotOptions.jsx'

const defaultForm = {
  name: '',
  mobile: '',
  village: '',
  crop: 'Paddy',
  quantity: '',
  vehicleNumber: '',
  centreId: '',
  date: SLOT_DATES[0],
  slotId: '',
}

function FarmerBookingForm({ title, eyebrow, lede, submitLabel = 'Confirm Booking & Generate Token' }) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { bookings, submitBooking } = useBookings()

  const initialCentre = searchParams.get('centre') || centres[0].id
  const initialDate = searchParams.get('date') || SLOT_DATES[0]

  const [form, setForm] = useState(() => ({
    ...defaultForm,
    centreId: initialCentre,
    date: initialDate,
  }))

  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [submitting, setSubmitting] = useState(false)

  const selectedCentre = useMemo(() => findCentre(centres, form.centreId), [form.centreId])

  const visibleSlots = useMemo(
    () => slotsForCentreDate(slots, form.centreId, form.date),
    [form.centreId, form.date],
  )

  const totalAvailableInCentre = useMemo(
    () => availableSeatCount(slots, bookings, form.centreId, form.date),
    [bookings, form.centreId, form.date],
  )

  function updateField(field, value) {
    setForm((current) => {
      const next = { ...current, [field]: value }
      if (field === 'centreId' || field === 'date') {
        next.slotId = ''
      }
      return next
    })

    setErrors((current) => {
      const next = { ...(current || {}) }
      delete next[field]
      delete next.duplicate
      if (field === 'centreId' || field === 'date') {
        delete next.slotId
      }
      return next
    })
  }

  function handleBlur(field) {
    setTouched((prev) => ({ ...prev, [field]: true }))
  }

  function addQuantity(amount) {
    const current = parseFloat(form.quantity) || 0
    updateField('quantity', String(current + amount))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setTouched({
      name: true,
      mobile: true,
      village: true,
      crop: true,
      quantity: true,
      vehicleNumber: true,
      centreId: true,
      date: true,
      slotId: true,
    })

    try {
      setSubmitting(true)
      const result = await submitBooking(form)
      if (!result || !result.ok) {
        setErrors(result?.errors || {})
        window.scrollTo({ top: 120, behavior: 'smooth' })
        setSubmitting(false)
        return
      }

      // Successfully booked -> Navigate to confirmation screen
      navigate(`/booking/${result.booking.token}`, {
        state: { isNewBooking: true, booking: result.booking },
      })
    } catch (err) {
      console.error('Booking submission error:', err)
      setErrors({ form: 'An unexpected error occurred while saving your booking. Please try again.' })
    } finally {
      setSubmitting(false)
    }
  }

  const errorCount = errors ? Object.keys(errors).length : 0

  return (
    <div className="page page-form-layout">
      <div className="form-header-box">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="lede">{lede}</p>
      </div>

      {errors?.duplicate && (
        <div className="alert-banner alert-warning" role="alert">
          <span className="alert-icon">⚠️</span>
          <div>
            <strong>Duplicate Booking Detected</strong>
            <p>{errors.duplicate}</p>
          </div>
        </div>
      )}

      {errors?.form && (
        <div className="alert-banner alert-danger" role="alert">
          <span className="alert-icon">⚠️</span>
          <div>
            <strong>Submission Error</strong>
            <p>{errors.form}</p>
          </div>
        </div>
      )}

      {errorCount > 0 && !errors?.duplicate && !errors?.form && (
        <div className="alert-banner alert-danger" role="alert">
          <span className="alert-icon">🚫</span>
          <div>
            <strong>Please fix the errors below before submitting:</strong>
            <ul className="error-summary-list">
              {Object.entries(errors).map(([key, err]) => (
                <li key={key}>{err}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <form className="booking-form-grid" onSubmit={handleSubmit} noValidate>
        {/* Section 1: Farmer Identity */}
        <section className="form-section panel">
          <div className="section-title-row">
            <span className="step-bubble">1</span>
            <h2>Farmer &amp; Contact Information</h2>
          </div>

          <div className="form-row-2">
            <div className={`form-group ${errors?.name && touched.name ? 'has-error' : ''}`}>
              <label htmlFor="f-name">
                Farmer Full Name <span className="req">*</span>
              </label>
              <input
                id="f-name"
                name="name"
                type="text"
                placeholder="e.g. Rameshwar Patil"
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                onBlur={() => handleBlur('name')}
                required
              />
              {errors?.name && <span className="field-error-text">{errors.name}</span>}
            </div>

            <div className={`form-group ${errors?.mobile && touched.mobile ? 'has-error' : ''}`}>
              <label htmlFor="f-mobile">
                Mobile Number (10 Digits) <span className="req">*</span>
              </label>
              <div className="input-prefix-wrap">
                <span className="input-prefix">+91</span>
                <input
                  id="f-mobile"
                  name="mobile"
                  type="tel"
                  maxLength={10}
                  inputMode="numeric"
                  placeholder="9876543210"
                  value={form.mobile}
                  onChange={(e) => updateField('mobile', e.target.value)}
                  onBlur={() => handleBlur('mobile')}
                  required
                />
              </div>
              {errors?.mobile ? (
                <span className="field-error-text">{errors.mobile}</span>
              ) : (
                <span className="field-hint">Token SMS &amp; queue updates will be sent here</span>
              )}
            </div>
          </div>

          <div className="form-row-2">
            <div className={`form-group ${errors?.village && touched.village ? 'has-error' : ''}`}>
              <label htmlFor="f-village">
                Village / Taluka <span className="req">*</span>
              </label>
              <input
                id="f-village"
                name="village"
                type="text"
                placeholder="e.g. Deoli, Wardha"
                value={form.village}
                onChange={(e) => updateField('village', e.target.value)}
                onBlur={() => handleBlur('village')}
                required
              />
              {errors?.village && <span className="field-error-text">{errors.village}</span>}
            </div>

            <div className={`form-group ${errors?.vehicleNumber && touched.vehicleNumber ? 'has-error' : ''}`}>
              <label htmlFor="f-vehicle">
                Vehicle Registration Number <span className="req">*</span>
              </label>
              <input
                id="f-vehicle"
                name="vehicleNumber"
                type="text"
                placeholder="e.g. MH-32-AB-1001 / Tractor No."
                value={form.vehicleNumber}
                onChange={(e) => updateField('vehicleNumber', e.target.value.toUpperCase())}
                onBlur={() => handleBlur('vehicleNumber')}
                required
              />
              {errors?.vehicleNumber ? (
                <span className="field-error-text">{errors.vehicleNumber}</span>
              ) : (
                <span className="field-hint">For mandi yard security and gate entry slip</span>
              )}
            </div>
          </div>
        </section>

        {/* Section 2: Crop & Produce Details */}
        <section className="form-section panel">
          <div className="section-title-row">
            <span className="step-bubble">2</span>
            <h2>Produce &amp; Crop Details</h2>
          </div>

          <div className="form-row-2">
            <div className={`form-group ${errors?.crop ? 'has-error' : ''}`}>
              <label htmlFor="f-crop">
                Crop Type <span className="req">*</span>
              </label>
              <select
                id="f-crop"
                name="crop"
                value={form.crop}
                onChange={(e) => updateField('crop', e.target.value)}
              >
                {CROPS.map((crop) => (
                  <option key={crop} value={crop}>
                    🌾 {crop}
                  </option>
                ))}
              </select>
              {errors?.crop && <span className="field-error-text">{errors.crop}</span>}
            </div>

            <div className={`form-group ${errors?.quantity && touched.quantity ? 'has-error' : ''}`}>
              <label htmlFor="f-quantity">
                Estimated Quantity (in Quintals) <span className="req">*</span>
              </label>
              <div className="input-suffix-wrap">
                <input
                  id="f-quantity"
                  name="quantity"
                  type="number"
                  min="0.1"
                  step="0.5"
                  placeholder="e.g. 15"
                  value={form.quantity}
                  onChange={(e) => updateField('quantity', e.target.value)}
                  onBlur={() => handleBlur('quantity')}
                  required
                />
                <span className="input-suffix">Quintals</span>
              </div>
              <div className="quick-qty-chips">
                <span className="quick-label">Quick add:</span>
                <button type="button" onClick={() => addQuantity(5)}>+5 q</button>
                <button type="button" onClick={() => addQuantity(10)}>+10 q</button>
                <button type="button" onClick={() => addQuantity(25)}>+25 q</button>
                <button type="button" onClick={() => addQuantity(50)}>+50 q</button>
              </div>
              {errors?.quantity && <span className="field-error-text">{errors.quantity}</span>}
            </div>
          </div>
        </section>

        {/* Section 3: Centre, Date & Slot Selection */}
        <section className="form-section panel">
          <div className="section-title-row">
            <span className="step-bubble">3</span>
            <h2>Procurement Centre &amp; Slot Selection</h2>
          </div>

          <div className="form-row-2">
            <div className={`form-group ${errors?.centreId ? 'has-error' : ''}`}>
              <label htmlFor="f-centre">
                Procurement Centre <span className="req">*</span>
              </label>
              <select
                id="f-centre"
                name="centreId"
                value={form.centreId}
                onChange={(e) => updateField('centreId', e.target.value)}
              >
                {centres.map((centre) => (
                  <option key={centre.id} value={centre.id}>
                    🏢 {centre.name} ({centre.location.split(',')[0]})
                  </option>
                ))}
              </select>
              {errors?.centreId && <span className="field-error-text">{errors.centreId}</span>}
            </div>

            <div className={`form-group ${errors?.date ? 'has-error' : ''}`}>
              <label htmlFor="f-date">
                Procurement Date <span className="req">*</span>
              </label>
              <select
                id="f-date"
                name="date"
                value={form.date}
                onChange={(e) => updateField('date', e.target.value)}
              >
                {SLOT_DATES.map((date, idx) => (
                  <option key={date} value={date}>
                    📅 {date} {idx === 0 ? '(Today)' : idx === 1 ? '(Tomorrow)' : ''}
                  </option>
                ))}
              </select>
              {errors?.date && <span className="field-error-text">{errors.date}</span>}
            </div>
          </div>

          {/* Selected Centre Info Card */}
          {selectedCentre && (
            <div className="centre-mini-summary-card">
              <div className="mini-summary-header">
                <div>
                  <strong>🏢 {selectedCentre.name}</strong>
                  <span className="summary-sub">📍 {selectedCentre.location}</span>
                </div>
                <div className="summary-badge">
                  <span className="badge badge-accent">⏰ {selectedCentre.openingHours}</span>
                </div>
              </div>
              <div className="mini-summary-footer">
                <span>📞 Mandi Helpline: <strong>{selectedCentre.contact}</strong></span>
                <span className="avail-counter">
                  Slots remaining on this date: <strong>{totalAvailableInCentre}</strong>
                </span>
              </div>
            </div>
          )}

          {/* Time Slot Picker */}
          <div className="slot-selection-area">
            <label className="slot-selection-label">
              Choose Time Slot Window <span className="req">*</span>
            </label>
            <SlotOptions
              slots={visibleSlots}
              bookings={bookings}
              value={form.slotId}
              onChange={(slotId) => updateField('slotId', slotId)}
              error={errors?.slotId}
            />
          </div>
        </section>

        {/* Submit Actions */}
        <div className="form-submit-row">
          <button className="btn btn-primary btn-lg" type="submit" disabled={submitting}>
            {submitting ? 'Saving to Firestore...' : `${submitLabel} →`}
          </button>
          <Link className="btn btn-secondary" to="/centres">
            View All Centres Directory
          </Link>
        </div>
      </form>
    </div>
  )
}

export default FarmerBookingForm
