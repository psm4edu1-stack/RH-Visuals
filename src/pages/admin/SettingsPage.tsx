import { useCallback, useEffect, useState } from 'react'
import {
  CircleAlert,
  LoaderCircle,
  RefreshCw,
  Save,
  Settings,
  ShieldCheck,
} from 'lucide-react'
import { AdminPageHeader } from '../../components/admin/AdminUI'
import { ImageUploadField } from '../../components/admin/ImageUploadField'
import { EmptyState } from '../../components/ui/EmptyState'
import { useToast } from '../../components/ui/Toast'
import { ApiError, api } from '../../lib/api'
import { formatDateTime } from '../../lib/utils'
import type { StudioSettingsRecord } from '../../types'

type SettingsForm = {
  studioName: string
  tagline: string
  email: string
  phone: string
  address: string
  city: string
  gstin: string
  defaultGstRate: string
  quotationNotes: string
  instagramUrl: string
  linkedinUrl: string
  logoUrl: string
}

const emptyForm: SettingsForm = {
  studioName: '',
  tagline: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  gstin: '',
  defaultGstRate: '18',
  quotationNotes: '',
  instagramUrl: '',
  linkedinUrl: '',
  logoUrl: '',
}

function toForm(settings: StudioSettingsRecord): SettingsForm {
  return {
    studioName: settings.studioName,
    tagline: settings.tagline,
    email: settings.email,
    phone: settings.phone,
    address: settings.address,
    city: settings.city,
    gstin: settings.gstin,
    defaultGstRate: String(settings.defaultGstRate),
    quotationNotes: settings.quotationNotes,
    instagramUrl: settings.instagramUrl,
    linkedinUrl: settings.linkedinUrl,
    logoUrl: settings.logoUrl,
  }
}

export function SettingsPage() {
  const { toast } = useToast()
  const [settings, setSettings] = useState<StudioSettingsRecord | null>(null)
  const [form, setForm] = useState<SettingsForm>(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [dirty, setDirty] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await api.admin.settings.get()
      setSettings(result.settings)
      setForm(toForm(result.settings))
      setDirty(false)
    } catch (loadError) {
      setError(loadError instanceof ApiError ? loadError.message : 'Studio settings could not be loaded.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const update = (field: keyof SettingsForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
    setDirty(true)
    if (fieldErrors[field]) {
      setFieldErrors((current) => {
        const next = { ...current }
        delete next[field]
        return next
      })
    }
  }

  const handleSave = async () => {
    if (saving || !settings) return
    setSaving(true)
    setError('')
    setFieldErrors({})
    try {
      const result = await api.admin.settings.update({
        ...form,
        defaultGstRate: Number(form.defaultGstRate) || 0,
      })
      setSettings(result.settings)
      setForm(toForm(result.settings))
      setDirty(false)
      toast('Studio settings saved', {
        description: 'Public contact details and quotation defaults are now updated.',
      })
    } catch (saveError) {
      if (saveError instanceof ApiError) {
        setFieldErrors(saveError.fields ?? {})
        if (!saveError.fields) setError(saveError.message)
        toast('Settings not saved', { description: saveError.message, tone: 'error' })
      } else {
        toast('Settings not saved', {
          description: 'The API server could not complete the save.',
          tone: 'error',
        })
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="admin-page">
      <AdminPageHeader
        overline="System"
        title="Business settings"
        description="Public studio contact details, quotation defaults and the branding stored by the API. These values are used by the website and generated PDFs."
        actions={
          <>
            <button type="button" className="btn btn--quiet btn--small" onClick={() => void load()}>
              <RefreshCw size={14} /> Refresh
            </button>
            <button
              type="button"
              className="btn btn--primary btn--small"
              onClick={() => void handleSave()}
              disabled={saving || loading || !settings}
            >
              {saving ? <LoaderCircle size={14} className="is-spinning" /> : <Save size={14} />}
              {saving ? 'Saving…' : 'Save settings'}
            </button>
          </>
        }
      />

      {error && (
        <div className="admin-alert admin-alert--error" role="alert">
          <CircleAlert size={18} />
          <div>
            <strong>Settings unavailable</strong>
            <p>{error}</p>
          </div>
          <button type="button" className="btn btn--quiet btn--small" onClick={() => void load()}>
            Try again
          </button>
        </div>
      )}

      {loading ? (
        <div className="admin-loading-panel" role="status">
          <LoaderCircle size={20} className="is-spinning" /> Loading studio settings…
        </div>
      ) : !settings ? (
        <div className="panel admin-panel-pad">
          <EmptyState
            icon={<Settings size={22} />}
            title="Settings are not initialised"
            description="The server could not find the studio settings row. Check the database initialisation before editing public details."
          />
        </div>
      ) : (
        <div className="admin-settings-layout">
          <div className="admin-settings-main">
            <section className="panel admin-panel-pad admin-settings-section">
              <div className="panel__header">
                <div>
                  <p className="panel__eyebrow">Public identity</p>
                  <h2>Studio details</h2>
                  <p>Shown on the public website and in quotation documents.</p>
                </div>
              </div>

              <div className="form-grid form-grid--two">
                <label className="field">
                  <span>Studio name *</span>
                  <input
                    value={form.studioName}
                    onChange={(event) => update('studioName', event.target.value)}
                  />
                  {fieldErrors.studioName && (
                    <small className="admin-field-error">{fieldErrors.studioName}</small>
                  )}
                </label>
                <label className="field">
                  <span>Tagline</span>
                  <input
                    value={form.tagline}
                    onChange={(event) => update('tagline', event.target.value)}
                  />
                </label>
              </div>

              <div className="form-grid form-grid--two">
                <label className="field">
                  <span>Public email *</span>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) => update('email', event.target.value)}
                  />
                  {fieldErrors.email && (
                    <small className="admin-field-error">{fieldErrors.email}</small>
                  )}
                </label>
                <label className="field">
                  <span>Public phone</span>
                  <input
                    value={form.phone}
                    onChange={(event) => update('phone', event.target.value)}
                  />
                  {fieldErrors.phone && (
                    <small className="admin-field-error">{fieldErrors.phone}</small>
                  )}
                </label>
              </div>

              <div className="form-grid form-grid--two">
                <label className="field">
                  <span>Address</span>
                  <input
                    value={form.address}
                    onChange={(event) => update('address', event.target.value)}
                  />
                </label>
                <label className="field">
                  <span>City</span>
                  <input value={form.city} onChange={(event) => update('city', event.target.value)} />
                </label>
              </div>

              <div className="form-grid form-grid--two">
                <label className="field">
                  <span>Instagram URL</span>
                  <input
                    value={form.instagramUrl}
                    onChange={(event) => update('instagramUrl', event.target.value)}
                    placeholder="https://instagram.com/…"
                  />
                  {fieldErrors.instagramUrl && (
                    <small className="admin-field-error">{fieldErrors.instagramUrl}</small>
                  )}
                </label>
                <label className="field">
                  <span>LinkedIn URL</span>
                  <input
                    value={form.linkedinUrl}
                    onChange={(event) => update('linkedinUrl', event.target.value)}
                    placeholder="https://linkedin.com/…"
                  />
                  {fieldErrors.linkedinUrl && (
                    <small className="admin-field-error">{fieldErrors.linkedinUrl}</small>
                  )}
                </label>
              </div>

              <ImageUploadField
                label="Studio logo"
                value={form.logoUrl}
                onChange={(url) => update('logoUrl', url)}
                hint="Used by the public site and PDF header. JPEG, PNG or WebP up to 5 MB."
                previewFit="contain"
              />
              {fieldErrors.logoUrl && (
                <small className="admin-field-error">{fieldErrors.logoUrl}</small>
              )}
            </section>

            <section className="panel admin-panel-pad admin-settings-section">
              <div className="panel__header">
                <div>
                  <p className="panel__eyebrow">Commercial defaults</p>
                  <h2>Quotations and tax</h2>
                  <p>These defaults are applied to new quotation drafts and generated PDFs.</p>
                </div>
              </div>

              <div className="form-grid form-grid--two">
                <label className="field">
                  <span>GSTIN</span>
                  <input
                    value={form.gstin}
                    onChange={(event) => update('gstin', event.target.value.toUpperCase())}
                    placeholder="15 letters and digits"
                  />
                  {fieldErrors.gstin && (
                    <small className="admin-field-error">{fieldErrors.gstin}</small>
                  )}
                </label>
                <label className="field">
                  <span>Default GST rate (%)</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={form.defaultGstRate}
                    onChange={(event) => update('defaultGstRate', event.target.value)}
                  />
                  {fieldErrors.defaultGstRate && (
                    <small className="admin-field-error">{fieldErrors.defaultGstRate}</small>
                  )}
                </label>
              </div>

              <label className="field">
                <span>Quotation notes / default terms</span>
                <textarea
                  rows={5}
                  value={form.quotationNotes}
                  onChange={(event) => update('quotationNotes', event.target.value)}
                  placeholder="Payment terms, validity and production notes."
                />
                {fieldErrors.quotationNotes && (
                  <small className="admin-field-error">{fieldErrors.quotationNotes}</small>
                )}
              </label>
            </section>

            <div className="admin-settings-save">
              <span>
                {dirty
                  ? 'You have unsaved changes.'
                  : settings
                    ? `Last saved ${formatDateTime(settings.updatedAt)}`
                    : 'Settings loaded.'}
              </span>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => void handleSave()}
                disabled={saving || !dirty}
              >
                {saving ? <LoaderCircle size={15} className="is-spinning" /> : <Save size={15} />}
                {saving ? 'Saving…' : 'Save settings'}
              </button>
            </div>
          </div>

          <aside className="admin-settings-aside">
            <section className="panel admin-panel-pad">
              <div className="panel__header">
                <div>
                  <p className="panel__eyebrow">Data integrity</p>
                  <h2>Stored by the API</h2>
                </div>
              </div>
              <div className="admin-kv-list">
                <div>
                  <span>Currency</span>
                  <strong>{settings.currency}</strong>
                </div>
                <div>
                  <span>Default GST</span>
                  <strong>{settings.defaultGstRate}%</strong>
                </div>
                <div>
                  <span>Last updated</span>
                  <strong>{formatDateTime(settings.updatedAt)}</strong>
                </div>
              </div>
            </section>

            <section className="panel admin-panel-pad admin-db-note">
              <ShieldCheck size={18} />
              <p className="panel__eyebrow">Security note</p>
              <h2>Administrator accounts are separate</h2>
              <p>
                Team records are contact entries only. Login access and password hashes are managed
                by the server environment, not from this form.
              </p>
            </section>
          </aside>
        </div>
      )}
    </div>
  )
}
