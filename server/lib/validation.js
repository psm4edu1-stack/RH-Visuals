export class ApiError extends Error {
  constructor(status, message, fields) {
    super(message)
    this.status = status
    this.fields = fields
  }
}

export function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next)
}

export function parseJson(value, fallback = []) {
  if (Array.isArray(value) || (value && typeof value === 'object')) return value
  if (!value) return fallback
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

export function cleanString(value, maxLength = 1000) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

export function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254
}

export function isPhone(value) {
  if (!value) return true
  return /^[+()\d\s.-]{7,32}$/.test(value)
}

export function isDate(value) {
  if (!value) return true
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}

export function isPastDate(value) {
  if (!value) return false
  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate(),
  ).padStart(2, '0')}`
  return value < today
}

export function isHttpUrl(value) {
  if (!value || value.length > 800) return false
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

export function isSlug(value) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
}

export function uniqueSlug(base, exists) {
  const cleaned =
    String(base || 'project')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'project'
  let candidate = cleaned
  let index = 2
  while (exists(candidate)) {
    candidate = `${cleaned}-${index}`
    index += 1
  }
  return candidate
}

export function normalizeStringArray(value, maxItems = 30, maxLength = 120) {
  if (Array.isArray(value)) {
    return value
      .map((item) => cleanString(String(item), maxLength))
      .filter(Boolean)
      .slice(0, maxItems)
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => cleanString(item, maxLength))
      .filter(Boolean)
      .slice(0, maxItems)
  }
  return []
}
