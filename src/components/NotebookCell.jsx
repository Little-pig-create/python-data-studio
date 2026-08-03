import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
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

function LazyCodeEditor({ value, onChange, onRun, active }) {
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
      ? <CodeEditor value={value} onChange={onChange} onRun={onRun} />
      : <pre className="notebook-code-preview" style={{ minHeight: Math.min(320, Math.max(70, lineCount * 22 + 24)) }}><code>{value || " "}</code></pre>}
  </div>;
}

export function NotebookCell({ cell, index, codeIndex, cellCount, runningCellId, onRun, onAdd, onMove, onDelete, onDuplicate, markdownCollapsed, onToggleMarkdown }) {
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

  const isSolution = cell.metadata?.tags?.includes("solution");
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
              <LazyCodeEditor value={cell.source} onChange={(value) => updateCellSource(cell.id, value)} onRun={run} active={selected || isRunning} />
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
    <div className="notebook-insert-rail" onClick={(event) => event.stopPropagation()}>
      <div className="notebook-insert-actions"><button onClick={() => onAdd(index + 1, "code")}><AddRounded fontSize="small" />代码</button><button onClick={() => onAdd(index + 1, "markdown")}><AddRounded fontSize="small" />文本</button></div>
    </div>
  </article>;
}
