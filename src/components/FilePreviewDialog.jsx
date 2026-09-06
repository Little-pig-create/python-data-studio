import { useEffect, useRef, useState } from "react";
import { Alert, CircularProgress, Dialog, DialogContent, DialogTitle, IconButton } from "@mui/material";
import CloseRounded from "@mui/icons-material/CloseRounded";
import Papa from "papaparse";
import { readActiveKernelFile } from "../notebookRuntime";
import { formatRuntimeFileSize } from "../runtimeFileTree";

const PREVIEW_BYTES = 256 * 1024;
const imageMimeTypes = {
  gif: "image/gif",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  png: "image/png",
  svg: "image/svg+xml",
  webp: "image/webp"
};
const textExtensions = new Set([
  "csv", "css", "data", "html", "ipynb", "js", "json", "md", "mjs", "names",
  "py", "sql", "test", "ts", "tsx", "txt", "xml", "yaml", "yml"
]);
const tableExtensions = new Set(["csv", "data", "test", "tsv"]);
const TABLE_BATCH_SIZE = 50;

function extensionOf(name) {
  return String(name || "").split(".").at(-1)?.toLowerCase() || "";
}

function encodedFileUrl(path) {
  return `/${String(path || "").split("/").filter(Boolean).map(encodeURIComponent).join("/")}`;
}

function bytesFromBase64(value) {
  return Uint8Array.from(atob(value || ""), (character) => character.charCodeAt(0));
}

function bytesToBase64(bytes) {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

function parseTable(text, extension, truncated) {
  const completeText = truncated ? text.replace(/[^\r\n]*$/, "") : text;
  const result = Papa.parse(completeText, {
    delimiter: extension === "tsv" ? "\t" : "",
    skipEmptyLines: "greedy",
    preview: 2000
  });
  const parsedRows = result.data.map((row) => Array.isArray(row) ? row.map((cell) => String(cell ?? "")) : [String(row ?? "")]);
  const hasHeader = extension === "csv" || extension === "tsv";
  const header = hasHeader ? (parsedRows.shift() || []) : [];
  const columnCount = Math.max(header.length, ...parsedRows.map((row) => row.length), 1);
  const columns = Array.from({ length: columnCount }, (_, index) => (
    hasHeader && header[index] ? header[index] : `列 ${index + 1}`
  ));
  return { columns, rows: parsedRows };
}

async function loadPreview(file) {
  const extension = extensionOf(file.name);
  let bytes;
  let base64Content = "";
  let truncated = false;

  if (file.source === "dataset") {
    const response = await fetch(encodedFileUrl(file.path), {
      cache: "no-store",
      headers: { Range: `bytes=0-${PREVIEW_BYTES - 1}` }
    });
    if (!response.ok) throw new Error(`文件预览加载失败（${response.status}）`);
    const buffer = new Uint8Array(await response.arrayBuffer());
    bytes = buffer.slice(0, PREVIEW_BYTES);
    base64Content = bytesToBase64(bytes);
    truncated = Number(file.size) > bytes.length || buffer.length > PREVIEW_BYTES;
  } else {
    const result = await readActiveKernelFile(file.path, PREVIEW_BYTES);
    bytes = bytesFromBase64(result.content);
    base64Content = result.content;
    truncated = Boolean(result.truncated);
  }

  const imageMimeType = imageMimeTypes[extension];
  if (imageMimeType) {
    return {
      kind: "image",
      src: `data:${imageMimeType};base64,${base64Content}`,
      truncated
    };
  }
  if (!textExtensions.has(extension)) {
    return { kind: "binary", truncated };
  }
  const text = new TextDecoder("utf-8").decode(bytes);
  if (tableExtensions.has(extension)) {
    return { kind: "table", ...parseTable(text, extension, truncated), truncated };
  }
  return { kind: "text", text, truncated };
}

function TablePreview({ preview }) {
  const [visibleCount, setVisibleCount] = useState(TABLE_BATCH_SIZE);
  const loadMoreRef = useRef(null);

  useEffect(() => setVisibleCount(TABLE_BATCH_SIZE), [preview]);
  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || visibleCount >= preview.rows.length) return undefined;
    const scrollRoot = target.closest(".file-preview-table-wrap");
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setVisibleCount((count) => Math.min(count + TABLE_BATCH_SIZE, preview.rows.length));
      }
    }, { root: scrollRoot, rootMargin: "160px 0px" });
    observer.observe(target);
    return () => observer.disconnect();
  }, [preview.rows.length, visibleCount]);

  const visibleRows = preview.rows.slice(0, visibleCount);
  return <>
    <div className="file-preview-table-summary">
      <span>{preview.columns.length} 列</span>
      <span>已显示 {visibleRows.length} / {preview.rows.length} 行</span>
    </div>
    <div className="file-preview-table-wrap">
      <table>
        <thead><tr>{preview.columns.map((column, index) => <th key={`${column}-${index}`}>{column}</th>)}</tr></thead>
        <tbody>{visibleRows.map((row, rowIndex) => <tr key={rowIndex}>
          {preview.columns.map((_column, columnIndex) => <td key={columnIndex}>{row[columnIndex] || ""}</td>)}
        </tr>)}</tbody>
      </table>
      {visibleCount < preview.rows.length && <div ref={loadMoreRef} className="file-preview-load-more"><CircularProgress size={18} /></div>}
    </div>
  </>;
}

export function FilePreviewDialog({ file, onClose }) {
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!file) return undefined;
    let cancelled = false;
    setLoading(true);
    setPreview(null);
    setError("");
    void loadPreview(file).then(
      (nextPreview) => { if (!cancelled) setPreview(nextPreview); },
      (reason) => { if (!cancelled) setError(reason?.message || "文件预览加载失败"); }
    ).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [file]);

  return <Dialog
    open={Boolean(file)}
    onClose={onClose}
    fullWidth
    maxWidth="md"
    className="file-preview-dialog"
  >
    <DialogTitle className="file-preview-title">
      <span>
        <strong>{file?.name}</strong>
        <small>/{file?.path} · {formatRuntimeFileSize(file?.size)}</small>
      </span>
      <IconButton aria-label="关闭文件预览" size="small" onClick={onClose}><CloseRounded /></IconButton>
    </DialogTitle>
    <DialogContent dividers className="file-preview-content">
      {loading && <div className="file-preview-loading"><CircularProgress size={24} /></div>}
      {error && <Alert severity="error">{error}</Alert>}
      {preview?.kind === "image" && <img src={preview.src} alt={file?.name || "文件预览"} />}
      {preview?.kind === "table" && <TablePreview preview={preview} />}
      {preview?.kind === "text" && <pre>{preview.text}</pre>}
      {preview?.kind === "binary" && <div className="file-preview-empty">该文件类型暂不支持直接预览</div>}
      {preview?.truncated && <div className="file-preview-truncated">文件较大，仅显示前 {formatRuntimeFileSize(PREVIEW_BYTES)}</div>}
    </DialogContent>
  </Dialog>;
}
