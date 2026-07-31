import { NavLink } from "react-router-dom";

export function RoleWorkspaceNav({ ariaLabel, items }) {
  return <nav className="role-workspace-nav" aria-label={ariaLabel}>
    {items.map((item) => <NavLink
      key={item.to}
      to={item.to}
      end={item.end}
      className={({ isActive }) => isActive ? "active" : undefined}
    >
      <span>{item.icon}</span>
      {item.label}
    </NavLink>)}
  </nav>;
}
