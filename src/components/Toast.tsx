import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react'
import { cn } from '@/lib/cn'

type ToastTone = 'success' | 'danger' | 'warning' | 'info'

interface ToastItem {
  id: string
  tone: ToastTone
  title: string
  description?: string
}

interface ToastContextValue {
  show: (toast: Omit<ToastItem, 'id'>) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const toneStyles: Record<ToastTone, { icon: typeof CheckCircle2; className: string }> = {
  success: { icon: CheckCircle2, className: 'text-success' },
  danger: { icon: XCircle, className: 'text-danger' },
  warning: { icon: AlertTriangle, className: 'text-warning' },
  info: { icon: Info, className: 'text-indigo' },
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const show = useCallback((toast: Omit<ToastItem, 'id'>) => {
    const id = crypto.randomUUID()
    setToasts((prev) => [...prev, { ...toast, id }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }, [])

  const value = useMemo(() => ({ show }), [show])

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div className="fixed bottom-5 right-5 z-[100] flex w-80 flex-col gap-2">
          {toasts.map((toast) => {
            const { icon: Icon, className } = toneStyles[toast.tone]
            return (
              <div
                key={toast.id}
                className="flex items-start gap-3 rounded-lg border border-hairline-subtle bg-white p-3 shadow-lg transition-all duration-[180ms] ease-out"
              >
                <Icon size={18} className={cn('mt-0.5 shrink-0', className)} />
                <div className="flex-1 text-sm">
                  <p className="font-semibold text-ink">{toast.title}</p>
                  {toast.description && <p className="mt-0.5 text-ink-muted">{toast.description}</p>}
                </div>
                <button
                  type="button"
                  aria-label="Dismiss"
                  onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
                  className="shrink-0 text-ink-faint transition-colors duration-[120ms] ease-out hover:text-ink"
                >
                  <X size={14} />
                </button>
              </div>
            )
          })}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>')
  return ctx
}
