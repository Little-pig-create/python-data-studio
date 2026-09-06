/**
 * Markdown 元素级拆分工具。
 *
 * 按 Markdown 块级元素把一段 markdown 源码切成独立块：
 * 标题 / 段落 / 列表（连续项 + 缩进续行）/ 表格 / 引用 / 代码围栏 / 分隔线。
 * 展示层（NotebookCell.markdownSections）与 cell 拆分（自动/手动）共用同一套识别逻辑，
 * 保证「看到的块」与「拆出的 cell」一致。
 */
export function splitMarkdownByElements(source) {
  const sourceLines = String(source || "").split(/\r?\n/);
  const sections = [];
  let i = 0;
  const push = (lines) => {
    if (lines.some((line) => line.trim())) sections.push(lines.join("\n"));
  };

  while (i < sourceLines.length) {
    const line = sourceLines[i];
    const trimmed = line.trim();
    if (!trimmed) { i += 1; continue; }

    // 代码围栏：整体一块
    if (/^\s*```/.test(line)) {
      const block = [line];
      i += 1;
      while (i < sourceLines.length && !/^\s*```/.test(sourceLines[i])) {
        block.push(sourceLines[i]);
        i += 1;
      }
      if (i < sourceLines.length) { block.push(sourceLines[i]); i += 1; }
      push(block);
      continue;
    }

    // 标题：独立一块
    if (/^#{1,6}\s+/.test(line)) { push([line]); i += 1; continue; }

    // 引用块：连续 > 行
    if (trimmed.startsWith(">")) {
      const block = [line];
      i += 1;
      while (i < sourceLines.length && sourceLines[i].trim().startsWith(">")) {
        block.push(sourceLines[i]);
        i += 1;
      }
      push(block);
      continue;
    }

    // 表格：连续 | 行
    if (trimmed.startsWith("|")) {
      const block = [line];
      i += 1;
      while (i < sourceLines.length && sourceLines[i].trim().startsWith("|")) {
        block.push(sourceLines[i]);
        i += 1;
      }
      push(block);
      continue;
    }

    // 列表：连续列表项（含缩进续行，遇到空行或其他块级元素为止）
    if (/^[-*+]\s+/.test(trimmed) || /^\d+[.)]\s+/.test(trimmed)) {
      const block = [line];
      i += 1;
      while (i < sourceLines.length) {
        const t = sourceLines[i].trim();
        if (!t) break;
        if (/^[-*+]\s+/.test(t) || /^\d+[.)]\s+/.test(t) || /^#{1,6}\s+/.test(t)
          || t.startsWith("|") || t.startsWith(">") || /^\s*```/.test(sourceLines[i])
          || /^(-{3,}|\*{3,}|_{3,})\s*$/.test(t)) break;
        block.push(sourceLines[i]);
        i += 1;
      }
      push(block);
      continue;
    }

    // 分隔线
    if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(trimmed)) { push([line]); i += 1; continue; }

    // 普通段落：连续非空行直到遇到其他块级元素或空行
    const block = [line];
    i += 1;
    while (i < sourceLines.length) {
      const t = sourceLines[i].trim();
      if (!t) break;
      if (/^#{1,6}\s+/.test(t) || t.startsWith("|") || t.startsWith(">") || /^\s*```/.test(sourceLines[i])
        || /^[-*+]\s+/.test(t) || /^\d+[.)]\s+/.test(t) || /^(-{3,}|\*{3,}|_{3,})\s*$/.test(t)) break;
      block.push(sourceLines[i]);
      i += 1;
    }
    push(block);
  }

  return sections.length ? sections : [String(source || "")];
}

/**
 * 判断一个 markdown 块的元素类型（由首个非空行决定）。
 */
export function classifyMarkdownBlock(source) {
  const firstLine = String(source).split(/\r?\n/).find((line) => line.trim()) || "";
  const trimmed = firstLine.trim();
  if (/^#{1,6}\s+/.test(trimmed)) return "heading";
  if (/^\s*```/.test(firstLine)) return "code";
  if (trimmed.startsWith(">")) return "quote";
  if (trimmed.startsWith("|")) return "table";
  if (/^[-*+]\s+/.test(trimmed) || /^\d+[.)]\s+/.test(trimmed)) return "list";
  if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(trimmed)) return "hr";
  return "paragraph";
}

/**
 * 元素切分 + 相邻同类合并：先按块级元素切分，再把相邻的同类元素用空行连接合并，
 * 返回 [{ type, source }] 分组。合并以空行还原 markdown 语义（与元素切分互为逆操作）。
 */
export function splitMarkdownByElementGroups(source) {
  const groups = [];
  for (const part of splitMarkdownByElements(source)) {
    const type = classifyMarkdownBlock(part);
    const prev = groups[groups.length - 1];
    if (prev && prev.type === type) {
      prev.source += "\n\n" + part;
    } else {
      groups.push({ type, source: part });
    }
  }
  return groups;
}

/**
 * 加载 notebook 时自动拆分：把 markdown cell 按「元素分组」拆成多个独立 cell。
 * - 相邻同类元素合并为同一 cell（连续列表项、连续段落等不再各自成块）；
 * - 不同类型相邻处拆开（标题/段落/列表/表格/引用/代码/分隔线之间）；
 * - 拆出的 cell 继承原 cell 的 metadata 等字段，仅替换 source；
 * - id 由「原 id + 序号 + 内容哈希」生成：同一内容每次加载 id 相同，
 *   避免自检清单等按 cell.id 存储的状态因拆分而丢失；
 * - 幂等：单一分组（同类连续）的 markdown cell 不再拆分。
 */
function stableCellId(baseId, index, source) {
  let hash = 5381;
  const text = String(source);
  for (let k = 0; k < text.length; k += 1) hash = ((hash * 33) ^ text.charCodeAt(k)) >>> 0;
  return baseId + "-p" + index + "-" + hash.toString(36);
}

export function autoSplitDocumentCells(document) {
  const cells = [];
  for (const cell of document.cells) {
    if (cell.type !== "markdown") { cells.push(cell); continue; }
    const groups = splitMarkdownByElementGroups(cell.source);
    if (groups.length <= 1) { cells.push(cell); continue; }
    groups.forEach((group, index) => {
      cells.push({
        ...cell,
        id: stableCellId(cell.id, index, group.source),
        source: group.source,
        outputs: [],
        executionCount: null
      });
    });
  }
  document.cells = cells;
  return document;
}
