import { Router } from 'express'
import { db, timestamps, withTransaction } from '../db/database.js'
import { requireAdmin } from '../middleware/auth.js'
import { requireCsrf } from '../middleware/csrf.js'
import { logActivity } from '../lib/activity.js'
import { getSettingsRow, settingsFromRow } from '../lib/settings.js'
import { ApiError, asyncRoute, cleanString, isEmail, isPhone } from '../lib/validation.js'

export const settingsRouter = Router()
settingsRouter.use(requireAdmin)
settingsRouter.use(requireCsrf)

function isWebUrl(value) {
  if (!value) return true
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

function isAssetUrl(value) {
  return value.startsWith('/') || isWebUrl(value)
}

function settingsPayload(body, existing) {
  const studioName = cleanString(body.studioName ?? existing.studioName, 120)
  const tagline = cleanString(body.tagline ?? existing.tagline, 300)
  const email = cleanString(body.email ?? existing.email, 254).toLowerCase()
  const phone = cleanString(body.phone ?? existing.phone, 40)
  const address = cleanString(body.address ?? existing.address, 300)
  const city = cleanString(body.city ?? existing.city, 160)
  const gstin = cleanString(body.gstin ?? existing.gstin, 20).toUpperCase()
  const quotationNotes = cleanString(body.quotationNotes ?? existing.quotationNotes, 5000)
  const instagramUrl = cleanString(body.instagramUrl ?? existing.instagramUrl, 300)
  const linkedinUrl = cleanString(body.linkedinUrl ?? existing.linkedinUrl, 300)
  const logoUrl = cleanString(body.logoUrl ?? existing.logoUrl, 900)
  const rawRate = body.defaultGstRate ?? existing.defaultGstRate
  const defaultGstRate = Number(rawRate)
  const fields = {}

  if (studioName.length < 2) fields.studioName = 'Enter the studio name.'
  if (!isEmail(email)) fields.email = 'Enter the studio’s public email address.'
  if (!isPhone(phone)) fields.phone = 'Enter a valid phone number or leave it blank.'
  if (gstin && !/^[0-9A-Z]{15}$/.test(gstin)) {
    fields.gstin = 'A GSTIN must be 15 letters and digits, or left blank.'
  }
  if (!Number.isFinite(defaultGstRate) || defaultGstRate < 0 || defaultGstRate > 100) {
    fields.defaultGstRate = 'Default GST must be between 0 and 100 percent.'
  }
  if (!isWebUrl(instagramUrl)) fields.instagramUrl = 'Enter a full https:// address or leave it blank.'
  if (!isWebUrl(linkedinUrl)) fields.linkedinUrl = 'Enter a full https:// address or leave it blank.'
  if (!logoUrl) {
    fields.logoUrl = 'Provide a logo image URL.'
  } else if (!isAssetUrl(logoUrl)) {
    fields.logoUrl = 'Use an uploaded path or a full http(s) address.'
  }

  if (Object.keys(fields).length) {
    throw new ApiError(422, 'Please check the studio settings.', fields)
  }

  return {
    studioName,
    tagline,
    email,
    phone,
    address,
    city,
    gstin,
    defaultGstRateBps: Math.round(defaultGstRate * 100),
    quotationNotes,
    instagramUrl,
    linkedinUrl,
    logoUrl,
  }
}

settingsRouter.get(
  '/',
  asyncRoute(async (req, res) => {
    res.set('Cache-Control', 'no-store')
    res.json({ settings: settingsFromRow(getSettingsRow()) })
  }),
)

settingsRouter.put(
  '/',
  asyncRoute(async (req, res) => {
    const existing = settingsFromRow(getSettingsRow())
    if (!existing) throw new ApiError(500, 'Studio settings have not been initialised.')
    const payload = settingsPayload(req.body || {}, existing)
    withTransaction(() => {
      db.prepare(`
        UPDATE settings SET
          studio_name = ?, tagline = ?, email = ?, phone = ?, address = ?, city = ?,
          gstin = ?, currency = 'INR', default_gst_rate_bps = ?, quotation_notes = ?,
          instagram_url = ?, linkedin_url = ?, logo_url = ?, updated_at = ?
        WHERE id = 1
      `).run(
        payload.studioName,
        payload.tagline,
        payload.email,
        payload.phone,
        payload.address,
        payload.city,
        payload.gstin,
        payload.defaultGstRateBps,
        payload.quotationNotes,
        payload.instagramUrl,
        payload.linkedinUrl,
        payload.logoUrl,
        timestamps.now(),
      )
      logActivity(req, {
        action: 'settings.updated',
        entityType: 'settings',
        entityId: '1',
        description: 'Updated studio contact and quotation settings',
      })
    })
    res.json({ settings: settingsFromRow(getSettingsRow()) })
  }),
)
