// 自定义 Notebook 元数据与校验逻辑测试。
//
// 这些逻辑原先内联在 NotebookContentCenter.jsx（566 行）里、无法测试；
// 抽出到 utils/customNotebook.js 后可以完整覆盖边界情况。

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  CUSTOM_COURSE_CHAPTERS_KEY,
  buildBackupPayload,
  makeId,
  notebookQualityCheck,
  notebookSummary,
  readMetadata,
  safeFileName,
  upsertMetadata,
  validateNotebook,
  writeMetadata,
} from "../../src/utils/customNotebook.js";

/** 内存版 localStorage，用于隔离测试。 */
function makeStorage(initial = {}) {
  const data = { ...initial };
  return {
    getItem: (key) => (key in data ? data[key] : null),
    setItem: (key, value) => { data[key] = value; },
    _raw: data,
  };
}

// ── 元数据读写 ─────────────────────────────────────────────────────────────

test("readMetadata 在无数据时返回空数组", () => {
  assert.deepEqual(readMetadata(makeStorage()), []);
});

test("readMetadata 对损坏的 JSON 降级为空数组", () => {
  assert.deepEqual(readMetadata(makeStorage({ [CUSTOM_COURSE_CHAPTERS_KEY]: "{不是 JSON" })), []);
});

test("readMetadata 对非数组内容降级为空数组", () => {
  assert.deepEqual(readMetadata(makeStorage({ [CUSTOM_COURSE_CHAPTERS_KEY]: '{"a":1}' })), []);
});

test("writeMetadata 写入并可被 readMetadata 读回", () => {
  const storage = makeStorage();
  writeMetadata([{ id: "a", title: "A" }], storage);
  assert.deepEqual(readMetadata(storage), [{ id: "a", title: "A" }]);
});

test("upsertMetadata 新增与覆盖都只保留一条同 id 记录", () => {
  const storage = makeStorage();
  upsertMetadata({ id: "a", title: "旧" }, storage);
  upsertMetadata({ id: "b", title: "B" }, storage);
  upsertMetadata({ id: "a", title: "新" }, storage);
  const records = readMetadata(storage);
  assert.equal(records.length, 2);
  assert.equal(records.find((r) => r.id === "a").title, "新");
});

test("makeId 生成唯一且带前缀的 id", () => {
  const ids = new Set(Array.from({ length: 50 }, () => makeId()));
  assert.equal(ids.size, 50);
  for (const id of ids) assert.match(id, /^custom-chapter-/);
});

// ── 文件名安全化 ───────────────────────────────────────────────────────────

test("safeFileName 去除路径分隔符等非法字符", () => {
  assert.equal(safeFileName('a/b\\c:d*e?f"g<h>i|j'), "a-b-c-d-e-f-g-h-i-j");
  assert.equal(safeFileName(""), "notebook");
  assert.equal(safeFileName(null), "notebook");
});

// ── 概览统计 ───────────────────────────────────────────────────────────────

test("notebookSummary 统计单元格与标题（标题只取一至三级）", () => {
  const notebook = { cells: [
    { cell_type: "markdown", source: "# 一\n## 二\n### 三\n#### 四\n##### 五" },
    { cell_type: "code", source: "print(1)" },
  ]};
  const summary = notebookSummary(notebook);
  assert.equal(summary.cells, 2);
  assert.equal(summary.markdown, 1);
  assert.equal(summary.code, 1);
  // 与 markdownOutline 一致：只识别 # / ## / ###，四级及以下不计入
  assert.deepEqual(summary.headings, ["一", "二", "三"]);
});

test("notebookSummary 最多保留 5 个标题", () => {
  const notebook = { cells: [
    { cell_type: "markdown", source: ["# 1", "## 2", "### 3", "# 4", "## 5", "### 6"].join("\n") },
  ]};
  assert.equal(notebookSummary(notebook).headings.length, 5);
});

test("notebookSummary 对空 notebook 安全", () => {
  assert.deepEqual(notebookSummary(null), { cells: 0, markdown: 0, code: 0, headings: [] });
});

// ── 质量检查 ───────────────────────────────────────────────────────────────

test("质量检查：缺少代码或说明单元格时报错", () => {
  assert.ok(notebookQualityCheck({ cells: [{ cell_type: "code", source: "x=1" }] })
    .errors.includes("至少需要一个 Markdown 说明单元格"));
  assert.ok(notebookQualityCheck({ cells: [{ cell_type: "markdown", source: "# 标题" }] })
    .errors.includes("至少需要一个代码单元格"));
});

test("质量检查：代码单元格全为空时报错", () => {
  const result = notebookQualityCheck({ cells: [
    { cell_type: "markdown", source: "# 标题" },
    { cell_type: "code", source: "   " },
  ]});
  assert.ok(result.errors.includes("代码单元格不能全部为空"));
});

test("质量检查：无标题时给出警告而非错误", () => {
  const result = notebookQualityCheck({ cells: [
    { cell_type: "markdown", source: "没有标题" },
    { cell_type: "code", source: "x=1" },
  ]});
  assert.equal(result.errors.length, 0);
  assert.ok(result.warnings.some((w) => w.includes("标题")));
});

test("质量检查：检出错误输出与超长单元格", () => {
  const result = notebookQualityCheck({ cells: [
    { cell_type: "markdown", source: "# 标题" },
    { cell_type: "code", source: "x=1", outputs: [{ output_type: "error" }] },
    { cell_type: "code", source: "y" + "x".repeat(20001) },
  ]});
  assert.ok(result.warnings.some((w) => w.includes("执行错误输出")));
  assert.ok(result.warnings.some((w) => w.includes("20,000")));
});

// ── notebook 结构校验 ──────────────────────────────────────────────────────

test("validateNotebook 接受合法的 nbformat 4 文件", () => {
  const parsed = { nbformat: 4, cells: [{ cell_type: "code", source: "x=1", outputs: [] }] };
  assert.equal(validateNotebook(parsed), parsed);
});

test("validateNotebook 拒绝非 nbformat 4 或缺少 cells", () => {
  assert.throws(() => validateNotebook(null), /nbformat 4/);
  assert.throws(() => validateNotebook({ nbformat: 3, cells: [] }), /nbformat 4/);
  assert.throws(() => validateNotebook({ nbformat: 4 }), /nbformat 4/);
});

test("validateNotebook 拒绝空 cells", () => {
  assert.throws(() => validateNotebook({ nbformat: 4, cells: [] }), /至少需要包含一个单元格/);
});

test("validateNotebook 拒绝非法单元格类型并给出行号", () => {
  assert.throws(
    () => validateNotebook({ nbformat: 4, cells: [{ cell_type: "code", source: "" }, { cell_type: "weird", source: "" }] }),
    /第 2 个单元格类型无效/,
  );
});

test("validateNotebook 拒绝非法的 source 与 outputs 类型", () => {
  assert.throws(
    () => validateNotebook({ nbformat: 4, cells: [{ cell_type: "code", source: 123 }] }),
    /source 必须是字符串或字符串数组/,
  );
  assert.throws(
    () => validateNotebook({ nbformat: 4, cells: [{ cell_type: "code", source: "x", outputs: "不是数组" }] }),
    /outputs 必须是数组/,
  );
});

test("validateNotebook 拒绝非整数的 execution_count，但允许 null", () => {
  assert.throws(
    () => validateNotebook({ nbformat: 4, cells: [{ cell_type: "code", source: "x", execution_count: 1.5 }] }),
    /execution_count 无效/,
  );
  assert.doesNotThrow(
    () => validateNotebook({ nbformat: 4, cells: [{ cell_type: "code", source: "x", execution_count: null }] }),
  );
});

// ── 备份结构 ───────────────────────────────────────────────────────────────

test("buildBackupPayload 输出稳定的 schema 与记录结构", () => {
  const fixed = new Date("2026-09-11T00:00:00.000Z");
  const payload = buildBackupPayload([{ id: "a", notebook: { cells: [] } }], fixed);
  assert.equal(payload.schema, "python-data-studio-notebook-backup");
  assert.equal(payload.version, 1);
  assert.equal(payload.exportedAt, "2026-09-11T00:00:00.000Z");
  assert.equal(payload.records.length, 1);
  assert.equal(payload.records[0].id, "a");
  assert.deepEqual(payload.records[0].history, [], "缺失 history 时补空数组");
});
