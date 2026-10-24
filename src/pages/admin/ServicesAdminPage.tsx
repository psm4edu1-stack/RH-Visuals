import { useCallback, useEffect, useState } from 'react'
import {
  CircleAlert,
  Eye,
  EyeOff,
  Layers3,
  LoaderCircle,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react'
import { AdminPageHeader } from '../../components/admin/AdminUI'
import { ImageUploadField } from '../../components/admin/ImageUploadField'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { EmptyState } from '../../components/ui/EmptyState'
import { Modal } from '../../components/ui/Overlay'
import { StatusPill } from '../../components/ui/StatusPill'
import { useToast } from '../../components/ui/Toast'
import { ApiError, api } from '../../lib/api'
import { notifyPublicContentUpdated } from '../../lib/publicContentEvents'
import { relativeTime } from '../../lib/utils'
import type { AdminService } from '../../types'

type ServiceForm = {
  title: string
  slug: string
  short: string
  description: string
  image: string
  deliverables: string
  startingAt: string
  order: string
  status: 'draft' | 'published'
}

const emptyForm: ServiceForm = {
  title: '',
  slug: '',
  short: '',
  description: '',
  image: '',
  deliverables: '',
  startingAt: '',
  order: '0',
  status: 'draft',
}

function toForm(service: AdminService): ServiceForm {
  return {
    title: service.title,
    slug: service.slug,
    short: service.short,
    description: service.description,
    image: service.image,
    deliverables: service.deliverables.join(', '),
    startingAt: service.startingAt,
    order: String(service.order),
    status: service.status,
  }
}

function ServicePreview({ form }: { form: ServiceForm }) {
  const deliverables = form.deliverables
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

  return (
    <div className="admin-content-preview">
      <div className="admin-content-preview__notice">
        <span className="admin-content-preview__badge">
          {form.status === 'published' ? 'Published preview' : 'Draft preview'}
        </span>
        <p>
          This preview uses the current form values, including unsaved changes. Save the
          record when it is ready for the public Services section.
        </p>
      </div>

      <article className="admin-content-preview__card admin-content-preview__card--service">
        <div className="admin-content-preview__media">
          {form.image ? (
            <img src={form.image} alt="" />
          ) : (
            <span>Service image not set</span>
          )}
        </div>
        <div className="admin-content-preview__body">
          <p className="admin-content-preview__eyebrow">Studio capability</p>
          <h2>{form.title || 'Untitled service'}</h2>
          <p className="admin-content-preview__description">
            {form.short || form.description || 'No service description has been entered yet.'}
          </p>
          {form.description && form.description !== form.short && (
            <p className="admin-content-preview__description">{form.description}</p>
          )}

          {deliverables.length > 0 && (
            <div className="admin-content-preview__tags">
              {deliverables.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          )}

          {form.startingAt && (
            <p className="admin-content-preview__price">
              <span>Starting point</span>
              <strong>{form.startingAt}</strong>
            </p>
          )}
        </div>
      </article>
    </div>
  )
}

export function ServicesAdminPage() {
  const { toast } = useToast()
  const [services, setServices] = useState<AdminService[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<AdminService | null>(null)
  const [form, setForm] = useState<ServiceForm>(emptyForm)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [previewing, setPreviewing] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<AdminService | null>(null)

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    setError('')
    try {
      const result = await api.admin.services.list()
      setServices(result.services)
    } catch (loadError) {
      setError(
        loadError instanceof ApiError ? loadError.message : 'Services could not be loaded.',
      )
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible') void load(true)
    }
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [load])

  const openCreate = () => {
    setForm(emptyForm)
    setEditing(null)
    setFieldErrors({})
    setPreviewing(false)
    setEditorOpen(true)
  }

  const openEdit = (service: AdminService) => {
    setForm(toForm(service))
    setEditing(service)
    setFieldErrors({})
    setPreviewing(false)
    setEditorOpen(true)
  }

  const update = (field: keyof ServiceForm, value: string) => {
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
    setSaving(true)
    setFieldErrors({})
    try {
      const payload = {
        title: form.title,
        slug: form.slug,
        short: form.short,
        description: form.description,
        image: form.image,
        deliverables: form.deliverables.split(',').map((item) => item.trim()).filter(Boolean),
        startingAt: form.startingAt,
        order: Number(form.order) || 0,
        status: form.status,
      }
      const result = editing
        ? await api.admin.services.update(editing.id, payload)
        : await api.admin.services.create(payload)
      setServices((current) => {
        const next = editing
          ? current.map((service) => (service.id === result.service.id ? result.service : service))
          : [...current, result.service]
        return next.sort((a, b) => a.order - b.order)
      })
      setEditorOpen(false)
      setPreviewing(false)
      notifyPublicContentUpdated()
      toast(editing ? 'Service updated' : 'Service created', {
        description: result.service.title,
      })
    } catch (saveError) {
      if (saveError instanceof ApiError) {
        setFieldErrors(saveError.fields ?? {})
        if (!saveError.fields) setError(saveError.message)
        else setError('')
        toast('Service not saved', { description: saveError.message, tone: 'error' })
      } else {
        toast('Service not saved', {
          description: 'The API server could not complete the save.',
          tone: 'error',
        })
      }
    } finally {
      setSaving(false)
    }
  }

  const toggleStatus = async (service: AdminService) => {
    const status = service.status === 'published' ? 'draft' : 'published'
    try {
      const result = await api.admin.services.setStatus(service.id, status)
      setServices((current) =>
        current.map((item) => (item.id === result.service.id ? result.service : item)),
      )
      notifyPublicContentUpdated()
      toast(status === 'published' ? 'Service published' : 'Service unpublished', {
        description: status === 'published'
          ? 'It is now visible on the public Services page.'
          : 'It is hidden from public visitors.',
      })
    } catch (toggleError) {
      toast('Publication not changed', {
        description:
          toggleError instanceof ApiError ? toggleError.message : 'Try again.',
        tone: 'error',
      })
    }
  }

  const handleDelete = async (service: AdminService) => {
    try {
      await api.admin.services.remove(service.id)
      setServices((current) => current.filter((item) => item.id !== service.id))
      setDeleteTarget(null)
      notifyPublicContentUpdated()
      toast('Service deleted', { description: service.title })
    } catch (deleteError) {
      toast('Service not deleted', {
        description:
          deleteError instanceof ApiError ? deleteError.message : 'Try again.',
        tone: 'error',
      })
    }
  }

  const published = services.filter((service) => service.status === 'published').length

  return (
    <div className="admin-page">
      <AdminPageHeader
        overline="Public content"
        title="Services"
        description="Manage the published capability records shown on the public Services page. Only published records are visible to visitors."
        actions={
          <>
            <button type="button" className="btn btn--quiet btn--small" onClick={() => void load()}>
              <RefreshCw size={14} /> Refresh
            </button>
            <button type="button" className="btn btn--primary btn--small" onClick={openCreate}>
              <Plus size={15} /> New service
            </button>
          </>
        }
      />

      {error && (
        <div className="admin-alert admin-alert--error" role="alert">
          <CircleAlert size={18} />
          <div>
            <strong>Services unavailable</strong>
            <p>{error}</p>
          </div>
          <button type="button" className="btn btn--quiet btn--small" onClick={() => void load()}>
            Try again
          </button>
        </div>
      )}

      <div className="admin-summary-row">
        <span>{services.length} database record{services.length === 1 ? '' : 's'}</span>
        <span>{published} published</span>
        <span>{services.length - published} draft</span>
      </div>

      {loading ? (
        <div className="admin-loading-panel" role="status">
          <LoaderCircle size={20} className="is-spinning" /> Loading services…
        </div>
      ) : services.length === 0 ? (
        <div className="panel admin-panel-pad">
          <EmptyState
            icon={<Layers3 size={22} />}
            title="No service records"
            description="Create a service record and publish it. Only published records appear on the public Services page; the page shows a clear empty state until then."
            action={
              <button type="button" className="btn btn--primary btn--small" onClick={openCreate}>
                <Plus size={14} /> Create first service
              </button>
            }
          />
        </div>
      ) : (
        <div className="panel admin-table-panel">
          <div className="table-scroll">
            <table className="data-table admin-project-table">
              <thead>
                <tr>
                  <th>Service</th>
                  <th>Starting point</th>
                  <th>Status</th>
                  <th>Order</th>
                  <th>Updated</th>
                  <th className="align-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {services.map((service) => (
                  <tr key={service.id}>
                    <td>
                      <div className="admin-project-cell">
                        <img src={service.image} alt="" />
                        <div>
                          <strong>{service.title}</strong>
                          <small>/{service.slug}</small>
                        </div>
                      </div>
                    </td>
                    <td>{service.startingAt || 'On request'}</td>
                    <td>
                      <StatusPill status={service.status === 'published' ? 'Published' : 'Draft'} />
                    </td>
                    <td>{service.order}</td>
                    <td>{relativeTime(service.updatedAt)}</td>
                    <td>
                      <div className="admin-row-actions">
                        <button type="button" onClick={() => openEdit(service)} title="Edit service">
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => void toggleStatus(service)}
                          title={service.status === 'published' ? 'Unpublish' : 'Publish'}
                        >
                          {service.status === 'published' ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                        <button
                          type="button"
                          className="is-danger"
                          onClick={() => setDeleteTarget(service)}
                          title="Delete service"
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
        onClose={() => {
          setEditorOpen(false)
          setPreviewing(false)
        }}
        title={previewing ? 'Service preview' : editing ? 'Edit service' : 'New service'}
        eyebrow="Service record"
        description={
          previewing
            ? 'Review the public presentation before publishing this record.'
            : 'Published services appear on the public Services page immediately after saving.'
        }
        size="lg"
        footer={
          previewing ? (
            <>
              <button
                type="button"
                className="btn btn--quiet"
                onClick={() => setPreviewing(false)}
              >
                Back to editor
              </button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => void handleSave()}
                disabled={saving}
              >
                {saving ? <LoaderCircle size={15} className="is-spinning" /> : null}
                {saving ? 'Saving…' : editing ? 'Save changes' : 'Create service'}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="btn btn--quiet"
                onClick={() => setPreviewing(true)}
              >
                <Eye size={15} /> Preview
              </button>
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
                {saving ? 'Saving…' : editing ? 'Save changes' : 'Create service'}
              </button>
            </>
          )
        }
      >
        {previewing ? (
          <ServicePreview form={form} />
        ) : (
        <div className="admin-form">
          <div className="form-grid form-grid--two">
            <label className="field">
              <span>Service title *</span>
              <input value={form.title} onChange={(event) => update('title', event.target.value)} />
              {fieldErrors.title && <small className="admin-field-error">{fieldErrors.title}</small>}
            </label>
            <label className="field">
              <span>Slug</span>
              <input
                value={form.slug}
                onChange={(event) => update('slug', event.target.value)}
                placeholder="generated-from-title"
              />
              {fieldErrors.slug && <small className="admin-field-error">{fieldErrors.slug}</small>}
            </label>
          </div>

          <label className="field">
            <span>Short line</span>
            <input
              value={form.short}
              onChange={(event) => update('short', event.target.value)}
              placeholder="A concise line for the service card."
            />
          </label>

          <ImageUploadField
            label="Service image"
            value={form.image}
            onChange={(url) => update('image', url)}
          />
          {fieldErrors.image && <small className="admin-field-error">{fieldErrors.image}</small>}

          <label className="field">
            <span>Description</span>
            <textarea
              rows={5}
              value={form.description}
              onChange={(event) => update('description', event.target.value)}
            />
          </label>

          <div className="form-grid form-grid--two">
            <label className="field">
              <span>Deliverables</span>
              <input
                value={form.deliverables}
                onChange={(event) => update('deliverables', event.target.value)}
                placeholder="Comma-separated list"
              />
            </label>
            <label className="field">
              <span>Starting point</span>
              <input
                value={form.startingAt}
                onChange={(event) => update('startingAt', event.target.value)}
                placeholder="₹2,50,000 or On request"
              />
            </label>
          </div>

          <div className="form-grid form-grid--two">
            <label className="field">
              <span>Display order</span>
              <input
                type="number"
                value={form.order}
                onChange={(event) => update('order', event.target.value)}
              />
            </label>
            <label className="field">
              <span>Publication status</span>
              <select
                value={form.status}
                onChange={(event) => update('status', event.target.value as ServiceForm['status'])}
              >
                <option value="draft">Draft — hidden</option>
                <option value="published">Published — visible</option>
              </select>
            </label>
          </div>
        </div>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) void handleDelete(deleteTarget)
        }}
        title="Delete this service?"
        description={
          deleteTarget
            ? `“${deleteTarget.title}” will be permanently removed from the database. Published visitors will no longer see it.`
            : ''
        }
        confirmLabel="Delete service"
      />
    </div>
  )
}
