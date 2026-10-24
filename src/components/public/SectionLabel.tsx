import type { ReactNode } from 'react'

export function SectionLabel({
  index,
  children,
  light = false,
}: {
  index?: string
  children: ReactNode
  light?: boolean
}) {
  return (
    <p className={`section-label ${light ? 'section-label--light' : ''}`}>
      {index && <span>{index}</span>}
      {children}
    </p>
  )
}
