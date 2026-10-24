import { useEffect } from 'react'
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom'
import { AuthProvider } from './lib/auth'
import { ToastProvider } from './components/ui/Toast'
import { PublicLayout } from './components/public/PublicLayout'
import { AdminLayout } from './components/admin/AdminLayout'
import { HomePage } from './pages/public/HomePage'
import { ProjectDetailPage } from './pages/public/ProjectDetailPage'
import { AboutPage } from './pages/public/AboutPage'
import { NotFoundPage } from './pages/public/NotFoundPage'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/admin/DashboardPage'
import { PortfolioPage } from './pages/admin/PortfolioPage'
import { ServicesAdminPage } from './pages/admin/ServicesAdminPage'
import { EnquiriesPage } from './pages/admin/EnquiriesPage'
import { ClientsPage } from './pages/admin/ClientsPage'
import { QuotationsPage } from './pages/admin/QuotationsPage'
import { AssetsPage } from './pages/admin/AssetsPage'
import { TeamPage } from './pages/admin/TeamPage'
import { AnalyticsPage } from './pages/admin/AnalyticsPage'
import { ActivityPage } from './pages/admin/ActivityPage'
import { SettingsPage } from './pages/admin/SettingsPage'

const pageTitles: Record<string, string> = {
  '/': 'Live visual production',
  '/work': 'Selected work',
  '/services': 'Capabilities',
  '/studio': 'The studio',
  '/contact': 'Start a project',
  '/login': 'Studio sign in',
  '/admin': 'Dashboard',
  '/admin/portfolio': 'Portfolio',
  '/admin/services': 'Services',
  '/admin/enquiries': 'Enquiries & Bookings',
  '/admin/clients': 'Clients',
  '/admin/quotations': 'Quotations',
  '/admin/assets': 'Assets',
  '/admin/team': 'Team',
  '/admin/analytics': 'Analytics',
  '/admin/activity': 'Activity',
  '/admin/settings': 'Settings',
}

function TitleManager() {
  const location = useLocation()

  useEffect(() => {
    let title = pageTitles[location.pathname]
    if (!title && location.pathname.startsWith('/work/')) title = 'Case study'
    document.title = title ? `${title} — RH VISUALS` : 'RH VISUALS'
  }, [location.pathname])

  return null
}

type PublicSectionRoute = 'work' | 'services' | 'contact'

function SectionRedirect({ section }: { section: PublicSectionRoute }) {
  const location = useLocation()

  return (
    <Navigate
      to={{ pathname: '/', search: location.search, hash: `#${section}` }}
      replace
    />
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <TitleManager />
          <Routes>
            <Route path="/" element={<PublicLayout />}>
              <Route index element={<HomePage />} />
              <Route path="work" element={<SectionRedirect section="work" />} />
              <Route path="work/:slug" element={<ProjectDetailPage />} />
              <Route path="services" element={<SectionRedirect section="services" />} />
              <Route path="studio" element={<AboutPage />} />
              <Route path="contact" element={<SectionRedirect section="contact" />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>

            <Route path="/login" element={<LoginPage />} />

            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="portfolio" element={<PortfolioPage />} />
              <Route path="services" element={<ServicesAdminPage />} />
              <Route path="enquiries" element={<EnquiriesPage />} />
              <Route path="clients" element={<ClientsPage />} />
              <Route path="quotations" element={<QuotationsPage />} />
              <Route path="assets" element={<AssetsPage />} />
              <Route path="team" element={<TeamPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="activity" element={<ActivityPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="bookings" element={<Navigate to="/admin/enquiries" replace />} />
              <Route path="inquiries" element={<Navigate to="/admin/enquiries" replace />} />
              <Route path="*" element={<Navigate to="/admin" replace />} />
            </Route>
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
