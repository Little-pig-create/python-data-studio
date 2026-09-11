import "./notebook.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeSanitize from "rehype-sanitize";
import rehypeKatex from "rehype-katex";
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
import KeyboardRounded from "@mui/icons-material/KeyboardRounded";
import { Alert, Button, ButtonGroup, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Divider, IconButton, Menu, MenuItem, Snackbar, Tab, Tabs, TextField, Tooltip } from "@mui/material";
import { StudioSpeedDial } from "./StudioSpeedDial";
import { useAppStore } from "./store";
import { useAuth } from "./AuthProvider";
import { createRuntimeAdapter, getPreferredRuntimeKind } from "./notebookRuntime";
import { loadCourseNotebook } from "./courseNotebookCache";
import { normalizeDependencies, readInstalledPackages } from "./studentPackageStore";
import { deleteNotebookDraft, loadCustomNotebook, loadNotebookDraft, saveNotebookDraft } from "./notebookRepository";
import { normalizeNotebook, serializeNotebook, useNotebookStore } from "./notebookStore";
import { NotebookCell } from "./components/NotebookCell";
import { autoSplitDocumentCells } from "./lib/markdownSplit";
import { NotebookNavigation } from "./components/NotebookNavigation";
import { formatPythonSource, getChapterMeta, isCodeCell, isMarkdownCell, kernelStatusLabels, markdownOutline, shutdownNotebookRuntime } from "./utils/notebookHelpers";
import { NotebookSkeleton } from "./LoadingSkeletons";
import { useKernelStatus } from "./hooks/useKernelStatus";
import { APP_VERSION } from "./appVersion";

export function NotebookWorkspace({ lesson, previousLesson, nextLesson, lessonPosition, totalLessons, onOpenSidebar, onRuntimeState }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState({ open: false, message: "", severity: "info" });
  const [clearProgressOpen, setClearProgressOpen] = useState(false);
  const [resetChapterOpen, setResetChapterOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [noteTab, setNoteTab] = useState(0);
  const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false);
  const [outlineAnchor, setOutlineAnchor] = useState(null);
  const [markdownCollapsed, setMarkdownCollapsed] = useState(false);
  const [overviewCollapsed, setOverviewCollapsed] = useState(false);
  const [runningCellId, setRunningCellId] = useState(null);
  const [runtimeWarmupToken, setRuntimeWarmupToken] = useState(0);
  const runtimeRef = useRef(null);
  const runtimeInitRef = useRef(null);
  const runtimeGenerationRef = useRef(0);
  const saveTimerRef = useRef(null);
  const draftGenerationRef = useRef(0);
  const savePromiseRef = useRef(Promise.resolve());
  const cellClipboardRef = useRef(null);
  const shortcutSequenceRef = useRef({ key: "", time: 0 });
  const onRuntimeStateRef = useRef(onRuntimeState);
  const store = useNotebookStore();
  const { user } = useAuth();
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

  // 内核状态绑定（信号 → 应用状态）已抽到独立 hook，便于测试与复用。
  // publishKernelStatus 仍被运行单元格等逻辑直接使用，因此一并取出。
  const { bindKernelStatus, clearKernelStatusBinding, publishKernelStatus } = useKernelStatus(onRuntimeState);

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
      : loadCourseNotebook(lesson.path);
    loadSource.then(async (source) => {
      const key = `course:${lesson.id}`;
      const draft = await loadNotebookDraft(key).catch(() => null);
      // 内容指纹优先于人工维护的版本号，避免“版本号不变但内容已经变化”时
      // 继续加载旧草稿。旧 Notebook 没有指纹时，仍兼容原有版本字段。
      const sourceVersion = source?.metadata?.content_fingerprint
        ?? source?.metadata?.course_content_version
        ?? 1;
      const draftVersion = draft?.metadata?.content_fingerprint
        ?? draft?.metadata?.course_content_version
        ?? 1;
      const baseDocument = normalizeNotebook(source);
      baseDocument.cells = baseDocument.cells.map((cell) => cell.type === "code"
        ? { ...cell, source: formatPythonSource(cell.source) }
        : cell);
      // 加载即自动拆分：多元素 markdown cell 拆成独立 cell。
      // 基准与草稿使用同一拆分结构，保证草稿兼容性检查幂等（草稿是拆后结构时仍能命中）。
      autoSplitDocumentCells(baseDocument);
      const compatibleDraft = draftVersion === sourceVersion && draft?.cells?.length === baseDocument.cells.length ? draft : null;
      const loadedDocument = normalizeNotebook(compatibleDraft || source);
      if (compatibleDraft && loadedDocument.cells.length === baseDocument.cells.length) {
        loadedDocument.cells = loadedDocument.cells.map((cell, index) => {
          const baseCell = baseDocument.cells[index];
          return cell.source === baseCell.source ? { ...cell, type: baseCell.type } : cell;
        });
      }
      if (!compatibleDraft) autoSplitDocumentCells(loadedDocument);
      if (!disposed) store.setDocument(key, loadedDocument);
      if (!disposed) {
        const nativeRuntime = getPreferredRuntimeKind() === "native";
        setLoading(false);
        store.setRuntime(
          nativeRuntime ? "loading" : "idle",
          nativeRuntime ? "正在准备 Python 内核" : "首次运行代码时启动 Python"
        );
        onRuntimeStateRef.current?.(nativeRuntime ? "loading" : "idle");
      }
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


  // 提示条（提前声明，供拆分等回调使用）
  const showToast = useCallback((message, severity = "info") => setToast({ open: true, message, severity }), []);

  // 展开某个被折叠的 markdown 单元格并滚动到它。
  // 必须 memo：否则每次渲染都新建函数，NotebookCell 的 props 永远变化，
  // 列表里所有单元格会跟着重渲染（输入时有明显卡顿）。
  const handleToggleMarkdown = useCallback((cellId) => {
    setMarkdownCollapsed(false);
    window.document.getElementById(`notebook-cell-${cellId}`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  // 每个代码单元格在"代码格序列"里的序号。
  // 旧实现为每个单元格都做一次 slice+filter，整体是 O(n²)；
  // 这里一次遍历算出映射表，渲染时 O(1) 查表。
  const codeIndexMap = useMemo(() => {
    const map = new Map();
    let seen = 0;
    for (const cell of document?.cells || []) {
      if (isCodeCell(cell)) {
        seen += 1;
        map.set(cell.id, seen);
      }
    }
    return map;
  }, [document?.cells]);

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
      const runtime = await createRuntimeAdapter(notebookPath, {
        onStatus: (message) => {
          if (generation !== runtimeGenerationRef.current) return;
          useNotebookStore.getState().setRuntime("loading", message);
          onRuntimeStateRef.current?.("loading");
        },
        // 内核启动是有明确阶段的：把百分比一并展示，避免"卡死"的错觉。
        onProgress: ({ label, percent }) => {
          if (generation !== runtimeGenerationRef.current) return;
          useNotebookStore.getState().setRuntime("loading", `${label}（${percent}%）`, percent);
          onRuntimeStateRef.current?.("loading");
        },
      });
      const dependencies = normalizeDependencies([
        ...readInstalledPackages(user?.userId),
        ...(Array.isArray(lesson.dependencies) ? lesson.dependencies : []),
      ]);
      try {
        if (dependencies.length) {
          useNotebookStore.getState().setRuntime("loading", "正在准备全局依赖");
          await runtime.installPackages?.(dependencies);
        }
        if (generation !== runtimeGenerationRef.current) {
          throw new Error("Notebook 已切换，内核初始化已取消");
        }
      } catch (reason) {
        await shutdownNotebookRuntime(runtime);
        throw reason;
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
  }, [bindKernelStatus, clearKernelStatusBinding, lesson.dependencies, lesson.id, user?.userId]);

  // Warm the kernel up as soon as the notebook is visible, so the header shows a
  // real kernel state instead of staying at “未启动” until the first click on Run.
  // Browser (JupyterLite) benefits the most: it avoids waiting for kernel creation
  // + big package downloads (numpy/pandas/matplotlib) on the first Run click.
  //
  // 注意守卫条件用的是 **store 的 notebookKey**，而不是 `document.notebookKey`。
  // `normalizeNotebook()` 产出的 document 上从来没有这个字段，早期版本因此让整个
  // 预热逻辑静默失效：内核只会在用户第一次点“运行”时才冷启动。
  useEffect(() => {
    if (loading || error || !store.notebookKey) return undefined;

    let cancelled = false;
    const warmup = window.setTimeout(async () => {
      try {
        const runtime = await ensureRuntime();
        if (cancelled) return undefined;
        // 浏览器端：只预加载**本章实际用到**的包。
        // 第 1–14 章（Python 基础）不需要任何第三方包，跳过可省约 22 MB 下载。
        if (getPreferredRuntimeKind() !== "native") {
          const chapterSource = (useNotebookStore.getState().document?.cells || [])
            .filter((cell) => cell.type === "code")
            .map((cell) => String(cell.source || ""))
            .join("\n");
          void runtime.prewarm?.({ source: chapterSource });
        }
      } catch (reason) {
        if (cancelled) return undefined;
        const message = reason?.message || "Python 内核启动失败";
        useNotebookStore.getState().setRuntime("error", message);
        onRuntimeStateRef.current?.("error");
      }
      return undefined;
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(warmup);
    };
  }, [store.notebookKey, ensureRuntime, error, loading, lesson.id, runtimeWarmupToken]);

  const runCell = useCallback(async (cell) => {
    if (cell.type !== "code" || !document) return false;
    const mayChangeFiles = /\b(?:open|mkdir|makedirs|touch|rename|replace|unlink|remove|rmdir)\s*\(|\.(?:write_text|write_bytes|to_csv|to_json|to_excel|savefig)\s*\(/.test(cell.source || "");
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
      // 模块大作业不能因为运行几个说明性或准备性单元就被标记完成。
      // 只有带 capstone-verify 标签的最终验收单元成功运行时，才记录完成状态；
      // 没有该标签的旧大作业仍保持原有的逐 Cell 学习进度逻辑。
      const capstoneVerifier = lesson.kind === "capstone"
        ? runnableCells.find((item) => item.metadata?.tags?.includes("capstone-verify"))
        : null;
      if (!capstoneVerifier) {
        useAppStore.getState().recordSuccessfulCell(lesson.id, cell.id, runnableCells.length);
      } else if (cell.id === capstoneVerifier.id) {
        useAppStore.getState().recordSuccessfulCell(lesson.id, cell.id, 1);
      }

      return true;
    } catch (reason) {
      const failureMessage = reason?.message || (typeof reason === "string" ? reason : "Python 单元格运行失败");
      const kernel = runtime?.session?.kernel;
      if (
        kernel
        && !kernel.isDisposed
        && kernel.status !== "dead"
        && kernel.connectionStatus !== "disconnected"
      ) {
        publishKernelStatus(kernel.status);
      }
      store.setRuntime("error", failureMessage);
      return false;
    } finally {
      if (mayChangeFiles) window.dispatchEvent(new Event("runtime-files-changed"));
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
  const focusNotebookCell = useCallback((cellId, editMode = false) => {
    if (!cellId) return;
    window.requestAnimationFrame(() => {
      const cellElement = window.document.getElementById("notebook-cell-" + cellId);
      if (!cellElement) return;
      cellElement.scrollIntoView({ behavior: "smooth", block: "center" });
      if (editMode) {
        window.dispatchEvent(new CustomEvent("notebook-edit-cell", { detail: { cellId } }));
      } else {
        cellElement.focus({ preventScroll: true });
      }
    });
  }, []);
  const selectCellAtIndex = useCallback((index, editMode = false) => {
    const state = useNotebookStore.getState();
    const cells = state.document?.cells || [];
    if (!cells.length) return null;
    const target = cells[Math.max(0, Math.min(index, cells.length - 1))];
    state.selectCell(target.id);
    focusNotebookCell(target.id, editMode);
    return target;
  }, [focusNotebookCell]);
  const runCellAndAdvance = useCallback(async (cell) => {
    if (!cell || cell.type !== "code" || cell.metadata?.tags?.includes("solution")) return;
    showToast("正在运行单元格");
    const succeeded = await runCell(cell);
    showToast(succeeded ? "单元格运行完成" : "单元格运行失败", succeeded ? "success" : "error");
    if (!succeeded) return;
    const state = useNotebookStore.getState();
    const cells = state.document?.cells || [];
    const currentIndex = cells.findIndex((item) => item.id === cell.id);
    if (currentIndex >= 0 && currentIndex < cells.length - 1) {
      selectCellAtIndex(currentIndex + 1);
      return;
    }
    state.insertCell(cells.length, "code");
    focusNotebookCell(useNotebookStore.getState().activeCellId, true);
  }, [focusNotebookCell, runCell, selectCellAtIndex, showToast]);
  const runCellAndInsert = useCallback(async (cell) => {
    if (!cell || cell.type !== "code" || cell.metadata?.tags?.includes("solution")) return;
    showToast("正在运行单元格");
    const succeeded = await runCell(cell);
    showToast(succeeded ? "单元格运行完成" : "单元格运行失败", succeeded ? "success" : "error");
    if (!succeeded) return;
    const state = useNotebookStore.getState();
    const cells = state.document?.cells || [];
    const currentIndex = cells.findIndex((item) => item.id === cell.id);
    state.insertCell(currentIndex < 0 ? cells.length : currentIndex + 1, "code");
    focusNotebookCell(useNotebookStore.getState().activeCellId, true);
  }, [focusNotebookCell, runCell, showToast]);
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
    const kernel = runtimeRef.current?.session?.kernel;
    // 注意：不能检查 session.restart —— ISessionConnection 没有该方法
    // （只有 shutdown / changeKernel），那样判断会永远失败并把状态置为"错误"。
    // 重启能力在内核对象上（IKernelConnection.restart）。
    if (!runtimeRef.current || !kernel) {
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
      // 重启后回读内核真实状态，而不是假定已就绪。
      const nextKernel = runtimeRef.current?.session?.kernel || kernel;
      if (nextKernel?.status === "dead") throw new Error("Python 内核已停止");
      publishKernelStatus(nextKernel?.status);
      showToast("Python 已重新启动", "success");
    } catch (reason) {
      store.setRuntime("error", reason?.message || "Python 重启失败");
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
        : await loadCourseNotebook(lesson.path);
      if (!source) throw new Error("无法读取课程原始 Notebook");
      runtimeGenerationRef.current += 1;
      runtimeInitRef.current = null;
      clearKernelStatusBinding();
      const runtime = runtimeRef.current;
      runtimeRef.current = null;
      await shutdownNotebookRuntime(runtime);
      await deleteNotebookDraft("course:" + lesson.id);
      const resetDocument = normalizeNotebook(source);
      autoSplitDocumentCells(resetDocument);
      store.setDocument("course:" + lesson.id, resetDocument);
      const nativeRuntime = getPreferredRuntimeKind() === "native";
      store.setRuntime(
        nativeRuntime ? "loading" : "idle",
        nativeRuntime ? "正在准备 Python 内核" : "首次运行代码时启动 Python"
      );
      onRuntimeStateRef.current?.(nativeRuntime ? "loading" : "idle");
      setRuntimeWarmupToken((value) => value + 1);
      setLoading(false);
      showToast("本章已恢复为课程原始内容", "success");
    } catch (reason) {
      setLoading(false);
      store.setRuntime("error", "重置本章失败");
      showToast(reason?.message || "重置本章失败", "error");
    }
  };

  useEffect(() => {
    const handleNotebookShortcut = (event) => {
      if (!document || loading || error || shortcutHelpOpen) return;
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest("input, textarea, select, [contenteditable='true'], .cm-editor, [role='dialog'], [role='menu']")) return;

      const state = useNotebookStore.getState();
      const cells = state.document?.cells || [];
      const activeIndex = cells.findIndex((cell) => cell.id === state.activeCellId);
      const active = activeIndex >= 0 ? cells[activeIndex] : cells[0];
      if (!active) return;

      const key = String(event.key || "").toLowerCase();
      const running = state.runtimeState === "busy";
      const isProtected = active.metadata?.tags?.includes("solution");
      const prevent = () => {
        event.preventDefault();
        event.stopPropagation();
      };

      if ((event.ctrlKey || event.metaKey) && key === "enter") {
        prevent();
        if (!running && active.type === "code" && !isProtected) void runActiveCell();
        return;
      }
      if (event.shiftKey && key === "enter") {
        prevent();
        if (running) return;
        if (active.type === "code" && !isProtected) {
          void runCellAndAdvance(active);
        } else if (activeIndex < cells.length - 1) {
          selectCellAtIndex(activeIndex + 1);
        }
        return;
      }
      if (event.altKey && key === "enter") {
        prevent();
        if (!running && active.type === "code" && !isProtected) {
          void runCellAndInsert(active);
        }
        return;
      }
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      if (key !== "d") shortcutSequenceRef.current = { key: "", time: 0 };

      if (key === "arrowup" || key === "k") {
        prevent();
        selectCellAtIndex(activeIndex - 1);
        return;
      }
      if (key === "arrowdown" || key === "j") {
        prevent();
        selectCellAtIndex(activeIndex + 1);
        return;
      }
      if (key === "enter") {
        prevent();
        if (!isProtected) focusNotebookCell(active.id, true);
        return;
      }
      if (key === "a" || key === "b") {
        prevent();
        const insertionIndex = key === "a" ? activeIndex : activeIndex + 1;
        state.insertCell(insertionIndex, "code");
        focusNotebookCell(useNotebookStore.getState().activeCellId);
        return;
      }
      if (key === "m" || key === "y") {
        prevent();
        if (isProtected) {
          showToast("参考答案单元格不能修改类型", "warning");
          return;
        }
        state.updateCellType(active.id, key === "m" ? "markdown" : "code");
        focusNotebookCell(active.id);
        showToast(key === "m" ? "已切换为 Markdown 单元格" : "已切换为代码单元格", "success");
        return;
      }
      if (key === "c") {
        prevent();
        const tags = (active.metadata?.tags || []).filter((tag) => tag !== "solution" && tag !== "teacher-answer" && !tag.startsWith("solution-step-"));
        cellClipboardRef.current = { ...active, metadata: { ...(active.metadata || {}), tags } };
        showToast("已复制单元格", "success");
        return;
      }
      if (key === "x") {
        prevent();
        if (isProtected) {
          showToast("参考答案单元格不能剪切", "warning");
          return;
        }
        cellClipboardRef.current = { ...active, metadata: { ...(active.metadata || {}) } };
        state.deleteCell(active.id);
        focusNotebookCell(useNotebookStore.getState().activeCellId);
        showToast("已剪切单元格", "success");
        return;
      }
      if (key === "v") {
        prevent();
        if (!cellClipboardRef.current) {
          showToast("还没有复制或剪切单元格", "info");
          return;
        }
        state.insertCellFromTemplate(activeIndex + 1, cellClipboardRef.current);
        focusNotebookCell(useNotebookStore.getState().activeCellId);
        showToast("已粘贴单元格", "success");
        return;
      }
      if (key === "d") {
        prevent();
        const now = Date.now();
        const previous = shortcutSequenceRef.current;
        if (previous.key === "d" && now - previous.time <= 700) {
          shortcutSequenceRef.current = { key: "", time: 0 };
          if (isProtected) {
            showToast("参考答案单元格不能删除", "warning");
            return;
          }
          state.deleteCell(active.id);
          focusNotebookCell(useNotebookStore.getState().activeCellId);
          showToast("已删除单元格", "success");
        } else {
          shortcutSequenceRef.current = { key: "d", time: now };
        }
        return;
      }
      if (key === "h") {
        prevent();
        setShortcutHelpOpen(true);
      }
    };

    window.addEventListener("keydown", handleNotebookShortcut);
    return () => window.removeEventListener("keydown", handleNotebookShortcut);
  }, [document, error, focusNotebookCell, loading, runCellAndAdvance, runCellAndInsert, selectCellAtIndex, shortcutHelpOpen, showToast]);

  return <section className="custom-notebook-shell" aria-label={`${lesson.label} Notebook`}>
    <header className="chapter-learning-header chapter-learning-header-compact">
      <div className="chapter-learning-heading">
        <div className="chapter-learning-kicker"><span>{chapterMeta.moduleLabel}</span>{chapterMeta.isCapstone && <span>模块大作业</span>}{chapterMeta.isProject && !chapterMeta.isCapstone && <span>综合项目</span>}<span className="chapter-position-chip">第 {lessonPosition || lesson.chapter} / {totalLessons || "—"} 章</span><span className="chapter-version-chip">v{APP_VERSION}</span><span className={`chapter-kernel-state state-${store.runtimeState}`}><span />{store.runtimeState === "loading" ? store.runtimeMessage : (kernelStatusLabels[store.runtimeState] || "未知")}{store.runtimeState === "loading" && store.runtimePercent > 0 && <span className="chapter-kernel-progress" role="progressbar" aria-valuenow={store.runtimePercent} aria-valuemin={0} aria-valuemax={100} aria-label="Python 内核启动进度"><span className="chapter-kernel-progress-fill" style={{ width: `${store.runtimePercent}%` }} /></span>}</span></div>
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
        <Tooltip title="跳到第一个代码单元格"><span><IconButton size="small" disabled={!hasCodeCells} onClick={scrollToFirstCode} aria-label="跳到第一个代码单元格"><PlayArrowRounded fontSize="small" /></IconButton></span></Tooltip>
        <Divider orientation="vertical" flexItem className="custom-action-divider" />
        <Tooltip title="下载 Notebook"><IconButton size="small" onClick={downloadNotebook} aria-label="下载 Notebook"><DownloadRounded fontSize="small" /></IconButton></Tooltip>
        <Tooltip title="学习笔记"><IconButton size="small" onClick={openChapterNote} aria-label="编辑本章学习笔记"><NoteAltRounded fontSize="small" /></IconButton></Tooltip>
        <Tooltip title="快捷键与魔法命令 (H)"><IconButton size="small" onClick={() => setShortcutHelpOpen(true)} aria-label="查看快捷键与魔法命令"><KeyboardRounded fontSize="small" /></IconButton></Tooltip>
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
    {!loading && !error && document && <div className="custom-notebook-scroll"><div className="custom-notebook-canvas">{document.cells.map((cell, index) => <NotebookCell key={cell.id} cell={cell} index={index} codeIndex={codeIndexMap.get(cell.id) ?? null} cellCount={document.cells.length} runningCellId={runningCellId} onRun={runCellFromCell} onRunAndAdvance={runCellAndAdvance} onRunAndInsert={runCellAndInsert} onAdd={addCell} onMove={moveCell} onDelete={deleteCell} onDuplicate={duplicateCell} markdownCollapsed={markdownCollapsed && isMarkdownCell(cell)} onToggleMarkdown={handleToggleMarkdown} />)}<NotebookNavigation previousLesson={previousLesson} nextLesson={nextLesson} lessonPosition={lessonPosition || lesson.chapter} totalLessons={totalLessons} /></div><div className="custom-notebook-end"><button onClick={() => addCell(document.cells.length, "code")}><AddRounded fontSize="small" />添加代码单元格</button><button onClick={() => addCell(document.cells.length, "markdown")}><AddRounded fontSize="small" />添加文本单元格</button></div></div>}
    <Menu anchorEl={outlineAnchor} open={Boolean(outlineAnchor)} onClose={closeOutline} MenuListProps={{ "aria-label": "本章目录" }} PaperProps={{ className: "notebook-outline-menu" }}>
      {outline.map((item) => <MenuItem key={item.cellId + "-" + item.title} className={"notebook-outline-item level-" + item.level} onClick={() => jumpToOutline(item.cellId)}>{item.title}</MenuItem>)}
    </Menu>
    <Dialog open={shortcutHelpOpen} onClose={() => setShortcutHelpOpen(false)} aria-labelledby="notebook-shortcut-help-title" fullWidth maxWidth="md">
      <DialogTitle id="notebook-shortcut-help-title">Notebook 快捷键与魔法命令</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          单击 Cell 或按 Esc 进入命令模式；在代码编辑器中可直接使用运行快捷键。魔法命令由当前 IPython 内核执行。
        </DialogContentText>
        <div className="notebook-shortcut-help-grid">
          <section>
            <h3>运行与编辑</h3>
            <dl>
              <div><dt><kbd>Shift</kbd> + <kbd>Enter</kbd></dt><dd>运行并选择下一个 Cell</dd></div>
              <div><dt><kbd>Ctrl/Cmd</kbd> + <kbd>Enter</kbd></dt><dd>运行当前 Cell</dd></div>
              <div><dt><kbd>Alt</kbd> + <kbd>Enter</kbd></dt><dd>运行并在下方插入代码 Cell</dd></div>
              <div><dt><kbd>Esc</kbd></dt><dd>退出编辑，回到命令模式</dd></div>
              <div><dt><kbd>Enter</kbd></dt><dd>编辑选中的 Cell</dd></div>
            </dl>
          </section>
          <section>
            <h3>命令模式</h3>
            <dl>
              <div><dt><kbd>J</kbd> / <kbd>K</kbd></dt><dd>选择下一个 / 上一个 Cell</dd></div>
              <div><dt><kbd>A</kbd> / <kbd>B</kbd></dt><dd>在上方 / 下方插入代码 Cell</dd></div>
              <div><dt><kbd>M</kbd> / <kbd>Y</kbd></dt><dd>切换为 Markdown / Code</dd></div>
              <div><dt><kbd>C</kbd> / <kbd>X</kbd> / <kbd>V</kbd></dt><dd>复制 / 剪切 / 粘贴 Cell</dd></div>
              <div><dt><kbd>D</kbd> <kbd>D</kbd></dt><dd>删除选中的 Cell</dd></div>
              <div><dt><kbd>H</kbd></dt><dd>打开本帮助</dd></div>
            </dl>
          </section>
          <section className="notebook-magic-help">
            <h3>常用行魔法</h3>
            <p><code>%time expression</code>　测量一次运行时间</p>
            <p><code>%timeit expression</code>　重复测量运行时间</p>
            <p><code>%pwd</code> / <code>%ls</code>　查看工作目录与文件</p>
            <p><code>%who</code> / <code>%whos</code>　查看当前变量</p>
            <p><code>%matplotlib inline</code>　设置 Matplotlib 输出方式</p>
          </section>
          <section className="notebook-magic-help">
            <h3>常用 Cell 魔法</h3>
            <p><code>%%time</code> / <code>%%timeit</code>　测量整个 Cell</p>
            <p><code>%%capture output</code>　捕获整个 Cell 的输出</p>
            <p><code>%%writefile demo.py</code>　把 Cell 内容写入文件</p>
            <p>Cell 魔法必须放在该 Cell 的第一条非空语句。</p>
          </section>
        </div>
      </DialogContent>
      <DialogActions><Button onClick={() => setShortcutHelpOpen(false)}>关闭</Button></DialogActions>
    </Dialog>
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
              <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeSanitize, rehypeKatex]}>
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
