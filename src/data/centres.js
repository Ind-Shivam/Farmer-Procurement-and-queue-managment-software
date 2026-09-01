export const CROPS = ['Paddy', 'Wheat', 'Soybean', 'Cotton', 'Maize']

export const SLOT_DATES = ['2026-08-30', '2026-08-31', '2026-09-01']

export const MINUTES_PER_QUEUE_PLACE = 8

export const BOOKING_STATUSES = [
  'Booked',
  'At Gate',
  'Quality Check',
  'Weighment',
  'Accepted',
  'Rejected',
  'Completed',
  'Cancelled',
  'No-show',
]

export const PAYMENT_STATUSES = [
  'Pending',
  'Processing',
  'Completed',
]

export const centres = [
  {
    id: 'wardha-pacs',
    name: 'Wardha PACS',
    location: 'Wardha Main Mandi Yard, Maharashtra',
    openingHours: '08:00 – 17:00',
    contact: '+91 7152 245012',
    capacityPerDay: 32,
    acceptedCrops: ['Paddy', 'Soybean', 'Cotton'],
  },
  {
    id: 'hinganghat-mandi',
    name: 'Hinganghat Mandi',
    location: 'APMC Market Yard, Hinganghat, Maharashtra',
    openingHours: '09:00 – 16:00',
    contact: '+91 7153 252110',
    capacityPerDay: 32,
    acceptedCrops: ['Cotton', 'Soybean', 'Wheat'],
  },
  {
    id: 'arvi-yard',
    name: 'Arvi Procurement Yard',
    location: 'Sub-Market Yard, Arvi, Maharashtra',
    openingHours: '08:30 – 17:30',
    contact: '+91 7157 222304',
    capacityPerDay: 32,
    acceptedCrops: ['Paddy', 'Wheat', 'Maize'],
  },
]

export const windows = [
  { key: '09-11', label: '09:00 – 11:00' },
  { key: '11-13', label: '11:00 – 13:00' },
  { key: '14-16', label: '14:00 – 16:00' },
  { key: '16-18', label: '16:00 – 18:00' },
]

/** reserved = base seats taken in sample scenario across slots */
const occupancy = {
  'wardha-pacs': {
    '09-11': 0,
    '11-13': 7,
    '14-16': 8, // full (capacity 8)
    '16-18': 2,
  },
  'hinganghat-mandi': {
    '09-11': 1,
    '11-13': 4,
    '14-16': 6,
    '16-18': 0,
  },
  'arvi-yard': {
    '09-11': 5,
    '11-13': 8, // full (capacity 8)
    '14-16': 2,
    '16-18': 6, // full (capacity 6)
  },
}

const capacityByWindow = {
  '09-11': 10,
  '11-13': 8,
  '14-16': 8,
  '16-18': 6,
}

export const slots = centres.flatMap((centre) =>
  SLOT_DATES.flatMap((date) =>
    windows.map((window) => ({
      id: `${centre.id}_${date}_${window.key}`,
      centreId: centre.id,
      date,
      windowKey: window.key,
      label: window.label,
      capacity: capacityByWindow[window.key],
      reserved: occupancy[centre.id]?.[window.key] ?? 0,
    })),
  ),
)

export const seedBookings = [
  {
    token: 'KC-2026-0101',
    name: 'Suresh Kale',
    mobile: '9876500001',
    village: 'Deoli',
    crop: 'Paddy',
    quantity: 8,
    vehicleNumber: 'MH32AB1001',
    centreId: 'wardha-pacs',
    date: '2026-08-30',
    slotId: 'wardha-pacs_2026-08-30_09-11',
    createdAt: '2026-08-29T10:00:00.000Z',
    status: 'At Gate',
    paymentStatus: 'Processing',
  },
  {
    token: 'KC-2026-0102',
    name: 'Mukesh Deshmukh',
    mobile: '9876500002',
    village: 'Seloo',
    crop: 'Wheat',
    quantity: 15,
    vehicleNumber: 'MH32AB1002',
    centreId: 'wardha-pacs',
    date: '2026-08-30',
    slotId: 'wardha-pacs_2026-08-30_09-11',
    createdAt: '2026-08-29T10:05:00.000Z',
    status: 'Booked',
    paymentStatus: 'Pending',
  },
  {
    token: 'KC-2026-0103',
    name: 'Anil Bhagat',
    mobile: '9876500003',
    village: 'Karanja',
    crop: 'Soybean',
    quantity: 10,
    vehicleNumber: 'MH32AB1003',
    centreId: 'wardha-pacs',
    date: '2026-08-30',
    slotId: 'wardha-pacs_2026-08-30_09-11',
    createdAt: '2026-08-29T10:10:00.000Z',
    status: 'Booked',
    paymentStatus: 'Pending',
  },
]
