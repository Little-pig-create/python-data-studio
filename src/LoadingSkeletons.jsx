export function PageSkeleton({ variant = "page" }) {
  return (
    <div className={`loading-skeleton loading-skeleton-${variant}`} aria-hidden="true">
      {variant === "shell" && <aside className="skeleton-sidebar"><span className="skeleton-block skeleton-logo" />{Array.from({ length: 6 }, (_, index) => <span className="skeleton-block skeleton-nav" key={index} />)}</aside>}
      <div className="skeleton-content">
        <span className="skeleton-block skeleton-topbar" />
        <span className="skeleton-block skeleton-title" />
        <span className="skeleton-block skeleton-subtitle" />
        <div className="skeleton-grid">{Array.from({ length: variant === "shell" ? 6 : 4 }, (_, index) => <span className="skeleton-block skeleton-card" key={index} />)}</div>
        <span className="skeleton-block skeleton-panel" />
        <span className="skeleton-block skeleton-panel short" />
      </div>
    </div>
  );
}

export function NotebookSkeleton() {
  return <div className="notebook-skeleton" aria-hidden="true"><span className="skeleton-block skeleton-notebook-heading" /><span className="skeleton-block skeleton-notebook-text" /><span className="skeleton-block skeleton-notebook-code" /><span className="skeleton-block skeleton-notebook-code short" /><span className="skeleton-block skeleton-notebook-text narrow" /></div>;
}
