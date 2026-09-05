import { useCallback, useEffect, useMemo, useState } from 'react'
import { centres as localCentres, slots as localSlots } from '../data/centres.js'
import { isFirebaseConfigured } from '../firebase/config.js'
import {
  checkSlotAvailability,
  lookupBookingFirestore,
  readBookings,
  readCentres,
  readNotifications,
  saveBooking as fbSaveBooking,
  saveFarmer as fbSaveFarmer,
  seedFirestoreDataIfEmpty,
  subscribeToBookings,
  subscribeToCentres,
  subscribeToNotifications,
  subscribeToSlots,
  updateBookingStatus as fbUpdateBookingStatus,
} from '../services/firebaseService.js'
import {
  createBooking,
  findBookingByTokenOrMobile,
  validateBookingForm,
} from '../utils/booking.js'
import { clearStoredBookings, loadBookings, saveBookings } from '../utils/storage.js'
import { BookingContext } from './BookingContext.js'

export function BookingProvider({ children }) {
  const isFb = isFirebaseConfigured()
  const [isFirebaseActive, setIsFirebaseActive] = useState(isFb)
  const [centres, setCentres] = useState(localCentres)
  const [slots, setSlots] = useState(localSlots)
  const [bookings, setBookings] = useState(() => (isFb ? [] : loadBookings([])))
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(isFb)
  const [refreshing, setRefreshing] = useState(false)

  // Initialize Firestore listeners & one-time seed when configured
  useEffect(() => {
    if (!isFb) {
      return
    }

    let unsubBookings = () => {}
    let unsubCentres = () => {}
    let unsubSlots = () => {}
    let unsubNotifs = () => {}

    async function initFirestore() {
      try {
        setLoading(true)
        // 1. One-time idempotent seed check
        await seedFirestoreDataIfEmpty()

        // 2. Fetch initial centres
        const fetchedCentres = await readCentres()
        if (fetchedCentres && fetchedCentres.length > 0) {
          setCentres(fetchedCentres)
        }

        // 3. Real-time Firestore subscriptions
        unsubBookings = subscribeToBookings((fbBookings) => {
          const nextBookings = Array.isArray(fbBookings) ? fbBookings : []
          setBookings(nextBookings)
          saveBookings(nextBookings)
        })

        unsubCentres = subscribeToCentres((fbCentres) => {
          if (fbCentres && fbCentres.length > 0) {
            setCentres(fbCentres)
          }
        })

        unsubSlots = subscribeToSlots((fbSlots) => {
          if (fbSlots && fbSlots.length > 0) {
            setSlots(fbSlots)
          }
        })

        unsubNotifs = subscribeToNotifications((fbNotifs) => {
          if (fbNotifs) {
            setNotifications(fbNotifs)
          }
        })

        setIsFirebaseActive(true)
      } catch (err) {
        console.warn('⚠️ Firestore initialization error, falling back to local storage:', err)
        setIsFirebaseActive(false)
      } finally {
        setLoading(false)
      }
    }

    initFirestore()

    return () => {
      unsubBookings()
      unsubCentres()
      unsubSlots()
      unsubNotifs()
    }
  }, [isFb])

  // Manual Refresh function to re-fetch from Firestore
  const refreshData = useCallback(async () => {
    setRefreshing(true)
    try {
      if (isFirebaseActive) {
        const [freshBookings, freshCentres, freshNotifs] = await Promise.all([
          readBookings(),
          readCentres(),
          readNotifications(),
        ])
        if (freshBookings && freshBookings.length > 0) {
          setBookings(freshBookings)
          saveBookings(freshBookings)
        }
        if (freshCentres && freshCentres.length > 0) {
          setCentres(freshCentres)
        }
        if (freshNotifs) {
          setNotifications(freshNotifs)
        }
      }
    } catch (err) {
      console.warn('Refresh error:', err)
    } finally {
      setRefreshing(false)
    }
  }, [isFirebaseActive])

  const value = useMemo(() => {
    async function submitBooking(form) {
      // Step 1: Validate farmer registration and booking form
      const validation = validateBookingForm(form, bookings)
      if (!validation.ok) {
        return { ok: false, errors: validation.errors }
      }

      // Step 2: Double check slot availability in Firestore if active
      if (isFirebaseActive) {
        try {
          const slotCheck = await checkSlotAvailability(form.centreId, form.date, form.slotId, bookings)
          if (!slotCheck.available) {
            return {
              ok: false,
              errors: {
                slotId: 'This time slot is full in live Firestore capacity. Please select another slot.',
              },
            }
          }
        } catch (err) {
          console.warn('Slot availability check warning:', err)
        }
      }

      // Step 3: Create booking record and token
      const result = createBooking(bookings, {
        ...form,
        status: 'Booked',
        paymentStatus: 'Pending',
      })
      if (!result.ok) {
        return result
      }

      // Step 4: Save farmer profile and booking in Firestore
      if (isFirebaseActive) {
        try {
          // 4a. Save farmer to farmers collection
          await fbSaveFarmer({
            name: result.booking.name,
            mobile: result.booking.mobile,
            village: result.booking.village,
            vehicleNumber: result.booking.vehicleNumber,
          })

          // 4b. Save booking document to bookings collection
          await fbSaveBooking(result.booking)
        } catch (err) {
          console.warn('⚠️ Failed to write to Firestore, saved to local state:', err)
        }
      }

      // Step 5: Update local state and localStorage
      setBookings(result.bookings)
      saveBookings(result.bookings)

      return result
    }

    async function updateStatus(token, newStatus, newPaymentStatus) {
      // Update locally
      const nextBookings = bookings.map((b) => {
        if (b.token === token) {
          const updated = { ...b, updatedAt: new Date().toISOString() }
          if (newStatus) updated.status = newStatus
          if (newPaymentStatus) updated.paymentStatus = newPaymentStatus
          return updated
        }
        return b
      })
      setBookings(nextBookings)
      saveBookings(nextBookings)

      // Update in Firestore
      if (isFirebaseActive) {
        try {
          await fbUpdateBookingStatus(token, newStatus, newPaymentStatus)
        } catch (err) {
          console.warn('⚠️ Failed to update status in Firestore:', err)
        }
      }
    }

    function cancelBooking(token) {
      updateStatus(token, 'Cancelled')
    }

    function resetToSeedData() {
      clearStoredBookings()
      setBookings([])
      setCentres(localCentres)
      setSlots(localSlots)
      saveBookings([])
    }

    async function lookupBooking(query) {
      if (!query) return null
      // 1. Check local state (token or mobile)
      const found = findBookingByTokenOrMobile(bookings, query)
      if (found) return found

      // 2. Check Firestore if active
      if (isFirebaseActive) {
        try {
          const fbDoc = await lookupBookingFirestore(query)
          if (fbDoc) return fbDoc
        } catch (err) {
          console.warn('Firestore lookup error:', err)
        }
      }
      return null
    }

    async function addCentre(centreData) {
      const id = centreData.id || `centre_${Date.now()}`
      const newCentre = {
        id,
        name: String(centreData.name || '').trim(),
        location: String(centreData.location || '').trim(),
        contact: String(centreData.contact || '').trim(),
        openingHours: String(centreData.openingHours || '08:00 – 17:00').trim(),
        capacityPerDay: Number(centreData.capacityPerDay) || 32,
        acceptedCrops: Array.isArray(centreData.acceptedCrops) ? centreData.acceptedCrops : ['Paddy', 'Soybean', 'Cotton'],
      }
      setCentres((prev) => [...prev.filter((c) => c.id !== id), newCentre])
      if (isFirebaseActive) {
        try {
          const { saveProcurementCentre } = await import('../services/firebaseService.js')
          await saveProcurementCentre(newCentre)
        } catch (e) {
          console.warn('Could not save centre to Firestore:', e)
        }
      }
      return newCentre
    }

    async function removeCentre(centreId) {
      setCentres((prev) => prev.filter((c) => c.id !== centreId))
      if (isFirebaseActive) {
        try {
          const { deleteProcurementCentre } = await import('../services/firebaseService.js')
          await deleteProcurementCentre(centreId)
        } catch (e) {
          console.warn('Could not delete centre from Firestore:', e)
        }
      }
    }

    return {
      bookings,
      centres,
      slots,
      notifications,
      isFirebaseActive,
      loading,
      refreshing,
      refreshData,
      submitBooking,
      updateStatus,
      cancelBooking,
      resetToSeedData,
      lookupBooking,
      addCentre,
      removeCentre,
    }
  }, [bookings, centres, slots, notifications, isFirebaseActive, loading, refreshing, refreshData])

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>
}
