import { parseJson } from './validation.js'

export function projectFromRow(row) {
  if (!row) return null
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    category: row.category,
    cover: row.cover,
    gallery: parseJson(row.gallery, []),
    videos: parseJson(
      row.videos,
      row.video_url ? [row.video_url] : [],
    ),
    videoUrl: row.video_url || null,
    client: row.client || null,
    clientId: row.client_id || null,
    location: row.location || null,
    year: row.year || null,
    services: parseJson(row.services, []),
    order: row.sort_order,
    status: row.status,
    demo: Boolean(row.demo),
    accent: row.accent || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function serviceFromRow(row) {
  if (!row) return null
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    short: row.short,
    description: row.description,
    image: row.image,
    deliverables: parseJson(row.deliverables, []),
    startingAt: row.starting_at,
    order: row.sort_order,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function enquiryFromRow(row) {
  if (!row) return null
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    company: row.company,
    eventType: row.event_type,
    eventDate: row.event_date || '',
    venue: row.venue,
    audienceSize: row.audience_size ?? 0,
    budget: row.budget,
    services: parseJson(row.services, []),
    message: row.message,
    status: row.status,
    source: row.source,
    notes: row.notes,
    clientId: row.client_id || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function clientFromRow(row) {
  if (!row) return null
  return {
    id: row.id,
    company: row.company,
    contactName: row.contact_name,
    email: row.email,
    phone: row.phone,
    industry: row.industry,
    city: row.city,
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function quotationFromRow(row, items = []) {
  if (!row) return null
  return {
    id: row.id,
    number: row.number,
    clientId: row.client_id || null,
    enquiryId: row.enquiry_id || null,
    projectTitle: row.project_title,
    eventType: row.event_type,
    eventDate: row.event_date || '',
    venue: row.venue,
    guests: row.guests,
    status: row.status,
    lineItems: items,
    subtotalPaise: row.subtotal_paise,
    discountPaise: row.discount_paise,
    gstRateBps: row.gst_rate_bps,
    gstPaise: row.gst_paise,
    totalPaise: row.total_paise,
    notes: row.notes,
    validUntil: row.valid_until || '',
    issuedAt: row.issued_at || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function quotationItemFromRow(row) {
  return {
    id: row.id,
    description: row.description,
    detail: row.detail,
    quantity: row.quantity,
    unit: row.unit,
    unitPricePaise: row.unit_price_paise,
    order: row.sort_order,
  }
}

export function assetFromRow(row) {
  if (!row) return null
  return {
    id: row.id,
    title: row.title,
    url: row.url,
    category: row.category,
    tags: parseJson(row.tags, []),
    eventDate: row.event_date || '',
    dimensions: row.dimensions,
    fileType: row.file_type,
    fileSize: row.file_size,
    clientId: row.client_id || null,
    favorite: Boolean(row.favorite),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function teamMemberFromRow(row) {
  if (!row) return null
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    title: row.title,
    status: row.status,
    color: row.color,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function activityFromRow(row) {
  if (!row) return null
  return {
    id: row.id,
    adminId: row.admin_id,
    adminName: row.admin_name,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    description: row.description,
    createdAt: row.created_at,
  }
}
