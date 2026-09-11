// 测试夹具：从真实的课程 notebook 读取内容，让测试跑在真实数据上。

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
export const repoRoot = join(here, "..", "..");

/** 读取 catalog.json（课程目录，权威内容清单）。 */
export function readCatalog() {
  return JSON.parse(
    readFileSync(join(repoRoot, "public", "course", "catalog.json"), "utf8"),
  );
}

/** 按章节 id 读取对应的 notebook 原始 JSON。 */
export function parseNotebookSource(chapterId) {
  const catalog = readCatalog();
  const entry = catalog.chapters.find((item) => item.id === chapterId);
  if (!entry) return null;
  return JSON.parse(readFileSync(join(repoRoot, "public", entry.path), "utf8"));
}

/** 返回全部章节 id，便于参数化测试。 */
export function allChapterIds() {
  return readCatalog().chapters.map((item) => item.id);
}
