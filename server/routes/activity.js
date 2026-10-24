import { Router } from 'express'
import { db } from '../db/database.js'
import { requireAdmin } from '../middleware/auth.js'
import { requireCsrf } from '../middleware/csrf.js'
import { activityFromRow } from '../lib/serializers.js'
import { ApiError, asyncRoute, cleanString } from '../lib/validation.js'

export const activityRouter = Router()
activityRouter.use(requireAdmin)
activityRouter.use(requireCsrf)

const ENTITY_TYPES = ['project', 'service', 'enquiry', 'client', 'quotation', 'asset', 'team', 'settings']

activityRouter.get(
  '/',
  asyncRoute(async (req, res) => {
    const entityType = cleanString(req.query.entityType, 30)
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100)
    const offset = Math.max(Number(req.query.offset) || 0, 0)
    const clauses = []
    const values = []
    if (entityType && entityType !== 'All') {
      if (!ENTITY_TYPES.includes(entityType)) throw new ApiError(422, 'Unknown activity type.')
      clauses.push('entity_type = ?')
      values.push(entityType)
    }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
    const total = db
      .prepare(`SELECT COUNT(*) AS count FROM activity_log ${where}`)
      .get(...values).count
    const rows = db
      .prepare(
        `SELECT * FROM activity_log ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      )
      .all(...values, limit, offset)
    const counts = {}
    for (const type of ENTITY_TYPES) {
      counts[type] = db
        .prepare('SELECT COUNT(*) AS count FROM activity_log WHERE entity_type = ?')
        .get(type).count
    }
    res.set('Cache-Control', 'no-store')
    res.json({
      activities: rows.map(activityFromRow),
      total,
      counts: { total: db.prepare('SELECT COUNT(*) AS count FROM activity_log').get().count, ...counts },
      paging: { limit, offset },
    })
  }),
)
