import logoImg from '../assets/kisansetu-logo.png'

export default function KisanSetuLogo({ size = 42, className = '' }) {
  return (
    <img
      src={logoImg}
      alt="KisanSetu Logo"
      className={`kisansetu-brand-img ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        objectFit: 'contain',
        borderRadius: '50%',
        boxShadow: '0 2px 8px rgba(0, 53, 39, 0.15)',
        flexShrink: 0,
      }}
    />
  )
}
