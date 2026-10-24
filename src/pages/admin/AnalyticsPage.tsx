import { useCallback, useEffect, useState } from 'react'
import {
  BarChart3,
  CircleAlert,
  FileText,
  Images,
  Inbox,
  Layers3,
  LoaderCircle,
  RefreshCw,
  UsersRound,
} from 'lucide-react'
import { AdminPageHeader } from '../../components/admin/AdminUI'
import { EmptyState } from '../../components/ui/EmptyState'
import { StatusPill } from '../../components/ui/StatusPill'
import { ApiError, api } from '../../lib/api'
import { formatCurrency, formatDateTime, relativeTime } from '../../lib/utils'
import type { AnalyticsData } from '../../types'

export function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setData(await api.admin.analytics())
    } catch (loadError) {
      setError(loadError instanceof ApiError ? loadError.message : 'Analytics could not be loaded.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const maxMonthly = data
    ? Math.max(1, ...data.monthly.map((month) => Math.max(month.enquiries, month.quotations)))
    : 1

  return (
    <div className="admin-page">
      <AdminPageHeader
        overline="Insights"
        title="Analytics"
        description="A database read of the studio pipeline, client relationships and quotation conversion. No sample or projected figures are added."
        actions={
          <button type="button" className="btn btn--quiet btn--small" onClick={() => void load()}>
            <RefreshCw size={14} /> Refresh
          </button>
        }
      />

      {error && (
        <div className="admin-alert admin-alert--error" role="alert">
          <CircleAlert size={18} />
          <div>
            <strong>Analytics unavailable</strong>
            <p>{error}</p>
          </div>
          <button type="button" className="btn btn--quiet btn--small" onClick={() => void load()}>
            Try again
          </button>
        </div>
      )}

      {loading && !data ? (
        <div className="admin-loading-panel" role="status">
          <LoaderCircle size={20} className="is-spinning" /> Reading studio analytics…
        </div>
      ) : data ? (
        <>
          <section className="stat-grid" aria-label="Studio totals">
            <article className="stat-card">
              <div className="stat-card__top">
                <span className="stat-card__icon stat-card__icon--orange">
                  <Images size={16} />
                </span>
                <span className="admin-metric-tag">Portfolio</span>
              </div>
              <strong>{data.totals.projects.published}</strong>
              <p>published of {data.totals.projects.total} project records</p>
            </article>
            <article className="stat-card">
              <div className="stat-card__top">
                <span className="stat-card__icon stat-card__icon--gold">
                  <Layers3 size={16} />
                </span>
                <span className="admin-metric-tag">Services</span>
              </div>
              <strong>{data.totals.services.published}</strong>
              <p>published of {data.totals.services.total} service records</p>
            </article>
            <article className="stat-card">
              <div className="stat-card__top">
                <span className="stat-card__icon stat-card__icon--green">
                  <Inbox size={16} />
                </span>
                <span className="admin-metric-tag">Enquiries</span>
              </div>
              <strong>{data.totals.enquiries}</strong>
              <p>database enquiries received</p>
            </article>
            <article className="stat-card">
              <div className="stat-card__top">
                <span className="stat-card__icon">
                  <UsersRound size={16} />
                </span>
                <span className="admin-metric-tag">Clients</span>
              </div>
              <strong>{data.totals.clients}</strong>
              <p>client relationships recorded</p>
            </article>
          </section>

          <div className="admin-dashboard-grid">
            <section className="panel admin-table-panel">
              <div className="panel__header admin-panel-pad">
                <div>
                  <p className="panel__eyebrow">Last six months</p>
                  <h2>Enquiries and quotations</h2>
                  <p>Monthly records created in the studio database.</p>
                </div>
              </div>
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th>Enquiries</th>
                      <th>Quotations</th>
                      <th>Quoted value</th>
                      <th>Accepted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.monthly.map((month) => (
                      <tr key={month.month}>
                        <td>
                          <strong className="admin-table-strong">{month.label}</strong>
                          <small className="admin-table-sub">{month.month}</small>
                        </td>
                        <td>
                          <div className="admin-mini-bar">
                            <span style={{ width: `${(month.enquiries / maxMonthly) * 100}%` }} />
                            <strong>{month.enquiries}</strong>
                          </div>
                        </td>
                        <td>
                          <div className="admin-mini-bar admin-mini-bar--gold">
                            <span style={{ width: `${(month.quotations / maxMonthly) * 100}%` }} />
                            <strong>{month.quotations}</strong>
                          </div>
                        </td>
                        <td>{formatCurrency(month.quotedPaise / 100)}</td>
                        <td>{month.accepted}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <aside className="admin-dashboard-side">
              <section className="panel admin-panel-pad">
                <div className="panel__header">
                  <div>
                    <p className="panel__eyebrow">Commercial</p>
                    <h2>Quotation pipeline</h2>
                  </div>
                </div>
                <div className="admin-kv-list">
                  <div>
                    <span>Total quotations</span>
                    <strong>{data.totals.quotations.total}</strong>
                  </div>
                  <div>
                    <span>Pipeline value</span>
                    <strong>{formatCurrency(data.totals.quotations.pipelinePaise / 100)}</strong>
                  </div>
                  <div>
                    <span>Accepted value</span>
                    <strong>{formatCurrency(data.totals.quotations.acceptedPaise / 100)}</strong>
                  </div>
                  <div>
                    <span>Win rate</span>
                    <strong>{data.conversion.winRate === null ? '—' : `${data.conversion.winRate}%`}</strong>
                  </div>
                </div>
                <div className="admin-status-breakdown">
                  {data.quotationStatus.map((row) => (
                    <div key={row.status}>
                      <StatusPill status={row.status} />
                      <span>{row.count}</span>
                      <strong>{formatCurrency(row.valuePaise / 100)}</strong>
                    </div>
                  ))}
                </div>
              </section>

              <section className="panel admin-panel-pad">
                <div className="panel__header">
                  <div>
                    <p className="panel__eyebrow">Relationships</p>
                    <h2>Clients by status</h2>
                  </div>
                </div>
                <div className="admin-kv-list">
                  <div>
                    <span>Active</span>
                    <strong>{data.clientsByStatus.active}</strong>
                  </div>
                  <div>
                    <span>Prospect</span>
                    <strong>{data.clientsByStatus.prospect}</strong>
                  </div>
                  <div>
                    <span>Past</span>
                    <strong>{data.clientsByStatus.past}</strong>
                  </div>
                </div>
              </section>
            </aside>
          </div>

          <div className="admin-dashboard-grid">
            <section className="panel admin-table-panel">
              <div className="panel__header admin-panel-pad">
                <div>
                  <p className="panel__eyebrow">Relationships</p>
                  <h2>Top clients by value</h2>
                  <p>Clients with quotations, ordered by accepted value.</p>
                </div>
              </div>
              {data.topClients.length === 0 ? (
                <div className="admin-panel-pad">
                  <EmptyState
                    icon={<UsersRound size={21} />}
                    title="No quoted clients yet"
                    description="Create a client and a quotation to start measuring client value."
                  />
                </div>
              ) : (
                <div className="table-scroll">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Client</th>
                        <th>Quotes</th>
                        <th>Pipeline</th>
                        <th>Accepted</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.topClients.map((client) => (
                        <tr key={client.id}>
                          <td>
                            <strong className="admin-table-strong">{client.company}</strong>
                            <small className="admin-table-sub">{client.contactName}</small>
                          </td>
                          <td>{client.quoteCount}</td>
                          <td>{formatCurrency(client.pipelinePaise / 100)}</td>
                          <td>{formatCurrency(client.acceptedPaise / 100)}</td>
                          <td>
                            <StatusPill status={client.status} />
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
                    <p className="panel__eyebrow">Demand</p>
                    <h2>Requested services</h2>
                  </div>
                </div>
                {data.requestedServices.length === 0 ? (
                  <p className="admin-related-empty">No service selections in enquiry records yet.</p>
                ) : (
                  <div className="admin-service-demand">
                    {data.requestedServices.map((service) => (
                      <div key={service.service}>
                        <span>{service.service}</span>
                        <strong>{service.count}</strong>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="panel admin-panel-pad">
                <div className="panel__header">
                  <div>
                    <p className="panel__eyebrow">Audit</p>
                    <h2>Recent activity</h2>
                  </div>
                </div>
                {data.recentActivity.length === 0 ? (
                  <p className="admin-related-empty">No activity has been recorded yet.</p>
                ) : (
                  <div className="admin-activity-list">
                    {data.recentActivity.map((activity) => (
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
                )}
              </section>
            </aside>
          </div>

          <section className="panel admin-panel-pad admin-analytics-note">
            <BarChart3 size={18} />
            <div>
              <strong>Conversion snapshot</strong>
              <p>
                {data.conversion.enquiries} enquiries · {data.conversion.linkedEnquiries} linked to a
                client · {data.conversion.quotations} quotations · {data.conversion.accepted} accepted
                of {data.conversion.decided} decided.
              </p>
            </div>
            <span>Generated {formatDateTime(data.generatedAt)}</span>
          </section>
        </>
      ) : (
        <div className="panel admin-panel-pad">
          <EmptyState
            icon={<FileText size={22} />}
            title="No analytics yet"
            description="Analytics will appear after the database has projects, enquiries, clients or quotations."
          />
        </div>
      )}
    </div>
  )
}
