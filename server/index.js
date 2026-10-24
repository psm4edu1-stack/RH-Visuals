import express from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import helmet from 'helmet'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import multer from 'multer'
import { databasePath, db, initializeDatabase } from './db/database.js'
import { authRouter } from './routes/auth.js'
import { publicRouter } from './routes/public.js'
import { adminRouter } from './routes/admin.js'
import { clientsRouter } from './routes/clients.js'
import { quotationsRouter } from './routes/quotations.js'
import { assetsRouter } from './routes/assets.js'
import { teamRouter } from './routes/team.js'
import { settingsRouter } from './routes/settings.js'
import { analyticsRouter } from './routes/analytics.js'
import { activityRouter } from './routes/activity.js'
import { ApiError } from './lib/validation.js'
import { chatStatus } from './lib/chat.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')
const uploadsDirectory = path.join(__dirname, 'uploads')
const distDirectory = path.join(projectRoot, 'dist')
const port = Number(process.env.PORT || 8787)

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('[api] JWT_SECRET must be set to a random value of at least 32 characters.')
  process.exit(1)
}

initializeDatabase()

const app = express()
if (process.env.TRUST_PROXY === 'true') app.set('trust proxy', 1)

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
)
app.use(
  cors((req, callback) => {
    const origin = req.headers.origin
    let allowed = !origin || allowedOrigins.includes(origin)

    // The production build is served by this same server. Browsers can include
    // an Origin header even for same-origin module/style requests, so allow the
    // request host itself instead of rejecting the app's own assets.
    if (!allowed && origin) {
      try {
        allowed = new URL(origin).host === req.headers.host
      } catch {
        allowed = false
      }
    }

    callback(null, { origin: allowed, credentials: true })
  }),
)
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: false, limit: '1mb' }))
app.use(cookieParser())
app.use('/uploads', express.static(uploadsDirectory, { maxAge: '7d', fallthrough: true }))

app.get('/api/health', (req, res) => {
  let database = 'ok'
  try {
    db.prepare('SELECT 1 AS ok').get()
  } catch {
    database = 'unavailable'
  }
  res.status(database === 'ok' ? 200 : 503).json({
    ok: database === 'ok',
    database,
    databasePath,
    chat: chatStatus(),
    time: new Date().toISOString(),
  })
})

app.use('/api/auth', authRouter)
app.use('/api/public', publicRouter)
app.use('/api/admin/clients', clientsRouter)
app.use('/api/admin/quotations', quotationsRouter)
app.use('/api/admin/assets', assetsRouter)
app.use('/api/admin/team', teamRouter)
app.use('/api/admin/settings', settingsRouter)
app.use('/api/admin/analytics', analyticsRouter)
app.use('/api/admin/activity', activityRouter)
app.use('/api/admin', adminRouter)

app.use('/api', (req, res) => {
  res.status(404).json({ error: { message: 'API route not found.' } })
})

if (fs.existsSync(distDirectory)) {
  app.use(express.static(distDirectory, { index: false, maxAge: '1h' }))
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      next()
      return
    }
    res.sendFile(path.join(distDirectory, 'index.html'))
  })
}

app.use((req, res) => {
  res.status(404).json({ error: { message: 'Not found.' } })
})

app.use((error, req, res, next) => {
  if (res.headersSent) {
    next(error)
    return
  }
  if (error instanceof ApiError) {
    res.status(error.status).json({
      error: {
        message: error.message,
        ...(error.fields ? { fields: error.fields } : {}),
      },
    })
    return
  }
  if (error instanceof multer.MulterError) {
    const message =
      error.code === 'LIMIT_FILE_SIZE'
        ? 'The image must be 5 MB or smaller.'
        : 'The image upload could not be completed.'
    res.status(413).json({ error: { message } })
    return
  }
  if (error?.type === 'entity.parse.failed') {
    res.status(400).json({ error: { message: 'The request body is not valid JSON.' } })
    return
  }
  console.error('[api] Unhandled error:', error?.message || error)
  res.status(500).json({
    error: { message: 'The studio service encountered an unexpected error.' },
  })
})

const server = app.listen(port, () => {
  console.log(`[api] RH VISUALS API listening on http://localhost:${port}`)
  console.log(`[api] Database: ${databasePath}`)
  console.log(`[api] Chat mode: ${chatStatus().mode}`)
  if (fs.existsSync(distDirectory)) console.log('[api] Serving production frontend from dist/')
})

server.on('error', (error) => {
  if (error?.code === 'EADDRINUSE') {
    console.error(
      `[api] Port ${port} is already in use. RH VISUALS may already be running at http://localhost:${port}. Stop the existing backend before starting another.`,
    )
    process.exit(1)
  }
  console.error('[api] Server failed to start:', error?.message || error)
  process.exit(1)
})

function shutdown() {
  server.close(() => {
    try {
      db.close()
    } catch {
      // Nothing else to close.
    }
    process.exit(0)
  })
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
