import "./styles.css";
import { Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, useLocation } from "react-router-dom";
import { useCourseCatalog } from "./hooks/useCourseCatalog";
import { PageSkeleton } from "./LoadingSkeletons";
import { LandingPage } from "./LandingPage";

const ApplicationShell = lazy(() => import("@pds/application-shell").then((module) => ({ default: module.ApplicationShell })));

function RootRoute() {
  const location = useLocation();
  if (location.pathname !== "/") return <Suspense fallback={<PageSkeleton />}><ApplicationShell /></Suspense>;
  return <LandingRoute />;
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
