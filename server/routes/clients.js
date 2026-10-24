import { Router } from 'express'
import { randomUUID } from 'node:crypto'
import { db, timestamps, withTransaction } from '../db/database.js'
import { requireAdmin } from '../middleware/auth.js'
import { requireCsrf } from '../middleware/csrf.js'
import { logActivity } from '../lib/activity.js'
import { clientFromRow } from '../lib/serializers.js'
import {
  ApiError,
  asyncRoute,
  cleanString,
  isEmail,
  isPhone,
} from '../lib/validation.js'

export const clientsRouter = Router()
clientsRouter.use(requireAdmin)
clientsRouter.use(requireCsrf)

const CLIENT_STATUSES = ['Active', 'Prospect', 'Past']

function clientPayload(body, existing = null) {
  const company = cleanString(body.company ?? existing?.company, 180)
  const contactName = cleanString(body.contactName ?? existing?.contactName, 140)
  const email = cleanString(body.email ?? existing?.email, 254).toLowerCase()
  const phone = cleanString(body.phone ?? existing?.phone, 40)
  const industry = cleanString(body.industry ?? existing?.industry, 120)
  const city = cleanString(body.city ?? existing?.city, 120)
  const status = cleanString(body.status ?? existing?.status ?? 'Prospect', 20)
  const notes = cleanString(body.notes ?? existing?.notes, 5000)
  const fields = {}

  if (company.length < 2) fields.company = 'Enter a client or company name.'
  if (contactName.length < 2) fields.contactName = 'Enter the primary contact name.'
  if (!isEmail(email)) fields.email = 'Enter a valid email address.'
  if (!isPhone(phone)) fields.phone = 'Enter a valid phone number or leave it blank.'
  if (!CLIENT_STATUSES.includes(status)) fields.status = 'Choose Active, Prospect or Past.'

  if (email) {
    const duplicate = db
      .prepare('SELECT id FROM clients WHERE email = ? COLLATE NOCASE AND id <> ?')
      .get(email, existing?.id ?? '')
    if (duplicate) fields.email = 'A client with this email already exists.'
  }

  if (Object.keys(fields).length) {
    throw new ApiError(422, 'Please check the client fields.', fields)
  }

  return { company, contactName, email, phone, industry, city, status, notes }
}

function clientDetails(id) {
  const row = db.prepare('SELECT * FROM clients WHERE id = ?').get(id)
  if (!row) throw new ApiError(404, 'Client not found.')
  const enquiries = db
    .prepare(
      `SELECT id, event_type AS eventType, event_date AS eventDate, status, created_at AS createdAt
       FROM enquiries WHERE client_id = ? ORDER BY created_at DESC`,
    )
    .all(id)
  const quotations = db
    .prepare(
      `SELECT id, number, project_title AS projectTitle, status, total_paise AS totalPaise,
              created_at AS createdAt
       FROM quotations WHERE client_id = ? ORDER BY created_at DESC`,
    )
    .all(id)
  const projects = db
    .prepare(
      `SELECT id, slug, title, status, cover FROM projects WHERE client_id = ? ORDER BY updated_at DESC`,
    )
    .all(id)
  return { ...clientFromRow(row), enquiries, quotations, projects }
}

clientsRouter.get(
  '/',
  asyncRoute(async (req, res) => {
    const status = cleanString(req.query.status, 20)
    const search = cleanString(req.query.q, 160)
    const clauses = []
    const values = []
    if (status && status !== 'All') {
      if (!CLIENT_STATUSES.includes(status)) throw new ApiError(422, 'Unknown client status.')
      clauses.push('status = ?')
      values.push(status)
    }
    if (search) {
      const like = `%${search}%`
      clauses.push('(company LIKE ? OR contact_name LIKE ? OR email LIKE ? OR city LIKE ?)')
      values.push(like, like, like, like)
    }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
    const rows = db
      .prepare(`SELECT * FROM clients ${where} ORDER BY updated_at DESC, company ASC`)
      .all(...values)
    const linkedQuotes = db
      .prepare('SELECT client_id, COUNT(*) AS count, COALESCE(SUM(total_paise), 0) AS value FROM quotations WHERE client_id IS NOT NULL GROUP BY client_id')
      .all()
    const stats = new Map(linkedQuotes.map((row) => [row.client_id, row]))
    res.json({
      clients: rows.map((row) => ({
        ...clientFromRow(row),
        quotationCount: Number(stats.get(row.id)?.count ?? 0),
        quotationValuePaise: Number(stats.get(row.id)?.value ?? 0),
      })),
      counts: {
        total: db.prepare('SELECT COUNT(*) AS count FROM clients').get().count,
        active: db.prepare(`SELECT COUNT(*) AS count FROM clients WHERE status = 'Active'`).get().count,
        prospects: db.prepare(`SELECT COUNT(*) AS count FROM clients WHERE status = 'Prospect'`).get().count,
      },
    })
  }),
)

clientsRouter.get(
  '/:id',
  asyncRoute(async (req, res) => {
    res.json({ client: clientDetails(req.params.id) })
  }),
)

clientsRouter.post(
  '/',
  asyncRoute(async (req, res) => {
    const payload = clientPayload(req.body || {})
    const id = randomUUID()
    const timestamp = timestamps.now()
    const client = withTransaction(() => {
      db.prepare(`
        INSERT INTO clients
          (id, company, contact_name, email, phone, industry, city, status, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        payload.company,
        payload.contactName,
        payload.email,
        payload.phone,
        payload.industry,
        payload.city,
        payload.status,
        payload.notes,
        timestamp,
        timestamp,
      )
      logActivity(req, {
        action: 'client.created',
        entityType: 'client',
        entityId: id,
        description: `Created client ${payload.company}`,
      })
      return clientFromRow(db.prepare('SELECT * FROM clients WHERE id = ?').get(id))
    })
    res.status(201).json({ client })
  }),
)

clientsRouter.put(
  '/:id',
  asyncRoute(async (req, res) => {
    const existingRow = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id)
    if (!existingRow) throw new ApiError(404, 'Client not found.')
    const existing = clientFromRow(existingRow)
    const payload = clientPayload(req.body || {}, existing)
    const timestamp = timestamps.now()
    const client = withTransaction(() => {
      db.prepare(`
        UPDATE clients SET company = ?, contact_name = ?, email = ?, phone = ?, industry = ?,
          city = ?, status = ?, notes = ?, updated_at = ? WHERE id = ?
      `).run(
        payload.company,
        payload.contactName,
        payload.email,
        payload.phone,
        payload.industry,
        payload.city,
        payload.status,
        payload.notes,
        timestamp,
        req.params.id,
      )
      logActivity(req, {
        action: 'client.updated',
        entityType: 'client',
        entityId: req.params.id,
        description: `Updated client ${payload.company}`,
      })
      return clientFromRow(db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id))
    })
    res.json({ client })
  }),
)

clientsRouter.delete(
  '/:id',
  asyncRoute(async (req, res) => {
    const existing = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id)
    if (!existing) throw new ApiError(404, 'Client not found.')
    const enquiries = db
      .prepare('SELECT COUNT(*) AS count FROM enquiries WHERE client_id = ?')
      .get(req.params.id).count
    const quotations = db
      .prepare('SELECT COUNT(*) AS count FROM quotations WHERE client_id = ?')
      .get(req.params.id).count
    const projects = db
      .prepare('SELECT COUNT(*) AS count FROM projects WHERE client_id = ?')
      .get(req.params.id).count
    if (enquiries + quotations + projects > 0) {
      throw new ApiError(
        409,
        'This client has linked enquiries, quotations or projects. Mark the relationship as Past instead of deleting it.',
      )
    }
    withTransaction(() => {
      db.prepare('DELETE FROM clients WHERE id = ?').run(req.params.id)
      logActivity(req, {
        action: 'client.deleted',
        entityType: 'client',
        entityId: req.params.id,
        description: `Deleted unlinked client ${existing.company}`,
      })
    })
    res.json({ ok: true })
  }),
)

clientsRouter.post(
  '/from-enquiry/:enquiryId',
  asyncRoute(async (req, res) => {
    const enquiry = db.prepare('SELECT * FROM enquiries WHERE id = ?').get(req.params.enquiryId)
    if (!enquiry) throw new ApiError(404, 'Enquiry not found.')
    if (enquiry.client_id) {
      throw new ApiError(409, 'This enquiry is already linked to a client.')
    }
    const duplicate = db
      .prepare('SELECT id, company FROM clients WHERE email = ? COLLATE NOCASE')
      .get(enquiry.email)
    if (duplicate) {
      throw new ApiError(
        409,
        `A client record already exists for ${enquiry.email}. Link the enquiry to ${duplicate.company} instead.`,
        { email: 'An existing client uses this email address.' },
      )
    }
    const payload = clientPayload({
      company: req.body?.company ?? enquiry.company ?? enquiry.name,
      contactName: req.body?.contactName ?? enquiry.name,
      email: req.body?.email ?? enquiry.email,
      phone: req.body?.phone ?? enquiry.phone,
      industry: req.body?.industry ?? '',
      city: req.body?.city ?? enquiry.venue ?? '',
      status: req.body?.status ?? 'Prospect',
      notes: req.body?.notes ?? '',
    })
    const id = randomUUID()
    const timestamp = timestamps.now()
    const client = withTransaction(() => {
      db.prepare(`
        INSERT INTO clients
          (id, company, contact_name, email, phone, industry, city, status, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        payload.company,
        payload.contactName,
        payload.email,
        payload.phone,
        payload.industry,
        payload.city,
        payload.status,
        payload.notes,
        timestamp,
        timestamp,
      )
      db.prepare('UPDATE enquiries SET client_id = ?, updated_at = ? WHERE id = ?').run(
        id,
        timestamp,
        enquiry.id,
      )
      logActivity(req, {
        action: 'enquiry.converted',
        entityType: 'client',
        entityId: id,
        description: `Created client ${payload.company} from an enquiry`,
      })
      return clientFromRow(db.prepare('SELECT * FROM clients WHERE id = ?').get(id))
    })
    res.status(201).json({ client })
  }),
)
