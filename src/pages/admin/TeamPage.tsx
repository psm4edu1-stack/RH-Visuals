import { useCallback, useEffect, useState } from 'react'
import {
  CircleAlert,
  LoaderCircle,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UserRound,
  Users,
} from 'lucide-react'
import { AdminPageHeader } from '../../components/admin/AdminUI'
import { Avatar } from '../../components/ui/Avatar'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { EmptyState } from '../../components/ui/EmptyState'
import { Modal } from '../../components/ui/Overlay'
import { StatusPill } from '../../components/ui/StatusPill'
import { useToast } from '../../components/ui/Toast'
import { ApiError, api } from '../../lib/api'
import { relativeTime } from '../../lib/utils'
import type { TeamMemberRecord } from '../../types'

type TeamForm = {
  name: string
  email: string
  phone: string
  title: string
  status: 'Active' | 'Inactive'
  color: string
}

const emptyForm: TeamForm = {
  name: '',
  email: '',
  phone: '',
  title: '',
  status: 'Active',
  color: '#7541A8',
}

const palette = ['#F15B40', '#7541A8', '#FFC928', '#57826E', '#C9856C', '#5D5A78']

function toForm(member: TeamMemberRecord): TeamForm {
  return {
    name: member.name,
    email: member.email,
    phone: member.phone,
    title: member.title,
    status: member.status,
    color: member.color || '#7541A8',
  }
}

export function TeamPage() {
  const { toast } = useToast()
  const [team, setTeam] = useState<TeamMemberRecord[]>([])
  const [counts, setCounts] = useState({ total: 0, active: 0, inactive: 0 })
  const [filter, setFilter] = useState<'All' | 'Active' | 'Inactive'>('All')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<TeamMemberRecord | null>(null)
  const [form, setForm] = useState<TeamForm>(emptyForm)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<TeamMemberRecord | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await api.admin.team.list()
      setTeam(result.team)
      setCounts(result.counts)
    } catch (loadError) {
      setError(loadError instanceof ApiError ? loadError.message : 'Team records could not be loaded.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const openCreate = () => {
    setForm(emptyForm)
    setEditing(null)
    setFieldErrors({})
    setEditorOpen(true)
  }

  const openEdit = (member: TeamMemberRecord) => {
    setForm(toForm(member))
    setEditing(member)
    setFieldErrors({})
    setEditorOpen(true)
  }

  const update = (field: keyof TeamForm, value: string) => {
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
      const result = editing
        ? await api.admin.team.update(editing.id, form)
        : await api.admin.team.create(form)
      setEditorOpen(false)
      toast(editing ? 'Team member updated' : 'Team member added', {
        description: result.member.name,
      })
      await load()
    } catch (saveError) {
      if (saveError instanceof ApiError) {
        setFieldErrors(saveError.fields ?? {})
        if (!saveError.fields) setError(saveError.message)
        toast('Team member not saved', { description: saveError.message, tone: 'error' })
      } else {
        toast('Team member not saved', {
          description: 'The API server could not complete the save.',
          tone: 'error',
        })
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (member: TeamMemberRecord) => {
    try {
      await api.admin.team.remove(member.id)
      setTeam((current) => current.filter((item) => item.id !== member.id))
      setDeleteTarget(null)
      toast('Team member removed', { description: member.name })
      await load()
    } catch (deleteError) {
      toast('Team member not removed', {
        description:
          deleteError instanceof ApiError
            ? deleteError.message
            : 'The record could not be deleted.',
        tone: 'error',
      })
    }
  }

  const search = query.trim().toLowerCase()
  const visible = team.filter((member) => {
    if (filter !== 'All' && member.status !== filter) return false
    if (!search) return true
    return [member.name, member.email, member.title, member.phone].some((value) =>
      value.toLowerCase().includes(search),
    )
  })

  return (
    <div className="admin-page">
      <AdminPageHeader
        overline="People"
        title="Team"
        description="The studio crew and collaborators stored in the database. Roles here are contact records, not administrator login accounts."
        actions={
          <>
            <button type="button" className="btn btn--quiet btn--small" onClick={() => void load()}>
              <RefreshCw size={14} /> Refresh
            </button>
            <button type="button" className="btn btn--primary btn--small" onClick={openCreate}>
              <Plus size={15} /> Add member
            </button>
          </>
        }
      />

      <div className="admin-enquiry-toolbar">
        <div className="admin-tabs" role="tablist" aria-label="Filter team by status">
          {(['All', 'Active', 'Inactive'] as const).map((tab) => (
            <button
              type="button"
              key={tab}
              role="tab"
              aria-selected={filter === tab}
              className={filter === tab ? 'is-active' : ''}
              onClick={() => setFilter(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
        <form className="admin-search" role="search" onSubmit={(event) => event.preventDefault()}>
          <Search size={15} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter by name, role or email…"
            aria-label="Filter team"
          />
        </form>
      </div>

      {error && (
        <div className="admin-alert admin-alert--error" role="alert">
          <CircleAlert size={18} />
          <div>
            <strong>Team unavailable</strong>
            <p>{error}</p>
          </div>
          <button type="button" className="btn btn--quiet btn--small" onClick={() => void load()}>
            Try again
          </button>
        </div>
      )}

      <div className="admin-summary-row">
        <span>{counts.total} team member{counts.total === 1 ? '' : 's'}</span>
        <span>{counts.active} active</span>
        <span>{counts.inactive} inactive</span>
      </div>

      {loading ? (
        <div className="admin-loading-panel" role="status">
          <LoaderCircle size={20} className="is-spinning" /> Loading team records…
        </div>
      ) : visible.length === 0 ? (
        <div className="panel admin-panel-pad">
          <EmptyState
            icon={<Users size={22} />}
            title={team.length === 0 ? 'No team records yet' : 'No matching team members'}
            description={
              team.length === 0
                ? 'Add the studio crew, producers and collaborators who should be kept in the internal directory.'
                : 'Try another filter or search term.'
            }
            action={
              team.length === 0 ? (
                <button type="button" className="btn btn--primary btn--small" onClick={openCreate}>
                  <Plus size={14} /> Add the first member
                </button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <div className="panel admin-table-panel">
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Role</th>
                  <th>Contact</th>
                  <th>Status</th>
                  <th>Updated</th>
                  <th className="align-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((member) => (
                  <tr key={member.id}>
                    <td>
                      <div className="admin-person-cell">
                        <Avatar name={member.name} color={member.color || '#7541A8'} size="sm" />
                        <span>
                          <strong>{member.name}</strong>
                          <small>{member.phone || 'No phone'}</small>
                        </span>
                      </div>
                    </td>
                    <td>
                      <strong className="admin-table-strong">{member.title || '—'}</strong>
                    </td>
                    <td>
                      <a href={`mailto:${member.email}`} className="admin-table-link">
                        {member.email}
                      </a>
                    </td>
                    <td>
                      <StatusPill status={member.status} />
                    </td>
                    <td>{relativeTime(member.updatedAt)}</td>
                    <td>
                      <div className="admin-row-actions">
                        <button type="button" onClick={() => openEdit(member)} title="Edit member">
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          className="is-danger"
                          onClick={() => setDeleteTarget(member)}
                          title="Remove member"
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
        title={editing ? 'Edit team member' : 'Add team member'}
        eyebrow="Studio directory"
        description="Contact records only. Administrator access is managed separately by the server."
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
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Add member'}
            </button>
          </>
        }
      >
        <div className="admin-form">
          <div className="form-grid form-grid--two">
            <label className="field">
              <span>Full name *</span>
              <input value={form.name} onChange={(event) => update('name', event.target.value)} />
              {fieldErrors.name && <small className="admin-field-error">{fieldErrors.name}</small>}
            </label>
            <label className="field">
              <span>Role / title</span>
              <input value={form.title} onChange={(event) => update('title', event.target.value)} />
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
              <span>Status</span>
              <select
                value={form.status}
                onChange={(event) => update('status', event.target.value)}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
              {fieldErrors.status && <small className="admin-field-error">{fieldErrors.status}</small>}
            </label>
            <label className="field">
              <span>Avatar colour</span>
              <div className="admin-color-field">
                <input
                  type="color"
                  value={form.color}
                  onChange={(event) => update('color', event.target.value)}
                  aria-label="Avatar colour"
                />
                <input
                  value={form.color}
                  onChange={(event) => update('color', event.target.value)}
                  placeholder="#7541A8"
                />
              </div>
              {fieldErrors.color && <small className="admin-field-error">{fieldErrors.color}</small>}
            </label>
          </div>

          <div className="admin-swatch-row">
            {palette.map((color) => (
              <button
                key={color}
                type="button"
                className={form.color === color ? 'is-active' : ''}
                style={{ backgroundColor: color }}
                onClick={() => update('color', color)}
                aria-label={`Use ${color}`}
              />
            ))}
            <span>
              <UserRound size={13} /> Preview: <Avatar name={form.name || 'New member'} color={form.color} size="sm" />
            </span>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) void handleDelete(deleteTarget)
        }}
        title="Remove this team member?"
        description={
          deleteTarget
            ? `${deleteTarget.name} will be removed from the studio directory. This does not affect administrator login access.`
            : ''
        }
        confirmLabel="Remove member"
      />
    </div>
  )
}
