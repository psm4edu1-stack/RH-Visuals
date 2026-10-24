import { useEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import {
  isPublicSectionId,
  preferredScrollBehavior,
  publicSectionScrollTop,
} from '../../lib/publicSections'
import { SiteHeader } from './SiteHeader'
import { SiteFooter } from './SiteFooter'
import { StudioChatbot } from './StudioChatbot'

export function PublicLayout() {
  const location = useLocation()
  const isHome = location.pathname === '/'
  const firstRender = useRef(true)

  useEffect(() => {
    if (location.pathname !== '/') {
      firstRender.current = false
      window.scrollTo(0, 0)
      return
    }

    const section = location.hash.replace('#', '')
    if (!isPublicSectionId(section)) {
      firstRender.current = false
      window.scrollTo(0, 0)
      return
    }

    const behavior = firstRender.current ? 'instant' : preferredScrollBehavior()
    firstRender.current = false

    let frame = 0
    let stopped = false
    let attempts = 0
    let stableFrames = 0
    let lastTop = Number.NaN
    const startedAt = performance.now()

    const stop = () => {
      stopped = true
      if (frame) window.cancelAnimationFrame(frame)
    }
    const stopOnUserIntent = () => stop()

    window.addEventListener('wheel', stopOnUserIntent, { passive: true, once: true })
    window.addEventListener('touchstart', stopOnUserIntent, { passive: true, once: true })
    window.addEventListener('keydown', stopOnUserIntent, { once: true })

    const settle = () => {
      if (stopped) return
      const top = publicSectionScrollTop(section)
      if (top !== null) {
        if (Number.isNaN(lastTop) || Math.abs(top - lastTop) > 1) {
          lastTop = top
          stableFrames = 0
          window.scrollTo({ top, behavior: attempts === 0 ? behavior : 'auto' })
        } else {
          stableFrames += 1
        }
      }

      attempts += 1
      const elapsed = performance.now() - startedAt
      if (top !== null && stableFrames >= 8 && elapsed > 300) {
        stop()
        return
      }
      if (elapsed > 2200) {
        stop()
        return
      }
      frame = window.requestAnimationFrame(settle)
    }

    frame = window.requestAnimationFrame(settle)

    return () => {
      stop()
      window.removeEventListener('wheel', stopOnUserIntent)
      window.removeEventListener('touchstart', stopOnUserIntent)
      window.removeEventListener('keydown', stopOnUserIntent)
    }
  }, [location.hash, location.key, location.pathname])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const elements = document.querySelectorAll<HTMLElement>('.reveal:not(.is-visible)')
      if (!('IntersectionObserver' in window)) {
        elements.forEach((element) => element.classList.add('is-visible'))
        return
      }
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-visible')
              observer.unobserve(entry.target)
            }
          })
        },
        { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
      )
      elements.forEach((element) => observer.observe(element))
    }, 60)

    return () => window.clearTimeout(timeout)
  }, [location.pathname])

  return (
    <div className={`public-shell${isHome ? ' public-shell--home' : ''}`}>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <SiteHeader />
      <main id="main-content" key={location.pathname} className="page-transition">
        <Outlet />
      </main>
      <SiteFooter />
      <StudioChatbot />
    </div>
  )
}
