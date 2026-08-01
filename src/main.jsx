import "./styles.css";
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { Button, CssBaseline, Drawer, IconButton, InputAdornment, LinearProgress, Pagination, TextField, ThemeProvider, Tooltip, createTheme } from "@mui/material";
import { BarChart } from "@mui/x-charts/BarChart";
import MenuBookRounded from "@mui/icons-material/MenuBookRounded";
import ChevronLeftRounded from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRounded from "@mui/icons-material/ChevronRightRounded";
import TerminalRounded from "@mui/icons-material/TerminalRounded";
import SearchRounded from "@mui/icons-material/SearchRounded";
import HistoryRounded from "@mui/icons-material/HistoryRounded";
import ArrowBackRounded from "@mui/icons-material/ArrowBackRounded";
import SchoolRounded from "@mui/icons-material/SchoolRounded";
import AssignmentRounded from "@mui/icons-material/AssignmentRounded";
import DashboardRounded from "@mui/icons-material/DashboardRounded";
import LogoutRounded from "@mui/icons-material/LogoutRounded";
import InfoOutlined from "@mui/icons-material/InfoOutlined";
import { chapterById, loadCourseCatalog } from "./courseCatalog";
import { useAppStore } from "./store";
import { CountUp, FadeContent } from "./ui-react-bits";
import { createNotebookBridge } from "./notebookBridge";
import { NotebookWorkspace } from "./NotebookWorkspace";
import { FirstTimeWelcome } from "./FirstTimeWelcome";
import { DatasetCenter } from "./DatasetCenter";
import { PracticeCenter } from "./PracticeCenter";
import { LearningBackupPanel } from "./LearningBackupPanel";
import { StudentTrainingCenter } from "./StudentTrainingCenter";
import { AuthProvider, ROLE_LABELS, ROLES, RequireAuth, RoleHomeRedirect, useAuth } from "./AuthProvider";
import { LoginPage } from "./LoginPage";
import { ForbiddenPage } from "./ForbiddenPage";
import { TeacherCenter } from "./TeacherCenter";
import { SchoolAdminCenter } from "./SchoolAdminCenter";
import { RegistrationPage } from "./RegistrationPage";
import { CdKeyManagement } from "./CdKeyManagement";
import { SessionDock } from "./PortalHeader";
import { AppUpdater } from "./AppUpdater";
import { AboutPage } from "./AboutPage";
import { RuntimeDiagnostics } from "./RuntimeDiagnostics";
import { LandingPage } from "./LandingPage";
import CampaignRounded from "@mui/icons-material/CampaignRounded";
import { listPublishedAnnouncements } from "./announcementRepository";

const theme = createTheme({
  palette: { mode: "light", primary: { main: "#2563EB" }, background: { default: "#F2F4F7", paper: "#FFFFFF" }, text: { primary: "#1B2430", secondary: "#667085" } },
  shape: { borderRadius: 6 },
  typography: { fontFamily: "\"IBM Plex Sans\", \"Noto Sans SC\", \"Microsoft YaHei\", sans-serif", button: { textTransform: "none", fontWeight: 600 } },
  components: { MuiButton: { defaultProps: { disableElevation: true } }, MuiTooltip: { defaultProps: { arrow: true } } }
});

const moduleAbbrev = { python: "Py", numpy: "Np", pandas: "Pd", matplotlib: "Plt", seaborn: "Sns", plotly: "Ply", projects: "项目" };

const moduleStats = (catalog, module, completedIds) => {
  const moduleChapters = catalog.chapters.filter((item) => item.module === module.id);
  const completedCount = moduleChapters.filter((ch) => completedIds.includes(ch.id)).length;
  return { moduleChapters, completedCount, total: moduleChapters.length };
};

const chapterProgress = (store, chapterId) => {
  if (store.completedIds.includes(chapterId)) return 100;
  const progress = store.chapterExecutionProgress?.[chapterId];
  if (!progress?.totalCells) return 0;
  return Math.min(100, Math.round((progress.completedCellIds.length / progress.totalCells) * 100));
};

const matchesCourseSearch = (lesson, module, query) => {
  const haystack = [
    lesson.title,
    lesson.label,
    lesson.chapter,
    module?.label,
    ...(lesson.tags || [])
  ].join(" ").toLowerCase();
  return haystack.includes(query);
};

function ChapterProgressRing({ value }) {
  return <span
    className={`chapter-progress-ring ${value === 100 ? "is-complete" : ""}`}
    style={{ "--chapter-progress": `${value * 3.6}deg` }}
    title={`本章进度 ${value}%`}
    aria-label={`本章进度 ${value}%`}
  ><span /></span>;
}

function StudentAnnouncements() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    listPublishedAnnouncements().then(setItems).catch(() => setItems([]));
  }, []);
  if (!items.length) return null;
  return <section className="student-announcements" aria-label="课程公告"><div className="student-announcements-heading"><span><CampaignRounded fontSize="small" />课程公告</span><small>{items.length} 条</small></div>{items.slice(0, 3).map((item) => <article key={item.id}><strong>{item.title}</strong><p>{item.content}</p><small>{new Date(item.updatedAt).toLocaleDateString("zh-CN")}</small></article>)}</section>;
}

function CourseTree({ catalog, store, navigate, onClose }) {
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
              <span>第{item.chapter}章 {item.title}</span>
            </button>;
          })}
        </div>}
      </section>;
    })}
  </nav>;
}

function ChapterLink({ item, store, navigate, onClose, className = "course-tree-chapter", detail }) {
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
      <span>第{item.chapter}章 {item.title}</span>
      {detail && <small>{detail}</small>}
    </span>
  </button>;
}

function SearchResults({ catalog, store, navigate, onClose, query }) {
  const results = catalog.chapters.filter((item) => matchesCourseSearch(item, catalog.modules.find((module) => module.id === item.module), query));
  if (!results.length) return <div className="course-search-empty">未找到匹配章节</div>;
  return <div className="course-search-results" aria-live="polite">
    {results.map((item) => {
      const module = catalog.modules.find((candidate) => candidate.id === item.module);
      return <ChapterLink key={item.id} item={item} store={store} navigate={navigate} onClose={onClose} className="course-search-result" detail={module?.label} />;
    })}
  </div>;
}

function CollapsedRail({ catalog, store, navigate, onClose }) {
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

function Sidebar({ catalog, mobileOpen, onClose }) {
  const navigate = useNavigate();
  const store = useAppStore();
  const { user } = useAuth();
  const collapsed = store.sidebarMode === "rail";
  const query = store.searchQuery.trim().toLowerCase();
  const content = <div className="sidebar-content">
    <div className="sidebar-brand">
      <div className="brand-mark"><MenuBookRounded fontSize="small" /></div>
      <div className="brand-title">Python Data Studio</div>
      <Tooltip title={collapsed ? "展开目录" : "折叠目录"} placement="right">
        <IconButton
          size="small"
          className="sidebar-toggle"
          aria-label={collapsed ? "展开目录" : "折叠目录"}
          aria-expanded={!collapsed}
          onClick={() => store.setSidebarMode(collapsed ? "full" : "rail")}
        >
          {collapsed ? <ChevronRightRounded fontSize="small" /> : <ChevronLeftRounded fontSize="small" />}
        </IconButton>
      </Tooltip>
    </div>
    {collapsed
      ? <CollapsedRail catalog={catalog} store={store} navigate={navigate} onClose={onClose} />
      : <>
        <div className="sidebar-tools">
          {user.role === ROLES.TEACHER && <Button className="sidebar-teaching-link" startIcon={<DashboardRounded fontSize="small" />} onClick={() => { navigate("/teaching"); onClose?.(); }}>教学工作台</Button>}
          <TextField
            className="course-search-input"
            size="small"
            fullWidth
            placeholder="搜索课程、模块或标签"
            value={store.searchQuery}
            onChange={(event) => store.setSearchQuery(event.target.value)}
            inputProps={{ "aria-label": "搜索课程" }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchRounded fontSize="small" /></InputAdornment>,
              endAdornment: store.searchQuery ? <InputAdornment position="end"><IconButton size="small" aria-label="清除搜索" onClick={() => store.setSearchQuery("")}><span aria-hidden="true">×</span></IconButton></InputAdornment> : null
            }}
          />
        </div>
        <div className="course-tree">
          {query ? <SearchResults catalog={catalog} store={store} navigate={navigate} onClose={onClose} query={query} /> : <CourseTree catalog={catalog} store={store} navigate={navigate} onClose={onClose} />}
        </div>
        <div className="sidebar-session sidebar-about-session">
          {user.role === ROLES.STUDENT && <>
            <Button className="sidebar-progress-link" startIcon={<HistoryRounded fontSize="small" />} onClick={() => { navigate("/progress"); onClose?.(); }}>学习记录</Button>
            <Button className="sidebar-training-link" startIcon={<AssignmentRounded fontSize="small" />} onClick={() => { navigate("/training"); onClose?.(); }}>我的实训</Button>
          </>}
          <Button className="sidebar-about-link" startIcon={<InfoOutlined fontSize="small" />} onClick={() => { navigate("/about"); onClose?.(); }}>关于软件</Button>
        </div>
      </>}
  </div>;
  return <><aside className={`sidebar desktop-sidebar ${collapsed ? "is-collapsed" : ""}`}>{content}</aside><Drawer open={mobileOpen} onClose={onClose} className="mobile-sidebar" PaperProps={{ className: "!w-[304px]" }}>{content}</Drawer></>;
}

function NotebookFrame({ lesson }) {
  const store = useAppStore();
  const [frame, setFrame] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [runtimeAvailable, setRuntimeAvailable] = useState(false);
  const [targetAvailable, setTargetAvailable] = useState(false);
  const [loadTimedOut, setLoadTimedOut] = useState(false);
  const [bridgeReady, setBridgeReady] = useState(false);
  const file = lesson.path.replace("/runtime/files/", "");
  const url = "/runtime/lab/index.html?path=/" + file + "&mode=single-document&course-ui=clean-v2";
  useEffect(() => {
    let active = true;
    setLoaded(false);
    setTargetAvailable(false);
    setLoadTimedOut(false);
    setBridgeReady(false);
    Promise.all([
      fetch("/runtime/lab/index.html", { cache: "no-store" }).then((response) => response.text()),
      fetch(lesson.path, { cache: "no-store" }).then((response) => ({ ok: response.ok }))
    ]).then(([html, target]) => {
      if (!active) return;
      setRuntimeAvailable(/JupyterLite|jupyterlite/i.test(html));
      setTargetAvailable(target.ok);
    }).catch(() => {
      if (active) setTargetAvailable(false);
    });
    const timeout = window.setTimeout(() => {
      if (active) setLoadTimedOut(true);
    }, 10000);
    return () => { active = false; window.clearTimeout(timeout); };
  }, [lesson.id]);
  useEffect(() => {
    if (!frame) return undefined;
    const bridge = createNotebookBridge({ iframe: frame, onEvent: (message) => {
      if (message.type === "bridge:ready") {
        setBridgeReady(true);
        store.setRuntime("ready", 100);
        bridge.send("theme:set", { theme: "course-light" });
      }
      if (message.type === "kernel:state-changed") {
        const state = message.payload?.state;
        store.setRuntime(state === "busy" ? "busy" : state === "starting" ? "loading" : state === "dead" ? "error" : "ready", state === "ready" ? 100 : 70);
      }
      if (message.type === "notebook:dirty-changed") store.setNotebookDirty(Boolean(message.payload?.isDirty));
      if (message.type === "notebook:save-state") store.setNotebookDirty(message.payload?.state === "dirty");
    }});
    bridge.hello();
    return () => bridge.dispose();
  }, [frame, lesson.id]);
  return <section className="notebook-shell" aria-label={lesson.label + " Notebook"}>
    {!runtimeAvailable && <div className="runtime-placeholder"><div className="placeholder-icon"><TerminalRounded /></div><div><h2>Notebook 运行时待准备</h2><p>课程外壳已经就绪，正在检查本地 JupyterLite 文件。</p><LinearProgress className="w-[240px]" /></div></div>}
    {runtimeAvailable && targetAvailable && <iframe ref={setFrame} key={lesson.id} title={lesson.label + " Notebook"} src={url} onLoad={() => { setLoaded(true); store.setRuntime("loading", 35); }} onError={() => { setLoadTimedOut(true); store.setRuntime("error"); }} className="notebook-frame is-loaded" />}
    {runtimeAvailable && !targetAvailable && <div className="runtime-error"><strong>Notebook 文件未找到</strong><span>{lesson.label} 尚未进入当前运行时，请重新构建 JupyterLite。</span></div>}
    {runtimeAvailable && targetAvailable && !loaded && !loadTimedOut && <div className="runtime-loading-strip" aria-live="polite"><TerminalRounded fontSize="small" /> 正在打开 Notebook，首次加载可能需要几秒</div>}
    {runtimeAvailable && targetAvailable && loadTimedOut && !loaded && <div className="runtime-error"><strong>Notebook 加载较慢</strong><span>运行时仍在后台启动，可以刷新当前章节重试。</span></div>}
  </section>;
}

function ProgressPage({ catalog }) {
  const store = useAppStore();
  const navigate = useNavigate();
  const [recentPage, setRecentPage] = useState(1);
  const complete = Math.round((store.completedIds.length / catalog.chapters.length) * 100);
  const currentLesson = chapterById(catalog.chapters, store.activeChapterId);
  const noteCount = Object.keys(store.chapterNotes || {}).length;
  const recentLessons = store.recentIds
    .map((id) => catalog.chapters.find((item) => item.id === id))
    .filter(Boolean);
  const pageSize = 8;
  const pageCount = Math.max(1, Math.ceil(recentLessons.length / pageSize));
  const visibleLessons = recentLessons.slice((recentPage - 1) * pageSize, recentPage * pageSize);
  useEffect(() => {
    if (recentPage > pageCount) setRecentPage(pageCount);
  }, [pageCount, recentPage]);

  return <main className="dashboard-page"><FadeContent><div className="dashboard-header"><div><div className="dashboard-kicker">学习记录</div><h1>学习概览与最近记录</h1><p className="dashboard-lede">集中查看整体进度、模块完成情况，并从最近学习的章节继续练习。</p></div><Button variant="outlined" startIcon={<ArrowBackRounded />} onClick={() => navigate("/course/" + currentLesson.id)}>返回课程</Button></div><div className="learning-tools"><Button variant="outlined" startIcon={<SchoolRounded />} onClick={() => navigate("/practice")}>练习中心</Button><Button variant="outlined" startIcon={<AssignmentRounded />} onClick={() => navigate("/training")}>我的实训</Button></div><div className="dashboard-grid"><div className="metric-panel"><span className="eyebrow">总完成度</span><strong className="metric-value"><CountUp value={complete} suffix="%" /></strong><span className="metric-note">已完成 {store.completedIds.length} / {catalog.chapters.length} 个章节</span></div><div className="chart-panel"><div className="eyebrow">模块进度</div><BarChart height={220} xAxis={[{ scaleType: "band", data: catalog.modules.map((item) => item.label.replace("与 ", "").replace("Matplotlib ", "MPL ")) }]} series={[{ data: catalog.modules.map((item) => catalog.chapters.filter((chapter) => chapter.module === item.id && store.completedIds.includes(chapter.id)).length) }]} colors={["#2563EB"]} margin={{ left: 36, right: 12, top: 20, bottom: 44 }} /></div></div><section className="learning-records" aria-labelledby="recent-learning-title"><div className="learning-records-heading"><div><div className="eyebrow">最近学习</div><h2 id="recent-learning-title">继续上次的章节</h2></div><span>{recentLessons.length} 条记录 · {noteCount} 篇笔记</span></div>{visibleLessons.length ? <div className="learning-record-list">{visibleLessons.map((item) => { const module = catalog.modules.find((candidate) => candidate.id === item.module); const progress = chapterProgress(store, item.id); const hasNote = Boolean(store.chapterNotes?.[item.id]); return <button type="button" className="learning-record-item" key={item.id} onClick={() => { store.setActiveChapter(item.id); navigate("/course/" + item.id); }}><ChapterProgressRing value={progress} /><span className="learning-record-copy"><strong>第{item.chapter}章 {item.title}</strong><small>{module?.label || "课程章节"}{hasNote && <span className="learning-record-note">有笔记</span>}</small></span><span className="learning-record-progress">{progress}%</span></button>; })}</div> : <div className="learning-record-empty">还没有学习记录，打开任意章节后会在这里显示。</div>}{recentLessons.length > pageSize && <Pagination className="learning-record-pagination" page={recentPage} count={pageCount} color="primary" shape="rounded" onChange={(_, page) => setRecentPage(page)} />}</section><LearningBackupPanel /></FadeContent></main>;
}

function Workspace({ catalog }) {
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
  return <div className="app-frame">{user.role === ROLES.STUDENT && <FirstTimeWelcome />}<Sidebar catalog={catalog} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} /><div className="workspace-main"><div className="workspace-body"><NotebookWorkspace lesson={lesson} previousLesson={previousLesson} nextLesson={nextLesson} lessonPosition={lessonIndex + 1} totalLessons={catalog.chapters.length} onOpenSidebar={() => setMobileOpen(true)} onRuntimeState={(state) => store.setRuntime(state, 100)} /></div></div></div>;
}

function ChapterUnavailable({ onBack }) {
  return <main className="custom-notebook-error chapter-unavailable"><strong>章节不存在或已下线</strong><p>该章节可能已被教师下线、删除，或课程目录已经更新。</p><Button variant="contained" startIcon={<ArrowBackRounded />} onClick={onBack}>返回课程目录</Button></main>;
}

function App() {
  const [catalog, setCatalog] = useState(null);
  const [catalogError, setCatalogError] = useState("");
  useEffect(() => {
    const load = () => loadCourseCatalog().then(setCatalog).catch((error) => setCatalogError(error.message || "课程目录加载失败"));
    load();
    window.addEventListener("course-catalog-updated", load);
    const syncFromOtherTab = (event) => {
      if (event.key === "python-data-studio:custom-course-chapters:v1") load();
    };
    window.addEventListener("storage", syncFromOtherTab);
    return () => {
      window.removeEventListener("course-catalog-updated", load);
      window.removeEventListener("storage", syncFromOtherTab);
    };
  }, []);
  if (catalogError) return <ThemeProvider theme={theme}><CssBaseline /><main className="custom-notebook-error"><strong>课程目录加载失败</strong><p>{catalogError}</p></main></ThemeProvider>;
  if (!catalog) return <ThemeProvider theme={theme}><CssBaseline /><div className="custom-notebook-loading"><div className="loading-bar" /><span>正在加载课程目录</span></div></ThemeProvider>;
  return <ThemeProvider theme={theme}><CssBaseline /><Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/register" element={<RegistrationPage />} />
    <Route path="/about" element={<AboutPage />} />
    <Route path="/runtime-diagnostics" element={<RequireAuth><SessionDock /><RuntimeDiagnostics /></RequireAuth>} />
    <Route path="/forbidden" element={<RequireAuth><ForbiddenPage /></RequireAuth>} />
    <Route path="/course/:chapterId" element={<RequireAuth roles={[ROLES.STUDENT, ROLES.TEACHER]}><Workspace catalog={catalog} /></RequireAuth>} />
    <Route path="/progress" element={<RequireAuth roles={[ROLES.STUDENT]}><SessionDock /><ProgressPage catalog={catalog} /></RequireAuth>} />
    <Route path="/datasets" element={<RequireAuth roles={[ROLES.TEACHER]}><SessionDock /><DatasetCenter variant="teacher" /></RequireAuth>} />
    <Route path="/practice" element={<RequireAuth roles={[ROLES.STUDENT, ROLES.TEACHER]}><SessionDock /><PracticeCenter catalog={catalog} /></RequireAuth>} />
    <Route path="/training" element={<RequireAuth roles={[ROLES.STUDENT]}><SessionDock /><StudentTrainingCenter catalog={catalog} /></RequireAuth>} />
    <Route path="/teaching" element={<RequireAuth roles={[ROLES.TEACHER]}><TeacherCenter /></RequireAuth>} />
    <Route path="/teaching/:section" element={<RequireAuth roles={[ROLES.TEACHER]}><TeacherCenter /></RequireAuth>} />
    <Route path="/school-admin/cdkeys" element={<RequireAuth roles={[ROLES.SCHOOL_ADMIN]}><CdKeyManagement /></RequireAuth>} />
    <Route path="/school-admin" element={<RequireAuth roles={[ROLES.SCHOOL_ADMIN]}><SchoolAdminCenter /></RequireAuth>} />
    <Route path="/school-admin/:section" element={<RequireAuth roles={[ROLES.SCHOOL_ADMIN]}><SchoolAdminCenter /></RequireAuth>} />
    <Route path="/" element={<LandingPage catalog={catalog} />} />
    <Route path="*" element={<RoleHomeRedirect />} />
  </Routes></ThemeProvider>;
}

createRoot(document.getElementById("root")).render(<BrowserRouter><AuthProvider><AppUpdater /><App /></AuthProvider></BrowserRouter>);
