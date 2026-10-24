import type { QuoteLineItem, Quotation } from '../types'

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0)
}

export function formatCompactCurrency(value: number) {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(2).replace(/\.00$/, '')}Cr`
  if (value >= 100000) return `₹${(value / 100000).toFixed(1).replace(/\.0$/, '')}L`
  if (value >= 1000) return `₹${(value / 1000).toFixed(0)}K`
  return `₹${value || 0}`
}

export function formatDate(date: string, options?: Intl.DateTimeFormatOptions) {
  if (!date) return '—'
  const parsed = new Date(date.includes('T') ? date : `${date}T12:00:00`)
  if (Number.isNaN(parsed.getTime())) return '—'
  return new Intl.DateTimeFormat(
    'en-IN',
    options ?? { day: '2-digit', month: 'short', year: 'numeric' },
  ).format(parsed)
}

export function formatShortDate(date: string) {
  return formatDate(date, { day: '2-digit', month: 'short' })
}

export function formatDateTime(value: string) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

export function relativeTime(value: string) {
  const date = new Date(value)
  const diff = Date.now() - date.getTime()
  const minutes = Math.round(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days}d ago`
  return formatDate(value)
}

export function daysUntil(date: string) {
  if (!date) return 0
  const target = new Date(`${date}T00:00:00`)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - today.getTime()) / 86400000)
}

export function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

export function uid(prefix = 'id') {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID().slice(0, 8)}`
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`
}

export function calculateLineTotal(item: QuoteLineItem) {
  return Math.round(item.quantity * item.rate)
}

export function calculateQuoteTotals(quote: Pick<Quotation, 'lineItems' | 'discount' | 'taxRate'>) {
  const subtotal = quote.lineItems.reduce((total, item) => total + calculateLineTotal(item), 0)
  const discounted = Math.max(0, subtotal - quote.discount)
  const tax = Math.round((discounted * quote.taxRate) / 100)
  return {
    subtotal,
    discounted,
    tax,
    total: discounted + tax,
  }
}

export function getQuoteStatusTone(status: string) {
  switch (status) {
    case 'Accepted':
    case 'Confirmed':
    case 'Active':
    case 'Completed':
    case 'Qualified':
      return 'success'
    case 'Sent':
    case 'New':
    case 'Prospect':
      return 'info'
    case 'Pending':
    case 'Draft':
    case 'Contacted':
    case 'Invited':
      return 'warning'
    case 'Declined':
    case 'Cancelled':
    case 'Archived':
    case 'Suspended':
      return 'danger'
    default:
      return 'neutral'
  }
}

export function monthKey(date: string) {
  return date.slice(0, 7)
}

export function monthName(date: string) {
  return new Intl.DateTimeFormat('en-IN', { month: 'short' }).format(
    new Date(`${date.slice(0, 7)}-01T12:00:00`),
  )
}

export function downloadTextFile(filename: string, content: string, type = 'text/plain') {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

export function initialsColor(name: string) {
  const palette = ['#F15B40', '#7541A8', '#FFC928', '#57826E', '#C9856C', '#5D5A78']
  const sum = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return palette[sum % palette.length]
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}
