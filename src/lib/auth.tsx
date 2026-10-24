import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { AdminUser, Permission, Role } from '../types'
import { ApiError, api } from './api'

export const rolePermissions: Record<Role, Permission[]> = {
  Owner: [
    'view_dashboard',
    'manage_bookings',
    'manage_clients',
    'manage_quotes',
    'manage_assets',
    'manage_inquiries',
    'view_analytics',
    'manage_team',
    'manage_settings',
  ],
  Admin: [
    'view_dashboard',
    'manage_bookings',
    'manage_clients',
    'manage_quotes',
    'manage_assets',
    'manage_inquiries',
    'view_analytics',
    'manage_team',
    'manage_settings',
  ],
  Manager: [
    'view_dashboard',
    'manage_bookings',
    'manage_clients',
    'manage_quotes',
    'manage_assets',
    'manage_inquiries',
    'view_analytics',
  ],
  Viewer: ['view_dashboard', 'view_analytics'],
}

type AuthContextValue = {
  user: AdminUser | null
  isAuthenticated: boolean
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ ok: boolean; message?: string }>
  signOut: () => Promise<void>
  can: (permission: Permission) => boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    api
      .me()
      .then((result) => {
        if (active) setUser(result.user)
      })
      .catch((error) => {
        if (active && !(error instanceof ApiError && error.status === 401)) {
          console.warn('Studio session could not be verified.', error)
        }
        if (active) setUser(null)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const handleExpired = () => setUser(null)
    window.addEventListener('rhv:session-expired', handleExpired)
    return () => window.removeEventListener('rhv:session-expired', handleExpired)
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const result = await api.login(email, password)
      setUser(result.user)
      return { ok: true }
    } catch (error) {
      return {
        ok: false,
        message:
          error instanceof ApiError
            ? error.message
            : 'Unable to sign in. Check the studio API server and try again.',
      }
    }
  }, [])

  const signOut = useCallback(async () => {
    try {
      await api.logout()
    } catch {
      // The local session is still cleared; the cookie expires server-side.
    }
    setUser(null)
  }, [])

  const can = useCallback(
    (permission: Permission) => {
      if (!user) return false
      return (rolePermissions[user.role] ?? []).includes(permission)
    },
    [user],
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      loading,
      signIn,
      signOut,
      can,
    }),
    [user, loading, signIn, signOut, can],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
