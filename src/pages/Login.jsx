import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'
import { getFriendlyAuthErrorMessage } from '../services/authService.js'
import KisanSetuLogo from '../components/KisanSetuLogo.jsx'

function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, loginGoogle, currentUser, userRole } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [googleSubmitting, setGoogleSubmitting] = useState(false)

  // Redirect if already logged in
  const from = location.state?.from?.pathname
  function getRedirectPath(role) {
    if (from && from !== '/login' && from !== '/signup') {
      if (role === 'farmer' && (from.startsWith('/staff') || from.startsWith('/admin'))) {
        return '/'
      }
      if (role === 'staff' && from.startsWith('/admin')) {
        return '/staff'
      }
      return from
    }

    if (role === 'admin') return '/admin'
    if (role === 'staff') return '/staff'
    return '/'
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!email.trim()) {
      setError('Please enter your email address.')
      return
    }
    if (!password) {
      setError('Please enter your password.')
      return
    }

    try {
      setSubmitting(true)
      const { profile } = await login(email, password)
      const targetPath = getRedirectPath(profile?.role || 'farmer')
      navigate(targetPath, { replace: true })
    } catch (err) {
      console.error('Login error:', err)
      setError(getFriendlyAuthErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleGoogleSignIn() {
    setError('')

    try {
      setGoogleSubmitting(true)
      const { profile } = await loginGoogle()
      navigate(getRedirectPath(profile?.role || 'farmer'), { replace: true })
    } catch (err) {
      console.error('Google sign-in error:', err)
      setError(getFriendlyAuthErrorMessage(err))
    } finally {
      setGoogleSubmitting(false)
    }
  }

  return (
    <div className="auth-standalone-page">
      {/* Top Left Brand Header */}
      <header className="auth-top-nav">
        <Link to="/" className="auth-brand-header">
          <KisanSetuLogo size={44} />
          <div className="auth-brand-text">
            <span className="auth-brand-title">KisanSetu</span>
            <span className="auth-brand-sub">Govt. of Agriculture</span>
          </div>
        </Link>
      </header>

      {/* Main Login Card */}
      <main className="auth-main-content">
        <div className="auth-card-container">
          <div className="auth-card-header">
            <div className="auth-icon-badge">
              <span className="material-symbols-outlined" style={{ color: '#003527' }}>lock</span>
            </div>
            <span className="auth-eyebrow-tag">SECURE ACCESS PORTAL</span>
            <h1 className="auth-heading">Sign In to KisanSetu</h1>
            <p className="auth-subtitle">
              Access your farmer bookings, mandi queue desk, or administrative dashboard.
            </p>
          </div>

          {error && (
            <div className="alert-error-box" role="alert">
              <span className="material-symbols-outlined text-sm">warning</span>
              <div>
                <strong>Sign In Failed</strong>
                <p style={{ margin: 0, fontSize: '13px' }}>{error}</p>
              </div>
            </div>
          )}

          {currentUser && (
            <div style={{ background: '#eff4ff', border: '1px solid #bfc9c3', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px' }}>
              <p style={{ fontSize: '13px', color: '#0d1c2e', margin: '0 0 8px 0' }}>
                Already signed in as <strong>{currentUser.email}</strong> ({userRole})
              </p>
              <button
                type="button"
                className="btn-auth-submit"
                style={{ padding: '8px 14px', fontSize: '13px' }}
                onClick={() => navigate(getRedirectPath(userRole))}
              >
                Continue to Dashboard →
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="auth-form-group">
              <label className="auth-label" htmlFor="auth-email">
                Email Address <span style={{ color: '#ba1a1a' }}>*</span>
              </label>
              <input
                id="auth-email"
                type="email"
                placeholder="e.g. farmer@kisansetu.in"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="auth-input-field"
                required
              />
            </div>

            <div className="auth-form-group">
              <label className="auth-label" htmlFor="auth-password">
                Password <span style={{ color: '#ba1a1a' }}>*</span>
              </label>
              <div className="auth-password-wrapper">
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="auth-input-field"
                  required
                />
                <button
                  type="button"
                  className="btn-toggle-pw"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <span className="material-symbols-outlined" aria-hidden="true">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn-auth-submit"
              disabled={submitting}
            >
              <span>{submitting ? 'Authenticating...' : 'Sign In'}</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </form>

          <div className="auth-divider" aria-hidden="true">
            <span>OR</span>
          </div>

          <button
            type="button"
            className="btn-auth-google"
            onClick={handleGoogleSignIn}
            disabled={submitting || googleSubmitting}
          >
            <img
              className="auth-google-mark"
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
              alt=""
              aria-hidden="true"
            />
            <span>{googleSubmitting ? 'Connecting to Google...' : 'Continue with Google'}</span>
          </button>

          <div className="auth-footer-switch">
            <span>New farmer to KisanSetu?</span>
            <Link to="/signup" className="auth-switch-link">
              Register Farmer Account &rarr;
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}

export default Login
