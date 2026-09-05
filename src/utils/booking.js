import { centres, slots } from '../data/centres.js'
import {
  bookedCountForSlot,
  findCentre,
  findSlot,
  isSlotFull,
} from './slots.js'
import { nextToken } from './tokens.js'
import {
  collectRequiredErrors,
  isPositiveQuantity,
  isValidMobile,
  isValidVehicleNumber,
  normalizeMobile,
  parseQuantity,
} from './validation.js'

export function hasDuplicateBooking(bookings = [], { mobile, date, centreId, excludeToken }) {
  const normalized = normalizeMobile(mobile)
  if (!normalized || !date || !centreId) return false

  return bookings.some(
    (booking) =>
      booking.token !== excludeToken &&
      normalizeMobile(booking.mobile) === normalized &&
      booking.date === date &&
      booking.centreId === centreId,
  )
}

export function validateBookingForm(form = {}, bookings = []) {
  const errors = collectRequiredErrors(form)

  if (!errors.mobile && !isValidMobile(form.mobile)) {
    errors.mobile = 'Enter a valid 10-digit Indian mobile number (e.g. 9876543210).'
  }

  if (!errors.quantity && !isPositiveQuantity(form.quantity)) {
    errors.quantity = 'Quantity must be a positive number greater than 0.'
  }

  if (!errors.vehicleNumber && !isValidVehicleNumber(form.vehicleNumber)) {
    errors.vehicleNumber = 'Enter a valid vehicle registration number (e.g. MH32AB1234).'
  }

  const centre = findCentre(centres, form.centreId)
  if (!errors.centreId && !centre) {
    errors.centreId = 'Please choose an active procurement centre.'
  }

  const slot = findSlot(slots, form.slotId)
  if (!errors.slotId && !slot) {
    errors.slotId = 'Please choose an available time slot.'
  }

  if (slot && form.centreId && slot.centreId !== form.centreId) {
    errors.slotId = 'The selected slot does not belong to this procurement centre.'
  }

  if (slot && form.date && slot.date !== form.date) {
    errors.date = 'The selected slot is not valid for this date.'
  }

  if (slot && !errors.slotId && isSlotFull(slot, bookings)) {
    errors.slotId = 'This time slot is full. Please choose another available slot.'
  }

  if (
    !errors.mobile &&
    !errors.date &&
    !errors.centreId &&
    hasDuplicateBooking(bookings, form)
  ) {
    errors.duplicate =
      'A booking already exists for this mobile number at this centre on the selected date. Choose a different date or centre.'
  }

  return {
    ok: Object.keys(errors).length === 0,
    errors,
    centre,
    slot,
  }
}

export function buildBookingRecord(form, bookings = [], createdAt = new Date().toISOString()) {
  const token = form.token || nextToken(bookings, 2026)
  return {
    token,
    ownerUid: String(form.ownerUid || '').trim(),
    name: String(form.name ?? '').trim(),
    mobile: normalizeMobile(form.mobile),
    village: String(form.village ?? '').trim(),
    crop: String(form.crop ?? '').trim(),
    quantity: parseQuantity(form.quantity),
    vehicleNumber: String(form.vehicleNumber ?? '').trim().toUpperCase(),
    centreId: form.centreId,
    date: form.date,
    slotId: form.slotId,
    createdAt,
    status: form.status || 'Booked',
    paymentStatus: form.paymentStatus || 'Pending',
  }
}

export function createBooking(bookings = [], form, createdAt) {
  const result = validateBookingForm(form, bookings)
  if (!result.ok) {
    return { ok: false, errors: result.errors }
  }

  const booking = buildBookingRecord(form, bookings, createdAt)
  const updatedBookings = [...bookings, booking]
  return {
    ok: true,
    errors: {},
    booking,
    bookings: updatedBookings,
    remaining: remainingAfter(result.slot, updatedBookings),
  }
}

function remainingAfter(slot, bookings) {
  if (!slot) return 0
  return Math.max(0, slot.capacity - bookedCountForSlot(slot, bookings))
}

export function findBookingByToken(bookings = [], token) {
  if (!token || !bookings) return null
  const clean = String(token).trim().toUpperCase()
  return (
    bookings.find(
      (booking) =>
        (booking.token && booking.token.toUpperCase() === clean) ||
        booking.token === token,
    ) ?? null
  )
}

export function latestBookingForMobile(bookings = [], mobile) {
  const normalized = normalizeMobile(mobile)
  if (!normalized || !bookings) return null
  return (
    bookings
      .filter((booking) => normalizeMobile(booking.mobile) === normalized)
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))[0] ?? null
  )
}

export function findBookingByTokenOrMobile(bookings = [], query) {
  if (!query || !bookings) return null
  const clean = String(query).trim()
  if (!clean) return null

  // 1. Try finding by token
  const byToken = findBookingByToken(bookings, clean)
  if (byToken) return byToken

  // 2. Try finding by mobile (if it looks like a phone number)
  const normalizedMobile = normalizeMobile(clean)
  if (normalizedMobile) {
    const byMobile = latestBookingForMobile(bookings, normalizedMobile)
    if (byMobile) return byMobile
  }

  // 3. Fallback partial match on token or mobile
  const upper = clean.toUpperCase()
  return (
    bookings.find(
      (b) =>
        (b.token && b.token.toUpperCase().includes(upper)) ||
        (b.mobile && b.mobile.includes(clean)),
    ) ?? null
  )
}
