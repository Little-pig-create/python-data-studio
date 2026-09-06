import { useState, useEffect, useMemo, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeSanitize from "rehype-sanitize";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import PlayArrowRounded from "@mui/icons-material/PlayArrowRounded";
import AddRounded from "@mui/icons-material/AddRounded";
import ChevronRightRounded from "@mui/icons-material/ChevronRightRounded";
import MenuBookRounded from "@mui/icons-material/MenuBookRounded";
import ExpandMoreRounded from "@mui/icons-material/ExpandMoreRounded";
import VisibilityOffRounded from "@mui/icons-material/VisibilityOffRounded";
import { Badge, Tooltip, IconButton } from "@mui/material";
import { useNotebookStore } from "../notebookStore";
import { CodeEditor } from "./CodeEditor";
import { OutputRenderer } from "./OutputRenderer";
import { CellToolbar } from "./CellToolbar";
import { splitMarkdownByElementGroups } from "../lib/markdownSplit";

function LazyCodeEditor({ value, onChange, onRun, onRunAndAdvance, onRunAndInsert, onExitEditMode, active }) {
  const hostRef = useRef(null);
  const [ready, setReady] = useState(active);

  useEffect(() => {
    if (active) setReady(true);
  }, [active]);

  useEffect(() => {
    if (ready || !hostRef.current) return undefined;
    if (typeof IntersectionObserver === "undefined") {
      setReady(true);
      return undefined;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setReady(true);
        observer.disconnect();
      }
    }, { rootMargin: "700px 0px" });
    observer.observe(hostRef.current);
    return () => observer.disconnect();
  }, [ready]);

  const lineCount = String(value || "").split(/\r?\n/).length;
  return <div ref={hostRef}>
    {ready
      ? <CodeEditor value={value} onChange={onChange} onRun={onRun} onRunAndAdvance={onRunAndAdvance} onRunAndInsert={onRunAndInsert} onExitEditMode={onExitEditMode} />
      : <pre className="notebook-code-preview" style={{ minHeight: Math.min(320, Math.max(70, lineCount * 22 + 24)) }}><code>{value || " "}</code></pre>}
  </div>;
}

export function NotebookCell({ cell, index, codeIndex, cellCount, runningCellId, onRun, onRunAndAdvance, onRunAndInsert, onAdd, onMove, onDelete, onDuplicate, markdownCollapsed, onToggleMarkdown }) {
  const { activeCellId, notebookKey, selectCell, updateCellSource } = useNotebookStore();
  const [outputCollapsed, setOutputCollapsed] = useState(false);
  const [markdownEditing, setMarkdownEditing] = useState(false);
  const [markdownDraft, setMarkdownDraft] = useState(cell.source);
  const [markdownSavedFlash, setMarkdownSavedFlash] = useState(false);
  const [checklistState, setChecklistState] = useState({});
  const cellElementRef = useRef(null);
  const markdownEditorRef = useRef(null);

  // 编辑模式：textarea 高度自适应内容，全部展示、不使用滚动
  useEffect(() => {
    if (!markdownEditing) return undefined;
    const editor = markdownEditorRef.current;
    if (!editor) return undefined;
    const resize = () => {
      editor.style.height = "auto";
      editor.style.height = Math.max(56, editor.scrollHeight) + "px";
    };
    resize();
    const frame = window.requestAnimationFrame(resize);
    return () => window.cancelAnimationFrame(frame);
  }, [markdownDraft, markdownEditing]);


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

  useEffect(() => {
    if (!markdownEditing) setMarkdownDraft(cell.source);
  }, [cell.source, markdownEditing]);

  const isSolution = cell.metadata?.tags?.includes("solution");
  const [solutionCollapsed, setSolutionCollapsed] = useState(isSolution);

  const selected = activeCellId === cell.id;
  const isRunning = runningCellId === cell.id;
  const outputId = `cell-output-${cell.id}`;
  const run = () => onRun(cell);
  const startMarkdownEditing = () => {
    if (cell.type !== "markdown") return;
    selectCell(cell.id);
    setMarkdownDraft(cell.source);
    setMarkdownEditing(true);
  };
  const saveMarkdown = () => {
    const changed = markdownDraft !== cell.source;
    if (changed) updateCellSource(cell.id, markdownDraft);
    setMarkdownEditing(false);
    if (changed) {
      setMarkdownSavedFlash(true);
      window.setTimeout(() => setMarkdownSavedFlash(false), 1800);

    }
  };
  const cancelMarkdownEditing = () => {
    setMarkdownDraft(cell.source);
    setMarkdownEditing(false);
  };
  const handleMarkdownKeyDown = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      cancelMarkdownEditing();
      return;
    }
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey || event.shiftKey)) {
      event.preventDefault();
      event.stopPropagation();
      saveMarkdown();
      return;
    }
    if (event.key === "Tab" && !event.shiftKey) {
      event.preventDefault();
      event.stopPropagation();
      const target = event.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const next = markdownDraft.slice(0, start) + "  " + markdownDraft.slice(end);
      setMarkdownDraft(next);
      window.requestAnimationFrame(() => {
        target.selectionStart = target.selectionEnd = start + 2;
      });
    }
  };

  useEffect(() => {
    const handleEditRequest = (event) => {
      if (event.detail?.cellId !== cell.id || isSolution) return;
      selectCell(cell.id);
      if (cell.type === "markdown") {
        setMarkdownDraft(cell.source);
        setMarkdownEditing(true);
        window.requestAnimationFrame(() => markdownEditorRef.current?.focus());
        return;
      }
      const focusEditor = () => cellElementRef.current?.querySelector(".cm-content")?.focus();
      window.requestAnimationFrame(focusEditor);
      window.setTimeout(focusEditor, 80);
    };
    window.addEventListener("notebook-edit-cell", handleEditRequest);
    return () => window.removeEventListener("notebook-edit-cell", handleEditRequest);
  }, [cell.id, cell.source, cell.type, isSolution, selectCell]);

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
        disabled={_disabled}
        onChange={(event) => {
          event.stopPropagation();
          const nextState = { ...checklistState, [itemIndex]: event.target.checked };
          setChecklistState(nextState);
          if (checklistStorageKey) window.localStorage.setItem(checklistStorageKey, JSON.stringify(nextState));
        }}
      />;
    }
  };

  // 展示拆分：按元素分组（切分 + 相邻同类合并），与加载拆分的 cell 结构一致
  const markdownSections = useMemo(() => splitMarkdownByElementGroups(cell.source).map((group) => group.source), [cell.source]);

  return <article ref={cellElementRef} tabIndex={-1} id={"notebook-cell-" + cell.id} className={`notebook-cell notebook-cell-${cell.type} ${selected ? "is-selected" : ""} ${isRunning ? "is-running" : ""} ${isSolution ? "is-solution" : ""} ${markdownEditing ? "is-editing" : ""}`} onClick={() => selectCell(cell.id)}>
    <div className="notebook-cell-meta">
      <div className="notebook-cell-gutter">
        {cell.type === "code" && cell.executionCount != null ? <span className="notebook-cell-index"><Badge
          badgeContent={cell.executionCount}
          color="primary"
          sx={{
            "& .MuiBadge-badge": {
              position: "static",
              transform: "none",
              minWidth: 32,
              height: 32,
              borderRadius: "50%",
              padding: "0 8px",
              fontSize: 14,
              fontWeight: 700,
              lineHeight: "32px"
            }
          }}
        /></span> : null}
        {cell.type === "code" ? <button
          type="button"
          className="notebook-run-button"
          aria-label={isRunning ? "运行中" : `运行代码单元格 ${index + 1}`}
          disabled={isRunning}
          onClick={(event) => { event.stopPropagation(); run(); }}
        >
          {isRunning ? <span className="notebook-run-spinner" aria-hidden="true" /> : <PlayArrowRounded fontSize="small" />}
        </button> : null}
      </div>
    </div>
    <div className="notebook-cell-frame">
      <div className="notebook-cell-body">
        {selected && !isSolution && <CellToolbar cell={cell} index={index} cellCount={cellCount} onAdd={onAdd} onMove={onMove} onEdit={startMarkdownEditing} onDelete={onDelete} onDuplicate={onDuplicate} />}
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
              <LazyCodeEditor
                value={cell.source}
                onChange={(value) => updateCellSource(cell.id, value)}
                onRun={run}
                onRunAndAdvance={() => onRunAndAdvance?.(cell)}
                onRunAndInsert={() => onRunAndInsert?.(cell)}
                onExitEditMode={() => {
                  selectCell(cell.id);
                  cellElementRef.current?.focus({ preventScroll: true });
                }}
                active={selected || isRunning}
              />
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
        </> : markdownEditing ? (
          <div className="notebook-markdown-editor-wrap" onClick={(event) => event.stopPropagation()}>
            <textarea ref={markdownEditorRef} className="notebook-markdown-editor" autoFocus value={markdownDraft} onChange={(event) => setMarkdownDraft(event.target.value)} onKeyDown={handleMarkdownKeyDown} onBlur={saveMarkdown} aria-label="编辑说明文本" />
            {markdownSavedFlash && <div className="notebook-markdown-saved-flash">✓ 已保存</div>}
          </div>
        ) : markdownCollapsed ? <button className="notebook-markdown-collapsed" type="button" onClick={(event) => { event.stopPropagation(); onToggleMarkdown?.(cell.id); }}><span><MenuBookRounded fontSize="small" />{String(cell.source || "本节说明").split(/\r?\n/).find((line) => line.trim())?.replace(/^#+\s*/, "") || "本节说明"}</span><span>展开说明 <ExpandMoreRounded fontSize="small" /></span></button> : <div className="notebook-markdown-content" onDoubleClick={(event) => { event.stopPropagation(); startMarkdownEditing(); }}>{markdownSections.map((section, sectionIndex) => (
        <section key={sectionIndex} className={"notebook-md-section" + (markdownSections.length > 1 ? " is-split" : "")} data-section={sectionIndex + 1}>
          <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeSanitize, rehypeKatex]} components={markdownComponents}>{section}</ReactMarkdown>
        </section>
      ))}</div>}
      </div>
    </div>
    <div className="notebook-insert-rail" onClick={(event) => event.stopPropagation()}>
      <div className="notebook-insert-actions"><button onClick={() => onAdd(index + 1, "code")}><AddRounded fontSize="small" />代码</button><button onClick={() => onAdd(index + 1, "markdown")}><AddRounded fontSize="small" />文本</button></div>
    </div>
  </article>;
}
