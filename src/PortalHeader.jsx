import { Button } from "@mui/material";
import LogoutRounded from "@mui/icons-material/LogoutRounded";
import HomeRounded from "@mui/icons-material/HomeRounded";
import { useNavigate } from "react-router-dom";
import { ROLE_LABELS, roleHome, useAuth } from "./AuthProvider";

export function PortalHeader({ title, subtitle, actions, showHome = false }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return <header className="portal-header">
    <div className="portal-heading">
      <span className="eyebrow">Python Data Studio</span>
      <h1>{title}</h1>
      {subtitle && <p>{subtitle}</p>}
    </div>
    <div className="portal-header-actions">
      {actions}
      {showHome && <Button variant="outlined" startIcon={<HomeRounded />} onClick={() => navigate(roleHome(user.role))}>工作台首页</Button>}
      <div className="session-chip"><span className="session-avatar">{user.name.slice(0, 1)}</span><span><strong>{user.name}</strong><small>{ROLE_LABELS[user.role]} · {user.identifier}</small></span></div>
      <Button className="session-logout" variant="text" startIcon={<LogoutRounded />} onClick={handleLogout}>退出</Button>
    </div>
  </header>;
}

export function SessionDock() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return <div className="session-dock"><button type="button" onClick={() => navigate(roleHome(user.role))}><span className="session-avatar">{user.name.slice(0, 1)}</span><span><strong>{user.name}</strong><small>{ROLE_LABELS[user.role]}</small></span></button><button type="button" className="session-dock-logout" onClick={async () => { await logout(); navigate("/login", { replace: true }); }} aria-label="退出登录"><LogoutRounded fontSize="small" /></button></div>;
}
