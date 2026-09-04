import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'
import { getFriendlyAuthErrorMessage } from '../services/authService.js'
import { normalizeMobile } from '../utils/validation.js'

function FarmerSignup() {
  const navigate = useNavigate()
  const { signup, loginGoogle } = useAuth()

  const [form, setForm] = useState({
    name: '',
    mobile: '',
    village: '',
    email: '',
    password: '',
    confirmPassword: '',
  })

  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [googleSubmitting, setGoogleSubmitting] = useState(false)

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => {
      const next = { ...prev }
      delete next[field]
      delete next.form
      return next
    })
  }

  function validate() {
    const nextErrors = {}

    if (!form.name.trim()) {
      nextErrors.name = 'Full name is required.'
    }

    const cleanMobile = normalizeMobile(form.mobile)
    if (!cleanMobile) {
      nextErrors.mobile = 'Enter a valid 10-digit mobile number.'
    }

    if (!form.email.trim()) {
      nextErrors.email = 'Email address is required.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      nextErrors.email = 'Enter a valid email address.'
    }

    if (!form.password) {
      nextErrors.password = 'Password is required.'
    } else if (form.password.length < 6) {
      nextErrors.password = 'Password must be at least 6 characters long.'
    }

    if (form.password !== form.confirmPassword) {
      nextErrors.confirmPassword = 'Passwords do not match.'
    }

    return nextErrors
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const validationErrors = validate()

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    try {
      setSubmitting(true)
      await signup({
        name: form.name.trim(),
        mobile: form.mobile.trim(),
        village: form.village.trim(),
        email: form.email.trim(),
        password: form.password,
      })

      // Redirect to Farmer Portal
      navigate('/', { replace: true })
    } catch (err) {
      console.error('Farmer signup error:', err)
      setErrors({ form: getFriendlyAuthErrorMessage(err) })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleGoogleSignIn() {
    setErrors({})

    try {
      setGoogleSubmitting(true)
      await loginGoogle()
      navigate('/', { replace: true })
    } catch (err) {
      console.error('Google registration error:', err)
      setErrors({ form: getFriendlyAuthErrorMessage(err) })
    } finally {
      setGoogleSubmitting(false)
    }
  }

  return (
    <div className="auth-standalone-page">
      {/* Top Left Brand Header */}
      <header className="auth-top-nav">
        <Link to="/" className="auth-brand-header">
          <div className="auth-brand-logo">
            <span className="material-symbols-outlined" aria-hidden="true">agriculture</span>
          </div>
          <div className="auth-brand-text">
            <span className="auth-brand-title">KisanSetu</span>
            <span className="auth-brand-sub">Govt. of Agriculture</span>
          </div>
        </Link>
      </header>

      {/* Main Registration Card */}
      <main className="auth-main-content">
        <div className="auth-card-container signup-mode">
          <div className="auth-card-header">
            <div className="auth-icon-badge">
              <span className="material-symbols-outlined" style={{ color: '#003527' }}>agriculture</span>
            </div>
            <span className="auth-eyebrow-tag">FARMER REGISTRATION</span>
            <h1 className="auth-heading">Create Farmer Account</h1>
            <p className="auth-subtitle">
              Register for direct mandi slot booking, digital token passes, and live queue tracking.
            </p>
          </div>

          {errors.form && (
            <div className="alert-error-box" role="alert">
              <span className="material-symbols-outlined text-sm">warning</span>
              <div>
                <strong>Registration Failed</strong>
                <p style={{ margin: 0, fontSize: '13px' }}>{errors.form}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            {/* Row 1: Full Name */}
            <div className="auth-form-group">
              <label className="auth-label" htmlFor="reg-name">
                Farmer Full Name <span style={{ color: '#ba1a1a' }}>*</span>
              </label>
              <input
                id="reg-name"
                type="text"
                placeholder="e.g. Rameshwar Patil"
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                className={`auth-input-field ${errors.name ? 'has-error' : ''}`}
                required
              />
              {errors.name && <span className="field-error-text">{errors.name}</span>}
            </div>

            {/* Row 2: Mobile & Village */}
            <div className="auth-grid-2col" style={{ marginBottom: '16px' }}>
              <div className="auth-form-group no-margin">
                <label className="auth-label" htmlFor="reg-mobile">
                  Mobile Number (10 Digits) <span style={{ color: '#ba1a1a' }}>*</span>
                </label>
                <div className="form-prefix-input-wrap">
                  <span className="input-prefix-tag">+91</span>
                  <input
                    id="reg-mobile"
                    type="tel"
                    maxLength={10}
                    inputMode="numeric"
                    placeholder="9876543210"
                    value={form.mobile}
                    onChange={(e) => updateField('mobile', e.target.value)}
                    className={`auth-input-field ${errors.mobile ? 'has-error' : ''}`}
                    required
                  />
                </div>
                {errors.mobile && <span className="field-error-text">{errors.mobile}</span>}
              </div>

              <div className="auth-form-group no-margin">
                <label className="auth-label" htmlFor="reg-village">Village / Taluka</label>
                <input
                  id="reg-village"
                  type="text"
                  placeholder="e.g. Deoli, Wardha"
                  value={form.village}
                  onChange={(e) => updateField('village', e.target.value)}
                  className="auth-input-field"
                />
              </div>
            </div>

            {/* Row 3: Email */}
            <div className="auth-form-group">
              <label className="auth-label" htmlFor="reg-email">
                Email Address <span style={{ color: '#ba1a1a' }}>*</span>
              </label>
              <input
                id="reg-email"
                type="email"
                placeholder="e.g. rameshwar@gmail.com"
                autoComplete="email"
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
                className={`auth-input-field ${errors.email ? 'has-error' : ''}`}
                required
              />
              {errors.email && <span className="field-error-text">{errors.email}</span>}
            </div>

            {/* Row 4: Password & Confirm Password */}
            <div className="auth-grid-2col" style={{ marginBottom: '20px' }}>
              <div className="auth-form-group no-margin">
                <label className="auth-label" htmlFor="reg-password">
                  Password <span style={{ color: '#ba1a1a' }}>*</span>
                </label>
                <div className="auth-password-wrapper">
                  <input
                    id="reg-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Min. 6 characters"
                    autoComplete="new-password"
                    value={form.password}
                    onChange={(e) => updateField('password', e.target.value)}
                    className={`auth-input-field ${errors.password ? 'has-error' : ''}`}
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
                {errors.password && <span className="field-error-text">{errors.password}</span>}
              </div>

              <div className="auth-form-group no-margin">
                <label className="auth-label" htmlFor="reg-confirm-password">
                  Confirm Password <span style={{ color: '#ba1a1a' }}>*</span>
                </label>
                <input
                  id="reg-confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Re-enter password"
                  autoComplete="new-password"
                  value={form.confirmPassword}
                  onChange={(e) => updateField('confirmPassword', e.target.value)}
                  className={`auth-input-field ${errors.confirmPassword ? 'has-error' : ''}`}
                  required
                />
                {errors.confirmPassword && <span className="field-error-text">{errors.confirmPassword}</span>}
              </div>
            </div>

            <button
              type="submit"
              className="btn-auth-submit"
              disabled={submitting || googleSubmitting}
            >
              <span>{submitting ? 'Creating Account...' : 'Complete Farmer Registration'}</span>
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
            <span>Already registered with KisanSetu?</span>
            <Link to="/login" className="auth-switch-link">
              Sign In here &rarr;
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}

export default FarmerSignup
