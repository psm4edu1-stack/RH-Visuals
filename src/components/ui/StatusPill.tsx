import { cn, getQuoteStatusTone } from '../../lib/utils'

export function StatusPill({
  status,
  dot = true,
  className,
}: {
  status: string
  dot?: boolean
  className?: string
}) {
  const tone = getQuoteStatusTone(status)
  return (
    <span className={cn('status-pill', `status-pill--${tone}`, className)}>
      {dot && <span className="status-pill__dot" aria-hidden="true" />}
      {status}
    </span>
  )
}
