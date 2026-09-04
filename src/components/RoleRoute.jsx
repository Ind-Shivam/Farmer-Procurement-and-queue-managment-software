import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'
import Unauthorized from '../pages/Unauthorized.jsx'

function RoleRoute({ allowedRoles = [], children }) {
  const { currentUser, userRole, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="auth-loading-screen">
        <div className="auth-loading-card panel">
          <div className="auth-spinner" aria-hidden="true" />
          <h3>Verifying Security Permissions</h3>
          <p className="subtext">Checking access rights for role: <strong>{userRole || '...'}</strong></p>
        </div>
      </div>
    )
  }

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
    return <Unauthorized requiredRoles={allowedRoles} currentRole={userRole} />
  }

  return children ? children : <Outlet />
}

export default RoleRoute
