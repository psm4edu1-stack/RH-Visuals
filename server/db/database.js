import { DatabaseSync } from 'node:sqlite'
import bcrypt from 'bcryptjs'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..', '..')
const configuredPath = process.env.DATABASE_PATH || 'server/data/rh-visuals.sqlite'
export const databasePath = path.isAbsolute(configuredPath)
  ? configuredPath
  : path.resolve(projectRoot, configuredPath)

fs.mkdirSync(path.dirname(databasePath), { recursive: true })

export const db = new DatabaseSync(databasePath)
db.exec('PRAGMA journal_mode = WAL;')
db.exec('PRAGMA foreign_keys = ON;')
db.exec('PRAGMA busy_timeout = 5000;')

const schema = `
CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  company TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL COLLATE NOCASE UNIQUE,
  phone TEXT NOT NULL DEFAULT '',
  industry TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Prospect' CHECK (status IN ('Active', 'Prospect', 'Past')),
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Owner',
  is_active INTEGER NOT NULL DEFAULT 1,
  last_login_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'Production',
  cover TEXT NOT NULL,
  gallery TEXT NOT NULL DEFAULT '[]',
  video_url TEXT,
  videos TEXT NOT NULL DEFAULT '[]',
  client TEXT,
  client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
  location TEXT,
  year TEXT,
  services TEXT NOT NULL DEFAULT '[]',
  sort_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  demo INTEGER NOT NULL DEFAULT 0,
  accent TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  short TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  image TEXT NOT NULL,
  deliverables TEXT NOT NULL DEFAULT '[]',
  starting_at TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS enquiries (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  company TEXT NOT NULL DEFAULT '',
  event_type TEXT NOT NULL,
  event_date TEXT,
  venue TEXT NOT NULL DEFAULT '',
  audience_size INTEGER NOT NULL DEFAULT 0,
  budget INTEGER NOT NULL DEFAULT 0,
  services TEXT NOT NULL DEFAULT '[]',
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Contacted', 'Completed', 'Archived')),
  source TEXT NOT NULL DEFAULT 'Website',
  notes TEXT NOT NULL DEFAULT '',
  client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS quotations (
  id TEXT PRIMARY KEY,
  number TEXT NOT NULL UNIQUE,
  client_id TEXT REFERENCES clients(id) ON DELETE RESTRICT,
  enquiry_id TEXT REFERENCES enquiries(id) ON DELETE SET NULL,
  project_title TEXT NOT NULL,
  event_type TEXT NOT NULL DEFAULT '',
  event_date TEXT,
  venue TEXT NOT NULL DEFAULT '',
  guests INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Draft'
    CHECK (status IN ('Draft', 'Issued', 'Accepted', 'Rejected', 'Expired', 'Cancelled')),
  subtotal_paise INTEGER NOT NULL DEFAULT 0 CHECK (subtotal_paise >= 0),
  discount_paise INTEGER NOT NULL DEFAULT 0 CHECK (discount_paise >= 0),
  gst_rate_bps INTEGER NOT NULL DEFAULT 0 CHECK (gst_rate_bps >= 0 AND gst_rate_bps <= 10000),
  gst_paise INTEGER NOT NULL DEFAULT 0 CHECK (gst_paise >= 0),
  total_paise INTEGER NOT NULL DEFAULT 0 CHECK (total_paise >= 0),
  notes TEXT NOT NULL DEFAULT '',
  valid_until TEXT,
  issued_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS quotation_items (
  id TEXT PRIMARY KEY,
  quotation_id TEXT NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT '',
  quantity INTEGER NOT NULL CHECK (quantity > 0 AND quantity <= 1000000),
  unit TEXT NOT NULL DEFAULT 'unit',
  unit_price_paise INTEGER NOT NULL CHECK (unit_price_paise >= 0),
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Live Show',
  tags TEXT NOT NULL DEFAULT '[]',
  event_date TEXT,
  dimensions TEXT NOT NULL DEFAULT '',
  file_type TEXT NOT NULL DEFAULT '',
  file_size TEXT NOT NULL DEFAULT '',
  client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
  favorite INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS team_members (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL COLLATE NOCASE UNIQUE,
  phone TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
  color TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  studio_name TEXT NOT NULL DEFAULT 'RH VISUALS',
  tagline TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  gstin TEXT NOT NULL DEFAULT '',
  currency TEXT NOT NULL DEFAULT 'INR' CHECK (currency = 'INR'),
  default_gst_rate_bps INTEGER NOT NULL DEFAULT 0
    CHECK (default_gst_rate_bps >= 0 AND default_gst_rate_bps <= 10000),
  quotation_notes TEXT NOT NULL DEFAULT '',
  instagram_url TEXT NOT NULL DEFAULT '',
  linkedin_url TEXT NOT NULL DEFAULT '',
  logo_url TEXT NOT NULL DEFAULT '/rh-visuals-logo-light.png',
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS activity_log (
  id TEXT PRIMARY KEY,
  admin_id TEXT NOT NULL DEFAULT '',
  admin_name TEXT NOT NULL DEFAULT '',
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_clients_email ON clients (email);
CREATE INDEX IF NOT EXISTS idx_clients_updated ON clients (updated_at);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations (status, created_at);
CREATE INDEX IF NOT EXISTS idx_quotations_client ON quotations (client_id, created_at);
CREATE INDEX IF NOT EXISTS idx_quotation_items_quote ON quotation_items (quotation_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_assets_category ON assets (category, created_at);
CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_public ON projects (status, sort_order, created_at);
CREATE INDEX IF NOT EXISTS idx_services_public ON services (status, sort_order, created_at);
CREATE INDEX IF NOT EXISTS idx_enquiries_status ON enquiries (status, created_at);
CREATE INDEX IF NOT EXISTS idx_enquiries_email ON enquiries (email, created_at);
`

db.exec(schema)

function ensureColumn(table, column, definition) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all()
  if (columns.some((entry) => entry.name === column)) return
  db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)
  console.log(`[db] Added ${table}.${column}`)
}

ensureColumn('enquiries', 'audience_size', 'INTEGER NOT NULL DEFAULT 0')
ensureColumn('projects', 'client_id', 'TEXT REFERENCES clients(id) ON DELETE SET NULL')
ensureColumn('enquiries', 'client_id', 'TEXT REFERENCES clients(id) ON DELETE SET NULL')
ensureColumn('projects', 'videos', "TEXT NOT NULL DEFAULT '[]'")

// Preserve the single legacy video URL when upgrading an existing database.
const legacyVideoRows = db
  .prepare(
    `SELECT id, video_url FROM projects
     WHERE (videos IS NULL OR videos = '[]')
       AND video_url IS NOT NULL AND TRIM(video_url) <> ''`,
  )
  .all()
if (legacyVideoRows.length > 0) {
  const updateVideos = db.prepare('UPDATE projects SET videos = ? WHERE id = ?')
  for (const row of legacyVideoRows) {
    updateVideos.run(JSON.stringify([row.video_url]), row.id)
  }
}

const nowIso = () => new Date().toISOString()

function seedSettings() {
  const existing = db.prepare('SELECT id FROM settings WHERE id = 1').get()
  if (existing) return
  db.prepare(`
    INSERT INTO settings
      (id, studio_name, tagline, email, phone, address, city, gstin, currency,
       default_gst_rate_bps, quotation_notes, instagram_url, linkedin_url, logo_url, updated_at)
    VALUES (1, ?, ?, ?, ?, ?, ?, '', 'INR', 0, '', '', '', '/rh-visuals-logo-light.png', ?)
  `).run(
    'RH VISUALS',
    'Live visual production for rooms that deserve to be remembered.',
    'hello@rhvisuals.studio',
    '+91 98400 21644',
    'No. 14, Rutland Gate, 4th Street',
    'Chennai 600006, India',
    nowIso(),
  )
}

const serviceSeed = [
  {
    id: 'live-visuals',
    slug: 'live-visuals',
    title: 'Live Visuals & Content',
    short: 'The visual language of the show.',
    description:
      'Artist-led visual systems for concerts, festivals and live performance. From a single hero moment to a full touring content library, we design every frame for the room, the screen and the crowd in front of it.',
    image: '/images/work-pulse.jpg',
    deliverables: ['Creative direction', 'Show content systems', 'Artist visual kits', 'Generative design', 'Live camera design'],
    startingAt: '₹2,50,000',
    order: 1,
  },
  {
    id: 'projection-mapping',
    slug: 'projection-mapping',
    title: 'Projection & Spatial',
    short: 'Surface becomes story.',
    description:
      'Projection design and mapping that treats architecture, object and landscape as canvas. We handle concept, content, calibration and on-site playback as one continuous craft.',
    image: '/images/brand-launch.jpg',
    deliverables: ['Projection mapping', 'Spatial content', 'Interactive systems', 'Technical design', 'On-site calibration'],
    startingAt: '₹3,50,000',
    order: 2,
  },
  {
    id: 'show-design',
    slug: 'show-design',
    title: 'Show & Technical Direction',
    short: 'One system, every cue.',
    description:
      'The quiet architecture behind an effortless show. We unite content, screens, lighting cues and playback into a single clear operating system, led by someone who owns the outcome on site.',
    image: '/images/conference.jpg',
    deliverables: ['Show design', 'Media server programming', 'Timecode & cueing', 'Crew planning', 'On-site show operation'],
    startingAt: '₹4,00,000',
    order: 3,
  },
  {
    id: 'festival-production',
    slug: 'festival-production',
    title: 'Festival & Tour Production',
    short: 'Built to travel, made to land.',
    description:
      'Scalable visual production for festivals, tours and multi-city programmes. Redundant systems, venue-specific adaptation and a crew that stays calm when the schedule changes.',
    image: '/images/hero-crowd.jpg',
    deliverables: ['Multi-stage content', 'Touring systems', 'Festival identity', 'Artist onboarding', 'Production management'],
    startingAt: '₹8,00,000',
    order: 4,
  },
  {
    id: 'brand-experiences',
    slug: 'brand-experiences',
    title: 'Brand & Corporate Experiences',
    short: 'Clarity with a pulse.',
    description:
      'Visual experiences for launches, summits, galas and leadership moments. We balance the precision a brand demands with the emotional moment an audience remembers.',
    image: '/images/corporate-gala.jpg',
    deliverables: ['Keynote graphics', 'Stage content', 'Launch environments', 'Interactive moments', 'Show operation'],
    startingAt: '₹2,00,000',
    order: 5,
  },
  {
    id: 'nightlife',
    slug: 'nightlife',
    title: 'Nightlife & Hospitality',
    short: 'A resident visual language.',
    description:
      'Generative environments and visual identities for clubs, bars and hospitality spaces. Designed to evolve night after night without needing a full production crew.',
    image: '/images/nightlife.jpg',
    deliverables: ['Generative visuals', 'Venue identity', 'LED content', 'Compact show systems', 'Resident training'],
    startingAt: '₹1,50,000',
    order: 6,
  },
]

function seedServices() {
  const seeded = db.prepare('SELECT value FROM meta WHERE key = ?').get('services_seeded')
  if (seeded) return
  const insert = db.prepare(`
    INSERT INTO services
      (id, slug, title, short, description, image, deliverables, starting_at, sort_order, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', ?, ?)
  `)
  const timestamp = nowIso()
  for (const service of serviceSeed) {
    insert.run(
      service.id,
      service.slug,
      service.title,
      service.short,
      service.description,
      service.image,
      JSON.stringify(service.deliverables),
      service.startingAt,
      service.order,
      timestamp,
      timestamp,
    )
  }
  db.prepare('INSERT INTO meta (key, value) VALUES (?, ?)').run('services_seeded', timestamp)
}

function seedAdmin() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase()
  const password = process.env.ADMIN_PASSWORD
  if (!email || !password) {
    console.warn('[db] ADMIN_EMAIL / ADMIN_PASSWORD not set. No administrator was bootstrapped.')
    return
  }
  const existing = db.prepare('SELECT id FROM admins WHERE email = ?').get(email)
  if (existing) return
  const timestamp = nowIso()
  db.prepare(`
    INSERT INTO admins (name, email, password_hash, role, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, 1, ?, ?)
  `).run(
    process.env.ADMIN_NAME?.trim() || 'Studio Owner',
    email,
    bcrypt.hashSync(password, 12),
    process.env.ADMIN_ROLE?.trim() || 'Owner',
    timestamp,
    timestamp,
  )
  console.log(`[db] Administrator bootstrapped: ${email}`)
}

export function initializeDatabase() {
  seedSettings()
  seedServices()
  seedAdmin()
  return db
}

export function getMeta(key) {
  return db.prepare('SELECT value FROM meta WHERE key = ?').get(key)?.value ?? null
}

export function setMeta(key, value) {
  db.prepare(`
    INSERT INTO meta (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(key, value)
}

export const timestamps = { now: nowIso }

export function withTransaction(operation) {
  db.exec('BEGIN IMMEDIATE')
  try {
    const result = operation()
    db.exec('COMMIT')
    return result
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}
