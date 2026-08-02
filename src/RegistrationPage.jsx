import { useEffect, useState } from "react";
import { Button, TextField } from "@mui/material";
import { Link, useNavigate } from "react-router-dom";
import LockRounded from "@mui/icons-material/LockRounded";
import SchoolRounded from "@mui/icons-material/SchoolRounded";
import { AuthRouteNav } from "./AuthRouteNav";

const API = (import.meta.env.VITE_AUTH_API_BASE_URL || "http://127.0.0.1:8787/api/auth/v1").replace(/\/$/, "");

export function RegistrationPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", name: "", password: "", verification_code: "" });
  const verificationEnabled = String(import.meta.env.VITE_EMAIL_VERIFICATION_ENABLED || "false").toLowerCase() === "true";
  const [sending, setSending] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (!cooldown) return undefined;
    const timer = window.setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  const update = (field) => (event) => setForm((value) => ({ ...value, [field]: event.target.value }));
  async function sendCode() {
    setError(""); setMessage(""); setSending(true);
    try {
      const response = await fetch(API + "/email/send-code", { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ email: form.email }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || "验证码发送失败");
      setCooldown(60);
      setMessage(payload.developmentCode ? `验证码已发送（开发码：${payload.developmentCode}）` : "验证码已发送，请查收邮箱");
    } catch (reason) { setError(reason.message); } finally { setSending(false); }
  }
  async function submit(event) {
    event.preventDefault(); setError(""); setMessage(""); setSubmitting(true);
    try {
      const requestBody = verificationEnabled ? form : { email: form.email, password: form.password, name: form.name };
      const response = await fetch(API + "/register", { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(requestBody) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || "注册失败");
      setMessage("注册成功，请使用邮箱和密码登录");
      window.setTimeout(() => navigate("/login"), 700);
    } catch (reason) { setError(reason.message); } finally { setSubmitting(false); }
  }
  return <main className="login-page"><AuthRouteNav active="register" /><section className="login-intro"><div className="login-brand"><span><SchoolRounded /></span>Python Data Studio</div><div><span className="login-kicker">学习 · 实训 · 教学管理</span><h1>一个入口，按身份进入不同工作台</h1><p>学生专注课程与实训，教师组织任务与评阅，学校管理员维护账号和班级。页面权限由角色控制，敏感操作仍由服务端再次校验。</p></div><ul><li>学生：课程、练习、我的实训、学习记录</li><li>教师：课程预览、实训任务、提交评阅、班级学情</li><li>管理员：批量建号、班级管理、角色与账号状态</li></ul></section><section className="login-panel" aria-labelledby="register-title"><div className="login-lock"><LockRounded /></div><span className="eyebrow">邮箱注册</span><h2 id="register-title">创建账号</h2><p>注册账号默认拥有学生权限。</p><form onSubmit={submit}><TextField label="邮箱" type="email" value={form.email} onChange={update("email")} autoComplete="email" fullWidth required /><TextField label="姓名" value={form.name} onChange={update("name")} autoComplete="name" fullWidth required />{verificationEnabled && <div className="verification-row"><TextField label="邮箱验证码" value={form.verification_code} onChange={update("verification_code")} inputProps={{ inputMode: "numeric", maxLength: 6 }} fullWidth required /><Button type="button" variant="outlined" onClick={sendCode} disabled={sending || cooldown > 0 || !form.email}>{cooldown ? `${cooldown}s` : sending ? "发送中" : "获取验证码"}</Button></div>}<TextField label="密码（至少 8 位）" type="password" value={form.password} onChange={update("password")} autoComplete="new-password" fullWidth required />{!verificationEnabled && <div className="auth-info">邮箱验证码服务当前未启用，注册后可直接登录。</div>}{message && <div className="auth-success" role="status">{message}</div>}{error && <div className="auth-error" role="alert">{error}</div>}<Button type="submit" variant="contained" size="large" disabled={submitting} fullWidth>{submitting ? "正在注册…" : "注册"}</Button></form><p className="auth-switch">已有账号？ <Link to="/login">返回登录</Link></p></section></main>;
}
