import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  CircleAlert,
  Eye,
  EyeOff,
  Images,
  LoaderCircle,
  MonitorPlay,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react'
import { AdminPageHeader } from '../../components/admin/AdminUI'
import { GalleryUploadField } from '../../components/admin/GalleryUploadField'
import { ImageUploadField } from '../../components/admin/ImageUploadField'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { EmptyState } from '../../components/ui/EmptyState'
import { Modal } from '../../components/ui/Overlay'
import { StatusPill } from '../../components/ui/StatusPill'
import { useToast } from '../../components/ui/Toast'
import { ApiError, api } from '../../lib/api'
import { notifyPublicContentUpdated } from '../../lib/publicContentEvents'
import { relativeTime } from '../../lib/utils'
import type { WorkProject } from '../../types'

type ProjectForm = {
  title: string
  slug: string
  category: string
  client: string
  location: string
  year: string
  cover: string
  gallery: string[]
  services: string
  videos: string[]
  description: string
  order: string
  status: 'draft' | 'published'
}

const emptyForm: ProjectForm = {
  title: '',
  slug: '',
  category: 'Live Production',
  client: '',
  location: '',
  year: String(new Date().getFullYear()),
  cover: '',
  gallery: [],
  services: '',
  videos: [],
  description: '',
  order: '0',
  status: 'draft',
}

const categories = ['Live Production', 'Festival', 'Concert', 'Brand Launch', 'Corporate', 'Nightlife', 'Gala']

function toForm(project: WorkProject): ProjectForm {
  return {
    title: project.title,
    slug: project.slug,
    category: project.category,
    client: project.client ?? '',
    location: project.location ?? '',
    year: project.year ?? '',
    cover: project.cover,
    gallery: project.gallery,
    services: project.services.join(', '),
    videos:
      project.videos && project.videos.length > 0
        ? project.videos
        : project.videoUrl
          ? [project.videoUrl]
          : [],
    description: project.description,
    order: String(project.order),
    status: project.status,
  }
}

function ProjectPreview({ form }: { form: ProjectForm }) {
  const services = form.services
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
          record when it is ready for the public Work section.
        </p>
      </div>

      <article className="admin-content-preview__card">
        <div className="admin-content-preview__media">
          {form.cover ? (
            <img src={form.cover} alt="" />
          ) : (
            <span>Cover image not set</span>
          )}
        </div>
        <div className="admin-content-preview__body">
          <p className="admin-content-preview__eyebrow">
            {form.category || 'Production'}
            {form.year ? ` · ${form.year}` : ''}
          </p>
          <h2>{form.title || 'Untitled project'}</h2>
          <p className="admin-content-preview__description">
            {form.description || 'No project description has been entered yet.'}
          </p>

          <div className="admin-content-preview__meta">
            <div>
              <span>Client</span>
              <strong>{form.client || 'Not set'}</strong>
            </div>
            <div>
              <span>Location</span>
              <strong>{form.location || 'Not set'}</strong>
            </div>
            <div>
              <span>Order</span>
              <strong>{form.order || '0'}</strong>
            </div>
          </div>

          {services.length > 0 && (
            <div className="admin-content-preview__tags">
              {services.map((service) => (
                <span key={service}>{service}</span>
              ))}
            </div>
          )}

          {form.gallery.length > 0 && (
            <div className="admin-content-preview__gallery">
              {form.gallery.map((url, index) => (
                <img src={url} alt={`Gallery preview ${index + 1}`} key={`${url}-${index}`} />
              ))}
            </div>
          )}

          {form.videos.filter(Boolean).length > 0 && (
            <div className="admin-content-preview__video">
              <span>Related videos</span>
              {form.videos.filter(Boolean).map((url, index) => (
                <a href={url} target="_blank" rel="noreferrer" key={`${url}-${index}`}>
                  Video {index + 1}: {url}
                </a>
              ))}
            </div>
          )}
        </div>
      </article>
    </div>
  )
}

export function PortfolioPage() {
  const { toast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const [projects, setProjects] = useState<WorkProject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<WorkProject | null>(null)
  const [form, setForm] = useState<ProjectForm>(emptyForm)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [previewing, setPreviewing] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<WorkProject | null>(null)

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    setError('')
    try {
      const result = await api.admin.projects.list()
      setProjects(result.projects)
    } catch (loadError) {
      setError(
        loadError instanceof ApiError ? loadError.message : 'Projects could not be loaded.',
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

  useEffect(() => {
    if (!loading && searchParams.get('new') === '1') {
      setForm(emptyForm)
      setEditing(null)
      setFieldErrors({})
      setPreviewing(false)
      setEditorOpen(true)
      setSearchParams({}, { replace: true })
    }
  }, [loading, searchParams, setSearchParams])

  const openCreate = () => {
    setForm(emptyForm)
    setEditing(null)
    setFieldErrors({})
    setPreviewing(false)
    setEditorOpen(true)
  }

  const openEdit = (project: WorkProject) => {
    setForm(toForm(project))
    setEditing(project)
    setFieldErrors({})
    setPreviewing(false)
    setEditorOpen(true)
  }

  const openPreview = (project: WorkProject) => {
    setForm(toForm(project))
    setEditing(project)
    setFieldErrors({})
    setPreviewing(true)
    setEditorOpen(true)
  }

  const update = (
    field: Exclude<keyof ProjectForm, 'gallery' | 'videos'>,
    value: string,
  ) => {
    setForm((current) => ({ ...current, [field]: value }))
    if (fieldErrors[field]) {
      setFieldErrors((current) => {
        const next = { ...current }
        delete next[field]
        return next
      })
    }
  }

  const updateGallery = (gallery: string[]) => {
    setForm((current) => ({ ...current, gallery }))
  }

  const updateVideo = (index: number, value: string) => {
    setForm((current) => ({
      ...current,
      videos: current.videos.map((url, itemIndex) => (itemIndex === index ? value : url)),
    }))
    if (fieldErrors.videos) {
      setFieldErrors((current) => {
        const next = { ...current }
        delete next.videos
        return next
      })
    }
  }

  const addVideo = () => {
    setForm((current) => ({ ...current, videos: [...current.videos, ''] }))
  }

  const removeVideo = (index: number) => {
    setForm((current) => ({
      ...current,
      videos: current.videos.filter((_, itemIndex) => itemIndex !== index),
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    setFieldErrors({})
    try {
      const payload = {
        title: form.title,
        slug: form.slug,
        category: form.category,
        client: form.client,
        location: form.location,
        year: form.year,
        cover: form.cover,
        gallery: form.gallery,
        services: form.services.split(',').map((item) => item.trim()).filter(Boolean),
        videos: form.videos.map((url) => url.trim()).filter(Boolean),
        description: form.description,
        order: Number(form.order) || 0,
        status: form.status,
      }
      const result = editing
        ? await api.admin.projects.update(editing.id, payload)
        : await api.admin.projects.create(payload)
      setProjects((current) =>
        editing
          ? current.map((project) => (project.id === result.project.id ? result.project : project))
          : [result.project, ...current],
      )
      setEditorOpen(false)
      setPreviewing(false)
      notifyPublicContentUpdated()
      toast(editing ? 'Project updated' : 'Project created', {
        description: result.project.title,
      })
    } catch (saveError) {
      if (saveError instanceof ApiError) {
        setFieldErrors(saveError.fields ?? {})
        if (!saveError.fields) setError(saveError.message)
        else setError('')
        toast('Project not saved', { description: saveError.message, tone: 'error' })
      } else {
        toast('Project not saved', {
          description: 'The API server could not complete the save.',
          tone: 'error',
        })
      }
    } finally {
      setSaving(false)
    }
  }

  const toggleStatus = async (project: WorkProject) => {
    const status = project.status === 'published' ? 'draft' : 'published'
    try {
      const result = await api.admin.projects.setStatus(project.id, status)
      setProjects((current) =>
        current.map((item) => (item.id === result.project.id ? result.project : item)),
      )
      notifyPublicContentUpdated()
      toast(status === 'published' ? 'Project published' : 'Project unpublished', {
        description: status === 'published'
          ? 'It is now visible on the public Work section.'
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

  const handleDelete = async (project: WorkProject) => {
    try {
      await api.admin.projects.remove(project.id)
      setProjects((current) => current.filter((item) => item.id !== project.id))
      setDeleteTarget(null)
      notifyPublicContentUpdated()
      toast('Project deleted', { description: project.title })
    } catch (deleteError) {
      toast('Project not deleted', {
        description:
          deleteError instanceof ApiError ? deleteError.message : 'Try again.',
        tone: 'error',
      })
    }
  }

  const published = projects.filter((project) => project.status === 'published').length

  return (
    <div className="admin-page">
      <AdminPageHeader
        overline="Public content"
        title="Portfolio"
        description="Create, edit and publish the projects that appear in the Work carousel. Only published database records are served to public visitors."
        actions={
          <>
            <button type="button" className="btn btn--quiet btn--small" onClick={() => void load()}>
              <RefreshCw size={14} /> Refresh
            </button>
            <button type="button" className="btn btn--primary btn--small" onClick={openCreate}>
              <Plus size={15} /> New project
            </button>
          </>
        }
      />

      {error && (
        <div className="admin-alert admin-alert--error" role="alert">
          <CircleAlert size={18} />
          <div>
            <strong>Portfolio unavailable</strong>
            <p>{error}</p>
          </div>
          <button type="button" className="btn btn--quiet btn--small" onClick={() => void load()}>
            Try again
          </button>
        </div>
      )}

      <div className="admin-summary-row">
        <span>{projects.length} database record{projects.length === 1 ? '' : 's'}</span>
        <span>{published} published</span>
        <span>{projects.length - published} draft</span>
      </div>

      {loading ? (
        <div className="admin-loading-panel" role="status">
          <LoaderCircle size={20} className="is-spinning" /> Loading portfolio…
        </div>
      ) : projects.length === 0 ? (
        <div className="panel admin-panel-pad">
          <EmptyState
            icon={<Images size={22} />}
            title="No portfolio records yet"
            description="The public Work section shows a real empty state until a project is published. Create a project, upload its cover, and publish it to make it live."
            action={
              <button type="button" className="btn btn--primary btn--small" onClick={openCreate}>
                <Plus size={14} /> Create the first project
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
                  <th>Project</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Order</th>
                  <th>Updated</th>
                  <th className="align-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => (
                  <tr key={project.id}>
                    <td>
                      <div className="admin-project-cell">
                        <img src={project.cover} alt="" />
                        <div>
                          <strong>{project.title}</strong>
                          <small>/{project.slug}</small>
                        </div>
                      </div>
                    </td>
                    <td>{project.category}</td>
                    <td>
                      <StatusPill status={project.status === 'published' ? 'Published' : 'Draft'} />
                    </td>
                    <td>{project.order}</td>
                    <td>{relativeTime(project.updatedAt)}</td>
                    <td>
                      <div className="admin-row-actions">
                        <button
                          type="button"
                          onClick={() => openPreview(project)}
                          title="Preview project"
                        >
                          <MonitorPlay size={15} />
                        </button>
                        <button type="button" onClick={() => openEdit(project)} title="Edit project">
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => void toggleStatus(project)}
                          title={project.status === 'published' ? 'Unpublish' : 'Publish'}
                        >
                          {project.status === 'published' ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                        <button
                          type="button"
                          className="is-danger"
                          onClick={() => setDeleteTarget(project)}
                          title="Delete project"
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
        title={previewing ? 'Project preview' : editing ? 'Edit project' : 'New project'}
        eyebrow="Portfolio record"
        description={
          previewing
            ? 'Review the public presentation before publishing this record.'
            : 'Changes are saved to the database. Publish when the record is ready for public visitors.'
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
                {saving ? 'Saving…' : editing ? 'Save changes' : 'Create project'}
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
                {saving ? 'Saving…' : editing ? 'Save changes' : 'Create project'}
              </button>
            </>
          )
        }
      >
        {previewing ? (
          <ProjectPreview form={form} />
        ) : (
        <div className="admin-form">
          <div className="form-grid form-grid--two">
            <label className="field">
              <span>Project title *</span>
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

          <div className="form-grid form-grid--three">
            <label className="field">
              <span>Category</span>
              <input
                list="project-categories"
                value={form.category}
                onChange={(event) => update('category', event.target.value)}
              />
              <datalist id="project-categories">
                {categories.map((category) => (
                  <option key={category} value={category} />
                ))}
              </datalist>
            </label>
            <label className="field">
              <span>Client</span>
              <input value={form.client} onChange={(event) => update('client', event.target.value)} />
            </label>
            <label className="field">
              <span>Year</span>
              <input value={form.year} onChange={(event) => update('year', event.target.value)} />
            </label>
          </div>

          <label className="field">
            <span>Location</span>
            <input
              value={form.location}
              onChange={(event) => update('location', event.target.value)}
              placeholder="City, country"
            />
          </label>

          <div className="admin-video-field">
            <div className="admin-video-field__heading">
              <span className="admin-image-field__label">Related videos</span>
              <small>YouTube, Vimeo, or direct MP4 / WebM links</small>
            </div>
            {form.videos.length === 0 ? (
              <p className="admin-video-field__empty">
                No related videos yet. Add a video URL to include it in the public
                project popup.
              </p>
            ) : (
              <div className="admin-video-field__list">
                {form.videos.map((url, index) => (
                  <div className="admin-video-field__row" key={`video-${index}`}>
                    <input
                      value={url}
                      onChange={(event) => updateVideo(index, event.target.value)}
                      placeholder="https://www.youtube.com/watch?v=…"
                      aria-label={`Related video ${index + 1}`}
                    />
                    <button
                      type="button"
                      className="admin-video-field__remove"
                      onClick={() => removeVideo(index)}
                      aria-label={`Remove related video ${index + 1}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button type="button" className="btn btn--quiet btn--small" onClick={addVideo}>
              <Plus size={14} /> Add video URL
            </button>
            {fieldErrors.videos && (
              <small className="admin-field-error">{fieldErrors.videos}</small>
            )}
          </div>

          <ImageUploadField value={form.cover} onChange={(url) => update('cover', url)} />
          {fieldErrors.cover && <small className="admin-field-error">{fieldErrors.cover}</small>}

          <label className="field">
            <span>Description</span>
            <textarea
              rows={4}
              value={form.description}
              onChange={(event) => update('description', event.target.value)}
              placeholder="Confirmed production details, not placeholder claims."
            />
          </label>

          <GalleryUploadField
            value={form.gallery}
            onChange={updateGallery}
          />

          <label className="field">
            <span>Services involved</span>
            <input
              value={form.services}
              onChange={(event) => update('services', event.target.value)}
              placeholder="Live visuals, projection…"
            />
          </label>

          <div className="form-grid form-grid--two">
            <label className="field">
              <span>Display order</span>
              <input
                type="number"
                value={form.order}
                onChange={(event) => update('order', event.target.value)}
              />
              {fieldErrors.order && <small className="admin-field-error">{fieldErrors.order}</small>}
            </label>
            <label className="field">
              <span>Publication status</span>
              <select
                value={form.status}
                onChange={(event) => update('status', event.target.value as ProjectForm['status'])}
              >
                <option value="draft">Draft — hidden</option>
                <option value="published">Published — visible</option>
              </select>
              {fieldErrors.status && <small className="admin-field-error">{fieldErrors.status}</small>}
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
        title="Delete this project?"
        description={
          deleteTarget
            ? `“${deleteTarget.title}” will be permanently removed from the database. This cannot be undone.`
            : ''
        }
        confirmLabel="Delete project"
      />
    </div>
  )
}
