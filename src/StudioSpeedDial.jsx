import { useState } from "react";
import AccountCircleRounded from "@mui/icons-material/AccountCircleRounded";
import AssignmentRounded from "@mui/icons-material/AssignmentRounded";
import HistoryRounded from "@mui/icons-material/HistoryRounded";
import HomeRounded from "@mui/icons-material/HomeRounded";
import InfoOutlined from "@mui/icons-material/InfoOutlined";
import LogoutRounded from "@mui/icons-material/LogoutRounded";
import { SpeedDial, SpeedDialAction, SpeedDialIcon } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { ROLES, roleHome, useAuth } from "./AuthProvider";

export function StudioSpeedDial({ className = "", showHome = false }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  if (!user) return null;

  const close = () => setOpen(false);
  const go = (path) => {
    close();
    navigate(path);
  };
  const tooltip = (title) => ({ tooltip: { title, open: true, placement: "left" } });

  return <SpeedDial
    className={`studio-speed-dial ${className}`.trim()}
    ariaLabel="账户与工作台操作"
    icon={<SpeedDialIcon icon={<AccountCircleRounded />} />}
    direction="down"
    open={open}
    onOpen={() => setOpen(true)}
    onClose={close}
    FabProps={{ size: "small", "aria-label": "打开账户与工作台操作" }}
  >
    {showHome && <SpeedDialAction icon={<HomeRounded />} slotProps={tooltip("工作台首页")} onClick={() => go(roleHome(user.role))} />}
    {user.role === ROLES.STUDENT && <SpeedDialAction icon={<HistoryRounded />} slotProps={tooltip("学习记录")} onClick={() => go("/progress")} />}
    {user.role === ROLES.STUDENT && <SpeedDialAction icon={<AssignmentRounded />} slotProps={tooltip("我的实训")} onClick={() => go("/training")} />}
    <SpeedDialAction icon={<InfoOutlined />} slotProps={tooltip("关于软件")} onClick={() => go("/about")} />
    <SpeedDialAction icon={<LogoutRounded />} slotProps={tooltip(`退出登录（${user.name}）`)} onClick={async () => { close(); await logout(); navigate("/login", { replace: true }); }} />
  </SpeedDial>;
}
