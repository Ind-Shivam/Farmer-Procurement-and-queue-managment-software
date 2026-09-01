import { NavLink, Outlet } from 'react-router-dom'
import { useBookings } from '../context/useBookings.js'

const farmerLinks = [
  { to: '/', label: 'Home', end: true },
  { to: '/centres', label: 'Centres & Slots' },
  { to: '/book', label: 'Book Slot' },
  { to: '/queue', label: 'Live Queue' },
]

const staffLinks = [
  { to: '/staff', label: 'Staff Console' },
  { to: '/admin', label: 'Admin Stats' },
]

function AppLayout() {
  const { bookings, isFirebaseActive } = useBookings()
  const latestToken = bookings.length > 0 ? bookings[bookings.length - 1].token : 'KC-2026-0101'

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="header-brand-row">
          <div className="header-brand">
            <NavLink to="/" className="brand">
              <span className="brand-mark" aria-hidden="true">
                🌾
              </span>
              <span>
                <strong>KisanSetu Q-Ease</strong>
                <small>SIH26032 · Mandi Procurement &amp; Token Queue</small>
              </span>
            </NavLink>
          </div>

          <div className="header-quick-action" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              className={`badge ${isFirebaseActive ? 'badge-accent' : 'badge-neutral'}`}
              title={isFirebaseActive ? 'Connected to Firebase Cloud Firestore' : 'Running in Local Offline Mode with sample data'}
            >
              {isFirebaseActive ? '🔥 Firestore Live' : '⚡ Local Mode'}
            </span>
            <NavLink to={`/booking/${latestToken}`} className="btn-token-quick">
              🎫 Find Token
            </NavLink>
          </div>
        </div>

        <nav className="site-nav" aria-label="Main Navigation">
          <div className="nav-section">
            <span className="nav-group-label">Farmer Portal</span>
            <div className="nav-links-wrap">
              {farmerLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                >
                  {link.label}
                </NavLink>
              ))}
            </div>
          </div>

          <div className="nav-section nav-section-staff">
            <span className="nav-group-label">Mandi Operations</span>
            <div className="nav-links-wrap">
              {staffLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                >
                  {link.label}
                </NavLink>
              ))}
            </div>
          </div>
        </nav>
      </header>

      <main className="site-main">
        <Outlet />
      </main>

      <footer className="site-footer">
        <div className="footer-content">
          <p>
            <strong>KisanSetu Q-Ease</strong> · Smart Mandi Slot Booking &amp; Live Token Management (SIH26032)
          </p>
          <p className="footer-sub">
            {isFirebaseActive
              ? 'Connected to Firebase Cloud Firestore. Live multi-device synchronization active.'
              : 'Running in local state mode with pure JavaScript utilities. Add Firebase credentials to .env to enable Cloud Firestore.'}
          </p>
        </div>
      </footer>
    </div>
  )
}

export default AppLayout
