import { Link } from 'react-router-dom'
import { cn } from '../../lib/utils'

type BrandLogoProps = {
  to?: string
  className?: string
  compact?: boolean
  tone?: 'light' | 'dark'
}

export function BrandLogo({
  to = '/',
  className,
  compact = false,
  tone = 'light',
}: BrandLogoProps) {
  const logoSrc =
    tone === 'dark' ? '/rh-visuals-logo.png' : '/rh-visuals-logo-light.png'

  return (
    <Link
      to={to}
      className={cn(
        'brand-logo',
        `brand-logo--${tone}`,
        compact && 'brand-logo--compact',
        className,
      )}
      aria-label="RH VISUALS — Beyond Your Creation"
    >
      <img
        className="brand-logo__image"
        src={logoSrc}
        alt=""
        width={616}
        height={141}
        decoding="async"
        fetchPriority="high"
        draggable={false}
      />
    </Link>
  )
}
