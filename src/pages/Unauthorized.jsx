import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'

function Unauthorized({ requiredRoles = [], currentRole }) {
  const { userProfile, userRole: contextRole, logout } = useAuth()
  const navigate = useNavigate()
  const activeRole = currentRole || contextRole || userProfile?.role || 'farmer'

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  const roleDashboardMap = {
    farmer: { path: '/', label: 'Farmer Portal' },
    staff: { path: '/staff', label: 'Staff Console' },
    admin: { path: '/admin', label: 'Admin Dashboard' },
  }

  const targetDashboard = roleDashboardMap[activeRole] || { path: '/', label: 'Home Portal' }

  return (
    <div className="page page-narrow">
      <div className="unauthorized-card panel">
        <div className="unauthorized-icon-badge" aria-hidden="true">
          🛡️
        </div>
        <p className="eyebrow" style={{ color: 'var(--danger, #dc2626)' }}>
          Security Restriction &bull; HTTP 403
        </p>
        <h1>Unauthorized Access</h1>
        <p className="lede">
          You do not have the required administrative role to access this operations console.
        </p>

        <div className="role-status-box">
          <div className="role-status-item">
            <span className="role-label">Your Current Role:</span>
            <span className={`badge badge-role-${activeRole}`}>
              {activeRole === 'admin' ? '👑 Admin' : activeRole === 'staff' ? '🏢 Staff' : '👨‍🌾 Farmer'}
            </span>
          </div>

          {requiredRoles.length > 0 && (
            <div className="role-status-item">
              <span className="role-label">Required Role(s):</span>
              <div className="required-badges-wrap">
                {requiredRoles.map((r) => (
                  <span key={r} className="badge badge-neutral">
                    {r.toUpperCase()}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <p className="subtext" style={{ margin: '16px 0 24px' }}>
          Security restrictions prevent lower-privileged roles from modifying mandi operations or inspecting restricted records.
        </p>

        <div className="actions" style={{ justifyContent: 'center' }}>
          <Link className="btn btn-primary" to={targetDashboard.path}>
            ← Return to {targetDashboard.label}
          </Link>
          <Link className="btn btn-secondary" to="/queue">
            Public Queue Board
          </Link>
          <button type="button" className="btn btn-danger" onClick={handleLogout}>
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}

export default Unauthorized
