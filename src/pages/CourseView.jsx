import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAppStore } from "../store";
import { useAuth, ROLES } from "../AuthProvider";
import { Sidebar } from "../components/Sidebar";
import { ChapterUnavailable } from "../components/ChapterUnavailable";
import { FirstTimeWelcome } from "../FirstTimeWelcome";
import { NotebookWorkspace } from "../NotebookWorkspace";

export function CourseView({ catalog }) {
  const { chapterId = "chapter-1" } = useParams();
  const store = useAppStore();
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const lesson = catalog.chapters.find((item) => item.id === chapterId);
  useEffect(() => { if (lesson && store.activeChapterId !== lesson.id) store.setActiveChapter(lesson.id); }, [lesson?.id]);
  if (!lesson) {
    return <ChapterUnavailable onBack={() => navigate("/course/chapter-1")} />;
  }
  const lessonIndex = catalog.chapters.findIndex((item) => item.id === lesson.id);
  const previousLesson = lessonIndex > 0 ? catalog.chapters[lessonIndex - 1] : undefined;
  const nextLesson = lessonIndex >= 0 && lessonIndex < catalog.chapters.length - 1 ? catalog.chapters[lessonIndex + 1] : undefined;
  // 说明：内核状态由 NotebookWorkspace 自己维护并写入 useNotebookStore，
  // 此处不再转发。历史上这里曾调用 useAppStore 的 setRuntime，
  // 但运行时状态已统一归属 notebookStore，由 useKernelStatus 负责写入。
  return <div className="app-frame">{user.role === ROLES.STUDENT && <FirstTimeWelcome catalog={catalog} />}<Sidebar catalog={catalog} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} /><div className="workspace-main"><div className="workspace-body"><NotebookWorkspace lesson={lesson} previousLesson={previousLesson} nextLesson={nextLesson} lessonPosition={lessonIndex + 1} totalLessons={catalog.chapters.length} onOpenSidebar={() => setMobileOpen(true)} /></div></div></div>;
}
