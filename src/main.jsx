import "./styles.css";
import { Suspense, lazy, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, useLocation } from "react-router-dom";
import { useCourseCatalog } from "./hooks/useCourseCatalog";
import { loadCourseCatalog } from "./courseCatalog";
import { PageSkeleton } from "./LoadingSkeletons";

const ApplicationShell = lazy(() => import("@pds/application-shell").then((module) => ({ default: module.ApplicationShell })));
const LandingPage = lazy(() => import("./LandingPage").then((module) => ({ default: module.LandingPage })));

function routeNeedsCatalog(pathname) {
  return pathname.startsWith("/course/")
    || ["/progress", "/practice", "/training"].includes(pathname);
}

function RootRoute() {
  const location = useLocation();
  const catalogRequired = routeNeedsCatalog(location.pathname);

  useEffect(() => {
    if (!catalogRequired) return;
    // 与应用外壳并行读取目录，避免“外壳加载完成后才开始取目录”的串行等待。
    void loadCourseCatalog().catch(() => {});
  }, [catalogRequired]);

  if (location.pathname !== "/") return <Suspense fallback={<PageSkeleton />}><ApplicationShell /></Suspense>;
  return <Suspense fallback={<PageSkeleton />}><LandingRoute /></Suspense>;
}

function LandingRoute() {
  const { catalog } = useCourseCatalog({ defer: true });
  return <LandingPage catalog={catalog} />;
}

createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <RootRoute />
  </BrowserRouter>
);
