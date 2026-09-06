#!/usr/bin/env node
// ============================================================
// reconcile-chapter-numbers.mjs — 只读对照 / 可选重排课程 Notebook 内部编号
//
// 把每个课程 Notebook 的内部编号（首标题 H1 的章号、metadata.course 的
// chapter/title/module/file_name）对齐到 catalog.json 的"展示章号"（单一权威源，
// 即侧边栏显示的序号）。
//
// 用法：
//   node scripts/reconcile-chapter-numbers.mjs             # 只读：打印差异清单（默认）
//   node scripts/reconcile-chapter-numbers.mjs --apply      # 应用：改写 Notebook 并写盘
//   node scripts/reconcile-chapter-numbers.mjs --json       # 只读：输出机器可读 JSON
//
// 说明：
//   - 只处理 catalog.json 中登记到的路径。
//   - 只改：metadata.course 的 chapter/title/module/file_name，并替换首标题的章号前缀。
//   - 不改正文里的交叉引用（如"见第X章"/"chapter-X"），只在报告中列出供人工复核。
//   - 默认 dry-run，不动任何文件。
// ============================================================

import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const COURSE_DIR = join(ROOT, "public", "course");
const CATALOG_PATH = join(COURSE_DIR, "catalog.json");
const isApply = process.argv.includes("--apply");
const wantJson = process.argv.includes("--json");

const catalog = JSON.parse(readFileSync(CATALOG_PATH, "utf8"));
const entries = catalog.chapters || catalog.items || [];

// 权威映射：path 的 basename → { chapter, title, module, kind }
const authority = new Map();
for (const entry of entries) {
  if (!entry.path) continue;
  const base = String(entry.path).split("/").pop();
  authority.set(base, {
    chapter: Number(entry.chapter),
    title: String(entry.title || ""),
    module: String(entry.module || ""),
    kind: String(entry.kind || ""),
    label: String(entry.label || ""),
  });
}

// 收集所有 .ipynb（含 module-intro / module-capstones / 命名章节）
function collectIpynb(dir, into = []) {
  if (!existsSync(dir)) return into;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (name.endsWith(".ipynb")) into.push({ full, base: name });
    else if (name === "module-capstones" && existsSync(full)) {
      for (const sub of readdirSync(full)) if (sub.endsWith(".ipynb")) into.push({ full: join(full, sub), base: sub });
    }
  }
  return into;
}

const files = collectIpynb(COURSE_DIR);

function firstHeading(nb) {
  for (const cell of nb.cells || []) {
    if (cell.cell_type !== "markdown") continue;
    const src = (cell.source || []).join("");
    for (const line of src.split(/\r?\n/)) {
      if (/^#+/.test(line)) return { cell, line };
    }
  }
  return null;
}
const headingNumber = (line) => line.match(/^#+\s*(\d+\.?)?/)?.[1]?.replace(/\.$/, "") || null;

const changes = [];
const crossRefs = [];

for (const { full, base } of files) {
  const auth = authority.get(base);
  if (!auth) continue;
  let nb;
  try { nb = JSON.parse(readFileSync(full, "utf8")); } catch { continue; }
  const course = nb.metadata?.course || {};
  const curChapter = Number(course.chapter ?? NaN);
  const curTitle = String(course.title || "");
  const curModule = String(course.module || "");
  const curFileName = String(course.file_name || "");
  const hd = firstHeading(nb);
  const h1Num = hd ? headingNumber(hd.line) : null;

  const diffs = [];
  if (curChapter !== auth.chapter) diffs.push(`chapter ${curChapter} → ${auth.chapter}`);
  if (curTitle && curTitle !== auth.title) diffs.push(`title → ${auth.title}`);
  if (curModule && curModule !== auth.module) diffs.push(`module ${curModule} → ${auth.module}`);
  if (curFileName && curFileName !== base) diffs.push(`file_name ${curFileName} → ${base}`);
  if (hd && h1Num && h1Num !== String(auth.chapter)) diffs.push(`H1 ${h1Num} → ${auth.chapter}`);

  if (diffs.length) {
    changes.push({
      file: base,
      chapter: auth.chapter,
      title: auth.title,
      module: auth.module,
      currentH1: hd ? hd.line.trim() : null,
      currentCourseChapter: Number.isFinite(curChapter) ? curChapter : null,
      currentFileName: curFileName || null,
      diffs,
    });
  }

  const text = JSON.stringify((nb.cells || []).map((c) => (c.source || []).join("")) || []);
  const refs = [...new Set([...text.matchAll(/第\s*(\d+)\s*章/g)].map((m) => m[0]))];
  if (refs.length) crossRefs.push({ file: base, refs: refs.slice(0, 8) });
}

if (wantJson) {
  process.stdout.write(JSON.stringify({ authoritySize: authority.size, files: files.length, changes, crossRefs }, null, 2));
  process.exit(0);
}

console.log(`权威源：catalog.json（${authority.size} 个登记项）  扫描文件：${files.length}`);
console.log(`待校正 Notebook：${changes.length}   含交叉引用提示：${crossRefs.length}\n`);

if (isApply) {
  // 真实路径表：basename → 完整路径（覆盖 module-capstones/ 子目录）
  const fullByBase = new Map(files.map((f) => [f.base, f.full]));
  let wrote = 0;
  for (const item of changes) {
    const full = fullByBase.get(item.file);
    if (!full || !existsSync(full)) { console.log(`  !! 未找到 ${item.file}，跳过`); continue; }
    const nb = JSON.parse(readFileSync(full, "utf8"));
    const course = nb.metadata.course || (nb.metadata.course = {});
    course.chapter = item.chapter;
    course.title = item.title;
    if (item.module) course.module = item.module;
    course.file_name = item.file;
    // 替换首标题的章号前缀（只改"# N. "这类前缀，不动文案）
    const hd = firstHeading(nb);
    if (hd) {
      hd.cell.source = hd.cell.source.map((seg) => seg.replace(/^#+\s*\d+\.\s*/, `# ${item.chapter}. `));
    }
    writeFileSync(full, JSON.stringify(nb, null, 1) + "\n", "utf8");
    wrote += 1;
    console.log(`  ✓ ${item.file}  (chapter→${item.chapter}, title→${item.title}, file_name→${item.file})`);
  }
  console.log(`\n已应用 ${wrote} 个文件。`);
} else {
  console.log("【dry-run】以下为待校正项（改 metadata.course + 首标题编号前缀）。\n");
  for (const item of changes) {
    console.log(`● ${item.file}`);
    console.log(`   目录：第${item.chapter}章 ${item.title}`);
    console.log(`   当前：H1="${item.currentH1 ?? "(无标题)"}"  course.chapter=${item.currentCourseChapter ?? "(缺)"}  file_name=${item.currentFileName ?? "(缺)"}`);
    console.log(`   需改：${item.diffs.join("；")}\n`);
  }
  console.log(`◇ 含"第N章"交叉引用的文件（未自动改，人工复核）：`);
  for (const item of crossRefs) console.log(`   ${item.file}: ${item.refs.join(" ")}`);
  console.log(`\n（只读，未写文件。加 --apply 应用；加 --json 输出机器可读。）`);
}
