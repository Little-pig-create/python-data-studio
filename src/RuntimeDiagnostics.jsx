import { useEffect, useState } from "react";
import { Alert, Button, ButtonGroup, CircularProgress } from "@mui/material";
import RefreshRounded from "@mui/icons-material/RefreshRounded";
import FolderOpenRounded from "@mui/icons-material/FolderOpenRounded";
import { useNavigate } from "react-router-dom";
import { getPreferredRuntimeKind, setPreferredRuntimeKind } from "./notebookRuntime";

const desktop = () => Boolean(globalThis.__TAURI_INTERNALS__ || globalThis.__TAURI_METADATA__);

export function RuntimeDiagnostics() {
  const navigate = useNavigate();
  const [state, setState] = useState({ loading: true, data: null, error: "" });
  const [preferred, setPreferred] = useState(getPreferredRuntimeKind());
  const load = async () => {
    setState({ loading: true, data: null, error: "" });
    if (!desktop()) { setState({ loading: false, data: { runtime: { kind: "jupyterlite", status: "browser", capabilities: { offline: true, richOutput: true } } }, error: "" }); return; }
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      setState({ loading: false, data: await invoke("native_runtime_diagnostics"), error: "" });
    } catch (error) { setState({ loading: false, data: null, error: error?.message || "无法读取运行时诊断" }); }
  };
  useEffect(() => { load(); }, []);
  const runtime = state.data?.runtime;
  return <main className="dashboard-page runtime-diagnostics-page">
    <div className="dashboard-header"><div><div className="dashboard-kicker">运行时诊断</div><h1>Python Runtime</h1><p className="dashboard-lede">查看当前运行模式、路径和可复现环境信息。</p></div><Button variant="outlined" startIcon={<FolderOpenRounded />} onClick={() => navigate(-1)}>返回</Button></div>
    {state.loading && <CircularProgress size={24} />}
    {state.error && <Alert severity="error">{state.error}</Alert>}
    {runtime && <section className="metric-panel runtime-diagnostics-panel"><div className="eyebrow">默认运行时</div><ButtonGroup size="small" aria-label="运行时选择"><Button variant={preferred === "native" ? "contained" : "outlined"} onClick={() => { setPreferred(setPreferredRuntimeKind("native")); }}>Native CPython</Button><Button variant={preferred === "jupyterlite" ? "contained" : "outlined"} onClick={() => { setPreferred(setPreferredRuntimeKind("jupyterlite")); }}>JupyterLite</Button></ButtonGroup><div className="eyebrow">当前状态</div><strong className="metric-value">{runtime.status || "unknown"}</strong><dl className="runtime-diagnostics-list">
      {[["运行时", runtime.kind], ["Python", runtime.pythonVersion], ["服务地址", runtime.serverUrl], ["工作区", runtime.workspacePath], ["数据集", runtime.datasetsPath], ["日志", runtime.logPath]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || "未提供"}</dd></div>)}
    </dl><Button variant="contained" startIcon={<RefreshRounded />} onClick={load}>重新读取</Button></section>}
    {state.data?.manifest && <section className="metric-panel"><div className="eyebrow">Runtime Manifest</div><pre className="runtime-manifest">{JSON.stringify(state.data.manifest, null, 2)}</pre></section>}
  </main>;
}
