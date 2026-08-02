import { useState, useEffect } from "react";
import { loadCourseCatalog } from "../courseCatalog";

export function useCourseCatalog() {
  const [catalog, setCatalog] = useState(null);
  const [catalogError, setCatalogError] = useState("");

  useEffect(() => {
    const load = () => loadCourseCatalog().then(setCatalog).catch((error) => setCatalogError(error.message || "课程目录加载失败"));
    load();
    window.addEventListener("course-catalog-updated", load);
    const syncFromOtherTab = (event) => {
      if (event.key === "python-data-studio:custom-course-chapters:v1") load();
    };
    window.addEventListener("storage", syncFromOtherTab);
    return () => {
      window.removeEventListener("course-catalog-updated", load);
      window.removeEventListener("storage", syncFromOtherTab);
    };
  }, []);

  return { catalog, catalogError };
}
