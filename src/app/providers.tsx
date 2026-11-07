import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useState, type ReactNode } from 'react'
import { ToastProvider } from '../components/shared/Toast'
import { ensureSeed } from '../lib/db/schema'
import { startSync } from '../lib/sync/engine'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1
    }
  }
})

function Splash() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-surface px-6">
      <div className="text-center">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary text-2xl font-semibold text-on-primary">
          S
        </div>
        <h1 className="m3-title-large mt-4">Salo</h1>
        <p className="m3-body-medium mt-1 text-on-surface-variant">Opening your ledger…</p>
      </div>
    </div>
  )
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let active = true
    const stopSync = startSync()

    void ensureSeed().finally(() => {
      if (active) setReady(true)
    })

    return () => {
      active = false
      stopSync()
    }
  }, [])

  if (!ready) return <Splash />

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>{children}</ToastProvider>
    </QueryClientProvider>
  )
}
