import { useCallback, useEffect, useState } from 'react'
import {
  CircleAlert,
  FileText,
  Heart,
  Images,
  LoaderCircle,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Star,
  Trash2,
} from 'lucide-react'
import { AdminPageHeader } from '../../components/admin/AdminUI'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { EmptyState } from '../../components/ui/EmptyState'
import { Modal } from '../../components/ui/Overlay'
import { useToast } from '../../components/ui/Toast'
import { ApiError, api } from '../../lib/api'
import { formatDate, relativeTime } from '../../lib/utils'
import type { AssetCategory, AssetRecord, ClientRecord } from '../../types'

type AssetForm = {
  title: string
  url: string
  category: AssetCategory
  tags: string
  eventDate: string
  dimensions: string
  fileType: string
  fileSize: string
  clientId: string
  favorite: boolean
}

const categories: AssetCategory[] = [
  'Live Show',
  'Festival',
  'Nightlife',
  'Corporate',
  'Brand',
  'BTS',
]

const emptyForm: AssetForm = {
  title: '',
  url: '',
  category: 'Live Show',
  tags: '',
  eventDate: '',
  dimensions: '',
  fileType: '',
  fileSize: '',
  clientId: '',
  favorite: false,
}

function toForm(asset: AssetRecord): AssetForm {
  return {
    title: asset.title,
    url: asset.url,
    category: asset.category,
    tags: asset.tags.join(', '),
    eventDate: asset.eventDate,
    dimensions: asset.dimensions,
    fileType: asset.fileType,
    fileSize: asset.fileSize,
    clientId: asset.clientId ?? '',
    favorite: asset.favorite,
  }
}

function isImageUrl(url: string) {
  return /\.(jpe?g|png|webp|gif|avif|svg)(\?|#|$)/i.test(url)
}

export function AssetsPage() {
  const { toast } = useToast()
  const [assets, setAssets] = useState<AssetRecord[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [clients, setClients] = useState<ClientRecord[]>([])
  const [category, setCategory] = useState<'All' | AssetCategory>('All')
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<AssetRecord | null>(null)
  const [form, setForm] = useState<AssetForm>(emptyForm)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<AssetRecord | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await api.admin.assets.list({
        category,
        q: search,
        favorite: favoritesOnly || undefined,
      })
      setAssets(result.assets)
      setCounts(result.counts)
    } catch (loadError) {
      setError(loadError instanceof ApiError ? loadError.message : 'Assets could not be loaded.')
    } finally {
      setLoading(false)
    }
  }, [category, search, favoritesOnly])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    let active = true
    api.admin.clients
      .list()
      .then((result) => {
        if (active) setClients(result.clients)
      })
      .catch(() => {
        // Asset linking is optional; the library still works without the client list.
      })
    return () => {
      active = false
    }
  }, [])

  const openCreate = () => {
    setForm(emptyForm)
    setEditing(null)
    setFieldErrors({})
    setEditorOpen(true)
  }

  const openEdit = (asset: AssetRecord) => {
    setForm(toForm(asset))
    setEditing(asset)
    setFieldErrors({})
    setEditorOpen(true)
  }

  const update = (field: keyof AssetForm, value: string | boolean) => {
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
      const payload = {
        ...form,
        tags: form.tags.split(',').map((item) => item.trim()).filter(Boolean),
        clientId: form.clientId || null,
      }
      const result = editing
        ? await api.admin.assets.update(editing.id, payload)
        : await api.admin.assets.create(payload)
      setEditorOpen(false)
      toast(editing ? 'Asset updated' : 'Asset added', { description: result.asset.title })
      await load()
    } catch (saveError) {
      if (saveError instanceof ApiError) {
        setFieldErrors(saveError.fields ?? {})
        if (!saveError.fields) setError(saveError.message)
        toast('Asset not saved', { description: saveError.message, tone: 'error' })
      } else {
        toast('Asset not saved', {
          description: 'The API server could not complete the save.',
          tone: 'error',
        })
      }
    } finally {
      setSaving(false)
    }
  }

  const toggleFavorite = async (asset: AssetRecord) => {
    try {
      const result = await api.admin.assets.toggleFavorite(asset.id, !asset.favorite)
      setAssets((current) =>
        current.map((item) => (item.id === result.asset.id ? result.asset : item)),
      )
      toast(result.asset.favorite ? 'Added to favourites' : 'Removed from favourites', {
        description: result.asset.title,
      })
    } catch (toggleError) {
      toast('Favourite not changed', {
        description:
          toggleError instanceof ApiError ? toggleError.message : 'The update could not be saved.',
        tone: 'error',
      })
    }
  }

  const handleDelete = async (asset: AssetRecord) => {
    try {
      await api.admin.assets.remove(asset.id)
      setAssets((current) => current.filter((item) => item.id !== asset.id))
      setDeleteTarget(null)
      toast('Asset deleted', { description: asset.title })
      await load()
    } catch (deleteError) {
      toast('Asset not deleted', {
        description:
          deleteError instanceof ApiError ? deleteError.message : 'The asset could not be deleted.',
        tone: 'error',
      })
    }
  }

  return (
    <div className="admin-page">
      <AdminPageHeader
        overline="Library"
        title="Assets"
        description="Stills, films and production references stored in the studio library. Assets can be linked to clients and marked as favourites."
        actions={
          <>
            <button type="button" className="btn btn--quiet btn--small" onClick={() => void load()}>
              <RefreshCw size={14} /> Refresh
            </button>
            <button type="button" className="btn btn--primary btn--small" onClick={openCreate}>
              <Plus size={15} /> Add asset
            </button>
          </>
        }
      />

      <div className="admin-enquiry-toolbar">
        <div className="admin-tabs" role="tablist" aria-label="Filter assets by category">
          {(['All', ...categories] as Array<'All' | AssetCategory>).map((tab) => (
            <button
              type="button"
              key={tab}
              role="tab"
              aria-selected={category === tab}
              className={category === tab ? 'is-active' : ''}
              onClick={() => setCategory(tab)}
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
            placeholder="Search title, tag, client…"
            aria-label="Search assets"
          />
          <button type="submit" className="btn btn--quiet btn--small">
            Search
          </button>
        </form>
      </div>

      <div className="admin-summary-row">
        <span>{counts.total ?? assets.length} asset{(counts.total ?? assets.length) === 1 ? '' : 's'}</span>
        <span>{counts.favorites ?? 0} favourite{(counts.favorites ?? 0) === 1 ? '' : 's'}</span>
        <button
          type="button"
          className={`admin-filter-toggle ${favoritesOnly ? 'is-active' : ''}`}
          onClick={() => setFavoritesOnly((current) => !current)}
        >
          <Star size={13} /> Favourites only
        </button>
      </div>

      {error && (
        <div className="admin-alert admin-alert--error" role="alert">
          <CircleAlert size={18} />
          <div>
            <strong>Assets unavailable</strong>
            <p>{error}</p>
          </div>
          <button type="button" className="btn btn--quiet btn--small" onClick={() => void load()}>
            Try again
          </button>
        </div>
      )}

      {loading ? (
        <div className="admin-loading-panel" role="status">
          <LoaderCircle size={20} className="is-spinning" /> Loading studio assets…
        </div>
      ) : assets.length === 0 ? (
        <div className="panel admin-panel-pad">
          <EmptyState
            icon={<Images size={22} />}
            title={
              search || category !== 'All' || favoritesOnly ? 'No matching assets' : 'No assets yet'
            }
            description={
              search || category !== 'All' || favoritesOnly
                ? 'Try another search or clear the category and favourite filters.'
                : 'Add a still, film or reference URL to build the studio library. Assets are stored in the database.'
            }
            action={
              <button type="button" className="btn btn--primary btn--small" onClick={openCreate}>
                <Plus size={14} /> Add the first asset
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
                  <th>Asset</th>
                  <th>Category</th>
                  <th>Client</th>
                  <th>Details</th>
                  <th>Updated</th>
                  <th className="align-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {assets.map((asset) => (
                  <tr key={asset.id}>
                    <td>
                      <div className="admin-asset-cell">
                        <span className="admin-asset-thumb">
                          {isImageUrl(asset.url) ? (
                            <img src={asset.url} alt="" />
                          ) : (
                            <FileText size={17} />
                          )}
                        </span>
                        <span>
                          <strong>{asset.title}</strong>
                          <small>{asset.tags.join(', ') || asset.fileType || 'No tags'}</small>
                        </span>
                      </div>
                    </td>
                    <td>{asset.category}</td>
                    <td>{asset.clientCompany || 'Unlinked'}</td>
                    <td>
                      <strong className="admin-table-strong">
                        {asset.dimensions || asset.fileType || '—'}
                      </strong>
                      <small className="admin-table-sub">
                        {asset.eventDate ? formatDate(asset.eventDate) : 'No event date'}
                      </small>
                    </td>
                    <td>{relativeTime(asset.updatedAt)}</td>
                    <td>
                      <div className="admin-row-actions">
                        <button
                          type="button"
                          className={asset.favorite ? 'is-favorite' : ''}
                          onClick={() => void toggleFavorite(asset)}
                          title={asset.favorite ? 'Remove favourite' : 'Add favourite'}
                        >
                          <Heart size={15} fill={asset.favorite ? 'currentColor' : 'none'} />
                        </button>
                        <button type="button" onClick={() => openEdit(asset)} title="Edit asset">
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          className="is-danger"
                          onClick={() => setDeleteTarget(asset)}
                          title="Delete asset"
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
        title={editing ? 'Edit asset' : 'Add asset'}
        eyebrow="Studio library"
        description="Store a direct asset URL, its category and any useful production metadata."
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
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Add asset'}
            </button>
          </>
        }
      >
        <div className="admin-form">
          <div className="form-grid form-grid--two">
            <label className="field">
              <span>Title *</span>
              <input value={form.title} onChange={(event) => update('title', event.target.value)} />
              {fieldErrors.title && <small className="admin-field-error">{fieldErrors.title}</small>}
            </label>
            <label className="field">
              <span>Category</span>
              <select
                value={form.category}
                onChange={(event) => update('category', event.target.value as AssetCategory)}
              >
                {categories.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              {fieldErrors.category && (
                <small className="admin-field-error">{fieldErrors.category}</small>
              )}
            </label>
          </div>

          <label className="field">
            <span>Asset URL *</span>
            <input
              value={form.url}
              onChange={(event) => update('url', event.target.value)}
              placeholder="/uploads/asset.jpg or https://…"
            />
            {fieldErrors.url && <small className="admin-field-error">{fieldErrors.url}</small>}
          </label>

          <div className="form-grid form-grid--two">
            <label className="field">
              <span>Tags</span>
              <input
                value={form.tags}
                onChange={(event) => update('tags', event.target.value)}
                placeholder="Comma-separated tags"
              />
            </label>
            <label className="field">
              <span>Event date</span>
              <input
                type="date"
                value={form.eventDate}
                onChange={(event) => update('eventDate', event.target.value)}
              />
              {fieldErrors.eventDate && (
                <small className="admin-field-error">{fieldErrors.eventDate}</small>
              )}
            </label>
          </div>

          <div className="form-grid form-grid--three">
            <label className="field">
              <span>Dimensions</span>
              <input
                value={form.dimensions}
                onChange={(event) => update('dimensions', event.target.value)}
                placeholder="1920 × 1080"
              />
            </label>
            <label className="field">
              <span>File type</span>
              <input
                value={form.fileType}
                onChange={(event) => update('fileType', event.target.value)}
                placeholder="JPG, MP4…"
              />
            </label>
            <label className="field">
              <span>File size</span>
              <input
                value={form.fileSize}
                onChange={(event) => update('fileSize', event.target.value)}
                placeholder="12 MB"
              />
            </label>
          </div>

          <div className="form-grid form-grid--two">
            <label className="field">
              <span>Linked client</span>
              <select
                value={form.clientId}
                onChange={(event) => update('clientId', event.target.value)}
              >
                <option value="">No client link</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.company}
                  </option>
                ))}
              </select>
              {fieldErrors.clientId && (
                <small className="admin-field-error">{fieldErrors.clientId}</small>
              )}
            </label>
            <label className="admin-check-field">
              <input
                type="checkbox"
                checked={form.favorite}
                onChange={(event) => update('favorite', event.target.checked)}
              />
              <span>Mark as favourite</span>
            </label>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) void handleDelete(deleteTarget)
        }}
        title="Delete this asset?"
        description={
          deleteTarget
            ? `“${deleteTarget.title}” will be removed from the studio library. This cannot be undone.`
            : ''
        }
        confirmLabel="Delete asset"
      />
    </div>
  )
}
