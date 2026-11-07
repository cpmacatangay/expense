import { useSyncExternalStore } from 'react'

export type SyncStatus = 'local-only' | 'syncing' | 'synced' | 'error'

let status: SyncStatus = 'local-only'
let lastError: string | null = null
const listeners = new Set<() => void>()

function emit(): void {
  for (const listener of listeners) listener()
}

export function getSyncStatus(): SyncStatus {
  return status
}

export function getSyncError(): string | null {
  return lastError
}

export function setSyncStatus(next: SyncStatus, error?: string | null): void {
  status = next
  lastError = error ?? null
  emit()
}

export function subscribeSyncStatus(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useSyncStatus(): { status: SyncStatus; lastError: string | null } {
  const current = useSyncExternalStore(
    subscribeSyncStatus,
    getSyncStatus,
    () => 'local-only' as SyncStatus
  )
  const error = useSyncExternalStore(subscribeSyncStatus, getSyncError, () => null)
  return { status: current, lastError: error }
}
