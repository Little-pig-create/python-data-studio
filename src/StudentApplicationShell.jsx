import { Suspense, lazy, useEffect, useState } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { theme } from "./theme";
import { useCourseCatalog } from "./hooks/useCourseCatalog";
import { AuthProvider, ROLES, RequireAuth, RoleHomeRedirect } from "./AuthProvider";
import { PageSkeleton } from "./LoadingSkeletons";

const LoginPage = lazy(() => import("./LoginPage").then((module) => ({ default: module.LoginPage })));
const RegistrationPage = lazy(() => import("./RegistrationPage").then((module) => ({ default: module.RegistrationPage })));
const AboutPage = lazy(() => import("./AboutPage").then((module) => ({ default: module.AboutPage })));
const ForbiddenPage = lazy(() => import("./ForbiddenPage").then((module) => ({ default: module.ForbiddenPage })));
const CourseView = lazy(() => import("./pages/CourseView").then((module) => ({ default: module.CourseView })));
const ProgressPage = lazy(() => import("./pages/ProgressPage").then((module) => ({ default: module.ProgressPage })));
const PracticeCenter = lazy(() => import("./PracticeCenter").then((module) => ({ default: module.PracticeCenter })));
const StudentTrainingCenter = lazy(() => import("./StudentTrainingCenter").then((module) => ({ default: module.StudentTrainingCenter })));
const RuntimeDiagnostics = lazy(() => import("./RuntimeDiagnostics").then((module) => ({ default: module.RuntimeDiagnostics })));
const SessionDock = lazy(() => import("./PortalHeader").then((module) => ({ default: module.SessionDock })));
const AppUpdater = lazy(() => import("./AppUpdater").then((module) => ({ default: module.AppUpdater })));

function DeferredAppUpdater() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let idleId;
    let timerId;
    const show = () => setReady(true);
    if (typeof window.requestIdleCallback === "function") idleId = window.requestIdleCallback(show, { timeout: 2000 });
    else timerId = window.setTimeout(show, 800);
    return () => {
      if (idleId != null) window.cancelIdleCallback?.(idleId);
      if (timerId != null) window.clearTimeout(timerId);
    };
  }, []);

  return ready ? <Suspense fallback={null}><AppUpdater /></Suspense> : null;
}

function StudentRoutes() {
  const location = useLocation();
  const catalogRequired = location.pathname.startsWith("/course/")
    || ["/progress", "/practice", "/training"].includes(location.pathname);
  const { catalog, catalogError } = useCourseCatalog({ enabled: catalogRequired });

  if (catalogError && catalogRequired) {
    return <main className="custom-notebook-error"><strong>课程目录加载失败</strong><p>{catalogError}</p></main>;
  }
  if (!catalog && catalogRequired) return <PageSkeleton variant="shell" />;

  return (
    <Suspense fallback={<PageSkeleton />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegistrationPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/runtime-diagnostics" element={<RequireAuth roles={[ROLES.STUDENT]}><SessionDock /><RuntimeDiagnostics /></RequireAuth>} />
        <Route path="/forbidden" element={<RequireAuth><ForbiddenPage /></RequireAuth>} />
        <Route path="/course/:chapterId" element={<RequireAuth roles={[ROLES.STUDENT]}><CourseView catalog={catalog} /></RequireAuth>} />
        <Route path="/progress" element={<RequireAuth roles={[ROLES.STUDENT]}><SessionDock /><ProgressPage catalog={catalog} /></RequireAuth>} />
        <Route path="/practice" element={<RequireAuth roles={[ROLES.STUDENT]}><SessionDock /><PracticeCenter catalog={catalog} /></RequireAuth>} />
        <Route path="/training" element={<RequireAuth roles={[ROLES.STUDENT]}><SessionDock /><StudentTrainingCenter catalog={catalog} /></RequireAuth>} />
        <Route path="*" element={<RoleHomeRedirect />} />
      </Routes>
    </Suspense>
  );
}

export function ApplicationShell() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <DeferredAppUpdater />
        <StudentRoutes />
      </AuthProvider>
    </ThemeProvider>
  );
}
