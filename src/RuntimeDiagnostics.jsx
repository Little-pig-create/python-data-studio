import { useEffect, useState } from "react";
import { Alert, Button, CircularProgress } from "@mui/material";
import RefreshRounded from "@mui/icons-material/RefreshRounded";
import FolderOpenRounded from "@mui/icons-material/FolderOpenRounded";
import { useNavigate } from "react-router-dom";
import { getRuntimeAssetDetail } from "./runtimeAssets";

const desktop = () => Boolean(globalThis.__TAURI_INTERNALS__ || globalThis.__TAURI_METADATA__);

// 本地资源探测结果 → 可读说明。CDN 回退本身不报错，但会让首次启动明显变慢，
// 所以要在诊断页写出来，而不是只躺在控制台里。
const assetReasonLabels = {
  complete: "本地资源完整，内核从同源磁盘加载",
  incomplete: "本地资源不完整，已回退公网 CDN",
  "manifest-missing": "未找到本地资源，已回退公网 CDN",
  "probe-failed": "本地资源探测失败，已回退公网 CDN",
};

export function RuntimeDiagnostics() {
  const navigate = useNavigate();
  const [state, setState] = useState({ loading: true, data: null, error: "" });
  const [assets, setAssets] = useState(null);
  const load = async () => {
    setState({ loading: true, data: null, error: "" });
    setAssets(null);
    if (!desktop()) {
      setState({ loading: false, data: { runtime: { kind: "jupyterlite", status: "browser", capabilities: { offline: true, richOutput: true } } }, error: "" });
      // Web 版没有本地服务，真正决定"启动快不快"的是资源来自本地还是 CDN。
      try { setAssets(await getRuntimeAssetDetail()); } catch { setAssets({ source: "cdn", reason: "probe-failed" }); }
      return;
    }
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      setState({ loading: false, data: await invoke("native_runtime_diagnostics"), error: "" });
    } catch (error) { setState({ loading: false, data: null, error: error?.message || "无法读取运行时诊断" }); }
  };
  useEffect(() => { load(); }, []);
  const runtime = state.data?.runtime;
  const packages = Array.isArray(assets?.packages) ? assets.packages : null;
  return <main className="dashboard-page runtime-diagnostics-page">
    <div className="dashboard-header"><div><div className="dashboard-kicker">运行时诊断</div><h1>Python Runtime</h1><p className="dashboard-lede">查看当前运行模式、路径和可复现环境信息。</p></div><Button variant="outlined" startIcon={<FolderOpenRounded />} onClick={() => navigate(-1)}>返回</Button></div>
    {state.loading && <CircularProgress size={24} />}
    {state.error && <Alert severity="error">{state.error}</Alert>}
    {runtime && <section className="metric-panel runtime-diagnostics-panel"><div className="eyebrow">默认运行时</div><p className="dashboard-lede">{desktop() ? "Native CPython（Tauri 桌面版，本地 Python 服务）" : "JupyterLite（Web 版，浏览器内 WASM Python）"}</p><div className="eyebrow">当前状态</div><strong className="metric-value">{runtime.status || "unknown"}</strong><dl className="runtime-diagnostics-list">
      {[["运行时", runtime.kind], ["Python", runtime.pythonVersion], ["服务地址", runtime.serverUrl], ["工作区", runtime.workspacePath], ["数据集", runtime.datasetsPath], ["日志", runtime.logPath]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || "未提供"}</dd></div>)}
    </dl><Button variant="contained" startIcon={<RefreshRounded />} onClick={load}>重新读取</Button></section>}
    {assets && <section className="metric-panel runtime-diagnostics-panel"><div className="eyebrow">Pyodide 资源来源</div>
      <Alert severity={assets.source === "local" ? "success" : "warning"}>{assetReasonLabels[assets.reason] || assets.reason}</Alert>
      <dl className="runtime-diagnostics-list">
        {[["来源", assets.source === "local" ? "同源 /pyodide/" : "公网 CDN"], ["本地化包", packages ? `${packages.length} 个` : "未提供"], ["包清单", packages?.length ? packages.join("、") : "未提供"]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
      </dl>
      {assets.source !== "local" && <p className="dashboard-lede">执行 <code>npm run build:runtime:assets</code> 可把 Pyodide 与课程依赖下载到本地，首次启动不再依赖公网带宽。</p>}
    </section>}
    {state.data?.manifest && <section className="metric-panel"><div className="eyebrow">Runtime Manifest</div><pre className="runtime-manifest">{JSON.stringify(state.data.manifest, null, 2)}</pre></section>}
  </main>;
}
