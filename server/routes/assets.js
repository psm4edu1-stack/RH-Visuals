import { Router } from 'express'
import { randomUUID } from 'node:crypto'
import { db, timestamps, withTransaction } from '../db/database.js'
import { requireAdmin } from '../middleware/auth.js'
import { requireCsrf } from '../middleware/csrf.js'
import { logActivity } from '../lib/activity.js'
import { assetFromRow, clientFromRow } from '../lib/serializers.js'
import {
  ApiError,
  asyncRoute,
  cleanString,
  isDate,
  normalizeStringArray,
} from '../lib/validation.js'

export const assetsRouter = Router()
assetsRouter.use(requireAdmin)
assetsRouter.use(requireCsrf)

export const ASSET_CATEGORIES = ['Live Show', 'Festival', 'Nightlife', 'Corporate', 'Brand', 'BTS']

function isAssetUrl(value) {
  return value.startsWith('/') || /^https?:\/\//i.test(value)
}

function guessFileType(url) {
  const match = /\.([a-z0-9]{2,5})(?:\?|#|$)/i.exec(url)
  return match ? match[1].toUpperCase() : ''
}

function assetPayload(body, existing = null) {
  const title = cleanString(body.title ?? existing?.title, 180)
  const url = cleanString(body.url ?? existing?.url, 900)
  const category = cleanString(body.category ?? existing?.category ?? 'Live Show', 40)
  const tags = normalizeStringArray(body.tags ?? existing?.tags ?? [], 20, 60)
  const eventDate = cleanString(body.eventDate ?? existing?.eventDate, 10)
  const dimensions = cleanString(body.dimensions ?? existing?.dimensions, 40)
  const fileType = cleanString(body.fileType ?? existing?.fileType, 20) || guessFileType(url)
  const fileSize = cleanString(body.fileSize ?? existing?.fileSize, 40)
  const clientId = cleanString(body.clientId ?? existing?.clientId, 64)
  const favorite =
    body.favorite === undefined ? Boolean(existing?.favorite) : Boolean(body.favorite)
  const fields = {}

  if (title.length < 2) fields.title = 'Enter a title for this asset.'
  if (!url) {
    fields.url = 'Upload a file or enter an asset URL.'
  } else if (!isAssetUrl(url)) {
    fields.url = 'Use an uploaded URL or a full http(s) address.'
  }
  if (!ASSET_CATEGORIES.includes(category)) {
    fields.category = 'Choose one of the studio asset categories.'
  }
  if (eventDate && !isDate(eventDate)) fields.eventDate = 'Choose a valid event date.'
  if (clientId && !db.prepare('SELECT id FROM clients WHERE id = ?').get(clientId)) {
    fields.clientId = 'The selected client no longer exists.'
  }

  if (Object.keys(fields).length) {
    throw new ApiError(422, 'Please check the asset fields.', fields)
  }

  return {
    title,
    url,
    category,
    tags,
    eventDate: eventDate || null,
    dimensions,
    fileType,
    fileSize,
    clientId: clientId || null,
    favorite: favorite ? 1 : 0,
  }
}

assetsRouter.get(
  '/',
  asyncRoute(async (req, res) => {
    const category = cleanString(req.query.category, 40)
    const search = cleanString(req.query.q, 160)
    const favorite = req.query.favorite === 'true'
    const clauses = []
    const values = []
    if (category && category !== 'All') {
      if (!ASSET_CATEGORIES.includes(category)) throw new ApiError(422, 'Unknown asset category.')
      clauses.push('a.category = ?')
      values.push(category)
    }
    if (search) {
      const like = `%${search}%`
      clauses.push('(a.title LIKE ? OR a.tags LIKE ? OR a.dimensions LIKE ? OR c.company LIKE ?)')
      values.push(like, like, like, like)
    }
    if (favorite) clauses.push('a.favorite = 1')
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
    const rows = db
      .prepare(
        `SELECT a.*, c.company AS client_company
         FROM assets a
         LEFT JOIN clients c ON c.id = a.client_id
         ${where}
         ORDER BY a.favorite DESC, a.created_at DESC`,
      )
      .all(...values)

    const counts = {}
    for (const name of ASSET_CATEGORIES) {
      counts[name] = db
        .prepare('SELECT COUNT(*) AS count FROM assets WHERE category = ?')
        .get(name).count
    }
    res.json({
      assets: rows.map((row) => ({
        ...assetFromRow(row),
        clientCompany: row.client_company || null,
      })),
      counts: {
        total: db.prepare('SELECT COUNT(*) AS count FROM assets').get().count,
        favorites: db.prepare('SELECT COUNT(*) AS count FROM assets WHERE favorite = 1').get().count,
        ...counts,
      },
    })
  }),
)

assetsRouter.post(
  '/',
  asyncRoute(async (req, res) => {
    const payload = assetPayload(req.body || {})
    const id = randomUUID()
    const timestamp = timestamps.now()
    const asset = withTransaction(() => {
      db.prepare(`
        INSERT INTO assets
          (id, title, url, category, tags, event_date, dimensions, file_type, file_size,
           client_id, favorite, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        payload.title,
        payload.url,
        payload.category,
        JSON.stringify(payload.tags),
        payload.eventDate,
        payload.dimensions,
        payload.fileType,
        payload.fileSize,
        payload.clientId,
        payload.favorite,
        timestamp,
        timestamp,
      )
      logActivity(req, {
        action: 'asset.created',
        entityType: 'asset',
        entityId: id,
        description: `Added asset ${payload.title}`,
      })
      return assetFromRow(db.prepare('SELECT * FROM assets WHERE id = ?').get(id))
    })
    res.status(201).json({ asset })
  }),
)

assetsRouter.put(
  '/:id',
  asyncRoute(async (req, res) => {
    const existingRow = db.prepare('SELECT * FROM assets WHERE id = ?').get(req.params.id)
    if (!existingRow) throw new ApiError(404, 'Asset not found.')
    const payload = assetPayload(req.body || {}, assetFromRow(existingRow))
    const asset = withTransaction(() => {
      db.prepare(`
        UPDATE assets SET
          title = ?, url = ?, category = ?, tags = ?, event_date = ?, dimensions = ?,
          file_type = ?, file_size = ?, client_id = ?, favorite = ?, updated_at = ?
        WHERE id = ?
      `).run(
        payload.title,
        payload.url,
        payload.category,
        JSON.stringify(payload.tags),
        payload.eventDate,
        payload.dimensions,
        payload.fileType,
        payload.fileSize,
        payload.clientId,
        payload.favorite,
        timestamps.now(),
        req.params.id,
      )
      logActivity(req, {
        action: 'asset.updated',
        entityType: 'asset',
        entityId: req.params.id,
        description: `Updated asset ${payload.title}`,
      })
      return assetFromRow(db.prepare('SELECT * FROM assets WHERE id = ?').get(req.params.id))
    })
    res.json({ asset })
  }),
)

assetsRouter.patch(
  '/:id/favorite',
  asyncRoute(async (req, res) => {
    const existing = db.prepare('SELECT * FROM assets WHERE id = ?').get(req.params.id)
    if (!existing) throw new ApiError(404, 'Asset not found.')
    const favorite = req.body?.favorite === undefined ? !existing.favorite : Boolean(req.body.favorite)
    db.prepare('UPDATE assets SET favorite = ?, updated_at = ? WHERE id = ?').run(
      favorite ? 1 : 0,
      timestamps.now(),
      req.params.id,
    )
    res.json({
      asset: assetFromRow(db.prepare('SELECT * FROM assets WHERE id = ?').get(req.params.id)),
    })
  }),
)

assetsRouter.delete(
  '/:id',
  asyncRoute(async (req, res) => {
    const existing = db.prepare('SELECT * FROM assets WHERE id = ?').get(req.params.id)
    if (!existing) throw new ApiError(404, 'Asset not found.')
    withTransaction(() => {
      db.prepare('DELETE FROM assets WHERE id = ?').run(req.params.id)
      logActivity(req, {
        action: 'asset.deleted',
        entityType: 'asset',
        entityId: req.params.id,
        description: `Removed asset ${existing.title}`,
      })
    })
    res.json({ ok: true })
  }),
)

assetsRouter.get(
  '/:id',
  asyncRoute(async (req, res) => {
    const row = db.prepare('SELECT * FROM assets WHERE id = ?').get(req.params.id)
    if (!row) throw new ApiError(404, 'Asset not found.')
    const client = row.client_id
      ? clientFromRow(db.prepare('SELECT * FROM clients WHERE id = ?').get(row.client_id))
      : null
    res.json({ asset: assetFromRow(row), client })
  }),
)
