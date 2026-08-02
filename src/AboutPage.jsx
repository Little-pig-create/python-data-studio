import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Chip, CircularProgress, Divider, LinearProgress } from "@mui/material";
import ArrowBackRounded from "@mui/icons-material/ArrowBackRounded";
import CheckCircleOutlineRounded from "@mui/icons-material/CheckCircleOutlineRounded";
import CodeRounded from "@mui/icons-material/CodeRounded";
import DesktopWindowsRounded from "@mui/icons-material/DesktopWindowsRounded";
import GitHub from "@mui/icons-material/GitHub";
import InfoOutlined from "@mui/icons-material/InfoOutlined";
import OpenInNewRounded from "@mui/icons-material/OpenInNewRounded";
import RefreshRounded from "@mui/icons-material/RefreshRounded";
import RestartAltRounded from "@mui/icons-material/RestartAltRounded";
import SchoolRounded from "@mui/icons-material/SchoolRounded";
import SystemUpdateAltRounded from "@mui/icons-material/SystemUpdateAltRounded";
import { useNavigate } from "react-router-dom";
import { roleHome, useAuth } from "./AuthProvider";

const APP_VERSION = "0.1.1";
const COURSE_CONTENT_VERSION = 14;
const PROJECT_URL = "https://github.com/Little-pig-create/python-data-studio";
const RELEASE_URL = `${PROJECT_URL}/releases/latest`;
const GITEE_URL = "https://gitee.com/xiaozhusir/python-data-studio";
const LICENSE = "MIT";
const IS_TAURI = typeof window !== "undefined" && Boolean(window.__TAURI_INTERNALS__);
const UPDATER_ENABLED = import.meta.env.VITE_TAURI_UPDATER_ENABLED === "true";

const UPDATE_STATE = Object.freeze({
  IDLE: "idle",
  CHECKING: "checking",
  AVAILABLE: "available",
  UP_TO_DATE: "up-to-date",
  ERROR: "error",
  DOWNLOADING: "downloading",
  READY: "ready",
});

function platformLabel() {
  if (typeof navigator === "undefined") return "未知平台";
  const value = navigator.userAgentData?.platform || navigator.platform || navigator.userAgent;
  if (/win/i.test(value)) return "Windows";
  if (/mac/i.test(value)) return "macOS";
  if (/linux/i.test(value)) return "Linux";
  return value;
}

function buildModeLabel() {
  if (IS_TAURI) return UPDATER_ENABLED ? "Tauri 桌面端 · 在线更新已启用" : "Tauri 桌面端 · 本地构建";
  return "浏览器端";
}

function formatDate(value) {
  if (!value) return "未提供";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString("zh-CN");
}

function AboutInfoRow({ label, value, children }) {
  return <div className="about-info-row"><span>{label}</span><strong>{children || value}</strong></div>;
}

export function AboutPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [updateState, setUpdateState] = useState(UPDATE_STATE.IDLE);
  const [updateInfo, setUpdateInfo] = useState(null);
  const [updateError, setUpdateError] = useState("");
  const [progress, setProgress] = useState(0);
  const [releaseNotes, setReleaseNotes] = useState(null);
  const [notesState, setNotesState] = useState("loading");

  const platform = useMemo(platformLabel, []);
  const buildMode = useMemo(buildModeLabel, []);

  useEffect(() => {
    let active = true;
    async function loadReleaseNotes() {
      try {
        const response = await fetch("https://api.github.com/repos/Little-pig-create/python-data-studio/releases/latest", {
          headers: { Accept: "application/vnd.github+json" },
        });
        if (!response.ok) throw new Error(`请求失败（${response.status}）`);
        const payload = await response.json();
        if (active) {
          setReleaseNotes(payload);
          setNotesState("ready");
        }
      } catch {
        if (active) setNotesState("error");
      }
    }
    loadReleaseNotes();
    return () => { active = false; };
  }, []);

  async function checkForUpdate() {
    setUpdateError("");
    if (!IS_TAURI) {
      setUpdateState(UPDATE_STATE.ERROR);
      setUpdateError("浏览器版不支持桌面端自动更新，请前往项目 Release 页面下载新版本。");
      return;
    }
    if (!UPDATER_ENABLED) {
      setUpdateState(UPDATE_STATE.ERROR);
      setUpdateError("当前桌面构建未启用在线更新。正式发布版会从 GitHub Release 检查更新。");
      return;
    }
    setUpdateState(UPDATE_STATE.CHECKING);
    try {
      const { check } = await import("@tauri-apps/plugin-updater");
      const update = await check();
      if (update) {
        setUpdateInfo({ update, version: update.version, body: update.body, date: update.date });
        setUpdateState(UPDATE_STATE.AVAILABLE);
      } else {
        setUpdateState(UPDATE_STATE.UP_TO_DATE);
      }
    } catch (error) {
      setUpdateState(UPDATE_STATE.ERROR);
      setUpdateError(error?.message || "更新服务暂时不可用");
    }
  }

  async function downloadAndInstall() {
    if (!updateInfo?.update) return;
    setUpdateState(UPDATE_STATE.DOWNLOADING);
    setProgress(0);
    try {
      let downloaded = 0;
      let total = 0;
      await updateInfo.update.downloadAndInstall((event) => {
        if (event.event === "Started") total = event.data?.contentLength ?? 0;
        if (event.event === "Progress") {
          downloaded += event.data?.chunkLength ?? 0;
          setProgress(total > 0 ? Math.min(99, Math.round(downloaded / total * 100)) : 0);
        }
        if (event.event === "Finished") setProgress(100);
      });
      setUpdateState(UPDATE_STATE.READY);
    } catch (error) {
      setUpdateState(UPDATE_STATE.ERROR);
      setUpdateError(error?.message || "更新下载失败");
    }
  }

  async function relaunch() {
    try {
      const { relaunch: tauriRelaunch } = await import("@tauri-apps/plugin-process");
      await tauriRelaunch();
    } catch {
      setUpdateState(UPDATE_STATE.ERROR);
      setUpdateError("更新已下载，请手动重启应用完成安装。");
    }
  }

  const backPath = user ? roleHome(user.role) : "/login";
  const statusText = {
    [UPDATE_STATE.IDLE]: "尚未检查",
    [UPDATE_STATE.CHECKING]: "正在检查更新…",
    [UPDATE_STATE.AVAILABLE]: `发现新版本 v${updateInfo?.version || ""}`,
    [UPDATE_STATE.UP_TO_DATE]: "当前已是最新版本",
    [UPDATE_STATE.ERROR]: "检查更新失败",
    [UPDATE_STATE.DOWNLOADING]: `正在下载更新${progress ? ` · ${progress}%` : "…"}`,
    [UPDATE_STATE.READY]: "更新已下载，等待重启",
  }[updateState];

  return <main className="portal-page about-page">
    <header className="about-header">
      <div className="about-brand">
        <span className="about-app-mark"><InfoOutlined /></span>
        <div><span className="eyebrow">应用信息</span><h1>Python Data Studio</h1><p>面向学习与实训的数据分析工作台。</p></div>
      </div>
      <Button variant="outlined" startIcon={<ArrowBackRounded />} onClick={() => navigate(backPath)}>返回工作台</Button>
    </header>

    <section className="about-hero">
      <div>
        <div className="about-version-line"><Chip label={`v${APP_VERSION}`} color="primary" size="small" /><span>稳定版</span></div>
        <h2>把课程、Notebook 和实训练习放在一个可持续更新的工作台里。</h2>
        <p>这里集中展示应用版本、课程内容版本、运行环境与更新状态。桌面正式版可以直接检查、下载并安装新版本。</p>
      </div>
      <div className="about-hero-icon"><DesktopWindowsRounded /></div>
    </section>

    <section className="about-grid">
      <article className="workspace-panel about-update-panel">
        <div className="workspace-panel-heading"><div><span className="eyebrow">应用更新</span><h2>检查新版本</h2></div><SystemUpdateAltRounded color="primary" /></div>
        <div className={`about-update-status is-${updateState}`}><span className="about-status-dot" /><strong>{statusText}</strong></div>
        {updateState === UPDATE_STATE.ERROR && <Alert severity="warning" sx={{ mt: 2 }}>{updateError}</Alert>}
        {updateState === UPDATE_STATE.AVAILABLE && <div className="about-release-preview"><strong>v{updateInfo.version}</strong><p>{updateInfo.body || "该版本暂未提供更新说明。"}</p><small>{formatDate(updateInfo.date)}</small></div>}
        {updateState === UPDATE_STATE.DOWNLOADING && <LinearProgress variant={progress ? "determinate" : "indeterminate"} value={progress} sx={{ mt: 2 }} />}
        {updateState === UPDATE_STATE.READY && <Alert severity="success" sx={{ mt: 2 }}>更新包已准备好，重启应用后生效。</Alert>}
        <div className="about-update-actions">
          <Button variant="contained" startIcon={updateState === UPDATE_STATE.CHECKING ? <CircularProgress size={16} color="inherit" /> : <RefreshRounded />} disabled={updateState === UPDATE_STATE.CHECKING || updateState === UPDATE_STATE.DOWNLOADING} onClick={checkForUpdate}>检查更新</Button>
          {updateState === UPDATE_STATE.AVAILABLE && <Button variant="outlined" startIcon={<SystemUpdateAltRounded />} onClick={downloadAndInstall}>下载并安装</Button>}
          {updateState === UPDATE_STATE.READY && <Button variant="outlined" startIcon={<RestartAltRounded />} onClick={relaunch}>立即重启</Button>}
          <Button variant="text" endIcon={<OpenInNewRounded />} component="a" href={RELEASE_URL} target="_blank" rel="noreferrer">查看 Release</Button>
        </div>
        <p className="about-update-hint">{buildMode}</p>
      </article>

      <article className="workspace-panel">
        <div className="workspace-panel-heading"><div><span className="eyebrow">版本信息</span><h2>当前环境</h2></div><CodeRounded color="primary" /></div>
        <div className="about-info-list">
          <AboutInfoRow label="应用版本" value={`v${APP_VERSION}`} />
          <AboutInfoRow label="课程内容" value={`v${COURSE_CONTENT_VERSION}`} />
          <AboutInfoRow label="运行模式" value={buildMode} />
          <AboutInfoRow label="平台" value={platform} />
          <AboutInfoRow label="许可证" value={LICENSE} />
        </div>
      </article>
    </section>

    <section className="workspace-panel about-notes-panel">
      <div className="workspace-panel-heading"><div><span className="eyebrow">更新说明</span><h2>最近一次发布内容</h2></div><Button size="small" endIcon={<OpenInNewRounded />} component="a" href={RELEASE_URL} target="_blank" rel="noreferrer">完整说明</Button></div>
      {notesState === "loading" && <p className="about-muted">正在读取 Release 更新说明…</p>}
      {notesState === "error" && <Alert severity="info">暂时无法读取在线更新说明，可打开 GitHub Release 页面查看。</Alert>}
      {notesState === "ready" && <div className="about-notes"><div className="about-notes-meta"><strong>{releaseNotes.name || releaseNotes.tag_name || "最新版本"}</strong><span>{formatDate(releaseNotes.published_at)}</span></div><p>{releaseNotes.body || "该版本暂未提供更新说明。"}</p></div>}
    </section>

    <section className="about-grid about-secondary-grid">
      <article className="workspace-panel">
        <div className="workspace-panel-heading"><div><span className="eyebrow">项目资源</span><h2>代码与发布渠道</h2></div><GitHub color="primary" /></div>
        <div className="about-link-list"><a href={PROJECT_URL} target="_blank" rel="noreferrer"><GitHub fontSize="small" />GitHub 源码仓库<OpenInNewRounded fontSize="small" /></a><a href={GITEE_URL} target="_blank" rel="noreferrer"><CodeRounded fontSize="small" />Gitee 镜像仓库<OpenInNewRounded fontSize="small" /></a><a href={RELEASE_URL} target="_blank" rel="noreferrer"><SystemUpdateAltRounded fontSize="small" />版本与安装包<OpenInNewRounded fontSize="small" /></a></div>
      </article>
      <article className="workspace-panel about-principles">
        <div className="workspace-panel-heading"><div><span className="eyebrow">产品定位</span><h2>学习 + 实训</h2></div><SchoolRounded color="primary" /></div>
        <p>课程内容以 Notebook 为核心，支持浏览器学习、桌面端运行、教师维护课程与学校实训场景。</p>
        <Divider sx={{ my: 1.5 }} />
        <small>版本信息和更新说明仅用于帮助用户确认当前安装包与课程内容状态。</small>
      </article>
    </section>
  </main>;
}
