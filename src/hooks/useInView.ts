import { useEffect, useRef, useState } from 'react'

type UseInViewOptions = {
  threshold?: number | number[]
  rootMargin?: string
  once?: boolean
  enabled?: boolean
}

/**
 * Small viewport-entry hook used by the public motion layer.
 *
 * It deliberately avoids scroll listeners: one IntersectionObserver handles
 * the entry state, and the observer is always disconnected on cleanup.
 */
export function useInView<T extends HTMLElement = HTMLElement>({
  threshold = 0.16,
  rootMargin = '0px 0px -8% 0px',
  once = true,
  enabled = true,
}: UseInViewOptions = {}) {
  const ref = useRef<T>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    if (!enabled) return

    const node = ref.current
    if (!node) return

    if (typeof IntersectionObserver === 'undefined') {
      setInView(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setInView(true)
            if (once) observer.unobserve(entry.target)
          } else if (!once) {
            setInView(false)
          }
        })
      },
      { threshold, rootMargin },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [enabled, once, rootMargin, threshold])

  return { ref, inView }
}
