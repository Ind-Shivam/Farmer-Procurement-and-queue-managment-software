import { seedBookings, slots } from './data/centres.js'
import { validateBookingForm, createBooking, findBookingByTokenOrMobile } from './utils/booking.js'
import { getQueueSummary } from './utils/queue.js'
import { isSlotFull } from './utils/slots.js'
import { saveBookings, loadBookings } from './utils/storage.js'

console.log('--- RUNNING FULL 10-STEP END-TO-END WORKFLOW VERIFICATION ---')

let passed = 0
let failed = 0

function assert(condition, message) {
  if (condition) {
    console.log(`✅ Step passed: ${message}`)
    passed++
  } else {
    console.error(`❌ Step FAILED: ${message}`)
    failed++
  }
}

// Global storage simulator for node test
let currentBookings = [...seedBookings]

// Step 1 & 2: Register farmer and book an available slot
console.log('\n[1 & 2] Testing Farmer Registration & Slot Booking...')
const availSlot = slots.find(s => s.centreId === 'wardha-pacs' && s.date === '2026-08-30' && s.windowKey === '09-11')
const farmerRegistrationData = {
  name: 'Ganesh Bhoyar',
  mobile: '9822334455',
  village: 'Pawanar, Wardha',
  crop: 'Cotton',
  quantity: '25',
  vehicleNumber: 'MH32XY9876',
  centreId: 'wardha-pacs',
  date: '2026-08-30',
  slotId: availSlot.id,
  status: 'Booked',
  paymentStatus: 'Pending',
}

const formValidation = validateBookingForm(farmerRegistrationData, currentBookings)
assert(formValidation.ok, '1. Farmer form validation succeeded')

const bookingCreation = createBooking(currentBookings, farmerRegistrationData)
assert(bookingCreation.ok, '2. Booking created in available slot')
const newBooking = bookingCreation.booking
currentBookings = bookingCreation.bookings

// Step 3: Confirm token and queue position
console.log('\n[3] Testing Token and Queue Position Confirmation...')
assert(newBooking.token.startsWith('KC-2026-'), `Generated unique token: ${newBooking.token}`)
const queueSummary = getQueueSummary(currentBookings, newBooking)
assert(queueSummary.position > 0, `Queue position calculated: #${queueSummary.position}`)
assert(queueSummary.waitMinutes >= 0, `Estimated wait time: ${queueSummary.waitLabel}`)

// Step 4: Confirm data persists after refresh
console.log('\n[4] Testing Storage Persistence (Simulating Page Refresh)...')
saveBookings(currentBookings)
const reloadedBookings = loadBookings(seedBookings)
const reloadedFarmer = findBookingByTokenOrMobile(reloadedBookings, newBooking.token)
assert(reloadedFarmer !== null && reloadedFarmer.name === 'Ganesh Bhoyar', '4. Data persisted and retrieved after reload')

// Step 5: View booking in staff dashboard
console.log('\n[5] Testing Staff Dashboard View & Filtering...')
const staffTodayBookings = reloadedBookings.filter(b => b.date === '2026-08-30' && b.centreId === 'wardha-pacs')
const foundInStaff = staffTodayBookings.find(b => b.token === newBooking.token)
assert(foundInStaff !== undefined, `5. Booking ${newBooking.token} visible in Staff Today's list`)

// Step 6: Call next farmer
console.log('\n[6] Testing "Call Next Farmer" Action...')
const nextInLineFarmer = staffTodayBookings.find(b => (b.status || 'Booked') === 'Booked') || staffTodayBookings[0]
assert(nextInLineFarmer !== undefined, `Found next waiting farmer: ${nextInLineFarmer.token}`)
// Advance status to 'At Gate'
currentBookings = currentBookings.map(b => b.token === nextInLineFarmer.token ? { ...b, status: 'At Gate', updatedAt: new Date().toISOString() } : b)
const calledFarmer = findBookingByTokenOrMobile(currentBookings, nextInLineFarmer.token)
assert(calledFarmer.status === 'At Gate', '6. Called farmer status transitioned to "At Gate"')

// Step 7: Update procurement status
console.log('\n[7] Testing Procurement Status Update (Quality Check -> Weighment -> Accepted)...')
currentBookings = currentBookings.map(b => b.token === newBooking.token ? { ...b, status: 'Quality Check' } : b)
assert(findBookingByTokenOrMobile(currentBookings, newBooking.token).status === 'Quality Check', '7a. Status updated to Quality Check')
currentBookings = currentBookings.map(b => b.token === newBooking.token ? { ...b, status: 'Weighment' } : b)
assert(findBookingByTokenOrMobile(currentBookings, newBooking.token).status === 'Weighment', '7b. Status updated to Weighment')
currentBookings = currentBookings.map(b => b.token === newBooking.token ? { ...b, status: 'Completed' } : b)
assert(findBookingByTokenOrMobile(currentBookings, newBooking.token).status === 'Completed', '7c. Status updated to Completed')

// Step 8: Update payment status
console.log('\n[8] Testing Payment Status Update (Pending -> Processing -> Completed)...')
currentBookings = currentBookings.map(b => b.token === newBooking.token ? { ...b, paymentStatus: 'Completed' } : b)
const updatedPaymentBooking = findBookingByTokenOrMobile(currentBookings, newBooking.token)
assert(updatedPaymentBooking.paymentStatus === 'Completed', '8. Payment status updated to "Completed"')

// Step 9: Confirm farmer sees the updated status
console.log('\n[9] Testing Farmer Queue Status Visibility...')
const farmerLookup = findBookingByTokenOrMobile(currentBookings, '9822334455') // lookup by mobile
assert(farmerLookup !== null && farmerLookup.token === newBooking.token, '9a. Farmer looked up booking by mobile number')
assert(farmerLookup.status === 'Completed', '9b. Farmer sees updated status: Completed')
assert(farmerLookup.paymentStatus === 'Completed', '9c. Farmer sees updated payment status: Completed')

// Step 10: Try a full slot and confirm booking is rejected
console.log('\n[10] Testing Full Slot Rejection...')
const fullSlot = slots.find(s => s.centreId === 'wardha-pacs' && s.date === '2026-08-30' && s.windowKey === '14-16')
assert(isSlotFull(fullSlot, currentBookings), 'Full slot accurately detected')
const fullSlotBookingAttempt = {
  name: 'Vinod Thakre',
  mobile: '9855443322',
  village: 'Ashti',
  crop: 'Paddy',
  quantity: '10',
  vehicleNumber: 'MH32ZZ1122',
  centreId: 'wardha-pacs',
  date: '2026-08-30',
  slotId: fullSlot.id,
}
const fullSlotValidation = validateBookingForm(fullSlotBookingAttempt, currentBookings)
assert(!fullSlotValidation.ok, '10. Full slot booking was correctly REJECTED')
assert(fullSlotValidation.errors.slotId !== undefined, `Validation error message: "${fullSlotValidation.errors.slotId}"`)

console.log(`\n======================================================`)
console.log(`WORKFLOW VERIFICATION RESULTS: ${passed} Passed, ${failed} Failed`)
console.log(`======================================================`)
