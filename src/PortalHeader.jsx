export function PortalHeader({ title, subtitle, actions, showHome = false }) {
  return <header className="portal-header">
    <div className="portal-heading">
      <span className="eyebrow">Python Data Studio</span>
      <h1>{title}</h1>
      {subtitle && <p>{subtitle}</p>}
    </div>
    <div className="portal-header-actions">
      {actions}
    </div>
  </header>;
}

export function SessionDock() {
  return null;
}
