import { useEffect, useState, type MouseEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ArrowUpRight, Menu, X } from 'lucide-react'
import {
  PUBLIC_SECTION_IDS,
  preferredScrollBehavior,
  scrollToPublicSection,
  type PublicSectionId,
} from '../../lib/publicSections'
import { BrandLogo } from '../ui/BrandLogo'
import { cn } from '../../lib/utils'

const navItems: Array<{ label: string; section: PublicSectionId; to: string }> = [
  { label: 'Home', section: 'home', to: '/#home' },
  { label: 'Work', section: 'work', to: '/#work' },
  { label: 'Services', section: 'services', to: '/#services' },
  { label: 'Contact', section: 'contact', to: '/#contact' },
]

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeSection, setActiveSection] = useState<PublicSectionId>('home')
  const location = useLocation()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (location.pathname !== '/') {
      setActiveSection('home')
      return
    }

    let frame = 0
    const update = () => {
      frame = 0
      const headerHeight =
        document.querySelector<HTMLElement>('.site-header')?.getBoundingClientRect()
          .height ?? 0
      const probe = window.scrollY + headerHeight + 8
      let current: PublicSectionId = 'home'

      PUBLIC_SECTION_IDS.forEach((id) => {
        const section = document.getElementById(id)
        if (!section) return
        if (section.getBoundingClientRect().top + window.scrollY <= probe) {
          current = id
        }
      })

      if (
        window.scrollY + window.innerHeight >=
        document.documentElement.scrollHeight - 2
      ) {
        current = 'contact'
      }

      setActiveSection((previous) => (previous === current ? previous : current))
    }

    const requestUpdate = () => {
      if (frame) return
      frame = window.requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', requestUpdate, { passive: true })
    window.addEventListener('resize', requestUpdate)

    return () => {
      window.removeEventListener('scroll', requestUpdate)
      window.removeEventListener('resize', requestUpdate)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [location.pathname])

  useEffect(() => {
    if (!menuOpen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previous
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [menuOpen])

  const isActive = (section: PublicSectionId) => {
    if (location.pathname === '/') return activeSection === section
    if (section === 'work' && location.pathname.startsWith('/work/')) return true
    return false
  }

  const handleNavigate = (
    event: MouseEvent<HTMLAnchorElement>,
    section: PublicSectionId,
  ) => {
    setMenuOpen(false)
    if (
      event.defaultPrevented ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return
    }

    if (location.pathname !== '/') return

    setActiveSection(section)

    // A second click on the same anchor does not change the location, so handle
    // that case directly and keep normal Link navigation for every other case.
    if (location.hash === `#${section}`) {
      event.preventDefault()
      scrollToPublicSection(section, preferredScrollBehavior())
    }
  }

  return (
    <>
      <header className={cn('site-header', (scrolled || menuOpen) && 'site-header--scrolled')}>
        <div className="site-header__inner">
          <BrandLogo />
          <nav className="site-nav" aria-label="Primary navigation">
            {navItems.map((item) => (
              <Link
                key={item.section}
                to={item.to}
                onClick={(event) => handleNavigate(event, item.section)}
                className={cn('site-nav__link', isActive(item.section) && 'is-active')}
                aria-current={isActive(item.section) ? 'page' : undefined}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="site-header__actions">
            <Link
              to="/#contact"
              className="btn btn--gold btn--small site-header__cta"
              onClick={(event) => handleNavigate(event, 'contact')}
            >
              Start a Project
              <ArrowUpRight size={15} strokeWidth={1.8} />
            </Link>
            <button
              type="button"
              className="menu-toggle"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </header>

      <div className={cn('mobile-menu', menuOpen && 'is-open')} aria-hidden={!menuOpen}>
        <div className="mobile-menu__ambient" aria-hidden="true" />
        <div className="mobile-menu__body">
          <p className="mobile-menu__eyebrow">Navigation</p>
          <nav className="mobile-menu__nav" aria-label="Mobile navigation">
            {navItems.map((item, index) => (
              <Link
                key={item.section}
                to={item.to}
                onClick={(event) => handleNavigate(event, item.section)}
                tabIndex={menuOpen ? 0 : -1}
                className={cn(isActive(item.section) && 'is-active')}
                aria-current={isActive(item.section) ? 'page' : undefined}
                style={{ transitionDelay: menuOpen ? `${90 + index * 45}ms` : '0ms' }}
              >
                <span>0{index + 1}</span>
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mobile-menu__footer">
            <Link
              to="/#contact"
              className="btn btn--gold"
              tabIndex={menuOpen ? 0 : -1}
              onClick={(event) => handleNavigate(event, 'contact')}
            >
              Start a Project <ArrowUpRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
