import { slots, seedBookings } from './data/centres.js'
import { validateBookingForm, createBooking, findBookingByTokenOrMobile } from './utils/booking.js'
import { nextToken } from './utils/tokens.js'
import { getQueueSummary } from './utils/queue.js'
import { remainingSeats, availableSeatCount, isSlotFull } from './utils/slots.js'
import { isValidMobile, isPositiveQuantity, isValidVehicleNumber } from './utils/validation.js'

console.log('--- RUNNING FARMER WORKFLOW TEST SUITE ---')

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

// 1. Mobile & Quantity Validation
assert(isValidMobile('9876543210'), 'Valid 10-digit mobile passes')
assert(isValidMobile('+91 9876543210'), 'Valid mobile with country code passes')
assert(!isValidMobile('12345'), 'Short mobile fails')
assert(!isValidMobile('0123456789'), 'Mobile starting with 0-5 fails')
assert(isPositiveQuantity('15'), 'Positive quantity passes')
assert(isPositiveQuantity(8.5), 'Decimal quantity passes')
assert(!isPositiveQuantity('0'), 'Zero quantity fails')
assert(!isPositiveQuantity('-5'), 'Negative quantity fails')
assert(!isPositiveQuantity('abc'), 'Non-numeric quantity fails')
assert(isValidVehicleNumber('MH32AB1234'), 'Valid vehicle number passes')

// 2. Token Generation
const nextTok = nextToken(seedBookings, 2026)
assert(nextTok === 'KC-2026-0104', `Token generation generates KC-2026-0104 (got: ${nextTok})`)

// 3. Slot Status & Full Slot Detection
const fullSlot = slots.find(s => s.centreId === 'wardha-pacs' && s.date === '2026-08-30' && s.windowKey === '14-16')
assert(fullSlot !== undefined, 'Found 14-16 test slot')
assert(isSlotFull(fullSlot, seedBookings), 'Full slot detected correctly')
assert(remainingSeats(fullSlot, seedBookings) === 0, 'Full slot has 0 remaining seats')

const availSlot = slots.find(s => s.centreId === 'wardha-pacs' && s.date === '2026-08-30' && s.windowKey === '09-11')
assert(!isSlotFull(availSlot, seedBookings), 'Available slot detected')
const rem = remainingSeats(availSlot, seedBookings)
assert(rem > 0, `Available slot has ${rem} seats remaining`)

// 4. Form Validation & Creation
const invalidForm = {
  name: '',
  mobile: '123',
  village: '',
  crop: 'Paddy',
  quantity: '-2',
  vehicleNumber: '',
  centreId: 'wardha-pacs',
  date: '2026-08-30',
  slotId: fullSlot.id
}
const invalidRes = validateBookingForm(invalidForm, seedBookings)
assert(!invalidRes.ok, 'Invalid form fails validation')
assert(invalidRes.errors.name !== undefined, 'Name error caught')
assert(invalidRes.errors.mobile !== undefined, 'Mobile error caught')
assert(invalidRes.errors.quantity !== undefined, 'Quantity error caught')
assert(invalidRes.errors.slotId !== undefined, 'Full slot error caught')

// 5. Valid Booking Creation & Sequential Token
const validForm = {
  name: 'Rajesh Shinde',
  mobile: '9823012345',
  village: 'Seloo, Wardha',
  crop: 'Paddy',
  quantity: '20',
  vehicleNumber: 'MH32CD4455',
  centreId: 'wardha-pacs',
  date: '2026-08-30',
  slotId: availSlot.id
}
const createRes = createBooking(seedBookings, validForm)
assert(createRes.ok, 'Valid booking created successfully')
assert(createRes.booking.token === 'KC-2026-0104', `Created token is KC-2026-0104 (got: ${createRes.booking.token})`)
assert(createRes.booking.status === 'Booked', `Booking status is Booked (got: ${createRes.booking.status})`)
assert(createRes.booking.paymentStatus === 'Pending', `Payment status is Pending (got: ${createRes.booking.paymentStatus})`)
assert(createRes.bookings.length === seedBookings.length + 1, 'Bookings list incremented')

// 6. Duplicate Booking Prevention
const dupRes = validateBookingForm(validForm, createRes.bookings)
assert(!dupRes.ok, 'Duplicate booking on same date and centre rejected')
assert(dupRes.errors.duplicate !== undefined, `Duplicate error: ${dupRes.errors.duplicate}`)

// 7. Queue Position & Wait Time Estimation
const queueSummary = getQueueSummary(createRes.bookings, createRes.booking)
assert(queueSummary.position === 4, `Queue position is #4 (got: ${queueSummary.position})`)
assert(queueSummary.peopleAhead === 3, `People ahead is 3 (got: ${queueSummary.peopleAhead})`)
assert(queueSummary.waitMinutes === 24, `Estimated wait is 24 mins (3 * 8 mins) (got: ${queueSummary.waitMinutes})`)
assert(queueSummary.waitLabel === '24 mins', `Wait label is 24 mins (got: ${queueSummary.waitLabel})`)

// 8. Lookup by Token and by Mobile
const lookupByToken = findBookingByTokenOrMobile(createRes.bookings, 'KC-2026-0104')
assert(lookupByToken !== null && lookupByToken.token === 'KC-2026-0104', 'Lookup by token works')
const lookupByMobile = findBookingByTokenOrMobile(createRes.bookings, '9823012345')
assert(lookupByMobile !== null && lookupByMobile.token === 'KC-2026-0104', 'Lookup by mobile works')

// 9. Centre Available Slot Count
const centreAvail = availableSeatCount(slots, createRes.bookings, 'wardha-pacs', '2026-08-30')
assert(centreAvail > 0, `Centre available count computed: ${centreAvail}`)

console.log(`\n========================================`)
console.log(`RESULTS: ${passed} Passed, ${failed} Failed`)
console.log(`========================================`)
