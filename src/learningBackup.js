import { useAppStore } from "./store";

const BACKUP_VERSION = 1;
const fields = ["activeChapterId", "recentIds", "completedIds", "chapterExecutionProgress", "chapterNotes"];

export function exportLearningBackup() {
  const state = useAppStore.getState();
  const learning = Object.fromEntries(fields.map((field) => [field, state[field]]));
  return { version: BACKUP_VERSION, exportedAt: new Date().toISOString(), learning };
}

export async function readLearningBackup(file) {
  const parsed = JSON.parse(await file.text());
  if (!parsed?.learning || !Array.isArray(parsed.learning.recentIds) || !Array.isArray(parsed.learning.completedIds)) {
    throw new Error("不是有效的 Python Data Studio 学习记录备份");
  }
  return parsed;
}

export function restoreLearningBackup(backup) {
  const learning = backup.learning;
  useAppStore.getState().restoreLearningBackup({
    activeChapterId: typeof learning.activeChapterId === "string" ? learning.activeChapterId : "chapter-1",
    recentIds: learning.recentIds.filter((item) => typeof item === "string").slice(0, 48),
    completedIds: learning.completedIds.filter((item) => typeof item === "string"),
    chapterExecutionProgress: learning.chapterExecutionProgress && typeof learning.chapterExecutionProgress === "object" ? learning.chapterExecutionProgress : {},
    chapterNotes: learning.chapterNotes && typeof learning.chapterNotes === "object" ? learning.chapterNotes : {}
  });
}
