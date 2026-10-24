import { useEffect, useState } from 'react'
import {
  BarChart3,
  ChevronRight,
  ExternalLink,
  FileText,
  History,
  Images,
  Inbox,
  LayoutDashboard,
  Layers3,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  Users,
  UsersRound,
  X,
} from 'lucide-react'
import {
  Link,
  Navigate,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from 'react-router-dom'
import { useAuth } from '../../lib/auth'
import { BrandLogo } from '../ui/BrandLogo'
import { Avatar } from '../ui/Avatar'

const navGroups = [
  {
    label: 'Overview',
    items: [{ label: 'Dashboard', to: '/admin', icon: LayoutDashboard }],
  },
  {
    label: 'Public content',
    items: [
      { label: 'Portfolio', to: '/admin/portfolio', icon: Images },
      { label: 'Services', to: '/admin/services', icon: Layers3 },
    ],
  },
  {
    label: 'Relationships',
    items: [
      { label: 'Enquiries & Bookings', to: '/admin/enquiries', icon: Inbox },
      { label: 'Clients', to: '/admin/clients', icon: UsersRound },
      { label: 'Quotations', to: '/admin/quotations', icon: FileText },
    ],
  },
  {
    label: 'Studio',
    items: [
      { label: 'Assets', to: '/admin/assets', icon: Images },
      { label: 'Team', to: '/admin/team', icon: Users },
    ],
  },
  {
    label: 'Insights',
    items: [
      { label: 'Analytics', to: '/admin/analytics', icon: BarChart3 },
      { label: 'Activity', to: '/admin/activity', icon: History },
    ],
  },
  {
    label: 'System',
    items: [{ label: 'Settings', to: '/admin/settings', icon: Settings }],
  },
]

const pageLabels: Record<string, string> = {
  portfolio: 'Portfolio',
  services: 'Services',
  enquiries: 'Enquiries & Bookings',
  clients: 'Clients',
  quotations: 'Quotations',
  assets: 'Assets',
  team: 'Team',
  analytics: 'Analytics',
  activity: 'Activity',
  settings: 'Settings',
}

export function AdminLayout() {
  const { isAuthenticated, user, loading, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    setMobileOpen(false)
    window.scrollTo(0, 0)
  }, [location.pathname])

  useEffect(() => {
    if (!mobileOpen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [mobileOpen])

  if (loading) {
    return (
      <div className="admin-session-loading" role="status">
        <BrandLogo to="/admin" compact />
        <span className="admin-session-loading__spinner" aria-hidden="true" />
        <p>Verifying studio session…</p>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  const section = location.pathname.split('/')[2] ?? ''
  const pageLabel = pageLabels[section] ?? 'Dashboard'

  const handleSignOut = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="admin-shell">
      {mobileOpen && (
        <button
          type="button"
          className="admin-sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside className={`admin-sidebar ${mobileOpen ? 'is-open' : ''}`}>
        <div className="admin-sidebar__top">
          <BrandLogo to="/admin" compact />
          <button
            type="button"
            className="admin-sidebar__close"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
          >
            <X size={19} />
          </button>
        </div>

        <Link to="/admin" className="workspace-switcher">
          <span className="workspace-switcher__mark">RH</span>
          <span>
            <strong>RH VISUALS studio</strong>
            <small>
              <i /> Live · Database connected
            </small>
          </span>
          <ShieldCheck size={14} />
        </Link>

        <nav className="admin-nav" aria-label="Studio navigation">
          {navGroups.map((group) => (
            <div className="admin-nav__group" key={group.label}>
              <p>{group.label}</p>
              {group.items.map((item) => {
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/admin'}
                    className={({ isActive }) =>
                      `admin-nav__link ${isActive ? 'is-active' : ''}`
                    }
                  >
                    <Icon size={17} strokeWidth={1.7} />
                    <span>{item.label}</span>
                  </NavLink>
                )
              })}
            </div>
          ))}
        </nav>

        <div className="admin-sidebar__bottom">
          <div className="sidebar-user">
            <Avatar name={user.name} size="sm" />
            <div>
              <strong>{user.name}</strong>
              <span>{user.role}</span>
            </div>
            <button
              type="button"
              onClick={() => void handleSignOut()}
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <div className="admin-topbar__left">
            <button
              type="button"
              className="admin-topbar__menu"
              aria-label="Open navigation"
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={20} />
            </button>
            <div className="admin-breadcrumb">
              <span>Studio OS</span>
              <ChevronRight size={13} />
              <strong>{pageLabel}</strong>
            </div>
          </div>
          <div className="admin-topbar__right">
            <Link to="/" className="topbar-action" title="View public website">
              <ExternalLink size={16} />
              <span>View website</span>
            </Link>
            <span className="topbar-divider" aria-hidden="true" />
            <div className="topbar-profile">
              <Avatar name={user.name} size="sm" />
              <div>
                <strong>{user.name.split(' ')[0]}</strong>
                <span>{user.email}</span>
              </div>
            </div>
            <button
              type="button"
              className="topbar-action"
              onClick={() => void handleSignOut()}
              title="Sign out"
            >
              <LogOut size={16} />
              <span>Sign out</span>
            </button>
          </div>
        </header>

        <main className="admin-content" key={location.pathname}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
