import { useContext } from 'react'
import { BookingContext } from './BookingContext.js'

export function useBookings() {
  const context = useContext(BookingContext)
  if (!context) {
    throw new Error('useBookings must be used inside BookingProvider')
  }
  return context
}
