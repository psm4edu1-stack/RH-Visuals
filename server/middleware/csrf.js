import { randomBytes, timingSafeEqual } from 'node:crypto'

export const CSRF_COOKIE = 'rhv_csrf'
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

function cookieOptions() {
  return {
    httpOnly: false,
    sameSite: 'lax',
    secure: process.env.COOKIE_SECURE === 'true',
    path: '/',
    maxAge: 8 * 60 * 60 * 1000,
  }
}

export function issueCsrfToken(req, res) {
  let token = req.cookies?.[CSRF_COOKIE]
  if (!token || token.length < 32) {
    token = randomBytes(32).toString('hex')
    res.cookie(CSRF_COOKIE, token, cookieOptions())
  }
  return token
}

export function clearCsrfToken(res) {
  res.clearCookie(CSRF_COOKIE, {
    httpOnly: false,
    sameSite: 'lax',
    secure: process.env.COOKIE_SECURE === 'true',
    path: '/',
  })
}

function tokensMatch(left, right) {
  if (typeof left !== 'string' || typeof right !== 'string') return false
  const a = Buffer.from(left)
  const b = Buffer.from(right)
  return a.length === b.length && timingSafeEqual(a, b)
}

export function requireCsrf(req, res, next) {
  if (SAFE_METHODS.has(req.method)) {
    next()
    return
  }

  const cookieToken = req.cookies?.[CSRF_COOKIE]
  const headerToken = req.get('x-csrf-token')
  if (!tokensMatch(cookieToken, headerToken)) {
    res.status(403).json({
      error: {
        message: 'Your security token is missing or expired. Refresh the page and try again.',
      },
    })
    return
  }
  next()
}
