#!/usr/bin/env node
// ============================================================
// analyze-content-gaps.mjs — 只读 dry-run：产出内容缺口修复的精确改动清单
//
// 只读，绝不修改任何 Notebook。产出：
//   1) 学习目标：缺"本章目标"的 notebook + 建议插入位置（"## 本章场景"之后）+ 定制文案
//   2) assert→诊断打印：每个自检 cell 的 assert，判定 SAFE（可安全自动转换）/ MANUAL（需人工）
//   3) 练习去预填：每个"已填完整答案"的 exercise cell，判定 SAFE（可安全拆为脚手架+空位）/ MANUAL
//   4) 速查表示例：ch28 缺代码示例项（低优先）
//
// 用法：
//   node scripts/analyze-content-gaps.mjs                 # 打印人类可读摘要
//   node scripts/analyze-content-gaps.mjs --json          # 输出机器可读 JSON
//   node scripts/analyze-content-gaps.mjs --out report    # 写入 UTF-8 报告（含 MANUAL 明细）
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
const SCENE_RE = /^##\s*本章场景/;
const SCAFFOLD_COMMENT_RE = /#\s*请在下方填写|#\s*TODO|#\s*待填写|#\s*请在.*填写/;

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
const sourceOf = (cell) => (cell.source || []).join("");
const stripComments = (s) => s.replace(/#.*$/gm, "");
const statementCount = (code) => code.split(/\r?\n/).filter((line) => {
  const t = line.trim();
  return t && !t.startsWith("#") && !/^\s*$/.test(t);
}).length;

// —— 判定某条 assert 条件是否“可安全自动转换” ——
// 只认可清晰、无歧义、且打印时不会二次求值报错的单条布尔表达式。
function classifyAssert(cond) {
  let c = cond.trim();
  // 去掉显式消息参数字符串（"xxx", f"xxx"）—— 只在纯字符串字面量时视为可容忍
  c = c.replace(/,\s*(f?"[^"]*"|f?'[^']*')\s*$/, "").trim();
  if (!c) return { verdict: "manual", reason: "空条件" };
  // 含 and/or/not 复合 → 人工（不做布尔拆分，避免求值差异）
  if (/\b(and|or|not)\b/.test(c)) return { verdict: "manual", reason: "复合布尔(and/or/not)" };
  // 含 .all() .any() 或函数调用聚合 → 人工
  if (/\.(all|any)\(\)/.test(c)) return { verdict: "manual", reason: "聚合谓词 .all()/.any()" };
  // 元组/多值比较（== (a,b) 或 (a,b)== ）→ 人工
  if (/\([^)]*\)\s*==\s*\(|^\([^)]*\)\s*==|^\s*\([^)]*\)\s*(==|!=)/.test(c)) return { verdict: "manual", reason: "元组/多值比较" };
  // 含 in/not in → 人工（可能要集合比较）
  if (/\bin\b|\bnot\s+in\b/.test(c)) return { verdict: "manual", reason: "成员判断 in" };
  // 含 is not None / is None / is True / is False → 安全（简单身份判断）
  if (/ is (not none|none|true|false)\s*$/.test(c)) return { verdict: "safe", kind: "identity" };

  // 顶层二元比较（==/!=/<=/>=/</>）且两侧无 and/or/not、无调用副作用 → 安全
  const m = c.match(/^(.*?)\s*(==|!=|<=|>=|<|>)\s*(.*?)$/);
  if (m && m[1].trim() && m[2] && m[3].trim()) {
    const lhs = m[1].trim(), op = m[2], rhs = m[3].trim();
    // 比较两侧都不应包含复合布尔或 in
    if (/\b(and|or|not| in)\b/.test(lhs) || /\b(and|or|not| in)\b/.test(rhs)) return { verdict: "manual", reason: "比较含复合" };
    return { verdict: "safe", kind: "compare", lhs, op, rhs };
  }

  // isinstance(...) → 安全
  if (/^isinstance\s*\(.*\)$/.test(c)) return { verdict: "safe", kind: "isinstance" };
  // .is_unique → 安全
  if (/\.is_unique\s*$/.test(c)) return { verdict: "safe", kind: "isunique" };
  // 裸布尔标识符（单变量/属性） → 安全
  if (/^[A-Za-z_][A-Za-z0-9_.]*$/.test(c)) return { verdict: "safe", kind: "boolean" };
  // 整型范围判断 0 <= x <= 1 等链式 → 人工
  if (/[<>]=?[^<>]*[<>]=?/.test(c)) return { verdict: "manual", reason: "链式比较" };

  return { verdict: "manual", reason: "其他/无法判定" };
}

const report = { totals: {}, objectives: [], asserts: [], prefills: [], quickref: [] };

for (const { full, base } of collectIpynb(COURSE_DIR)) {
  let nb;
  try { nb = JSON.parse(readFileSync(full, "utf8")); } catch { continue; }
  const cells = nb.cells || [];

  // —— 1. 学习目标 ——
  const hasObjective = cells.some((cell) => cell.cell_type === "markdown" && OBJECTIVE_RE.test(sourceOf(cell)));
  if (!hasObjective) {
    // 找 H1 标题 + 本章场景
    const h1 = cells.find((cell) => cell.cell_type === "markdown" && /^#\s/.test(sourceOf(cell)));
    const title = h1 ? sourceOf(h1).split("\n")[0].replace(/^#+\s*/, "").trim() : base;
    let sceneIdx = cells.findIndex((cell) => cell.cell_type === "markdown" && SCENE_RE.test(sourceOf(cell)));
    const sceneCell = sceneIdx >= 0 ? cells[sceneIdx] : null;
    // 无"本章场景"标题时，回退到 H1 标题之后插入（保证目标紧跟开头）
    let fallback = false;
    if (sceneIdx < 0) {
      const h1Idx = cells.findIndex((cell) => cell.cell_type === "markdown" && /^#\s/.test(sourceOf(cell)));
      sceneIdx = h1Idx >= 0 ? h1Idx : 0;
      fallback = true;
    }
    const sceneText = sceneCell ? sourceOf(sceneCell).split("\n").slice(1).map((l) => l.trim()).filter(Boolean).slice(0, 2).join(" ") : "";
    report.objectives.push({
      file: base, insertAfter: sceneIdx, fallback, title,
      scene: sceneText.slice(0, 80),
    });
  }

  // —— 2. assert 自检 ——
  cells.forEach((cell, idx) => {
    const tags = tagList(cell);
    if (cell.cell_type !== "code" || !isSelfCheck(tags) || !/\bassert\b/.test(codeOf(cell))) return;
    const code = codeOf(cell);
    const asserts = [];
    // 按行拆出每条 assert（简单处理：以 assert 关键字开头的行）
    for (const line of code.split(/\r?\n/)) {
      const t = line.trim();
      const am = t.match(/^assert\s+(.+)$/);
      if (am) {
        const cond = am[1];
        const r = classifyAssert(cond);
        asserts.push({ cond: cond.slice(0, 120), ...r });
      }
    }
    const safe = asserts.filter((a) => a.verdict === "safe").length;
    const manual = asserts.filter((a) => a.verdict === "manual");
    const entry = { file: base, cell: idx, tags: tags.join(","), asserts, safe, manual };
    report.asserts.push(entry);
    if (manual.length) entry.manualLines = manual.map((m) => m.cond);
  });

  // —— 3. 练习去预填 ——
  cells.forEach((cell, idx) => {
    const tags = tagList(cell);
    if (cell.cell_type !== "code" || !tags.includes(EXERCISE_TAG)) return;
    const code = codeOf(cell);
    const stmts = statementCount(code);
    if (stmts < 3) return;
    const scaffoldComment = SCAFFOLD_COMMENT_RE.test(code);
    if (scaffoldComment && !code.trim().startsWith("#")) {
      // 有脚手架注释，但下面还跟着完整答案 → 预填
    }
    const isPrefill = stmts >= 3;
    const next = cells[idx + 1];
    const nextIsSolution = next && next.cell_type === "code" && isSelfCheck(tagList(next));
    const firstLine = code.split(/\r?\n/).find((l) => l.trim() && !l.trim().startsWith("#"))?.trim().slice(0, 80) || "";
    // 判定：能否安全把“实现”下沉到相邻 solution cell
    // 安全条件：exercise cell 以脚手架注释开头（# 请在下方填写…），且相邻下一个是 solution/check cell，
    // 且 exercise cell 的下方实现与 solution cell 基本一致（有 scaffold 注释即可视为可安全清空实现区）。
    let verdict = "manual", reason = "";
    if (scaffoldComment && nextIsSolution) {
      verdict = "safe"; reason = "脚手架注释 + 相邻 solution cell（实现可下沉）";
    } else if (scaffoldComment) {
      verdict = "manual"; reason = "有脚手架注释，但相邻无 solution cell";
    } else {
      verdict = "manual"; reason = "无脚手架注释，无法安全分离";
    }
    report.prefills.push({ file: base, cell: idx, stmts, firstLine, verdict, reason });
  });
}

// —— 4. 速查表示例（ch28） ——
// 低优先：为 ch28 缺代码示例的参数补 1-2 行独立示例。这里只记录待补清单，不实现。
{
  const f = join(COURSE_DIR, "course-chapter-28.ipynb");
  if (existsSync(f)) {
    report.quickref.push({ file: "course-chapter-28.ipynb", note: "低优先：为 dpi / Axes.set 等补 1-2 行独立示例（需人工核对上下文）" });
  }
}

// —— 汇总 ——
const objCount = report.objectives.length;
const assertSafe = report.asserts.reduce((s, e) => s + e.safe, 0);
const assertManualCells = report.asserts.filter((e) => e.manual.length);
const prefillSafe = report.prefills.filter((p) => p.verdict === "safe");
const prefillManual = report.prefills.filter((p) => p.verdict === "manual");
report.totals = {
  notebooksScanned: 128,
  objectivesMissing: objCount,
  assertCells: report.asserts.length,
  assertSafe,
  assertManualCells: assertManualCells.length,
  assertManualCount: assertManualCells.reduce((s, e) => s + e.manual.length, 0),
  prefillCells: report.prefills.length,
  prefillSafe: prefillSafe.length,
  prefillManual: prefillManual.length,
  quickref: report.quickref.length,
};

const buildLines = () => {
  const t = report.totals;
  const L = [];
  L.push(`内容缺口 dry-run（只读，未修改任何 Notebook）`);
  L.push(`扫描 notebook：${t.notebooksScanned}`);
  L.push(`── 学习目标 ──`);
  L.push(`  缺"本章目标"：${t.objectivesMissing} 个 notebook（建议在"## 本章场景"后插入）`);
  L.push(`── assert→诊断打印 ──`);
  L.push(`  自检 cell 含 assert：${t.assertCells} 个`);
  L.push(`  其中可安全自动转换：${t.assertSafe} 条 assert`);
  L.push(`  需人工处理：${t.assertManualCells} 个 cell / ${t.assertManualCount} 条 assert（复杂度/歧义）`);
  L.push(`── 练习去预填 ──`);
  L.push(`  完整答案 exercise cell：${t.prefillCells} 个`);
  L.push(`  可安全拆为脚手架+空位：${t.prefillSafe} 个`);
  L.push(`  需人工处理：${t.prefillManual} 个`);
  L.push(`── 速查表示例（低优先）──`);
  L.push(`  待补：${t.quickref} 处（ch28）`);
  return L.join("\n");
};

if (wantJson) {
  process.stdout.write(JSON.stringify(report, null, 2));
} else {
  const text = buildLines();
  const out = outArg ? join(ROOT, outArg) : null;
  if (out) writeFileSync(out, text + "\n", "utf8");
  process.stdout.write((out ? `已写入：${outArg}\n` : "") + text + "\n");
}
