export const REQUIRED_FIELDS = [
  'name',
  'mobile',
  'village',
  'crop',
  'quantity',
  'vehicleNumber',
  'centreId',
  'date',
  'slotId',
]

export function normalizeMobile(value) {
  const digits = String(value ?? '').replace(/\D/g, '')
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2)
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return digits.slice(1)
  }
  return digits
}

export function isValidMobile(value) {
  const normalized = normalizeMobile(value)
  return /^[6-9]\d{9}$/.test(normalized)
}

export function parseQuantity(value) {
  const quantity = Number(value)
  return Number.isFinite(quantity) ? quantity : NaN
}

export function isPositiveQuantity(value) {
  const quantity = parseQuantity(value)
  return Number.isFinite(quantity) && quantity > 0
}

export function isBlank(value) {
  return String(value ?? '').trim() === ''
}

export function isValidVehicleNumber(value) {
  if (isBlank(value)) return false
  const clean = String(value).trim().replace(/[\s-]/g, '').toUpperCase()
  // Basic validation: at least 4 alphanumeric chars
  return clean.length >= 4 && clean.length <= 15
}

export function collectRequiredErrors(form) {
  const errors = {}
  for (const field of REQUIRED_FIELDS) {
    if (isBlank(form[field])) {
      switch (field) {
        case 'name':
          errors.name = 'Please enter farmer full name.'
          break
        case 'mobile':
          errors.mobile = 'Please enter your mobile number.'
          break
        case 'village':
          errors.village = 'Please enter your village/taluka.'
          break
        case 'crop':
          errors.crop = 'Please select a crop.'
          break
        case 'quantity':
          errors.quantity = 'Please enter crop quantity.'
          break
        case 'vehicleNumber':
          errors.vehicleNumber = 'Please enter vehicle registration number.'
          break
        case 'centreId':
          errors.centreId = 'Please select a procurement centre.'
          break
        case 'date':
          errors.date = 'Please select a procurement date.'
          break
        case 'slotId':
          errors.slotId = 'Please select a time slot window.'
          break
        default:
          errors[field] = 'This field is required.'
      }
    }
  }
  return errors
}
