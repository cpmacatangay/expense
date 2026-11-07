import clsx from 'clsx'
import { formatCentavos } from '../../lib/money/centavos'

interface MoneyProps {
  centavos: number
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const sizes = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-2xl',
  xl: 'text-4xl'
}

export function Money({ centavos, className, size = 'md' }: MoneyProps) {
  return (
    <span className={clsx('font-mono tabular tracking-tight', sizes[size], className)}>
      {formatCentavos(centavos)}
    </span>
  )
}
