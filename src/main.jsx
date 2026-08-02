import "./styles.css";
import { Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { theme } from "./theme";
import { useCourseCatalog } from "./hooks/useCourseCatalog";
import { AuthProvider, ROLES, RequireAuth, RoleHomeRedirect } from "./AuthProvider";
import { SessionDock } from "./PortalHeader";
import { AppUpdater } from "./AppUpdater";
import { PageSkeleton } from "./LoadingSkeletons";

// ---------- Route-level code splitting (named exports → default) ----------
const LandingPage = lazy(() => import("./LandingPage").then((m) => ({ default: m.LandingPage })));
const LoginPage = lazy(() => import("./LoginPage").then((m) => ({ default: m.LoginPage })));
const RegistrationPage = lazy(() => import("./RegistrationPage").then((m) => ({ default: m.RegistrationPage })));
const AboutPage = lazy(() => import("./AboutPage").then((m) => ({ default: m.AboutPage })));
const ForbiddenPage = lazy(() => import("./ForbiddenPage").then((m) => ({ default: m.ForbiddenPage })));
const CourseView = lazy(() => import("./pages/CourseView").then((m) => ({ default: m.CourseView })));
const ProgressPage = lazy(() => import("./pages/ProgressPage").then((m) => ({ default: m.ProgressPage })));
const DatasetCenter = lazy(() => import("./DatasetCenter").then((m) => ({ default: m.DatasetCenter })));
const PracticeCenter = lazy(() => import("./PracticeCenter").then((m) => ({ default: m.PracticeCenter })));
const StudentTrainingCenter = lazy(() => import("./StudentTrainingCenter").then((m) => ({ default: m.StudentTrainingCenter })));
const TeacherCenter = lazy(() => import("./TeacherCenter").then((m) => ({ default: m.TeacherCenter })));
const SchoolAdminCenter = lazy(() => import("./SchoolAdminCenter").then((m) => ({ default: m.SchoolAdminCenter })));
const CdKeyManagement = lazy(() => import("./CdKeyManagement").then((m) => ({ default: m.CdKeyManagement })));
const RuntimeDiagnostics = lazy(() => import("./RuntimeDiagnostics").then((m) => ({ default: m.RuntimeDiagnostics })));

function PageFallback() {
  return <PageSkeleton />;
}

function AppShell() {
  const { catalog, catalogError } = useCourseCatalog();

  if (catalogError) {
    return <ThemeProvider theme={theme}><CssBaseline /><main className="custom-notebook-error"><strong>课程目录加载失败</strong><p>{catalogError}</p></main></ThemeProvider>;
  }
  if (!catalog) {
    return <ThemeProvider theme={theme}><CssBaseline /><PageSkeleton variant="shell" /></ThemeProvider>;
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegistrationPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/runtime-diagnostics" element={<RequireAuth><SessionDock /><RuntimeDiagnostics /></RequireAuth>} />
          <Route path="/forbidden" element={<RequireAuth><ForbiddenPage /></RequireAuth>} />
          <Route path="/course/:chapterId" element={<RequireAuth roles={[ROLES.STUDENT, ROLES.TEACHER]}><CourseView catalog={catalog} /></RequireAuth>} />
          <Route path="/progress" element={<RequireAuth roles={[ROLES.STUDENT]}><SessionDock /><ProgressPage catalog={catalog} /></RequireAuth>} />
          <Route path="/datasets" element={<RequireAuth roles={[ROLES.TEACHER]}><SessionDock /><DatasetCenter variant="teacher" /></RequireAuth>} />
          <Route path="/practice" element={<RequireAuth roles={[ROLES.STUDENT, ROLES.TEACHER]}><SessionDock /><PracticeCenter catalog={catalog} /></RequireAuth>} />
          <Route path="/training" element={<RequireAuth roles={[ROLES.STUDENT]}><SessionDock /><StudentTrainingCenter catalog={catalog} /></RequireAuth>} />
          <Route path="/teaching" element={<RequireAuth roles={[ROLES.TEACHER]}><TeacherCenter /></RequireAuth>} />
          <Route path="/teaching/:section" element={<RequireAuth roles={[ROLES.TEACHER]}><TeacherCenter /></RequireAuth>} />
          <Route path="/school-admin/cdkeys" element={<RequireAuth roles={[ROLES.SCHOOL_ADMIN]}><CdKeyManagement /></RequireAuth>} />
          <Route path="/school-admin" element={<RequireAuth roles={[ROLES.SCHOOL_ADMIN]}><SchoolAdminCenter /></RequireAuth>} />
          <Route path="/school-admin/:section" element={<RequireAuth roles={[ROLES.SCHOOL_ADMIN]}><SchoolAdminCenter /></RequireAuth>} />
          <Route path="/" element={<LandingPage catalog={catalog} />} />
          <Route path="*" element={<RoleHomeRedirect />} />
        </Routes>
      </Suspense>
    </ThemeProvider>
  );
}

createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <AuthProvider>
      <AppUpdater />
      <AppShell />
    </AuthProvider>
  </BrowserRouter>
);
