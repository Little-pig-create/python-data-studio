#!/usr/bin/env node
// format-gap-detail.mjs — 读 .tmp-content-gaps.json，生成详细 dry-run 报告文件
import { readFileSync, writeFileSync } from "node:fs";
const r = JSON.parse(readFileSync(".tmp-content-gaps.json", "utf8"));
const L = [];
L.push("# 教学内容缺口 dry-run 报告（只读，未改任何文件）");
L.push("");
L.push("权威源：public/course/（128 个 notebook）");
L.push("");
L.push("## 汇总");
L.push("- 缺\"本章目标\"：" + r.totals.objectivesMissing + " 个 notebook");
L.push("- assert 自检 cell：" + r.totals.assertCells + " 个；可安全转换 " + r.totals.assertSafe + " 条；需人工 " + r.totals.assertManualCells + " cell / " + r.totals.assertManualCount + " 条");
L.push("- 完整答案 exercise cell：" + r.totals.prefillCells + " 个；可安全去预填 " + r.totals.prefillSafe + "；需人工 " + r.totals.prefillManual);
L.push("- 速查表示例（ch28，低优先）：" + r.totals.quickref + " 处");
L.push("");
L.push("## 断言需人工处理（复杂/歧义，绝不自动改）");
for (const e of r.asserts.filter((e) => e.manual.length)) {
  L.push("- " + e.file + " cell[" + e.cell + "] tags=" + e.tags);
  e.manual.forEach((m) => L.push("    · " + m.cond));
}
L.push("");
L.push("## 练习需人工处理（无法安全分离，不改）");
for (const p of r.prefills.filter((p) => p.verdict === "manual")) {
  L.push("- " + p.file + " cell[" + p.cell + "] " + p.stmts + "句 :: " + p.firstLine + "  → " + p.reason);
}
L.push("");
L.push("## 建议插入学习目标的 126 处（位置 / 主题）");
for (const o of r.objectives) {
  L.push("- " + o.file + "  insertAfter=" + o.insertAfter + (o.fallback ? "(无场景,回退H1后)" : "") + "  |  " + o.title);
}
writeFileSync(".tmp-content-gaps-DETAIL.md", L.join("\n"), "utf8");
console.log("detail lines:", L.length, "→ .tmp-content-gaps-DETAIL.md");
