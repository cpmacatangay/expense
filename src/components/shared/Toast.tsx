import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode
} from 'react'
import { Icon } from '../m3'

type Tone = 'success' | 'error' | 'info'

interface ToastItem {
  id: string
  message: string
  tone: Tone
}

interface ToastContextValue {
  showToast: (message: string, tone?: Tone) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const iconTone = {
  success: 'text-inverse-primary',
  error: 'text-error-container',
  info: 'text-inverse-on-surface'
}

const icons = {
  success: <Icon>check_circle</Icon>,
  error: <Icon>error</Icon>,
  info: <Icon>info</Icon>
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const showToast = useCallback((message: string, tone: Tone = 'info') => {
    const id = crypto.randomUUID()
    setToasts((current) => [...current, { id, message, tone }])
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id))
    }, 3200)
  }, [])

  const value = useMemo(() => ({ showToast }), [showToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-28 z-[60] flex flex-col items-center gap-2 px-4">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="m3-elevation-3 pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-m3-xs bg-inverse-surface px-4 py-3 text-inverse-on-surface"
            role="status"
          >
            <span className={iconTone[toast.tone]}>{icons[toast.tone]}</span>
            <span className="m3-body-medium min-w-0 flex-1">{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used inside ToastProvider')
  return context
}
