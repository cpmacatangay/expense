import clsx from 'clsx'

interface AvatarProps {
  name: string
  order?: number
  size?: 'sm' | 'md' | 'lg'
}

const palette = [
  'bg-primary-container text-on-primary-container',
  'bg-secondary-container text-on-secondary-container',
  'bg-tertiary-container text-on-tertiary-container',
  'bg-surface-variant text-on-surface-variant'
]

const sizes = {
  sm: 'size-8 text-xs',
  md: 'size-10 text-sm',
  lg: 'size-14 text-lg'
}

export function Avatar({ name, order = 0, size = 'md' }: AvatarProps) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')

  return (
    <span
      className={clsx(
        'inline-flex shrink-0 items-center justify-center rounded-full font-medium',
        palette[order % palette.length],
        sizes[size]
      )}
      aria-hidden="true"
    >
      {initials || '?'}
    </span>
  )
}
