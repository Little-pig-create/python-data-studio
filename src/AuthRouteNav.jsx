import HomeRounded from "@mui/icons-material/HomeRounded";
import InfoOutlined from "@mui/icons-material/InfoOutlined";
import LoginRounded from "@mui/icons-material/LoginRounded";
import PersonAddAltRounded from "@mui/icons-material/PersonAddAltRounded";
import { Button, Stack } from "@mui/material";
import { Link } from "react-router-dom";

const routes = {
  login: { to: "/register", label: "邮箱注册", icon: PersonAddAltRounded },
  register: { to: "/login", label: "返回登录", icon: LoginRounded },
};

export function AuthRouteNav({ active = "login" }) {
  const primary = routes[active] || routes.login;
  const PrimaryIcon = primary.icon;
  return <Stack component="nav" direction="row" spacing={0.5} className="login-route-nav" aria-label="认证页面导航">
    <Button component={Link} to="/" className="login-route-link" variant="text" size="small" startIcon={<HomeRounded fontSize="small" />}>返回首页</Button>
    <Button component={Link} to="/about" className="login-route-link" variant="text" size="small" startIcon={<InfoOutlined fontSize="small" />}>关于软件</Button>
    <Button component={Link} to={primary.to} className="login-route-link login-route-primary" variant="text" size="small" startIcon={<PrimaryIcon fontSize="small" />}>{primary.label}</Button>
  </Stack>;
}
