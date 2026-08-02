/**
 * sync-catalog.mjs
 *
 * 扫描 public/course/course-chapter-*.ipynb，根据文件内容（优先）
 * 和 src/data.js 的章节表（兜底），重新生成 public/course/catalog.json。
 *
 * 用法：
 *   node scripts/sync-catalog.mjs          # 扫描 + 生成
 *   node scripts/sync-catalog.mjs --dry-run # 只打印，不写入
 *
 * Notebook 元数据覆盖规则（在 notebook.metadata 中设置）：
 *   chapter_title       字符串   → 章节标题（覆盖 data.js）
 *   chapter_module      字符串   → 模块 ID（覆盖 data.js 推断）
 *   chapter_kind        字符串   → "lesson" | "project"（默认 lesson）
 *   estimated_minutes   数字     → 预计学习时长（分钟）
 *   tags                数组     → 标签列表
 *   difficulty          字符串   → 难度标注
 *   description         字符串   → 章节简介
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chapters as dataChapters, modules as dataModules } from "../src/data.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const courseDir = path.join(root, "public", "course");
const catalogPath = path.join(courseDir, "catalog.json");
const isDryRun = process.argv.includes("--dry-run");

// ── 章节号 → data.js 元数据的快速查表 ────────────────────────────────────────
const dataByChapter = new Map(dataChapters.map((c) => [c.chapter, c]));

// ── 扫描 public/course/ 目录 ──────────────────────────────────────────────────
// 普通章节使用 course-chapter-{n}.ipynb；模块大作业使用
// module-capstones/*.ipynb，并通过 Notebook metadata 插入到所属模块末尾。
const chapterFiles = fs.readdirSync(courseDir)
  .filter((name) => /^course-chapter-(\d+)\.ipynb$/.test(name))
  .map((name) => {
    const chapter = parseInt(name.match(/^course-chapter-(\d+)\.ipynb$/)[1], 10);
    return { name, chapter, sortOrder: chapter, filePath: path.join(courseDir, name), isCapstone: false };
  });
const extraFiles = fs.readdirSync(courseDir)
  .filter((name) => /^course-extra-.+\.ipynb$/.test(name))
  .map((name) => ({ name, filePath: path.join(courseDir, name), relativePath: name, isCapstone: false, isExtra: true }));
const capstoneDir = path.join(courseDir, "module-capstones");
const capstoneFiles = fs.existsSync(capstoneDir)
  ? fs.readdirSync(capstoneDir)
    .filter((name) => name.endsWith(".ipynb"))
    .map((name) => ({ name, filePath: path.join(capstoneDir, name), relativePath: `module-capstones/${name}`, isCapstone: true }))
  : [];
const ipynbFiles = [...chapterFiles, ...extraFiles, ...capstoneFiles];

if (!ipynbFiles.length) {
  console.error("❌ 未找到课程 Notebook 文件，请先把 Notebook 放入 public/course/");
  process.exit(1);
}

// ── 解析每个 notebook，提取元数据 ────────────────────────────────────────────
function readNotebookMeta(filePath) {
  try {
    const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return raw?.metadata || {};
  } catch {
    return {};
  }
}

function hasCode(filePath) {
  try {
    const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return (raw?.cells || []).some((cell) => (cell.cell_type || cell.type) === "code");
  } catch {
    return false;
  }
}

// ── 模块 range 重新计算 ───────────────────────────────────────────────────────
function computeModuleRanges(chapters) {
  const ranges = new Map();
  for (const ch of chapters) {
    if (!ranges.has(ch.module)) ranges.set(ch.module, { min: ch.chapter, max: ch.chapter });
    const r = ranges.get(ch.module);
    if (ch.chapter < r.min) r.min = ch.chapter;
    if (ch.chapter > r.max) r.max = ch.chapter;
  }
  return ranges;
}

// ── 构建章节列表 ──────────────────────────────────────────────────────────────
const builtChapters = ipynbFiles.map(({ name, chapter, sortOrder, filePath, relativePath, isCapstone }) => {
  const nbMeta = readNotebookMeta(filePath);
  const fallback = dataByChapter.get(chapter);
  const resolvedChapter = Number(nbMeta.chapter ?? chapter ?? 0);
  const resolvedSortOrder = Number(nbMeta.sort_order ?? sortOrder ?? resolvedChapter);
  const title = nbMeta.chapter_title || fallback?.title || (isCapstone ? "模块大作业" : `第${resolvedChapter}章`);
  const module = nbMeta.chapter_module || fallback?.module || "python";
  const kind = nbMeta.chapter_kind || fallback?.kind || "lesson";
  const estimatedMinutes = Number(nbMeta.estimated_minutes) || fallback?.estimatedMinutes || 45;
  const tags = Array.isArray(nbMeta.tags) ? nbMeta.tags : (fallback?.tags || []);
  const difficulty = nbMeta.difficulty || fallback?.difficulty || undefined;
  const description = nbMeta.description || fallback?.description || undefined;
  const id = nbMeta.course_id || `chapter-${resolvedChapter}`;
  const label = nbMeta.chapter_label || (isCapstone ? title : `第${resolvedChapter}章 ${title}`);
  const entry = {
    id,
    chapter: resolvedChapter,
    sortOrder: resolvedSortOrder,
    title,
    label,
    module,
    path: `/course/${relativePath || name}`,
    kind,
    estimatedMinutes,
    hasCode: hasCode(filePath),
    tags,
  };
  if (difficulty) entry.difficulty = difficulty;
  if (description) entry.description = description;
  return entry;
}).sort((a, b) => a.sortOrder - b.sortOrder);

// ── 构建模块列表（保留原始颜色，更新 range）────────────────────────────────────
const ranges = computeModuleRanges(builtChapters);
const builtModules = dataModules.map((mod) => {
  const r = ranges.get(mod.id);
  if (!r) return mod;
  const rangeStr = r.min === r.max ? `第${r.min}章` : `第${r.min}–${r.max}章`;
  return { ...mod, range: rangeStr };
});

// ── 读取旧 catalog 版本号 ─────────────────────────────────────────────────────
let oldVersion = 0;
try {
  oldVersion = JSON.parse(fs.readFileSync(catalogPath, "utf8"))?.version || 0;
} catch { /* 文件不存在时忽略 */ }

const catalog = {
  version: oldVersion + 1,
  modules: builtModules,
  chapters: builtChapters,
};

// ── 输出 ──────────────────────────────────────────────────────────────────────
const output = JSON.stringify(catalog, null, 2);

if (isDryRun) {
  console.log("── DRY RUN：以下是生成的 catalog.json 片段 ──\n");
  console.log(JSON.stringify({ version: catalog.version, chapters: catalog.chapters.slice(0, 3) }, null, 2));
  console.log(`\n共 ${builtChapters.length} 个章节，跨 ${builtModules.filter((m) => ranges.has(m.id)).length} 个模块`);
} else {
  fs.writeFileSync(catalogPath, output, "utf8");
  console.log(`✅ catalog.json 已更新 (v${catalog.version})：${builtChapters.length} 个章节`);
  builtModules.forEach((mod) => {
    const count = builtChapters.filter((ch) => ch.module === mod.id).length;
    if (count) console.log(`   ${mod.label.padEnd(16)} ${count} 章`);
  });
  console.log(`\n📁 文件路径：${catalogPath}`);
}
