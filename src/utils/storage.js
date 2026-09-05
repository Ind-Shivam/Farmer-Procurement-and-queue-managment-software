const STORAGE_KEY = 'kisansetu-qease-bookings-v2'

// In-memory fallback when running in Node.js / non-browser test environment
let memoryStore = {}

export function loadBookings(seedBookings = []) {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return seedBookings
      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed) || parsed.length === 0) return seedBookings
      return parsed
    }
    const mem = memoryStore[STORAGE_KEY]
    if (mem) {
      const parsed = JSON.parse(mem)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
    return seedBookings
  } catch {
    return seedBookings
  }
}

export function saveBookings(bookings) {
  try {
    const serialized = JSON.stringify(bookings)
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, serialized)
    } else {
      memoryStore[STORAGE_KEY] = serialized
    }
  } catch (err) {
    console.warn('Unable to persist bookings to storage:', err)
  }
}

export function clearStoredBookings() {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY)
    } else {
      delete memoryStore[STORAGE_KEY]
    }
  } catch (err) {
    console.warn('Unable to clear storage:', err)
  }
}

const LAST_TOKEN_KEY = 'kisansetu-last-booking-token'
const FARMER_MOBILE_KEY = 'kisansetu-farmer-mobile'
const FARMER_TOKENS_KEY = 'kisansetu-farmer-tokens-list'

export function saveLastBookingToken(token) {
  if (!token) return
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(LAST_TOKEN_KEY, String(token).trim().toUpperCase())
    } else {
      memoryStore[LAST_TOKEN_KEY] = String(token).trim().toUpperCase()
    }
  } catch {}
}

export function getLastBookingToken() {
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(LAST_TOKEN_KEY) || ''
    }
    return memoryStore[LAST_TOKEN_KEY] || ''
  } catch {
    return ''
  }
}

export function saveFarmerMobile(mobile) {
  if (!mobile) return
  try {
    const clean = String(mobile).replace(/\D/g, '').slice(-10)
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(FARMER_MOBILE_KEY, clean)
    } else {
      memoryStore[FARMER_MOBILE_KEY] = clean
    }
  } catch {}
}

export function getFarmerMobile() {
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(FARMER_MOBILE_KEY) || ''
    }
    return memoryStore[FARMER_MOBILE_KEY] || ''
  } catch {
    return ''
  }
}

export function addFarmerToken(token) {
  if (!token) return
  try {
    const clean = String(token).trim().toUpperCase()
    const current = getFarmerTokens()
    if (!current.includes(clean)) {
      const updated = [clean, ...current].slice(0, 50)
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(FARMER_TOKENS_KEY, JSON.stringify(updated))
      } else {
        memoryStore[FARMER_TOKENS_KEY] = JSON.stringify(updated)
      }
    }
  } catch {}
}

export function getFarmerTokens() {
  try {
    let raw = ''
    if (typeof localStorage !== 'undefined') {
      raw = localStorage.getItem(FARMER_TOKENS_KEY)
    } else {
      raw = memoryStore[FARMER_TOKENS_KEY]
    }
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

