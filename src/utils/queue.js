import { MINUTES_PER_QUEUE_PLACE } from '../data/centres.js'

export const ACTIVE_QUEUE_STATUSES = ['Booked', 'At Gate', 'Quality Check', 'Weighment']

export function bookingsInSameQueue(bookings = [], booking) {
  if (!booking) return []
  return bookings
    .filter(
      (item) =>
        item.centreId === booking.centreId &&
        item.date === booking.date &&
        item.slotId === booking.slotId,
    )
    .slice()
    .sort((a, b) => {
      const timeDiff = (a.createdAt || '').localeCompare(b.createdAt || '')
      if (timeDiff !== 0) return timeDiff
      return (a.token || '').localeCompare(b.token || '')
    })
}

export function getActiveQueue(bookings = [], booking) {
  const allInQueue = bookingsInSameQueue(bookings, booking)
  // Only include active queue items (or if not explicitly marked completed/rejected/no-show)
  return allInQueue.filter((item) => {
    const st = item.status || 'Booked'
    return !['Completed', 'Rejected', 'No-show'].includes(st)
  })
}

export function getQueuePosition(bookings = [], booking) {
  if (!booking) return null
  const status = booking.status || 'Booked'
  if (['Completed', 'Rejected', 'No-show'].includes(status)) {
    return null
  }
  const queue = getActiveQueue(bookings, booking)
  const index = queue.findIndex((item) => item.token === booking.token)
  return index === -1 ? null : index + 1
}

export function getPeopleAhead(position) {
  if (!position || position <= 1) {
    return 0
  }
  return position - 1
}

export function getEstimatedWaitMinutes(position, minutesPerPlace = MINUTES_PER_QUEUE_PLACE) {
  return getPeopleAhead(position) * minutesPerPlace
}

export function formatWait(minutes, status) {
  if (status === 'Completed') return 'Completed'
  if (status === 'Rejected') return 'Rejected'
  if (status === 'No-show') return 'No-show'
  if (status === 'At Gate' || status === 'Quality Check' || status === 'Weighment') {
    return 'Currently at Mandi'
  }
  if (minutes === null || minutes === undefined) {
    return 'N/A'
  }
  if (minutes <= 0) {
    return 'Next in line at counter'
  }
  if (minutes < 60) {
    return `${minutes} mins`
  }
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest ? `${hours}h ${rest}m` : `${hours}h`
}

export function getQueueStatusLabel(position, status = 'Booked') {
  if (status === 'Completed') return 'Completed'
  if (status === 'Rejected') return 'Rejected'
  if (status === 'No-show') return 'No-show'
  if (status === 'Weighment') return 'At Weighment'
  if (status === 'Quality Check') return 'Quality Testing'
  if (status === 'At Gate') return 'Arrived at Gate'
  if (position === 1) return 'Now Serving'
  if (position === 2) return 'Next in Line'
  if (position && position > 2) return `In Line (#${position})`
  return 'Booked & Scheduled'
}

export function getQueueSummary(bookings = [], booking) {
  if (!booking) {
    return {
      position: null,
      peopleAhead: 0,
      waitMinutes: 0,
      waitLabel: 'No active queue',
      statusLabel: 'N/A',
      queue: [],
    }
  }
  const currentStatus = booking.status || 'Booked'
  const position = getQueuePosition(bookings, booking)
  const peopleAhead = getPeopleAhead(position)
  const waitMinutes = getEstimatedWaitMinutes(position)
  return {
    position,
    peopleAhead,
    waitMinutes,
    waitLabel: formatWait(waitMinutes, currentStatus),
    statusLabel: getQueueStatusLabel(position, currentStatus),
    queue: bookingsInSameQueue(bookings, booking),
  }
}

export function getLiveQueueForSlot(bookings = [], centreId, date, slotId) {
  const matching = bookings
    .filter(
      (item) =>
        (!centreId || item.centreId === centreId) &&
        (!date || item.date === date) &&
        (!slotId || item.slotId === slotId),
    )
    .slice()
    .sort((a, b) => {
      const timeDiff = (a.createdAt || '').localeCompare(b.createdAt || '')
      if (timeDiff !== 0) return timeDiff
      return (a.token || '').localeCompare(b.token || '')
    })

  return matching.map((item, index) => {
    const position = index + 1
    const peopleAhead = getPeopleAhead(position)
    const waitMinutes = getEstimatedWaitMinutes(position)
    const status = item.status || 'Booked'
    return {
      ...item,
      position,
      peopleAhead,
      waitMinutes,
      waitLabel: formatWait(waitMinutes, status),
      queueStatus:
        status !== 'Booked'
          ? status
          : position === 1
          ? 'Now Serving'
          : position === 2
          ? 'Next Up'
          : 'Booked',
    }
  })
}
