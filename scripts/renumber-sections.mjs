#!/usr/bin/env node
// renumber-sections.mjs — 把每个课程 Notebook 的内部小节号 "## N.m" 从"源号"对齐到 catalog 展示号。
// 例：course-chapter-79（展示87）内部 "79.1"→"87.1"；module-intro-numpy（展示16）"15.x"→"16.x"。
// 只改 markdown 标题行的前导编号；不改正文、不改代码、不改顶层 H1/标签/目标。
// 用法：node scripts/renumber-sections.mjs            # dry-run
//       node scripts/renumber-sections.mjs --apply     # 应用并写盘
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const COURSE = "public/course";
const isApply = process.argv.includes("--apply");
const cat = JSON.parse(readFileSync(join(COURSE, "catalog.json"), "utf8"));
const displayByFile = new Map();
for (const e of cat.chapters || []) if (e.path) displayByFile.set(String(e.path).split("/").pop(), Number(e.chapter));

const collect = (dir, into = []) => {
  if (!existsSync(dir)) return into;
  for (const n of readdirSync(dir)) {
    const full = join(dir, n);
    if (n.endsWith(".ipynb")) into.push({ full, base: n });
    else if (n === "module-capstones" && existsSync(full)) for (const s of readdirSync(full)) if (s.endsWith(".ipynb")) into.push({ full: join(full, s), base: s });
  }
  return into;
};

let changeTotal = 0, fileTotal = 0;
const anomalies = [];
for (const { full, base } of collect(COURSE)) {
  const D = displayByFile.get(base);
  if (D == null) continue;
  let nb; try { nb = JSON.parse(readFileSync(full, "utf8")); } catch { continue; }
  // 统计标题里的前导编号
  const tally = new Map();
  for (const c of nb.cells || []) {
    if (c.cell_type !== "markdown") continue;
    for (const line of (c.source || []).join("").split(/\r?\n/)) {
      const m = line.match(/^(#{1,6})\s*(\d+)\.(\d+)\b/);
      if (m) tally.set(Number(m[2]), (tally.get(Number(m[2])) || 0) + 1);
    }
  }
  if (tally.size === 0) continue; // 无编号小节（capstone 等）
  const P = [...tally.entries()].sort((a, b) => b[1] - a[1])[0][0]; // 众数=当前内部前缀
  if (P === D) continue; // 已一致，无改动
  if (tally.size > 1) anomalies.push({ base, D, P, others: [...tally.keys()].filter((k) => k !== P) });

  fileTotal += 1;
  // 计算需改的标题行
  const rewrites = [];
  nb.cells.forEach((c) => {
    if (c.cell_type !== "markdown") return;
    c.source = (c.source || []).map((seg) => seg.split(/(\n)/).map((chunk) => {
      if (chunk === "\n") return chunk;
      const m = chunk.match(/^(#{1,6}\s+)(\d+)\.(\d+)(.*)$/);
      if (m && Number(m[2]) === P) {
        rewrites.push(`${m[2]}.${m[3]} → ${D}.${m[3]}`);
        return `${m[1]}${D}.${m[3]}${m[4]}`;
      }
      return chunk;
    }).join(""));
  });
  if (rewrites.length) {
    changeTotal += rewrites.length;
    if (isApply) writeFileSync(full, JSON.stringify(nb, null, 1) + "\n", "utf8");
    if (!isApply) console.log(`${base}  D=${D} P=${P} 改${rewrites.length}处  例: ${rewrites.slice(0, 2).join(" | ")}`);
  }
}

if (!isApply) {
  console.log(`\n[dry-run] 涉及 ${fileTotal} 个文件，共 ${changeTotal} 处标题编号需改。加 --apply 应用。`);
  if (anomalies.length) { console.log("⚠ 多前缀异常（仅按众数改，另一前缀请留意）："); for (const a of anomalies) console.log(`   ${a.base} D=${a.D} P=${a.P} 其它=${a.others.join(",")}`); }
} else {
  console.log(`已应用：${fileTotal} 个文件，${changeTotal} 处标题编号改为展示号。`);
}
