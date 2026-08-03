import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { activateLearningProfile } from "./store";

export const ROLES = Object.freeze({
  STUDENT: "student",
  TEACHER: "teacher",
  SCHOOL_ADMIN: "school_admin",
});

export const ROLE_LABELS = Object.freeze({
  [ROLES.STUDENT]: "学生",
  [ROLES.TEACHER]: "教师",
  [ROLES.SCHOOL_ADMIN]: "学校管理员",
});

const AUTH_SESSION_KEY = "python-data-studio:demo-session:v1";
const studentEdition = import.meta.env.VITE_APP_EDITION === "student";
const apiEnabled = String(import.meta.env.VITE_AUTH_API_ENABLED || "").toLowerCase() === "true";
const explicitDemoMode = import.meta.env.VITE_AUTH_DEMO_MODE;

export const authConfig = Object.freeze({
  apiEnabled,
  baseUrl: (import.meta.env.VITE_AUTH_API_BASE_URL || "/api/auth/v1").replace(/\/$/, ""),
  demoMode: explicitDemoMode == null
    ? false
    : String(explicitDemoMode).toLowerCase() === "true" && !apiEnabled,
});

const allDemoAccounts = [
  { identifier: "20260001", password: "student123", role: ROLES.STUDENT, name: "演示学生", userId: "demo-student-20260001" },
  { identifier: "T2026001", password: "teacher123", role: ROLES.TEACHER, name: "演示教师", userId: "demo-teacher-T2026001" },
  { identifier: "admin", password: "admin123", role: ROLES.SCHOOL_ADMIN, name: "演示管理员", userId: "demo-admin" },
];
export const demoAccounts = Object.freeze(studentEdition
  ? allDemoAccounts.filter((account) => account.role === ROLES.STUDENT)
  : allDemoAccounts);

const AuthContext = createContext(null);

const normalizeUser = (payload) => {
  const source = payload?.user || payload;
  if (!source || !Object.values(ROLES).includes(source.role)) return null;
  if (studentEdition && source.role !== ROLES.STUDENT) return null;
  return {
    userId: String(source.userId || source.id || source.identifier || ""),
    identifier: String(source.identifier || source.studentNo || source.employeeNo || source.username || ""),
    name: String(source.name || source.displayName || source.identifier || "用户"),
    role: source.role,
    className: source.className || source.class_code || null,
    mustChangePassword: Boolean(source.mustChangePassword),
  };
};

async function request(pathname, options = {}) {
  const response = await fetch(authConfig.baseUrl + pathname, {
    ...options,
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  const payload = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.message || "身份认证服务请求失败");
  return payload;
}

export function roleHome(role) {
  if (role === ROLES.TEACHER) return "/teaching";
  if (role === ROLES.SCHOOL_ADMIN) return "/school-admin";
  return "/course/chapter-1";
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function restoreSession() {
      try {
        if (authConfig.apiEnabled) {
          const session = await request("/session");
          const restoredUser = normalizeUser(session);
          if (restoredUser) activateLearningProfile(restoredUser.userId);
          if (active) setUser(restoredUser);
          return;
        }
        if (authConfig.demoMode) {
          const saved = window.sessionStorage.getItem(AUTH_SESSION_KEY);
          if (saved && active) {
            const restoredUser = normalizeUser(JSON.parse(saved));
            if (restoredUser) activateLearningProfile(restoredUser.userId);
            setUser(restoredUser);
          }
        }
      } catch (sessionError) {
        if (active && authConfig.apiEnabled) setError(sessionError.message || "登录状态校验失败");
      } finally {
        if (active) setLoading(false);
      }
    }
    restoreSession();
    return () => { active = false; };
  }, []);

  const login = useCallback(async ({ identifier, password }) => {
    setError("");
    if (!identifier?.trim() || !password) throw new Error("请输入账号和密码");
    let nextUser;
    if (authConfig.apiEnabled) {
      nextUser = normalizeUser(await request("/login", {
        method: "POST",
        body: JSON.stringify({ identifier: identifier.trim(), password }),
      }));
    } else if (authConfig.demoMode) {
      const account = demoAccounts.find((item) => item.identifier === identifier.trim() && item.password === password);
      if (!account) throw new Error("演示账号或密码不正确");
      nextUser = normalizeUser(account);
      window.sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(nextUser));
    } else {
      throw new Error("认证服务尚未配置，请设置 VITE_AUTH_API_ENABLED=true");
    }
    if (!nextUser) throw new Error("服务端返回了无效的用户角色");
    activateLearningProfile(nextUser.userId);
    setUser(nextUser);
    return nextUser;
  }, []);

  const logout = useCallback(async () => {
    setError("");
    try {
      if (authConfig.apiEnabled) await request("/logout", { method: "POST" });
    } finally {
      window.sessionStorage.removeItem(AUTH_SESSION_KEY);
      setUser(null);
    }
  }, []);

  const value = useMemo(() => ({ user, loading, error, login, logout, config: authConfig }), [user, loading, error, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth 必须在 AuthProvider 内使用");
  return context;
}

export function RequireAuth({ roles, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="auth-loading"><div className="loading-bar" /><span>正在校验登录状态</span></div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/forbidden" replace />;
  return children;
}

export function RoleHomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <div className="auth-loading"><div className="loading-bar" /><span>正在校验登录状态</span></div>;
  return <Navigate to={user ? roleHome(user.role) : "/login"} replace />;
}
