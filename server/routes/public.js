import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { randomUUID } from 'node:crypto'
import { db, timestamps } from '../db/database.js'
import { answerChat, chatStatus, normalizeChatHistory } from '../lib/chat.js'
import { enquiryFromRow, projectFromRow, serviceFromRow } from '../lib/serializers.js'
import { getPublicSettings } from '../lib/settings.js'
import {
  ApiError,
  asyncRoute,
  cleanString,
  isDate,
  isEmail,
  isPastDate,
  isPhone,
  normalizeStringArray,
} from '../lib/validation.js'

export const publicRouter = Router()

publicRouter.get(
  '/projects',
  asyncRoute(async (req, res) => {
    res.set('Cache-Control', 'no-store')
    const rows = db
      .prepare(
        `SELECT * FROM projects
         WHERE status = 'published'
         ORDER BY sort_order ASC, created_at DESC`,
      )
      .all()
    res.json({ projects: rows.map(projectFromRow), demoFallback: false })
  }),
)

publicRouter.get(
  '/settings',
  asyncRoute(async (req, res) => {
    res.set('Cache-Control', 'no-store')
    res.json({ settings: getPublicSettings() })
  }),
)

publicRouter.get(
  '/projects/:slug',
  asyncRoute(async (req, res) => {
    res.set('Cache-Control', 'no-store')
    const row = db
      .prepare(`SELECT * FROM projects WHERE slug = ? AND status = 'published'`)
      .get(req.params.slug)
    if (!row) throw new ApiError(404, 'Project not found.')
    res.json({ project: projectFromRow(row) })
  }),
)

publicRouter.get(
  '/services',
  asyncRoute(async (req, res) => {
    res.set('Cache-Control', 'no-store')
    const rows = db
      .prepare(
        `SELECT * FROM services
         WHERE status = 'published'
         ORDER BY sort_order ASC, created_at ASC`,
      )
      .all()
    res.json({ services: rows.map(serviceFromRow) })
  }),
)

const enquiryLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { message: 'Too many enquiries from this connection. Please try again later.' } },
})

publicRouter.post(
  '/enquiries',
  enquiryLimit,
  asyncRoute(async (req, res) => {
    const body = req.body || {}
    if (cleanString(body.website, 200)) {
      throw new ApiError(400, 'Your enquiry could not be submitted.')
    }

    const name = cleanString(body.name, 120)
    const email = cleanString(body.email, 254).toLowerCase()
    const phone = cleanString(body.phone, 32)
    const company = cleanString(body.company, 160)
    const eventType = cleanString(body.eventType, 80)
    const eventDate = cleanString(body.eventDate, 10)
    const venue = cleanString(body.venue, 240)
    const rawAudienceSize = body.audienceSize
    const parsedAudienceSize = Number(rawAudienceSize)
    const audienceSize =
      Number.isInteger(parsedAudienceSize) && parsedAudienceSize > 0
        ? Math.min(parsedAudienceSize, 1_000_000)
        : 0
    const message = cleanString(body.message, 5000)
    const budget = Math.max(0, Math.min(Number(body.budget) || 0, 1_000_000_000))
    const services = normalizeStringArray(body.services, 20, 120)
    const fields = {}

    if (name.length < 2) fields.name = 'Enter your name.'
    if (!isEmail(email)) fields.email = 'Enter a valid email address.'
    if (!isPhone(phone)) fields.phone = 'Enter a valid phone number or leave it blank.'
    if (!eventType) fields.eventType = 'Choose an event type.'
    if (!isDate(eventDate) || isPastDate(eventDate)) {
      fields.eventDate = 'Choose a valid event date that has not already passed.'
    }
    if (
      rawAudienceSize !== undefined &&
      rawAudienceSize !== null &&
      String(rawAudienceSize).trim() !== '' &&
      (!Number.isInteger(parsedAudienceSize) ||
        parsedAudienceSize < 1 ||
        parsedAudienceSize > 1_000_000)
    ) {
      fields.audienceSize = 'Enter an audience size between 1 and 1,000,000, or leave it blank.'
    }
    if (message.length < 10) fields.message = 'Add a little more detail about the event.'
    if (Object.keys(fields).length) {
      throw new ApiError(422, 'Please check the highlighted fields.', fields)
    }

    const duplicate = db
      .prepare(
        `SELECT id FROM enquiries
         WHERE email = ? AND message = ? AND created_at > ?`,
      )
      .get(email, message, new Date(Date.now() - 10 * 60 * 1000).toISOString())
    if (duplicate) {
      throw new ApiError(409, 'This enquiry was already received. We’ll be in touch shortly.')
    }

    const id = randomUUID()
    const timestamp = timestamps.now()
    db.prepare(`
      INSERT INTO enquiries
        (id, name, email, phone, company, event_type, event_date, venue, audience_size, budget, services, message, status, source, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', 'Website', '', ?, ?)
    `).run(
      id,
      name,
      email,
      phone,
      company,
      eventType,
      eventDate || null,
      venue,
      audienceSize,
      Math.round(budget),
      JSON.stringify(services),
      message,
      timestamp,
      timestamp,
    )

    const stored = db.prepare('SELECT * FROM enquiries WHERE id = ?').get(id)
    res.status(201).json({
      enquiry: {
        id: stored.id,
        createdAt: stored.created_at,
        status: stored.status,
      },
      message: 'Enquiry received. A producer will reply within one working day.',
    })
  }),
)

publicRouter.get('/chat/status', (req, res) => {
  res.set('Cache-Control', 'no-store')
  res.json(chatStatus())
})

const chatLimit = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { message: 'The studio guide is receiving a lot of messages. Please try again shortly.' } },
})

publicRouter.post(
  '/chat',
  chatLimit,
  asyncRoute(async (req, res) => {
    const message = cleanString(req.body?.message, 500)
    if (!message) throw new ApiError(400, 'Enter a message.')
    const history = normalizeChatHistory(req.body?.history)
    const result = await answerChat(message, history)
    res.set('Cache-Control', 'no-store')
    res.json(result)
  }),
)

export { enquiryFromRow }
