export type BookingStatus = 'Confirmed' | 'Pending' | 'Completed' | 'Cancelled'
export type InquiryStatus = 'New' | 'Contacted' | 'Qualified' | 'Archived'
export type QuoteStatus = 'Draft' | 'Sent' | 'Accepted' | 'Declined'
export type ClientStatus = 'Active' | 'Prospect' | 'Past'
export type AssetCategory = 'Live Show' | 'Festival' | 'Nightlife' | 'Corporate' | 'Brand' | 'BTS'
export type Role = 'Owner' | 'Admin' | 'Manager' | 'Viewer'
export type Permission =
  | 'view_dashboard'
  | 'manage_bookings'
  | 'manage_clients'
  | 'manage_quotes'
  | 'manage_assets'
  | 'manage_inquiries'
  | 'view_analytics'
  | 'manage_team'
  | 'manage_settings'

export interface Client {
  id: string
  company: string
  contactName: string
  email: string
  phone: string
  industry: string
  city: string
  status: ClientStatus
  notes: string
  createdAt: string
}

export interface Booking {
  id: string
  title: string
  clientId: string
  type: string
  date: string
  endDate?: string
  startTime: string
  venue: string
  city: string
  guests: number
  value: number
  status: BookingStatus
  services: string[]
  notes: string
  crewSize: number
  projectManager: string
  createdAt: string
}

export interface QuoteLineItem {
  id: string
  description: string
  detail?: string
  quantity: number
  unit: string
  rate: number
  category: 'Creative' | 'Equipment' | 'Production' | 'Crew' | 'Travel'
}

export interface Quotation {
  id: string
  number: string
  clientId: string
  projectTitle: string
  eventType: string
  eventDate: string
  venue: string
  guests: number
  lineItems: QuoteLineItem[]
  discount: number
  taxRate: number
  status: QuoteStatus
  notes: string
  aiBrief: string
  validUntil: string
  createdAt: string
}

export interface Inquiry {
  id: string
  name: string
  email: string
  company: string
  phone: string
  eventType: string
  eventDate: string
  venue: string
  budget: number
  message: string
  status: InquiryStatus
  source: 'Website' | 'Referral' | 'Instagram' | 'Direct'
  createdAt: string
  notes: string
}

export interface StudioAsset {
  id: string
  title: string
  url: string
  category: AssetCategory
  tags: string[]
  eventDate: string
  dimensions: string
  fileType: string
  fileSize: string
  clientId?: string
  favorite: boolean
  createdAt: string
}

export interface TeamMember {
  id: string
  name: string
  email: string
  phone: string
  role: Role
  title: string
  status: 'Active' | 'Invited' | 'Suspended'
  lastActive: string
  password: string
  color: string
}

export interface ActivityItem {
  id: string
  type: 'booking' | 'client' | 'quote' | 'inquiry' | 'asset' | 'team'
  title: string
  detail: string
  at: string
}

export interface StudioSettings {
  studioName: string
  tagline: string
  email: string
  phone: string
  address: string
  city: string
  gstin: string
  currency: 'INR' | 'USD' | 'AED' | 'GBP'
  taxRate: number
  depositPercent: number
  bookingLeadTime: number
  notifications: {
    newInquiry: boolean
    quoteAccepted: boolean
    bookingReminder: boolean
    weeklyDigest: boolean
  }
}

export interface DataState {
  clients: Client[]
  bookings: Booking[]
  quotations: Quotation[]
  inquiries: Inquiry[]
  assets: StudioAsset[]
  team: TeamMember[]
  activity: ActivityItem[]
  settings: StudioSettings
}

export interface NewBooking extends Omit<Booking, 'id' | 'createdAt'> {
  id?: string
}

export interface PublicProject {
  slug: string
  title: string
  client: string
  category: string
  location: string
  year: string
  cover: string
  gallery: string[]
  summary: string
  challenge: string
  approach: string
  outcome: string
  services: string[]
  metrics: { value: string; label: string }[]
  featured?: boolean
  color: string
}

export type ProjectStatus = 'draft' | 'published'

/**
 * Public portfolio record. The shape mirrors what the future admin/CMS layer
 * will store (media, ordering, publish state) so demo data can be replaced by
 * an API response without changing the Work page components.
 */
export interface WorkProject {
  id: string
  slug: string
  title: string
  description: string
  category: string
  cover: string
  gallery: string[]
  videos?: string[]
  /** Legacy single-video field kept for older API consumers. */
  videoUrl?: string
  client?: string
  clientId?: string | null
  location?: string
  year?: string
  services: string[]
  order: number
  status: ProjectStatus
  updatedAt: string
  /** Marks reversible sample content until real productions are published. */
  demo?: boolean
  accent?: string
}

export interface ServiceItem {
  id: string
  title: string
  short: string
  description: string
  image: string
  deliverables: string[]
  startingAt: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  at: string
}

export type EnquiryStatus = 'Pending' | 'Contacted' | 'Completed' | 'Archived'

export type AdminUser = {
  id: string
  name: string
  email: string
  role: Role
  lastLoginAt?: string | null
}

export type EnquiryRecord = {
  id: string
  name: string
  email: string
  phone: string
  company: string
  eventType: string
  eventDate: string
  venue: string
  audienceSize: number
  budget: number
  services: string[]
  message: string
  status: EnquiryStatus
  source: string
  notes: string
  clientId: string | null
  createdAt: string
  updatedAt: string
}

export type AdminService = ServiceItem & {
  slug: string
  order: number
  status: ProjectStatus
  createdAt: string
  updatedAt: string
}

export type DashboardData = {
  counts: {
    projects: { total: number; published: number; drafts: number }
    services: { total: number; published: number; drafts: number }
    enquiries: { total: number; pending: number; contacted: number; completed: number }
    clients: { total: number; active: number; prospects: number }
    quotations: { total: number; pipelinePaise: number; acceptedPaise: number }
    assets: { total: number }
    team: { active: number }
  }
  recentEnquiries: EnquiryRecord[]
  recentProjects: WorkProject[]
  serverTime: string
}

/* ------------------------------------------------------------------ */
/* API-backed studio records                                           */
/* ------------------------------------------------------------------ */

export type ClientRecord = {
  id: string
  company: string
  contactName: string
  email: string
  phone: string
  industry: string
  city: string
  status: ClientStatus
  notes: string
  createdAt: string
  updatedAt: string
  quotationCount?: number
  quotationValuePaise?: number
}

export type ClientDetail = ClientRecord & {
  enquiries: Array<{
    id: string
    eventType: string
    eventDate: string | null
    status: EnquiryStatus
    createdAt: string
  }>
  quotations: Array<{
    id: string
    number: string
    projectTitle: string
    status: QuotationStatus
    totalPaise: number
    createdAt: string
  }>
  projects: Array<{
    id: string
    slug: string
    title: string
    status: ProjectStatus
    cover: string
  }>
}

export type QuotationStatus =
  | 'Draft'
  | 'Issued'
  | 'Accepted'
  | 'Rejected'
  | 'Expired'
  | 'Cancelled'

export type QuotationLineItemRecord = {
  id: string
  description: string
  detail: string
  quantity: number
  unit: string
  unitPricePaise: number
  order: number
}

export type QuotationRecord = {
  id: string
  number: string
  clientId: string | null
  enquiryId: string | null
  projectTitle: string
  eventType: string
  eventDate: string
  venue: string
  guests: number
  status: QuotationStatus
  lineItems: QuotationLineItemRecord[]
  subtotalPaise: number
  discountPaise: number
  gstRateBps: number
  gstPaise: number
  totalPaise: number
  notes: string
  validUntil: string
  issuedAt: string | null
  createdAt: string
  updatedAt: string
  clientCompany?: string | null
  clientContact?: string | null
  itemCount?: number
}

export type AssetRecord = {
  id: string
  title: string
  url: string
  category: AssetCategory
  tags: string[]
  eventDate: string
  dimensions: string
  fileType: string
  fileSize: string
  clientId: string | null
  favorite: boolean
  createdAt: string
  updatedAt: string
  clientCompany?: string | null
}

export type TeamMemberRecord = {
  id: string
  name: string
  email: string
  phone: string
  title: string
  status: 'Active' | 'Inactive'
  color: string
  createdAt: string
  updatedAt: string
}

export type StudioSettingsRecord = {
  studioName: string
  tagline: string
  email: string
  phone: string
  address: string
  city: string
  gstin: string
  currency: 'INR'
  defaultGstRate: number
  quotationNotes: string
  instagramUrl: string
  linkedinUrl: string
  logoUrl: string
  updatedAt: string
}

export type ActivityRecord = {
  id: string
  adminId: string
  adminName: string
  action: string
  entityType: string
  entityId: string
  description: string
  createdAt: string
}

export type AnalyticsData = {
  totals: {
    projects: { total: number; published: number }
    services: { total: number; published: number }
    enquiries: number
    clients: number
    assets: number
    quotations: { total: number; pipelinePaise: number; acceptedPaise: number }
  }
  monthly: Array<{
    month: string
    label: string
    enquiries: number
    quotations: number
    quotedPaise: number
    accepted: number
  }>
  quotationStatus: Array<{ status: QuotationStatus; count: number; valuePaise: number }>
  clientsByStatus: { active: number; prospect: number; past: number }
  topClients: Array<{
    id: string
    company: string
    contactName: string
    status: ClientStatus
    quoteCount: number
    pipelinePaise: number
    acceptedPaise: number
  }>
  requestedServices: Array<{ service: string; count: number }>
  conversion: {
    enquiries: number
    linkedEnquiries: number
    quotations: number
    accepted: number
    decided: number
    winRate: number | null
  }
  recentActivity: ActivityRecord[]
  generatedAt: string
}

export type PublicSettings = {
  studioName: string
  tagline: string
  email: string
  phone: string
  address: string
  city: string
  instagramUrl: string
  linkedinUrl: string
  logoUrl: string
}
