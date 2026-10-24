import { Router } from 'express'
import { db } from '../db/database.js'
import { requireAdmin } from '../middleware/auth.js'
import { requireCsrf } from '../middleware/csrf.js'
import { activityFromRow } from '../lib/serializers.js'
import { asyncRoute } from '../lib/validation.js'

export const analyticsRouter = Router()
analyticsRouter.use(requireAdmin)
analyticsRouter.use(requireCsrf)

function monthKeys(count = 6) {
  const keys = []
  const cursor = new Date()
  cursor.setUTCDate(1)
  cursor.setUTCHours(0, 0, 0, 0)
  for (let index = count - 1; index >= 0; index -= 1) {
    const date = new Date(cursor)
    date.setUTCMonth(cursor.getUTCMonth() - index)
    keys.push({
      key: date.toISOString().slice(0, 7),
      label: new Intl.DateTimeFormat('en-IN', { month: 'short' }).format(date),
    })
  }
  return keys
}

function totals() {
  const projects = db
    .prepare(
      `SELECT COUNT(*) AS total, COALESCE(SUM(status = 'published'), 0) AS published FROM projects`,
    )
    .get()
  const services = db
    .prepare(
      `SELECT COUNT(*) AS total, COALESCE(SUM(status = 'published'), 0) AS published FROM services`,
    )
    .get()
  const enquiries = db.prepare('SELECT COUNT(*) AS total FROM enquiries').get()
  const clients = db.prepare('SELECT COUNT(*) AS total FROM clients').get()
  const assets = db.prepare('SELECT COUNT(*) AS total FROM assets').get()
  const quotes = db
    .prepare(
      `SELECT COUNT(*) AS total,
        COALESCE(SUM(CASE WHEN status IN ('Draft', 'Issued') THEN total_paise ELSE 0 END), 0) AS pipeline,
        COALESCE(SUM(CASE WHEN status = 'Accepted' THEN total_paise ELSE 0 END), 0) AS accepted
       FROM quotations`,
    )
    .get()
  return {
    projects: { total: Number(projects.total), published: Number(projects.published) },
    services: { total: Number(services.total), published: Number(services.published) },
    enquiries: Number(enquiries.total),
    clients: Number(clients.total),
    assets: Number(assets.total),
    quotations: {
      total: Number(quotes.total),
      pipelinePaise: Number(quotes.pipeline),
      acceptedPaise: Number(quotes.accepted),
    },
  }
}

analyticsRouter.get(
  '/',
  asyncRoute(async (req, res) => {
    const keys = monthKeys(6)
    const start = `${keys[0].key}-01T00:00:00.000Z`

    const enquiryRows = db
      .prepare(
        `SELECT substr(created_at, 1, 7) AS month, COUNT(*) AS count
         FROM enquiries WHERE created_at >= ? GROUP BY month`,
      )
      .all(start)
    const quoteRows = db
      .prepare(
        `SELECT substr(created_at, 1, 7) AS month, COUNT(*) AS count,
                COALESCE(SUM(total_paise), 0) AS value,
                COALESCE(SUM(status = 'Accepted'), 0) AS accepted
         FROM quotations WHERE created_at >= ? GROUP BY month`,
      )
      .all(start)
    const enquiryByMonth = new Map(enquiryRows.map((row) => [row.month, row]))
    const quoteByMonth = new Map(quoteRows.map((row) => [row.month, row]))

    const statusRows = db
      .prepare(
        `SELECT status, COUNT(*) AS count, COALESCE(SUM(total_paise), 0) AS value
         FROM quotations GROUP BY status`,
      )
      .all()
    const statusOrder = ['Draft', 'Issued', 'Accepted', 'Rejected', 'Expired', 'Cancelled']
    const statusMap = new Map(statusRows.map((row) => [row.status, row]))
    const quotationStatus = statusOrder.map((status) => ({
      status,
      count: Number(statusMap.get(status)?.count ?? 0),
      valuePaise: Number(statusMap.get(status)?.value ?? 0),
    }))

    const clientStatusRows = db
      .prepare('SELECT status, COUNT(*) AS count FROM clients GROUP BY status')
      .all()
    const clientStatusMap = new Map(clientStatusRows.map((row) => [row.status, row.count]))

    const topClients = db
      .prepare(
        `SELECT c.id, c.company, c.contact_name AS contactName, c.status,
                COUNT(q.id) AS quoteCount,
                COALESCE(SUM(CASE WHEN q.status IN ('Draft', 'Issued') THEN q.total_paise ELSE 0 END), 0) AS pipelinePaise,
                COALESCE(SUM(CASE WHEN q.status = 'Accepted' THEN q.total_paise ELSE 0 END), 0) AS acceptedPaise
         FROM clients c
         LEFT JOIN quotations q ON q.client_id = c.id
         GROUP BY c.id
         HAVING quoteCount > 0
         ORDER BY acceptedPaise DESC, pipelinePaise DESC, c.company ASC
         LIMIT 6`,
      )
      .all()
      .map((row) => ({
        id: row.id,
        company: row.company,
        contactName: row.contactName,
        status: row.status,
        quoteCount: Number(row.quoteCount),
        pipelinePaise: Number(row.pipelinePaise),
        acceptedPaise: Number(row.acceptedPaise),
      }))

    const serviceInterest = new Map()
    for (const row of db.prepare('SELECT services FROM enquiries').all()) {
      try {
        const services = JSON.parse(row.services)
        if (!Array.isArray(services)) continue
        for (const service of services) {
          if (typeof service !== 'string' || !service.trim()) continue
          serviceInterest.set(service, (serviceInterest.get(service) ?? 0) + 1)
        }
      } catch {
        // Ignore legacy or malformed rows; analytics must not fail on one record.
      }
    }
    const requestedServices = Array.from(serviceInterest.entries())
      .map(([service, count]) => ({ service, count }))
      .sort((left, right) => right.count - left.count)
      .slice(0, 8)

    const accepted = quotationStatus.find((row) => row.status === 'Accepted')?.count ?? 0
    const rejected =
      (quotationStatus.find((row) => row.status === 'Rejected')?.count ?? 0) +
      (quotationStatus.find((row) => row.status === 'Expired')?.count ?? 0)
    const decided = accepted + rejected

    const recentActivity = db
      .prepare('SELECT * FROM activity_log ORDER BY created_at DESC LIMIT 8')
      .all()
      .map(activityFromRow)

    res.set('Cache-Control', 'no-store')
    res.json({
      totals: totals(),
      monthly: keys.map(({ key, label }) => ({
        month: key,
        label,
        enquiries: Number(enquiryByMonth.get(key)?.count ?? 0),
        quotations: Number(quoteByMonth.get(key)?.count ?? 0),
        quotedPaise: Number(quoteByMonth.get(key)?.value ?? 0),
        accepted: Number(quoteByMonth.get(key)?.accepted ?? 0),
      })),
      quotationStatus,
      clientsByStatus: {
        active: Number(clientStatusMap.get('Active') ?? 0),
        prospect: Number(clientStatusMap.get('Prospect') ?? 0),
        past: Number(clientStatusMap.get('Past') ?? 0),
      },
      topClients,
      requestedServices,
      conversion: {
        enquiries: Number(db.prepare('SELECT COUNT(*) AS count FROM enquiries').get().count),
        linkedEnquiries: Number(
          db.prepare('SELECT COUNT(*) AS count FROM enquiries WHERE client_id IS NOT NULL').get()
            .count,
        ),
        quotations: quotationStatus.reduce((sum, row) => sum + row.count, 0),
        accepted,
        decided,
        winRate: decided > 0 ? Math.round((accepted / decided) * 1000) / 10 : null,
      },
      recentActivity,
      generatedAt: new Date().toISOString(),
    })
  }),
)
