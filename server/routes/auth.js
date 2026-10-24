import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import bcrypt from 'bcryptjs'
import { db, timestamps } from '../db/database.js'
import { clearSession, issueSession, publicAdmin } from '../middleware/auth.js'
import { clearCsrfToken, issueCsrfToken } from '../middleware/csrf.js'
import { ApiError, asyncRoute } from '../lib/validation.js'

export const authRouter = Router()

const loginLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { message: 'Too many sign-in attempts. Please wait and try again.' } },
})

authRouter.post(
  '/login',
  loginLimit,
  asyncRoute(async (req, res) => {
    const email = String(req.body?.email || '').trim().toLowerCase()
    const password = String(req.body?.password || '')
    if (!email || !password) {
      throw new ApiError(400, 'Enter your email and password.')
    }

    const admin = db
      .prepare('SELECT * FROM admins WHERE email = ? AND is_active = 1')
      .get(email)
    const valid = admin ? await bcrypt.compare(password, admin.password_hash) : false
    if (!admin || !valid) {
      throw new ApiError(401, 'Email or password is incorrect.')
    }

    const timestamp = timestamps.now()
    db.prepare('UPDATE admins SET last_login_at = ?, updated_at = ? WHERE id = ?').run(
      timestamp,
      timestamp,
      admin.id,
    )
    issueSession(res, admin)
    const csrfToken = issueCsrfToken(req, res)
    res.set('Cache-Control', 'no-store')
    res.json({
      user: {
        id: String(admin.id),
        name: admin.name,
        email: admin.email,
        role: admin.role,
        lastLoginAt: timestamp,
      },
      csrfToken,
    })
  }),
)

authRouter.post('/logout', (req, res) => {
  clearSession(res)
  clearCsrfToken(res)
  res.set('Cache-Control', 'no-store')
  res.json({ ok: true })
})

authRouter.get('/me', publicAdmin())
