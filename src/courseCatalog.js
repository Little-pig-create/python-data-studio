const catalogUrl = "/course/catalog.json";
export const CUSTOM_COURSE_CHAPTERS_KEY = "python-data-studio:custom-course-chapters:v1";

// 目录在一次会话内几乎不变；旧实现用 `cache: "no-store"` + 时间戳参数，
// 导致**每次导航都重新下载约 50 KB**。这里加两层加速：
//   1) in-flight 去重：并发调用只发一次请求
//   2) 会话内缓存：60 秒内直接复用（`force` 可绕过）
// 目录更新（build:course 后）通过 window 事件 "course-catalog-updated" 主动失效。
const CATALOG_TTL_MS = 60_000;
let cachedCatalog = null;
let cachedAt = 0;
let inFlight = null;

function readCustomChapterMetadata() {
  try {
    const value = JSON.parse(window.localStorage?.getItem(CUSTOM_COURSE_CHAPTERS_KEY) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

/** 使会话缓存失效（目录更新后调用）。 */
export function invalidateCourseCatalog() {
  cachedCatalog = null;
  cachedAt = 0;
  inFlight = null;
}

export async function loadCourseCatalog({ force = false } = {}) {
  const now = Date.now();
  if (!force && cachedCatalog && now - cachedAt < CATALOG_TTL_MS) {
    return cachedCatalog;
  }
  // in-flight 去重对所有调用生效（含 force）：并发请求同一份目录没有意义，
  // 只会浪费带宽。force 的作用是"不要用缓存结果"，而不是"重复发请求"。
  if (inFlight) return inFlight;

  const request = (async () => {
    const response = await fetch(catalogUrl, { cache: "default" });
    if (!response.ok) throw new Error(`课程目录加载失败（${response.status}）`);
    const catalog = await response.json();
    if (!Array.isArray(catalog.modules) || !Array.isArray(catalog.chapters) || !catalog.chapters.length) {
      throw new Error("课程目录格式无效");
    }
    const merged = await mergeCustomChapters(catalog);
    cachedCatalog = merged;
    cachedAt = Date.now();
    return merged;
  })();

  inFlight = request;
  try {
    return await request;
  } finally {
    // 只清理由本次调用建立的 in-flight 标记，避免并发场景互相覆盖。
    if (inFlight === request) inFlight = null;
  }
}

async function mergeCustomChapters(catalog) {
  const publishedMetadata = readCustomChapterMetadata().filter((item) => item.status === "published" );
  if (!publishedMetadata.length) return catalog;
  const { listCustomNotebooks } = await import("./notebookRepository");
  const customNotebookRecords = await listCustomNotebooks().catch(() => []);
  const customNotebookIds = new Set(customNotebookRecords.filter((record) => record?.notebook).map((record) => record.id || record.metadata?.id));
  const customChapters = publishedMetadata.filter((item) => customNotebookIds.has(item.customNotebookId || item.id));
  if (!customChapters.length) return catalog;
  const nextCatalog = {
    ...catalog,
    version: Number(catalog.version || 1) + 1,
    chapters: [...catalog.chapters, ...customChapters].sort((a, b) => Number(a.sortOrder ?? a.chapter ?? 0) - Number(b.sortOrder ?? b.chapter ?? 0)),
    modules: catalog.modules.map((module) => {
      const moduleChapters = customChapters.filter((item) => item.module === module.id);
      if (!moduleChapters.length) return module;
      const allChapters = catalog.chapters.filter((item) => item.module === module.id).concat(moduleChapters);
      const numbers = allChapters.map((item) => Number(item.chapter)).filter(Number.isFinite);
      return { ...module, range: numbers.length ? `第${Math.min(...numbers)}–${Math.max(...numbers)}章` : module.range };
    })
  };
  return nextCatalog;
}

export const chapterById = (chapters, id) => chapters.find((item) => item.id === id) || chapters[0];
