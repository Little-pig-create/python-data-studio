import { useCallback, useEffect, useRef, useState } from "react";
import { invalidateCourseCatalog, loadCourseCatalog } from "../courseCatalog";

export function useCourseCatalog({ enabled = true, defer = false } = {}) {
  const [catalog, setCatalog] = useState(null);
  const [catalogError, setCatalogError] = useState("");
  // 保存最新的 load 引用，供 reload 与事件监听复用，避免重复定义。
  const loadRef = useRef(null);

  const load = useCallback((options) => loadCourseCatalog(options).then((nextCatalog) => {
    setCatalog(nextCatalog);
    setCatalogError("");
  }).catch((error) => setCatalogError(error.message || "课程目录加载失败")), []);

  loadRef.current = load;

  useEffect(() => {
    if (!enabled) return undefined;
    let idleId;
    let timerId;
    if (defer && typeof window.requestIdleCallback === "function") {
      idleId = window.requestIdleCallback(load, { timeout: 800 });
    } else if (defer) {
      timerId = window.setTimeout(load, 120);
    } else {
      load();
    }
    // 目录更新事件必须绕过会话缓存，否则会读到旧的 60 秒快照。
    const refresh = () => {
      invalidateCourseCatalog();
      load({ force: true });
    };
    window.addEventListener("course-catalog-updated", refresh);
    const syncFromOtherTab = (event) => {
      if (event.key === "python-data-studio:custom-course-chapters:v1") refresh();
    };
    window.addEventListener("storage", syncFromOtherTab);
    return () => {
      if (idleId != null) window.cancelIdleCallback?.(idleId);
      if (timerId != null) window.clearTimeout(timerId);
      window.removeEventListener("course-catalog-updated", refresh);
      window.removeEventListener("storage", syncFromOtherTab);
    };
  }, [enabled, defer, load]);

  // 供页面在"加载失败/内容为空"时手动重试（绕过缓存）。
  const reloadCatalog = useCallback(() => {
    setCatalogError("");
    invalidateCourseCatalog();
    return load({ force: true });
  }, [load]);

  return { catalog, catalogError, reloadCatalog };
}
