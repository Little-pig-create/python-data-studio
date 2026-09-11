import { create } from "zustand";
import { getCellSource, getCellType } from "./utils/notebookHelpers.js";

const stableHash = (value) => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
};

export const normalizeNotebook = (notebook) => ({
  metadata: notebook.metadata || {},
  nbformat: notebook.nbformat || 4,
  nbformat_minor: notebook.nbformat_minor || 5,
  cells: (() => {
    const occurrences = new Map();
    return (notebook.cells || []).map((cell) => {
      // 统一的类型归一化：磁盘格式是 cell_type，应用内存格式是 type。
      const rawType = getCellType(cell);
      const type = rawType === "markdown" || rawType === "raw" ? rawType : "code";
      const source = getCellSource(cell);
      const seed = `${type}|${source}`;
      const occurrence = occurrences.get(seed) || 0;
      occurrences.set(seed, occurrence + 1);
      return {
        id: cell.id || `cell-${stableHash(`${seed}|${occurrence}`)}`,
        type,
        source,
        outputs: cell.outputs || [],
        // Accept both the standard nbformat field and drafts written by older
        // versions of the custom UI.
        executionCount: cell.execution_count ?? cell.executionCount ?? null,
        metadata: cell.metadata || {}
      };
    });
  })()
});

export const serializeNotebook = (document) => ({
  cells: document.cells.map((cell) => ({
    id: cell.id,
    cell_type: cell.type,
    execution_count: cell.type === "code" ? cell.executionCount : null,
    metadata: cell.metadata || {},
    outputs: cell.type === "code" ? cell.outputs || [] : [],
    source: cell.source
  })),
  metadata: document.metadata || {},
  nbformat: document.nbformat || 4,
  nbformat_minor: document.nbformat_minor || 5
});

export const useNotebookStore = create((set) => ({
  document: null,
  notebookKey: null,
  activeCellId: null,
  selectedCellId: null,
  dirty: false,
  runtimeState: "idle",
  runtimeMessage: "首次运行代码时启动 Python",
  // 内核启动进度（0–100）。仅 loading 时有意义，用于渲染进度条。
  runtimePercent: 0,
  setDocument: (notebookKey, document) => set({
    notebookKey,
    document,
    activeCellId: document.cells[0]?.id || null,
    selectedCellId: document.cells[0]?.id || null,
    dirty: false
  }),
  selectCell: (id) => set({ activeCellId: id, selectedCellId: id }),
  updateCellSource: (id, source) => set((state) => ({
    document: state.document ? { ...state.document, cells: state.document.cells.map((cell) => cell.id === id ? { ...cell, source } : cell) } : state.document,
    dirty: true
  })),
  updateCellType: (id, type) => set((state) => ({
    document: state.document ? {
      ...state.document,
      cells: state.document.cells.map((cell) => cell.id === id ? {
        ...cell,
        type: type === "markdown" ? "markdown" : "code",
        outputs: [],
        executionCount: null
      } : cell)
    } : state.document,
    dirty: true
  })),
  updateCellResult: (id, result) => set((state) => ({
    document: state.document ? { ...state.document, cells: state.document.cells.map((cell) => cell.id === id ? { ...cell, ...result } : cell) } : state.document,
    dirty: true
  })),
  insertCell: (index, type = "code") => set((state) => {
    if (!state.document) return state;
    const id = `cell-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const cell = { id, type, source: "", outputs: [], executionCount: null, metadata: {} };
    const cells = [...state.document.cells];
    cells.splice(index, 0, cell);
    return { document: { ...state.document, cells }, activeCellId: id, selectedCellId: id, dirty: true };
  }),
  insertCellFromTemplate: (index, template) => set((state) => {
    if (!state.document || !template) return state;
    const id = `cell-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const cell = {
      id,
      type: template.type === "markdown" ? "markdown" : "code",
      source: String(template.source || ""),
      outputs: [],
      executionCount: null,
      metadata: { ...(template.metadata || {}) }
    };
    const cells = [...state.document.cells];
    cells.splice(Math.max(0, Math.min(index, cells.length)), 0, cell);
    return { document: { ...state.document, cells }, activeCellId: id, selectedCellId: id, dirty: true };
  }),
  moveCell: (id, direction) => set((state) => {
    if (!state.document) return state;
    const fromIndex = state.document.cells.findIndex((cell) => cell.id === id);
    const toIndex = fromIndex + direction;
    if (fromIndex < 0 || toIndex < 0 || toIndex >= state.document.cells.length) return state;
    const cells = [...state.document.cells];
    [cells[fromIndex], cells[toIndex]] = [cells[toIndex], cells[fromIndex]];
    return { document: { ...state.document, cells }, activeCellId: id, selectedCellId: id, dirty: true };
  }),
  deleteCell: (id) => set((state) => {
    if (!state.document || state.document.cells.length <= 1) return state;
    const index = state.document.cells.findIndex((cell) => cell.id === id);
    const cells = state.document.cells.filter((cell) => cell.id !== id);
    const fallback = cells[Math.max(0, index - 1)] || cells[0];
    return { document: { ...state.document, cells }, activeCellId: fallback.id, selectedCellId: fallback.id, dirty: true };
  }),
  setRuntime: (runtimeState, runtimeMessage, runtimePercent) => set((state) => ({
    runtimeState,
    runtimeMessage,
    // 进入 loading 以外状态时把进度清零；未传百分比则保留当前值
    //（连续的状态文字更新不应让进度条回退）。
    runtimePercent: runtimeState === "loading"
      ? (typeof runtimePercent === "number" ? runtimePercent : state.runtimePercent)
      : 0,
  })),
  setDirty: (dirty) => set({ dirty })
}));
