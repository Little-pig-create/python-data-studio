import { useEffect, useState } from "react";
import { Button, TextField } from "@mui/material";
import LockRounded from "@mui/icons-material/LockRounded";
import SchoolRounded from "@mui/icons-material/SchoolRounded";
import { Link, useNavigate } from "react-router-dom";
import { ROLE_LABELS, demoAccounts, roleHome, useAuth } from "./AuthProvider";

const SAVED_LOGIN_KEY = "python-data-studio:saved-login:v1";

export function LoginPage() {
  const { user, login, config, error: sessionError } = useAuth();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [rememberLogin, setRememberLogin] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(SAVED_LOGIN_KEY) || "null");
      if (saved?.identifier) setIdentifier(String(saved.identifier));
      if (saved?.password) setPassword(String(saved.password));
      if (saved && typeof saved.remember === "boolean") setRememberLogin(saved.remember);
    } catch {
      window.localStorage.removeItem(SAVED_LOGIN_KEY);
    }
  }, []);

  useEffect(() => {
    if (user) navigate(roleHome(user.role), { replace: true });
  }, [user, navigate]);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const nextUser = await login({ identifier, password });
      if (rememberLogin) {
        window.localStorage.setItem(SAVED_LOGIN_KEY, JSON.stringify({ identifier: identifier.trim(), password, remember: true }));
      } else {
        window.localStorage.removeItem(SAVED_LOGIN_KEY);
      }
      navigate(roleHome(nextUser.role), { replace: true });
    } catch (loginError) {
      setError(loginError.message || "登录失败");
    } finally {
      setSubmitting(false);
    }
  }

  function useDemoAccount(account) {
    setIdentifier(account.identifier);
    setPassword(account.password);
    setError("");
  }

  return <main className="login-page">
    <section className="login-intro">
      <div className="login-brand"><span><SchoolRounded /></span>Python Data Studio</div>
      <div>
        <span className="login-kicker">学习 · 实训 · 教学管理</span>
        <h1>一个入口，按身份进入不同工作台</h1>
        <p>学生专注课程与实训，教师组织任务与评阅，学校管理员维护账号和班级。页面权限由角色控制，敏感操作仍由服务端再次校验。</p>
      </div>
      <ul>
        <li>学生：课程、练习、我的实训、学习记录</li>
        <li>教师：课程预览、实训任务、提交评阅、班级学情</li>
        <li>管理员：批量建号、班级管理、角色与账号状态</li>
      </ul>
    </section>
    <section className="login-panel" aria-labelledby="login-title">
      <div className="login-lock"><LockRounded /></div>
      <span className="eyebrow">统一身份认证</span>
      <h2 id="login-title">登录工作台</h2>
      <p>使用学校分配的学号、工号或管理员账号。</p>
      <form onSubmit={handleSubmit}>
        <TextField label="账号" value={identifier} onChange={(event) => setIdentifier(event.target.value)} autoComplete="username" fullWidth required />
        <TextField label="密码" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" fullWidth required />
        <label className="login-remember"><input type="checkbox" checked={rememberLogin} onChange={(event) => setRememberLogin(event.target.checked)} />记住账号和密码</label>
        {(error || sessionError) && <div className="auth-error" role="alert">{error || sessionError}</div>}
        <Button type="submit" variant="contained" size="large" disabled={submitting} fullWidth>{submitting ? "正在登录…" : "登录"}</Button>
      </form>
      <p className="auth-switch">没有账号？ <Link to="/register">使用邮箱注册</Link></p>
      {config.demoMode && <div className="demo-login-panel">
        <div><strong>本地演示模式</strong><span>认证服务接入前使用；学习记录仅保存在当前设备</span></div>
        <div className="demo-account-grid">{demoAccounts.map((account) => <button type="button" key={account.role} onClick={() => useDemoAccount(account)} title={`账号：${account.identifier}；密码：${account.password}`}><strong>{ROLE_LABELS[account.role]}</strong><span>{account.identifier} / {account.password}</span></button>)}</div>
      </div>}
      {!config.apiEnabled && !config.demoMode && <div className="auth-warning">认证服务尚未启用。请配置 <code>VITE_AUTH_API_ENABLED=true</code>。</div>}
    </section>
  </main>;
}
