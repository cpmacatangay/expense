import type { CSSProperties } from 'react'
import { Icon } from '../m3'
import { useSyncStatus } from '../../lib/sync/status'

const iconStyle = { '--md-icon-size': '14px' } as CSSProperties

export function SyncStatus() {
  const { status, lastError } = useSyncStatus()

  const content = {
    'local-only': {
      icon: <Icon style={iconStyle}>cloud_off</Icon>,
      label: 'Local',
      className: 'bg-surface-container-high text-on-surface-variant'
    },
    syncing: {
      icon: (
        <Icon className="animate-spin" style={iconStyle}>
          sync
        </Icon>
      ),
      label: 'Syncing',
      className: 'bg-secondary-container text-on-secondary-container'
    },
    synced: {
      icon: <Icon style={iconStyle}>cloud_done</Icon>,
      label: 'Synced',
      className: 'bg-primary-container text-on-primary-container'
    },
    error: {
      icon: <Icon style={iconStyle}>error</Icon>,
      label: 'Sync issue',
      className: 'bg-error-container text-on-error-container'
    }
  }[status]

  return (
    <span
      className={`m3-label-small inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 ${content.className}`}
      title={lastError ?? content.label}
    >
      {content.icon}
      {content.label}
    </span>
  )
}
