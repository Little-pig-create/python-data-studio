// 前端单元测试（Node 内置测试运行器，无需额外依赖）。
//
// 运行：npm test        （全部）
//       npm run test:watch  （监听模式）
//
// 说明：这些测试只覆盖**不依赖浏览器**的纯逻辑（解析、归一化、状态映射），
// 因此可以直接用 node --test 跑；需要 DOM 的组件测试不在当前范围内。

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  getCellType,
  getCellSource,
  isCodeCell,
  isMarkdownCell,
  isRawCell,
  markdownOutline,
  formatPythonSource,
  kernelStatusDetails,
} from "../../src/utils/notebookHelpers.js";
import { normalizeNotebook } from "../../src/notebookStore.js";
import { detectRequiredPackages } from "../../src/notebookRuntime.js";
import { parseNotebookSource } from "../testUtils/notebookFixtures.mjs";

// ── cell 类型判断：兼容磁盘格式(cell_type)与内存格式(type) ──────────────────

test("getCellType 识别磁盘格式 cell_type", () => {
  assert.equal(getCellType({ cell_type: "markdown" }), "markdown");
  assert.equal(getCellType({ cell_type: "code" }), "code");
});

test("getCellType 识别内存格式 type", () => {
  assert.equal(getCellType({ type: "code" }), "code");
  assert.equal(getCellType({ type: "raw" }), "raw");
});

test("getCellType 两者并存时优先 type（内存格式已是归一化结果）", () => {
  assert.equal(getCellType({ type: "code", cell_type: "markdown" }), "code");
});

test("getCellType 对空值安全", () => {
  assert.equal(getCellType({}), "");
  assert.equal(getCellType(null), "");
  assert.equal(getCellType(undefined), "");
});

test("isCodeCell / isMarkdownCell / isRawCell 对两种格式都成立", () => {
  assert.ok(isCodeCell({ cell_type: "code" }));
  assert.ok(isCodeCell({ type: "code" }));
  assert.ok(!isCodeCell({ cell_type: "markdown" }));
  assert.ok(isMarkdownCell({ type: "markdown" }));
  assert.ok(isMarkdownCell({ cell_type: "markdown" }));
  assert.ok(isRawCell({ cell_type: "raw" }));
  assert.ok(!isRawCell({ cell_type: "code" }));
});

// ── cell 源码：兼容字符串与字符串数组 ──────────────────────────────────────

test("getCellSource 兼容字符串与数组两种存储形式", () => {
  assert.equal(getCellSource({ source: "a\nb" }), "a\nb");
  assert.equal(getCellSource({ source: ["a\n", "b"] }), "a\nb");
  assert.equal(getCellSource({}), "");
  assert.equal(getCellSource(null), "");
});

// ── markdownOutline 回归：曾经只认 type，遇到原始文件会漏掉标题 ──────────────

test("markdownOutline 同时识别 type 与 cell_type（回归）", () => {
  const notebook = {
    cells: [
      { type: "markdown", source: "# 标题一\n正文" },
      { cell_type: "markdown", source: "## 标题二" },
      { type: "code", source: "print(1)" },
    ],
  };
  const outline = markdownOutline(notebook);
  assert.deepEqual(outline.map((item) => item.title), ["标题一", "标题二"]);
  assert.deepEqual(outline.map((item) => item.level), [1, 2]);
});

test("markdownOutline 忽略代码单元格里的 # 注释", () => {
  const notebook = { cells: [{ type: "code", source: "# 这不是标题" }] };
  assert.deepEqual(markdownOutline(notebook), []);
});

// ── normalizeNotebook：磁盘格式 → 应用内存格式 ─────────────────────────────

test("normalizeNotebook 归一化类型与源码", () => {
  const normalized = normalizeNotebook({
    cells: [
      { cell_type: "markdown", source: ["# ", "A"] },
      { cell_type: "code", source: "x = 1", execution_count: 3 },
    ],
  });
  assert.equal(normalized.cells[0].type, "markdown");
  assert.equal(normalized.cells[0].source, "# A");
  assert.equal(normalized.cells[1].type, "code");
  assert.equal(normalized.cells[1].executionCount, 3);
});

test("normalizeNotebook 为缺少 id 的单元格生成稳定 id", () => {
  const build = () => normalizeNotebook({
    cells: [{ cell_type: "code", source: "same" }, { cell_type: "code", source: "same" }],
  });
  const first = build();
  const second = build();
  assert.deepEqual(first.cells.map((c) => c.id), second.cells.map((c) => c.id));
  assert.notEqual(first.cells[0].id, first.cells[1].id, "同内容单元格应有不同 id");
});

test("normalizeNotebook 兼容旧的 executionCount 字段", () => {
  const normalized = normalizeNotebook({
    cells: [{ cell_type: "code", source: "x", executionCount: 7 }],
  });
  assert.equal(normalized.cells[0].executionCount, 7);
});

// ── formatPythonSource：教学用的等号间距与制表符 ─────────────────────────────

test("formatPythonSource 把制表符换成 4 空格并规范赋值等号", () => {
  assert.equal(formatPythonSource("\tx=1"), "    x = 1");
  assert.ok(!formatPythonSource("a\t=2").includes("\t"));
});

// ── 预加载包推断：决定浏览器端下载多少资源 ──────────────────────────────────

test("detectRequiredPackages 对无第三方依赖的源码返回空", () => {
  assert.deepEqual(detectRequiredPackages('print("hello")'), []);
  assert.deepEqual(detectRequiredPackages("import os\nimport json"), []);
});

test("detectRequiredPackages 识别常用别名并能补齐前置依赖", () => {
  assert.deepEqual(detectRequiredPackages("import numpy as np"), ["numpy"]);
  assert.deepEqual(
    detectRequiredPackages("import numpy as np\nimport pandas as pd").sort(),
    ["numpy", "pandas"],
  );
  // sklearn 需要 numpy/pandas/scipy
  assert.deepEqual(
    detectRequiredPackages("from sklearn.linear_model import LinearRegression").sort(),
    ["numpy", "pandas", "scipy", "sklearn"],
  );
});

test("detectRequiredPackages 忽略注释中的 import", () => {
  assert.deepEqual(detectRequiredPackages("# import numpy as np"), []);
});

// ── 内核状态文案表 ─────────────────────────────────────────────────────────

test("kernelStatusDetails 覆盖所有已知内核状态", () => {
  for (const status of ["unknown", "starting", "idle", "busy", "terminating", "restarting", "dead"]) {
    const entry = kernelStatusDetails[status];
    assert.ok(Array.isArray(entry), `${status} 应有映射`);
    assert.equal(entry.length, 2, `${status} 应包含 [状态, 文案]`);
  }
});

// ── 测试夹具自检：确保夹具解析出的 notebook 结构可用 ────────────────────────

test("notebookFixtures 能解析出课程 notebook 并含代码单元格", () => {
  const notebook = parseNotebookSource("chapter-1");
  assert.ok(notebook, "应能读到第一章");
  assert.ok(notebook.cells.length > 0);
  assert.ok(notebook.cells.some(isCodeCell), "第一章应包含代码单元格");
});
