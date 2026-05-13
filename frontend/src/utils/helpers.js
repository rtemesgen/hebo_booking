export function createId(prefix) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`
  }
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`
}

export function normalizeName(value) {
  return (value || '').trim().toLowerCase()
}

export function parseRecordMoment(record) {
  const datePart = record.date || '1970-01-01'
  const timePart = record.time || '00:00'
  const iso = `${datePart}T${timePart}:00`
  const parsed = new Date(iso)
  const fallback = new Date(record.createdAt || 0)
  return Number.isNaN(parsed.getTime()) ? fallback : parsed
}
