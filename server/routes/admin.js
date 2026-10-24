import { Router } from 'express'
import multer from 'multer'
import { randomUUID } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { db, timestamps, withTransaction } from '../db/database.js'
import { requireAdmin } from '../middleware/auth.js'
import { requireCsrf } from '../middleware/csrf.js'
import { logActivity } from '../lib/activity.js'
import { enquiryFromRow, projectFromRow, serviceFromRow } from '../lib/serializers.js'
import {
  ApiError,
  asyncRoute,
  cleanString,
  isHttpUrl,
  isSlug,
  normalizeStringArray,
  uniqueSlug,
} from '../lib/validation.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const uploadsDirectory = path.resolve(__dirname, '..', 'uploads')
fs.mkdirSync(uploadsDirectory, { recursive: true })

const imageTypes = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
])

function hasValidImageSignature(filePath, mimeType) {
  const header = Buffer.alloc(12)
  let descriptor
  try {
    descriptor = fs.openSync(filePath, 'r')
    fs.readSync(descriptor, header, 0, header.length, 0)
  } catch {
    return false
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor)
  }

  if (mimeType === 'image/jpeg') {
    return header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff
  }
  if (mimeType === 'image/png') {
    return header.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  }
  if (mimeType === 'image/webp') {
    return (
      header.subarray(0, 4).toString('ascii') === 'RIFF' &&
      header.subarray(8, 12).toString('ascii') === 'WEBP'
    )
  }
  return false
}

export const adminRouter = Router()
adminRouter.use(requireAdmin)
adminRouter.use(requireCsrf)

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadsDirectory,
    filename: (req, file, callback) => {
      const extension = imageTypes.get(file.mimetype) || '.bin'
      callback(null, `${Date.now()}-${randomUUID()}${extension}`)
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, callback) => {
    if (!imageTypes.has(file.mimetype)) {
      callback(new ApiError(415, 'Upload a JPEG, PNG or WebP image.'))
      return
    }
    callback(null, true)
  },
})

adminRouter.post(
  '/uploads',
  upload.single('image'),
  asyncRoute(async (req, res) => {
    if (!req.file) throw new ApiError(400, 'Choose an image to upload.')
    if (!hasValidImageSignature(req.file.path, req.file.mimetype)) {
      try {
        fs.unlinkSync(req.file.path)
      } catch {
        // The file may already have been removed by the storage layer.
      }
      throw new ApiError(415, 'The uploaded file is not a valid JPEG, PNG or WebP image.')
    }
    res.status(201).json({
      upload: {
        url: `/uploads/${req.file.filename}`,
        filename: req.file.filename,
        size: req.file.size,
        mimeType: req.file.mimetype,
      },
    })
  }),
)

adminRouter.get(
  '/dashboard',
  asyncRoute(async (req, res) => {
    const projectCounts = db
      .prepare(`SELECT COUNT(*) AS total, COALESCE(SUM(status = 'published'), 0) AS published FROM projects`)
      .get()
    const serviceCounts = db
      .prepare(`SELECT COUNT(*) AS total, COALESCE(SUM(status = 'published'), 0) AS published FROM services`)
      .get()
    const enquiryCounts = db
      .prepare(
        `SELECT COUNT(*) AS total,
          COALESCE(SUM(status = 'Pending'), 0) AS pending,
          COALESCE(SUM(status = 'Contacted'), 0) AS contacted,
          COALESCE(SUM(status = 'Completed'), 0) AS completed
         FROM enquiries`,
      )
      .get()
    const clientCounts = db
      .prepare(
        `SELECT COUNT(*) AS total,
          COALESCE(SUM(status = 'Active'), 0) AS active,
          COALESCE(SUM(status = 'Prospect'), 0) AS prospects
         FROM clients`,
      )
      .get()
    const quotationCounts = db
      .prepare(
        `SELECT COUNT(*) AS total,
          COALESCE(SUM(CASE WHEN status IN ('Draft', 'Issued') THEN total_paise ELSE 0 END), 0) AS pipeline,
          COALESCE(SUM(CASE WHEN status = 'Accepted' THEN total_paise ELSE 0 END), 0) AS accepted
         FROM quotations`,
      )
      .get()
    const assetCount = db.prepare('SELECT COUNT(*) AS count FROM assets').get().count
    const teamCount = db
      .prepare(`SELECT COUNT(*) AS count FROM team_members WHERE status = 'Active'`)
      .get().count
    const recentEnquiries = db
      .prepare('SELECT * FROM enquiries ORDER BY created_at DESC LIMIT 5')
      .all()
      .map(enquiryFromRow)
    const recentProjects = db
      .prepare('SELECT * FROM projects ORDER BY updated_at DESC LIMIT 4')
      .all()
      .map(projectFromRow)

    res.json({
      counts: {
        projects: {
          total: Number(projectCounts.total),
          published: Number(projectCounts.published),
          drafts: Number(projectCounts.total) - Number(projectCounts.published),
        },
        services: {
          total: Number(serviceCounts.total),
          published: Number(serviceCounts.published),
          drafts: Number(serviceCounts.total) - Number(serviceCounts.published),
        },
        enquiries: {
          total: Number(enquiryCounts.total),
          pending: Number(enquiryCounts.pending),
          contacted: Number(enquiryCounts.contacted),
          completed: Number(enquiryCounts.completed),
        },
        clients: {
          total: Number(clientCounts.total),
          active: Number(clientCounts.active),
          prospects: Number(clientCounts.prospects),
        },
        quotations: {
          total: Number(quotationCounts.total),
          pipelinePaise: Number(quotationCounts.pipeline),
          acceptedPaise: Number(quotationCounts.accepted),
        },
        assets: { total: Number(assetCount) },
        team: { active: Number(teamCount) },
      },
      recentEnquiries,
      recentProjects,
      serverTime: timestamps.now(),
    })
  }),
)

function projectPayload(body, existing = null) {
  const title = cleanString(body.title ?? existing?.title, 160)
  const description = cleanString(body.description ?? existing?.description, 10000)
  const category = cleanString(body.category ?? existing?.category, 100) || 'Production'
  const cover = cleanString(body.cover ?? existing?.cover, 800)
  const client = cleanString(body.client ?? existing?.client, 160)
  const clientId = cleanString(body.clientId ?? existing?.clientId, 64)
  const location = cleanString(body.location ?? existing?.location, 160)
  const year = cleanString(body.year ?? existing?.year, 20)
  const accent = cleanString(body.accent ?? existing?.accent, 30)
  const legacyVideo = cleanString(body.videoUrl ?? existing?.videoUrl, 800)
  const videoSource = body.videos ?? existing?.videos
  const videos = normalizeStringArray(
    Array.isArray(videoSource) ? videoSource : legacyVideo ? [legacyVideo] : [],
    8,
    800,
  )
  const gallery = normalizeStringArray(body.gallery ?? existing?.gallery ?? [], 20, 800)
  const services = normalizeStringArray(body.services ?? existing?.services ?? [], 30, 120)
  const status = cleanString(body.status ?? existing?.status ?? 'draft', 20)
  const order = Number(body.order ?? existing?.order ?? 0)
  const fields = {}

  if (title.length < 2) fields.title = 'Enter a project title.'
  if (!cover) fields.cover = 'Upload or reference a cover image.'
  if (!['draft', 'published'].includes(status)) fields.status = 'Choose draft or published.'
  if (!Number.isFinite(order)) fields.order = 'Display order must be a number.'
  if (videos.some((url) => !isHttpUrl(url))) {
    fields.videos = 'Enter valid http or https video URLs.'
  }
  if (clientId && !db.prepare('SELECT id FROM clients WHERE id = ?').get(clientId)) {
    fields.clientId = 'The selected client no longer exists.'
  }

  let slug = cleanString(body.slug ?? existing?.slug ?? '', 90)
  if (!slug) {
    slug = uniqueSlug(title, (candidate) =>
      Boolean(db.prepare('SELECT id FROM projects WHERE slug = ?').get(candidate)),
    )
  } else if (!isSlug(slug)) {
    fields.slug = 'Use lowercase letters, numbers and hyphens.'
  }

  const conflict = db
    .prepare('SELECT id FROM projects WHERE slug = ? AND id <> ?')
    .get(slug, existing?.id ?? '')
  if (conflict) fields.slug = 'That slug is already in use.'

  if (Object.keys(fields).length) {
    throw new ApiError(422, 'Please check the project fields.', fields)
  }

  return {
    title,
    slug,
    description,
    category,
    cover,
    client: client || null,
    clientId: clientId || null,
    location: location || null,
    year: year || null,
    accent: accent || null,
    videos,
    videoUrl: videos[0] || null,
    gallery,
    services,
    status,
    order: Math.trunc(order),
  }
}

adminRouter.get(
  '/projects',
  asyncRoute(async (req, res) => {
    const rows = db
      .prepare('SELECT * FROM projects ORDER BY updated_at DESC, created_at DESC')
      .all()
    res.json({ projects: rows.map(projectFromRow) })
  }),
)

adminRouter.get(
  '/projects/:id',
  asyncRoute(async (req, res) => {
    const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id)
    if (!row) throw new ApiError(404, 'Project not found.')
    res.json({ project: projectFromRow(row) })
  }),
)

adminRouter.post(
  '/projects',
  asyncRoute(async (req, res) => {
    const existing = null
    const payload = projectPayload(req.body || {}, existing)
    const id = randomUUID()
    const timestamp = timestamps.now()
    const project = withTransaction(() => {
      db.prepare(`
        INSERT INTO projects
          (id, slug, title, description, category, cover, gallery, video_url, videos, client, client_id, location, year, services, sort_order, status, demo, accent, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)
      `).run(
        id,
        payload.slug,
        payload.title,
        payload.description,
        payload.category,
        payload.cover,
        JSON.stringify(payload.gallery),
        payload.videoUrl,
        JSON.stringify(payload.videos),
        payload.client,
        payload.clientId,
        payload.location,
        payload.year,
        JSON.stringify(payload.services),
        payload.order,
        payload.status,
        payload.accent,
        timestamp,
        timestamp,
      )
      logActivity(req, {
        action: 'project.created',
        entityType: 'project',
        entityId: id,
        description: `Created project ${payload.title}`,
      })
      return projectFromRow(db.prepare('SELECT * FROM projects WHERE id = ?').get(id))
    })
    res.status(201).json({ project })
  }),
)

adminRouter.put(
  '/projects/:id',
  asyncRoute(async (req, res) => {
    const existing = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id)
    if (!existing) throw new ApiError(404, 'Project not found.')
    const current = projectFromRow(existing)
    const payload = projectPayload(req.body || {}, current)
    const timestamp = timestamps.now()
    const project = withTransaction(() => {
      db.prepare(`
        UPDATE projects SET
          slug = ?, title = ?, description = ?, category = ?, cover = ?, gallery = ?,
          video_url = ?, videos = ?, client = ?, client_id = ?, location = ?, year = ?, services = ?,
          sort_order = ?, status = ?, accent = ?, updated_at = ?
        WHERE id = ?
      `).run(
        payload.slug,
        payload.title,
        payload.description,
        payload.category,
        payload.cover,
        JSON.stringify(payload.gallery),
        payload.videoUrl,
        JSON.stringify(payload.videos),
        payload.client,
        payload.clientId,
        payload.location,
        payload.year,
        JSON.stringify(payload.services),
        payload.order,
        payload.status,
        payload.accent,
        timestamp,
        req.params.id,
      )
      logActivity(req, {
        action: 'project.updated',
        entityType: 'project',
        entityId: req.params.id,
        description: `Updated project ${payload.title}`,
      })
      return projectFromRow(db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id))
    })
    res.json({ project })
  }),
)

adminRouter.patch(
  '/projects/:id/status',
  asyncRoute(async (req, res) => {
    const status = cleanString(req.body?.status, 20)
    if (!['draft', 'published'].includes(status)) {
      throw new ApiError(422, 'Status must be draft or published.')
    }
    const existing = db.prepare('SELECT id, title FROM projects WHERE id = ?').get(req.params.id)
    if (!existing) throw new ApiError(404, 'Project not found.')
    withTransaction(() => {
      db.prepare('UPDATE projects SET status = ?, updated_at = ? WHERE id = ?').run(
        status,
        timestamps.now(),
        req.params.id,
      )
      logActivity(req, {
        action: `project.${status}`,
        entityType: 'project',
        entityId: req.params.id,
        description: `Set project ${existing.title} to ${status}`,
      })
    })
    const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id)
    res.json({ project: projectFromRow(row) })
  }),
)

adminRouter.delete(
  '/projects/:id',
  asyncRoute(async (req, res) => {
    const existing = db.prepare('SELECT title FROM projects WHERE id = ?').get(req.params.id)
    if (!existing) throw new ApiError(404, 'Project not found.')
    withTransaction(() => {
      db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id)
      logActivity(req, {
        action: 'project.deleted',
        entityType: 'project',
        entityId: req.params.id,
        description: `Deleted project ${existing.title}`,
      })
    })
    res.json({ ok: true })
  }),
)

function servicePayload(body, existing = null) {
  const title = cleanString(body.title ?? existing?.title, 160)
  const short = cleanString(body.short ?? existing?.short, 300)
  const description = cleanString(body.description ?? existing?.description, 10000)
  const image = cleanString(body.image ?? existing?.image, 800)
  const startingAt = cleanString(body.startingAt ?? existing?.startingAt, 100)
  const deliverables = normalizeStringArray(body.deliverables ?? existing?.deliverables ?? [], 20, 160)
  const status = cleanString(body.status ?? existing?.status ?? 'draft', 20)
  const order = Number(body.order ?? existing?.order ?? 0)
  const fields = {}

  if (title.length < 2) fields.title = 'Enter a service title.'
  if (!image) fields.image = 'Upload or reference a service image.'
  if (!['draft', 'published'].includes(status)) fields.status = 'Choose draft or published.'
  if (!Number.isFinite(order)) fields.order = 'Display order must be a number.'

  let slug = cleanString(body.slug ?? existing?.slug ?? '', 90)
  if (!slug) {
    slug = uniqueSlug(title, (candidate) =>
      Boolean(db.prepare('SELECT id FROM services WHERE slug = ?').get(candidate)),
    )
  } else if (!isSlug(slug)) {
    fields.slug = 'Use lowercase letters, numbers and hyphens.'
  }

  const conflict = db
    .prepare('SELECT id FROM services WHERE slug = ? AND id <> ?')
    .get(slug, existing?.id ?? '')
  if (conflict) fields.slug = 'That slug is already in use.'

  if (Object.keys(fields).length) {
    throw new ApiError(422, 'Please check the service fields.', fields)
  }

  return {
    title,
    slug,
    short,
    description,
    image,
    startingAt,
    deliverables,
    status,
    order: Math.trunc(order),
  }
}

adminRouter.get(
  '/services',
  asyncRoute(async (req, res) => {
    const rows = db
      .prepare('SELECT * FROM services ORDER BY sort_order ASC, created_at ASC')
      .all()
    res.json({ services: rows.map(serviceFromRow) })
  }),
)

adminRouter.post(
  '/services',
  asyncRoute(async (req, res) => {
    const payload = servicePayload(req.body || {})
    const id = randomUUID()
    const timestamp = timestamps.now()
    const service = withTransaction(() => {
      db.prepare(`
        INSERT INTO services
          (id, slug, title, short, description, image, deliverables, starting_at, sort_order, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        payload.slug,
        payload.title,
        payload.short,
        payload.description,
        payload.image,
        JSON.stringify(payload.deliverables),
        payload.startingAt,
        payload.order,
        payload.status,
        timestamp,
        timestamp,
      )
      logActivity(req, {
        action: 'service.created',
        entityType: 'service',
        entityId: id,
        description: `Created service ${payload.title}`,
      })
      return serviceFromRow(db.prepare('SELECT * FROM services WHERE id = ?').get(id))
    })
    res.status(201).json({ service })
  }),
)

adminRouter.put(
  '/services/:id',
  asyncRoute(async (req, res) => {
    const existing = db.prepare('SELECT * FROM services WHERE id = ?').get(req.params.id)
    if (!existing) throw new ApiError(404, 'Service not found.')
    const current = serviceFromRow(existing)
    const payload = servicePayload(req.body || {}, current)
    const service = withTransaction(() => {
      db.prepare(`
        UPDATE services SET
          slug = ?, title = ?, short = ?, description = ?, image = ?,
          deliverables = ?, starting_at = ?, sort_order = ?, status = ?, updated_at = ?
        WHERE id = ?
      `).run(
        payload.slug,
        payload.title,
        payload.short,
        payload.description,
        payload.image,
        JSON.stringify(payload.deliverables),
        payload.startingAt,
        payload.order,
        payload.status,
        timestamps.now(),
        req.params.id,
      )
      logActivity(req, {
        action: 'service.updated',
        entityType: 'service',
        entityId: req.params.id,
        description: `Updated service ${payload.title}`,
      })
      return serviceFromRow(db.prepare('SELECT * FROM services WHERE id = ?').get(req.params.id))
    })
    res.json({ service })
  }),
)

adminRouter.patch(
  '/services/:id/status',
  asyncRoute(async (req, res) => {
    const status = cleanString(req.body?.status, 20)
    if (!['draft', 'published'].includes(status)) {
      throw new ApiError(422, 'Status must be draft or published.')
    }
    const existing = db.prepare('SELECT id, title FROM services WHERE id = ?').get(req.params.id)
    if (!existing) throw new ApiError(404, 'Service not found.')
    withTransaction(() => {
      db.prepare('UPDATE services SET status = ?, updated_at = ? WHERE id = ?').run(
        status,
        timestamps.now(),
        req.params.id,
      )
      logActivity(req, {
        action: `service.${status}`,
        entityType: 'service',
        entityId: req.params.id,
        description: `Set service ${existing.title} to ${status}`,
      })
    })
    const row = db.prepare('SELECT * FROM services WHERE id = ?').get(req.params.id)
    res.json({ service: serviceFromRow(row) })
  }),
)

adminRouter.delete(
  '/services/:id',
  asyncRoute(async (req, res) => {
    const existing = db.prepare('SELECT title FROM services WHERE id = ?').get(req.params.id)
    if (!existing) throw new ApiError(404, 'Service not found.')
    withTransaction(() => {
      db.prepare('DELETE FROM services WHERE id = ?').run(req.params.id)
      logActivity(req, {
        action: 'service.deleted',
        entityType: 'service',
        entityId: req.params.id,
        description: `Deleted service ${existing.title}`,
      })
    })
    res.json({ ok: true })
  }),
)

adminRouter.get(
  '/enquiries',
  asyncRoute(async (req, res) => {
    const status = cleanString(req.query.status, 20)
    const search = cleanString(req.query.q, 120)
    const allowed = ['Pending', 'Contacted', 'Completed', 'Archived']
    const clauses = []
    const values = []
    if (status && status !== 'All') {
      if (!allowed.includes(status)) throw new ApiError(422, 'Unknown enquiry status.')
      clauses.push('status = ?')
      values.push(status)
    }
    if (search) {
      clauses.push('(name LIKE ? OR email LIKE ? OR company LIKE ? OR event_type LIKE ? OR message LIKE ?)')
      const like = `%${search}%`
      values.push(like, like, like, like, like)
    }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
    const rows = db
      .prepare(`SELECT * FROM enquiries ${where} ORDER BY created_at DESC`)
      .all(...values)
    res.json({
      enquiries: rows.map(enquiryFromRow),
      counts: {
        total: db.prepare('SELECT COUNT(*) AS count FROM enquiries').get().count,
        pending: db.prepare(`SELECT COUNT(*) AS count FROM enquiries WHERE status = 'Pending'`).get().count,
      },
    })
  }),
)

adminRouter.get(
  '/enquiries/:id',
  asyncRoute(async (req, res) => {
    const row = db.prepare('SELECT * FROM enquiries WHERE id = ?').get(req.params.id)
    if (!row) throw new ApiError(404, 'Enquiry not found.')
    res.json({ enquiry: enquiryFromRow(row) })
  }),
)

adminRouter.patch(
  '/enquiries/:id',
  asyncRoute(async (req, res) => {
    const existing = db.prepare('SELECT * FROM enquiries WHERE id = ?').get(req.params.id)
    if (!existing) throw new ApiError(404, 'Enquiry not found.')
    const allowed = ['Pending', 'Contacted', 'Completed', 'Archived']
    const fields = {}
    let status = existing.status
    let notes = existing.notes
    if (req.body?.status !== undefined) {
      status = cleanString(req.body.status, 20)
      if (!allowed.includes(status)) fields.status = 'Choose a valid enquiry status.'
    }
    if (req.body?.notes !== undefined) {
      notes = cleanString(req.body.notes, 5000)
    }
    if (Object.keys(fields).length) throw new ApiError(422, 'Please check the enquiry fields.', fields)
    withTransaction(() => {
      db.prepare('UPDATE enquiries SET status = ?, notes = ?, updated_at = ? WHERE id = ?').run(
        status,
        notes,
        timestamps.now(),
        req.params.id,
      )
      if (status !== existing.status) {
        logActivity(req, {
          action: `enquiry.${status.toLowerCase()}`,
          entityType: 'enquiry',
          entityId: req.params.id,
          description: `Moved enquiry from ${existing.name} to ${status}`,
        })
      } else if (notes !== existing.notes) {
        logActivity(req, {
          action: 'enquiry.notes_updated',
          entityType: 'enquiry',
          entityId: req.params.id,
          description: `Updated internal notes for ${existing.name}`,
        })
      }
    })
    const row = db.prepare('SELECT * FROM enquiries WHERE id = ?').get(req.params.id)
    res.json({ enquiry: enquiryFromRow(row) })
  }),
)

adminRouter.patch(
  '/enquiries/:id/client',
  asyncRoute(async (req, res) => {
    const existing = db.prepare('SELECT * FROM enquiries WHERE id = ?').get(req.params.id)
    if (!existing) throw new ApiError(404, 'Enquiry not found.')
    const clientId = cleanString(req.body?.clientId, 64)
    let client = null
    if (clientId) {
      client = db.prepare('SELECT * FROM clients WHERE id = ?').get(clientId)
      if (!client) throw new ApiError(422, 'The selected client no longer exists.', {
        clientId: 'Choose an existing client.',
      })
    }
    withTransaction(() => {
      db.prepare('UPDATE enquiries SET client_id = ?, updated_at = ? WHERE id = ?').run(
        clientId || null,
        timestamps.now(),
        req.params.id,
      )
      logActivity(req, {
        action: clientId ? 'enquiry.client_linked' : 'enquiry.client_unlinked',
        entityType: 'enquiry',
        entityId: req.params.id,
        description: client
          ? `Linked enquiry from ${existing.name} to ${client.company}`
          : `Unlinked enquiry from ${existing.name} from its client record`,
      })
    })
    const row = db.prepare('SELECT * FROM enquiries WHERE id = ?').get(req.params.id)
    res.json({ enquiry: enquiryFromRow(row), client: client ? { id: client.id, company: client.company } : null })
  }),
)

adminRouter.delete(
  '/enquiries/:id',
  asyncRoute(async (req, res) => {
    const existing = db.prepare('SELECT name FROM enquiries WHERE id = ?').get(req.params.id)
    if (!existing) throw new ApiError(404, 'Enquiry not found.')
    withTransaction(() => {
      db.prepare('DELETE FROM enquiries WHERE id = ?').run(req.params.id)
      logActivity(req, {
        action: 'enquiry.deleted',
        entityType: 'enquiry',
        entityId: req.params.id,
        description: `Deleted enquiry from ${existing.name}`,
      })
    })
    res.json({ ok: true })
  }),
)
