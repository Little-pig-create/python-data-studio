import { listCustomNotebooks } from "./notebookRepository";

const catalogUrl = "/course/catalog.json";
export const CUSTOM_COURSE_CHAPTERS_KEY = "python-data-studio:custom-course-chapters:v1";

function readCustomChapterMetadata() {
  try {
    const value = JSON.parse(window.localStorage?.getItem(CUSTOM_COURSE_CHAPTERS_KEY) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export async function loadCourseCatalog() {
  const response = await fetch(catalogUrl, { cache: "no-store" });
  if (!response.ok) throw new Error(`课程目录加载失败（${response.status}）`);
  const catalog = await response.json();
  if (!Array.isArray(catalog.modules) || !Array.isArray(catalog.chapters) || !catalog.chapters.length) {
    throw new Error("课程目录格式无效");
  }
  const publishedMetadata = readCustomChapterMetadata().filter((item) => item.status === "published" );
  const customNotebookRecords = await listCustomNotebooks().catch(() => []);
  const customNotebookIds = new Set(customNotebookRecords.filter((record) => record?.notebook).map((record) => record.id || record.metadata?.id));
  const customChapters = publishedMetadata.filter((item) => customNotebookIds.has(item.customNotebookId || item.id));
  if (!customChapters.length) return catalog;
  const nextCatalog = {
    ...catalog,
    version: Number(catalog.version || 1) + 1,
    chapters: [...catalog.chapters, ...customChapters].sort((a, b) => Number(a.chapter || 0) - Number(b.chapter || 0)),
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
