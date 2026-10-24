import { Router } from 'express'
import { randomUUID } from 'node:crypto'
import { db, timestamps, withTransaction } from '../db/database.js'
import { requireAdmin } from '../middleware/auth.js'
import { requireCsrf } from '../middleware/csrf.js'
import { logActivity } from '../lib/activity.js'
import { getSettingsRow, settingsFromRow } from '../lib/settings.js'
import { renderQuotationPdf } from '../lib/quotationPdf.js'
import {
  QUOTATION_STATUSES,
  calculateQuotationPayload,
  canTransitionQuotation,
  nextQuotationNumber,
} from '../lib/quotation.js'
import {
  clientFromRow,
  enquiryFromRow,
  quotationFromRow,
  quotationItemFromRow,
} from '../lib/serializers.js'
import { ApiError, asyncRoute, cleanString, isDate } from '../lib/validation.js'

export const quotationsRouter = Router()
quotationsRouter.use(requireAdmin)
quotationsRouter.use(requireCsrf)

const OWN_EDITABLE_STATUSES = new Set(['Draft'])

function itemsFor(quotationId) {
  return db
    .prepare('SELECT * FROM quotation_items WHERE quotation_id = ? ORDER BY sort_order ASC')
    .all(quotationId)
    .map(quotationItemFromRow)
}

function quotationDetails(id) {
  const row = db.prepare('SELECT * FROM quotations WHERE id = ?').get(id)
  if (!row) throw new ApiError(404, 'Quotation not found.')
  const quotation = quotationFromRow(row, itemsFor(id))
  const clientRow = row.client_id
    ? db.prepare('SELECT * FROM clients WHERE id = ?').get(row.client_id)
    : null
  const enquiryRow = row.enquiry_id
    ? db.prepare('SELECT * FROM enquiries WHERE id = ?').get(row.enquiry_id)
    : null
  return {
    quotation,
    client: clientFromRow(clientRow),
    enquiry: enquiryFromRow(enquiryRow),
  }
}

function quotationPayload(body, existing = null) {
  const clientId = cleanString(body.clientId ?? existing?.clientId, 64)
  const enquiryId = cleanString(body.enquiryId ?? existing?.enquiryId, 64)
  const projectTitle = cleanString(body.projectTitle ?? existing?.projectTitle, 200)
  const eventType = cleanString(body.eventType ?? existing?.eventType, 100)
  const eventDate = cleanString(body.eventDate ?? existing?.eventDate, 10)
  const venue = cleanString(body.venue ?? existing?.venue, 260)
  const notes = cleanString(body.notes ?? existing?.notes, 5000)
  const validUntil = cleanString(body.validUntil ?? existing?.validUntil, 10)
  const rawGuests = Number(body.guests ?? existing?.guests ?? 0)
  const fields = {}

  if (!clientId) {
    fields.clientId = 'Choose the client this quotation is for.'
  } else if (!db.prepare('SELECT id FROM clients WHERE id = ?').get(clientId)) {
    fields.clientId = 'The selected client no longer exists.'
  }

  if (enquiryId && !db.prepare('SELECT id FROM enquiries WHERE id = ?').get(enquiryId)) {
    fields.enquiryId = 'The linked enquiry no longer exists.'
  }

  if (projectTitle.length < 2) fields.projectTitle = 'Enter a project title.'
  if (eventDate && !isDate(eventDate)) fields.eventDate = 'Choose a valid event date.'
  if (validUntil && !isDate(validUntil)) fields.validUntil = 'Choose a valid validity date.'
  if (eventDate && validUntil && validUntil < eventDate) {
    fields.validUntil = 'The quotation cannot expire before the event date.'
  }
  if (!Number.isFinite(rawGuests) || rawGuests < 0 || rawGuests > 1_000_000) {
    fields.guests = 'Guests must be between 0 and 1,000,000.'
  }

  if (Object.keys(fields).length) {
    throw new ApiError(422, 'Please check the quotation fields.', fields)
  }

  return {
    clientId,
    enquiryId: enquiryId || null,
    projectTitle,
    eventType,
    eventDate: eventDate || null,
    venue,
    notes,
    validUntil: validUntil || null,
    guests: Math.trunc(rawGuests),
  }
}

function insertItems(quotationId, lineItems) {
  const insert = db.prepare(`
    INSERT INTO quotation_items
      (id, quotation_id, description, detail, quantity, unit, unit_price_paise, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)
  for (const item of lineItems) {
    insert.run(
      randomUUID(),
      quotationId,
      item.description,
      item.detail,
      item.quantity,
      item.unit,
      item.unitPricePaise,
      item.order,
    )
  }
}

quotationsRouter.get(
  '/',
  asyncRoute(async (req, res) => {
    const status = cleanString(req.query.status, 20)
    const search = cleanString(req.query.q, 160)
    const clauses = []
    const values = []
    if (status && status !== 'All') {
      if (!QUOTATION_STATUSES.includes(status)) {
        throw new ApiError(422, 'Unknown quotation status.')
      }
      clauses.push('q.status = ?')
      values.push(status)
    }
    if (search) {
      const like = `%${search}%`
      clauses.push('(q.number LIKE ? OR q.project_title LIKE ? OR c.company LIKE ? OR c.contact_name LIKE ?)')
      values.push(like, like, like, like)
    }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
    const rows = db
      .prepare(
        `SELECT q.*, c.company AS client_company, c.contact_name AS client_contact,
                (SELECT COUNT(*) FROM quotation_items qi WHERE qi.quotation_id = q.id) AS item_count
         FROM quotations q
         LEFT JOIN clients c ON c.id = q.client_id
         ${where}
         ORDER BY q.created_at DESC`,
      )
      .all(...values)
    const counts = {}
    for (const name of QUOTATION_STATUSES) {
      counts[name] = db
        .prepare('SELECT COUNT(*) AS count FROM quotations WHERE status = ?')
        .get(name).count
    }
    const totals = db
      .prepare(
        `SELECT
           COUNT(*) AS total,
           COALESCE(SUM(CASE WHEN status IN ('Draft', 'Issued') THEN total_paise ELSE 0 END), 0) AS pipeline,
           COALESCE(SUM(CASE WHEN status = 'Accepted' THEN total_paise ELSE 0 END), 0) AS accepted
         FROM quotations`,
      )
      .get()

    res.json({
      quotations: rows.map((row) => ({
        ...quotationFromRow(row),
        clientCompany: row.client_company || null,
        clientContact: row.client_contact || null,
        itemCount: Number(row.item_count ?? 0),
      })),
      counts: {
        total: Number(totals.total),
        pipelinePaise: Number(totals.pipeline),
        acceptedPaise: Number(totals.accepted),
        ...counts,
      },
    })
  }),
)

quotationsRouter.get(
  '/:id',
  asyncRoute(async (req, res) => {
    res.json(quotationDetails(req.params.id))
  }),
)

quotationsRouter.post(
  '/',
  asyncRoute(async (req, res) => {
    const payload = quotationPayload(req.body || {})
    const totals = calculateQuotationPayload(req.body || {})
    const id = randomUUID()
    const timestamp = timestamps.now()
    const created = withTransaction(() => {
      const number = nextQuotationNumber()
      db.prepare(`
        INSERT INTO quotations
          (id, number, client_id, enquiry_id, project_title, event_type, event_date, venue, guests,
           status, subtotal_paise, discount_paise, gst_rate_bps, gst_paise, total_paise,
           notes, valid_until, issued_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Draft', ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)
      `).run(
        id,
        number,
        payload.clientId,
        payload.enquiryId,
        payload.projectTitle,
        payload.eventType,
        payload.eventDate,
        payload.venue,
        payload.guests,
        totals.subtotalPaise,
        totals.discountPaise,
        totals.gstRateBps,
        totals.gstPaise,
        totals.totalPaise,
        payload.notes,
        payload.validUntil,
        timestamp,
        timestamp,
      )
      insertItems(id, totals.lineItems)
      logActivity(req, {
        action: 'quotation.created',
        entityType: 'quotation',
        entityId: id,
        description: `Created quotation ${number} for ${payload.projectTitle}`,
      })
      return quotationDetails(id)
    })
    res.status(201).json(created)
  }),
)

quotationsRouter.put(
  '/:id',
  asyncRoute(async (req, res) => {
    const existingRow = db.prepare('SELECT * FROM quotations WHERE id = ?').get(req.params.id)
    if (!existingRow) throw new ApiError(404, 'Quotation not found.')
    if (!OWN_EDITABLE_STATUSES.has(existingRow.status)) {
      throw new ApiError(
        409,
        'Only draft quotations can be edited. Cancel the quotation and create a new draft for changes.',
      )
    }
    const existing = quotationFromRow(existingRow, itemsFor(existingRow.id))
    const payload = quotationPayload(req.body || {}, existing)
    const totals = calculateQuotationPayload(req.body || {})
    const updated = withTransaction(() => {
      db.prepare(`
        UPDATE quotations SET
          client_id = ?, enquiry_id = ?, project_title = ?, event_type = ?, event_date = ?,
          venue = ?, guests = ?, subtotal_paise = ?, discount_paise = ?, gst_rate_bps = ?,
          gst_paise = ?, total_paise = ?, notes = ?, valid_until = ?, updated_at = ?
        WHERE id = ?
      `).run(
        payload.clientId,
        payload.enquiryId,
        payload.projectTitle,
        payload.eventType,
        payload.eventDate,
        payload.venue,
        payload.guests,
        totals.subtotalPaise,
        totals.discountPaise,
        totals.gstRateBps,
        totals.gstPaise,
        totals.totalPaise,
        payload.notes,
        payload.validUntil,
        timestamps.now(),
        req.params.id,
      )
      db.prepare('DELETE FROM quotation_items WHERE quotation_id = ?').run(req.params.id)
      insertItems(req.params.id, totals.lineItems)
      logActivity(req, {
        action: 'quotation.updated',
        entityType: 'quotation',
        entityId: req.params.id,
        description: `Updated draft quotation ${existingRow.number}`,
      })
      return quotationDetails(req.params.id)
    })
    res.json(updated)
  }),
)

quotationsRouter.patch(
  '/:id/status',
  asyncRoute(async (req, res) => {
    const nextStatus = cleanString(req.body?.status, 20)
    if (!QUOTATION_STATUSES.includes(nextStatus)) {
      throw new ApiError(422, 'Choose a valid quotation status.')
    }
    const existing = db.prepare('SELECT * FROM quotations WHERE id = ?').get(req.params.id)
    if (!existing) throw new ApiError(404, 'Quotation not found.')
    if (!canTransitionQuotation(existing.status, nextStatus)) {
      throw new ApiError(
        409,
        `A quotation marked ${existing.status} cannot move to ${nextStatus}.`,
      )
    }
    if (existing.status === nextStatus) {
      res.json(quotationDetails(existing.id))
      return
    }
    const timestamp = timestamps.now()
    withTransaction(() => {
      const issuedAt = nextStatus === 'Issued' ? timestamp : existing.issued_at
      db.prepare(
        'UPDATE quotations SET status = ?, issued_at = ?, updated_at = ? WHERE id = ?',
      ).run(nextStatus, issuedAt, timestamp, existing.id)
      logActivity(req, {
        action: `quotation.${nextStatus.toLowerCase()}`,
        entityType: 'quotation',
        entityId: existing.id,
        description: `${existing.number} moved from ${existing.status} to ${nextStatus}`,
      })
    })
    res.json(quotationDetails(existing.id))
  }),
)

quotationsRouter.delete(
  '/:id',
  asyncRoute(async (req, res) => {
    const existing = db.prepare('SELECT * FROM quotations WHERE id = ?').get(req.params.id)
    if (!existing) throw new ApiError(404, 'Quotation not found.')
    if (existing.status !== 'Draft') {
      throw new ApiError(409, 'Only draft quotations can be deleted. Cancel issued quotations instead.')
    }
    withTransaction(() => {
      db.prepare('DELETE FROM quotations WHERE id = ?').run(existing.id)
      logActivity(req, {
        action: 'quotation.deleted',
        entityType: 'quotation',
        entityId: existing.id,
        description: `Deleted draft quotation ${existing.number}`,
      })
    })
    res.json({ ok: true })
  }),
)

quotationsRouter.get(
  '/:id/pdf',
  asyncRoute(async (req, res) => {
    const row = db.prepare('SELECT * FROM quotations WHERE id = ?').get(req.params.id)
    if (!row) throw new ApiError(404, 'Quotation not found.')
    const quotation = quotationFromRow(row, itemsFor(row.id))
    const clientRow = row.client_id
      ? db.prepare('SELECT * FROM clients WHERE id = ?').get(row.client_id)
      : null
    const settings = settingsFromRow(getSettingsRow())
    const buffer = await renderQuotationPdf({
      quotation,
      client: clientFromRow(clientRow),
      settings,
    })
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${quotation.number}.pdf"`,
      'Content-Length': String(buffer.length),
      'Cache-Control': 'no-store',
    })
    res.send(buffer)
  }),
)
