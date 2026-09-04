import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CROPS, SLOT_DATES, centres, slots } from '../data/centres.js'
import { useAuth } from '../context/useAuth.js'
import { useBookings } from '../context/useBookings.js'
import {
  availableSeatCount,
  findCentre,
  slotsForCentreDate,
} from '../utils/slots.js'
import ProcurementMap from './ProcurementMap.jsx'
import SlotOptions from './SlotOptions.jsx'

const defaultForm = {
  name: '',
  mobile: '',
  village: '',
  crop: 'Wheat',
  quantity: '45.5',
  vehicleNumber: '',
  centreId: '',
  date: SLOT_DATES[0] || '2026-08-30',
  slotId: '',
}

function formatDateDisplay(dateStr) {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

function formatShortDate(dateStr) {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  } catch {
    return dateStr
  }
}

function getDayAbbr(dateStr) {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return 'Day'
    return d.toLocaleDateString('en-US', { weekday: 'short' })
  } catch {
    return 'Day'
  }
}

function FarmerBookingForm({ title = 'Book Slot', eyebrow = 'Direct Slot Reservation' }) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { userProfile, currentUser } = useAuth()
  const { bookings, centres: dynamicCentres, submitBooking } = useBookings()

  const activeCentres = useMemo(
    () => (dynamicCentres && dynamicCentres.length > 0 ? dynamicCentres : centres),
    [dynamicCentres],
  )

  const initialCentre = searchParams.get('centre') || activeCentres[0]?.id || 'wardha-pacs'
  const initialDate = searchParams.get('date') || SLOT_DATES[0] || '2026-08-30'

  const [form, setForm] = useState(() => ({
    ...defaultForm,
    name: userProfile?.name || currentUser?.displayName || '',
    mobile: userProfile?.mobile || '',
    village: userProfile?.village || '',
    centreId: initialCentre,
    date: initialDate,
  }))

  const [centreSearch, setCentreSearch] = useState('')
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [isProduceDetailsOpen, setIsProduceDetailsOpen] = useState(true)

  const selectedCentre = useMemo(() => findCentre(activeCentres, form.centreId) || activeCentres[0], [activeCentres, form.centreId])

  const visibleSlots = useMemo(
    () => slotsForCentreDate(slots, form.centreId, form.date),
    [form.centreId, form.date],
  )

  const totalAvailableInCentre = useMemo(
    () => availableSeatCount(slots, bookings, form.centreId, form.date),
    [bookings, form.centreId, form.date],
  )

  // Estimated crop MSP calculation
  const estTotalValue = useMemo(() => {
    const qty = parseFloat(form.quantity) || 0
    const mspRates = {
      Wheat: 2275,
      Paddy: 2183,
      Soybean: 4600,
      Cotton: 6620,
      Mustard: 5450,
      Gram: 5440,
      Maize: 2090,
    }
    const rate = mspRates[form.crop] || 2275
    return qty * rate
  }, [form.quantity, form.crop])

  // Filter centres
  const filteredCentres = useMemo(() => {
    if (!centreSearch.trim()) return activeCentres
    const q = centreSearch.toLowerCase()
    return activeCentres.filter(
      (c) => c.name.toLowerCase().includes(q) || c.location.toLowerCase().includes(q),
    )
  }, [centreSearch, activeCentres])

  // Build 5 horizontal date picker cards
  const dateOptions = useMemo(() => {
    const datesList = [...SLOT_DATES]
    while (datesList.length < 5) {
      const last = datesList[datesList.length - 1] || '2026-08-30'
      const dt = new Date(last)
      dt.setDate(dt.getDate() + 1)
      const nextStr = dt.toISOString().split('T')[0]
      datesList.push(nextStr)
    }

    return datesList.slice(0, 5).map((d) => {
      const avail = availableSeatCount(slots, bookings, form.centreId, d)
      let capacityLabel = 'Available'
      let badgeClass = 'badge-cap-green'
      if (avail === 0) {
        capacityLabel = 'Few Slots Left'
        badgeClass = 'badge-cap-red'
      } else if (avail >= 15) {
        capacityLabel = 'High Capacity'
        badgeClass = 'badge-cap-green'
      } else if (avail <= 5) {
        capacityLabel = 'Fast Filling'
        badgeClass = 'badge-cap-yellow'
      }

      return {
        dateStr: d,
        dayName: getDayAbbr(d),
        displayDate: formatShortDate(d),
        capacityLabel,
        badgeClass,
      }
    })
  }, [bookings, form.centreId])

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
      delete next.form
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
    updateField('quantity', String(Math.max(0.5, current + amount)))
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

      // Navigate to confirmation screen
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

  const hasProduceDetails = Boolean(form.name && form.mobile && form.crop && form.quantity)
  const isStep2Active = hasProduceDetails && Boolean(form.centreId && form.date)

  return (
    <div className="book-slot-container">
      {/* 1. Top Header */}
      <div className="book-slot-top-bar">
        <div>
          <span className="book-slot-eyebrow">{eyebrow}</span>
          <h1 className="book-slot-heading">{title}</h1>
        </div>
        <div className="badge-msp-guaranteed">
          <span className="material-symbols-outlined text-sm filled" style={{ color: '#166534' }}>verified</span>
          <span>MSP Direct Intake</span>
        </div>
      </div>

      {/* Global Error Banners */}
      {errors?.duplicate && (
        <div className="alert-error-box" role="alert">
          <span className="material-symbols-outlined">warning</span>
          <div>
            <strong>Duplicate Booking Detected</strong>
            <p>{errors.duplicate}</p>
          </div>
        </div>
      )}

      {errors?.form && (
        <div className="alert-error-box" role="alert">
          <span className="material-symbols-outlined">error</span>
          <div>
            <strong>Submission Error</strong>
            <p>{errors.form}</p>
          </div>
        </div>
      )}

      {Object.keys(errors).length > 0 && !errors?.duplicate && !errors?.form && (
        <div className="alert-error-box" role="alert">
          <span className="material-symbols-outlined">error</span>
          <div>
            <strong>Please complete the required fields:</strong>
            <ul>
              {Object.entries(errors).map(([key, err]) => (
                <li key={key}>{err}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="book-slot-main-grid">
          {/* LEFT COLUMN: Stepper & Selection Cards */}
          <div className="book-slot-left-column">
            {/* 1. Stepper Bar */}
            <div className="stepper-container-card">
              <ol className="stepper-nav-list">
                {/* Step 1 */}
                <li className={`stepper-item-node ${hasProduceDetails ? 'completed' : 'active'}`}>
                  <span className="stepper-node-circle">
                    {hasProduceDetails ? (
                      <span className="material-symbols-outlined text-sm">check</span>
                    ) : (
                      '1'
                    )}
                  </span>
                  <span className="stepper-node-label">Crop Details</span>
                </li>

                <div className={`stepper-divider-line ${hasProduceDetails ? 'completed' : ''}`} />

                {/* Step 2 */}
                <li className={`stepper-item-node ${isStep2Active ? 'completed' : 'active'}`}>
                  <span className="stepper-node-circle">
                    {form.centreId && form.date ? (
                      <span className="material-symbols-outlined text-sm">check</span>
                    ) : (
                      '2'
                    )}
                  </span>
                  <span className="stepper-node-label">Center &amp; Date</span>
                </li>

                <div className={`stepper-divider-line ${form.slotId ? 'completed' : ''}`} />

                {/* Step 3 */}
                <li className={`stepper-item-node ${form.slotId ? 'completed' : 'pending'}`}>
                  <span className="stepper-node-circle">
                    {form.slotId ? (
                      <span className="material-symbols-outlined text-sm">check</span>
                    ) : (
                      '3'
                    )}
                  </span>
                  <span className="stepper-node-label">Choose Slot</span>
                </li>
              </ol>
            </div>

            {/* Step 1: Crop & Farmer Details Card */}
            <div className="form-section-card">
              <div className="card-header-flex">
                <h2 className="card-header-title">
                  <span className="material-symbols-outlined" style={{ color: '#003527' }}>agriculture</span>
                  Crop &amp; Farmer Details
                </h2>
                <button
                  type="button"
                  onClick={() => setIsProduceDetailsOpen(!isProduceDetailsOpen)}
                  className="btn-card-action-text"
                >
                  <span className="material-symbols-outlined text-base">
                    {isProduceDetailsOpen ? 'expand_less' : 'edit'}
                  </span>
                  <span>{isProduceDetailsOpen ? 'Minimize' : 'Edit Produce'}</span>
                </button>
              </div>

              {isProduceDetailsOpen ? (
                <div>
                  {/* Row 1: Crop and Quantity */}
                  <div className="form-grid-2">
                    <div className="form-group-item">
                      <label htmlFor="slot-f-crop">
                        Crop Type <span style={{ color: '#ba1a1a' }}>*</span>
                      </label>
                      <select
                        id="slot-f-crop"
                        value={form.crop}
                        onChange={(e) => updateField('crop', e.target.value)}
                        className="form-control-select"
                      >
                        {CROPS.map((c) => (
                          <option key={c} value={c}>🌾 {c}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group-item">
                      <label htmlFor="slot-f-qty">
                        Quantity (Quintals) <span style={{ color: '#ba1a1a' }}>*</span>
                      </label>
                      <input
                        id="slot-f-qty"
                        type="number"
                        min="0.5"
                        step="0.5"
                        placeholder="45.5"
                        value={form.quantity}
                        onChange={(e) => updateField('quantity', e.target.value)}
                        onBlur={() => handleBlur('quantity')}
                        className={`form-control-input ${errors?.quantity && touched.quantity ? 'has-error' : ''}`}
                        required
                      />
                      {errors?.quantity && (
                        <span className="field-error-text">{errors.quantity}</span>
                      )}
                    </div>
                  </div>

                  {/* Row 2: Farmer Name and Mobile */}
                  <div className="form-grid-2">
                    <div className="form-group-item">
                      <label htmlFor="slot-f-name">
                        Farmer Full Name <span style={{ color: '#ba1a1a' }}>*</span>
                      </label>
                      <input
                        id="slot-f-name"
                        type="text"
                        placeholder="e.g. Ramesh Singh"
                        value={form.name}
                        onChange={(e) => updateField('name', e.target.value)}
                        onBlur={() => handleBlur('name')}
                        className={`form-control-input ${errors?.name && touched.name ? 'has-error' : ''}`}
                        required
                      />
                      {errors?.name && (
                        <span className="field-error-text">{errors.name}</span>
                      )}
                    </div>

                    <div className="form-group-item">
                      <label htmlFor="slot-f-mobile">
                        Mobile Number (10 Digits) <span style={{ color: '#ba1a1a' }}>*</span>
                      </label>
                      <div className="form-prefix-input-wrap">
                        <span className="input-prefix-tag">+91</span>
                        <input
                          id="slot-f-mobile"
                          type="tel"
                          maxLength={10}
                          inputMode="numeric"
                          placeholder="9876543210"
                          value={form.mobile}
                          onChange={(e) => updateField('mobile', e.target.value)}
                          onBlur={() => handleBlur('mobile')}
                          className={`form-control-input ${errors?.mobile && touched.mobile ? 'has-error' : ''}`}
                          required
                        />
                      </div>
                      {errors?.mobile && (
                        <span className="field-error-text">{errors.mobile}</span>
                      )}
                    </div>
                  </div>

                  {/* Row 3: Village and Vehicle */}
                  <div className="form-grid-2">
                    <div className="form-group-item">
                      <label htmlFor="slot-f-village">
                        Village / Taluka <span style={{ color: '#ba1a1a' }}>*</span>
                      </label>
                      <input
                        id="slot-f-village"
                        type="text"
                        placeholder="e.g. Deoli, Wardha"
                        value={form.village}
                        onChange={(e) => updateField('village', e.target.value)}
                        onBlur={() => handleBlur('village')}
                        className={`form-control-input ${errors?.village && touched.village ? 'has-error' : ''}`}
                        required
                      />
                      {errors?.village && (
                        <span className="field-error-text">{errors.village}</span>
                      )}
                    </div>

                    <div className="form-group-item">
                      <label htmlFor="slot-f-vehicle">
                        Vehicle Registration No. <span style={{ color: '#ba1a1a' }}>*</span>
                      </label>
                      <input
                        id="slot-f-vehicle"
                        type="text"
                        placeholder="e.g. MH-32-AB-1001 / Tractor"
                        value={form.vehicleNumber}
                        onChange={(e) => updateField('vehicleNumber', e.target.value.toUpperCase())}
                        onBlur={() => handleBlur('vehicleNumber')}
                        className={`form-control-input ${errors?.vehicleNumber && touched.vehicleNumber ? 'has-error' : ''}`}
                        style={{ textTransform: 'uppercase' }}
                        required
                      />
                      {errors?.vehicleNumber && (
                        <span className="field-error-text">{errors.vehicleNumber}</span>
                      )}
                    </div>
                  </div>

                  {/* Quick Quantity Chips */}
                  <div className="chips-quick-row">
                    <span className="chips-quick-label">Quick Add Qty:</span>
                    <button type="button" onClick={() => addQuantity(5)} className="chip-quick-btn">+5 q</button>
                    <button type="button" onClick={() => addQuantity(10)} className="chip-quick-btn">+10 q</button>
                    <button type="button" onClick={() => addQuantity(25)} className="chip-quick-btn">+25 q</button>
                    <button type="button" onClick={() => addQuantity(50)} className="chip-quick-btn">+50 q</button>
                  </div>
                </div>
              ) : (
                <div className="form-grid-2">
                  <div className="form-group-item">
                    <label>Crop Type</label>
                    <div style={{ padding: '10px 14px', background: '#eff4ff', borderRadius: '8px', border: '1px solid #bfc9c3', fontWeight: '600' }}>
                      🌾 {form.crop}
                    </div>
                  </div>
                  <div className="form-group-item">
                    <label>Declared Quantity</label>
                    <div style={{ padding: '10px 14px', background: '#eff4ff', borderRadius: '8px', border: '1px solid #bfc9c3', fontWeight: '600' }}>
                      {form.quantity} Quintals
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Step 2: Select Procurement Date Card */}
            <div className="form-section-card">
              <div className="card-header-flex">
                <div>
                  <h2 className="card-header-title">
                    <span className="material-symbols-outlined" style={{ color: '#003527' }}>calendar_today</span>
                    Select Procurement Date
                  </h2>
                  <p className="card-header-subtitle">
                    Operating hours: 08:00 AM - 05:00 PM · 4 daily time windows available
                  </p>
                </div>

                <div>
                  <label htmlFor="custom-date-picker" style={{ display: 'none' }}>Choose date</label>
                  <input
                    id="custom-date-picker"
                    type="date"
                    min="2026-08-30"
                    value={form.date}
                    onChange={(e) => updateField('date', e.target.value)}
                    style={{
                      padding: '6px 12px',
                      background: '#eff4ff',
                      border: '1px solid #bfc9c3',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: '#0d1c2e',
                      cursor: 'pointer',
                    }}
                  />
                </div>
              </div>

              {/* 5-Day Horizontal Date Matrix */}
              <div className="date-picker-grid-5">
                {dateOptions.map((opt) => {
                  const isSelected = form.date === opt.dateStr
                  return (
                    <button
                      key={opt.dateStr}
                      type="button"
                      onClick={() => updateField('date', opt.dateStr)}
                      className={`date-matrix-card ${isSelected ? 'selected' : ''}`}
                    >
                      <div className="date-top-row">
                        <span className="date-day-abbr">{opt.dayName}</span>
                        {isSelected && (
                          <span className="material-symbols-outlined text-sm filled" style={{ color: '#003527' }}>
                            check_circle
                          </span>
                        )}
                      </div>
                      <span className="date-val-text">{opt.displayDate}</span>
                      <span className={`date-status-badge ${opt.badgeClass}`}>
                        {opt.capacityLabel}
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* Date Notice Info Banner */}
              <div className="date-notice-info-bar">
                <span className="material-symbols-outlined text-sm" style={{ color: '#003527' }}>event_available</span>
                <span>
                  Selected Date: <strong>{formatDateDisplay(form.date)}</strong> · Maximum daily intake quota active ({totalAvailableInCentre} slots open)
                </span>
              </div>
            </div>

            {/* Step 3: Select Procurement Center Card */}
            <div className="form-section-card">
              <div className="card-accent-bar-left" />
              <div className="card-header-flex">
                <h2 className="card-header-title">
                  <span className="material-symbols-outlined" style={{ color: '#4059aa' }}>location_city</span>
                  Select Procurement Center
                </h2>
                <span style={{ fontSize: '12px', fontWeight: '700', background: '#eff4ff', color: '#4059aa', padding: '4px 10px', borderRadius: '9999px' }}>
                  {activeCentres.length} Mandi Hubs
                </span>
              </div>

              {/* Search Bar */}
              <div className="centre-search-container">
                <span className="material-symbols-outlined text-sm centre-search-icon-pos">search</span>
                <input
                  type="text"
                  placeholder="Search by district or center name..."
                  value={centreSearch}
                  onChange={(e) => setCentreSearch(e.target.value)}
                  className="centre-search-input-field"
                />
              </div>

              {/* Center List */}
              <div className="centres-cards-scroll-box">
                {filteredCentres.map((centre, idx) => {
                  const isSelected = form.centreId === centre.id
                  const avail = availableSeatCount(slots, bookings, centre.id, form.date)
                  const isFull = avail === 0
                  const isHigh = avail >= 15

                  return (
                    <label
                      key={centre.id}
                      className={`centre-card-option ${isSelected ? 'selected' : ''} ${isFull ? 'disabled' : ''}`}
                    >
                      <input
                        type="radio"
                        name="centre"
                        checked={isSelected}
                        disabled={isFull}
                        onChange={() => updateField('centreId', centre.id)}
                        style={{ display: 'none' }}
                      />
                      <span className="material-symbols-outlined centre-card-icon">
                        {isFull ? 'location_off' : 'location_on'}
                      </span>
                      <div className="centre-card-body">
                        <div className="centre-card-header-flex">
                          <h3 className="centre-card-title">{centre.name}</h3>
                          {isFull ? (
                            <span className="date-status-badge badge-cap-red" style={{ width: 'auto', padding: '2px 8px' }}>
                              FULL
                            </span>
                          ) : isHigh ? (
                            <span className="date-status-badge badge-cap-green" style={{ width: 'auto', padding: '2px 8px' }}>
                              HIGH AVAILABILITY
                            </span>
                          ) : (
                            <span className="date-status-badge badge-cap-yellow" style={{ width: 'auto', padding: '2px 8px' }}>
                              LIMITED AVAILABILITY
                            </span>
                          )}
                        </div>
                        <p className="centre-card-desc">
                          Distance: ~{12 + idx * 12} km | {avail * 30} Qtl Capacity remaining ({avail} slots open)
                        </p>
                        <p className="centre-card-hours">
                          ⏰ Operates: {centre.openingHours} · 📞 {centre.contact}
                        </p>
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>

            {/* Step 4: Choose Time Slot Window Card */}
            <div className="form-section-card">
              <div className="card-header-flex" style={{ marginBottom: '14px' }}>
                <div>
                  <h2 className="card-header-title">
                    <span className="material-symbols-outlined" style={{ color: '#003527' }}>schedule</span>
                    Choose Time Slot Window <span style={{ color: '#ba1a1a' }}>*</span>
                  </h2>
                  <p className="card-header-subtitle">
                    Lock in your guaranteed queue window to avoid mandi yard congestion.
                  </p>
                </div>
              </div>

              <SlotOptions
                slots={visibleSlots}
                bookings={bookings}
                value={form.slotId}
                onChange={(slotId) => updateField('slotId', slotId)}
                error={errors?.slotId}
              />
            </div>

            {/* Submit & Next Step Bar */}
            <div className="submit-confirm-bar">
              <div className="submit-summary-text">
                <div>Produce: <strong>{form.quantity || '0'} Quintals of {form.crop}</strong></div>
                <div style={{ fontSize: '12px', marginTop: '2px' }}>
                  Mandi Yard: <strong>{selectedCentre.name}</strong> · Date: <strong>{form.date}</strong>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn-submit-booking-green"
              >
                <span>{submitting ? 'Confirming with Mandi Database...' : 'Confirm Mandi Slot & Generate Token'}</span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN: Map Preview & Booking Guidelines */}
          <div className="book-slot-right-column">
            {/* Map Preview Card */}
            <div className="side-map-container">
              <ProcurementMap
                centres={activeCentres}
                selectedCentreId={form.centreId}
                onSelectCentre={(centreId) => updateField('centreId', centreId)}
              />
              <div className="side-map-badge-overlay">
                <div>
                  <p className="side-map-title">{selectedCentre.name}</p>
                  <p className="side-map-subtitle">Selected Center · {selectedCentre.location}</p>
                </div>
                <span className="material-symbols-outlined" style={{ color: '#4059aa' }}>my_location</span>
              </div>
            </div>

            {/* Estimated MSP Payout Card */}
            <div className="side-payout-box">
              <div className="side-payout-header">
                <span className="material-symbols-outlined text-sm" style={{ color: '#4059aa' }}>payments</span>
                <span className="side-payout-label">ESTIMATED MSP PAYOUT</span>
              </div>
              <h3 className="side-payout-value">
                ₹{estTotalValue.toLocaleString('en-IN')}
              </h3>
              <p className="side-payout-subtext">
                Based on Govt. MSP rate for {form.crop} ({form.quantity || 0} Quintals)
              </p>
            </div>

            {/* Info Card / Booking Guidelines */}
            <div className="side-guidelines-box">
              <div className="side-guidelines-header">
                <span className="material-symbols-outlined" style={{ color: '#003527' }}>info</span>
                <h4 className="side-guidelines-title">Booking Guidelines</h4>
              </div>
              <ul className="side-guidelines-list">
                <li>Slots are allocated on a guaranteed, first-come, first-served basis.</li>
                <li>Ensure crop moisture content is strictly below 14% before gate arrival.</li>
                <li>Carry your valid Govt. Kisan ID and the digital booking confirmation token.</li>
                <li>Direct Bank Transfer (DBT) will be credited within 48 hours post weighment.</li>
              </ul>
            </div>

            {/* Mandi Helpline Box */}
            <div className="side-helpline-box">
              <span className="side-helpline-title">Mandi Helpdesk</span>
              <strong className="side-helpline-num">{selectedCentre.contact || '+91 7152 245012'}</strong>
              <small className="side-helpline-sub">Available Mon–Sat: 08:00 AM – 06:00 PM IST</small>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}

export default FarmerBookingForm
