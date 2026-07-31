import { Button } from "@mui/material";
import BlockRounded from "@mui/icons-material/BlockRounded";
import { useNavigate } from "react-router-dom";
import { roleHome, useAuth } from "./AuthProvider";

export function ForbiddenPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return <main className="forbidden-page"><div className="forbidden-icon"><BlockRounded /></div><span className="eyebrow">403 · 权限不足</span><h1>当前身份不能访问这个页面</h1><p>系统已按账号角色限制页面入口。若角色分配有误，请联系学校管理员。</p><div><Button variant="contained" onClick={() => navigate(roleHome(user.role), { replace: true })}>返回我的工作台</Button><Button variant="text" onClick={async () => { await logout(); navigate("/login", { replace: true }); }}>切换账号</Button></div></main>;
}
