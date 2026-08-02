import { create } from "zustand";
import { persist } from "zustand/middleware";

export const defaultLearningProfile = Object.freeze({
  activeChapterId: "chapter-1",
  expandedModules: ["python"],
  sidebarMode: "full",
  sidebarTab: "course",
  searchQuery: "",
  recentIds: ["chapter-1"],
  completedIds: [],
  chapterExecutionProgress: {},
  chapterNotes: {},
  runtimeState: "idle",
  runtimeProgress: 0,
  isNotebookDirty: false,
});

function migratePersistedState(state) {
  if (!state) return state;
  const expandedModules = state.expandedModules || ["python"];
  if (!expandedModules.includes("viz")) return state;
  return {
    ...state,
    expandedModules: [
      ...expandedModules.filter((id) => id !== "viz"),
      "matplotlib",
      "seaborn"
    ]
  };
}

export const useAppStore = create(persist((set) => ({
  activeChapterId: "chapter-1",
  expandedModules: ["python"],
  sidebarMode: "full",
  sidebarTab: "course",
  searchQuery: "",
  recentIds: ["chapter-1"],
  completedIds: [],
  chapterExecutionProgress: {},
  chapterNotes: {},
  runtimeState: "idle",
  runtimeProgress: 0,
  isNotebookDirty: false,
  setActiveChapter: (id) => set((state) => ({ activeChapterId: id, recentIds: [id, ...state.recentIds.filter((item) => item !== id)].slice(0, 48), sidebarTab: "course" })),
  toggleModule: (id) => set((state) => ({ expandedModules: state.expandedModules.includes(id) ? state.expandedModules.filter((item) => item !== id) : [...state.expandedModules, id] })),
  setExpandedModules: (expandedModules) => set({ expandedModules }),
  setSidebarMode: (sidebarMode) => set({ sidebarMode }),
  setSidebarTab: (sidebarTab) => set({ sidebarTab }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  recordSuccessfulCell: (chapterId, cellId, totalCells) => set((state) => {
    const previous = state.chapterExecutionProgress[chapterId]?.completedCellIds || [];
    const completedCellIds = previous.includes(cellId) ? previous : [...previous, cellId];
    const chapterCompleted = totalCells > 0 && completedCellIds.length >= totalCells;
    return {
      completedIds: chapterCompleted && !state.completedIds.includes(chapterId)
        ? [...state.completedIds, chapterId]
        : state.completedIds,
      chapterExecutionProgress: {
        ...state.chapterExecutionProgress,
        [chapterId]: { completedCellIds, totalCells }
      }
    };
  }),
  clearLearningProgress: () => set({ completedIds: [], chapterExecutionProgress: {} }),
  setChapterNote: (chapterId, content) => set((state) => {
    const note = content.trim();
    if (!note) {
      const { [chapterId]: _, ...chapterNotes } = state.chapterNotes;
      return { chapterNotes };
    }
    return { chapterNotes: { ...state.chapterNotes, [chapterId]: note } };
  }),
  restoreLearningBackup: (learning) => set(learning),
  setRuntime: (runtimeState, runtimeProgress = 0) => set({ runtimeState, runtimeProgress }),
  setNotebookDirty: (isNotebookDirty) => set({ isNotebookDirty })
}), {
  name: "python-data-studio:app:v1",
  version: 2,
  migrate: migratePersistedState,
  partialize: (state) => ({ activeChapterId: state.activeChapterId, expandedModules: state.expandedModules, sidebarMode: state.sidebarMode, recentIds: state.recentIds, completedIds: state.completedIds, chapterExecutionProgress: state.chapterExecutionProgress, chapterNotes: state.chapterNotes })
}));


export function activateLearningProfile(userId) {
  if (!userId || typeof window === "undefined") return;
  const storageName = "python-data-studio:learning:" + encodeURIComponent(String(userId));
  let savedState = null;
  try {
    const raw = window.localStorage.getItem(storageName);
    savedState = migratePersistedState(JSON.parse(raw)?.state || null);
  } catch {
    savedState = null;
  }
  useAppStore.persist.setOptions({ name: storageName });
  useAppStore.setState({
    ...defaultLearningProfile,
    ...(savedState || {}),
    expandedModules: savedState?.expandedModules || [...defaultLearningProfile.expandedModules],
    recentIds: savedState?.recentIds || [...defaultLearningProfile.recentIds],
    completedIds: savedState?.completedIds || [],
    chapterExecutionProgress: savedState?.chapterExecutionProgress || {},
    chapterNotes: savedState?.chapterNotes || {},
  });
}
