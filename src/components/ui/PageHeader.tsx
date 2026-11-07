import { useNavigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { Icon, IconButton } from '../m3'

interface PageHeaderProps {
  title: string
  subtitle?: string
  backTo?: string
  action?: ReactNode
}

export function PageHeader({ title, subtitle, backTo, action }: PageHeaderProps) {
  const navigate = useNavigate()

  return (
    <div className="mb-5 flex items-start gap-3">
      {backTo ? (
        <IconButton aria-label="Go back" onClick={() => navigate(backTo)}>
          <Icon>arrow_back</Icon>
        </IconButton>
      ) : null}
      <div className="min-w-0 flex-1">
        <h1 className="m3-headline-medium">{title}</h1>
        {subtitle ? (
          <p className="m3-body-medium mt-1 text-on-surface-variant">{subtitle}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}
