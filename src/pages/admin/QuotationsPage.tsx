import { useCallback, useEffect, useState } from 'react'
import {
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  Download,
  FileText,
  LoaderCircle,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Send,
  Trash2,
  UsersRound,
  XCircle,
} from 'lucide-react'
import { AdminPageHeader } from '../../components/admin/AdminUI'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { EmptyState } from '../../components/ui/EmptyState'
import { Drawer, Modal } from '../../components/ui/Overlay'
import { StatusPill } from '../../components/ui/StatusPill'
import { useToast } from '../../components/ui/Toast'
import { ApiError, api } from '../../lib/api'
import { formatCurrency, formatDate, relativeTime } from '../../lib/utils'
import type { ClientRecord, QuotationRecord, QuotationStatus } from '../../types'

type QuotationCounts = {
  total: number
  pipelinePaise: number
  acceptedPaise: number
} & Record<QuotationStatus, number>

type LineItemForm = {
  description: string
  detail: string
  quantity: string
  unit: string
  unitPrice: string
}

type QuotationForm = {
  clientId: string
  projectTitle: string
  eventType: string
  eventDate: string
  venue: string
  guests: string
  validUntil: string
  notes: string
  discount: string
  gstRate: string
  lineItems: LineItemForm[]
}

const quotationStatuses: QuotationStatus[] = [
  'Draft',
  'Issued',
  'Accepted',
  'Rejected',
  'Expired',
  'Cancelled',
]
const tabs: Array<'All' | QuotationStatus> = ['All', ...quotationStatuses]

const transitions: Record<QuotationStatus, QuotationStatus[]> = {
  Draft: ['Issued', 'Cancelled'],
  Issued: ['Accepted', 'Rejected', 'Expired', 'Cancelled'],
  Accepted: [],
  Rejected: [],
  Expired: [],
  Cancelled: [],
}

const transitionLabels: Partial<Record<QuotationStatus, string>> = {
  Issued: 'Mark issued',
  Accepted: 'Accept',
  Rejected: 'Reject',
  Expired: 'Mark expired',
  Cancelled: 'Cancel quotation',
}

function blankLineItem(): LineItemForm {
  return {
    description: '',
    detail: '',
    quantity: '1',
    unit: 'unit',
    unitPrice: '',
  }
}

function emptyForm(gstRate: string): QuotationForm {
  return {
    clientId: '',
    projectTitle: '',
    eventType: '',
    eventDate: '',
    venue: '',
    guests: '0',
    validUntil: '',
    notes: '',
    discount: '',
    gstRate,
    lineItems: [blankLineItem()],
  }
}

function toForm(quotation: QuotationRecord): QuotationForm {
  return {
    clientId: quotation.clientId ?? '',
    projectTitle: quotation.projectTitle,
    eventType: quotation.eventType,
    eventDate: quotation.eventDate,
    venue: quotation.venue,
    guests: String(quotation.guests),
    validUntil: quotation.validUntil,
    notes: quotation.notes,
    discount: quotation.discountPaise ? String(quotation.discountPaise / 100) : '',
    gstRate: String(quotation.gstRateBps / 100),
    lineItems:
      quotation.lineItems.length > 0
        ? quotation.lineItems.map((item) => ({
            description: item.description,
            detail: item.detail,
            quantity: String(item.quantity),
            unit: item.unit,
            unitPrice: String(item.unitPricePaise / 100),
          }))
        : [blankLineItem()],
  }
}

function lineTotal(item: LineItemForm) {
  const quantity = Number(item.quantity)
  const rate = Number(item.unitPrice)
  if (!Number.isFinite(quantity) || !Number.isFinite(rate)) return 0
  return Math.max(0, quantity) * Math.max(0, rate)
}

export function QuotationsPage() {
  const { toast } = useToast()
  const [quotations, setQuotations] = useState<QuotationRecord[]>([])
  const [counts, setCounts] = useState<QuotationCounts | null>(null)
  const [clients, setClients] = useState<ClientRecord[]>([])
  const [defaultGstRate, setDefaultGstRate] = useState('18')
  const [status, setStatus] = useState<'All' | QuotationStatus>('All')
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<QuotationRecord | null>(null)
  const [form, setForm] = useState<QuotationForm>(emptyForm('18'))
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [detail, setDetail] = useState<QuotationRecord | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')
  const [statusSaving, setStatusSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<QuotationRecord | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await api.admin.quotations.list({ status, q: search })
      setQuotations(result.quotations)
      setCounts(result.counts)
    } catch (loadError) {
      setError(
        loadError instanceof ApiError ? loadError.message : 'Quotations could not be loaded.',
      )
    } finally {
      setLoading(false)
    }
  }, [status, search])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    let active = true
    Promise.allSettled([api.admin.clients.list(), api.admin.settings.get()]).then(
      ([clientResult, settingsResult]) => {
        if (!active) return
        if (clientResult.status === 'fulfilled') setClients(clientResult.value.clients)
        if (settingsResult.status === 'fulfilled') {
          setDefaultGstRate(String(settingsResult.value.settings.defaultGstRate))
        }
      },
    )
    return () => {
      active = false
    }
  }, [])

  const openCreate = () => {
    setForm(emptyForm(defaultGstRate))
    setEditing(null)
    setFieldErrors({})
    setEditorOpen(true)
  }

  const openEdit = async (quotation: QuotationRecord) => {
    if (quotation.status !== 'Draft') {
      toast('Only drafts can be edited', {
        description: 'Issue a new draft for changes after a quotation has been issued.',
        tone: 'info',
      })
      return
    }
    try {
      const result = await api.admin.quotations.get(quotation.id)
      setForm(toForm(result.quotation))
      setEditing(result.quotation)
      setFieldErrors({})
      setDetail(null)
      setEditorOpen(true)
    } catch (loadError) {
      toast('Quotation not opened', {
        description:
          loadError instanceof ApiError ? loadError.message : 'The draft could not be loaded.',
        tone: 'error',
      })
    }
  }

  const openDetail = async (quotation: QuotationRecord) => {
    setDetail(quotation)
    setDetailError('')
    setDetailLoading(true)
    try {
      const result = await api.admin.quotations.get(quotation.id)
      setDetail(result.quotation)
    } catch (loadError) {
      setDetailError(
        loadError instanceof ApiError
          ? loadError.message
          : 'The quotation details could not be loaded.',
      )
    } finally {
      setDetailLoading(false)
    }
  }

  const update = (field: keyof QuotationForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
    if (fieldErrors[field]) {
      setFieldErrors((current) => {
        const next = { ...current }
        delete next[field]
        return next
      })
    }
  }

  const updateItem = (index: number, field: keyof LineItemForm, value: string) => {
    setForm((current) => ({
      ...current,
      lineItems: current.lineItems.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    }))
    const errorKey = `lineItems.${index}.${field}`
    if (fieldErrors[errorKey]) {
      setFieldErrors((current) => {
        const next = { ...current }
        delete next[errorKey]
        return next
      })
    }
  }

  const addLine = () => {
    setForm((current) => ({ ...current, lineItems: [...current.lineItems, blankLineItem()] }))
  }

  const removeLine = (index: number) => {
    setForm((current) => ({
      ...current,
      lineItems:
        current.lineItems.length === 1
          ? [blankLineItem()]
          : current.lineItems.filter((_, itemIndex) => itemIndex !== index),
    }))
  }

  const handleSave = async () => {
    if (saving) return
    setSaving(true)
    setFieldErrors({})
    try {
      const payload = {
        clientId: form.clientId,
        projectTitle: form.projectTitle,
        eventType: form.eventType,
        eventDate: form.eventDate,
        venue: form.venue,
        guests: Number(form.guests) || 0,
        validUntil: form.validUntil,
        notes: form.notes,
        discount: form.discount === '' ? 0 : Number(form.discount),
        gstRate: form.gstRate === '' ? 0 : Number(form.gstRate),
        lineItems: form.lineItems.map((item) => ({
          description: item.description,
          detail: item.detail,
          quantity: Number(item.quantity) || 0,
          unit: item.unit,
          unitPrice: item.unitPrice === '' ? 0 : Number(item.unitPrice),
        })),
      }
      const result = editing
        ? await api.admin.quotations.update(editing.id, payload)
        : await api.admin.quotations.create(payload)
      setEditorOpen(false)
      setDetail(result.quotation)
      toast(editing ? 'Draft updated' : 'Quotation created', {
        description: `${result.quotation.number} · ${formatCurrency(result.quotation.totalPaise / 100)}`,
      })
      await load()
    } catch (saveError) {
      if (saveError instanceof ApiError) {
        setFieldErrors(saveError.fields ?? {})
        if (!saveError.fields) setError(saveError.message)
        toast('Quotation not saved', { description: saveError.message, tone: 'error' })
      } else {
        toast('Quotation not saved', {
          description: 'The API server could not complete the save.',
          tone: 'error',
        })
      }
    } finally {
      setSaving(false)
    }
  }

  const changeStatus = async (quotation: QuotationRecord, nextStatus: QuotationStatus) => {
    if (statusSaving) return
    setStatusSaving(true)
    try {
      const result = await api.admin.quotations.setStatus(quotation.id, nextStatus)
      setDetail(result.quotation)
      setQuotations((current) =>
        current.map((item) => (item.id === result.quotation.id ? result.quotation : item)),
      )
      toast(`Quotation ${nextStatus.toLowerCase()}`, {
        description: `${result.quotation.number} is now ${nextStatus}.`,
      })
      await load()
    } catch (statusError) {
      toast('Status not changed', {
        description:
          statusError instanceof ApiError ? statusError.message : 'The status could not be updated.',
        tone: 'error',
      })
    } finally {
      setStatusSaving(false)
    }
  }

  const handleDelete = async (quotation: QuotationRecord) => {
    try {
      await api.admin.quotations.remove(quotation.id)
      setQuotations((current) => current.filter((item) => item.id !== quotation.id))
      if (detail?.id === quotation.id) setDetail(null)
      setDeleteTarget(null)
      toast('Draft deleted', { description: quotation.number })
      await load()
    } catch (deleteError) {
      toast('Quotation not deleted', {
        description:
          deleteError instanceof ApiError
            ? deleteError.message
            : 'The quotation could not be deleted.',
        tone: 'error',
      })
    }
  }

  const clientName = (quotation: QuotationRecord) =>
    quotation.clientCompany || quotation.clientContact || 'Unlinked client'

  const errorFor = (key: string) => fieldErrors[key]

  return (
    <div className="admin-page">
      <AdminPageHeader
        overline="Commercial"
        title="Quotations"
        description="Draft, issue and track studio quotations. Line items, discounts, GST and totals are calculated and stored by the API server."
        actions={
          <>
            <button type="button" className="btn btn--quiet btn--small" onClick={() => void load()}>
              <RefreshCw size={14} /> Refresh
            </button>
            <button type="button" className="btn btn--primary btn--small" onClick={openCreate}>
              <Plus size={15} /> New quotation
            </button>
          </>
        }
      />

      <div className="admin-enquiry-toolbar">
        <div className="admin-tabs" role="tablist" aria-label="Filter quotations by status">
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
              {tab !== 'All' && counts ? <small>{counts[tab]}</small> : null}
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
            placeholder="Search number, project or client…"
            aria-label="Search quotations"
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
            <strong>Quotations unavailable</strong>
            <p>{error}</p>
          </div>
          <button type="button" className="btn btn--quiet btn--small" onClick={() => void load()}>
            Try again
          </button>
        </div>
      )}

      {counts && (
        <div className="admin-summary-row">
          <span>{counts.total} quotation{counts.total === 1 ? '' : 's'}</span>
          <span>Pipeline {formatCurrency(counts.pipelinePaise / 100)}</span>
          <span>Accepted {formatCurrency(counts.acceptedPaise / 100)}</span>
        </div>
      )}

      {loading ? (
        <div className="admin-loading-panel" role="status">
          <LoaderCircle size={20} className="is-spinning" /> Loading quotations…
        </div>
      ) : quotations.length === 0 ? (
        <div className="panel admin-panel-pad">
          <EmptyState
            icon={<FileText size={22} />}
            title={search || status !== 'All' ? 'No matching quotations' : 'No quotations yet'}
            description={
              search || status !== 'All'
                ? 'Try another search or clear the status filter.'
                : clients.length === 0
                  ? 'Add a client first, then create a draft quotation with line items. Totals are calculated by the server.'
                  : 'Create a draft quotation for a client. The API calculates line totals, discount, GST and the final INR total.'
            }
            action={
              clients.length === 0 ? (
                <a href="/admin/clients" className="btn btn--primary btn--small">
                  <UsersRound size={14} /> Add a client
                </a>
              ) : (
                <button type="button" className="btn btn--primary btn--small" onClick={openCreate}>
                  <Plus size={14} /> Create the first quotation
                </button>
              )
            }
          />
        </div>
      ) : (
        <div className="panel admin-table-panel">
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Quotation</th>
                  <th>Client / project</th>
                  <th>Event</th>
                  <th>Value</th>
                  <th>Status</th>
                  <th>Updated</th>
                  <th className="align-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {quotations.map((quotation) => (
                  <tr key={quotation.id}>
                    <td>
                      <button
                        type="button"
                        className="table-primary"
                        onClick={() => void openDetail(quotation)}
                      >
                        {quotation.number}
                      </button>
                      <small className="admin-table-sub">
                        {quotation.itemCount ?? quotation.lineItems.length} line item
                        {(quotation.itemCount ?? quotation.lineItems.length) === 1 ? '' : 's'}
                      </small>
                    </td>
                    <td>
                      <strong className="admin-table-strong">{clientName(quotation)}</strong>
                      <small className="admin-table-sub">{quotation.projectTitle}</small>
                    </td>
                    <td>
                      <strong className="admin-table-strong">
                        {quotation.eventDate ? formatDate(quotation.eventDate) : 'Date flexible'}
                      </strong>
                      <small className="admin-table-sub">{quotation.venue || 'Venue to confirm'}</small>
                    </td>
                    <td>
                      <strong className="admin-table-strong">
                        {formatCurrency(quotation.totalPaise / 100)}
                      </strong>
                      <small className="admin-table-sub">
                        GST {formatCurrency(quotation.gstPaise / 100)}
                      </small>
                    </td>
                    <td>
                      <StatusPill status={quotation.status} />
                    </td>
                    <td>{relativeTime(quotation.updatedAt)}</td>
                    <td>
                      <div className="admin-row-actions">
                        <button
                          type="button"
                          onClick={() => void openDetail(quotation)}
                          title="View quotation"
                        >
                          <FileText size={15} />
                        </button>
                        {quotation.status === 'Draft' && (
                          <button
                            type="button"
                            onClick={() => void openEdit(quotation)}
                            title="Edit draft"
                          >
                            <Pencil size={15} />
                          </button>
                        )}
                        <a
                          href={api.admin.quotations.pdfUrl(quotation.id)}
                          target="_blank"
                          rel="noreferrer"
                          title="Download PDF"
                        >
                          <Download size={15} />
                        </a>
                        {quotation.status === 'Draft' && (
                          <button
                            type="button"
                            className="is-danger"
                            onClick={() => setDeleteTarget(quotation)}
                            title="Delete draft"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
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
        title={editing ? 'Edit draft quotation' : 'New quotation'}
        eyebrow="Server-calculated quotation"
        description="The API recalculates every line total, the flat discount, GST and the final total when you save. The preview below is not authoritative."
        size="xl"
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
              {saving ? 'Calculating & saving…' : editing ? 'Save draft' : 'Create draft'}
            </button>
          </>
        }
      >
        <div className="admin-form">
          {clients.length === 0 && (
            <div className="admin-alert admin-alert--info" role="status">
              <UsersRound size={18} />
              <div>
                <strong>No clients available</strong>
                <p>
                  Add a client before creating a quotation. <a href="/admin/clients">Open Clients</a>
                </p>
              </div>
            </div>
          )}

          <div className="form-grid form-grid--two">
            <label className="field">
              <span>Client *</span>
              <select
                value={form.clientId}
                onChange={(event) => update('clientId', event.target.value)}
              >
                <option value="">Choose a client…</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.company} — {client.contactName}
                  </option>
                ))}
              </select>
              {errorFor('clientId') && (
                <small className="admin-field-error">{errorFor('clientId')}</small>
              )}
            </label>
            <label className="field">
              <span>Project title *</span>
              <input
                value={form.projectTitle}
                onChange={(event) => update('projectTitle', event.target.value)}
                placeholder="The project this quotation covers"
              />
              {errorFor('projectTitle') && (
                <small className="admin-field-error">{errorFor('projectTitle')}</small>
              )}
            </label>
          </div>

          <div className="form-grid form-grid--three">
            <label className="field">
              <span>Event type</span>
              <input
                value={form.eventType}
                onChange={(event) => update('eventType', event.target.value)}
                placeholder="Concert, launch, wedding…"
              />
            </label>
            <label className="field">
              <span>Event date</span>
              <input
                type="date"
                value={form.eventDate}
                onChange={(event) => update('eventDate', event.target.value)}
              />
              {errorFor('eventDate') && (
                <small className="admin-field-error">{errorFor('eventDate')}</small>
              )}
            </label>
            <label className="field">
              <span>Valid until</span>
              <input
                type="date"
                value={form.validUntil}
                onChange={(event) => update('validUntil', event.target.value)}
              />
              {errorFor('validUntil') && (
                <small className="admin-field-error">{errorFor('validUntil')}</small>
              )}
            </label>
          </div>

          <div className="form-grid form-grid--three">
            <label className="field">
              <span>Venue</span>
              <input
                value={form.venue}
                onChange={(event) => update('venue', event.target.value)}
              />
            </label>
            <label className="field">
              <span>Guests</span>
              <input
                type="number"
                min="0"
                value={form.guests}
                onChange={(event) => update('guests', event.target.value)}
              />
              {errorFor('guests') && (
                <small className="admin-field-error">{errorFor('guests')}</small>
              )}
            </label>
            <label className="field">
              <span>Flat discount (INR)</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.discount}
                onChange={(event) => update('discount', event.target.value)}
                placeholder="0"
              />
              {errorFor('discount') && (
                <small className="admin-field-error">{errorFor('discount')}</small>
              )}
            </label>
          </div>

          <div className="line-items-section">
            <div className="panel__header admin-line-items-head">
              <div>
                <p className="panel__eyebrow">Line items</p>
                <h2>Scope and pricing</h2>
                <p>Add at least one line item. The server calculates the subtotal and GST.</p>
              </div>
              <button type="button" className="btn btn--quiet btn--small" onClick={addLine}>
                <Plus size={14} /> Add line
              </button>
            </div>

            {errorFor('lineItems') && (
              <div className="admin-alert admin-alert--error" role="alert">
                <CircleAlert size={18} />
                <div>
                  <strong>Line items need attention</strong>
                  <p>{errorFor('lineItems')}</p>
                </div>
              </div>
            )}

            <div className="line-items">
              <div className="line-items__head" aria-hidden="true">
                <span>Description</span>
                <span>Unit</span>
                <span>Qty</span>
                <span>Rate (INR)</span>
                <span>Preview</span>
                <span />
              </div>
              {form.lineItems.map((item, index) => (
                <div className="line-item" key={index}>
                  <span className="line-item__index">{String(index + 1).padStart(2, '0')}</span>
                  <div className="line-item__description">
                    <input
                      value={item.description}
                      onChange={(event) => updateItem(index, 'description', event.target.value)}
                      placeholder="Line item description"
                      aria-label={`Line ${index + 1} description`}
                    />
                    <input
                      value={item.detail}
                      onChange={(event) => updateItem(index, 'detail', event.target.value)}
                      placeholder="Add detail (optional)"
                      className="line-item__detail"
                      aria-label={`Line ${index + 1} detail`}
                    />
                    {errorFor(`lineItems.${index}.description`) && (
                      <small className="admin-field-error">
                        {errorFor(`lineItems.${index}.description`)}
                      </small>
                    )}
                  </div>
                  <label className="line-item__category">
                    <span className="mobile-inline-label">Unit</span>
                    <select
                      value={item.unit}
                      onChange={(event) => updateItem(index, 'unit', event.target.value)}
                      aria-label={`Line ${index + 1} unit`}
                    >
                      <option value="unit">unit</option>
                      <option value="day">day</option>
                      <option value="event">event</option>
                      <option value="hour">hour</option>
                      <option value="setup">setup</option>
                      <option value="person">person</option>
                    </select>
                  </label>
                  <label className="line-item__numeric">
                    <span className="mobile-inline-label">Qty</span>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={item.quantity}
                      onChange={(event) => updateItem(index, 'quantity', event.target.value)}
                      aria-label={`Line ${index + 1} quantity`}
                    />
                    {errorFor(`lineItems.${index}.quantity`) && (
                      <small className="admin-field-error">
                        {errorFor(`lineItems.${index}.quantity`)}
                      </small>
                    )}
                  </label>
                  <label className="line-item__numeric">
                    <span className="mobile-inline-label">Rate</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(event) => updateItem(index, 'unitPrice', event.target.value)}
                      aria-label={`Line ${index + 1} rate`}
                      placeholder="0.00"
                    />
                    {errorFor(`lineItems.${index}.unitPrice`) && (
                      <small className="admin-field-error">
                        {errorFor(`lineItems.${index}.unitPrice`)}
                      </small>
                    )}
                  </label>
                  <span className="line-item__total">{formatCurrency(lineTotal(item))}</span>
                  <button
                    type="button"
                    className="line-item__remove"
                    onClick={() => removeLine(index)}
                    aria-label={`Remove line ${index + 1}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="form-grid form-grid--two">
            <label className="field">
              <span>GST rate (%)</span>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={form.gstRate}
                onChange={(event) => update('gstRate', event.target.value)}
              />
              {errorFor('gstRate') && (
                <small className="admin-field-error">{errorFor('gstRate')}</small>
              )}
            </label>
            <div className="admin-form-note">
              <FileText size={15} />
              <p>
                The server recalculates all totals in paise and stores the authoritative amount.
                Preview values are for editing only.
              </p>
            </div>
          </div>

          <label className="field">
            <span>Notes / terms</span>
            <textarea
              rows={4}
              value={form.notes}
              onChange={(event) => update('notes', event.target.value)}
              placeholder="Payment terms, inclusions or production notes."
            />
            {errorFor('notes') && (
              <small className="admin-field-error">{errorFor('notes')}</small>
            )}
          </label>
        </div>
      </Modal>

      <Drawer
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title={detail ? detail.number : 'Quotation'}
        eyebrow={detail ? `${clientName(detail)} · ${detail.status}` : undefined}
        description={detail ? `Created ${formatDate(detail.createdAt)}` : undefined}
        width="lg"
        footer={
          detail ? (
            <>
              {detail.status === 'Draft' && (
                <button
                  type="button"
                  className="btn btn--danger-quiet"
                  onClick={() => setDeleteTarget(detail)}
                >
                  <Trash2 size={14} /> Delete draft
                </button>
              )}
              <span className="admin-drawer-footer-spacer" />
              <a
                href={api.admin.quotations.pdfUrl(detail.id)}
                target="_blank"
                rel="noreferrer"
                className="btn btn--quiet"
              >
                <Download size={14} /> PDF
              </a>
              {detail.status === 'Draft' && (
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={() => void openEdit(detail)}
                >
                  <Pencil size={14} /> Edit draft
                </button>
              )}
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
                <LoaderCircle size={18} className="is-spinning" /> Loading quotation…
              </div>
            )}

            {detailError && (
              <div className="admin-alert admin-alert--error" role="alert">
                <CircleAlert size={18} />
                <div>
                  <strong>Quotation unavailable</strong>
                  <p>{detailError}</p>
                </div>
              </div>
            )}

            <div className="admin-detail-grid">
              <div>
                <span>Client</span>
                <strong>{clientName(detail)}</strong>
              </div>
              <div>
                <span>Project</span>
                <strong>{detail.projectTitle}</strong>
              </div>
              <div>
                <span>Event date</span>
                <strong>
                  <CalendarDays size={14} />{' '}
                  {detail.eventDate ? formatDate(detail.eventDate) : 'Flexible'}
                </strong>
              </div>
              <div>
                <span>Venue</span>
                <strong>
                  <MapPin size={14} /> {detail.venue || 'To confirm'}
                </strong>
              </div>
              <div>
                <span>Guests</span>
                <strong>
                  <UsersRound size={14} />{' '}
                  {detail.guests ? detail.guests.toLocaleString('en-IN') : 'Not set'}
                </strong>
              </div>
              <div>
                <span>Valid until</span>
                <strong>{detail.validUntil ? formatDate(detail.validUntil) : 'Not set'}</strong>
              </div>
            </div>

            <section className="admin-related-section">
              <div className="admin-related-section__head">
                <h3>Line items</h3>
                <span>{detail.lineItems.length}</span>
              </div>
              <div className="table-scroll">
                <table className="data-table admin-quote-detail-table">
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th>Qty</th>
                      <th>Rate</th>
                      <th className="align-right">Line total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.lineItems.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <strong className="admin-table-strong">{item.description}</strong>
                          {item.detail && <small className="admin-table-sub">{item.detail}</small>}
                        </td>
                        <td>
                          {item.quantity} {item.unit}
                        </td>
                        <td>{formatCurrency(item.unitPricePaise / 100)}</td>
                        <td className="align-right">
                          {formatCurrency((item.quantity * item.unitPricePaise) / 100)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="admin-quote-totals">
              <div>
                <span>Subtotal</span>
                <strong>{formatCurrency(detail.subtotalPaise / 100)}</strong>
              </div>
              <div>
                <span>Discount</span>
                <strong>− {formatCurrency(detail.discountPaise / 100)}</strong>
              </div>
              <div>
                <span>GST ({detail.gstRateBps / 100}%)</span>
                <strong>{formatCurrency(detail.gstPaise / 100)}</strong>
              </div>
              <div className="admin-quote-totals__grand">
                <span>Total (INR)</span>
                <strong>{formatCurrency(detail.totalPaise / 100)}</strong>
              </div>
            </section>

            {detail.notes && (
              <section className="admin-enquiry-brief">
                <span>Notes / terms</span>
                <p>{detail.notes}</p>
              </section>
            )}

            {transitions[detail.status].length > 0 && (
              <section className="admin-related-section">
                <div className="admin-related-section__head">
                  <h3>Next action</h3>
                  <span>Server-validated</span>
                </div>
                <div className="admin-quote-status-actions">
                  {transitions[detail.status].map((nextStatus) => (
                    <button
                      type="button"
                      key={nextStatus}
                      className={
                        nextStatus === 'Accepted'
                          ? 'btn btn--primary btn--small'
                          : nextStatus === 'Cancelled' || nextStatus === 'Rejected'
                            ? 'btn btn--danger-quiet btn--small'
                            : 'btn btn--quiet btn--small'
                      }
                      onClick={() => void changeStatus(detail, nextStatus)}
                      disabled={statusSaving}
                    >
                      {nextStatus === 'Accepted' ? (
                        <CheckCircle2 size={14} />
                      ) : nextStatus === 'Rejected' ? (
                        <XCircle size={14} />
                      ) : nextStatus === 'Issued' ? (
                        <Send size={14} />
                      ) : null}
                      {transitionLabels[nextStatus] ?? nextStatus}
                    </button>
                  ))}
                </div>
              </section>
            )}

            {detail.issuedAt && (
              <p className="admin-related-empty">
                Issued {formatDate(detail.issuedAt)} ·{' '}
                <a href={api.admin.quotations.pdfUrl(detail.id)} target="_blank" rel="noreferrer">
                  Download PDF <ArrowUpRight size={12} />
                </a>
              </p>
            )}
          </div>
        )}
      </Drawer>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) void handleDelete(deleteTarget)
        }}
        title="Delete this draft quotation?"
        description={
          deleteTarget
            ? `${deleteTarget.number} will be permanently removed. Only drafts can be deleted; issued quotations must be cancelled instead.`
            : ''
        }
        confirmLabel="Delete draft"
      />
    </div>
  )
}
