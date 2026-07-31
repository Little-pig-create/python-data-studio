/**
 * AppUpdater.jsx
 *
 * 桌面端（Tauri）自动更新组件。
 * - Web 模式下完全不渲染（通过 window.__TAURI_INTERNALS__ 判断）
 * - 启动后自动检查更新，有新版本时显示通知条
 * - 支持查看更新说明、手动触发下载安装、显示下载进度
 */

import { useEffect, useRef, useState } from "react";
import { Alert, Button, Chip, CircularProgress, Collapse, Dialog, DialogActions, DialogContent, DialogTitle, LinearProgress, Snackbar, Typography } from "@mui/material";
import SystemUpdateAltRounded from "@mui/icons-material/SystemUpdateAltRounded";
import CloseRounded from "@mui/icons-material/CloseRounded";

// 是否运行在 Tauri 容器中
const IS_TAURI = typeof window !== "undefined" && Boolean(window.__TAURI_INTERNALS__);
const UPDATER_ENABLED = import.meta.env.VITE_TAURI_UPDATER_ENABLED === "true";

// 状态机：idle → checking → available | up-to-date | error → downloading → ready
const STATE = {
  IDLE: "idle",
  CHECKING: "checking",
  AVAILABLE: "available",
  UP_TO_DATE: "up-to-date",
  ERROR: "error",
  DOWNLOADING: "downloading",
  READY: "ready",
};

export function AppUpdater({ checkOnMount = true, checkIntervalMs = 4 * 60 * 60 * 1000 }) {
  const [state, setState] = useState(STATE.IDLE);
  const [updateInfo, setUpdateInfo] = useState(null);   // { version, body, date }
  const [progress, setProgress] = useState(0);          // 0–100
  const [errorMsg, setErrorMsg] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bannerOpen, setBannerOpen] = useState(false);
  const updaterRef = useRef(null);                       // tauri update handle
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  async function checkForUpdate() {
    if (!IS_TAURI || !UPDATER_ENABLED) return;
    try {
      const { check } = await import("@tauri-apps/plugin-updater");
      setState(STATE.CHECKING);
      const update = await check();
      if (!isMounted.current) return;
      if (update) {
        updaterRef.current = update;
        setUpdateInfo({ version: update.version, body: update.body, date: update.date });
        setState(STATE.AVAILABLE);
        setBannerOpen(true);
      } else {
        setState(STATE.UP_TO_DATE);
      }
    } catch (err) {
      if (!isMounted.current) return;
      setErrorMsg(err?.message || String(err));
      setState(STATE.ERROR);
    }
  }

  async function downloadAndInstall() {
    if (!updaterRef.current) return;
    setState(STATE.DOWNLOADING);
    setProgress(0);
    try {
      let downloaded = 0;
      let total = 0;
      await updaterRef.current.downloadAndInstall((event) => {
        if (!isMounted.current) return;
        if (event.event === "Started") {
          total = event.data?.contentLength ?? 0;
        } else if (event.event === "Progress") {
          downloaded += event.data?.chunkLength ?? 0;
          setProgress(total > 0 ? Math.min(99, Math.round((downloaded / total) * 100)) : 0);
        } else if (event.event === "Finished") {
          setProgress(100);
        }
      });
      // downloadAndInstall 完成后应用会自动重启，这里只是兜底
      setState(STATE.READY);
    } catch (err) {
      if (!isMounted.current) return;
      setErrorMsg(err?.message || String(err));
      setState(STATE.ERROR);
    }
  }

  async function restartApp() {
    try {
      const { relaunch } = await import("@tauri-apps/plugin-process");
      await relaunch();
    } catch {
      // 如果 relaunch 失败，提示用户手动重启
      setErrorMsg("请手动关闭并重新打开应用以完成更新。");
      setState(STATE.ERROR);
    }
  }

  // 启动时检查 + 定时轮询
  useEffect(() => {
    if (!IS_TAURI || !UPDATER_ENABLED || !checkOnMount) return;
    const delay = setTimeout(checkForUpdate, 3000);
    const interval = checkIntervalMs > 0 ? setInterval(checkForUpdate, checkIntervalMs) : null;
    return () => {
      clearTimeout(delay);
      if (interval) clearInterval(interval);
    };
  }, [checkOnMount, checkIntervalMs]);

  // Web 模式或 idle 时不渲染
  if (!IS_TAURI || !UPDATER_ENABLED) return null;

  return (
    <>
      {/* 顶部通知横幅：有新版本时出现 */}
      <Snackbar
        open={bannerOpen && state === STATE.AVAILABLE}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        sx={{ top: "12px !important" }}
      >
        <Alert
          severity="info"
          icon={<SystemUpdateAltRounded fontSize="small" />}
          action={
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <Button size="small" color="inherit" variant="outlined" onClick={() => { setBannerOpen(false); setDialogOpen(true); }}>
                查看更新
              </Button>
              <Button size="small" color="primary" variant="contained" disableElevation onClick={() => { setBannerOpen(false); downloadAndInstall(); }}>
                立即更新
              </Button>
              <Button size="small" color="inherit" onClick={() => setBannerOpen(false)} sx={{ minWidth: 0 }}>
                <CloseRounded fontSize="small" />
              </Button>
            </div>
          }
          sx={{ alignItems: "center", pr: 1 }}
        >
          发现新版本 <Chip label={`v${updateInfo?.version}`} size="small" sx={{ ml: 1, fontWeight: 600 }} />
        </Alert>
      </Snackbar>

      {/* 下载进度条：全屏顶部细条 */}
      <Collapse in={state === STATE.DOWNLOADING} unmountOnExit>
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 9999 }}>
          <LinearProgress variant={progress > 0 ? "determinate" : "indeterminate"} value={progress} sx={{ height: 3 }} />
          <div style={{ textAlign: "center", fontSize: 12, padding: "4px 0", background: "#1e40af", color: "#fff" }}>
            正在下载更新… {progress > 0 ? `${progress}%` : ""}
          </div>
        </div>
      </Collapse>

      {/* 下载完成提示 */}
      <Snackbar open={state === STATE.READY} anchorOrigin={{ vertical: "top", horizontal: "center" }} sx={{ top: "12px !important" }}>
        <Alert severity="success" action={<Button size="small" color="inherit" variant="outlined" onClick={restartApp}>立即重启</Button>} sx={{ alignItems: "center" }}>
          更新已下载完成，重启后生效
        </Alert>
      </Snackbar>

      {/* 错误提示 */}
      <Snackbar open={state === STATE.ERROR} autoHideDuration={8000} onClose={() => setState(STATE.IDLE)} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert severity="warning" onClose={() => setState(STATE.IDLE)} sx={{ alignItems: "center" }}>
          检查更新失败：{errorMsg}
        </Alert>
      </Snackbar>

      {/* 更新详情 Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          发现新版本 <Chip label={`v${updateInfo?.version}`} size="small" color="primary" sx={{ ml: 1 }} />
        </DialogTitle>
        <DialogContent dividers>
          {updateInfo?.date && (
            <Typography variant="caption" color="text.secondary" display="block" mb={1}>
              发布时间：{new Date(updateInfo.date).toLocaleDateString("zh-CN")}
            </Typography>
          )}
          <Typography variant="body2" component="pre" sx={{ whiteSpace: "pre-wrap", fontFamily: "inherit", m: 0 }}>
            {updateInfo?.body || "暂无更新说明。"}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>稍后更新</Button>
          <Button variant="contained" disableElevation startIcon={<SystemUpdateAltRounded />}
            onClick={() => { setDialogOpen(false); downloadAndInstall(); }}>
            下载并安装
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
