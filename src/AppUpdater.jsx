import { useEffect, useRef, useState } from "react";
import { Alert, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, LinearProgress, Snackbar, Typography } from "@mui/material";
import SystemUpdateAltRounded from "@mui/icons-material/SystemUpdateAltRounded";
import CloseRounded from "@mui/icons-material/CloseRounded";
import RestartAltRounded from "@mui/icons-material/RestartAltRounded";
import {
  UPDATE_KIND,
  checkForAppUpdate,
  installAppUpdate,
  openManualUpdate,
  relaunchApp,
} from "./updaterService";

const IS_TAURI = typeof window !== "undefined" && Boolean(window.__TAURI_INTERNALS__);
const UPDATER_ENABLED = import.meta.env.VITE_TAURI_UPDATER_ENABLED === "true";

const STATE = Object.freeze({
  IDLE: "idle",
  CHECKING: "checking",
  AVAILABLE: "available",
  DOWNLOADING: "downloading",
  READY: "ready",
  ERROR: "error",
});

function formatSize(bytes) {
  if (!bytes) return "";
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function AppUpdater({ checkOnMount = true, checkIntervalMs = 4 * 60 * 60 * 1000 }) {
  const [state, setState] = useState(STATE.IDLE);
  const [updateInfo, setUpdateInfo] = useState(null);
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bannerOpen, setBannerOpen] = useState(false);
  const isMounted = useRef(true);
  const promptedVersion = useRef("");

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  async function checkForUpdate({ autoPrompt = false } = {}) {
    if (!IS_TAURI || !UPDATER_ENABLED) return;
    setErrorMsg("");
    setState(STATE.CHECKING);
    try {
      const result = await checkForAppUpdate();
      if (!isMounted.current) return;
      if (result.kind === UPDATE_KIND.NONE) {
        setState(STATE.IDLE);
        return;
      }
      setUpdateInfo(result);
      setState(STATE.AVAILABLE);
      if (autoPrompt && promptedVersion.current !== result.version) {
        promptedVersion.current = result.version;
        setBannerOpen(false);
        setDialogOpen(true);
      } else {
        setBannerOpen(true);
      }
    } catch (error) {
      if (!isMounted.current) return;
      setErrorMsg(error?.message || String(error));
      setState(STATE.ERROR);
    }
  }

  async function beginUpdate() {
    if (!updateInfo) return;
    if (updateInfo.kind === UPDATE_KIND.MANUAL) {
      openManualUpdate(updateInfo);
      setDialogOpen(false);
      setBannerOpen(false);
      return;
    }

    setState(STATE.DOWNLOADING);
    setProgress(0);
    setDialogOpen(true);
    try {
      let downloaded = 0;
      let total = 0;
      await installAppUpdate(updateInfo, (event) => {
        if (!isMounted.current) return;
        if (event.event === "Started") total = event.data?.contentLength ?? 0;
        if (event.event === "Progress") {
          downloaded += event.data?.chunkLength ?? 0;
          setProgress(total > 0 ? Math.min(99, Math.round(downloaded / total * 100)) : 0);
        }
        if (event.event === "Finished") setProgress(100);
      });
      setProgress(100);
      setState(STATE.READY);
    } catch (error) {
      if (!isMounted.current) return;
      setErrorMsg(error?.message || "更新下载或安装失败");
      setState(STATE.ERROR);
      setDialogOpen(false);
    }
  }

  async function restartApp() {
    try {
      await relaunchApp();
    } catch {
      setErrorMsg("更新已安装，请手动关闭并重新打开应用。");
      setState(STATE.ERROR);
      setDialogOpen(false);
    }
  }

  useEffect(() => {
    if (!IS_TAURI || !UPDATER_ENABLED || !checkOnMount) return undefined;
    const delay = window.setTimeout(() => checkForUpdate({ autoPrompt: true }), 2500);
    const interval = checkIntervalMs > 0
      ? window.setInterval(() => checkForUpdate({ autoPrompt: true }), checkIntervalMs)
      : null;
    return () => {
      window.clearTimeout(delay);
      if (interval != null) window.clearInterval(interval);
    };
  }, [checkOnMount, checkIntervalMs]);

  if (!IS_TAURI || !UPDATER_ENABLED) return null;

  const isManual = updateInfo?.kind === UPDATE_KIND.MANUAL;
  const isBusy = state === STATE.DOWNLOADING;

  return <>
    <Snackbar
      open={bannerOpen && state === STATE.AVAILABLE}
      anchorOrigin={{ vertical: "top", horizontal: "center" }}
      sx={{ top: "12px !important" }}
    >
      <Alert
        severity="info"
        icon={<SystemUpdateAltRounded fontSize="small" />}
        action={<div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <Button size="small" color="inherit" variant="outlined" onClick={() => { setBannerOpen(false); setDialogOpen(true); }}>查看更新</Button>
          <Button size="small" color="primary" variant="contained" disableElevation onClick={beginUpdate}>{isManual ? "下载新版本" : "立即更新"}</Button>
          <Button size="small" color="inherit" onClick={() => setBannerOpen(false)} sx={{ minWidth: 0 }}><CloseRounded fontSize="small" /></Button>
        </div>}
        sx={{ alignItems: "center", pr: 1 }}
      >
        发现新版本 <Chip label={`v${updateInfo?.version}`} size="small" sx={{ ml: 1, fontWeight: 600 }} />
      </Alert>
    </Snackbar>

    <Snackbar open={state === STATE.ERROR} autoHideDuration={10000} onClose={() => setState(STATE.IDLE)} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
      <Alert severity="warning" onClose={() => setState(STATE.IDLE)} sx={{ alignItems: "center" }}>检查更新失败：{errorMsg}</Alert>
    </Snackbar>

    <Dialog
      open={dialogOpen}
      onClose={() => {
        if (isBusy) return;
        setDialogOpen(false);
        if (state === STATE.AVAILABLE) setBannerOpen(true);
      }}
      disableEscapeKeyDown={isBusy}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <SystemUpdateAltRounded color="primary" />
        {state === STATE.READY ? "更新安装完成" : "发现新版本"}
        {updateInfo?.version && <Chip label={`v${updateInfo.version}`} size="small" color="primary" />}
      </DialogTitle>
      <DialogContent dividers>
        {updateInfo?.date && <Typography variant="caption" color="text.secondary" display="block" mb={1}>发布时间：{new Date(updateInfo.date).toLocaleString("zh-CN")}</Typography>}
        {isManual && <Alert severity="info" sx={{ mb: 2 }}>检测到新版本，但该 Release 尚未提供 Tauri 签名更新清单。点击按钮后将下载安装包进行更新。</Alert>}
        {updateInfo?.downloadName && <Typography variant="body2" color="text.secondary" mb={1}>安装包：{updateInfo.downloadName}{updateInfo.downloadSize ? ` · ${formatSize(updateInfo.downloadSize)}` : ""}</Typography>}
        <Typography variant="body2" component="pre" sx={{ whiteSpace: "pre-wrap", fontFamily: "inherit", m: 0, maxHeight: 260, overflow: "auto" }}>{updateInfo?.body || "该版本暂未提供更新说明。"}</Typography>
        {state === STATE.DOWNLOADING && <div style={{ marginTop: 20 }}><LinearProgress variant={progress > 0 ? "determinate" : "indeterminate"} value={progress} /><Typography variant="caption" color="text.secondary" display="block" mt={1}>正在下载并安装… {progress > 0 ? `${progress}%` : ""}</Typography></div>}
        {state === STATE.READY && <Alert severity="success" sx={{ mt: 2 }}>新版本已经安装完成，重启应用后生效。</Alert>}
      </DialogContent>
      <DialogActions>
        {state === STATE.READY
          ? <Button variant="contained" startIcon={<RestartAltRounded />} onClick={restartApp}>立即重启</Button>
          : <>
            <Button disabled={isBusy} onClick={() => { setDialogOpen(false); setBannerOpen(true); }}>稍后提醒</Button>
            <Button variant="contained" disableElevation disabled={isBusy} startIcon={isBusy ? <CircularProgress size={16} color="inherit" /> : <SystemUpdateAltRounded />} onClick={beginUpdate}>{isBusy ? "正在更新…" : isManual ? "下载新版本" : "立即更新"}</Button>
          </>}
      </DialogActions>
    </Dialog>
  </>;
}
