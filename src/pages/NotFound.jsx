import { Link } from 'react-router-dom'

function NotFound() {
  return (
    <div className="page page-narrow">
      <p className="eyebrow">Error 404</p>
      <h1>This page is not on the map</h1>
      <p className="lede">
        The address you opened is not a KisanSetu Q-Ease screen. Use the menu or
        return to the farmer portal.
      </p>
      <div className="actions">
        <Link className="btn btn-primary" to="/">
          Farmer portal
        </Link>
        <Link className="btn" to="/queue">
          Queue status
        </Link>
      </div>
    </div>
  )
}

export default NotFound
