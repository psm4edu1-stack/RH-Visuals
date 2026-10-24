import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '../../lib/utils'

type ModalProps = {
  open: boolean
  onClose: () => void
  title: string
  eyebrow?: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

function getFocusable(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((element) => element.offsetParent !== null)
}

export function Modal({
  open,
  onClose,
  title,
  eyebrow,
  description,
  children,
  footer,
  size = 'md',
  className,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const previousFocus = useRef<HTMLElement | null>(null)
  const onCloseRef = useRef(onClose)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const titleId = `modal-title-${title.replace(/\s+/g, '-').toLowerCase()}`

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) return
    previousFocus.current = document.activeElement as HTMLElement
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const timeout = window.setTimeout(() => {
      const panel = panelRef.current
      if (!panel) return
      const focusable = getFocusable(panel)
      if (focusable[0]) focusable[0].focus()
      else if (closeButtonRef.current) closeButtonRef.current.focus()
      else panel.focus()
    }, 40)

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab') return
      const panel = panelRef.current
      if (!panel) return
      const focusable = getFocusable(panel)
      if (!focusable.length) {
        event.preventDefault()
        panel.focus()
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      window.clearTimeout(timeout)
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = originalOverflow
      previousFocus.current?.focus()
    }
  }, [open])

  if (!open) return null

  return createPortal(
    <div className="modal-layer" role="presentation">
      <div className="modal-backdrop" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        className={cn('modal', `modal--${size}`, className)}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <header className="modal__header">
          <div>
            {eyebrow && <p className="modal__eyebrow">{eyebrow}</p>}
            <h2 id={titleId}>{title}</h2>
            {description && <p className="modal__description">{description}</p>}
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={19} />
          </button>
        </header>
        <div className="modal__body">{children}</div>
        {footer && <footer className="modal__footer">{footer}</footer>}
      </div>
    </div>,
    document.body,
  )
}

type DrawerProps = {
  open: boolean
  onClose: () => void
  title: string
  eyebrow?: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  width?: 'sm' | 'md' | 'lg'
}

export function Drawer({
  open,
  onClose,
  title,
  eyebrow,
  description,
  children,
  footer,
  width = 'md',
}: DrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const previousFocus = useRef<HTMLElement | null>(null)
  const onCloseRef = useRef(onClose)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) return
    previousFocus.current = document.activeElement as HTMLElement
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const timeout = window.setTimeout(() => {
      const panel = panelRef.current
      if (!panel) return
      const focusable = getFocusable(panel)
      if (focusable[0]) focusable[0].focus()
      else if (closeButtonRef.current) closeButtonRef.current.focus()
      else panel.focus()
    }, 40)

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab') return
      const panel = panelRef.current
      if (!panel) return
      const focusable = getFocusable(panel)
      if (!focusable.length) {
        event.preventDefault()
        panel.focus()
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      window.clearTimeout(timeout)
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = originalOverflow
      previousFocus.current?.focus()
    }
  }, [open])

  if (!open) return null

  return createPortal(
    <div className="drawer-layer" role="presentation">
      <div className="drawer-backdrop" onClick={onClose} aria-hidden="true" />
      <aside
        ref={panelRef}
        className={cn('drawer', `drawer--${width}`)}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
      >
        <header className="drawer__header">
          <div>
            {eyebrow && <p className="drawer__eyebrow">{eyebrow}</p>}
            <h2>{title}</h2>
            {description && <p>{description}</p>}
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label="Close panel"
          >
            <X size={19} />
          </button>
        </header>
        <div className="drawer__body">{children}</div>
        {footer && <footer className="drawer__footer">{footer}</footer>}
      </aside>
    </div>,
    document.body,
  )
}
