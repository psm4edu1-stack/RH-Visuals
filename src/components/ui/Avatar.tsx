import { cn, getInitials } from '../../lib/utils'

type AvatarProps = {
  name: string
  color?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export function Avatar({ name, color = '#7541A8', size = 'md', className }: AvatarProps) {
  return (
    <span
      className={cn('avatar', `avatar--${size}`, className)}
      style={{ backgroundColor: color }}
      aria-hidden="true"
      title={name}
    >
      {getInitials(name)}
    </span>
  )
}
