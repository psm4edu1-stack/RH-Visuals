import { db } from '../db/database.js'

export function getSettingsRow() {
  return db.prepare('SELECT * FROM settings WHERE id = 1').get()
}

export function settingsFromRow(row) {
  if (!row) return null
  return {
    studioName: row.studio_name,
    tagline: row.tagline,
    email: row.email,
    phone: row.phone,
    address: row.address,
    city: row.city,
    gstin: row.gstin,
    currency: row.currency,
    defaultGstRate: row.default_gst_rate_bps / 100,
    quotationNotes: row.quotation_notes,
    instagramUrl: row.instagram_url,
    linkedinUrl: row.linkedin_url,
    logoUrl: row.logo_url,
    updatedAt: row.updated_at,
  }
}

export function getAdminSettings() {
  return settingsFromRow(getSettingsRow())
}

export function getPublicSettings() {
  const settings = getAdminSettings()
  if (!settings) {
    return {
      studioName: 'RH VISUALS',
      tagline: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      instagramUrl: '',
      linkedinUrl: '',
      logoUrl: '/rh-visuals-logo-light.png',
    }
  }
  return {
    studioName: settings.studioName,
    tagline: settings.tagline,
    email: settings.email,
    phone: settings.phone,
    address: settings.address,
    city: settings.city,
    instagramUrl: settings.instagramUrl,
    linkedinUrl: settings.linkedinUrl,
    logoUrl: settings.logoUrl,
  }
}
