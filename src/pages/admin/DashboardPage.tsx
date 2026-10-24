import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowUpRight,
  CircleAlert,
  FileText,
  History,
  Images,
  Inbox,
  Layers3,
  LoaderCircle,
  Mail,
  Plus,
  RefreshCw,
  UsersRound,
} from 'lucide-react'
import { AdminPageHeader } from '../../components/admin/AdminUI'
import { EmptyState } from '../../components/ui/EmptyState'
import { StatusPill } from '../../components/ui/StatusPill'
import { useAuth } from '../../lib/auth'
import { ApiError, api } from '../../lib/api'
import { formatCurrency, formatDate, relativeTime } from '../../lib/utils'
import type { ActivityRecord, DashboardData, QuotationStatus } from '../../types'

type QuotationCounts = {
  total: number
  pipelinePaise: number
  acceptedPaise: number
} & Record<QuotationStatus, number>

const quotationStatuses: QuotationStatus[] = [
  'Draft',
  'Issued',
  'Accepted',
  'Rejected',
  'Expired',
  'Cancelled',
]

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export function DashboardPage() {
  const { user } = useAuth()
  const [data, setData] = useState<DashboardData | null>(null)
  const [quotationCounts, setQuotationCounts] = useState<QuotationCounts | null>(null)
  const [activities, setActivities] = useState<ActivityRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [dashboardResult, quotationResult, activityResult] = await Promise.allSettled([
        api.admin.dashboard(),
        api.admin.quotations.list(),
        api.admin.activity.list({ limit: 6 }),
      ])
      if (dashboardResult.status === 'rejected') throw dashboardResult.reason
      setData(dashboardResult.value)
      setQuotationCounts(
        quotationResult.status === 'fulfilled' ? quotationResult.value.counts : null,
      )
      setActivities(
        activityResult.status === 'fulfilled' ? activityResult.value.activities : [],
      )
    } catch (loadError) {
      setError(
        loadError instanceof ApiError
          ? loadError.message
          : 'The dashboard could not be loaded.',
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="admin-page">
      <AdminPageHeader
        overline="Studio overview"
        title={`${greeting()}, ${user?.name.split(' ')[0] ?? 'Studio'}.`}
        description="A live read of the public site and the enquiry pipeline. Every figure below comes from the studio database."
        actions={
          <>
            <button type="button" className="btn btn--quiet btn--small" onClick={() => void load()}>
              <RefreshCw size={14} /> Refresh
            </button>
            <Link to="/admin/portfolio?new=1" className="btn btn--primary btn--small">
              <Plus size={15} /> New project
            </Link>
          </>
        }
      />

      {error && (
        <div className="admin-alert admin-alert--error" role="alert">
          <CircleAlert size={18} />
          <div>
            <strong>Dashboard unavailable</strong>
            <p>{error}</p>
          </div>
          <button type="button" className="btn btn--quiet btn--small" onClick={() => void load()}>
            Try again
          </button>
        </div>
      )}

      {loading && !data ? (
        <div className="admin-loading-panel" role="status">
          <LoaderCircle size={20} className="is-spinning" />
          Loading database counts…
        </div>
      ) : data ? (
        <>
          <section className="stat-grid dashboard-stat-grid" aria-label="Database totals">
            <article className="stat-card">
              <div className="stat-card__top">
                <span className="stat-card__icon stat-card__icon--orange">
                  <Images size={16} />
                </span>
                <span className="admin-metric-tag">Portfolio</span>
              </div>
              <strong>{data.counts.projects.total}</strong>
              <p>total project{data.counts.projects.total === 1 ? '' : 's'}</p>
              <div className="stat-card__foot">
                <small>{data.counts.projects.published} published</small>
                <small>{data.counts.projects.drafts} draft</small>
              </div>
            </article>

            <article className="stat-card">
              <div className="stat-card__top">
                <span className="stat-card__icon stat-card__icon--gold">
                  <Layers3 size={16} />
                </span>
                <span className="admin-metric-tag">Services</span>
              </div>
              <strong>{data.counts.services.total}</strong>
              <p>total service{data.counts.services.total === 1 ? '' : 's'}</p>
              <div className="stat-card__foot">
                <small>{data.counts.services.published} published</small>
                <small>{data.counts.services.drafts} draft</small>
              </div>
            </article>

            <article className="stat-card">
              <div className="stat-card__top">
                <span className="stat-card__icon stat-card__icon--green">
                  <Inbox size={16} />
                </span>
                <span className="admin-metric-tag">Enquiries</span>
              </div>
              <strong>{data.counts.enquiries.total}</strong>
              <p>total enquir{data.counts.enquiries.total === 1 ? 'y' : 'ies'}</p>
              <div className="stat-card__foot">
                <small>{data.counts.enquiries.pending} pending</small>
                <small>{data.counts.enquiries.completed} completed</small>
              </div>
            </article>

            <article className="stat-card">
              <div className="stat-card__top">
                <span className="stat-card__icon">
                  <Mail size={16} />
                </span>
                <span className="admin-metric-tag">Pipeline</span>
              </div>
              <strong>{data.counts.enquiries.contacted}</strong>
              <p>conversations in progress</p>
              <div className="stat-card__foot">
                <small>{data.counts.enquiries.pending} awaiting reply</small>
                <Link to="/admin/enquiries" className="panel__link">
                  Open <ArrowUpRight size={12} />
                </Link>
              </div>
            </article>

            <article className="stat-card">
              <div className="stat-card__top">
                <span className="stat-card__icon">
                  <UsersRound size={16} />
                </span>
                <span className="admin-metric-tag">Clients</span>
              </div>
              <strong>{data.counts.clients.total}</strong>
              <p>client relationship{data.counts.clients.total === 1 ? '' : 's'}</p>
              <div className="stat-card__foot">
                <small>{data.counts.clients.active} active</small>
                <small>{data.counts.clients.prospects} prospect{data.counts.clients.prospects === 1 ? '' : 's'}</small>
              </div>
            </article>

            <article className="stat-card">
              <div className="stat-card__top">
                <span className="stat-card__icon stat-card__icon--orange">
                  <FileText size={16} />
                </span>
                <span className="admin-metric-tag">Quotations</span>
              </div>
              <strong>{data.counts.quotations.total}</strong>
              <p>quotation{data.counts.quotations.total === 1 ? '' : 's'} on record</p>
              <div className="stat-card__foot">
                <small>Pipeline {formatCurrency(data.counts.quotations.pipelinePaise / 100)}</small>
                <small>Accepted {formatCurrency(data.counts.quotations.acceptedPaise / 100)}</small>
              </div>
            </article>
          </section>

          <div className="admin-dashboard-grid">
            <section className="panel admin-table-panel">
              <div className="panel__header admin-panel-pad">
                <div>
                  <p className="panel__eyebrow panel__eyebrow--spark">Live inbox</p>
                  <h2>Recent enquiries</h2>
                  <p>Saved contact and booking requests from the public website.</p>
                </div>
                <Link to="/admin/enquiries" className="btn btn--quiet btn--small">
                  View all <ArrowUpRight size={14} />
                </Link>
              </div>

              {data.recentEnquiries.length === 0 ? (
                <div className="admin-panel-pad">
                  <EmptyState
                    icon={<Inbox size={21} />}
                    title="No enquiries yet"
                    description="New contact and booking submissions will appear here after the database confirms them."
                  />
                </div>
              ) : (
                <div className="table-scroll">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Event</th>
                        <th>Budget</th>
                        <th>Received</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recentEnquiries.map((enquiry) => (
                        <tr key={enquiry.id}>
                          <td>
                            <Link to={`/admin/enquiries?open=${enquiry.id}`} className="table-primary">
                              {enquiry.name}
                            </Link>
                            <small className="admin-table-sub">{enquiry.email}</small>
                          </td>
                          <td>
                            <strong className="admin-table-strong">{enquiry.eventType}</strong>
                            <small className="admin-table-sub">
                              {enquiry.eventDate ? formatDate(enquiry.eventDate) : 'Date flexible'}
                            </small>
                          </td>
                          <td>{enquiry.budget ? formatCurrency(enquiry.budget) : 'Not set'}</td>
                          <td>{relativeTime(enquiry.createdAt)}</td>
                          <td>
                            <StatusPill status={enquiry.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <aside className="admin-dashboard-side">
              <section className="panel admin-panel-pad">
                <div className="panel__header">
                  <div>
                    <p className="panel__eyebrow">Recently updated</p>
                    <h2>Portfolio records</h2>
                  </div>
                </div>
                {data.recentProjects.length === 0 ? (
                  <EmptyState
                    icon={<Images size={21} />}
                    title="No projects yet"
                    description="The public Work section is showing its real empty state. Publish a database project to make it live."
                    action={
                      <Link to="/admin/portfolio?new=1" className="btn btn--primary btn--small">
                        <Plus size={14} /> Add first project
                      </Link>
                    }
                  />
                ) : (
                  <div className="admin-recent-projects">
                    {data.recentProjects.map((project) => (
                      <Link to="/admin/portfolio" key={project.id} className="admin-recent-project">
                        <img src={project.cover} alt="" />
                        <span className="admin-recent-project__copy">
                          <strong>{project.title}</strong>
                          <small>{project.category}</small>
                        </span>
                        <StatusPill status={project.status === 'published' ? 'Published' : 'Draft'} />
                      </Link>
                    ))}
                  </div>
                )}
              </section>

              {quotationCounts && (
                <section className="panel admin-panel-pad">
                  <div className="panel__header">
                    <div>
                      <p className="panel__eyebrow">Commercial</p>
                      <h2>Quotations by status</h2>
                    </div>
                    <Link to="/admin/quotations" className="btn btn--quiet btn--small">
                      Open <ArrowUpRight size={13} />
                    </Link>
                  </div>
                  <div className="admin-status-breakdown">
                    {quotationStatuses.map((quotationStatus) => (
                      <div key={quotationStatus}>
                        <StatusPill status={quotationStatus} />
                        <span>{quotationCounts[quotationStatus]}</span>
                        <strong>
                          {formatCurrency(
                            quotationStatus === 'Accepted'
                              ? quotationCounts.acceptedPaise / 100
                              : quotationStatus === 'Draft' || quotationStatus === 'Issued'
                                ? quotationCounts.pipelinePaise / 100
                                : 0,
                          )}
                        </strong>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {activities.length > 0 && (
                <section className="panel admin-panel-pad">
                  <div className="panel__header">
                    <div>
                      <p className="panel__eyebrow">
                        <History size={12} /> Audit trail
                      </p>
                      <h2>Recent activity</h2>
                    </div>
                    <Link to="/admin/activity" className="btn btn--quiet btn--small">
                      View all <ArrowUpRight size={13} />
                    </Link>
                  </div>
                  <div className="admin-activity-list">
                    {activities.map((activity) => (
                      <div key={activity.id}>
                        <span>
                          <strong>{activity.description}</strong>
                          <small>
                            {activity.adminName} · {relativeTime(activity.createdAt)}
                          </small>
                        </span>
                        <em>{activity.entityType}</em>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <section className="panel admin-panel-pad admin-db-note">
                <p className="panel__eyebrow">Persistence check</p>
                <h2>Database connected</h2>
                <p>
                  Content, uploads and enquiries are stored by the API. Portfolio totals and
                  publication states are read directly from the database.
                </p>
                <span className="admin-db-note__time">
                  Synced {new Date(data.serverTime).toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </section>
            </aside>
          </div>
        </>
      ) : null}
    </div>
  )
}
