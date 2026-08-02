export const moduleStats = (catalog, module, completedIds) => {
  const moduleChapters = catalog.chapters.filter((item) => item.module === module.id);
  const completedCount = moduleChapters.filter((ch) => completedIds.includes(ch.id)).length;
  return { moduleChapters, completedCount, total: moduleChapters.length };
};

export const chapterProgress = (store, chapterId) => {
  if (store.completedIds.includes(chapterId)) return 100;
  const progress = store.chapterExecutionProgress?.[chapterId];
  if (!progress?.totalCells) return 0;
  return Math.min(100, Math.round((progress.completedCellIds.length / progress.totalCells) * 100));
};

export const matchesCourseSearch = (lesson, module, query) => {
  const haystack = [
    lesson.title,
    lesson.label,
    lesson.chapter,
    module?.label,
    ...(lesson.tags || [])
  ].join(" ").toLowerCase();
  return haystack.includes(query);
};
