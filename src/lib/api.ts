import type {
  ActivityRecord,
  AdminService,
  AdminUser,
  AnalyticsData,
  AssetCategory,
  AssetRecord,
  ChatMessage,
  ClientDetail,
  ClientRecord,
  ClientStatus,
  DashboardData,
  EnquiryRecord,
  EnquiryStatus,
  PublicSettings,
  QuotationRecord,
  QuotationStatus,
  StudioSettingsRecord,
  TeamMemberRecord,
  WorkProject,
} from '../types'

export class ApiError extends Error {
  status: number
  fields?: Record<string, string>

  constructor(status: number, message: string, fields?: Record<string, string>) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fields = fields
  }
}

type RequestOptions = {
  method?: string
  body?: unknown
  signal?: AbortSignal
  timeoutMs?: number
}

function csrfFromCookie() {
  if (typeof document === 'undefined') return ''
  const match = document.cookie.match(/(?:^|;\s*)rhv_csrf=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : ''
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, signal, timeoutMs } = options
  const headers: Record<string, string> = { Accept: 'application/json' }
  const upperMethod = method.toUpperCase()
  let payload: BodyInit | undefined
  if (body instanceof FormData) {
    payload = body
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }
  if (!['GET', 'HEAD', 'OPTIONS'].includes(upperMethod)) {
    const token = csrfFromCookie()
    if (token) headers['X-CSRF-Token'] = token
  }

  let response: Response
  try {
    response = await fetch(path, {
      method: upperMethod,
      headers,
      body: payload,
      credentials: 'include',
      signal: signal ?? (timeoutMs ? AbortSignal.timeout(timeoutMs) : undefined),
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    if (error instanceof DOMException && error.name === 'TimeoutError') {
      throw new ApiError(408, 'The studio service took too long to respond. Please try again.')
    }
    throw new ApiError(
      0,
      'The studio service could not be reached. Check that the API server is running.',
    )
  }

  const contentType = response.headers.get('content-type') || ''
  let data: any = null
  if (contentType.includes('application/json')) {
    try {
      data = await response.json()
    } catch {
      throw new ApiError(502, 'The studio service returned an unexpected response.')
    }
  }
  if (!response.ok) {
    if (response.status === 401 && !path.endsWith('/auth/login')) {
      window.dispatchEvent(new CustomEvent('rhv:session-expired'))
    }
    throw new ApiError(
      response.status,
      data?.error?.message || `Request failed (${response.status}).`,
      data?.error?.fields,
    )
  }
  return data as T
}

function queryString(params: Record<string, string | number | boolean | undefined>) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '' || value === 'All') continue
    search.set(key, String(value))
  }
  return search.size ? `?${search.toString()}` : ''
}

export type LoginResult = { user: AdminUser; csrfToken?: string }

export const api = {
  login: (email: string, password: string) =>
    request<LoginResult>('/api/auth/login', {
      method: 'POST',
      body: { email, password },
    }),
  logout: () => request<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }),
  me: () => request<LoginResult>('/api/auth/me'),

  public: {
    projects: () =>
      request<{ projects: WorkProject[]; demoFallback: boolean }>('/api/public/projects'),
    project: (slug: string) =>
      request<{ project: WorkProject }>(`/api/public/projects/${encodeURIComponent(slug)}`),
    services: () => request<{ services: AdminService[] }>('/api/public/services'),
    settings: () => request<{ settings: PublicSettings }>('/api/public/settings'),
    submitEnquiry: (body: Record<string, unknown>) =>
      request<{ enquiry: { id: string; status: string; createdAt: string }; message: string }>(
        '/api/public/enquiries',
        { method: 'POST', body, timeoutMs: 20000 },
      ),
    chatStatus: () =>
      request<{ aiEnabled: boolean; mode: 'ai' | 'rules' }>('/api/public/chat/status', {
        timeoutMs: 10000,
      }),
    chat: async (message: string, history: Pick<ChatMessage, 'role' | 'content'>[] = []) => {
      const result = await request<{ reply?: unknown; mode?: unknown }>('/api/public/chat', {
        method: 'POST',
        body: {
          message,
          history: history
            .filter((item) => item.content.trim())
            .slice(-8)
            .map((item) => ({ role: item.role, content: item.content.trim().slice(0, 500) })),
        },
        timeoutMs: 20000,
      })
      if (typeof result?.reply !== 'string' || !result.reply.trim()) {
        throw new ApiError(502, 'The studio guide returned an unreadable response.')
      }
      return {
        reply: result.reply.trim(),
        mode: result.mode === 'ai' ? ('ai' as const) : ('rules' as const),
      }
    },
  },

  admin: {
    dashboard: () => request<DashboardData>('/api/admin/dashboard'),

    clients: {
      list: (params?: { status?: ClientStatus | 'All'; q?: string }) =>
        request<{
          clients: ClientRecord[]
          counts: { total: number; active: number; prospects: number }
        }>(`/api/admin/clients${queryString(params ?? {})}`),
      get: (id: string) => request<{ client: ClientDetail }>(`/api/admin/clients/${id}`),
      create: (body: Record<string, unknown>) =>
        request<{ client: ClientRecord }>('/api/admin/clients', { method: 'POST', body }),
      update: (id: string, body: Record<string, unknown>) =>
        request<{ client: ClientRecord }>(`/api/admin/clients/${id}`, {
          method: 'PUT',
          body,
        }),
      remove: (id: string) =>
        request<{ ok: boolean }>(`/api/admin/clients/${id}`, { method: 'DELETE' }),
      fromEnquiry: (enquiryId: string, body: Record<string, unknown> = {}) =>
        request<{ client: ClientRecord }>(
          `/api/admin/clients/from-enquiry/${encodeURIComponent(enquiryId)}`,
          { method: 'POST', body },
        ),
    },

    quotations: {
      list: (params?: { status?: QuotationStatus | 'All'; q?: string }) =>
        request<{
          quotations: QuotationRecord[]
          counts: {
            total: number
            pipelinePaise: number
            acceptedPaise: number
            Draft: number
            Issued: number
            Accepted: number
            Rejected: number
            Expired: number
            Cancelled: number
          }
        }>(`/api/admin/quotations${queryString(params ?? {})}`),
      get: (id: string) => request<{ quotation: QuotationRecord }>(`/api/admin/quotations/${id}`),
      create: (body: Record<string, unknown>) =>
        request<{ quotation: QuotationRecord }>('/api/admin/quotations', {
          method: 'POST',
          body,
        }),
      update: (id: string, body: Record<string, unknown>) =>
        request<{ quotation: QuotationRecord }>(`/api/admin/quotations/${id}`, {
          method: 'PUT',
          body,
        }),
      setStatus: (id: string, status: QuotationStatus) =>
        request<{ quotation: QuotationRecord }>(`/api/admin/quotations/${id}/status`, {
          method: 'PATCH',
          body: { status },
        }),
      remove: (id: string) =>
        request<{ ok: boolean }>(`/api/admin/quotations/${id}`, { method: 'DELETE' }),
      pdfUrl: (id: string) => `/api/admin/quotations/${encodeURIComponent(id)}/pdf`,
    },

    assets: {
      list: (params?: { category?: AssetCategory | 'All'; q?: string; favorite?: boolean }) =>
        request<{
          assets: AssetRecord[]
          counts: Record<string, number>
        }>(`/api/admin/assets${queryString(params ?? {})}`),
      create: (body: Record<string, unknown>) =>
        request<{ asset: AssetRecord }>('/api/admin/assets', { method: 'POST', body }),
      update: (id: string, body: Record<string, unknown>) =>
        request<{ asset: AssetRecord }>(`/api/admin/assets/${id}`, {
          method: 'PUT',
          body,
        }),
      toggleFavorite: (id: string, favorite: boolean) =>
        request<{ asset: AssetRecord }>(`/api/admin/assets/${id}/favorite`, {
          method: 'PATCH',
          body: { favorite },
        }),
      remove: (id: string) =>
        request<{ ok: boolean }>(`/api/admin/assets/${id}`, { method: 'DELETE' }),
    },

    team: {
      list: () =>
        request<{
          team: TeamMemberRecord[]
          counts: { total: number; active: number; inactive: number }
        }>('/api/admin/team'),
      create: (body: Record<string, unknown>) =>
        request<{ member: TeamMemberRecord }>('/api/admin/team', {
          method: 'POST',
          body,
        }),
      update: (id: string, body: Record<string, unknown>) =>
        request<{ member: TeamMemberRecord }>(`/api/admin/team/${id}`, {
          method: 'PUT',
          body,
        }),
      remove: (id: string) =>
        request<{ ok: boolean }>(`/api/admin/team/${id}`, { method: 'DELETE' }),
    },

    settings: {
      get: () => request<{ settings: StudioSettingsRecord }>('/api/admin/settings'),
      update: (body: Record<string, unknown>) =>
        request<{ settings: StudioSettingsRecord }>('/api/admin/settings', {
          method: 'PUT',
          body,
        }),
    },

    analytics: () => request<AnalyticsData>('/api/admin/analytics'),

    activity: {
      list: (params?: { entityType?: string; limit?: number; offset?: number }) =>
        request<{
          activities: ActivityRecord[]
          total: number
          counts: Record<string, number>
          paging: { limit: number; offset: number }
        }>(`/api/admin/activity${queryString(params ?? {})}`),
    },

    projects: {
      list: () => request<{ projects: WorkProject[] }>('/api/admin/projects'),
      create: (body: Record<string, unknown>) =>
        request<{ project: WorkProject }>('/api/admin/projects', { method: 'POST', body }),
      update: (id: string, body: Record<string, unknown>) =>
        request<{ project: WorkProject }>(`/api/admin/projects/${id}`, {
          method: 'PUT',
          body,
        }),
      setStatus: (id: string, status: 'draft' | 'published') =>
        request<{ project: WorkProject }>(`/api/admin/projects/${id}/status`, {
          method: 'PATCH',
          body: { status },
        }),
      remove: (id: string) =>
        request<{ ok: boolean }>(`/api/admin/projects/${id}`, { method: 'DELETE' }),
    },
    services: {
      list: () => request<{ services: AdminService[] }>('/api/admin/services'),
      create: (body: Record<string, unknown>) =>
        request<{ service: AdminService }>('/api/admin/services', { method: 'POST', body }),
      update: (id: string, body: Record<string, unknown>) =>
        request<{ service: AdminService }>(`/api/admin/services/${id}`, {
          method: 'PUT',
          body,
        }),
      setStatus: (id: string, status: 'draft' | 'published') =>
        request<{ service: AdminService }>(`/api/admin/services/${id}/status`, {
          method: 'PATCH',
          body: { status },
        }),
      remove: (id: string) =>
        request<{ ok: boolean }>(`/api/admin/services/${id}`, { method: 'DELETE' }),
    },
    enquiries: {
      list: (params?: { status?: EnquiryStatus | 'All'; q?: string }) => {
        const search = new URLSearchParams()
        if (params?.status && params.status !== 'All') search.set('status', params.status)
        if (params?.q) search.set('q', params.q)
        const suffix = search.size ? `?${search.toString()}` : ''
        return request<{ enquiries: EnquiryRecord[]; counts: { total: number; pending: number } }>(
          `/api/admin/enquiries${suffix}`,
        )
      },
      get: (id: string) =>
        request<{ enquiry: EnquiryRecord }>(`/api/admin/enquiries/${id}`),
      update: (id: string, body: { status?: EnquiryStatus; notes?: string }) =>
        request<{ enquiry: EnquiryRecord }>(`/api/admin/enquiries/${id}`, {
          method: 'PATCH',
          body,
        }),
      linkClient: (id: string, clientId: string | null) =>
        request<{ enquiry: EnquiryRecord; client: { id: string; company: string } | null }>(
          `/api/admin/enquiries/${id}/client`,
          { method: 'PATCH', body: { clientId } },
        ),
      remove: (id: string) =>
        request<{ ok: boolean }>(`/api/admin/enquiries/${id}`, { method: 'DELETE' }),
    },
    upload: (file: File) => {
      const form = new FormData()
      form.append('image', file)
      return request<{ upload: { url: string; filename: string; size: number; mimeType: string } }>(
        '/api/admin/uploads',
        { method: 'POST', body: form },
      )
    },
  },
}
