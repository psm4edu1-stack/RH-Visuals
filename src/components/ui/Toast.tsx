import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react'
import { uid } from '../../lib/utils'

type ToastTone = 'success' | 'error' | 'info'

type ToastItem = {
  id: string
  title: string
  description?: string
  tone: ToastTone
}

type ToastContextValue = {
  toast: (title: string, options?: { description?: string; tone?: ToastTone }) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const timers = useRef<Map<string, number>>(new Map())

  const remove = useCallback((id: string) => {
    setItems((current) => current.filter((item) => item.id !== id))
    const timer = timers.current.get(id)
    if (timer) window.clearTimeout(timer)
    timers.current.delete(id)
  }, [])

  const toast = useCallback(
    (title: string, options?: { description?: string; tone?: ToastTone }) => {
      const item = {
        id: uid('toast'),
        title,
        description: options?.description,
        tone: options?.tone ?? 'success',
      }
      setItems((current) => [...current.slice(-2), item])
      const timer = window.setTimeout(() => remove(item.id), 4200)
      timers.current.set(item.id, timer)
    },
    [remove],
  )

  useEffect(() => {
    const currentTimers = timers.current
    return () => {
      currentTimers.forEach((timer) => window.clearTimeout(timer))
    }
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="toast-stack" aria-live="polite" aria-atomic="false">
        {items.map((item) => {
          const Icon =
            item.tone === 'error' ? TriangleAlert : item.tone === 'info' ? Info : CheckCircle2
          return (
            <div className={`toast toast--${item.tone}`} key={item.id} role="status">
              <span className="toast__icon">
                <Icon size={18} strokeWidth={1.8} />
              </span>
              <div className="toast__copy">
                <strong>{item.title}</strong>
                {item.description && <p>{item.description}</p>}
              </div>
              <button
                type="button"
                className="toast__close"
                onClick={() => remove(item.id)}
                aria-label="Dismiss notification"
              >
                <X size={15} />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used inside ToastProvider')
  return context
}
