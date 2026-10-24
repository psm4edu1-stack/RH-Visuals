import { Sparkles } from 'lucide-react'
import type { ReactNode } from 'react'

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="empty-state">
      <span className="empty-state__icon">{icon ?? <Sparkles size={22} />}</span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  )
}
