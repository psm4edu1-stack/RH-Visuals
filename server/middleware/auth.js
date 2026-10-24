import jwt from 'jsonwebtoken'
import { db } from '../db/database.js'
import { issueCsrfToken } from './csrf.js'

const COOKIE_NAME = 'rhv_session'

function jwtSecret() {
  const secret = process.env.JWT_SECRET
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET must be set to a random value of at least 32 characters.')
  }
  return secret
}

export function issueSession(res, admin) {
  const hours = Math.max(1, Number(process.env.SESSION_HOURS || 8))
  const token = jwt.sign(
    {
      sub: String(admin.id),
      email: admin.email,
      name: admin.name,
      role: admin.role,
    },
    jwtSecret(),
    { expiresIn: `${hours}h` },
  )
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.COOKIE_SECURE === 'true',
    maxAge: hours * 60 * 60 * 1000,
    path: '/',
  })
}

export function clearSession(res) {
  res.clearCookie(COOKIE_NAME, { path: '/' })
}

function readToken(req) {
  const token = req.cookies?.[COOKIE_NAME]
  if (!token) return null
  try {
    return jwt.verify(token, jwtSecret())
  } catch {
    return null
  }
}

export function optionalAdmin(req) {
  const payload = readToken(req)
  if (!payload?.sub) return null
  const admin = db
    .prepare('SELECT id, name, email, role, is_active FROM admins WHERE id = ?')
    .get(Number(payload.sub))
  if (!admin || !admin.is_active) return null
  return {
    id: String(admin.id),
    name: admin.name,
    email: admin.email,
    role: admin.role,
  }
}

export function requireAdmin(req, res, next) {
  const admin = optionalAdmin(req)
  if (!admin) {
    return res.status(401).json({
      error: { message: 'Authentication required. Please sign in again.' },
    })
  }
  req.admin = admin
  next()
}

export function publicAdmin(admin) {
  return (req, res) => {
    const current = optionalAdmin(req)
    if (!current) {
      return res.status(401).json({
        error: { message: 'No active studio session.' },
      })
    }
    const record = db
      .prepare('SELECT last_login_at, created_at FROM admins WHERE id = ?')
      .get(Number(current.id))
    const csrfToken = issueCsrfToken(req, res)
    res.set('Cache-Control', 'no-store')
    res.json({
      user: {
        ...current,
        lastLoginAt: record?.last_login_at ?? null,
        createdAt: record?.created_at ?? null,
      },
      csrfToken,
    })
  }
}
