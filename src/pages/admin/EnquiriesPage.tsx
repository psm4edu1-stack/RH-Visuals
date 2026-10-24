import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  CalendarDays,
  CircleAlert,
  Inbox,
  LoaderCircle,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  Trash2,
  UsersRound,
  Wallet,
} from 'lucide-react'
import { AdminPageHeader } from '../../components/admin/AdminUI'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { EmptyState } from '../../components/ui/EmptyState'
import { Drawer } from '../../components/ui/Overlay'
import { StatusPill } from '../../components/ui/StatusPill'
import { useToast } from '../../components/ui/Toast'
import { ApiError, api } from '../../lib/api'
import { formatCurrency, formatDate, formatDateTime, relativeTime } from '../../lib/utils'
import type { EnquiryRecord, EnquiryStatus } from '../../types'

const tabs: Array<'All' | EnquiryStatus> = ['All', 'Pending', 'Contacted', 'Completed', 'Archived']
const statusLabels: EnquiryStatus[] = ['Pending', 'Contacted', 'Completed', 'Archived']

export function EnquiriesPage() {
  const { toast } = useToast()
  const [searchParams] = useSearchParams()
  const openedFromUrl = useRef(false)
  const [enquiries, setEnquiries] = useState<EnquiryRecord[]>([])
  const [status, setStatus] = useState<'All' | EnquiryStatus>('All')
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<EnquiryRecord | null>(null)
  const [draftStatus, setDraftStatus] = useState<EnquiryStatus>('Pending')
  const [draftNotes, setDraftNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<EnquiryRecord | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await api.admin.enquiries.list({ status, q: search })
      setEnquiries(result.enquiries)
    } catch (loadError) {
      setError(
        loadError instanceof ApiError ? loadError.message : 'Enquiries could not be loaded.',
      )
    } finally {
      setLoading(false)
    }
  }, [status, search])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const openId = searchParams.get('open')
    if (!openId || openedFromUrl.current) return
    openedFromUrl.current = true
    api.admin.enquiries
      .get(openId)
      .then((result) => setSelected(result.enquiry))
      .catch((openError) => {
        toast('Enquiry not found', {
          description:
            openError instanceof ApiError ? openError.message : 'The record could not be opened.',
          tone: 'error',
        })
      })
  }, [searchParams, toast])

  useEffect(() => {
    if (!selected) return
    setDraftStatus(selected.status)
    setDraftNotes(selected.notes)
  }, [selected])

  const openEnquiry = (enquiry: EnquiryRecord) => setSelected(enquiry)

  const saveEnquiry = async () => {
    if (!selected) return
    setSaving(true)
    try {
      const result = await api.admin.enquiries.update(selected.id, {
        status: draftStatus,
        notes: draftNotes,
      })
      setSelected(result.enquiry)
      toast('Enquiry updated', {
        description: `${result.enquiry.name} is now ${result.enquiry.status.toLowerCase()}.`,
      })
      await load()
    } catch (saveError) {
      toast('Enquiry not updated', {
        description:
          saveError instanceof ApiError ? saveError.message : 'The update could not be saved.',
        tone: 'error',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (enquiry: EnquiryRecord) => {
    try {
      await api.admin.enquiries.remove(enquiry.id)
      setEnquiries((current) => current.filter((item) => item.id !== enquiry.id))
      if (selected?.id === enquiry.id) setSelected(null)
      setDeleteTarget(null)
      toast('Enquiry deleted', { description: enquiry.name })
    } catch (deleteError) {
      toast('Enquiry not deleted', {
        description:
          deleteError instanceof ApiError ? deleteError.message : 'The record could not be deleted.',
        tone: 'error',
      })
    }
  }

  return (
    <div className="admin-page">
      <AdminPageHeader
        overline="Audience"
        title="Enquiries & Bookings"
        description="Customer details, event briefs and booking status. These records are private and only available inside an authenticated studio session."
        actions={
          <button type="button" className="btn btn--quiet btn--small" onClick={() => void load()}>
            <RefreshCw size={14} /> Refresh
          </button>
        }
      />

      <div className="admin-enquiry-toolbar">
        <div className="admin-tabs" role="tablist" aria-label="Filter enquiries by status">
          {tabs.map((tab) => (
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
            placeholder="Search name, email, company…"
            aria-label="Search enquiries"
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
            <strong>Enquiries unavailable</strong>
            <p>{error}</p>
          </div>
          <button type="button" className="btn btn--quiet btn--small" onClick={() => void load()}>
            Try again
          </button>
        </div>
      )}

      {loading ? (
        <div className="admin-loading-panel" role="status">
          <LoaderCircle size={20} className="is-spinning" /> Loading enquiry records…
        </div>
      ) : enquiries.length === 0 ? (
        <div className="panel admin-panel-pad">
          <EmptyState
            icon={<Inbox size={22} />}
            title={search || status !== 'All' ? 'No matching enquiries' : 'No enquiries yet'}
            description={
              search || status !== 'All'
                ? 'Try another search or clear the status filter.'
                : 'Contact and booking submissions from the public website will be stored here.'
            }
          />
        </div>
      ) : (
        <div className="panel admin-table-panel">
          <div className="table-scroll">
            <table className="data-table admin-enquiry-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Event</th>
                  <th>Budget / venue</th>
                  <th>Received</th>
                  <th>Status</th>
                  <th className="align-right">Open</th>
                </tr>
              </thead>
              <tbody>
                {enquiries.map((enquiry) => (
                  <tr key={enquiry.id} className={selected?.id === enquiry.id ? 'is-selected' : ''}>
                    <td>
                      <button
                        type="button"
                        className="table-primary"
                        onClick={() => openEnquiry(enquiry)}
                      >
                        {enquiry.name}
                      </button>
                      <small className="admin-table-sub">
                        {enquiry.company || enquiry.email}
                      </small>
                    </td>
                    <td>
                      <strong className="admin-table-strong">{enquiry.eventType}</strong>
                      <small className="admin-table-sub">
                        {enquiry.eventDate ? formatDate(enquiry.eventDate) : 'Date flexible'}
                      </small>
                    </td>
                    <td>
                      <strong className="admin-table-strong">
                        {enquiry.budget ? formatCurrency(enquiry.budget) : 'Not set'}
                      </strong>
                      <small className="admin-table-sub">
                        {enquiry.venue || 'Venue to confirm'}
                      </small>
                    </td>
                    <td>{relativeTime(enquiry.createdAt)}</td>
                    <td>
                      <StatusPill status={enquiry.status} />
                    </td>
                    <td className="align-right">
                      <button
                        type="button"
                        className="btn btn--quiet btn--small"
                        onClick={() => openEnquiry(enquiry)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Drawer
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected ? selected.name : 'Enquiry'}
        eyebrow={selected ? `${selected.eventType} · ${relativeTime(selected.createdAt)}` : undefined}
        description={selected ? `Reference ${selected.id.slice(0, 8).toUpperCase()}` : undefined}
        width="lg"
        footer={
          selected ? (
            <>
              <button
                type="button"
                className="btn btn--danger-quiet"
                onClick={() => setDeleteTarget(selected)}
              >
                <Trash2 size={14} /> Delete
              </button>
              <span className="admin-drawer-footer-spacer" />
              <button type="button" className="btn btn--quiet" onClick={() => setSelected(null)}>
                Close
              </button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => void saveEnquiry()}
                disabled={saving}
              >
                {saving ? <LoaderCircle size={15} className="is-spinning" /> : null}
                {saving ? 'Saving…' : 'Save update'}
              </button>
            </>
          ) : null
        }
      >
        {selected && (
          <div className="admin-enquiry-detail">
            <div className="admin-enquiry-detail__status">
              <StatusPill status={selected.status} />
              <span>Received {formatDateTime(selected.createdAt)}</span>
            </div>

            <div className="admin-detail-grid">
              <div>
                <span>Email</span>
                <a href={`mailto:${selected.email}`}>
                  <Mail size={14} /> {selected.email}
                </a>
              </div>
              <div>
                <span>Phone</span>
                {selected.phone ? (
                  <a href={`tel:${selected.phone.replace(/[^+\d]/g, '')}`}>
                    <Phone size={14} /> {selected.phone}
                  </a>
                ) : (
                  <strong>Not provided</strong>
                )}
              </div>
              <div>
                <span>Company</span>
                <strong>{selected.company || 'Independent'}</strong>
              </div>
              <div>
                <span>Event date</span>
                <strong>
                  <CalendarDays size={14} />{' '}
                  {selected.eventDate ? formatDate(selected.eventDate) : 'Flexible'}
                </strong>
              </div>
              <div>
                <span>Venue / city</span>
                <strong>
                  <MapPin size={14} /> {selected.venue || 'To confirm'}
                </strong>
              </div>
              <div>
                <span>Expected audience</span>
                <strong>
                  <UsersRound size={14} />{' '}
                  {selected.audienceSize
                    ? selected.audienceSize.toLocaleString('en-IN')
                    : 'Not provided'}
                </strong>
              </div>
              <div>
                <span>Budget</span>
                <strong>
                  <Wallet size={14} />{' '}
                  {selected.budget ? formatCurrency(selected.budget) : 'Not provided'}
                </strong>
              </div>
            </div>

            {selected.services.length > 0 && (
              <div className="admin-enquiry-services">
                <span>Services requested</span>
                <div>
                  {selected.services.map((service) => (
                    <em key={service}>{service}</em>
                  ))}
                </div>
              </div>
            )}

            <section className="admin-enquiry-brief">
              <span>Event brief</span>
              <p>{selected.message}</p>
            </section>

            <div className="form-grid form-grid--two admin-enquiry-controls">
              <label className="field">
                <span>Status</span>
                <select
                  value={draftStatus}
                  onChange={(event) => setDraftStatus(event.target.value as EnquiryStatus)}
                >
                  {statusLabels.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Source</span>
                <input value={selected.source} readOnly />
              </label>
            </div>

            <label className="field">
              <span>Internal notes</span>
              <textarea
                rows={4}
                value={draftNotes}
                onChange={(event) => setDraftNotes(event.target.value)}
                placeholder="Private follow-up notes for the studio team."
              />
            </label>
          </div>
        )}
      </Drawer>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) void handleDelete(deleteTarget)
        }}
        title="Delete this enquiry?"
        description={
          deleteTarget
            ? `The enquiry from ${deleteTarget.name} will be permanently removed. Customer data cannot be recovered after deletion.`
            : ''
        }
        confirmLabel="Delete enquiry"
      />
    </div>
  )
}
