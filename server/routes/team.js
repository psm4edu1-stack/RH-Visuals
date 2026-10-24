import { Router } from 'express'
import { randomUUID } from 'node:crypto'
import { db, timestamps, withTransaction } from '../db/database.js'
import { requireAdmin } from '../middleware/auth.js'
import { requireCsrf } from '../middleware/csrf.js'
import { logActivity } from '../lib/activity.js'
import { teamMemberFromRow } from '../lib/serializers.js'
import {
  ApiError,
  asyncRoute,
  cleanString,
  isEmail,
  isPhone,
} from '../lib/validation.js'

export const teamRouter = Router()
teamRouter.use(requireAdmin)
teamRouter.use(requireCsrf)

const TEAM_STATUSES = ['Active', 'Inactive']

function teamPayload(body, existing = null) {
  const name = cleanString(body.name ?? existing?.name, 140)
  const email = cleanString(body.email ?? existing?.email, 254).toLowerCase()
  const phone = cleanString(body.phone ?? existing?.phone, 40)
  const title = cleanString(body.title ?? existing?.title, 120)
  const status = cleanString(body.status ?? existing?.status ?? 'Active', 20)
  const color = cleanString(body.color ?? existing?.color, 20)
  const fields = {}

  if (name.length < 2) fields.name = 'Enter the team member’s name.'
  if (!isEmail(email)) fields.email = 'Enter a valid email address.'
  if (!isPhone(phone)) fields.phone = 'Enter a valid phone number or leave it blank.'
  if (!TEAM_STATUSES.includes(status)) fields.status = 'Choose Active or Inactive.'
  if (color && !/^#[0-9a-f]{6}$/i.test(color)) fields.color = 'Use a six-digit hex colour.'

  if (email) {
    const duplicate = db
      .prepare('SELECT id FROM team_members WHERE email = ? COLLATE NOCASE AND id <> ?')
      .get(email, existing?.id ?? '')
    if (duplicate) fields.email = 'A team member with this email already exists.'
  }

  if (Object.keys(fields).length) {
    throw new ApiError(422, 'Please check the team fields.', fields)
  }

  return { name, email, phone, title, status, color }
}

teamRouter.get(
  '/',
  asyncRoute(async (req, res) => {
    const rows = db
      .prepare('SELECT * FROM team_members ORDER BY status ASC, name ASC')
      .all()
    res.json({
      team: rows.map(teamMemberFromRow),
      counts: {
        total: rows.length,
        active: rows.filter((row) => row.status === 'Active').length,
        inactive: rows.filter((row) => row.status === 'Inactive').length,
      },
    })
  }),
)

teamRouter.post(
  '/',
  asyncRoute(async (req, res) => {
    const payload = teamPayload(req.body || {})
    const id = randomUUID()
    const timestamp = timestamps.now()
    const member = withTransaction(() => {
      db.prepare(`
        INSERT INTO team_members
          (id, name, email, phone, title, status, color, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        payload.name,
        payload.email,
        payload.phone,
        payload.title,
        payload.status,
        payload.color,
        timestamp,
        timestamp,
      )
      logActivity(req, {
        action: 'team.created',
        entityType: 'team',
        entityId: id,
        description: `Added team member ${payload.name}`,
      })
      return teamMemberFromRow(db.prepare('SELECT * FROM team_members WHERE id = ?').get(id))
    })
    res.status(201).json({ member })
  }),
)

teamRouter.put(
  '/:id',
  asyncRoute(async (req, res) => {
    const existingRow = db.prepare('SELECT * FROM team_members WHERE id = ?').get(req.params.id)
    if (!existingRow) throw new ApiError(404, 'Team member not found.')
    const payload = teamPayload(req.body || {}, teamMemberFromRow(existingRow))
    const member = withTransaction(() => {
      db.prepare(`
        UPDATE team_members SET
          name = ?, email = ?, phone = ?, title = ?, status = ?, color = ?, updated_at = ?
        WHERE id = ?
      `).run(
        payload.name,
        payload.email,
        payload.phone,
        payload.title,
        payload.status,
        payload.color,
        timestamps.now(),
        req.params.id,
      )
      logActivity(req, {
        action: 'team.updated',
        entityType: 'team',
        entityId: req.params.id,
        description: `Updated team member ${payload.name}`,
      })
      return teamMemberFromRow(
        db.prepare('SELECT * FROM team_members WHERE id = ?').get(req.params.id),
      )
    })
    res.json({ member })
  }),
)

teamRouter.delete(
  '/:id',
  asyncRoute(async (req, res) => {
    const existing = db.prepare('SELECT * FROM team_members WHERE id = ?').get(req.params.id)
    if (!existing) throw new ApiError(404, 'Team member not found.')
    withTransaction(() => {
      db.prepare('DELETE FROM team_members WHERE id = ?').run(req.params.id)
      logActivity(req, {
        action: 'team.deleted',
        entityType: 'team',
        entityId: req.params.id,
        description: `Removed team member ${existing.name}`,
      })
    })
    res.json({ ok: true })
  }),
)
