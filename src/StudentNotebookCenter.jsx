import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Chip, Pagination, Snackbar, TextField } from "@mui/material";
import { Link, useNavigate, useParams } from "react-router-dom";
import ArrowBackRounded from "@mui/icons-material/ArrowBackRounded";
import CloudUploadRounded from "@mui/icons-material/CloudUploadRounded";
import DownloadRounded from "@mui/icons-material/DownloadRounded";
import DeleteOutlineRounded from "@mui/icons-material/DeleteOutlineRounded";
import MenuBookRounded from "@mui/icons-material/MenuBookRounded";
import PackageRounded from "@mui/icons-material/Inventory2Rounded";
import PlayArrowRounded from "@mui/icons-material/PlayArrowRounded";
import { useAuth } from "./AuthProvider";
import { PortalHeader } from "./PortalHeader";
import { StudentWorkspaceNav } from "./components/StudentWorkspaceNav";
import { loadCourseCatalog } from "./courseCatalog";
import { deleteCustomNotebook, listCustomNotebooks, loadCustomNotebook, saveCustomNotebook } from "./notebookRepository";
import { normalizeNotebook, serializeNotebook } from "./notebookStore";
import { NotebookWorkspace } from "./NotebookWorkspace";

const notebookText = (source) => Array.isArray(source) ? source.join("") : String(source || "");

function validateStudentNotebook(value) {
  if (!value || value.nbformat !== 4 || !Array.isArray(value.cells) || !value.cells.length) {
    throw new Error("文件必须是 nbformat 4 Notebook，并至少包含一个单元格");
  }
  value.cells.forEach((cell, index) => {
    if (!cell || !["markdown", "code", "raw"].includes(cell.cell_type)) {
      throw new Error(`第 ${index + 1} 个单元格类型无效`);
    }
  });
  return value;
}

function notebookSummary(notebook) {
  const cells = notebook?.cells || [];
  return {
    cells: cells.length,
    code: cells.filter((cell) => cell.cell_type === "code" || cell.type === "code").length,
    markdown: cells.filter((cell) => cell.cell_type === "markdown" || cell.type === "markdown").length,
  };
}

function downloadNotebook(record) {
  if (!record?.notebook) return;
  const title = String(record.metadata?.title || "student-notebook").replace(/[\\/:*?"<>|]/g, "-");
  const blob = new Blob([JSON.stringify(serializeNotebook(normalizeNotebook(record.notebook)), null, 2)], { type: "application/x-ipynb+json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${title || "student-notebook"}.ipynb`;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function downloadSystemNotebook(chapter) {
  const separator = chapter.path.includes("?") ? "&" : "?";
  const response = await fetch(`${chapter.path}${separator}_=${Date.now()}`, {
    cache: "no-store",
  });
  if (!response.ok) throw new Error("系统 Notebook 文件未找到");
  const notebook = await response.json();
  const title = String(chapter.label || chapter.title || "course-notebook").replace(/[\\/:*?"<>|]/g, "-");
  const blob = new Blob([JSON.stringify(serializeNotebook(normalizeNotebook(notebook)), null, 2)], { type: "application/x-ipynb+json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${title || "course-notebook"}.ipynb`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function StudentNotebookCenter() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [catalog, setCatalog] = useState(null);
  const [systemQuery, setSystemQuery] = useState("");
  const [systemPage, setSystemPage] = useState(1);
  const [personalPage, setPersonalPage] = useState(1);

  const SYSTEM_PAGE_SIZE = 12;
  const PERSONAL_PAGE_SIZE = 8;

  const refresh = async () => {
    const all = await listCustomNotebooks().catch(() => []);
    setRecords(all.filter((record) => record.metadata?.ownerType === "student" && record.metadata?.ownerId === user?.userId));
  };

  useEffect(() => { refresh(); }, [user?.userId]);
  useEffect(() => {
    let active = true;
    loadCourseCatalog().then((value) => {
      if (active) setCatalog(value);
    }).catch((reason) => {
      if (active) setError(reason.message || "系统 Notebook 列表加载失败");
    });
    return () => { active = false; };
  }, []);

  const systemNotebooks = useMemo(() => {
    const keyword = systemQuery.trim().toLowerCase();
    const modules = new Map((catalog?.modules || []).map((module) => [module.id, module.label]));
    return (catalog?.chapters || [])
      .filter((chapter) => chapter.path)
      .filter((chapter) => !keyword || [chapter.title, chapter.label, chapter.module, modules.get(chapter.module), ...(chapter.tags || [])]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(keyword))
      .map((chapter) => ({ ...chapter, moduleLabel: modules.get(chapter.module) || chapter.module || "课程" }));
  }, [catalog, systemQuery]);

  const systemPageCount = Math.max(1, Math.ceil(systemNotebooks.length / SYSTEM_PAGE_SIZE));
  const systemPageItems = useMemo(
    () => systemNotebooks
      .map((chapter, index) => ({ chapter, order: index + 1 }))
      .slice((systemPage - 1) * SYSTEM_PAGE_SIZE, systemPage * SYSTEM_PAGE_SIZE),
    [systemNotebooks, systemPage],
  );
  const systemRangeStart = systemNotebooks.length ? (systemPage - 1) * SYSTEM_PAGE_SIZE + 1 : 0;
  const systemRangeEnd = Math.min(systemPage * SYSTEM_PAGE_SIZE, systemNotebooks.length);

  const personalPageCount = Math.max(1, Math.ceil(records.length / PERSONAL_PAGE_SIZE));
  const personalPageItems = records.slice((personalPage - 1) * PERSONAL_PAGE_SIZE, personalPage * PERSONAL_PAGE_SIZE);
  const personalRangeStart = records.length ? (personalPage - 1) * PERSONAL_PAGE_SIZE + 1 : 0;
  const personalRangeEnd = Math.min(personalPage * PERSONAL_PAGE_SIZE, records.length);

  useEffect(() => { setSystemPage(1); }, [systemQuery]);
  useEffect(() => { if (systemPage > systemPageCount) setSystemPage(Math.max(1, systemPageCount)); }, [systemPage, systemPageCount]);
  useEffect(() => { if (personalPage > personalPageCount) setPersonalPage(Math.max(1, personalPageCount)); }, [personalPage, personalPageCount]);

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError("");
    try {
      if (!/\.ipynb$/i.test(file.name) || file.size > 10 * 1024 * 1024) throw new Error("请选择 10 MB 以内的 .ipynb 文件");
      const parsed = validateStudentNotebook(JSON.parse(await file.text()));
      setSelectedFile(parsed);
      setTitle(file.name.replace(/\.ipynb$/i, ""));
    } catch (reason) {
      setSelectedFile(null);
      setError(reason.message || "Notebook 解析失败");
    }
  };

  const saveUploadedNotebook = async () => {
    if (!selectedFile || !title.trim() || busy) return;
    setBusy(true);
    try {
      const id = `student-notebook-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const now = new Date().toISOString();
      const metadata = {
        id,
        title: title.trim(),
        label: title.trim(),
        kind: "student-notebook",
        ownerType: "student",
        ownerId: user.userId,
        status: "draft",
        dependencies: [],
        createdAt: now,
        updatedAt: now,
      };
      await saveCustomNotebook(id, { id, metadata, notebook: normalizeNotebook(selectedFile), history: [], status: "draft", createdAt: now, updatedAt: now });
      setSelectedFile(null);
      setTitle("");
      await refresh();
      setMessage("Notebook 已添加到我的项目");
    } catch (reason) {
      setError(reason.message || "Notebook 保存失败");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (record) => {
    if (!window.confirm(`确定删除“${record.metadata?.title}”吗？`)) return;
    await deleteCustomNotebook(record.id);
    await refresh();
    setMessage("Notebook 已删除");
  };

  const downloadSystem = async (chapter) => {
    try {
      await downloadSystemNotebook(chapter);
      setMessage("系统 Notebook 已开始下载");
    } catch (reason) {
      setError(reason.message || "系统 Notebook 下载失败");
    }
  };

  return <main className="student-workspace-page">
    <PortalHeader title="我的 Notebook" subtitle="上传、整理和运行自己的 Notebook 项目，课程文件与个人项目相互独立。" actions={<Button component={Link} to="/course/chapter-1" variant="outlined" startIcon={<ArrowBackRounded />}>返回课程</Button>} />
    <StudentWorkspaceNav active="/student/notebooks" />
    <section className="student-workspace-hero">
      <div><span className="eyebrow">个人项目</span><h2>把 Notebook 变成可持续练习的项目</h2><p>上传 .ipynb 后可以继续编辑、运行和下载；系统课程与个人 Notebook 共用当前学生账号的全局 Python 环境。</p></div>
      <label className="student-upload-button"><CloudUploadRounded fontSize="small" />上传 Notebook<input type="file" accept=".ipynb,application/json" onChange={handleUpload} /></label>
    </section>
    {error && <Alert severity="error" onClose={() => setError("")}>{error}</Alert>}
    {selectedFile && <section className="student-upload-confirm workspace-panel"><div className="student-section-heading"><div><span className="eyebrow">待保存文件</span><h2>确认项目名称</h2></div><Chip label={`${notebookSummary(selectedFile).cells} 个单元格`} /></div><div className="student-upload-form"><TextField label="项目名称" value={title} onChange={(event) => setTitle(event.target.value)} fullWidth /><Button variant="contained" disabled={busy || !title.trim()} onClick={saveUploadedNotebook}>{busy ? "保存中…" : "保存到我的项目"}</Button></div></section>}
    <section className="student-workspace-section student-system-notebook-section"><div className="student-section-heading"><div><span className="eyebrow">系统内置 Notebook</span><h2>课程 Notebook 文件</h2></div><span>{catalog ? `${systemNotebooks.length} 个文件` : "正在加载"}</span></div><div className="student-system-notebook-tools"><input value={systemQuery} onChange={(event) => setSystemQuery(event.target.value)} placeholder="搜索章节、模块或标签" aria-label="搜索系统 Notebook" /><span>系统文件仅支持打开学习和下载</span></div>{catalog ? <>{systemPageItems.length ? <div className="student-system-notebook-list">{systemPageItems.map(({ chapter, order }) => <article key={chapter.id}><span className="student-system-notebook-order">第 {order} 章</span><div><h3>{chapter.title}</h3><p>{chapter.moduleLabel}{chapter.tags?.length ? ` · ${chapter.tags.slice(0, 2).join(" · ")}` : ""}</p></div><div className="student-system-notebook-actions"><Button component={Link} to={`/course/${chapter.id}`} size="small" variant="contained" startIcon={<PlayArrowRounded />}>打开学习</Button><Button size="small" startIcon={<DownloadRounded />} onClick={() => downloadSystem(chapter)}>下载</Button></div></article>)}</div> : <div className="workspace-empty-state"><MenuBookRounded /><h3>没有匹配的系统 Notebook</h3><p>换一个关键词试试。</p></div>}{systemPageCount > 1 && <div className="student-list-footer"><span>当前显示 {systemRangeStart}–{systemRangeEnd} / {systemNotebooks.length} 个文件</span><Pagination page={systemPage} count={systemPageCount} color="primary" shape="rounded" onChange={(_, page) => setSystemPage(page)} /></div>}</> : <div className="workspace-empty-state"><MenuBookRounded /><h3>正在读取系统 Notebook</h3><p>课程文件准备完成后会显示在这里。</p></div>}</section>
    <section className="student-workspace-section"><div className="student-section-heading"><div><span className="eyebrow">个人项目</span><h2>我上传的 Notebook</h2></div><span>{records.length} 个项目</span></div>{records.length ? <><div className="student-notebook-grid">{personalPageItems.map((record) => { const summary = notebookSummary(record.notebook); return <article className="student-notebook-card" key={record.id}><div className="student-notebook-card-icon"><MenuBookRounded /></div><div className="student-notebook-card-copy"><h3>{record.metadata?.title || "未命名 Notebook"}</h3><p>{summary.code} 个代码单元格 · {summary.markdown} 个说明单元格</p><small>使用全局 Python 环境</small></div><div className="student-notebook-card-actions"><Button size="small" variant="contained" startIcon={<PlayArrowRounded />} onClick={() => navigate(`/student/notebooks/${record.id}`)}>编辑运行</Button><Button size="small" startIcon={<PackageRounded />} onClick={() => navigate("/student/packages")}>Python 环境</Button><Button size="small" startIcon={<DownloadRounded />} onClick={() => downloadNotebook(record)}>下载</Button><Button size="small" color="error" startIcon={<DeleteOutlineRounded />} onClick={() => remove(record)}>删除</Button></div></article>; })}</div>{personalPageCount > 1 && <div className="student-list-footer"><span>当前显示 {personalRangeStart}–{personalRangeEnd} / {records.length} 个项目</span><Pagination page={personalPage} count={personalPageCount} color="primary" shape="rounded" onChange={(_, page) => setPersonalPage(page)} /></div>}</> : <div className="workspace-empty-state"><MenuBookRounded /><h3>还没有个人 Notebook</h3><p>系统课程文件在上方可直接学习；上传 .ipynb 后可创建、编辑并删除自己的项目。</p></div>}</section>
    <Snackbar open={Boolean(message)} autoHideDuration={2400} message={message} onClose={() => setMessage("")} />
  </main>;
}

export function StudentNotebookPage() {
  const { notebookId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [record, setRecord] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    loadCustomNotebook(notebookId).then((value) => {
      if (
        !value?.metadata
        || value.metadata.ownerType !== "student"
        || value.metadata.ownerId !== user?.userId
      ) throw new Error("Notebook 不存在或不属于当前学生");
      setRecord(value);
    }).catch((reason) => setError(reason.message || "Notebook 加载失败"));
  }, [notebookId, user?.userId]);

  if (error) return <main className="student-workspace-page"><PortalHeader title="Notebook 无法打开" subtitle={error} actions={<Button component={Link} to="/student/notebooks">返回我的 Notebook</Button>} /></main>;
  if (!record) return <div className="auth-loading"><div className="loading-bar" /><span>正在加载 Notebook</span></div>;

  const metadata = record.metadata;
  const lesson = { ...metadata, id: `student-${record.id}`, title: metadata.title, label: metadata.label || metadata.title, module: "projects", kind: "project", customNotebookId: record.id, dependencies: metadata.dependencies || [] };
  return <NotebookWorkspace lesson={lesson} previousLesson={null} nextLesson={null} lessonPosition="个人项目" totalLessons="—" onOpenSidebar={() => navigate("/student/notebooks")} />;
}
