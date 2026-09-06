#!/usr/bin/env node
// ============================================================
// scan-notebook-content.mjs — 只读扫描课程 Notebook 内部内容的实质问题
//
// 重点（教学设计审阅的 P0/P1 内部内容项）：
//   [assert]   solution/answer/check 等自检 cell 仍用 assert（建议改诊断式 print）
//   [prefill]  exercise cell 已是完整答案（≥3 语句且无 TODO 骨架），学生无需动手
//   [objective] 全 notebook 无显式学习目标（学完本章/本章目标/你将学会…）
//   [import]   局部变量别名（pd/np/plt/sns）在 import 之前就被使用（如 ch95 的 pd）
//
// 用法：
//   node scripts/scan-notebook-content.mjs                  # 打印（默认只读）
//   node scripts/scan-notebook-content.mjs --json           # 输出机器可读 JSON
//   node scripts/scan-notebook-content.mjs --out report.txt # 写入 UTF-8 报告
//
// 只读：绝不修改任何 Notebook。
// ============================================================

import { readFileSync, readdirSync, existsSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const COURSE_DIR = join(ROOT, "public", "course");
const wantJson = process.argv.includes("--json");
const outArg = process.argv.includes("--out") ? process.argv[process.argv.indexOf("--out") + 1] : null;

const SELF_CHECK_TAGS = new Set(["solution", "answer", "check", "teacher-answer"]);
const SOLUTION_PREFIX = "solution-step-";
const EXERCISE_TAG = "exercise";
const OBJECTIVE_RE = /学完本[章节]|本章目标|学习目标|你将学会|学生能够|学完本节|你将能够/;
const SCAFFOLD_RE = /\.\.\.|TODO|#\s*请填|None\s*#|pass\s*#/;

const ALIASES = [
  { key: "pd", useRe: /\bpd\./, importRe: /\bimport\s+pandas\b|\bfrom\s+pandas\b/ },
  { key: "np", useRe: /\bnp\./, importRe: /\bimport\s+numpy\b|\bfrom\s+numpy\b/ },
  { key: "plt", useRe: /\bplt\./, importRe: /\bimport\s+matplotlib\.pyplot\b/ },
  { key: "sns", useRe: /\bsns\./, importRe: /\bimport\s+seaborn\b|\bfrom\s+seaborn\b/ },
  { key: "sk", useRe: /\bsklearn\b|\bKMeans\b|\bSVC\b|\bDecisionTree/, importRe: /\bimport\s+sklearn\b|\bfrom\s+sklearn\b/ }, 
];

const collectIpynb = (dir, into = []) => {
  if (!existsSync(dir)) return into;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (name.endsWith(".ipynb")) into.push({ full, base: name });
    else if (name === "module-capstones" && existsSync(full)) {
      for (const sub of readdirSync(full)) if (sub.endsWith(".ipynb")) into.push({ full: join(full, sub), base: sub });
    }
  }
  return into;
};

const tagList = (cell) => (cell.metadata?.tags || []).map(String);
const isSelfCheck = (tags) => tags.some((t) => SELF_CHECK_TAGS.has(t) || t.startsWith(SOLUTION_PREFIX));
const codeOf = (cell) => (cell.source || []).join("");
const isEmptyCode = (code) => !code.trim();

// 统计"真实语句数"：去掉空行与纯注释
const statementCount = (code) => code.split(/\r?\n/).filter((line) => {
  const t = line.trim();
  return t && !t.startsWith("#") && !/^\s*$/.test(t);
}).length;

const results = { assert: [], prefill: [], objective: [], import: [], stats: { notebooks: 0, cells: 0, selfCheckAssert: 0, exercisePrefill: 0, exercise: 0, noObjective: 0 } };

for (const { full, base } of collectIpynb(COURSE_DIR)) {
  let nb;
  try { nb = JSON.parse(readFileSync(full, "utf8")); } catch { continue; }
  const cells = nb.cells || [];
  results.stats.notebooks += 1;
  results.stats.cells += cells.length;

  let hasObjective = false;
  const importSeen = {};   // key -> minimal index seen
  const useFirst = {};     // key -> minimal use index

  cells.forEach((cell, idx) => {
    const tags = tagList(cell);
    const code = cell.cell_type === "code" ? codeOf(cell) : "";

    // —— assert 自检 ——
    if (cell.cell_type === "code" && isSelfCheck(tags) && /\bassert\b/.test(code)) {
      const assertLine = code.split(/\r?\n/).find((l) => /\bassert\b/.test(l))?.trim() || "";
      results.assert.push({ file: base, cell: idx, tags: tags.join(","), assert: assertLine.slice(0, 120) });
      results.stats.selfCheckAssert += 1;
    }

    // —— exercise 预填答案 ——
    if (cell.cell_type === "code" && tags.includes(EXERCISE_TAG)) {
      results.stats.exercise += 1;
      const stmts = statementCount(code);
      if (stmts >= 3 && !SCAFFOLD_RE.test(code)) {
        results.prefill.push({ file: base, cell: idx, stmts, snippet: code.split(/\r?\n/).find((l) => l.trim() && !l.trim().startsWith("#"))?.trim().slice(0, 100) });
        results.stats.exercisePrefill += 1;
      }
    }

    // —— 学习目标 ——
    if (cell.cell_type === "markdown" && OBJECTIVE_RE.test(codeOf(cell))) {
      const src = codeOf(cell);
      results.objective.push({ file: base, cell: idx, has: true });
    }

    // —— import 顺序（pd/np/plt/sns）——
    if (cell.cell_type === "code") {
      for (const a of ALIASES) {
        if (a.importRe.test(code)) importSeen[a.key] = Math.min(importSeen[a.key] ?? idx, idx);
        if (a.useRe.test(code)) useFirst[a.key] = Math.min(useFirst[a.key] ?? idx, idx);
      }
    }
  });

  if (!results.objective.some((o) => o.file === base)) {
    results.stats.noObjective += 1;
  }

  // 统一收集 import 顺序问题（在本 notebook 层面）
  const nbImports = [];
  for (const a of ALIASES) {
    const importIdx = importSeen[a.key];
    const useIdx = useFirst[a.key];
    if (importIdx === undefined && useIdx !== undefined) {
      nbImports.push({ alias: a.key, detail: `使用了 ${a.key}.* 但全 notebook 未 import` });
    } else if (useIdx !== undefined && importIdx !== undefined && useIdx < importIdx) {
      nbImports.push({ alias: a.key, detail: `cell[${useIdx}] 先用了 ${a.key}.*，cell[${importIdx}] 才 import` });
    }
  }
  for (const info of nbImports) results.import.push({ file: base, ...info });

  // 删掉只用于标记 objective 的容器（保留不必要），改为记录"无目标"的文件
  // 上面已在 stats 计 noObjective，避免重复 —— 这里清空 objective 容器以简化输出。
  results.objective = [];
}

// —— 输出 ——
const buildLines = () => {
  const lines = [];
  const s = results.stats;
  lines.push(`Notebook 内容扫描（只读）`);
  lines.push(`扫描 notebook：${s.notebooks}  单元格：${s.cells}`);
  lines.push(`[assert自检]    ${s.selfCheckAssert} 个自检 cell 用 assert`);
  lines.push(`[预填答案]      ${s.exercisePrefill}/${s.exercise} 个 exercise cell 已是完整答案（无骨架）`);
  lines.push(`[无学习目标]    ${s.noObjective} 个 notebook 缺显式学习目标`);
  lines.push(`[import顺序]    ${results.import.length} 处疑似先使用后 import`);
  lines.push("");
  lines.push("── [assert 自检] 位置 ──");
  for (const r of results.assert) lines.push(`  ${r.file} cell[${r.cell}] tags=${r.tags}  :: ${r.assert}`);
  lines.push("");
  lines.push("── [预填答案] exercise 位置 ──");
  for (const r of results.prefill) lines.push(`  ${r.file} cell[${r.cell}] ${r.stmts}句  :: ${r.snippet}`);
  lines.push("");
  lines.push("── [学习目标] 无该措辞的 notebook 数 ──");
  lines.push(`  （见上方统计 noObjective=${s.noObjective}；逐文件清单见 --json）`);
  lines.push("");
  lines.push("── [import顺序] 疑似问题 ──");
  for (const r of results.import) lines.push(`  ${r.file}  ${r.alias}  :: ${r.detail}`);
  lines.push("");
  lines.push("（只读，未修改任何 Notebok。加 --json 输出机器可读。）");
  return lines.join("\n");
};

if (wantJson) {
  process.stdout.write(JSON.stringify(results, null, 2));
} else {
  const text = buildLines();
  if (outArg) { writeFileSync(join(ROOT, outArg.replace(/^\.\//, "")), text, "utf8"); process.stdout.write(`已写入报告：${outArg}\n`); }
  else process.stdout.write(text + "\n");
}
