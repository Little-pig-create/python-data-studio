import { create } from "zustand";

const sourceText = (source) => Array.isArray(source) ? source.join("") : (source || "");

export const normalizeNotebook = (notebook) => ({
  metadata: notebook.metadata || {},
  nbformat: notebook.nbformat || 4,
  nbformat_minor: notebook.nbformat_minor || 5,
  cells: (notebook.cells || []).map((cell, index) => ({
    id: cell.id || `cell-${index}-${Math.random().toString(36).slice(2, 8)}`,
    type: cell.cell_type === "markdown" || cell.type === "markdown" ? "markdown" : cell.cell_type === "raw" || cell.type === "raw" ? "raw" : "code",
    source: sourceText(cell.source),
    outputs: cell.outputs || [],
    // Accept both the standard nbformat field and drafts written by older
    // versions of the custom UI.
    executionCount: cell.execution_count ?? cell.executionCount ?? null,
    metadata: cell.metadata || {}
  }))
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
  runtimeMessage: "正在初始化内核",
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
  setRuntime: (runtimeState, runtimeMessage) => set({ runtimeState, runtimeMessage }),
  setDirty: (dirty) => set({ dirty })
}));
