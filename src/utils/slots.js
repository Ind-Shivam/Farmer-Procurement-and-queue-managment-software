import { capacityByWindow, windows } from '../data/centres.js'

export const SLOT_STATUS = {
  available: 'available',
  nearlyFull: 'nearly-full',
  full: 'full',
}

export function bookedCountForSlot(slot, bookings = []) {
  if (!slot) return 0
  const localCount = bookings.filter((booking) => booking.slotId === slot.id).length
  return (slot.reserved ?? 0) + localCount
}

export function remainingSeats(slot, bookings = []) {
  if (!slot) return 0
  return Math.max(0, slot.capacity - bookedCountForSlot(slot, bookings))
}

export function getSlotStatus(slot, bookings = []) {
  if (!slot) return SLOT_STATUS.full
  const remaining = remainingSeats(slot, bookings)
  if (remaining <= 0) {
    return SLOT_STATUS.full
  }
  const takenRatio = bookedCountForSlot(slot, bookings) / slot.capacity
  if (remaining <= 2 || takenRatio >= 0.75) {
    return SLOT_STATUS.nearlyFull
  }
  return SLOT_STATUS.available
}

export function isSlotFull(slot, bookings = []) {
  return getSlotStatus(slot, bookings) === SLOT_STATUS.full
}

export function slotsForCentreDate(allSlots, centreId, date) {
  if (!centreId || !date) return []
  const filtered = (allSlots || []).filter((slot) => slot.centreId === centreId && slot.date === date)
  if (filtered.length > 0) {
    return filtered
  }

  // Dynamic fallback for any future or unlisted date
  return windows.map((window) => ({
    id: `${centreId}_${date}_${window.key}`,
    centreId,
    date,
    windowKey: window.key,
    label: window.label,
    capacity: capacityByWindow[window.key] || 8,
    reserved: 0,
  }))
}

export function availableSeatCount(allSlots, bookings = [], centreId, date) {
  const filtered = slotsForCentreDate(allSlots, centreId, date)
  return filtered.reduce((sum, slot) => sum + remainingSeats(slot, bookings), 0)
}

export function totalCapacityForCentreDate(allSlots, centreId, date) {
  const filtered = slotsForCentreDate(allSlots, centreId, date)
  return filtered.reduce((sum, slot) => sum + (slot.capacity || 0), 0)
}

export function findSlot(allSlots, slotId) {
  if (!slotId) return null
  const found = (allSlots || []).find((slot) => slot.id === slotId)
  if (found) return found

  // Parse slotId e.g. "wardha-pacs_2026-09-05_09-11"
  const parts = String(slotId).split('_')
  if (parts.length >= 3) {
    const centreId = parts[0]
    const date = parts[1]
    const winKey = parts[2]
    const win = windows.find((w) => w.key === winKey)
    return {
      id: slotId,
      centreId,
      date,
      windowKey: winKey,
      label: win ? win.label : winKey,
      capacity: capacityByWindow[winKey] || 8,
      reserved: 0,
    }
  }
  return null
}

export function findCentre(allCentres, centreId) {
  if (!allCentres || !centreId) return null
  return allCentres.find((centre) => centre.id === centreId) ?? null
}

export function statusLabel(status) {
  if (status === SLOT_STATUS.nearlyFull) {
    return 'Nearly Full'
  }
  if (status === SLOT_STATUS.full) {
    return 'Full'
  }
  return 'Available'
}

