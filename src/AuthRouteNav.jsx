import HomeRounded from "@mui/icons-material/HomeRounded";
import { Button, Stack } from "@mui/material";
import { Link } from "react-router-dom";

export function AuthRouteNav({ active = "login" }) {
  return <Stack component="nav" direction="row" className="login-route-nav" aria-label="认证页面导航">
    <Button component={Link} to="/" className="login-route-link login-route-primary" variant="text" size="small" startIcon={<HomeRounded fontSize="small" />}>返回首页</Button>
  </Stack>;
}
