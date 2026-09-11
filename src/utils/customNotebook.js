// 自定义 Notebook 的元数据与校验逻辑（纯函数，可单元测试）。
//
// 从 NotebookContentCenter.jsx 抽出：这些逻辑不依赖 React，
// 且包含不少边界判断（nbformat 结构、单元格类型、outputs 类型等），
// 单独成模块后既缩小了组件，也让规则可以被测试直接覆盖。

import { getCellSource, isCodeCell, isMarkdownCell } from "./notebookHelpers.js";
import { normalizeNotebook, serializeNotebook } from "../notebookStore.js";

/** 自定义章节元数据在 localStorage 中的键名（与 courseCatalog 共用）。 */
export const CUSTOM_COURSE_CHAPTERS_KEY = "python-data-studio:custom-course-chapters:v1";

/** 校验结果只允许这几种状态。 */
export const NOTEBOOK_STATUSES = ["draft", "published", "archived"];

/** 读取本地保存的自定义章节元数据；格式异常时降级为空数组。 */
export function readMetadata(storage = typeof window !== "undefined" ? window.localStorage : null) {
  try {
    const value = JSON.parse(storage?.getItem(CUSTOM_COURSE_CHAPTERS_KEY) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

/** 写入元数据并广播更新事件，让目录与其他页面同步刷新。 */
export function writeMetadata(records, storage = typeof window !== "undefined" ? window.localStorage : null) {
  storage?.setItem(CUSTOM_COURSE_CHAPTERS_KEY, JSON.stringify(records));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("course-catalog-updated"));
  }
}

/** 按 id 覆盖或追加一条元数据。 */
export function upsertMetadata(metadata, storage) {
  const records = readMetadata(storage).filter((item) => item.id !== metadata.id);
  writeMetadata([...records, metadata], storage);
}

/** 生成自定义章节 id。 */
export function makeId() {
  return `custom-chapter-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/** 把标题转换成安全的文件名。 */
export function safeFileName(title) {
  return String(title || "notebook").replace(/[\\/:*?"<>|]/g, "-").trim() || "notebook";
}

/** notebook 源码文本（兼容字符串与字符串数组）。 */
export function notebookSourceText(source) {
  return getCellSource({ source });
}

/** 概览统计：单元格总数、markdown/code 数量、前 5 个标题。 */
export function notebookSummary(notebook) {
  const cells = notebook?.cells || [];
  const markdown = cells.filter(isMarkdownCell);
  const code = cells.filter(isCodeCell);
  const headings = markdown
    .flatMap((cell) => notebookSourceText(cell.source)
      .split(/\r?\n/)
      .filter((line) => /^#{1,3}\s+/.test(line))
      .map((line) => line.replace(/^#{1,3}\s+/, "").trim()))
    .slice(0, 5);
  return { cells: cells.length, markdown: markdown.length, code: code.length, headings };
}

/**
 * 发布前的质量检查。
 * errors 会阻止发布，warnings 仅提示。
 */
export function notebookQualityCheck(notebook) {
  const summary = notebookSummary(notebook);
  const errors = [];
  const warnings = [];
  const cells = notebook?.cells || [];
  const codeCells = cells.filter(isCodeCell);

  if (!summary.code) errors.push("至少需要一个代码单元格");
  if (!summary.markdown) errors.push("至少需要一个 Markdown 说明单元格");
  if (!summary.headings.length) warnings.push("未检测到一级到三级标题，建议补充章节结构");
  if (summary.code > 0 && codeCells.every((cell) => !notebookSourceText(cell.source).trim())) {
    errors.push("代码单元格不能全部为空");
  }
  if (codeCells.some((cell) => (cell.outputs || []).some((output) => output?.output_type === "error"))) {
    warnings.push("检测到带有执行错误输出的代码单元格，建议清理错误结果后再发布");
  }
  if (cells.some((cell) => notebookSourceText(cell.source).length > 20000)) {
    warnings.push("存在超过 20,000 个字符的单元格，建议拆分内容以便学生阅读");
  }
  if (!notebook?.metadata?.kernelspec && !notebook?.metadata?.language_info) {
    warnings.push("未检测到 kernelspec 或 language_info，运行前请确认 Python 内核配置");
  }
  return { errors, warnings };
}

/**
 * 校验上传/导入的 notebook 结构。
 * 不符合 nbformat 4 约定时抛出带行号的可读错误。
 */
export function validateNotebook(parsed) {
  if (!parsed || parsed.nbformat !== 4 || !Array.isArray(parsed.cells)) {
    throw new Error("文件必须是 nbformat 4 的 Notebook，并包含 cells 数组");
  }
  if (!parsed.cells.length) throw new Error("Notebook 至少需要包含一个单元格");
  parsed.cells.forEach((cell, index) => {
    const cellType = cell?.cell_type || cell?.type;
    if (!cell || !["markdown", "code", "raw"].includes(cellType)) {
      throw new Error(`第 ${index + 1} 个单元格类型无效，应为 markdown、code 或 raw`);
    }
    const source = cell.source;
    const sourceValid = typeof source === "string"
      || (Array.isArray(source) && source.every((line) => typeof line === "string"));
    if (!sourceValid) {
      throw new Error(`第 ${index + 1} 个单元格的 source 必须是字符串或字符串数组`);
    }
    if (cellType === "code") {
      const executionCount = cell.execution_count ?? cell.executionCount;
      if (cell.outputs !== undefined && !Array.isArray(cell.outputs)) {
        throw new Error(`第 ${index + 1} 个代码单元格的 outputs 必须是数组`);
      }
      if (executionCount !== undefined && executionCount !== null && !Number.isInteger(executionCount)) {
        throw new Error(`第 ${index + 1} 个代码单元格的 execution_count 无效`);
      }
    }
  });
  return parsed;
}

/**
 * 构造备份文件内容（schema + 记录列表）。
 * 抽成纯函数以便测试导出结构是否稳定。
 */
export function buildBackupPayload(records, now = new Date()) {
  return {
    schema: "python-data-studio-notebook-backup",
    version: 1,
    exportedAt: now.toISOString(),
    records: records.map((record) => ({
      id: record.id,
      metadata: record.metadata || record,
      notebook: record.notebook,
      history: Array.isArray(record.history) ? record.history : [],
    })),
  };
}

/** 触发浏览器下载（依赖 DOM，仅在浏览器环境调用）。 */
export function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/** 下载单个 notebook（导出为规范化的 ipynb）。 */
export function downloadNotebook(record) {
  if (!record?.notebook) return;
  const title = safeFileName(record.metadata?.title || record.title);
  const standardNotebook = serializeNotebook(normalizeNotebook(record.notebook));
  triggerDownload(
    new Blob([JSON.stringify(standardNotebook, null, 2)], { type: "application/x-ipynb+json" }),
    `${title}.ipynb`,
  );
}

/** 下载全部自定义 notebook 的备份。 */
export function downloadBackup(records) {
  const payload = buildBackupPayload(records);
  triggerDownload(
    new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }),
    `python-data-studio-notebooks-${new Date().toISOString().slice(0, 10)}.json`,
  );
}
