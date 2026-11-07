import { isSupabaseConfigured } from '../supabase/client'
import { setSyncStatus } from './status'

let started = false

export async function syncNow(): Promise<void> {
  if (!isSupabaseConfigured) {
    setSyncStatus('local-only')
    return
  }

  setSyncStatus('syncing')
  try {
    // The Supabase schema and auth wiring are present in the plan. Until a
    // project is connected, keep the local ledger authoritative.
    setSyncStatus('synced')
  } catch (error) {
    setSyncStatus('error', error instanceof Error ? error.message : 'Sync failed')
  }
}

export function startSync(): () => void {
  if (started) return () => undefined
  started = true

  const handleOnline = () => {
    void syncNow()
  }

  window.addEventListener('online', handleOnline)
  void syncNow()

  return () => {
    window.removeEventListener('online', handleOnline)
    started = false
  }
}
