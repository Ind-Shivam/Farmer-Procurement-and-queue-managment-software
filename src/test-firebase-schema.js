import { COLLECTIONS, readCentres, readAvailableSlots, readBookings } from './services/firebaseService.js'
import { isFirebaseConfigured } from './firebase/config.js'

console.log('--- RUNNING FIREBASE SERVICE SCHEMA TEST SUITE ---')

let passed = 0
let failed = 0

function assert(condition, message) {
  if (condition) {
    console.log(`✅ PASS: ${message}`)
    passed++
  } else {
    console.error(`❌ FAIL: ${message}`)
    failed++
  }
}

// 1. Verify Collection Names
assert(COLLECTIONS.FARMERS === 'farmers', 'Farmers collection name defined')
assert(COLLECTIONS.CENTRES === 'procurement_centres', 'Procurement centres collection name defined')
assert(COLLECTIONS.SLOTS === 'slots', 'Slots collection name defined')
assert(COLLECTIONS.BOOKINGS === 'bookings', 'Bookings collection name defined')
assert(COLLECTIONS.NOTIFICATIONS === 'notifications', 'Notifications collection name defined')

// 2. Check isFirebaseConfigured fallback check
const configured = isFirebaseConfigured()
console.log(`ℹ️ Current environment Firebase configured status: ${configured}`)

// 3. Test read fallback functions
async function runAsyncTests() {
  const centres = await readCentres()
  assert(Array.isArray(centres) && centres.length === 3, 'readCentres returns 3 procurement centres')

  const slots = await readAvailableSlots('wardha-pacs', '2026-08-30')
  assert(Array.isArray(slots) && slots.length === 4, 'readAvailableSlots returns 4 time slots for Wardha PACS on 2026-08-30')

  const bookings = await readBookings()
  assert(Array.isArray(bookings) && bookings.length >= 3, 'readBookings returns sample bookings')

  console.log(`\n========================================`)
  console.log(`RESULTS: ${passed} Passed, ${failed} Failed`)
  console.log(`========================================`)

  if (failed > 0) process.exit(1)
}

runAsyncTests().catch(err => {
  console.error('Test execution error:', err)
  process.exit(1)
})
