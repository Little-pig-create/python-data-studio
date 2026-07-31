import "./notebook.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import DOMPurify from "dompurify";
import { basicSetup } from "codemirror";
import { python } from "@codemirror/lang-python";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import PlayArrowRounded from "@mui/icons-material/PlayArrowRounded";
import AddRounded from "@mui/icons-material/AddRounded";
import MoreHorizRounded from "@mui/icons-material/MoreHorizRounded";
import ArrowUpwardRounded from "@mui/icons-material/ArrowUpwardRounded";
import ArrowDownwardRounded from "@mui/icons-material/ArrowDownwardRounded";
import EditRounded from "@mui/icons-material/EditRounded";
import ChevronRightRounded from "@mui/icons-material/ChevronRightRounded";
import StopRounded from "@mui/icons-material/StopRounded";
import RestartAltRounded from "@mui/icons-material/RestartAltRounded";
import DeleteOutlineRounded from "@mui/icons-material/DeleteOutlineRounded";
import ContentCopyRounded from "@mui/icons-material/ContentCopyRounded";
import ContentCutRounded from "@mui/icons-material/ContentCutRounded";
import DownloadRounded from "@mui/icons-material/DownloadRounded";
import VisibilityOffRounded from "@mui/icons-material/VisibilityOffRounded";
import MenuRounded from "@mui/icons-material/MenuRounded";
import PlaylistPlayRounded from "@mui/icons-material/PlaylistPlayRounded";
import ArrowBackRounded from "@mui/icons-material/ArrowBackRounded";
import ArrowForwardRounded from "@mui/icons-material/ArrowForwardRounded";
import DeleteSweepRounded from "@mui/icons-material/DeleteSweepRounded";
import FormatListBulletedRounded from "@mui/icons-material/FormatListBulletedRounded";
import RestorePageRounded from "@mui/icons-material/RestorePageRounded";
import NoteAltRounded from "@mui/icons-material/NoteAltRounded";
import AccessTimeRounded from "@mui/icons-material/AccessTimeRounded";
import CheckCircleOutlineRounded from "@mui/icons-material/CheckCircleOutlineRounded";
import ExpandMoreRounded from "@mui/icons-material/ExpandMoreRounded";
import FlagRounded from "@mui/icons-material/FlagRounded";
import MenuBookRounded from "@mui/icons-material/MenuBookRounded";
import { Alert, Button, ButtonGroup, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Divider, IconButton, Menu, MenuItem, Snackbar, Tab, Tabs, TextField, Tooltip } from "@mui/material";
import { StudioSpeedDial } from "./StudioSpeedDial";
import { useAppStore } from "./store";
import { createNotebookRuntime, ensureCoursePackages, executeNotebookCell } from "./notebookRuntime";
import { deleteNotebookDraft, loadCustomNotebook, loadNotebookDraft, saveNotebookDraft } from "./notebookRepository";
import { convertErrorToFriendly } from "./errorMessageHelper";
import { normalizeNotebook, serializeNotebook, useNotebookStore } from "./notebookStore";

const outputText = (value) => {
  const text = Array.isArray(value) ? value.join("") : String(value ?? "");
  return text.replace(/[\u001b\u009b]\[[0-?]*[ -/]*[@-~]/g, "");
};
const formatPythonSource = (source) => String(source || "").split(/\r?\n/).map((line) => {
  let formatted = line.replace(/\t/g, "    ").replace(/\s+$/, "");
  if (/^\s*[A-Za-z_]\w*\s*=/.test(formatted) && !/==|!=|<=|>=/.test(formatted)) {
    formatted = formatted.replace(/^(\s*[A-Za-z_]\w*)\s*=\s*/, "$1 = ");
  }
  formatted = formatted.replace(/,\s*(?=[A-Za-z_\"'\[({])/g, ", ");
  return formatted;
}).join("\n");
const markdownOutline = (notebook) => (notebook?.cells || []).flatMap((cell) => {
  if (cell.type !== "markdown") return [];
  return String(cell.source || "").split(/\r?\n/).flatMap((line) => {
    const match = line.match(/^(#{1,3})\s+(.+?)\s*#*\s*$/);
    if (!match) return [];
    return [{ cellId: cell.id, level: match[1].length, title: match[2] }];
  });
});
const kernelStatusLabels = { idle: "未启动", ready: "空闲", busy: "运行中", error: "错误" };
const kernelStatusDetails = {
  unknown: ["loading", "⏳ 正在连接内核..."],
  starting: ["loading", "🚀 正在启动 Python（首次需要 10 秒）..."],
  idle: ["ready", "✓ 内核就绪"],
  busy: ["busy", "▶ 代码运行中..."],
  terminating: ["loading", "⏹ 正在关闭内核..."],
  restarting: ["loading", "🔄 正在重启 Python..."],
  autorestarting: ["loading", "🔧 正在恢复 Python..."],
  dead: ["error", "❌ Python 内核已停止"]
};

const moduleLabels = {
  python: "Python 基础",
  numpy: "NumPy",
  pandas: "Pandas",
  matplotlib: "Matplotlib",
  seaborn: "Seaborn",
  plotly: "Plotly",
  projects: "综合项目",
  "machine-learning": "机器学习"
};

const getChapterMeta = (lesson) => {
  const isProject = lesson.kind === "project";
  const difficulty = lesson.difficulty || (isProject ? "项目实训" : lesson.chapter <= 10 ? "基础" : lesson.chapter <= 75 ? "进阶" : "实训");
  const description = lesson.description || (isProject
    ? `围绕“${lesson.title}”完成一个从数据理解、清洗、建模到结果解读的完整实训。`
    : `通过 Notebook 动手掌握${lesson.title}，把概念、代码和运行结果连成一条可复用的学习路径。`);
  const objectives = Array.isArray(lesson.objectives) && lesson.objectives.length
    ? lesson.objectives
    : [
      `理解${lesson.title}的核心概念和使用场景`,
      "运行示例代码，并根据提示完成一处修改",
      isProject ? "整理关键指标，形成可解释的分析结论" : "记录本节的关键方法，迁移到下一道练习"
    ];
  return {
    moduleLabel: moduleLabels[lesson.module] || "课程章节",
    difficulty,
    description,
    objectives,
    estimatedMinutes: Number(lesson.estimatedMinutes) || 45,
    isProject
  };
};

async function shutdownNotebookRuntime(runtime) {
  const session = runtime?.session;
  if (!session) return;
  try {
    await session.shutdown();
  } catch {
    session.dispose?.();
  }
}

function CodeEditor({ value, onChange, onRun }) {
  const hostRef = useRef(null);
  const viewRef = useRef(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!hostRef.current) return undefined;
    const state = EditorState.create({
      doc: value,
      extensions: [
        basicSetup,
        python(),
        keymap.of([{ key: "Mod-Enter", run: () => { onRun(); return true; } }]),
        EditorView.lineWrapping,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) onChangeRef.current(update.state.doc.toString());
        }),
        EditorView.theme({
          "&": { backgroundColor: "transparent", color: "#202124", fontSize: "14px" },
          ".cm-content": { padding: "12px 14px", fontFamily: "JetBrains Mono, Cascadia Code, Consolas, monospace" },
          ".cm-gutters": { display: "none" },
          ".cm-scroller": { fontFamily: "inherit", lineHeight: "1.55" },
          ".cm-focused": { outline: "none" }
        })
      ]
    });
    const view = new EditorView({ state, parent: hostRef.current });
    viewRef.current = view;
    return () => { view.destroy(); viewRef.current = null; };
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    if (!view || value === view.state.doc.toString()) return;
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value } });
  }, [value]);

  return <div ref={hostRef} className="notebook-code-editor" />;
}

function PlotlyOutput({ figure }) {
  const hostRef = useRef(null);
  const [renderError, setRenderError] = useState("");

  useEffect(() => {
    let cancelled = false;
    let plotly;
    let resizeObserver;
    const host = hostRef.current;

    const render = async () => {
      try {
        const module = await import("plotly.js-dist-min");
        plotly = module.default || module;
        if (cancelled || !host) return;

        const payload = typeof figure === "string" ? JSON.parse(figure) : figure;
        const layout = { ...(payload?.layout || {}), autosize: true };
        delete layout.width;
        await plotly.newPlot(
          host,
          payload?.data || [],
          layout,
          { responsive: true, displaylogo: false, ...(payload?.config || {}) }
        );
        if (cancelled) return;

        resizeObserver = new ResizeObserver(() => plotly.Plots.resize(host));
        resizeObserver.observe(host);
      } catch (error) {
        if (!cancelled) setRenderError(error instanceof Error ? error.message : String(error));
      }
    };

    setRenderError("");
    render();
    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      if (plotly && host) plotly.purge(host);
    };
  }, [figure]);

  if (renderError) {
    return <pre className="notebook-error-output">Plotly 图表渲染失败：{renderError}</pre>;
  }
  return <div ref={hostRef} className="notebook-output-plotly" aria-label="Plotly 交互式图表" />;
}

function OutputRenderer({ outputs = [] }) {
  if (!outputs.length) return null;
  return <div className="notebook-output-content">{outputs.map((output, index) => {
    if (output.output_type === "stream") return <pre key={index} className="notebook-stream">{outputText(output.text)}</pre>;
    if (output.output_type === "error") {
      const isAssertionError = output.ename === "AssertionError";
      const className = isAssertionError ? "notebook-assert-error" : "notebook-error-output";
      const errorText = outputText([output.ename, output.evalue, ...(output.traceback || [])].filter(Boolean).join("\n"));

      // 尝试转换为友好错误提示
      const friendlyError = !isAssertionError ? convertErrorToFriendly(errorText) : null;

      if (friendlyError && friendlyError.type !== 'UnknownError') {
        return (
          <div key={index} className="notebook-error-box">
            <div className="error-title">{friendlyError.title}</div>
            <div className="error-section">
              <div className="error-label">💭 可能原因：</div>
              <ul className="error-list">
                {friendlyError.causes.map((cause, i) => <li key={i}>{cause}</li>)}
              </ul>
            </div>
            <div className="error-section">
              <div className="error-label">🔧 解决方法：</div>
              <ol className="error-list">
                {friendlyError.solutions.map((solution, i) => <li key={i}>{solution}</li>)}
              </ol>
            </div>
            <details className="error-details">
              <summary>📋 查看完整错误信息</summary>
              <pre className="error-details-content">{friendlyError.original}</pre>
            </details>
          </div>
        );
      }

      // 回退到原始错误显示
      const prefix = isAssertionError ? "❌ 自检未通过：" : "";
      return (
        <pre key={index} className={className}>
          {prefix}
          {errorText}
        </pre>
      );
    }
    const data = output.data || {};
    if (data["image/png"]) return <img key={index} className="notebook-output-image" src={`data:image/png;base64,${data["image/png"]}`} alt="Python 输出图像" />;
    if (data["image/jpeg"]) return <img key={index} className="notebook-output-image" src={`data:image/jpeg;base64,${data["image/jpeg"]}`} alt="Python 输出图像" />;
    if (data["application/vnd.plotly.v1+json"]) return <PlotlyOutput key={index} figure={data["application/vnd.plotly.v1+json"]} />;
    if (data["text/html"]) return <div key={index} className="notebook-output-html" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(outputText(data["text/html"])) }} />;
    if (data["text/plain"]) return <pre key={index} className="notebook-stream">{outputText(data["text/plain"])}</pre>;
    return <pre key={index} className="notebook-stream">{JSON.stringify(data, null, 2)}</pre>;
  })}</div>;
}

function CellToolbar({ cell, index, cellCount, onAdd, onMove, onEdit, onDelete, onDuplicate }) {
  return <div className="notebook-cell-toolbar" onClick={(event) => event.stopPropagation()}>
    <Tooltip title="上移单元格"><span><IconButton size="small" disabled={index === 0} onClick={() => onMove(cell.id, -1)}><ArrowUpwardRounded fontSize="small" /></IconButton></span></Tooltip>
    <Tooltip title="下移单元格"><span><IconButton size="small" disabled={index === cellCount - 1} onClick={() => onMove(cell.id, 1)}><ArrowDownwardRounded fontSize="small" /></IconButton></span></Tooltip>
    <Divider orientation="vertical" flexItem className="notebook-cell-toolbar-divider" />
    <Tooltip title="编辑单元格"><IconButton size="small" onClick={onEdit}><EditRounded fontSize="small" /></IconButton></Tooltip>
    <Tooltip title="复制单元格"><IconButton size="small" onClick={() => onDuplicate(index)}><ContentCopyRounded fontSize="small" /></IconButton></Tooltip>
    <Tooltip title="剪切单元格"><IconButton size="small" onClick={() => onDelete(cell.id)}><ContentCutRounded fontSize="small" /></IconButton></Tooltip>
    <Tooltip title="删除单元格"><IconButton size="small" onClick={() => onDelete(cell.id)}><DeleteOutlineRounded fontSize="small" /></IconButton></Tooltip>
    <Divider orientation="vertical" flexItem className="notebook-cell-toolbar-divider" />
    <Tooltip title="更多操作"><IconButton size="small"><MoreHorizRounded fontSize="small" /></IconButton></Tooltip>
  </div>;
}

function NotebookCell({ cell, index, cellCount, runningCellId, onRun, onAdd, onMove, onDelete, onDuplicate, markdownCollapsed, onToggleMarkdown }) {
  const { activeCellId, notebookKey, selectCell, updateCellSource } = useNotebookStore();
  const [outputCollapsed, setOutputCollapsed] = useState(false);
  const [markdownEditing, setMarkdownEditing] = useState(false);
  const [checklistState, setChecklistState] = useState({});

  const checklistStorageKey = notebookKey && cell.type === "markdown"
    ? `notebook-checklist:${notebookKey}:${cell.id}`
    : null;

  useEffect(() => {
    if (!checklistStorageKey) {
      setChecklistState({});
      return;
    }
    try {
      const stored = JSON.parse(window.localStorage.getItem(checklistStorageKey) || "{}");
      setChecklistState(stored && typeof stored === "object" ? stored : {});
    } catch {
      setChecklistState({});
    }
  }, [checklistStorageKey]);

  // 检测 solution tag，默认折叠答案单元格
  const isSolution = cell.metadata?.tags?.includes('solution');
  const [solutionCollapsed, setSolutionCollapsed] = useState(isSolution);

  const selected = activeCellId === cell.id;
  const isRunning = runningCellId === cell.id;
  const outputId = `cell-output-${cell.id}`;
  const run = () => onRun(cell);
  let checklistIndex = 0;
  const markdownComponents = {
    input: ({ checked, type, disabled: _disabled, ...props }) => {
      if (type !== "checkbox") return <input {...props} type={type} />;
      const itemIndex = checklistIndex++;
      const isChecked = Object.prototype.hasOwnProperty.call(checklistState, itemIndex)
        ? checklistState[itemIndex]
        : Boolean(checked);
      return <input
        {...props}
        type="checkbox"
        checked={isChecked}
        onChange={(event) => {
          event.stopPropagation();
          const nextState = { ...checklistState, [itemIndex]: event.target.checked };
          setChecklistState(nextState);
          if (checklistStorageKey) window.localStorage.setItem(checklistStorageKey, JSON.stringify(nextState));
        }}
      />;
    }
  };
  return <article id={"notebook-cell-" + cell.id} className={`notebook-cell notebook-cell-${cell.type} ${selected ? "is-selected" : ""} ${isRunning ? "is-running" : ""} ${isSolution ? "is-solution" : ""}`} onClick={() => selectCell(cell.id)}>
    <div className="notebook-cell-layout">
      <div className="notebook-cell-gutter">
        {cell.type === "code" && <>
          <span className="notebook-execution-count">[{cell.executionCount ?? " "}]</span>
          {!(isSolution && solutionCollapsed) && <button className="notebook-run-button" aria-label="运行单元格" onClick={(event) => { event.stopPropagation(); run(); }}>
            {isRunning ? <span className="notebook-spinner" /> : <PlayArrowRounded fontSize="small" />}
          </button>}
        </>}
      </div>
      <div className="notebook-cell-frame">
        <div className="notebook-cell-body">
        {selected && <CellToolbar cell={cell} index={index} cellCount={cellCount} onAdd={onAdd} onMove={onMove} onEdit={() => setMarkdownEditing(true)} onDelete={onDelete} onDuplicate={onDuplicate} />}
        {cell.type === "code" ? <>
          {isSolution && solutionCollapsed ? (
            <div className="solution-placeholder">
              <button onClick={(event) => { event.stopPropagation(); setSolutionCollapsed(false); }}>
                📝 显示参考答案
              </button>
            </div>
          ) : (
            <>
              {isSolution && <div className="solution-toolbar" onClick={(event) => event.stopPropagation()}>
                <Tooltip title="隐藏参考答案">
                  <IconButton size="small" aria-label="隐藏参考答案" onClick={() => setSolutionCollapsed(true)}>
                    <VisibilityOffRounded fontSize="small" />
                  </IconButton>
                </Tooltip>
              </div>}
              <CodeEditor value={cell.source} onChange={(value) => updateCellSource(cell.id, value)} onRun={run} />
            </>
          )}
          {cell.outputs?.length > 0 && <div className={`notebook-output ${outputCollapsed ? "is-collapsed" : ""}`}>
            <div className="notebook-output-toolbar">
              <button
                className="notebook-output-toggle"
                aria-controls={outputId}
                aria-expanded={!outputCollapsed}
                aria-label={outputCollapsed ? "展开输出" : "折叠输出"}
                title={outputCollapsed ? "展开输出" : "折叠输出"}
                onClick={(event) => {
                  event.stopPropagation();
                  setOutputCollapsed((value) => !value);
                }}
              >
                <ChevronRightRounded className={outputCollapsed ? "" : "is-expanded"} fontSize="small" />
              </button>
              {outputCollapsed && <button className="notebook-output-link" onClick={(event) => { event.stopPropagation(); setOutputCollapsed(false); }}>展开输出</button>}
            </div>
            {!outputCollapsed && <div id={outputId}><OutputRenderer outputs={cell.outputs} /></div>}
          </div>}
        </> : markdownEditing ? <textarea className="notebook-markdown-editor" autoFocus value={cell.source} onChange={(event) => updateCellSource(cell.id, event.target.value)} onBlur={() => setMarkdownEditing(false)} /> : markdownCollapsed ? <button className="notebook-markdown-collapsed" type="button" onClick={(event) => { event.stopPropagation(); onToggleMarkdown?.(cell.id); }}><span><MenuBookRounded fontSize="small" />{String(cell.source || "本节说明").split(/\r?\n/).find((line) => line.trim())?.replace(/^#+\s*/, "") || "本节说明"}</span><span>展开说明 <ExpandMoreRounded fontSize="small" /></span></button> : <div className="notebook-markdown-content"><ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]} components={markdownComponents}>{cell.source}</ReactMarkdown></div>}
        </div>
      </div>
    </div>
    <div className="notebook-insert-rail" onClick={(event) => event.stopPropagation()}>
      <div className="notebook-insert-actions"><button onClick={() => onAdd(index + 1, "code")}><AddRounded fontSize="small" />代码</button><button onClick={() => onAdd(index + 1, "markdown")}><AddRounded fontSize="small" />文本</button></div>
    </div>
  </article>;
}

function NotebookNavigation({ previousLesson, nextLesson, lessonPosition, totalLessons }) {
  const item = (target, direction, Icon) => target
    ? <Link className={`notebook-navigation-item is-${direction}`} to={`/course/${target.id}`}>
      <Icon fontSize="small" />
      <span><small>{direction === "previous" ? "上一节" : "下一节"}</small><strong>{target.label}</strong></span>
    </Link>
    : <span className={`notebook-navigation-item is-disabled is-${direction}`} aria-disabled="true">
      <Icon fontSize="small" />
      <span><small>{direction === "previous" ? "上一节" : "下一节"}</small><strong>{direction === "previous" ? "已经是第一节" : "已经是最后一节"}</strong></span>
    </span>;

  return <nav className="notebook-navigation" aria-label="课程章节导航">
    {item(previousLesson, "previous", ArrowBackRounded)}
    <span className="notebook-navigation-position"><small>课程位置</small><strong>{lessonPosition || "—"} / {totalLessons || "—"}</strong></span>
    {item(nextLesson, "next", ArrowForwardRounded)}
  </nav>;
}

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
      useNotebookStore.getState().setRuntime("loading", "正在启动原生 Python 内核");
      const runtime = await createNotebookRuntime(notebookPath);
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
          setToast({ open: true, message: "原生内核已创建", severity: "success" });
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

      await ensureCoursePackages(runtime, currentCell.source || "");
      const result = await executeNotebookCell(runtime, currentCell.source || "");

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
      await runtimeRef.current?.session?.kernel?.interrupt();
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
      await session.restart();
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
    {loading && <div className="custom-notebook-loading"><div className="loading-bar" /><p>正在准备 Notebook</p></div>}
    {error && <div className="custom-notebook-error">{error}</div>}
    {!loading && !error && document && <div className="custom-notebook-scroll"><div className="custom-notebook-canvas">{document.cells.map((cell, index) => <NotebookCell key={cell.id} cell={cell} index={index} cellCount={document.cells.length} runningCellId={runningCellId} onRun={runCellFromCell} onAdd={addCell} onMove={moveCell} onDelete={deleteCell} onDuplicate={duplicateCell} markdownCollapsed={markdownCollapsed && cell.type === "markdown"} onToggleMarkdown={(cellId) => { setMarkdownCollapsed(false); window.document.getElementById("notebook-cell-" + cellId)?.scrollIntoView({ behavior: "smooth", block: "center" }); }} />)}<NotebookNavigation previousLesson={previousLesson} nextLesson={nextLesson} lessonPosition={lessonPosition || lesson.chapter} totalLessons={totalLessons} /></div><div className="custom-notebook-end"><button onClick={() => addCell(document.cells.length, "code")}><AddRounded fontSize="small" />添加代码单元格</button><button onClick={() => addCell(document.cells.length, "markdown")}><AddRounded fontSize="small" />添加文本单元格</button></div></div>}
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


