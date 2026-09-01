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
