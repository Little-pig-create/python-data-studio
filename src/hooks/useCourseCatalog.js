import { useState, useEffect } from "react";
import { loadCourseCatalog } from "../courseCatalog";

export function useCourseCatalog({ enabled = true, defer = false } = {}) {
  const [catalog, setCatalog] = useState(null);
  const [catalogError, setCatalogError] = useState("");

  useEffect(() => {
    if (!enabled) return undefined;
    const load = () => loadCourseCatalog().then((nextCatalog) => {
      setCatalog(nextCatalog);
      setCatalogError("");
    }).catch((error) => setCatalogError(error.message || "课程目录加载失败"));
    let idleId;
    let timerId;
    if (defer && typeof window.requestIdleCallback === "function") {
      idleId = window.requestIdleCallback(load, { timeout: 800 });
    } else if (defer) {
      timerId = window.setTimeout(load, 120);
    } else {
      load();
    }
    window.addEventListener("course-catalog-updated", load);
    const syncFromOtherTab = (event) => {
      if (event.key === "python-data-studio:custom-course-chapters:v1") load();
    };
    window.addEventListener("storage", syncFromOtherTab);
    return () => {
      if (idleId != null) window.cancelIdleCallback?.(idleId);
      if (timerId != null) window.clearTimeout(timerId);
      window.removeEventListener("course-catalog-updated", load);
      window.removeEventListener("storage", syncFromOtherTab);
    };
  }, [enabled, defer]);

  return { catalog, catalogError };
}
