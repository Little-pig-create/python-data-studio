import { Tooltip } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../store";
import { moduleAbbrev } from "../utils/moduleAbbrev";
import { chapterProgress, matchesCourseSearch, moduleStats } from "../utils/progressHelpers";
import { ChapterProgressRing } from "./ChapterProgressRing";

function chapterNavigationLabel(item) {
  if (item.kind === "capstone") return item.label || item.title || "模块大作业";
  return item.label || `第${item.chapter}章 ${item.title}`;
}

export function ChapterLink({ item, store, navigate, onClose, className = "course-tree-chapter", detail }) {
  const progress = chapterProgress(store, item.id);
  return <button
    type="button"
    className={className + (store.activeChapterId === item.id ? " is-selected" : "")}
    onClick={() => {
      store.setActiveChapter(item.id);
      store.setSearchQuery("");
      navigate("/course/" + item.id);
      onClose?.();
    }}
  >
    <ChapterProgressRing value={progress} />
    <span className="course-link-copy">
      <span>{chapterNavigationLabel(item)}</span>
      {detail && <small>{detail}</small>}
    </span>
  </button>;
}

export function SearchResults({ catalog, store, navigate, onClose, query }) {
  const results = catalog.chapters.filter((item) => matchesCourseSearch(item, catalog.modules.find((module) => module.id === item.module), query));
  if (!results.length) return <div className="course-search-empty">未找到匹配章节</div>;
  return <div className="course-search-results" aria-live="polite">
    {results.map((item) => {
      const module = catalog.modules.find((candidate) => candidate.id === item.module);
      return <ChapterLink key={item.id} item={item} store={store} navigate={navigate} onClose={onClose} className="course-search-result" detail={module?.label} />;
    })}
  </div>;
}

export function CollapsedRail({ catalog, store, navigate, onClose }) {
  const activeChapter = catalog.chapters.find((item) => item.id === store.activeChapterId);
  const activeModuleId = activeChapter?.module;
  return <div className="course-rail" aria-label="课程模块（折叠）">
    {catalog.modules.map((module) => {
      const { moduleChapters, completedCount, total } = moduleStats(catalog, module, store.completedIds);
      const done = total > 0 && completedCount === total;
      const percent = total > 0 ? Math.round((completedCount / total) * 100) : 0;
      const isActive = module.id === activeModuleId;
      return <Tooltip key={module.id} placement="right" title={`${module.label} · ${completedCount}/${total} 已完成 (${percent}%)`}>
        <button
          type="button"
          className={`course-rail-item ${isActive ? "is-active" : ""} ${done ? "is-done" : ""}`}
          style={{ "--rail-color": module.color }}
          aria-label={`${module.label}，已完成 ${completedCount} / ${total}`}
          onClick={() => {
            const target = moduleChapters.find((ch) => !store.completedIds.includes(ch.id)) || moduleChapters[0];
            store.setSidebarMode("full");
            if (!store.expandedModules.includes(module.id)) store.setExpandedModules([...store.expandedModules, module.id]);
            if (target) { store.setActiveChapter(target.id); navigate("/course/" + target.id); onClose?.(); }
          }}
        >
          <span className="course-rail-chip">{done ? "✓" : moduleAbbrev[module.id] || module.label.slice(0, 2)}</span>
          <span className="course-rail-count">{completedCount}/{total}</span>
        </button>
      </Tooltip>;
    })}
  </div>;
}

export function CourseTree({ catalog, store, navigate, onClose }) {
  return <nav className="course-tree-list" aria-label="课程章节目录">
    {catalog.modules.map((module) => {
      const { moduleChapters, completedCount, total } = moduleStats(catalog, module, store.completedIds);
      const expanded = store.expandedModules.includes(module.id);
      return <section className="course-tree-module" key={module.id}>
        <button
          type="button"
          className="course-tree-module-toggle"
          aria-expanded={expanded}
          onClick={() => store.toggleModule(module.id)}
        >
          <span className={`course-tree-chevron ${expanded ? "is-expanded" : ""}`} aria-hidden="true" />
          <span>{module.label} ({completedCount}/{total})</span>
        </button>
        {expanded && <div className="course-tree-chapters">
          {moduleChapters.map((item) => {
            const progress = chapterProgress(store, item.id);
            return <button
              type="button"
              key={item.id}
              className={`course-tree-chapter ${store.activeChapterId === item.id ? "is-selected" : ""}`}
              onClick={() => {
                store.setActiveChapter(item.id);
                navigate("/course/" + item.id);
                onClose?.();
              }}
            >
              <ChapterProgressRing value={progress} />
              <span>{chapterNavigationLabel(item)}</span>
            </button>;
          })}
        </div>}
      </section>;
    })}
  </nav>;
}
