import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-m3-md border border-dashed border-outline-variant bg-surface-container-low px-6 py-10 text-center">
      {icon ? <div className="mb-3 text-primary">{icon}</div> : null}
      <h3 className="m3-title-medium">{title}</h3>
      {description ? (
        <p className="m3-body-medium mt-1 max-w-sm text-on-surface-variant">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}
