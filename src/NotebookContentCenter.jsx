import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Snackbar, TextField } from "@mui/material";
import CloudUploadRounded from "@mui/icons-material/CloudUploadRounded";
import MenuBookRounded from "@mui/icons-material/MenuBookRounded";
import VisibilityRounded from "@mui/icons-material/VisibilityRounded";
import PublishRounded from "@mui/icons-material/PublishRounded";
import UnpublishedRounded from "@mui/icons-material/UnpublishedRounded";
import DeleteOutlineRounded from "@mui/icons-material/DeleteOutlineRounded";
import HistoryRounded from "@mui/icons-material/HistoryRounded";
import DownloadRounded from "@mui/icons-material/DownloadRounded";
import UploadFileRounded from "@mui/icons-material/UploadFileRounded";
import SearchRounded from "@mui/icons-material/SearchRounded";
import { CUSTOM_COURSE_CHAPTERS_KEY } from "./courseCatalog";
import { deleteCustomNotebook, listCustomNotebooks, saveCustomNotebook } from "./notebookRepository";
import { normalizeNotebook, serializeNotebook } from "./notebookStore";

const statusLabels = { draft: "草稿", published: "已发布", archived: "已下线", missing: "内容缺失" };
const statusColors = { draft: "warning", published: "success", archived: "default", missing: "error" };

function readMetadata() {
  try {
    const value = JSON.parse(window.localStorage?.getItem(CUSTOM_COURSE_CHAPTERS_KEY) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function writeMetadata(records) {
  window.localStorage?.setItem(CUSTOM_COURSE_CHAPTERS_KEY, JSON.stringify(records));
  window.dispatchEvent(new CustomEvent("course-catalog-updated"));
}

function upsertMetadata(metadata) {
  const records = readMetadata().filter((item) => item.id !== metadata.id);
  writeMetadata([...records, metadata]);
}

function makeId() {
  return `custom-chapter-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function downloadNotebook(record) {
  if (!record?.notebook) return;
  const title = String(record.metadata?.title || record.title || "notebook").replace(/[\\/:*?"<>|]/g, "-").trim() || "notebook";
  const standardNotebook = serializeNotebook(normalizeNotebook(record.notebook));
  const blob = new Blob([JSON.stringify(standardNotebook, null, 2)], { type: "application/x-ipynb+json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${title}.ipynb`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function downloadBackup(records) {
  const payload = {
    schema: "python-data-studio-notebook-backup",
    version: 1,
    exportedAt: new Date().toISOString(),
    records: records.map((record) => ({
      id: record.id,
      metadata: record.metadata || record,
      notebook: record.notebook,
      history: Array.isArray(record.history) ? record.history : []
    }))
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `python-data-studio-notebooks-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
function notebookSourceText(source) {
  return Array.isArray(source) ? source.join("") : String(source || "");
}

function notebookSummary(notebook) {
  const cells = notebook?.cells || [];
  const markdown = cells.filter((cell) => cell.cell_type === "markdown" || cell.type === "markdown");
  const code = cells.filter((cell) => cell.cell_type === "code" || cell.type === "code");
  const headings = markdown.flatMap((cell) => notebookSourceText(cell.source).split(/\r?\n/).filter((line) => /^#{1,3}\s+/.test(line)).map((line) => line.replace(/^#{1,3}\s+/, "").trim())).slice(0, 5);
  return { cells: cells.length, markdown: markdown.length, code: code.length, headings };
}

function notebookQualityCheck(notebook) {
  const summary = notebookSummary(notebook);
  const errors = [];
  const warnings = [];
  const cells = notebook?.cells || [];
  const codeCells = cells.filter((cell) => cell.cell_type === "code" || cell.type === "code");

  if (!summary.code) errors.push("至少需要一个代码单元格");
  if (!summary.markdown) errors.push("至少需要一个 Markdown 说明单元格");
  if (!summary.headings.length) warnings.push("未检测到一级到三级标题，建议补充章节结构");
  if (summary.code > 0 && codeCells.every((cell) => !notebookSourceText(cell.source).trim())) errors.push("代码单元格不能全部为空");
  if (codeCells.some((cell) => (cell.outputs || []).some((output) => output?.output_type === "error"))) {
    warnings.push("检测到带有执行错误输出的代码单元格，建议清理错误结果后再发布");
  }
  if (cells.some((cell) => notebookSourceText(cell.source).length > 20000)) {
    warnings.push("存在超过 20,000 个字符的单元格，建议拆分内容以便学生阅读");
  }
  if (!notebook?.metadata?.kernelspec && !notebook?.metadata?.language_info) {
    warnings.push("未检测到 kernelspec 或 language_info，运行前请确认 Python 内核配置");
  }
  return { errors, warnings };
}

function validateNotebook(parsed) {
  if (!parsed || parsed.nbformat !== 4 || !Array.isArray(parsed.cells)) {
    throw new Error("文件必须是 nbformat 4 的 Notebook，并包含 cells 数组");
  }
  if (!parsed.cells.length) throw new Error("Notebook 至少需要包含一个单元格");
  parsed.cells.forEach((cell, index) => {
    const cellType = cell?.cell_type || cell?.type;
    if (!cell || !["markdown", "code", "raw"].includes(cellType)) {
      throw new Error(`第 ${index + 1} 个单元格类型无效，应为 markdown、code 或 raw`);
    }
    const source = cell.source;
    if (!(typeof source === "string" || Array.isArray(source) && source.every((line) => typeof line === "string"))) {
      throw new Error(`第 ${index + 1} 个单元格的 source 必须是字符串或字符串数组`);
    }
    if (cellType === "code") {
      const executionCount = cell.execution_count ?? cell.executionCount;
      if (cell.outputs !== undefined && !Array.isArray(cell.outputs)) throw new Error(`第 ${index + 1} 个代码单元格的 outputs 必须是数组`);
      if (executionCount !== undefined && executionCount !== null && !Number.isInteger(executionCount)) throw new Error(`第 ${index + 1} 个代码单元格的 execution_count 无效`);
    }
  });
  return parsed;
}

function UploadDialog({ open, onClose, onSaved, modules, nextChapter, initialRecord, existingChapters = [] }) {
  const inputRef = useRef(null);
  const [fileName, setFileName] = useState("");
  const [notebook, setNotebook] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [form, setForm] = useState({ title: "", module: modules[0]?.id || "python", chapter: nextChapter, difficulty: "基础", estimatedMinutes: 60, description: "", objectives: "", tags: "" });

  useEffect(() => {
    if (!open) return;
    const metadata = initialRecord?.metadata || null;
    if (metadata) {
      setFileName(`${metadata.title}.ipynb`);
      setNotebook(initialRecord.notebook || null);
      setForm({ title: metadata.title || "", module: metadata.module || modules[0]?.id || "python", chapter: metadata.chapter || nextChapter, difficulty: metadata.difficulty || "基础", estimatedMinutes: metadata.estimatedMinutes || 60, description: metadata.description || "", objectives: (metadata.objectives || []).join("，"), tags: (metadata.tags || []).join("，") });
    } else {
      setFileName(""); setNotebook(null); setError("");
      setForm({ title: "", module: modules[0]?.id || "python", chapter: nextChapter, difficulty: "基础", estimatedMinutes: 60, description: "", objectives: "", tags: "" });
    }
  }, [initialRecord, modules, nextChapter, open]);

  const summary = useMemo(() => notebookSummary(notebook), [notebook]);
  const quality = useMemo(() => notebookQualityCheck(notebook), [notebook]);
  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const processFile = async (file) => {
    if (!file) return;
    setError("");
    setFileName(file.name);
    try {
      if (!/\.ipynb$/i.test(file.name || "")) throw new Error("请选择 .ipynb Notebook 文件");
      if (file.size > 10 * 1024 * 1024) throw new Error("Notebook 文件不能超过 10 MB");
      const parsed = JSON.parse(await file.text());
      setNotebook(validateNotebook(parsed));
      setForm((current) => ({ ...current, title: current.title || file.name.replace(/\.ipynb$/i, "") }));
    } catch (reason) {
      setNotebook(null);
      setError(reason.message || "Notebook 文件解析失败");
    } finally { if (inputRef.current) inputRef.current.value = ""; }
  };
  const handleFile = async (event) => {
    await processFile(event.target.files?.[0]);
  };
  const handleDrop = async (event) => {
    event.preventDefault();
    setDragActive(false);
    await processFile(event.dataTransfer.files?.[0]);
  };
  const save = async (status) => {
    if (!notebook) { setError("请先选择有效的 .ipynb 文件"); return; }
    if (!form.title.trim()) { setError("请填写章节标题"); return; }
    if (!Number.isInteger(Number(form.chapter)) || Number(form.chapter) < 1) { setError("章节序号必须是正整数"); return; }
    if (form.title.trim().length < 2 || form.title.trim().length > 80) { setError("章节标题长度应为 2–80 个字符"); return; }
    if (form.description.trim().length > 500) { setError("章节简介不能超过 500 个字符"); return; }
    if (!Number.isInteger(Number(form.estimatedMinutes)) || Number(form.estimatedMinutes) < 5 || Number(form.estimatedMinutes) > 600) { setError("预计时长应为 5–600 分钟之间的整数"); return; }
    if (!modules.some((module) => module.id === form.module)) { setError("所属模块无效，请重新选择"); return; }
    const chapterNumber = Number(form.chapter);
    const duplicate = existingChapters.find((chapter) => chapter.id !== initialRecord?.id && Number(chapter.chapter) === chapterNumber);
    if (duplicate) { setError(`第 ${chapterNumber} 章已被“${duplicate.title}”占用，请更换章节序号`); return; }
    if (status === "published" && quality.errors.length) {
      setError(`发布前检查未通过：${quality.errors.join("；")}`);
      return;
    }
    if (initialRecord?.status === "published" && status === "draft") {
      setError("已发布章节不能直接保存为草稿；请使用“保存修改并发布”保持线上版本一致。");
      return;
    }
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const id = initialRecord?.id || makeId();
      const createdAt = initialRecord?.createdAt || now;
      const metadata = {
        id, chapter: chapterNumber || nextChapter, title: form.title.trim(), label: `第${chapterNumber || nextChapter}章 ${form.title.trim()}`,
        module: form.module, kind: initialRecord?.metadata?.kind || "custom", path: null, customNotebookId: id, estimatedMinutes: Number(form.estimatedMinutes) || 60,
        difficulty: form.difficulty, description: form.description.trim(), objectives: form.objectives.split(/[,，\n]/).map((item) => item.trim()).filter(Boolean),
        tags: form.tags.split(/[,，]/).map((item) => item.trim()).filter(Boolean), status, quality: { ...quality, checkedAt: now }, version: (initialRecord?.metadata?.version || 0) + 1, createdAt, updatedAt: now,
        ...(initialRecord?.metadata?.sourceCourseId ? { sourceCourseId: initialRecord.metadata.sourceCourseId, sourceChapter: initialRecord.metadata.sourceChapter, sourcePath: initialRecord.metadata.sourcePath, sourceKind: initialRecord.metadata.sourceKind } : {}),
        ...(status === "published" ? { publishedAt: now } : {}),
        ...(status !== "published" && initialRecord?.metadata?.publishedAt ? { publishedAt: initialRecord.metadata.publishedAt } : {})
      };
      const normalizedNotebook = normalizeNotebook(notebook);
      const history = initialRecord ? [...(initialRecord.history || []), { version: initialRecord.metadata?.version || 1, metadata: initialRecord.metadata, notebook: initialRecord.notebook, savedAt: now }] : [];
      await saveCustomNotebook(id, { id, metadata, notebook: normalizedNotebook, history, status, createdAt, updatedAt: now, ...(status === "published" ? { publishedAt: now } : {}) });
      const records = readMetadata().filter((item) => item.id !== id);
      writeMetadata([...records, metadata]);
      onSaved(metadata);
      onClose();
    } catch (reason) {
      setError(reason.message || "保存失败");
    } finally { setSaving(false); }
  };
  const isPublishedEdit = initialRecord?.status === "published" || initialRecord?.metadata?.status === "published";
  return <Dialog open={open} onClose={onClose} fullWidth maxWidth="md"><DialogTitle>{initialRecord ? "编辑 Notebook 章节" : "上传 Notebook，创建课程章节"}</DialogTitle><DialogContent dividers>
    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
    <div className={`notebook-upload-zone ${dragActive ? "is-drag-active" : ""}`} onDragEnter={(event) => { event.preventDefault(); setDragActive(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={(event) => { if (event.currentTarget === event.target) setDragActive(false); }} onDrop={handleDrop} role="group" aria-label="Notebook 文件上传区域">
      <input ref={inputRef} type="file" accept=".ipynb,application/json" hidden onChange={handleFile} />
      <CloudUploadRounded className="notebook-upload-icon" aria-hidden="true" />
      <strong>{dragActive ? "松开鼠标上传 Notebook" : "拖拽 .ipynb 文件到这里"}</strong>
      <span>或</span>
      <Button variant="outlined" startIcon={<CloudUploadRounded />} onClick={() => inputRef.current?.click()}>选择 .ipynb 文件</Button>
      {fileName && <span>{fileName}</span>}
      <small>只接受 nbformat 4 Notebook，单文件不超过 10 MB；内容保存在本地浏览器，不会写入 public 目录。</small>
    </div>
    <div className="notebook-form-grid"><TextField label="章节标题" value={form.title} onChange={update("title")} required /><TextField label="章节序号" type="number" value={form.chapter} onChange={update("chapter")} /><TextField select label="所属模块" value={form.module} onChange={update("module")}>{modules.map((item) => <MenuItem key={item.id} value={item.id}>{item.label}</MenuItem>)}</TextField><TextField select label="难度" value={form.difficulty} onChange={update("difficulty")}><MenuItem value="基础">基础</MenuItem><MenuItem value="进阶">进阶</MenuItem><MenuItem value="项目">项目</MenuItem></TextField><TextField label="预计时长（分钟）" type="number" value={form.estimatedMinutes} onChange={update("estimatedMinutes")} /><TextField label="标签（逗号分隔）" value={form.tags} onChange={update("tags")} /><TextField className="notebook-form-wide" label="章节简介" multiline minRows={2} value={form.description} onChange={update("description")} /><TextField className="notebook-form-wide" label="教学目标（逗号或换行分隔）" multiline minRows={2} value={form.objectives} onChange={update("objectives")} /></div>
    {notebook && <div className="notebook-preview-summary"><strong>Notebook 预览</strong><span>单元格 {summary.cells}</span><span>Markdown {summary.markdown}</span><span>代码 {summary.code}</span>{summary.headings.length > 0 && <div><small>标题：{summary.headings.join(" · ")}</small></div>}</div>}
     {notebook && quality.errors.length > 0 && <Alert severity="error" sx={{ mt: 2 }}>发布检查：{quality.errors.join("；")}</Alert>}
     {notebook && quality.errors.length === 0 && quality.warnings.length > 0 && <Alert severity="warning" sx={{ mt: 2 }}>发布提示：{quality.warnings.join("；")}</Alert>}
  </DialogContent><DialogActions><Button onClick={onClose}>取消</Button><Button disabled={saving || isPublishedEdit} onClick={() => save("draft")}>保存草稿</Button><Button variant="contained" disabled={saving} startIcon={<PublishRounded />} onClick={() => save("published")}>{initialRecord ? "保存修改并发布" : "保存并发布"}</Button></DialogActions></Dialog>;
}

function CourseNotebookDialog({ open, onClose, catalog, records, nextChapter, onImported }) {
  const [query, setQuery] = useState("");
  const [module, setModule] = useState("all");
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setQuery("");
      setModule("all");
      setBusyId("");
      setError("");
    }
  }, [open]);

  const chapters = Array.isArray(catalog?.chapters) ? catalog.chapters : [];
  const modules = Array.isArray(catalog?.modules) ? catalog.modules : [];
  const managedBySource = useMemo(() => new Map(
    records
      .map((record) => [record.metadata || record, record])
      .filter(([metadata]) => metadata?.sourceCourseId)
      .map(([metadata, record]) => [metadata.sourceCourseId, record])
  ), [records]);
  const filteredChapters = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return chapters.filter((chapter) => {
      const matchesModule = module === "all" || chapter.module === module;
      const haystack = `${chapter.title || ""} ${chapter.label || ""} ${chapter.id || ""} ${(chapter.tags || []).join(" ")}`.toLowerCase();
      return matchesModule && (!keyword || haystack.includes(keyword));
    });
  }, [chapters, module, query]);

  const importChapter = async (chapter) => {
    const existing = managedBySource.get(chapter.id);
    if (existing) {
      onImported(existing, true);
      return;
    }
    setBusyId(chapter.id);
    setError("");
    try {
      const response = await fetch(chapter.path, { cache: "no-store" });
      if (!response.ok) throw new Error(`Notebook 加载失败（${response.status}）`);
      const parsed = validateNotebook(await response.json());
      const now = new Date().toISOString();
      const id = `managed-course-${chapter.id}`;
      const chapterNumber = Number(nextChapter);
      const quality = notebookQualityCheck(parsed);
      const metadata = {
        id,
        sourceCourseId: chapter.id,
        sourceChapter: Number(chapter.chapter) || null,
        sourcePath: chapter.path,
        sourceKind: "course",
        chapter: chapterNumber,
        title: chapter.title || chapter.label || chapter.id,
        label: `第${chapterNumber}章 ${chapter.title || chapter.label || chapter.id}`,
        module: chapter.module || modules[0]?.id || "python",
        kind: "managed-course",
        path: null,
        customNotebookId: id,
        estimatedMinutes: Number(chapter.estimatedMinutes) || 60,
        difficulty: chapter.difficulty || "基础",
        description: chapter.description || `从课程目录导入的可维护副本（原第${chapter.chapter || ""}章）`,
        objectives: Array.isArray(chapter.objectives) ? chapter.objectives : [],
        tags: Array.isArray(chapter.tags) ? chapter.tags : [],
        status: "draft",
        quality: { ...quality, checkedAt: now },
        version: 1,
        createdAt: now,
        updatedAt: now
      };
      const record = { id, metadata, notebook: normalizeNotebook(parsed), history: [], status: "draft", createdAt: now, updatedAt: now };
      await saveCustomNotebook(id, record);
      upsertMetadata(metadata);
      onImported(record, false);
    } catch (reason) {
      setError(reason.message || "导入课程 Notebook 失败，请重试");
    } finally {
      setBusyId("");
    }
  };

  return <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
    <DialogTitle>维护现有课程 Notebook</DialogTitle>
    <DialogContent dividers>
      <p className="notebook-course-dialog-hint">从已有课程中选择 Notebook，导入后会生成独立草稿副本。原始课程文件保持不变，导入的副本可继续编辑、预览、下载和发布。</p>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <div className="notebook-course-filters">
        <div className="notebook-course-search"><SearchRounded fontSize="small" /><input aria-label="搜索课程 Notebook" placeholder="搜索标题、章节或标签" value={query} onChange={(event) => setQuery(event.target.value)} /></div>
        <select aria-label="按课程模块筛选" value={module} onChange={(event) => setModule(event.target.value)}><option value="all">全部模块</option>{modules.map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}</select>
        <span className="notebook-course-count">显示 {filteredChapters.length} / {chapters.length}</span>
      </div>
      <div className="notebook-course-list">
        {filteredChapters.length ? filteredChapters.map((chapter) => {
          const managed = managedBySource.get(chapter.id);
          const busy = busyId === chapter.id;
          return <article className="notebook-course-item" key={chapter.id}>
            <div className="notebook-maintenance-icon"><MenuBookRounded /></div>
            <div className="notebook-maintenance-copy"><strong>{chapter.label || `第${chapter.chapter}章 ${chapter.title}`}</strong><span>{chapter.description || "课程 Notebook"}</span><small>{chapter.module} · {chapter.path} · {chapter.estimatedMinutes || 60} 分钟</small></div>
            {managed ? <><Chip size="small" color="warning" label={`已导入 v${managed.metadata?.version || 1}`} /><Button size="small" disabled={busyId !== ""} onClick={() => importChapter(chapter)}>{busy ? "处理中…" : "继续维护"}</Button></> : <Button size="small" variant="outlined" disabled={Boolean(busyId)} startIcon={<CloudUploadRounded />} onClick={() => importChapter(chapter)}>{busy ? "导入中…" : "导入维护"}</Button>}
          </article>;
        }) : <div className="workspace-empty-state"><span className="workspace-empty-icon"><MenuBookRounded /></span><h3>没有匹配的课程 Notebook</h3><p>可以修改搜索词或切换课程模块。</p></div>}
      </div>
    </DialogContent>
    <DialogActions><Button onClick={onClose}>关闭</Button></DialogActions>
  </Dialog>;
}

export function NotebookContentCenter() {
  const [records, setRecords] = useState([]);
  const [catalog, setCatalog] = useState(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [courseDialogOpen, setCourseDialogOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [preview, setPreview] = useState(null);
  const [historyRecord, setHistoryRecord] = useState(null);
  const [editing, setEditing] = useState(null);
  const [toast, setToast] = useState("");
  const [loadError, setLoadError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [backupBusy, setBackupBusy] = useState(false);
  const backupInputRef = useRef(null);
  const refresh = async () => {
    try {
      setLoadError("");
      const [items, response] = await Promise.all([listCustomNotebooks(), fetch("/course/catalog.json", { cache: "no-store" })]);
      if (!response.ok) throw new Error(`课程目录加载失败（${response.status}）`);
      const baseCatalog = await response.json();
      setRecords(items.sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""))));
      setCatalog(baseCatalog);
    } catch (reason) {
      setLoadError(reason.message || "维护数据加载失败，请刷新重试");
    }
  };
  useEffect(() => {
    refresh();
    const sync = (event) => {
      if (event?.type === "storage" && event.key !== CUSTOM_COURSE_CHAPTERS_KEY) return;
      refresh();
    };
    window.addEventListener("course-catalog-updated", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("course-catalog-updated", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  const metadataRecords = records.map((record) => record.metadata || record).filter((item) => item?.id);
  const filtered = metadataRecords.filter((item) => (status === "all" || item.status === status) && (`${item.title} ${item.description} ${(item.tags || []).join(" ")}`).toLowerCase().includes(query.toLowerCase()));
  const nextChapter = Math.max(108, ...(catalog?.chapters || []).map((item) => Number(item.chapter) || 0), ...metadataRecords.map((item) => Number(item.chapter) || 0)) + 1;
  const exportAll = () => {
    if (!records.length) {
      setToast("当前没有可导出的自定义 Notebook");
      return;
    }
    downloadBackup(records);
    setToast(`已导出 ${records.length} 个 Notebook 维护记录`);
  };

  const importBackup = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      setToast("备份文件不能超过 50 MB");
      event.target.value = "";
      return;
    }
    setBackupBusy(true);
    try {
      const payload = JSON.parse(await file.text());
      if (payload?.schema !== "python-data-studio-notebook-backup" || payload?.version !== 1 || !Array.isArray(payload.records)) {
        throw new Error("备份文件格式不受支持");
      }
      if (!payload.records.length) throw new Error("备份文件中没有 Notebook 记录");
      const existingIds = new Set(records.map((record) => record.id || record.metadata?.id).filter(Boolean));
      const occupiedChapters = new Set([
        ...(catalog?.chapters || []).map((item) => Number(item.chapter)).filter(Number.isInteger),
        ...metadataRecords.map((item) => Number(item.chapter)).filter(Number.isInteger)
      ]);
      let nextImportedChapter = Math.max(108, ...occupiedChapters) + 1;
      const now = new Date().toISOString();
      const prepared = payload.records.map((candidate, index) => {
        const sourceMetadata = candidate?.metadata || candidate;
        const notebook = candidate?.notebook;
        if (!sourceMetadata?.title || !notebook) throw new Error(`第 ${index + 1} 条记录缺少标题或 Notebook 内容`);
        const normalizedNotebook = normalizeNotebook(validateNotebook(notebook));
        let id = String(candidate.id || sourceMetadata.id || "").trim();
        if (!id || existingIds.has(id)) id = makeId();
        existingIds.add(id);
        let chapter = Number(sourceMetadata.chapter);
        if (!Number.isInteger(chapter) || chapter < 1 || occupiedChapters.has(chapter)) {
          while (occupiedChapters.has(nextImportedChapter)) nextImportedChapter += 1;
          chapter = nextImportedChapter;
          nextImportedChapter += 1;
        }
        occupiedChapters.add(chapter);
        const title = String(sourceMetadata.title).trim();
        const history = (Array.isArray(candidate.history) ? candidate.history : []).flatMap((snapshot) => {
          if (!snapshot?.notebook) return [];
          try {
            const historyNotebook = normalizeNotebook(validateNotebook(snapshot.notebook));
            return [{
              version: Number.isInteger(Number(snapshot.version)) ? Number(snapshot.version) : 1,
              metadata: snapshot.metadata && typeof snapshot.metadata === "object" ? { ...snapshot.metadata } : {},
              notebook: historyNotebook,
              savedAt: snapshot.savedAt || now
            }];
          } catch {
            return [];
          }
        });
        const metadata = {
          ...sourceMetadata,
          id,
          chapter,
          title,
          label: `第${chapter}章 ${title}`,
          customNotebookId: id,
          kind: "custom",
          path: null,
          status: "draft",
          version: 1,
          createdAt: now,
          updatedAt: now
        };
        delete metadata.publishedAt;
        return { id, metadata, notebook: normalizedNotebook, history, status: "draft", createdAt: now, updatedAt: now };
      });
      for (const record of prepared) {
        await saveCustomNotebook(record.id, record);
        upsertMetadata(record.metadata);
      }
      await refresh();
      setToast(`已导入 ${prepared.length} 个章节草稿；发布前请检查章节信息`);
    } catch (reason) {
      setToast(reason.message || "备份导入失败，请检查文件内容");
    } finally {
      setBackupBusy(false);
      event.target.value = "";
    }
  };
  const updateStatus = async (metadata, nextStatus) => {
    const record = records.find((item) => item.id === metadata.id);
    if (!record || busyId) return;
    const quality = notebookQualityCheck(record.notebook);
    if (nextStatus === "published" && quality.errors.length) {
      setToast(`发布前检查未通过：${quality.errors.join("；")}`);
      return;
    }
    const now = new Date().toISOString();
    const nextMeta = { ...metadata, status: nextStatus, quality: { ...quality, checkedAt: now }, updatedAt: now, ...(nextStatus === "published" ? { publishedAt: now } : {}) };
    setBusyId(metadata.id);
    try {
      await saveCustomNotebook(metadata.id, { ...record, metadata: nextMeta, status: nextStatus, updatedAt: now, ...(nextStatus === "published" ? { publishedAt: now } : {}) });
      upsertMetadata(nextMeta);
      await refresh();
      setToast(nextStatus === "published" ? "章节已发布" : "章节已下线");
    } catch (reason) {
      setToast(reason.message || "状态更新失败，请重试");
    } finally { setBusyId(""); }
  };
  const remove = async (metadata) => {
    if (busyId || !window.confirm(`确定删除“${metadata.title}”吗？`)) return;
    setBusyId(metadata.id);
    try {
      await deleteCustomNotebook(metadata.id);
      writeMetadata(readMetadata().filter((item) => item.id !== metadata.id));
      await refresh();
      setToast("草稿已删除");
    } catch (reason) {
      setToast(reason.message || "删除失败，请重试");
    } finally { setBusyId(""); }
  };
  const restoreVersion = (record, snapshot) => {
    if (!snapshot?.notebook) return;
    setHistoryRecord(null);
    setEditing({ ...record, notebook: snapshot.notebook, metadata: { ...snapshot.metadata, status: "draft" }, status: "draft" });
    setToast(`已载入版本 v${snapshot.version || "历史"}，保存后生效`);
  };
  const handleCourseImported = async (record, alreadyImported) => {
    if (alreadyImported) {
      setCourseDialogOpen(false);
      setEditing(record);
      setToast("已打开现有课程 Notebook，可继续维护");
      return;
    }
    await refresh();
    setCourseDialogOpen(false);
    setEditing(record);
    setToast("课程 Notebook 已导入为草稿，可继续编辑");
  };
  const allChapterRecords = [...(catalog?.chapters || []), ...metadataRecords];
  return <>
    {loadError && <Alert severity="warning" sx={{ mb: 2 }} action={<Button color="inherit" size="small" onClick={refresh}>重试</Button>}>{loadError}</Alert>}
    <section className="workspace-action-bar">
      <div><span className="eyebrow">内容运营</span><h2>Notebook维护中心</h2><p>教师可把自定义 .ipynb 上传为新章节，经过校验、预览后保存草稿或发布到课程目录。学生只会看到已发布内容。</p></div>
       <div className="notebook-maintenance-toolbar">
         <input ref={backupInputRef} type="file" accept="application/json,.json" hidden onChange={importBackup} />
         <Button size="small" variant="outlined" disabled={backupBusy} startIcon={<UploadFileRounded />} onClick={() => backupInputRef.current?.click()}>导入备份</Button>
         <Button size="small" variant="outlined" disabled={!records.length || backupBusy} startIcon={<DownloadRounded />} onClick={exportAll}>导出备份</Button>
         <Button size="small" variant="outlined" disabled={backupBusy || !catalog?.chapters?.length} startIcon={<MenuBookRounded />} onClick={() => setCourseDialogOpen(true)}>维护现有课程</Button>
         <Button variant="contained" disabled={backupBusy} startIcon={<CloudUploadRounded />} onClick={() => setUploadOpen(true)}>上传 Notebook</Button>
       </div>
       <small className="notebook-maintenance-backup-hint">备份包含章节元数据、Notebook 内容和历史版本；导入课程 Notebook 会生成独立草稿，不会直接修改原始课程文件或对学生上线。</small>
    </section>
    <section className="workspace-kpi-grid"><article><span>全部 Notebook</span><strong>{metadataRecords.length}</strong><small>本地维护记录</small></article><article><span>草稿</span><strong>{metadataRecords.filter((item) => item.status === "draft").length}</strong><small>可继续编辑</small></article><article><span>已发布</span><strong>{metadataRecords.filter((item) => item.status === "published").length}</strong><small>学生可见</small></article><article><span>已下线</span><strong>{metadataRecords.filter((item) => item.status === "archived").length}</strong><small>保留版本</small></article></section>
     <section className="workspace-panel"><div className="workspace-panel-heading"><div><span className="eyebrow">章节内容</span><h2>Notebook 维护列表</h2></div><div className="notebook-maintenance-filters"><input placeholder="搜索标题、简介或标签" value={query} onChange={(event) => setQuery(event.target.value)} /><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">全部状态</option><option value="draft">草稿</option><option value="published">已发布</option><option value="archived">已下线</option></select></div></div>{filtered.length ? <div className="notebook-maintenance-list">{filtered.map((item) => { const record = records.find((candidate) => candidate.id === item.id); const historyCount = record?.history?.length || 0; const contentMissing = !record?.notebook; const actionBusy = busyId === item.id; return <article className="notebook-maintenance-item" key={item.id}><div className="notebook-maintenance-icon"><MenuBookRounded /></div><div className="notebook-maintenance-copy"><strong>第{item.chapter}章 {item.title}</strong><span>{item.sourceCourseId ? `课程副本 · ${item.description || "暂无章节简介"}` : (contentMissing ? "Notebook 内容未找到，请重新上传或删除该记录" : (item.description || "暂无章节简介"))}</span><small>{item.module} · {item.difficulty || "未设置难度"} · v{item.version || 1} · {item.updatedAt ? new Date(item.updatedAt).toLocaleString() : ""}</small></div><Chip size="small" label={contentMissing ? statusLabels.missing : (statusLabels[item.status] || item.status)} color={contentMissing ? statusColors.missing : (statusColors[item.status] || "default")} /><div className="notebook-maintenance-actions"><Button size="small" disabled={contentMissing} startIcon={<VisibilityRounded />} onClick={() => setPreview(record)}>预览</Button><Button size="small" disabled={contentMissing} startIcon={<DownloadRounded />} onClick={() => downloadNotebook(record)}>下载</Button>{historyCount > 0 && <Button size="small" startIcon={<HistoryRounded />} onClick={() => setHistoryRecord(record)}>历史版本（{historyCount}）</Button>}<Button size="small" disabled={contentMissing} onClick={() => setEditing(record)}>编辑</Button>{item.status !== "published" && <Button size="small" disabled={contentMissing || Boolean(busyId)} startIcon={<PublishRounded />} onClick={() => updateStatus(item, "published")}>{actionBusy ? "处理中…" : "发布"}</Button>}{item.status === "published" && <Button size="small" disabled={contentMissing || Boolean(busyId)} startIcon={<UnpublishedRounded />} onClick={() => updateStatus(item, "archived")}>{actionBusy ? "处理中…" : "下线"}</Button>}{item.status === "draft" && <Button size="small" disabled={Boolean(busyId)} color="error" startIcon={<DeleteOutlineRounded />} onClick={() => remove(item)}>删除</Button>}</div></article>; })}</div> : <div className="workspace-empty-state"><span className="workspace-empty-icon"><MenuBookRounded /></span><h3>还没有 Notebook 维护记录</h3><p>可以上传新 Notebook，或点击“维护现有课程”从已有课程导入可编辑副本。</p><div className="notebook-empty-actions"><Button size="small" variant="outlined" onClick={() => setCourseDialogOpen(true)}>维护现有课程</Button><Button size="small" variant="contained" onClick={() => setUploadOpen(true)}>上传 Notebook</Button></div></div>}</section>
     <CourseNotebookDialog open={courseDialogOpen} onClose={() => setCourseDialogOpen(false)} catalog={catalog} records={records} nextChapter={nextChapter} onImported={handleCourseImported} />
    <UploadDialog open={uploadOpen || Boolean(editing)} initialRecord={editing} onClose={() => { setUploadOpen(false); setEditing(null); }} onSaved={(metadata) => { setToast(metadata.status === "published" ? "章节已发布到课程目录" : "草稿已保存"); setUploadOpen(false); setEditing(null); refresh(); }} modules={catalog?.modules || []} nextChapter={nextChapter} existingChapters={allChapterRecords} />
    <Dialog open={Boolean(preview)} onClose={() => setPreview(null)} fullWidth maxWidth="sm"><DialogTitle>Notebook 预览</DialogTitle><DialogContent dividers>{preview && <><h3>{preview.metadata?.label || preview.label}</h3><p>{preview.metadata?.description || preview.description || "暂无简介"}</p><div className="notebook-preview-summary"><span>单元格 {notebookSummary(preview.notebook).cells}</span><span>Markdown {notebookSummary(preview.notebook).markdown}</span><span>代码 {notebookSummary(preview.notebook).code}</span></div><ol className="notebook-preview-cell-list">{(preview.notebook?.cells || []).slice(0, 8).map((cell, index) => <li key={index}><strong>{cell.cell_type === "code" || cell.type === "code" ? "代码" : "Markdown"}</strong><code>{String(cell.source || "").slice(0, 180)}</code></li>)}</ol></>}</DialogContent><DialogActions><Button onClick={() => setPreview(null)}>关闭</Button></DialogActions></Dialog>
    <Dialog open={Boolean(historyRecord)} onClose={() => setHistoryRecord(null)} fullWidth maxWidth="sm"><DialogTitle>Notebook 历史版本</DialogTitle><DialogContent dividers>{historyRecord?.history?.length ? <div className="notebook-version-list">{[...historyRecord.history].reverse().map((snapshot, index) => <article key={`${snapshot.savedAt}-${index}`}><div><strong>v{snapshot.version || "历史"}</strong><small>{snapshot.savedAt ? new Date(snapshot.savedAt).toLocaleString() : ""} · {snapshot.metadata?.status === "published" ? "已发布" : "草稿"}</small></div><Button size="small" onClick={() => restoreVersion(historyRecord, snapshot)}>载入此版本</Button></article>)}</div> : <p>暂无历史版本。编辑并保存后会自动生成版本快照。</p>}</DialogContent><DialogActions><Button onClick={() => setHistoryRecord(null)}>关闭</Button></DialogActions></Dialog>
    <Snackbar open={Boolean(toast)} autoHideDuration={2800} onClose={() => setToast("")} message={toast} />
  </>;
}

