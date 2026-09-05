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

function getScopedKey(baseKey, userKey = '') {
  const clean = String(userKey || '').trim()
  return clean ? `${baseKey}:${clean}` : baseKey
}

export function clearFarmerSessionStorage() {
  try {
    const keysToClear = [LAST_TOKEN_KEY, FARMER_MOBILE_KEY, FARMER_TOKENS_KEY]
    if (typeof localStorage !== 'undefined') {
      keysToClear.forEach((key) => localStorage.removeItem(key))
    } else {
      keysToClear.forEach((key) => delete memoryStore[key])
    }
  } catch (err) {
    console.warn('Unable to clear farmer session storage:', err)
  }
}

export function saveLastBookingToken(token, userKey = '') {
  if (!token) return
  const key = getScopedKey(LAST_TOKEN_KEY, userKey)
  try {
    const value = String(token).trim().toUpperCase()
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value)
    } else {
      memoryStore[key] = value
    }
  } catch {}
}

export function getLastBookingToken(userKey = '') {
  const key = getScopedKey(LAST_TOKEN_KEY, userKey)
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(key) || ''
    }
    return memoryStore[key] || ''
  } catch {
    return ''
  }
}

export function saveFarmerMobile(mobile, userKey = '') {
  if (!mobile) return
  const key = getScopedKey(FARMER_MOBILE_KEY, userKey)
  try {
    const clean = String(mobile).replace(/\D/g, '').slice(-10)
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, clean)
    } else {
      memoryStore[key] = clean
    }
  } catch {}
}

export function getFarmerMobile(userKey = '') {
  const key = getScopedKey(FARMER_MOBILE_KEY, userKey)
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(key) || ''
    }
    return memoryStore[key] || ''
  } catch {
    return ''
  }
}

export function addFarmerToken(token, userKey = '') {
  if (!token) return
  const key = getScopedKey(FARMER_TOKENS_KEY, userKey)
  try {
    const clean = String(token).trim().toUpperCase()
    const current = getFarmerTokens(userKey)
    if (!current.includes(clean)) {
      const updated = [clean, ...current].slice(0, 50)
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, JSON.stringify(updated))
      } else {
        memoryStore[key] = JSON.stringify(updated)
      }
    }
  } catch {}
}

export function getFarmerTokens(userKey = '') {
  const key = getScopedKey(FARMER_TOKENS_KEY, userKey)
  try {
    let raw = ''
    if (typeof localStorage !== 'undefined') {
      raw = localStorage.getItem(key)
    } else {
      raw = memoryStore[key]
    }
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

