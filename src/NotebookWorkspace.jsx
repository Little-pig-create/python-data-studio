import "./notebook.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import PlayArrowRounded from "@mui/icons-material/PlayArrowRounded";
import AddRounded from "@mui/icons-material/AddRounded";
import StopRounded from "@mui/icons-material/StopRounded";
import RestartAltRounded from "@mui/icons-material/RestartAltRounded";
import MenuRounded from "@mui/icons-material/MenuRounded";
import PlaylistPlayRounded from "@mui/icons-material/PlaylistPlayRounded";
import DownloadRounded from "@mui/icons-material/DownloadRounded";
import NoteAltRounded from "@mui/icons-material/NoteAltRounded";
import RestorePageRounded from "@mui/icons-material/RestorePageRounded";
import DeleteSweepRounded from "@mui/icons-material/DeleteSweepRounded";
import FormatListBulletedRounded from "@mui/icons-material/FormatListBulletedRounded";
import { Alert, Button, ButtonGroup, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Divider, IconButton, Menu, MenuItem, Snackbar, Tab, Tabs, TextField, Tooltip } from "@mui/material";
import { StudioSpeedDial } from "./StudioSpeedDial";
import { useAppStore } from "./store";
import { createRuntimeAdapter } from "./notebookRuntime";
import { deleteNotebookDraft, loadCustomNotebook, loadNotebookDraft, saveNotebookDraft } from "./notebookRepository";
import { normalizeNotebook, serializeNotebook, useNotebookStore } from "./notebookStore";
import { NotebookCell } from "./components/NotebookCell";
import { NotebookNavigation } from "./components/NotebookNavigation";
import { formatPythonSource, getChapterMeta, kernelStatusDetails, kernelStatusLabels, markdownOutline, shutdownNotebookRuntime } from "./utils/notebookHelpers";
import { NotebookSkeleton } from "./LoadingSkeletons";

export function NotebookWorkspace({ lesson, previousLesson, nextLesson, lessonPosition, totalLessons, onOpenSidebar, onRuntimeState }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState({ open: false, message: "", severity: "info" });
  const [clearProgressOpen, setClearProgressOpen] = useState(false);
  const [resetChapterOpen, setResetChapterOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [noteTab, setNoteTab] = useState(0);
  const [outlineAnchor, setOutlineAnchor] = useState(null);
  const [markdownCollapsed, setMarkdownCollapsed] = useState(false);
  const [overviewCollapsed, setOverviewCollapsed] = useState(false);
  const [runningCellId, setRunningCellId] = useState(null);
  const runtimeRef = useRef(null);
  const runtimeInitRef = useRef(null);
  const runtimeGenerationRef = useRef(0);
  const saveTimerRef = useRef(null);
  const draftGenerationRef = useRef(0);
  const savePromiseRef = useRef(Promise.resolve());
  const kernelStatusBindingRef = useRef(null);
  const onRuntimeStateRef = useRef(onRuntimeState);
  const store = useNotebookStore();
  const document = store.document;
  const outline = useMemo(() => markdownOutline(document), [document]);
  const completedIds = useAppStore((state) => state.completedIds);
  const executionProgress = useAppStore((state) => state.chapterExecutionProgress?.[lesson.id]);
  const chapterNote = useAppStore((state) => state.chapterNotes?.[lesson.id] || "");
  const setChapterNote = useAppStore((state) => state.setChapterNote);
  const isCompleted = completedIds.includes(lesson.id);
  const lessonProgress = isCompleted
    ? 100
    : executionProgress?.totalCells
      ? Math.min(100, Math.round((executionProgress.completedCellIds.length / executionProgress.totalCells) * 100))
      : 0;
  const chapterMeta = useMemo(() => getChapterMeta(lesson), [lesson]);
  const contentStats = useMemo(() => {
    const cells = document?.cells || [];
    const codeCells = cells.filter((cell) => cell.type === "code");
    return {
      total: cells.length,
      code: codeCells.length,
      markdown: cells.filter((cell) => cell.type === "markdown").length,
      runnable: codeCells.filter((cell) => !cell.metadata?.tags?.includes("solution")).length,
      solutions: codeCells.filter((cell) => cell.metadata?.tags?.includes("solution")).length
    };
  }, [document]);
  onRuntimeStateRef.current = onRuntimeState;

  const publishKernelStatus = useCallback((kernelStatus) => {
    const [runtimeState, message] = kernelStatusDetails[kernelStatus]
      || ["loading", "正在同步内核状态"];
    useNotebookStore.getState().setRuntime(runtimeState, message);
    onRuntimeStateRef.current?.(runtimeState);
  }, []);

  const clearKernelStatusBinding = useCallback(() => {
    const binding = kernelStatusBindingRef.current;
    if (!binding) return;
    binding.kernel.statusChanged.disconnect(binding.onStatusChanged);
    binding.kernel.connectionStatusChanged.disconnect(binding.onConnectionStatusChanged);
    kernelStatusBindingRef.current = null;
  }, []);

  const bindKernelStatus = useCallback((runtime) => {
    clearKernelStatusBinding();
    const kernel = runtime?.session?.kernel;
    if (!kernel) {
      useNotebookStore.getState().setRuntime("error", "Python 内核不可用");
      onRuntimeStateRef.current?.("error");
      return;
    }

    const onStatusChanged = (_, status) => publishKernelStatus(status);
    const onConnectionStatusChanged = (_, status) => {
      if (status === "connected") {
        publishKernelStatus(kernel.status);
      } else if (status === "connecting") {
        useNotebookStore.getState().setRuntime("loading", "正在重新连接内核");
        onRuntimeStateRef.current?.("loading");
      } else {
        useNotebookStore.getState().setRuntime("error", "内核连接已断开");
        onRuntimeStateRef.current?.("error");
      }
    };

    kernel.statusChanged.connect(onStatusChanged);
    kernel.connectionStatusChanged.connect(onConnectionStatusChanged);
    kernelStatusBindingRef.current = {
      kernel,
      onStatusChanged,
      onConnectionStatusChanged
    };
    onConnectionStatusChanged(kernel, kernel.connectionStatus);
  }, [clearKernelStatusBinding, publishKernelStatus]);

  useEffect(() => {
    let disposed = false;
    runtimeGenerationRef.current += 1;
    runtimeInitRef.current = null;
    setLoading(true);
    setError("");
    setRunningCellId(null);
    runtimeRef.current = null;
    store.setRuntime("loading", "正在读取 Notebook");

    const loadSource = lesson.customNotebookId
      ? loadCustomNotebook(lesson.customNotebookId).then((record) => {
        if (!record?.notebook) throw new Error("自定义 Notebook 内容未找到");
        return record.notebook;
      })
      : fetch(lesson.path, { cache: "no-store" }).then((response) => {
        if (!response.ok) throw new Error("Notebook 文件未找到");
        return response.json();
      });
    loadSource.then(async (source) => {
      const key = `course:${lesson.id}`;
      const draft = await loadNotebookDraft(key).catch(() => null);
      const sourceVersion = source?.metadata?.course_content_version ?? 1;
      const draftVersion = draft?.metadata?.course_content_version ?? 1;
      const baseDocument = normalizeNotebook(source);
      baseDocument.cells = baseDocument.cells.map((cell) => cell.type === "code"
        ? { ...cell, source: formatPythonSource(cell.source) }
        : cell);
      const compatibleDraft = draftVersion === sourceVersion && draft?.cells?.length === baseDocument.cells.length ? draft : null;
      const loadedDocument = normalizeNotebook(compatibleDraft || source);
      if (compatibleDraft && loadedDocument.cells.length === baseDocument.cells.length) {
        loadedDocument.cells = loadedDocument.cells.map((cell, index) => {
          const baseCell = baseDocument.cells[index];
          return cell.source === baseCell.source ? { ...cell, type: baseCell.type } : cell;
        });
      }
      if (!disposed) store.setDocument(key, loadedDocument);
      if (!disposed) { setLoading(false); store.setRuntime("loading", "正在初始化内核"); }
    }).catch((reason) => {
      if (!disposed) { setError(reason.message || "Notebook 加载失败"); setLoading(false); store.setRuntime("error", "Notebook 加载失败"); }
    });
    return () => {
      disposed = true;
      runtimeGenerationRef.current += 1;
      runtimeInitRef.current = null;
      const currentState = useNotebookStore.getState();
      const notebookKey = `course:${lesson.id}`;
      if (currentState.notebookKey === notebookKey && currentState.document) {
        void saveNotebookDraft(
          notebookKey,
          serializeNotebook(currentState.document)
        ).catch(() => {});
      }
      clearKernelStatusBinding();
      const runtime = runtimeRef.current;
      runtimeRef.current = null;
      void shutdownNotebookRuntime(runtime);
    };
  }, [clearKernelStatusBinding, lesson.id]);

  useEffect(() => () => { if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current); }, []);

  const addCell = useCallback((index, type) => store.insertCell(index, type), [store]);
  const moveCell = useCallback((id, direction) => store.moveCell(id, direction), [store]);
  const deleteCell = useCallback((id) => store.deleteCell(id), [store]);
  const duplicateCell = useCallback((index) => {
    if (!document) return;
    const copy = { ...document.cells[index], id: `cell-${Date.now()}`, outputs: [] };
    const cells = [...document.cells];
    cells.splice(index + 1, 0, copy);
    store.setDocument(document.notebookKey || `course:${lesson.id}`, { ...document, cells });
    store.setDirty(true);
  }, [document, lesson.id, store]);

  const ensureRuntime = useCallback(async () => {
    const notebookPath = `course-${lesson.id}.ipynb`;
    const notebookKey = `course:${lesson.id}`;
    const currentDocument = useNotebookStore.getState().document;
    if (!currentDocument || useNotebookStore.getState().notebookKey !== notebookKey) {
      throw new Error("Notebook 尚未加载完成");
    }

    const currentRuntime = runtimeRef.current;
    const currentKernel = currentRuntime?.session?.kernel;
    if (
      currentRuntime
      && currentRuntime.notebookPath === notebookPath
      && currentKernel
      && !currentKernel.isDisposed
      && currentKernel.status !== "dead"
      && currentKernel.connectionStatus !== "disconnected"
    ) {
      return currentRuntime;
    }
    if (currentRuntime) {
      clearKernelStatusBinding();
      await shutdownNotebookRuntime(currentRuntime);
      runtimeRef.current = null;
    }
    if (runtimeInitRef.current) return runtimeInitRef.current;
    const generation = runtimeGenerationRef.current;
    const initialization = (async () => {
      useNotebookStore.getState().setRuntime("loading", "正在启动 Python 内核");
      const runtime = await createRuntimeAdapter(notebookPath);
      if (generation !== runtimeGenerationRef.current) {
        await shutdownNotebookRuntime(runtime);
        throw new Error("Notebook 已切换，内核初始化已取消");
      }
      runtimeRef.current = runtime;
      bindKernelStatus(runtime);
      return runtime;
    })();
    runtimeInitRef.current = initialization;
    try {
      return await initialization;
    } finally {
      if (runtimeInitRef.current === initialization) runtimeInitRef.current = null;
    }
  }, [bindKernelStatus, clearKernelStatusBinding, lesson.id]);

  useEffect(() => {
    if (
      !document
      || store.notebookKey !== `course:${lesson.id}`
      || loading
      || error
      || useNotebookStore.getState().runtimeState === "error"
      || runtimeRef.current
      || runtimeInitRef.current
    ) return undefined;
    let active = true;
    ensureRuntime()
      .then((runtime) => {
        if (active) {
          setToast({ open: true, message: `${runtime.native ? "本地" : "浏览器内"} Python 内核已创建`, severity: "success" });
        }
      })
      .catch((reason) => {
        if (!active) return;
        useNotebookStore.getState().setRuntime("error", reason.message || "内核初始化失败");
        setToast({ open: true, message: reason.message || "内核初始化失败", severity: "error" });
      });
    return () => { active = false; };
  }, [document, error, ensureRuntime, lesson.id, loading, store.notebookKey]);

  const runCell = useCallback(async (cell) => {
    if (cell.type !== "code" || !document) return false;
    setRunningCellId(cell.id);
    let runtime = null;
    try {
      runtime = await ensureRuntime();
      const currentCell = store.document?.cells.find((item) => item.id === cell.id);
      if (!currentCell) throw new Error("单元格不存在");

      const result = await runtime.execute(currentCell.source || "");

      store.updateCellResult(cell.id, {
        outputs: result.outputs,
        executionCount: result.executionCount
      });

      // Python exceptions are valid kernel responses. Keep the kernel usable,
      // persist the error output in the cell, and let the caller show a failure toast.
      if (result.error) {
        return false;
      }

      const runnableCells = store.document?.cells.filter(
        (item) => item.type === "code" && !item.metadata?.tags?.includes("solution")
      ) || [];
      useAppStore.getState().recordSuccessfulCell(lesson.id, cell.id, runnableCells.length);

      return true;
    } catch (reason) {
      const kernel = runtime?.session?.kernel;
      if (
        kernel
        && !kernel.isDisposed
        && kernel.status !== "dead"
        && kernel.connectionStatus !== "disconnected"
      ) {
        publishKernelStatus(kernel.status);
      } else {
        store.setRuntime("error", reason?.message || "运行失败");
      }
      return false;
    } finally {
      setRunningCellId((currentId) => currentId === cell.id ? null : currentId);
    }
  }, [document, ensureRuntime, lesson.id, publishKernelStatus, store]);

  useEffect(() => {
    if (!document || !store.dirty || !store.notebookKey) return;
    window.clearTimeout(saveTimerRef.current);
    const notebookKey = store.notebookKey;
    const documentSnapshot = document;
    const draftGeneration = draftGenerationRef.current;
    saveTimerRef.current = window.setTimeout(() => {
      const savePromise = saveNotebookDraft(notebookKey, serializeNotebook(documentSnapshot))
        .then(() => {
          const currentState = useNotebookStore.getState();
          if (
            draftGeneration === draftGenerationRef.current
            &&
            currentState.notebookKey === notebookKey
            && currentState.document === documentSnapshot
          ) {
            currentState.setDirty(false);
          }
        })
        .catch(() => {});
      savePromiseRef.current = savePromise;
    }, 600);
  }, [document, store.dirty, store.notebookKey]);

  useEffect(() => {
    setMarkdownCollapsed(false);
    setOverviewCollapsed(false);
  }, [lesson.id]);

  const download = () => {
    if (!document) return;
    const blob = new Blob([JSON.stringify(serializeNotebook(document), null, 2)], { type: "application/x-ipynb+json" });
    const url = URL.createObjectURL(blob);
    const anchor = window.document.createElement("a");
    anchor.href = url;
    anchor.download = lesson.label.replaceAll(" ", "_") + ".ipynb";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const activeCell = document?.cells.find((cell) => cell.id === store.activeCellId);
  const hasCodeCells = document?.cells.some((cell) => cell.type === "code");
  const runtimeStarted = Boolean(runtimeRef.current);
  const showToast = (message, severity = "info") => setToast({ open: true, message, severity });
  const runCellFromCell = async (cell) => {
    showToast("正在运行单元格");
    const succeeded = await runCell(cell);
    showToast(succeeded ? "单元格运行完成" : "单元格运行失败", succeeded ? "success" : "error");
  };
  const runActiveCell = async () => {
    if (!activeCell || activeCell.type !== "code" || activeCell.metadata?.tags?.includes("solution")) return;
    showToast("正在运行当前单元格");
    const succeeded = await runCell(activeCell);
    showToast(succeeded ? "当前单元格运行完成" : "当前单元格运行失败", succeeded ? "success" : "error");
  };
  const runAllCells = async () => {
    const codeCells = document?.cells.filter((cell) => cell.type === "code" && !cell.metadata?.tags?.includes("solution")) || [];
    if (!codeCells.length) return;
    showToast(`正在运行 ${codeCells.length} 个代码单元格`);
    for (let index = 0; index < codeCells.length; index += 1) {
      const succeeded = await runCell(codeCells[index]);
      if (!succeeded) {
        showToast(`运行在第 ${index + 1} 个代码单元格处中断`, "error");
        return;
      }
    }
    if (useAppStore.getState().completedIds.includes(lesson.id)) {
      showToast("全部单元格通过，本章已标记完成 ✓", "success");
    } else {
      showToast("全部代码单元格运行完成", "success");
    }
  };
  const stopRuntime = async () => {
    try {
      await runtimeRef.current?.interrupt?.();
      const kernel = runtimeRef.current?.session?.kernel;
      if (kernel) publishKernelStatus(kernel.status);
      showToast("已停止当前运行", "success");
    } catch (reason) {
      showToast(reason.message || "停止运行失败", "error");
    }
  };
  const restartRuntime = async () => {
    const session = runtimeRef.current?.session;
    if (!session || typeof session.restart !== "function") {
      store.setRuntime("error", "Python 内核不可用");
      showToast("Python 内核尚未就绪，请稍后重试", "error");
      return;
    }
    if (store.runtimeState === "busy") {
      showToast("当前仍有代码运行，请先停止后再重启", "warning");
      return;
    }
    try {
      showToast("正在重启 Python");
      await runtimeRef.current.restart();
      if (session.kernel?.status === "dead") throw new Error("Python 内核已停止");
      publishKernelStatus(session.kernel?.status);
      showToast("Python 已重新启动", "success");
    } catch (reason) {
      store.setRuntime("error", "Python 重启失败");
      showToast(reason?.message || "Python 重启失败", "error");
    }
  };
  const downloadNotebook = () => {
    download();
    showToast("Notebook 已开始下载", "success");
  };
  const openChapterNote = () => {
    setNoteDraft(chapterNote);
    setNoteTab(0);
    setNoteOpen(true);
  };
  const saveChapterNote = () => {
    setChapterNote(lesson.id, noteDraft);
    setNoteOpen(false);
    showToast(noteDraft.trim() ? "本章笔记已保存" : "本章笔记已清除", "success");
  };
  const openOutline = (event) => setOutlineAnchor(event.currentTarget);
  const closeOutline = () => setOutlineAnchor(null);
  const jumpToOutline = (cellId) => {
    closeOutline();
    window.requestAnimationFrame(() => {
      window.document.getElementById("notebook-cell-" + cellId)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };
  const scrollToFirstCode = () => {
    const target = document?.cells.find((cell) => cell.type === "code");
    if (!target) {
      showToast("本章暂时没有代码单元格", "info");
      return;
    }
    window.document.getElementById("notebook-cell-" + target.id)?.scrollIntoView({ behavior: "smooth", block: "center" });
    useNotebookStore.getState().selectCell(target.id);
    showToast("已定位到第一个代码单元格", "success");
  };
  const toggleAllMarkdown = () => {
    setMarkdownCollapsed((value) => !value);
    showToast(markdownCollapsed ? "已展开全部说明" : "已收起全部说明", "success");
  };
  const resetCurrentChapter = async () => {
    setResetChapterOpen(false);
    try {
      setLoading(true);
      draftGenerationRef.current += 1;
      window.clearTimeout(saveTimerRef.current);
      await savePromiseRef.current;
      const source = lesson.customNotebookId
        ? await loadCustomNotebook(lesson.customNotebookId).then((record) => record?.notebook)
        : await fetch(lesson.path, { cache: "no-store" }).then((response) => {
          if (!response.ok) throw new Error("无法读取课程原始 Notebook");
          return response.json();
        });
      if (!source) throw new Error("无法读取课程原始 Notebook");
      runtimeGenerationRef.current += 1;
      runtimeInitRef.current = null;
      clearKernelStatusBinding();
      const runtime = runtimeRef.current;
      runtimeRef.current = null;
      await shutdownNotebookRuntime(runtime);
      await deleteNotebookDraft("course:" + lesson.id);
      store.setDocument("course:" + lesson.id, normalizeNotebook(source));
      store.setRuntime("loading", "正在初始化内核");
      setLoading(false);
      showToast("本章已恢复为课程原始内容", "success");
    } catch (reason) {
      setLoading(false);
      store.setRuntime("error", "重置本章失败");
      showToast(reason?.message || "重置本章失败", "error");
    }
  };
  return <section className="custom-notebook-shell" aria-label={`${lesson.label} Notebook`}>
    <header className="chapter-learning-header chapter-learning-header-compact">
      <div className="chapter-learning-heading">
        <div className="chapter-learning-kicker"><span>{chapterMeta.moduleLabel}</span><span className="chapter-position-chip">第 {lessonPosition || lesson.chapter} / {totalLessons || "—"} 章</span><span className="chapter-version-chip">v0.1.0</span><span className={`chapter-kernel-state state-${store.runtimeState}`}><span />{store.runtimeState === "loading" ? store.runtimeMessage : (kernelStatusLabels[store.runtimeState] || "未知")}</span></div>
      </div>
      <div className="chapter-learning-header-actions" aria-label="工作台快捷入口">
        <StudioSpeedDial />
      </div>
    </header>
    <div className="custom-notebook-toolbar">
      <Tooltip title="打开课程目录"><IconButton size="small" className="mobile-menu notebook-mobile-menu" onClick={onOpenSidebar} aria-label="打开课程目录"><MenuRounded /></IconButton></Tooltip>
      <div className="custom-notebook-actions">
        <ButtonGroup variant="text" size="small" className="notebook-run-group" aria-label="Notebook 运行操作">
          <Button startIcon={<PlayArrowRounded />} disabled={!activeCell || activeCell.type !== "code" || activeCell.metadata?.tags?.includes("solution") || store.runtimeState === "busy"} onClick={runActiveCell}>运行</Button>
          <Button startIcon={<PlaylistPlayRounded />} disabled={!hasCodeCells || store.runtimeState === "busy"} onClick={runAllCells}>全部运行</Button>
        </ButtonGroup>
        <Divider orientation="vertical" flexItem className="custom-action-divider" />
        <Tooltip title="停止运行"><span><IconButton size="small" disabled={store.runtimeState !== "busy"} onClick={stopRuntime} aria-label="停止运行"><StopRounded fontSize="small" /></IconButton></span></Tooltip>
        <Tooltip title="重启 Python"><span><IconButton size="small" disabled={!runtimeStarted || store.runtimeState === "loading" || store.runtimeState === "busy"} onClick={restartRuntime} aria-label="重启 Python"><RestartAltRounded fontSize="small" /></IconButton></span></Tooltip>
        <Divider orientation="vertical" flexItem className="custom-action-divider" />
        <Tooltip title="本章目录"><span><IconButton size="small" disabled={!outline.length} onClick={openOutline} aria-label="打开本章目录"><FormatListBulletedRounded fontSize="small" /></IconButton></span></Tooltip>
        <Tooltip title="跳到第一个代码单元格"><IconButton size="small" disabled={!hasCodeCells} onClick={scrollToFirstCode} aria-label="跳到第一个代码单元格"><PlayArrowRounded fontSize="small" /></IconButton></Tooltip>
        <Divider orientation="vertical" flexItem className="custom-action-divider" />
        <Tooltip title="下载 Notebook"><IconButton size="small" onClick={downloadNotebook} aria-label="下载 Notebook"><DownloadRounded fontSize="small" /></IconButton></Tooltip>
        <Tooltip title="学习笔记"><IconButton size="small" onClick={openChapterNote} aria-label="编辑本章学习笔记"><NoteAltRounded fontSize="small" /></IconButton></Tooltip>
        <Tooltip title="恢复本章原始内容"><IconButton size="small" onClick={() => setResetChapterOpen(true)} aria-label="恢复本章原始内容"><RestorePageRounded fontSize="small" /></IconButton></Tooltip>
        <Tooltip title="清除学习记录">
          <IconButton size="small" onClick={() => setClearProgressOpen(true)} aria-label="清除学习记录">
            <DeleteSweepRounded fontSize="small" />
          </IconButton>
        </Tooltip>
        <Divider orientation="vertical" flexItem className="custom-action-divider" />
        {chapterNote && <Tooltip title="本章已有学习笔记"><span className="notebook-note-badge"><NoteAltRounded fontSize="small" />有笔记</span></Tooltip>}
      </div>
    </div>
    {loading && <NotebookSkeleton />}
    {error && <div className="custom-notebook-error">{error}</div>}
    {!loading && !error && document && <div className="custom-notebook-scroll"><div className="custom-notebook-canvas">{document.cells.map((cell, index) => <NotebookCell key={cell.id} cell={cell} index={index} codeIndex={cell.type === "code" ? document.cells.slice(0, index + 1).filter((item) => item.type === "code").length : null} cellCount={document.cells.length} runningCellId={runningCellId} onRun={runCellFromCell} onAdd={addCell} onMove={moveCell} onDelete={deleteCell} onDuplicate={duplicateCell} markdownCollapsed={markdownCollapsed && cell.type === "markdown"} onToggleMarkdown={(cellId) => { setMarkdownCollapsed(false); window.document.getElementById("notebook-cell-" + cellId)?.scrollIntoView({ behavior: "smooth", block: "center" }); }} />)}<NotebookNavigation previousLesson={previousLesson} nextLesson={nextLesson} lessonPosition={lessonPosition || lesson.chapter} totalLessons={totalLessons} /></div><div className="custom-notebook-end"><button onClick={() => addCell(document.cells.length, "code")}><AddRounded fontSize="small" />添加代码单元格</button><button onClick={() => addCell(document.cells.length, "markdown")}><AddRounded fontSize="small" />添加文本单元格</button></div></div>}
    <Menu anchorEl={outlineAnchor} open={Boolean(outlineAnchor)} onClose={closeOutline} MenuListProps={{ "aria-label": "本章目录" }} PaperProps={{ className: "notebook-outline-menu" }}>
      {outline.map((item) => <MenuItem key={item.cellId + "-" + item.title} className={"notebook-outline-item level-" + item.level} onClick={() => jumpToOutline(item.cellId)}>{item.title}</MenuItem>)}
    </Menu>
    <Dialog open={clearProgressOpen} onClose={() => setClearProgressOpen(false)} aria-labelledby="clear-learning-progress-title">
      <DialogTitle id="clear-learning-progress-title">清除全部学习记录？</DialogTitle>
      <DialogContent>
        <DialogContentText>所有章节的完成状态和运行进度将归零。Notebook 内容和代码不会被删除。</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setClearProgressOpen(false)}>取消</Button>
        <Button color="error" onClick={() => {
          useAppStore.getState().clearLearningProgress();
          setClearProgressOpen(false);
          showToast("学习记录已清除", "success");
        }}>清除记录</Button>
      </DialogActions>
    </Dialog>
    <Dialog open={resetChapterOpen} onClose={() => setResetChapterOpen(false)} aria-labelledby="reset-current-chapter-title">
      <DialogTitle id="reset-current-chapter-title">恢复本章原始内容？</DialogTitle>
      <DialogContent>
        <DialogContentText>本章编辑过的代码、添加的单元格和运行输出将被移除，并恢复为课程初始版本。其他章节和学习进度不会受到影响。</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setResetChapterOpen(false)}>取消</Button>
        <Button color="error" onClick={resetCurrentChapter}>恢复原始内容</Button>
      </DialogActions>
    </Dialog>
    <Dialog open={noteOpen} onClose={() => setNoteOpen(false)} aria-labelledby="chapter-note-title" fullWidth maxWidth="sm">
      <DialogTitle id="chapter-note-title">本章学习笔记</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 1.5 }}>
          支持 Markdown：标题、列表、代码块、引用、表格和任务清单。保存后可在学习记录中继续查看。
        </DialogContentText>
        <Tabs
          value={noteTab}
          onChange={(_, value) => setNoteTab(value)}
          aria-label="学习笔记编辑和预览"
          className="chapter-note-tabs"
          variant="fullWidth"
        >
          <Tab label="编辑 Markdown" />
          <Tab label="预览" />
        </Tabs>
        {noteTab === 0 ? (
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={10}
            value={noteDraft}
            onChange={(event) => setNoteDraft(event.target.value)}
            placeholder={"# 本章重点\n\n- 记录一个易错点\n- 写下待验证的问题\n\n```python\n# 示例代码\n```"}
            inputProps={{ maxLength: 4000, "aria-label": "本章学习笔记 Markdown 内容" }}
            sx={{ mt: 1.5 }}
          />
        ) : (
          <div className="chapter-note-preview" aria-label="学习笔记预览">
            {noteDraft.trim() ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
                {noteDraft}
              </ReactMarkdown>
            ) : (
              <p className="chapter-note-empty">暂无笔记内容，切换到“编辑 Markdown”开始记录。</p>
            )}
          </div>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setNoteOpen(false)}>取消</Button>
        <Button variant="contained" onClick={saveChapterNote}>保存笔记</Button>
      </DialogActions>
    </Dialog>
    <Snackbar open={toast.open} autoHideDuration={2600} anchorOrigin={{ vertical: "top", horizontal: "center" }} sx={{ top: { xs: 68, sm: 72 } }} onClose={(_, reason) => { if (reason !== "clickaway") setToast((value) => ({ ...value, open: false })); }}>
      <Alert severity={toast.severity} variant="filled" onClose={() => setToast((value) => ({ ...value, open: false }))}>{toast.message}</Alert>
    </Snackbar>
  </section>;
}



