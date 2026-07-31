import { useRef, useState } from "react";
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Snackbar } from "@mui/material";
import DownloadRounded from "@mui/icons-material/DownloadRounded";
import UploadFileRounded from "@mui/icons-material/UploadFileRounded";
import { exportLearningBackup, readLearningBackup, restoreLearningBackup } from "./learningBackup";

export function LearningBackupPanel() {
  const inputRef = useRef(null);
  const [pendingBackup, setPendingBackup] = useState(null);
  const [toast, setToast] = useState({ open: false, message: "", severity: "success" });
  const notify = (message, severity = "success") => setToast({ open: true, message, severity });
  const downloadBackup = () => {
    const blob = new Blob([JSON.stringify(exportLearningBackup(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `python-data-studio-learning-${new Date().toISOString().slice(0, 10)}.json`; anchor.click(); URL.revokeObjectURL(url);
    notify("学习记录备份已下载");
  };
  const chooseBackup = async (event) => {
    const file = event.target.files?.[0]; event.target.value = "";
    if (!file) return;
    try { setPendingBackup(await readLearningBackup(file)); } catch (error) { notify(error.message || "备份文件读取失败", "error"); }
  };
  return <section className="learning-backup"><div><div className="eyebrow">学习记录备份</div><h2>迁移你的学习状态</h2><p>导出或恢复最近学习、章节进度与学习笔记。Notebook 草稿和本地数据文件不包含在备份中。</p></div><div className="learning-backup-actions"><Button variant="outlined" startIcon={<DownloadRounded />} onClick={downloadBackup}>导出备份</Button><Button variant="outlined" startIcon={<UploadFileRounded />} onClick={() => inputRef.current?.click()}>导入备份</Button><input ref={inputRef} type="file" accept="application/json,.json" onChange={chooseBackup} hidden /></div><Dialog open={Boolean(pendingBackup)} onClose={() => setPendingBackup(null)} aria-labelledby="restore-learning-backup-title"><DialogTitle id="restore-learning-backup-title">恢复学习记录？</DialogTitle><DialogContent><DialogContentText>这会覆盖当前浏览器中的最近学习、完成进度和学习笔记，Notebook 草稿及本地导入的数据不会受到影响。</DialogContentText></DialogContent><DialogActions><Button onClick={() => setPendingBackup(null)}>取消</Button><Button color="primary" variant="contained" onClick={() => { restoreLearningBackup(pendingBackup); setPendingBackup(null); notify("学习记录已恢复"); }}>恢复备份</Button></DialogActions></Dialog><Snackbar open={toast.open} autoHideDuration={2600} onClose={() => setToast((value) => ({ ...value, open: false }))}><Alert severity={toast.severity} variant="filled">{toast.message}</Alert></Snackbar></section>;
}
