import { useEffect, useState } from "react";
import { Alert, Button, IconButton, Snackbar, Tab, Tabs, Tooltip } from "@mui/material";
import ArrowBackRounded from "@mui/icons-material/ArrowBackRounded";
import ContentCopyRounded from "@mui/icons-material/ContentCopyRounded";
import DeleteOutlineRounded from "@mui/icons-material/DeleteOutlineRounded";
import DownloadRounded from "@mui/icons-material/DownloadRounded";
import UploadFileRounded from "@mui/icons-material/UploadFileRounded";
import VisibilityRounded from "@mui/icons-material/VisibilityRounded";
import { useNavigate } from "react-router-dom";
import { publicDatasets, readCodeForDataset } from "./datasetCatalog";
import { deleteImportedDataset, listImportedDatasets, readDatasetPreview, saveImportedDataset } from "./datasetRepository";
import { formatFileSize, parseDelimitedPreview } from "./datasetUtils";

function PreviewTable({ preview }) {
  if (!preview?.headers?.length) return <div className="dataset-preview-empty">未读取到可预览的数据。</div>;
  return <div className="dataset-preview"><table><thead><tr>{preview.headers.map((header, index) => <th key={index}>{header || `列 ${index + 1}`}</th>)}</tr></thead><tbody>{preview.rows.map((row, rowIndex) => <tr key={rowIndex}>{preview.headers.map((_, colIndex) => <td key={colIndex}>{row[colIndex] || ""}</td>)}</tr>)}</tbody></table></div>;
}

export function DatasetCenter({ variant = "standalone" }) {
  const navigate = useNavigate();
  const teacherMode = variant === "teacher";
  const Container = teacherMode ? "section" : "main";
  const [tab, setTab] = useState("public");
  const [imports, setImports] = useState([]);
  const [preview, setPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [toast, setToast] = useState({ open: false, message: "", severity: "success" });
  const notify = (message, severity = "success") => setToast({ open: true, message, severity });
  const reloadImports = () => listImportedDatasets().then(setImports).catch(() => notify("读取本地导入文件失败", "error"));
  useEffect(() => { void reloadImports(); }, []);

  const showPublicPreview = async (dataset) => {
    setLoadingPreview(true);
    try {
      const response = await fetch(`/datasets/${dataset.file}`, { headers: { Range: "bytes=0-65535" } });
      if (!response.ok) throw new Error();
      setPreview({ title: dataset.name, data: parseDelimitedPreview(await response.text()) });
    } catch { notify("数据预览加载失败", "error"); } finally { setLoadingPreview(false); }
  };
  const showImportPreview = async (dataset) => {
    setLoadingPreview(true);
    try { setPreview({ title: dataset.name, data: parseDelimitedPreview(await readDatasetPreview(dataset.blob)) }); } catch { notify("导入文件预览失败", "error"); } finally { setLoadingPreview(false); }
  };
  const copyCode = async (dataset) => {
    try { await navigator.clipboard.writeText(readCodeForDataset(dataset)); notify("Pandas 读取代码已复制"); } catch { notify("无法复制代码，请检查浏览器权限", "error"); }
  };
  const importFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try { await saveImportedDataset(file); await reloadImports(); setTab("local"); notify(`已导入 ${file.name}`); } catch (error) { notify(error.message || "导入失败", "error"); }
  };
  const downloadImport = (dataset) => {
    const url = URL.createObjectURL(dataset.blob);
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = dataset.name; anchor.click(); URL.revokeObjectURL(url);
  };

  return <Container className={`tool-page ${teacherMode ? "teacher-resource-center" : ""}`}><div className="tool-page-header"><div><div className="dashboard-kicker">{teacherMode ? "教学资源" : "数据集中心"}</div><h1>{teacherMode ? "数据集与分析资源" : "为分析练习准备数据"}</h1><p>{teacherMode ? "预览经典公开数据，检查字段与质量，并为课程、练习和实训准备固定版本的数据资源。" : "浏览课程使用的公开数据，或在本机浏览器中导入 CSV、TSV 文件进行预览和管理。"}</p></div>{!teacherMode && <Button variant="outlined" startIcon={<ArrowBackRounded />} onClick={() => navigate("/progress")}>返回学习记录</Button>}</div>{teacherMode && <section className="dataset-resource-guide" aria-label="教学资源准备流程"><article><span>01</span><strong>确认来源与许可</strong><p>记录公开来源、授权方式和允许使用的教学范围。</p></article><article><span>02</span><strong>检查字段与版本</strong><p>预览字段、缺失值与数据规模，为课堂固定资源版本。</p></article><article><span>03</span><strong>绑定教学活动</strong><p>后续由资源服务绑定课程、练习或实训任务，学生无需管理文件。</p></article></section>}<Tabs value={tab} onChange={(_, value) => setTab(value)} className="tool-tabs" aria-label="数据集来源"><Tab value="public" label={`公开经典数据 (${publicDatasets.length})`} /><Tab value="local" label={`${teacherMode ? "教师本地导入" : "本地导入"} (${imports.length})`} /></Tabs>{tab === "public" ? <section className="dataset-layout"><div className="dataset-list">{publicDatasets.map((dataset) => <article className="dataset-card" key={dataset.id}><div><span className="dataset-category">{dataset.category}</span><h2>{dataset.name}</h2><p>{dataset.description}</p><small>{dataset.file} · {dataset.rows}</small></div><div className="dataset-actions"><Tooltip title="预览数据"><IconButton onClick={() => showPublicPreview(dataset)} aria-label={`预览 ${dataset.name}`}><VisibilityRounded fontSize="small" /></IconButton></Tooltip><Tooltip title="复制 Pandas 读取代码"><IconButton onClick={() => copyCode(dataset)} aria-label={`复制 ${dataset.name} 的读取代码`}><ContentCopyRounded fontSize="small" /></IconButton></Tooltip></div></article>)}</div><aside className="dataset-preview-panel"><h2>{preview?.title || "数据预览"}</h2><p>{loadingPreview ? "正在读取前几行数据..." : "选择数据集上的预览按钮，查看前 8 行。"}</p>{!loadingPreview && preview && <PreviewTable preview={preview.data} />}</aside></section> : <section className="dataset-local"><label className="dataset-upload"><UploadFileRounded /><span><strong>{teacherMode ? "导入教师本地 CSV 或 TSV" : "导入本地 CSV 或 TSV"}</strong><small>{teacherMode ? "用于教学资源预检；当前仅保存于本机浏览器，单个文件最大 60 MB" : "文件仅保存于当前浏览器，单个文件最大 60 MB"}</small></span><input type="file" accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values" onChange={importFile} /></label>{imports.length ? <div className="dataset-list">{imports.map((dataset) => <article className="dataset-card" key={dataset.id}><div><span className="dataset-category">本地文件</span><h2>{dataset.name}</h2><p>导入于 {new Date(dataset.importedAt).toLocaleString("zh-CN")}</p><small>{formatFileSize(dataset.size)}</small></div><div className="dataset-actions"><Tooltip title="预览数据"><IconButton onClick={() => showImportPreview(dataset)} aria-label={`预览 ${dataset.name}`}><VisibilityRounded fontSize="small" /></IconButton></Tooltip><Tooltip title="下载文件"><IconButton onClick={() => downloadImport(dataset)} aria-label={`下载 ${dataset.name}`}><DownloadRounded fontSize="small" /></IconButton></Tooltip><Tooltip title="删除导入文件"><IconButton color="error" onClick={async () => { await deleteImportedDataset(dataset.id); await reloadImports(); if (preview?.title === dataset.name) setPreview(null); notify("已删除本地导入文件"); }} aria-label={`删除 ${dataset.name}`}><DeleteOutlineRounded fontSize="small" /></IconButton></Tooltip></div></article>)}</div> : <div className="dataset-empty">尚未导入本地文件。</div>}{preview && <div className="dataset-local-preview"><h2>{preview.title}</h2><PreviewTable preview={preview.data} /></div>}</section>}<Snackbar open={toast.open} autoHideDuration={2600} onClose={() => setToast((value) => ({ ...value, open: false }))}><Alert severity={toast.severity} variant="filled">{toast.message}</Alert></Snackbar></Container>;
}
