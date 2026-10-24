import { db } from '../db/database.js'
import { ApiError } from './validation.js'

export const QUOTATION_STATUSES = [
  'Draft',
  'Issued',
  'Accepted',
  'Rejected',
  'Expired',
  'Cancelled',
]

export const QUOTATION_TRANSITIONS = {
  Draft: ['Issued', 'Cancelled'],
  Issued: ['Accepted', 'Rejected', 'Expired', 'Cancelled'],
  Accepted: [],
  Rejected: [],
  Expired: [],
  Cancelled: [],
}

export function canTransitionQuotation(from, to) {
  return from === to || (QUOTATION_TRANSITIONS[from] ?? []).includes(to)
}

function asFiniteNumber(value, field, label) {
  const parsed = typeof value === 'number' ? value : Number(String(value ?? '').trim())
  if (!Number.isFinite(parsed)) {
    throw new ApiError(422, `Enter a valid ${label}.`, { [field]: `Enter a valid ${label}.` })
  }
  return parsed
}

/**
 * Money is stored and calculated in paise (integer minor units).
 *
 * Calculation order:
 *   1. line total = quantity × unit price
 *   2. subtotal = sum of line totals
 *   3. taxable amount = subtotal − flat discount
 *   4. GST = taxable amount × GST rate, rounded to the nearest paisa
 *   5. total = taxable amount + GST
 *
 * Discount is a flat INR amount, not a percentage. Both discount and GST are
 * optional and default to zero. Totals are always recalculated on the server.
 */
export function calculateQuotationPayload(body) {
  const rawItems = Array.isArray(body?.lineItems) ? body.lineItems : []
  if (rawItems.length === 0) {
    throw new ApiError(422, 'Add at least one line item.', {
      lineItems: 'Add at least one line item.',
    })
  }
  if (rawItems.length > 100) {
    throw new ApiError(422, 'A quotation can contain at most 100 line items.')
  }

  const fields = {}
  const lineItems = rawItems.map((item, index) => {
    const description = String(item?.description ?? '').trim().slice(0, 500)
    const detail = String(item?.detail ?? '').trim().slice(0, 1000)
    const unit = String(item?.unit ?? 'unit').trim().slice(0, 40) || 'unit'
    const quantity = Number(item?.quantity)
    const unitPrice = Number(item?.unitPrice)

    if (description.length < 2) {
      fields[`lineItems.${index}.description`] = 'Enter a line item description.'
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 1_000_000) {
      fields[`lineItems.${index}.quantity`] = 'Quantity must be a whole number from 1 to 1,000,000.'
    }
    if (!Number.isFinite(unitPrice) || unitPrice < 0 || unitPrice > 100_000_000) {
      fields[`lineItems.${index}.unitPrice`] =
        'Unit price must be between 0 and 10,00,00,000 INR.'
    }

    return {
      description,
      detail,
      unit,
      quantity: Number.isInteger(quantity) ? quantity : 0,
      unitPricePaise: Number.isFinite(unitPrice) ? Math.round(unitPrice * 100) : 0,
      order: index,
    }
  })

  const discount = body?.discount === undefined || body?.discount === '' ? 0 : asFiniteNumber(body.discount, 'discount', 'discount amount')
  const gstRate = body?.gstRate === undefined || body?.gstRate === '' ? 0 : asFiniteNumber(body.gstRate, 'gstRate', 'GST rate')

  if (discount < 0) fields.discount = 'Discount cannot be negative.'
  if (discount > 100_000_000) fields.discount = 'Discount is higher than the supported limit.'
  if (gstRate < 0 || gstRate > 100) fields.gstRate = 'GST rate must be between 0 and 100 percent.'

  const subtotalPaise = lineItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPricePaise,
    0,
  )
  const discountPaise = Math.round(discount * 100)
  if (discountPaise > subtotalPaise) {
    fields.discount = 'Discount cannot be greater than the subtotal.'
  }

  if (Object.keys(fields).length) {
    throw new ApiError(422, 'Please check the quotation fields.', fields)
  }

  const gstRateBps = Math.round(gstRate * 100)
  const taxablePaise = subtotalPaise - discountPaise
  const gstPaise = Math.round((taxablePaise * gstRateBps) / 10_000)
  const totalPaise = taxablePaise + gstPaise

  return {
    lineItems,
    subtotalPaise,
    discountPaise,
    gstRateBps,
    gstPaise,
    totalPaise,
  }
}

/**
 * Allocate the next year-based quotation number. Call inside the same
 * transaction as the quotation insert so a failed insert cannot consume a
 * number in normal operation.
 */
export function nextQuotationNumber() {
  const year = new Date().getFullYear()
  const key = `quotation_sequence_${year}`
  const row = db.prepare('SELECT value FROM meta WHERE key = ?').get(key)
  const sequence = row ? Number(row.value) + 1 : 1
  db.prepare(`
    INSERT INTO meta (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(key, String(sequence))
  return `RHV-Q-${year}-${String(sequence).padStart(4, '0')}`
}
