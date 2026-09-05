import { useMemo, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'
import { useBookings } from '../context/useBookings.js'
import { getLastBookingToken } from '../utils/storage.js'
import { normalizeMobile } from '../utils/validation.js'
import KisanSetuLogo from '../components/KisanSetuLogo.jsx'

function AppLayout() {
  const navigate = useNavigate()
  const { currentUser, userProfile, userRole, isStaff, isAdmin, logout } = useAuth()
  const { bookings, notifications } = useBookings()
  const [searchQuery, setSearchQuery] = useState('')
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [showSupportModal, setShowSupportModal] = useState(false)
  const [showNotifMenu, setShowNotifMenu] = useState(false)

  const lastSavedToken = userRole === 'farmer'
    ? getLastBookingToken(currentUser?.uid || userProfile?.mobile || currentUser?.email || '')
    : ''

  const latestToken = useMemo(() => {
    if (userRole !== 'farmer') return null

    const userMobile = normalizeMobile(userProfile?.mobile)
    const currentUid = currentUser?.uid || ''

    const filtered = (bookings || []).filter((booking) => {
      if (currentUid && booking.ownerUid && booking.ownerUid === currentUid) return true
      if (userMobile && normalizeMobile(booking.mobile) === userMobile) return true
      if (lastSavedToken && booking.token === lastSavedToken) return true
      return false
    })

    if (filtered.length === 0) return null

    return [...filtered].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))[0].token || null
  }, [bookings, currentUser, lastSavedToken, userProfile, userRole])


  async function handleLogout() {
    setShowProfileMenu(false)
    await logout()
    navigate('/login', { replace: true })
  }

  function handleSearch(e) {
    e.preventDefault()
    if (!searchQuery.trim()) return
    const clean = searchQuery.trim()
    setSearchQuery('')
    navigate(`/booking/${clean}`)
  }

  const roleLabelMap = {
    admin: { label: 'Admin', icon: '👑', className: 'badge-role-admin' },
    staff: { label: 'Staff', icon: '🏢', className: 'badge-role-staff' },
    farmer: { label: 'Farmer', icon: '👨‍🌾', className: 'badge-role-farmer' },
  }

  const activeRoleBadge = roleLabelMap[userRole] || roleLabelMap.farmer
  const userName = userProfile?.name || currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Farmer'
  const userInitial = userName.charAt(0).toUpperCase()

  return (
    <div className="agri-app-container">
      {/* 1. Left Sidebar Navigation */}
      <aside className="agri-sidebar">
        <div className="agri-sidebar-header">
          <NavLink to="/" className="agri-brand-link">
            <KisanSetuLogo size={40} />
            <div className="agri-brand-text">
              <span className="agri-brand-title">KisanSetu</span>
              <span className="agri-brand-subtitle">Govt. of Agriculture</span>
            </div>
          </NavLink>
        </div>

        <nav className="agri-nav-menu" aria-label="Main Navigation">
          {userRole === 'farmer' && (
            <div className="agri-nav-group">
              <NavLink
                to="/"
                end
                className={({ isActive }) => (isActive ? 'agri-nav-item active' : 'agri-nav-item')}
              >
                <span className="agri-nav-icon" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="7" height="7" x="3" y="3" rx="1" />
                    <rect width="7" height="7" x="14" y="3" rx="1" />
                    <rect width="7" height="7" x="14" y="14" rx="1" />
                    <rect width="7" height="7" x="3" y="14" rx="1" />
                  </svg>
                </span>
                <span className="agri-nav-label">Dashboard</span>
              </NavLink>

              <NavLink
                to="/book"
                className={({ isActive }) => (isActive ? 'agri-nav-item active' : 'agri-nav-item')}
              >
                <span className="agri-nav-icon" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8 2v4" />
                    <path d="M16 2v4" />
                    <rect width="18" height="18" x="3" y="4" rx="2" />
                    <path d="M3 10h18" />
                    <path d="m9 16 2 2 4-4" />
                  </svg>
                </span>
                <span className="agri-nav-label">Book Slot</span>
              </NavLink>

              <NavLink
                to="/queue"
                className={({ isActive }) => (isActive ? 'agri-nav-item active' : 'agri-nav-item')}
              >
                <span className="agri-nav-icon" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 22h14" />
                    <path d="M5 2h14" />
                    <path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22" />
                    <path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2" />
                  </svg>
                </span>
                <span className="agri-nav-label">Live Queue</span>
              </NavLink>

              <NavLink
                to={latestToken ? `/booking/${latestToken}` : '/book'}
                className={({ isActive }) => (isActive ? 'agri-nav-item active' : 'agri-nav-item')}
              >
                <span className="agri-nav-icon" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="20" height="14" x="2" y="5" rx="2" />
                    <line x1="2" x2="22" y1="10" y2="10" />
                    <path d="M6 15h2" />
                    <path d="M12 15h6" />
                  </svg>
                </span>
                <span className="agri-nav-label">Payments</span>
              </NavLink>
            </div>
          )}

          {/* Operations Console Links */}
          {(isStaff || isAdmin) && (
            <div className="agri-nav-group" style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
              <div className="agri-nav-heading">OPERATIONS</div>

              <NavLink
                to="/staff"
                className={({ isActive }) => (isActive ? 'agri-nav-item active' : 'agri-nav-item')}
              >
                <span className="agri-nav-icon" aria-hidden="true">
                  <span className="material-symbols-outlined text-sm">badge</span>
                </span>
                <span className="agri-nav-label">Staff Console</span>
              </NavLink>

              {isAdmin && (
                <NavLink
                  to="/admin"
                  className={({ isActive }) => (isActive ? 'agri-nav-item active' : 'agri-nav-item')}
                >
                  <span className="agri-nav-icon" aria-hidden="true">
                    <span className="material-symbols-outlined text-sm">admin_panel_settings</span>
                  </span>
                  <span className="agri-nav-label">Admin Console</span>
                </NavLink>
              )}
            </div>
          )}
        </nav>
      </aside>

      {/* 2. Main Content Area */}
      <div className="agri-main-area">
        {/* Top Header Bar */}
        <header className="agri-top-bar">
          <div className="agri-header-title-wrap">
            <h1 className="agri-header-page-title">AgriProcure Portal</h1>
          </div>

          <div className="agri-header-right-tools">
            {/* Search Input */}
            <form onSubmit={handleSearch} className="agri-search-form">
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="agri-search-input"
              />
              <button type="submit" className="agri-search-btn" title="Search token or mobile">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
              </button>
            </form>

            {/* Notification Bell */}
            <div className="agri-tool-wrap">
              <button
                type="button"
                className="agri-icon-button"
                onClick={() => {
                  setShowNotifMenu(!showNotifMenu)
                  setShowProfileMenu(false)
                }}
                title="Notifications"
                aria-label="Notifications"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                  <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                </svg>
                {notifications && notifications.length > 0 && (
                  <span className="agri-badge-dot" />
                )}
              </button>

              {showNotifMenu && (
                <div className="notif-dropdown-card">
                  <div className="notif-dropdown-header">
                    <h4 className="notif-dropdown-title">
                      <span className="material-symbols-outlined text-sm" style={{ color: '#4059aa' }}>notifications</span>
                      Notifications
                    </h4>
                    <span style={{ background: '#eff4ff', color: '#4059aa', fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '9999px' }}>
                      {notifications?.length || 0}
                    </span>
                  </div>
                  <div className="agri-dropdown-list">
                    {notifications && notifications.length > 0 ? (
                      notifications.slice(0, 4).map((n) => (
                        <div key={n.id || n.createdAt} className="agri-notif-item">
                          <p>{n.message}</p>
                          <small>{new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
                        </div>
                      ))
                    ) : (
                      <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                        No new notifications
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Support / Help Icon */}
            <button
              type="button"
              className="agri-icon-button"
              onClick={() => {
                setShowSupportModal(true)
                setShowProfileMenu(false)
                setShowNotifMenu(false)
              }}
              title="Help & Support"
              aria-label="Help & Support"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <path d="M12 17h.01" />
              </svg>
            </button>

            {/* Profile Avatar / Menu */}
            <div className="agri-tool-wrap">
              {currentUser ? (
                <button
                  type="button"
                  className="agri-avatar-btn"
                  onClick={() => {
                    setShowProfileMenu(!showProfileMenu)
                    setShowNotifMenu(false)
                  }}
                  title={`${userName} (${activeRoleBadge.label})`}
                >
                  <span className="agri-avatar-initial">{userInitial}</span>
                </button>
              ) : (
                <NavLink to="/login" className="btn btn-sm btn-primary" style={{ padding: '6px 14px' }}>
                  Sign In
                </NavLink>
              )}

              {showProfileMenu && currentUser && (
                <div className="profile-dropdown-card">
                  {/* User Profile Header */}
                  <div className="profile-dropdown-header">
                    <div className="profile-user-row">
                      <div className="profile-header-avatar">
                        <span>{userInitial}</span>
                      </div>
                      <div className="profile-user-meta">
                        <h4 className="profile-name-text">{userName}</h4>
                        <span className="profile-email-text">{currentUser.email}</span>
                      </div>
                    </div>

                    <div className="profile-role-badge-row">
                      <span className={`profile-role-pill ${userRole || 'farmer'}`}>
                        <span className="material-symbols-outlined text-xs">
                          {userRole === 'admin' ? 'admin_panel_settings' : userRole === 'staff' ? 'badge' : 'agriculture'}
                        </span>
                        <span>{activeRoleBadge.label}</span>
                      </span>
                    </div>
                  </div>

                  {/* Menu Actions */}
                  <div className="profile-dropdown-actions">
                    {userRole === 'farmer' && (
                      <NavLink
                        to="/book"
                        className="profile-menu-item"
                        onClick={() => setShowProfileMenu(false)}
                      >
                        <span className="material-symbols-outlined profile-menu-icon" style={{ color: '#003527' }}>
                          calendar_month
                        </span>
                        <span className="profile-menu-text">Book Mandi Slot</span>
                      </NavLink>
                    )}

                    {userRole === 'farmer' && (
                      <NavLink
                        to="/queue"
                        className="profile-menu-item"
                        onClick={() => setShowProfileMenu(false)}
                      >
                        <span className="material-symbols-outlined profile-menu-icon" style={{ color: '#4059aa' }}>
                          hourglass_empty
                        </span>
                        <span className="profile-menu-text">Live Queue Board</span>
                      </NavLink>
                    )}

                    {isStaff && (
                      <NavLink
                        to="/staff"
                        className="profile-menu-item"
                        onClick={() => setShowProfileMenu(false)}
                      >
                        <span className="material-symbols-outlined profile-menu-icon" style={{ color: '#4059aa' }}>
                          desktop_windows
                        </span>
                        <span className="profile-menu-text">Staff Console</span>
                      </NavLink>
                    )}

                    {isAdmin && (
                      <NavLink
                        to="/admin"
                        className="profile-menu-item"
                        onClick={() => setShowProfileMenu(false)}
                      >
                        <span className="material-symbols-outlined profile-menu-icon" style={{ color: '#854d0e' }}>
                          query_stats
                        </span>
                        <span className="profile-menu-text">Admin Console</span>
                      </NavLink>
                    )}

                    <div className="profile-dropdown-divider" />

                    <button
                      type="button"
                      className="profile-menu-item profile-logout-btn"
                      onClick={handleLogout}
                    >
                      <span className="material-symbols-outlined profile-menu-icon" style={{ color: '#ba1a1a' }}>
                        logout
                      </span>
                      <span className="profile-menu-text">Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content Outlet */}
        <main className="agri-body-content">
          <Outlet />
        </main>
      </div>

      {/* Support Center Modal */}
      {showSupportModal && (
        <div className="agri-modal-overlay" onClick={() => setShowSupportModal(false)}>
          <div className="agri-modal-card panel" onClick={(e) => e.stopPropagation()}>
            <div className="agri-modal-header">
              <h3>🌾 KisanSetu Support Center</h3>
              <button type="button" className="btn-close" onClick={() => setShowSupportModal(false)}>✕</button>
            </div>
            <div className="agri-modal-body">
              <p>For immediate mandi yard inquiries, token slot adjustments, or moisture test disputes:</p>
              <div className="support-hotline-box">
                <strong>Toll-Free Mandi Helpline:</strong>
                <span className="hotline-number">📞 1800-267-2026</span>
                <small>Mon - Sat (08:00 AM - 07:00 PM IST)</small>
              </div>
              <p style={{ marginTop: '14px', fontSize: '0.9rem', color: '#64748b' }}>
                District Control Center &bull; Wardha &bull; Nagpur &bull; Amravati Mandi Yards
              </p>
            </div>
            <div className="agri-modal-footer">
              <button type="button" className="btn btn-primary" onClick={() => setShowSupportModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AppLayout
