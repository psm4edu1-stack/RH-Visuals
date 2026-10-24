import { useCallback, useEffect, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  History,
  LoaderCircle,
  RefreshCw,
} from 'lucide-react'
import { AdminPageHeader } from '../../components/admin/AdminUI'
import { EmptyState } from '../../components/ui/EmptyState'
import { ApiError, api } from '../../lib/api'
import { formatDateTime, relativeTime } from '../../lib/utils'
import type { ActivityRecord } from '../../types'

const entityTypes = [
  'All',
  'project',
  'service',
  'enquiry',
  'client',
  'quotation',
  'asset',
  'team',
  'settings',
] as const

type EntityFilter = (typeof entityTypes)[number]

export function ActivityPage() {
  const [activities, setActivities] = useState<ActivityRecord[]>([])
  const [total, setTotal] = useState(0)
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [paging, setPaging] = useState({ limit: 50, offset: 0 })
  const [entityType, setEntityType] = useState<EntityFilter>('All')
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await api.admin.activity.list({
        entityType: entityType === 'All' ? undefined : entityType,
        limit: 50,
        offset,
      })
      setActivities(result.activities)
      setTotal(result.total)
      setCounts(result.counts)
      setPaging(result.paging)
    } catch (loadError) {
      setError(loadError instanceof ApiError ? loadError.message : 'Activity could not be loaded.')
    } finally {
      setLoading(false)
    }
  }, [entityType, offset])

  useEffect(() => {
    void load()
  }, [load])

  const selectFilter = (filter: EntityFilter) => {
    setEntityType(filter)
    setOffset(0)
  }

  return (
    <div className="admin-page">
      <AdminPageHeader
        overline="Audit trail"
        title="Activity"
        description="A read-only record of changes made by authenticated studio administrators. Entries are written by the API when records are created, updated or removed."
        actions={
          <button type="button" className="btn btn--quiet btn--small" onClick={() => void load()}>
            <RefreshCw size={14} /> Refresh
          </button>
        }
      />

      <div className="admin-enquiry-toolbar">
        <div className="admin-tabs admin-tabs--scroll" role="tablist" aria-label="Filter activity by type">
          {entityTypes.map((filter) => (
            <button
              type="button"
              key={filter}
              role="tab"
              aria-selected={entityType === filter}
              className={entityType === filter ? 'is-active' : ''}
              onClick={() => selectFilter(filter)}
            >
              {filter === 'All' ? 'All' : filter.charAt(0).toUpperCase() + filter.slice(1)}
            </button>
          ))}
        </div>
        <div className="admin-summary-row admin-summary-row--compact">
          <span>{counts.total ?? total} total entries</span>
          <span>
            Showing {total === 0 ? 0 : paging.offset + 1}–{Math.min(paging.offset + 50, total)} of{' '}
            {total}
          </span>
        </div>
      </div>

      {error && (
        <div className="admin-alert admin-alert--error" role="alert">
          <CircleAlert size={18} />
          <div>
            <strong>Activity unavailable</strong>
            <p>{error}</p>
          </div>
          <button type="button" className="btn btn--quiet btn--small" onClick={() => void load()}>
            Try again
          </button>
        </div>
      )}

      {loading ? (
        <div className="admin-loading-panel" role="status">
          <LoaderCircle size={20} className="is-spinning" /> Loading activity…
        </div>
      ) : activities.length === 0 ? (
        <div className="panel admin-panel-pad">
          <EmptyState
            icon={<History size={22} />}
            title={entityType === 'All' ? 'No activity recorded yet' : 'No activity for this type'}
            description={
              entityType === 'All'
                ? 'Creating, editing or deleting studio records will add entries to this audit trail.'
                : 'Try another entity filter or wait for the next studio change.'
            }
          />
        </div>
      ) : (
        <>
          <div className="panel admin-table-panel">
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Administrator</th>
                    <th>Action</th>
                    <th>Entity</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {activities.map((activity) => (
                    <tr key={activity.id}>
                      <td>
                        <strong className="admin-table-strong">
                          {relativeTime(activity.createdAt)}
                        </strong>
                        <small className="admin-table-sub">
                          {formatDateTime(activity.createdAt)}
                        </small>
                      </td>
                      <td>{activity.adminName || 'Studio admin'}</td>
                      <td>
                        <code className="admin-action-code">{activity.action}</code>
                      </td>
                      <td>
                        <span className="admin-entity-chip">{activity.entityType}</span>
                      </td>
                      <td>{activity.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="admin-pagination">
            <button
              type="button"
              className="btn btn--quiet btn--small"
              disabled={paging.offset <= 0}
              onClick={() => setOffset(Math.max(0, paging.offset - 50))}
            >
              <ChevronLeft size={14} /> Previous
            </button>
            <span>
              Page {Math.floor(paging.offset / 50) + 1} of {Math.max(1, Math.ceil(total / 50))}
            </span>
            <button
              type="button"
              className="btn btn--quiet btn--small"
              disabled={paging.offset + 50 >= total}
              onClick={() => setOffset(paging.offset + 50)}
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </>
      )}
    </div>
  )
}
