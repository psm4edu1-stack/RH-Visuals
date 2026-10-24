import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

export function AdminPageHeader({
  overline,
  title,
  description,
  actions,
  className,
}: {
  overline?: string
  title: string
  description?: string
  actions?: ReactNode
  className?: string
}) {
  return (
    <header className={cn('admin-page-head', className)}>
      <div>
        {overline && <p className="admin-overline">{overline}</p>}
        <h1>{title}</h1>
        {description && <p className="admin-page-head__description">{description}</p>}
      </div>
      {actions && <div className="admin-page-head__actions">{actions}</div>}
    </header>
  )
}

export function Sparkline({
  values,
  color = '#F15B40',
}: {
  values: number[]
  color?: string
}) {
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const points = values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * 100
      const y = 28 - ((value - min) / Math.max(max - min, 1)) * 24
      return `${x},${y}`
    })
    .join(' ')
  return (
    <svg
      className="sparkline"
      viewBox="0 0 100 32"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

export type RevenueDatum = {
  label: string
  delivered: number
  pipeline: number
}

export function RevenueBars({ data }: { data: RevenueDatum[] }) {
  const max = Math.max(
    ...data.map((item) => Math.max(item.delivered, item.pipeline)),
    1,
  )
  const roundedMax = Math.ceil(max / 500000) * 500000
  const ticks = [roundedMax, roundedMax * 0.75, roundedMax * 0.5, roundedMax * 0.25, 0]

  return (
    <div className="revenue-chart">
      <div className="revenue-chart__y">
        {ticks.map((tick) => (
          <span key={tick}>
            {tick >= 10000000
              ? `${(tick / 10000000).toFixed(1)}Cr`
              : tick >= 100000
                ? `${(tick / 100000).toFixed(0)}L`
                : tick === 0
                  ? '0'
                  : `₹${(tick / 1000).toFixed(0)}K`}
          </span>
        ))}
      </div>
      <div className="revenue-chart__plot">
        <div className="revenue-chart__grid" aria-hidden="true">
          {ticks.map((tick) => (
            <span key={tick} />
          ))}
        </div>
        <div className="revenue-chart__bars">
          {data.map((item) => (
            <div className="revenue-bar-group" key={item.label}>
              <div className="revenue-bars">
                <span
                  className="revenue-bar revenue-bar--delivered"
                  style={{ height: `${Math.max(2, (item.delivered / roundedMax) * 100)}%` }}
                  title={`${item.label} delivered: ${item.delivered.toLocaleString('en-IN')}`}
                />
                <span
                  className="revenue-bar revenue-bar--pipeline"
                  style={{ height: `${Math.max(2, (item.pipeline / roundedMax) * 100)}%` }}
                  title={`${item.label} pipeline: ${item.pipeline.toLocaleString('en-IN')}`}
                />
              </div>
              <span className="revenue-chart__label">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function Donut({
  segments,
  centerValue,
  centerLabel,
}: {
  segments: { value: number; color: string; label: string }[]
  centerValue: string
  centerLabel: string
}) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0) || 1
  let cursor = 0
  const stops = segments.map((segment) => {
    const start = cursor
    cursor += (segment.value / total) * 100
    return `${segment.color} ${start}% ${cursor}%`
  })

  return (
    <div
      className="donut"
      style={{ background: `conic-gradient(${stops.join(', ')})` }}
      role="img"
      aria-label={segments.map((segment) => `${segment.label}: ${segment.value}`).join(', ')}
    >
      <div className="donut__center">
        <strong>{centerValue}</strong>
        <span>{centerLabel}</span>
      </div>
    </div>
  )
}
