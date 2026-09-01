export function formatToken(year, sequence) {
  return `KC-${year}-${String(sequence).padStart(4, '0')}`
}

export function parseTokenSequence(token, year = 2026) {
  if (!token) return null
  const prefix = `KC-${year}-`
  if (token.startsWith(prefix)) {
    const num = parseInt(token.slice(prefix.length), 10)
    return Number.isFinite(num) ? num : null
  }
  // Generic match for KC-YYYY-XXXX
  const match = token.match(/^KC-\d{4}-(\d+)$/)
  if (match) {
    const num = parseInt(match[1], 10)
    return Number.isFinite(num) ? num : null
  }
  return null
}

export function nextToken(existingBookings = [], year = 2026) {
  let maxSeq = 100 // baseline so initial sequential starts at 0101 if empty
  for (const booking of existingBookings) {
    const seq = parseTokenSequence(booking.token, year)
    if (seq !== null && seq > maxSeq) {
      maxSeq = seq
    }
  }
  return formatToken(year, maxSeq + 1)
}
