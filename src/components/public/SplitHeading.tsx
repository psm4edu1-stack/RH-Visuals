import { cn } from '../../lib/utils'

type SplitHeadingProps = {
  left: string
  right: string
  active: boolean
  as?: 'h1' | 'h2' | 'h3'
  id?: string
  className?: string
}

/**
 * Shared split-word heading for Work and Services.
 *
 * The visible words are decorative spans; the heading itself keeps a single,
 * readable accessible name such as "Our Works".
 */
export function SplitHeading({
  left,
  right,
  active,
  as: Tag = 'h1',
  id,
  className,
}: SplitHeadingProps) {
  return (
    <Tag
      id={id}
      className={cn('split-heading', active && 'is-visible', className)}
      aria-label={`${left} ${right}`}
    >
      <span className="split-heading__word split-heading__word--left" aria-hidden="true">
        {left}
      </span>
      <span className="split-heading__word split-heading__word--right" aria-hidden="true">
        {right}
      </span>
    </Tag>
  )
}
