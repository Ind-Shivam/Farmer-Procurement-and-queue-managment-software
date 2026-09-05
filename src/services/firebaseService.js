import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import {
  centres as sampleCentres,
  slots as sampleSlots,
} from '../data/centres.js'
import { db, isFirebaseConfigured } from '../firebase/config.js'
import { isSlotFull } from '../utils/slots.js'
import { normalizeMobile } from '../utils/validation.js'

export const COLLECTIONS = {
  FARMERS: 'farmers',
  CENTRES: 'procurement_centres',
  SLOTS: 'slots',
  BOOKINGS: 'bookings',
  NOTIFICATIONS: 'notifications',
  METADATA: '_metadata',
}

/**
 * 1. Save or update a farmer profile in `farmers` collection
 */
export async function saveFarmer(farmerData) {
  if (!db || !isFirebaseConfigured()) return null
  const mobile = normalizeMobile(farmerData.mobile)
  if (!mobile) throw new Error('Valid 10-digit mobile number is required to save farmer.')
  if (!farmerData.name || !String(farmerData.name).trim()) {
    throw new Error('Farmer name is required.')
  }

  const farmerRef = doc(db, COLLECTIONS.FARMERS, mobile)
  const now = new Date().toISOString()
  const payload = {
    name: String(farmerData.name).trim(),
    mobile,
    village: String(farmerData.village || '').trim(),
    vehicleNumber: String(farmerData.vehicleNumber || '').trim().toUpperCase(),
    updatedAt: now,
  }

  // Check if farmer already exists to preserve createdAt
  try {
    const existing = await getDoc(farmerRef)
    if (!existing.exists()) {
      payload.createdAt = now
    }
  } catch {
    payload.createdAt = now
  }

  await setDoc(farmerRef, payload, { merge: true })
  return payload
}

/**
 * 2. Check if selected slot is available in Firestore
 */
export async function checkSlotAvailability(centreId, date, slotId, currentBookings = []) {
  if (!db || !isFirebaseConfigured()) {
    const slot = sampleSlots.find((s) => s.id === slotId)
    if (!slot) return { available: false, error: 'Slot not found.' }
    const full = isSlotFull(slot, currentBookings)
    return { available: !full, slot, remaining: Math.max(0, slot.capacity - (slot.reserved || 0)) }
  }

  try {
    // 1. Get slot capacity
    let slotCapacity = 8
    let slotReserved = 0
    const slotDocRef = doc(db, COLLECTIONS.SLOTS, slotId)
    const slotDoc = await getDoc(slotDocRef)
    if (slotDoc.exists()) {
      const data = slotDoc.data()
      slotCapacity = data.capacity ?? 8
      slotReserved = data.reserved ?? 0
    }

    // 2. Count active bookings in Firestore for this slot
    const bookingsQuery = query(
      collection(db, COLLECTIONS.BOOKINGS),
      where('slotId', '==', slotId),
      where('centreId', '==', centreId),
      where('date', '==', date),
    )
    const snapshot = await getDocs(bookingsQuery)
    const activeBookingsCount = snapshot.docs.filter((d) => {
      const st = d.data()?.status
      return !['Cancelled', 'Rejected', 'No-show'].includes(st)
    }).length

    const totalBooked = slotReserved + activeBookingsCount
    const isFull = totalBooked >= slotCapacity

    return {
      available: !isFull,
      capacity: slotCapacity,
      totalBooked,
      remaining: Math.max(0, slotCapacity - totalBooked),
    }
  } catch (err) {
    console.warn('Could not verify slot via Firestore, using local fallback calculation:', err)
    return { available: true }
  }
}

/**
 * 3. Save a booking document in `bookings` collection, save farmer, and log notification
 */
export async function saveBooking(bookingData) {
  if (!db || !isFirebaseConfigured()) return null
  if (!bookingData.token) throw new Error('Token is required to save booking.')

  // Step 1: Save the farmer to `farmers` collection
  const farmerPayload = {
    name: bookingData.name,
    mobile: normalizeMobile(bookingData.mobile),
    village: bookingData.village,
    vehicleNumber: bookingData.vehicleNumber,
  }
  await saveFarmer(farmerPayload)

  // Step 2: Create the booking document in `bookings` collection
  const bookingRef = doc(db, COLLECTIONS.BOOKINGS, bookingData.token)
  const now = new Date().toISOString()
  const payload = {
    token: bookingData.token,
    name: String(bookingData.name).trim(),
    mobile: normalizeMobile(bookingData.mobile),
    village: String(bookingData.village || '').trim(),
    crop: String(bookingData.crop || 'Paddy').trim(),
    quantity: Number(bookingData.quantity) || 1,
    vehicleNumber: String(bookingData.vehicleNumber || '').trim().toUpperCase(),
    centreId: bookingData.centreId,
    date: bookingData.date,
    slotId: bookingData.slotId,
    status: bookingData.status || 'Booked',
    paymentStatus: bookingData.paymentStatus || 'Pending',
    createdAt: bookingData.createdAt || now,
    updatedAt: now,
  }

  await setDoc(bookingRef, payload)

  // Step 3: Log notification
  try {
    await createNotification({
      recipientMobile: payload.mobile,
      token: payload.token,
      message: `Token ${payload.token} confirmed for ${payload.crop} (${payload.quantity}q) at centre ${payload.centreId} on ${payload.date}. Initial Status: Booked.`,
      type: 'TOKEN_GENERATED',
    })
  } catch (err) {
    console.warn('Could not create initial notification:', err)
  }

  return payload
}

/**
 * 4. Read all procurement centres from `procurement_centres` collection
 */
export async function readCentres() {
  if (!db || !isFirebaseConfigured()) return sampleCentres
  const querySnapshot = await getDocs(collection(db, COLLECTIONS.CENTRES))
  if (querySnapshot.empty) return sampleCentres
  return querySnapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
}

/**
 * 5. Read available slots for a centre and date from `slots` collection
 */
export async function readAvailableSlots(centreId, date) {
  if (!db || !isFirebaseConfigured()) {
    return sampleSlots.filter((s) => s.centreId === centreId && s.date === date)
  }
  const q = query(
    collection(db, COLLECTIONS.SLOTS),
    where('centreId', '==', centreId),
    where('date', '==', date),
  )
  const snapshot = await getDocs(q)
  if (snapshot.empty) {
    return sampleSlots.filter((s) => s.centreId === centreId && s.date === date)
  }
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
}

/**
 * 6. Read bookings with optional filters
 */
export async function readBookings(filters = {}) {
  if (!db || !isFirebaseConfigured()) return []

  let q = collection(db, COLLECTIONS.BOOKINGS)
  const conditions = []

  if (filters.centreId) conditions.push(where('centreId', '==', filters.centreId))
  if (filters.date) conditions.push(where('date', '==', filters.date))
  if (filters.slotId) conditions.push(where('slotId', '==', filters.slotId))
  if (filters.mobile) conditions.push(where('mobile', '==', normalizeMobile(filters.mobile)))

  if (conditions.length > 0) {
    q = query(collection(db, COLLECTIONS.BOOKINGS), ...conditions)
  }

  const snapshot = await getDocs(q)
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
}

/**
 * 7. Look up a booking from Firestore by Token or Mobile
 */
export async function lookupBookingFirestore(queryStr) {
  if (!db || !isFirebaseConfigured() || !queryStr) return null
  const clean = String(queryStr).trim()
  if (!clean) return null

  // 1. Try Token as doc ID
  const tokenDocRef = doc(db, COLLECTIONS.BOOKINGS, clean.toUpperCase())
  const tokenDoc = await getDoc(tokenDocRef)
  if (tokenDoc.exists()) {
    return { id: tokenDoc.id, ...tokenDoc.data() }
  }

  // 2. Try Mobile query
  const mobile = normalizeMobile(clean)
  if (mobile) {
    const q = query(
      collection(db, COLLECTIONS.BOOKINGS),
      where('mobile', '==', mobile),
      orderBy('createdAt', 'desc'),
      limit(1),
    )
    const snapshot = await getDocs(q)
    if (!snapshot.empty) {
      const first = snapshot.docs[0]
      return { id: first.id, ...first.data() }
    }
  }

  return null
}

/**
 * 8. Subscribe to real-time updates for bookings collection
 */
export function subscribeToBookings(callback) {
  if (!db || !isFirebaseConfigured()) return () => {}
  const unsubscribe = onSnapshot(
    collection(db, COLLECTIONS.BOOKINGS),
    (snapshot) => {
      const bookings = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
      callback(bookings)
    },
    (err) => {
      console.warn('Firestore bookings snapshot error:', err)
    },
  )
  return unsubscribe
}

/**
 * 9. Subscribe to real-time updates for procurement centres collection
 */
export function subscribeToCentres(callback) {
  if (!db || !isFirebaseConfigured()) return () => {}
  const unsubscribe = onSnapshot(
    collection(db, COLLECTIONS.CENTRES),
    (snapshot) => {
      if (!snapshot.empty) {
        const centres = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
        callback(centres)
      }
    },
    (err) => {
      console.warn('Firestore centres snapshot error:', err)
    },
  )
  return unsubscribe
}

/**
 * 10. Subscribe to real-time updates for slots collection
 */
export function subscribeToSlots(callback) {
  if (!db || !isFirebaseConfigured()) return () => {}
  const unsubscribe = onSnapshot(
    collection(db, COLLECTIONS.SLOTS),
    (snapshot) => {
      if (!snapshot.empty) {
        const slots = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
        callback(slots)
      }
    },
    (err) => {
      console.warn('Firestore slots snapshot error:', err)
    },
  )
  return unsubscribe
}

/**
 * 11. Update booking status and optional payment status with in-app notification creation
 */
export async function updateBookingStatus(token, newStatus, newPaymentStatus) {
  if (!db || !isFirebaseConfigured()) return
  const bookingRef = doc(db, COLLECTIONS.BOOKINGS, token)
  const now = new Date().toISOString()

  const updates = {
    updatedAt: now,
  }
  if (newStatus) updates.status = newStatus
  if (newPaymentStatus) updates.paymentStatus = newPaymentStatus

  await updateDoc(bookingRef, updates)

  // Create status change notification in Firestore
  try {
    const snap = await getDoc(bookingRef)
    if (snap.exists()) {
      const data = snap.data()
      const statusText = newStatus ? `Status updated to "${newStatus}"` : ''
      const paymentText = newPaymentStatus ? `Payment status: "${newPaymentStatus}"` : ''
      const msg = [statusText, paymentText].filter(Boolean).join(' · ') || `Updated to ${newStatus || data.status}`

      await createNotification({
        recipientMobile: data.mobile,
        token,
        message: `Token ${token} update: ${msg}.`,
        type: 'STATUS_UPDATE',
      })
    }
  } catch (err) {
    console.warn('Could not log status change notification:', err)
  }
}

/**
 * 12. Create an in-app notification document in `notifications` collection
 */
export async function createNotification({ recipientMobile, token, message, type = 'STATUS_UPDATE' }) {
  if (!db || !isFirebaseConfigured()) return null
  const notifId = `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
  const notifRef = doc(db, COLLECTIONS.NOTIFICATIONS, notifId)
  const payload = {
    id: notifId,
    recipientMobile: normalizeMobile(recipientMobile),
    token: token || '',
    message,
    type,
    read: false,
    createdAt: new Date().toISOString(),
  }

  await setDoc(notifRef, payload)
  return payload
}

/**
 * 13. Read recent notifications from Firestore
 */
export async function readNotifications(filters = {}) {
  if (!db || !isFirebaseConfigured()) return []
  try {
    let q = collection(db, COLLECTIONS.NOTIFICATIONS)
    if (filters.token) {
      q = query(collection(db, COLLECTIONS.NOTIFICATIONS), where('token', '==', filters.token))
    }
    const snapshot = await getDocs(q)
    return snapshot.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
  } catch (err) {
    console.warn('Could not fetch notifications:', err)
    return []
  }
}

/**
 * 14. Subscribe to notifications collection
 */
export function subscribeToNotifications(callback) {
  if (!db || !isFirebaseConfigured()) return () => {}
  const unsubscribe = onSnapshot(
    collection(db, COLLECTIONS.NOTIFICATIONS),
    (snapshot) => {
      const notifs = snapshot.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
      callback(notifs)
    },
    (err) => {
      console.warn('Firestore notifications snapshot error:', err)
    },
  )
  return unsubscribe
}

/**
 * 15. Idempotent one-time seed method for centres and slots
 */
export async function seedFirestoreDataIfEmpty() {
  if (!db || !isFirebaseConfigured()) return false

  try {
    const seedMetaRef = doc(db, COLLECTIONS.METADATA, 'initial_seed')
    const seedMetaDoc = await getDoc(seedMetaRef)

    // Check if seed metadata or centres collection already exists
    if (seedMetaDoc.exists() && seedMetaDoc.data()?.seeded) {
      console.info('🌱 Firestore already contains initial seed data — skipping seeding.')
      return false
    }

    const centresSnapshot = await getDocs(collection(db, COLLECTIONS.CENTRES))
    if (!centresSnapshot.empty) {
      // Mark as seeded to avoid future checks
      await setDoc(seedMetaRef, { seeded: true, seededAt: new Date().toISOString() })
      return false
    }

    console.info('🌱 Seeding initial procurement centres and slots into Firestore...')

    // 1. Seed Procurement Centres
    for (const centre of sampleCentres) {
      await setDoc(doc(db, COLLECTIONS.CENTRES, centre.id), centre)
    }

    // 2. Seed Slots
    for (const slot of sampleSlots) {
      await setDoc(doc(db, COLLECTIONS.SLOTS, slot.id), slot)
    }

    // Record seed completion
    await setDoc(seedMetaRef, {
      seeded: true,
      seededAt: new Date().toISOString(),
      centresCount: sampleCentres.length,
      slotsCount: sampleSlots.length,
      bookingsCount: 0,
    })

    console.info('✅ Firestore initial seed completed successfully!')
    return true
  } catch (err) {
    console.warn('⚠️ Error during Firestore seeding:', err)
    return false
  }
}

/**
 * 16. Save or update a Procurement Centre document in Firestore
 */
export async function saveProcurementCentre(centreData) {
  if (!db || !isFirebaseConfigured()) return null
  const id = centreData.id || `centre_${Date.now()}`
  const centreRef = doc(db, COLLECTIONS.CENTRES, id)
  const payload = {
    id,
    name: String(centreData.name || '').trim(),
    location: String(centreData.location || '').trim(),
    contact: String(centreData.contact || '').trim(),
    openingHours: String(centreData.openingHours || '08:00 – 17:00').trim(),
    capacityPerDay: Number(centreData.capacityPerDay) || 32,
    acceptedCrops: Array.isArray(centreData.acceptedCrops) ? centreData.acceptedCrops : ['Paddy', 'Soybean', 'Cotton'],
    updatedAt: new Date().toISOString(),
  }
  await setDoc(centreRef, payload, { merge: true })
  return payload
}

/**
 * 17. Delete a Procurement Centre document from Firestore
 */
export async function deleteProcurementCentre(centreId) {
  if (!db || !isFirebaseConfigured() || !centreId) return false
  const centreRef = doc(db, COLLECTIONS.CENTRES, centreId)
  await deleteDoc(centreRef)
  return true
}

/**
 * 18. Update user's assignedCentreId in Firestore
 */
export async function updateUserAssignedCentre(uid, centreId) {
  if (!db || !isFirebaseConfigured() || !uid) return false
  const userRef = doc(db, 'users', uid)
  await setDoc(userRef, { assignedCentreId: centreId, updatedAt: new Date().toISOString() }, { merge: true })
  return true
}

/**
 * 19. Fetch all user profile documents for Admin Staff Management
 */
export async function fetchAllUsersProfiles() {
  if (!db || !isFirebaseConfigured()) return []
  try {
    const snap = await getDocs(collection(db, 'users'))
    return snap.docs.map((d) => ({ uid: d.id, ...d.data() }))
  } catch (err) {
    console.warn('⚠️ Error fetching users profiles:', err)
    return []
  }
}

