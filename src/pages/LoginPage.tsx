import { useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowUpRight, Eye, EyeOff, LockKeyhole, ShieldCheck } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { BrandLogo } from '../components/ui/BrandLogo'

export function LoginPage() {
  const { signIn, isAuthenticated, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/admin'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!loading && isAuthenticated) navigate(from, { replace: true })
  }, [isAuthenticated, loading, from, navigate])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!email.trim() || !password) {
      setError('Enter your studio email and password.')
      return
    }
    setError('')
    setSubmitting(true)
    const result = await signIn(email.trim(), password)
    setSubmitting(false)
    if (!result.ok) {
      setError(result.message ?? 'Unable to sign in.')
      return
    }
    navigate(from, { replace: true })
  }

  return (
    <main className="login-page">
      <section className="login-visual">
        <img src="/images/hero-confetti.jpg" alt="" />
        <div className="login-visual__veil" />
        <div className="login-visual__top">
          <BrandLogo />
          <Link to="/" className="login-back">
            <ArrowLeft size={14} /> Back to site
          </Link>
        </div>
        <div className="login-visual__quote">
          <span className="login-visual__index">Studio OS / 2026</span>
          <blockquote>
            “The show is a hundred small decisions. This is where we keep them
            together.”
          </blockquote>
          <p>RH VISUALS · Production workspace</p>
        </div>
        <div className="login-visual__footer">
          <span>Chennai · Singapore · Dubai</span>
          <span>13.0827° N, 80.2707° E</span>
        </div>
      </section>

      <section className="login-panel">
        <div className="login-panel__inner">
          <div className="login-panel__logo">
            <BrandLogo tone="dark" />
          </div>

          <div className="login-panel__heading">
            <span className="login-eyebrow">
              <LockKeyhole size={13} /> Studio workspace
            </span>
            <h1>
              The studio, <em>backstage.</em>
            </h1>
            <p>Sign in to manage the portfolio, services and incoming enquiries.</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form" noValidate>
            <label className="field">
              <span>Studio email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value)
                  setError('')
                }}
                placeholder="name@rhvisuals.studio"
                autoComplete="username"
                disabled={submitting}
              />
            </label>
            <label className="field">
              <span>Password</span>
              <div className="password-field">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value)
                    setError('')
                  }}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  disabled={submitting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </label>

            {error && (
              <p className="login-error" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="btn btn--dark login-submit"
              disabled={submitting || loading}
            >
              {submitting ? 'Verifying credentials…' : 'Enter Studio OS'}
              <ArrowUpRight size={16} />
            </button>
          </form>

          <div className="login-security">
            <ShieldCheck size={18} />
            <div>
              <strong>Server-verified access</strong>
              <p>
                Passwords are hashed on the server and the session is held in a secure
                httpOnly cookie. Administrator accounts are created from the server
                environment.
              </p>
            </div>
          </div>

          <div className="login-panel__footer">
            <span>
              Need access? <a href="mailto:hello@rhvisuals.studio">Ask the studio owner</a>
            </span>
            <span>© {new Date().getFullYear()} RH VISUALS</span>
          </div>
        </div>
      </section>
    </main>
  )
}
