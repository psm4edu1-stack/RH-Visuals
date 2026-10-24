import { useCallback, useEffect, useState } from 'react'
import {
  ArrowUpRight,
  Building2,
  CircleAlert,
  LoaderCircle,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UsersRound,
} from 'lucide-react'
import { AdminPageHeader } from '../../components/admin/AdminUI'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { EmptyState } from '../../components/ui/EmptyState'
import { Drawer, Modal } from '../../components/ui/Overlay'
import { StatusPill } from '../../components/ui/StatusPill'
import { useToast } from '../../components/ui/Toast'
import { ApiError, api } from '../../lib/api'
import { formatCurrency, formatDate, relativeTime } from '../../lib/utils'
import type { ClientDetail, ClientRecord, ClientStatus } from '../../types'

type ClientForm = {
  company: string
  contactName: string
  email: string
  phone: string
  industry: string
  city: string
  status: ClientStatus
  notes: string
}

const emptyForm: ClientForm = {
  company: '',
  contactName: '',
  email: '',
  phone: '',
  industry: '',
  city: '',
  status: 'Prospect',
  notes: '',
}

const statuses: Array<'All' | ClientStatus> = ['All', 'Active', 'Prospect', 'Past']
const clientStatuses: ClientStatus[] = ['Active', 'Prospect', 'Past']

function toForm(client: ClientRecord): ClientForm {
  return {
    company: client.company,
    contactName: client.contactName,
    email: client.email,
    phone: client.phone,
    industry: client.industry,
    city: client.city,
    status: client.status,
    notes: client.notes,
  }
}

export function ClientsPage() {
  const { toast } = useToast()
  const [clients, setClients] = useState<ClientRecord[]>([])
  const [counts, setCounts] = useState({ total: 0, active: 0, prospects: 0 })
  const [status, setStatus] = useState<'All' | ClientStatus>('All')
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<ClientRecord | null>(null)
  const [form, setForm] = useState<ClientForm>(emptyForm)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [detail, setDetail] = useState<ClientDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<ClientRecord | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await api.admin.clients.list({ status, q: search })
      setClients(result.clients)
      setCounts(result.counts)
    } catch (loadError) {
      setError(loadError instanceof ApiError ? loadError.message : 'Clients could not be loaded.')
    } finally {
      setLoading(false)
    }
  }, [status, search])

  useEffect(() => {
    void load()
  }, [load])

  const openCreate = () => {
    setForm(emptyForm)
    setEditing(null)
    setFieldErrors({})
    setEditorOpen(true)
  }

  const openEdit = (client: ClientRecord) => {
    setForm(toForm(client))
    setEditing(client)
    setFieldErrors({})
    setDetail(null)
    setEditorOpen(true)
  }

  const openDetail = async (client: ClientRecord) => {
    setDetail({ ...client, enquiries: [], quotations: [], projects: [] })
    setDetailError('')
    setDetailLoading(true)
    try {
      const result = await api.admin.clients.get(client.id)
      setDetail(result.client)
    } catch (loadError) {
      setDetailError(
        loadError instanceof ApiError ? loadError.message : 'Client details could not be loaded.',
      )
    } finally {
      setDetailLoading(false)
    }
  }

  const update = (field: keyof ClientForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
    if (fieldErrors[field]) {
      setFieldErrors((current) => {
        const next = { ...current }
        delete next[field]
        return next
      })
    }
  }

  const handleSave = async () => {
    if (saving) return
    setSaving(true)
    setFieldErrors({})
    try {
      const payload = { ...form }
      const result = editing
        ? await api.admin.clients.update(editing.id, payload)
        : await api.admin.clients.create(payload)
      setEditorOpen(false)
      toast(editing ? 'Client updated' : 'Client created', {
        description: result.client.company,
      })
      await load()
    } catch (saveError) {
      if (saveError instanceof ApiError) {
        setFieldErrors(saveError.fields ?? {})
        if (!saveError.fields) setError(saveError.message)
        toast('Client not saved', { description: saveError.message, tone: 'error' })
      } else {
        toast('Client not saved', {
          description: 'The API server could not complete the save.',
          tone: 'error',
        })
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (client: ClientRecord) => {
    try {
      await api.admin.clients.remove(client.id)
      setClients((current) => current.filter((item) => item.id !== client.id))
      if (detail?.id === client.id) setDetail(null)
      setDeleteTarget(null)
      toast('Client deleted', { description: client.company })
      await load()
    } catch (deleteError) {
      toast('Client not deleted', {
        description:
          deleteError instanceof ApiError ? deleteError.message : 'The client could not be deleted.',
        tone: 'error',
      })
    }
  }

  return (
    <div className="admin-page">
      <AdminPageHeader
        overline="Relationships"
        title="Clients"
        description="The people and companies behind the work. Client records stay linked to their enquiries, quotations and projects."
        actions={
          <>
            <button type="button" className="btn btn--quiet btn--small" onClick={() => void load()}>
              <RefreshCw size={14} /> Refresh
            </button>
            <button type="button" className="btn btn--primary btn--small" onClick={openCreate}>
              <Plus size={15} /> New client
            </button>
          </>
        }
      />

      <div className="admin-enquiry-toolbar">
        <div className="admin-tabs" role="tablist" aria-label="Filter clients by status">
          {statuses.map((tab) => (
            <button
              type="button"
              key={tab}
              role="tab"
              aria-selected={status === tab}
              className={status === tab ? 'is-active' : ''}
              onClick={() => setStatus(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
        <form
          className="admin-search"
          role="search"
          onSubmit={(event) => {
            event.preventDefault()
            setSearch(query.trim())
          }}
        >
          <Search size={15} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search company, contact, email…"
            aria-label="Search clients"
          />
          <button type="submit" className="btn btn--quiet btn--small">
            Search
          </button>
        </form>
      </div>

      {error && (
        <div className="admin-alert admin-alert--error" role="alert">
          <CircleAlert size={18} />
          <div>
            <strong>Clients unavailable</strong>
            <p>{error}</p>
          </div>
          <button type="button" className="btn btn--quiet btn--small" onClick={() => void load()}>
            Try again
          </button>
        </div>
      )}

      <div className="admin-summary-row">
        <span>{counts.total} database client{counts.total === 1 ? '' : 's'}</span>
        <span>{counts.active} active</span>
        <span>{counts.prospects} prospect{counts.prospects === 1 ? '' : 's'}</span>
      </div>

      {loading ? (
        <div className="admin-loading-panel" role="status">
          <LoaderCircle size={20} className="is-spinning" /> Loading client records…
        </div>
      ) : clients.length === 0 ? (
        <div className="panel admin-panel-pad">
          <EmptyState
            icon={<UsersRound size={22} />}
            title={search || status !== 'All' ? 'No matching clients' : 'No clients yet'}
            description={
              search || status !== 'All'
                ? 'Try another search or clear the status filter.'
                : 'Add a client here when a relationship begins. Enquiries and quotations can then be linked to the same record.'
            }
            action={
              <button type="button" className="btn btn--primary btn--small" onClick={openCreate}>
                <Plus size={14} /> Add the first client
              </button>
            }
          />
        </div>
      ) : (
        <div className="panel admin-table-panel">
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Contact</th>
                  <th>Location</th>
                  <th>Quotations</th>
                  <th>Status</th>
                  <th>Updated</th>
                  <th className="align-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => (
                  <tr key={client.id}>
                    <td>
                      <button type="button" className="table-primary" onClick={() => void openDetail(client)}>
                        {client.company}
                      </button>
                      <small className="admin-table-sub">
                        {client.industry || 'Industry not set'}
                      </small>
                    </td>
                    <td>
                      <strong className="admin-table-strong">{client.contactName}</strong>
                      <small className="admin-table-sub">{client.email}</small>
                    </td>
                    <td>
                      <strong className="admin-table-strong">{client.city || '—'}</strong>
                      <small className="admin-table-sub">{client.phone || 'No phone'}</small>
                    </td>
                    <td>
                      <strong className="admin-table-strong">
                        {client.quotationCount ?? 0}
                      </strong>
                      <small className="admin-table-sub">
                        {formatCurrency((client.quotationValuePaise ?? 0) / 100)}
                      </small>
                    </td>
                    <td>
                      <StatusPill status={client.status} />
                    </td>
                    <td>{relativeTime(client.updatedAt)}</td>
                    <td>
                      <div className="admin-row-actions">
                        <button type="button" onClick={() => openEdit(client)} title="Edit client">
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          className="is-danger"
                          onClick={() => setDeleteTarget(client)}
                          title="Delete client"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        title={editing ? 'Edit client' : 'New client'}
        eyebrow="Client record"
        description="These details are stored in the studio database and can be linked to enquiries, quotations and projects."
        size="lg"
        footer={
          <>
            <button type="button" className="btn btn--quiet" onClick={() => setEditorOpen(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => void handleSave()}
              disabled={saving}
            >
              {saving ? <LoaderCircle size={15} className="is-spinning" /> : null}
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Create client'}
            </button>
          </>
        }
      >
        <div className="admin-form">
          <div className="form-grid form-grid--two">
            <label className="field">
              <span>Company / client name *</span>
              <input value={form.company} onChange={(event) => update('company', event.target.value)} />
              {fieldErrors.company && <small className="admin-field-error">{fieldErrors.company}</small>}
            </label>
            <label className="field">
              <span>Primary contact *</span>
              <input
                value={form.contactName}
                onChange={(event) => update('contactName', event.target.value)}
              />
              {fieldErrors.contactName && (
                <small className="admin-field-error">{fieldErrors.contactName}</small>
              )}
            </label>
          </div>

          <div className="form-grid form-grid--two">
            <label className="field">
              <span>Email *</span>
              <input
                type="email"
                value={form.email}
                onChange={(event) => update('email', event.target.value)}
              />
              {fieldErrors.email && <small className="admin-field-error">{fieldErrors.email}</small>}
            </label>
            <label className="field">
              <span>Phone</span>
              <input value={form.phone} onChange={(event) => update('phone', event.target.value)} />
              {fieldErrors.phone && <small className="admin-field-error">{fieldErrors.phone}</small>}
            </label>
          </div>

          <div className="form-grid form-grid--two">
            <label className="field">
              <span>Industry</span>
              <input
                value={form.industry}
                onChange={(event) => update('industry', event.target.value)}
                placeholder="Events, hospitality, brand…"
              />
            </label>
            <label className="field">
              <span>City</span>
              <input value={form.city} onChange={(event) => update('city', event.target.value)} />
            </label>
          </div>

          <div className="form-grid form-grid--two">
            <label className="field">
              <span>Relationship status</span>
              <select
                value={form.status}
                onChange={(event) => update('status', event.target.value as ClientStatus)}
              >
                {clientStatuses.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              {fieldErrors.status && <small className="admin-field-error">{fieldErrors.status}</small>}
            </label>
            <div className="admin-form-note">
              <Building2 size={15} />
              <p>Deleting is blocked while enquiries, quotations or projects are linked.</p>
            </div>
          </div>

          <label className="field">
            <span>Internal notes</span>
            <textarea
              rows={4}
              value={form.notes}
              onChange={(event) => update('notes', event.target.value)}
              placeholder="Private relationship context for the studio team."
            />
            {fieldErrors.notes && <small className="admin-field-error">{fieldErrors.notes}</small>}
          </label>
        </div>
      </Modal>

      <Drawer
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title={detail?.company ?? 'Client'}
        eyebrow={detail ? `${detail.contactName} · ${detail.status}` : undefined}
        description={detail ? `Client since ${formatDate(detail.createdAt)}` : undefined}
        width="lg"
        footer={
          detail ? (
            <>
              <button
                type="button"
                className="btn btn--danger-quiet"
                onClick={() => setDeleteTarget(detail)}
              >
                <Trash2 size={14} /> Delete
              </button>
              <span className="admin-drawer-footer-spacer" />
              <button type="button" className="btn btn--quiet" onClick={() => setDetail(null)}>
                Close
              </button>
              <button type="button" className="btn btn--primary" onClick={() => openEdit(detail)}>
                <Pencil size={14} /> Edit client
              </button>
            </>
          ) : null
        }
      >
        {detail && (
          <div className="admin-enquiry-detail">
            <div className="admin-enquiry-detail__status">
              <StatusPill status={detail.status} />
              <span>Updated {relativeTime(detail.updatedAt)}</span>
            </div>

            {detailLoading && (
              <div className="admin-loading-panel admin-loading-panel--inline" role="status">
                <LoaderCircle size={18} className="is-spinning" /> Loading linked records…
              </div>
            )}

            {detailError && (
              <div className="admin-alert admin-alert--error" role="alert">
                <CircleAlert size={18} />
                <div>
                  <strong>Linked records unavailable</strong>
                  <p>{detailError}</p>
                </div>
              </div>
            )}

            <div className="admin-detail-grid">
              <div>
                <span>Email</span>
                <a href={`mailto:${detail.email}`}>
                  <Mail size={14} /> {detail.email}
                </a>
              </div>
              <div>
                <span>Phone</span>
                {detail.phone ? (
                  <a href={`tel:${detail.phone.replace(/[^+\d]/g, '')}`}>
                    <Phone size={14} /> {detail.phone}
                  </a>
                ) : (
                  <strong>Not provided</strong>
                )}
              </div>
              <div>
                <span>Industry</span>
                <strong>{detail.industry || 'Not set'}</strong>
              </div>
              <div>
                <span>City</span>
                <strong>
                  <MapPin size={14} /> {detail.city || 'Not set'}
                </strong>
              </div>
            </div>

            {detail.notes && (
              <section className="admin-enquiry-brief">
                <span>Internal notes</span>
                <p>{detail.notes}</p>
              </section>
            )}

            <section className="admin-related-section">
              <div className="admin-related-section__head">
                <h3>Enquiries</h3>
                <span>{detail.enquiries.length}</span>
              </div>
              {detail.enquiries.length === 0 ? (
                <p className="admin-related-empty">No enquiries linked to this client yet.</p>
              ) : (
                <div className="admin-related-list">
                  {detail.enquiries.map((enquiry) => (
                    <div key={enquiry.id}>
                      <span>
                        <strong>{enquiry.eventType}</strong>
                        <small>
                          {enquiry.eventDate ? formatDate(enquiry.eventDate) : 'Date flexible'} ·{' '}
                          {relativeTime(enquiry.createdAt)}
                        </small>
                      </span>
                      <StatusPill status={enquiry.status} />
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="admin-related-section">
              <div className="admin-related-section__head">
                <h3>Quotations</h3>
                <span>{detail.quotations.length}</span>
              </div>
              {detail.quotations.length === 0 ? (
                <p className="admin-related-empty">No quotations linked to this client yet.</p>
              ) : (
                <div className="admin-related-list">
                  {detail.quotations.map((quotation) => (
                    <div key={quotation.id}>
                      <span>
                        <strong>
                          {quotation.number} · {quotation.projectTitle}
                        </strong>
                        <small>
                          {formatCurrency(quotation.totalPaise / 100)} ·{' '}
                          {relativeTime(quotation.createdAt)}
                        </small>
                      </span>
                      <StatusPill status={quotation.status} />
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="admin-related-section">
              <div className="admin-related-section__head">
                <h3>Projects</h3>
                <span>{detail.projects.length}</span>
              </div>
              {detail.projects.length === 0 ? (
                <p className="admin-related-empty">No portfolio projects linked to this client yet.</p>
              ) : (
                <div className="admin-related-list">
                  {detail.projects.map((project) => (
                    <div key={project.id}>
                      <span>
                        <strong>{project.title}</strong>
                        <small>/{project.slug}</small>
                      </span>
                      <StatusPill status={project.status === 'published' ? 'Published' : 'Draft'} />
                    </div>
                  ))}
                </div>
              )}
            </section>

            <a href="/admin/quotations" className="admin-inline-link">
              Open quotation desk <ArrowUpRight size={14} />
            </a>
          </div>
        )}
      </Drawer>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) void handleDelete(deleteTarget)
        }}
        title="Delete this client?"
        description={
          deleteTarget
            ? `“${deleteTarget.company}” will be permanently removed. Clients with linked enquiries, quotations or projects cannot be deleted.`
            : ''
        }
        confirmLabel="Delete client"
      />
    </div>
  )
}
