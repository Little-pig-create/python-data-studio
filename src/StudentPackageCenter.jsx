import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Button, Chip, Snackbar } from "@mui/material";
import { Link } from "react-router-dom";
import AddRounded from "@mui/icons-material/AddRounded";
import ArrowBackRounded from "@mui/icons-material/ArrowBackRounded";
import DownloadRounded from "@mui/icons-material/DownloadRounded";
import PlayArrowRounded from "@mui/icons-material/PlayArrowRounded";
import RestartAltRounded from "@mui/icons-material/RestartAltRounded";
import { useAuth } from "./AuthProvider";
import { PortalHeader } from "./PortalHeader";
import { StudentWorkspaceNav } from "./components/StudentWorkspaceNav";
import { createRuntimeAdapter, getInstalledExternalPackages, getPreferredRuntimeKind, installExternalPackages } from "./notebookRuntime";
import { dependencyName, dependenciesToRequirements, normalizeDependency, normalizeDependencies, readInstalledPackages, saveInstalledPackages, studentPackageCatalog, studentRuntimePackageGroups } from "./studentPackageStore";
import { shutdownNotebookRuntime } from "./utils/notebookHelpers";

export function StudentPackageCenter() {
  const { user } = useAuth();
  const [draftPackage, setDraftPackage] = useState("");
  const [requirementsText, setRequirementsText] = useState("");
  const [installedPackages, setInstalledPackages] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const runtimeKind = getPreferredRuntimeKind();
  const canInstallPackages = runtimeKind !== "native";
  const dependencies = installedPackages;
  const installedPackageNames = useMemo(
    () => new Set(installedPackages.map((item) => dependencyName(item))),
    [installedPackages],
  );

  const refreshInstalledPackages = useCallback(async () => {
    await Promise.resolve();
    const next = normalizeDependencies([
      ...readInstalledPackages(user?.userId),
      ...getInstalledExternalPackages(),
    ]);
    setInstalledPackages(next);
    setRequirementsText(dependenciesToRequirements(next));
  }, [user?.userId]);

  useEffect(() => { void refreshInstalledPackages(); }, [refreshInstalledPackages]);

  const updateDependencies = async (nextDependencies, successMessage = "全局虚拟环境配置已保存") => {
    const next = normalizeDependencies(nextDependencies);
    saveInstalledPackages(user?.userId, next);
    setInstalledPackages(next);
    setRequirementsText(dependenciesToRequirements(next));
    setMessage(successMessage);
  };

  const installPackages = async (packages, successMessage) => {
    if (!packages.length || busy) return false;
    setBusy(true);
    setError("");
    let runtime = null;
    try {
      runtime = await createRuntimeAdapter("student-global-environment.ipynb");
      await installExternalPackages(runtime, packages);
      saveInstalledPackages(user?.userId, [
        ...readInstalledPackages(user?.userId),
        ...packages,
      ]);
      await refreshInstalledPackages();
      setMessage(successMessage);
      return true;
    } catch (reason) {
      setError(reason.message || "依赖包安装失败，请检查包名和运行时兼容性");
      return false;
    } finally {
      await shutdownNotebookRuntime(runtime);
      setBusy(false);
    }
  };

  const installAll = () => installPackages(
    dependencies,
    "全局依赖已验证；所有 Notebook 启动时都会自动准备这些包",
  );

  const addAndInstallPackage = async () => {
    const normalized = normalizeDependency(draftPackage);
    if (!normalized) {
      setError("请输入有效的 Python 包名，例如 requests、rich 或 openpyxl>=3.1");
      return;
    }
    if (!canInstallPackages) {
      setError("桌面端动态 pip 安装接口尚未开放，请使用已预装的课程依赖");
      return;
    }
    const installed = await installPackages(
      [normalized],
      `已安装 ${dependencyName(normalized)}，现在所有 Notebook 都可以使用`,
    );
    if (installed) setDraftPackage("");
  };

  const importRequirements = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const text = await file.text();
    setRequirementsText(text);
    setMessage("requirements.txt 已读取，请点击“保存全局配置”或“验证并安装全部”");
  };

  return <main className="student-workspace-page">
    <PortalHeader title="Python 环境" subtitle="这是当前学生账号的全局虚拟环境，系统课程和个人 Notebook 都可以使用其中的依赖。" actions={<Button component={Link} to="/course/chapter-1" variant="outlined" startIcon={<ArrowBackRounded />}>返回课程</Button>} />
    <StudentWorkspaceNav active="/student/packages" />
    <section className="student-environment-summary"><div><span className="eyebrow">全局运行时</span><h2>{runtimeKind === "native" ? "桌面 CPython" : "浏览器 Pyodide"}</h2><p>{runtimeKind === "native" ? "桌面运行时已提供课程预置依赖；全局依赖清单会保存，但动态 pip 安装接口暂未开放。" : "安装成功的第三方包会记录在当前学生账号下，所有 Notebook 启动时都会自动准备。"}</p></div><Chip color={runtimeKind === "native" ? "warning" : "success"} label={runtimeKind === "native" ? "预置依赖模式" : "全局可安装"} /></section>
    <section className="student-runtime-packages workspace-panel"><div className="student-section-heading"><div><span className="eyebrow">默认包与全局扩展</span><h2>所有 Notebook 都可使用</h2></div><span>{installedPackages.length ? `已保存 ${installedPackages.length} 个外部包记录` : "外部包仅在需要时安装"}</span></div><div className="student-runtime-package-groups">{studentRuntimePackageGroups.map((group) => <section key={group.id} className="student-runtime-package-group"><div className="student-runtime-package-group-heading"><div><strong>{group.label}</strong><p>{group.description}</p></div><Chip size="small" label={group.status} /></div><ul>{group.packages.map((name) => <li key={name}><code>{name}</code><span>{group.id === "course" ? "导入时自动准备" : group.status}</span></li>)}</ul></section>)}{installedPackages.length > 0 && <section className="student-runtime-package-group is-installed"><div className="student-runtime-package-group-heading"><div><strong>全局已安装包</strong><p>刷新后保留；下一次启动 Python 时会重新验证并准备。</p></div><Chip size="small" color="success" label="已保存" /></div><ul>{installedPackages.map((item) => <li key={item}><code>{item}</code><span>所有 Notebook 可用</span></li>)}</ul></section>}</div></section>
    {error && <Alert severity="error" onClose={() => setError("")}>{error}</Alert>}
    <section className="student-environment-layout">
      <article className="workspace-panel"><div className="student-section-heading"><div><span className="eyebrow">全局虚拟环境</span><h2>管理所有 Notebook 的依赖</h2></div><label className="student-file-button"><DownloadRounded fontSize="small" />导入 requirements.txt<input type="file" accept=".txt,text/plain" onChange={importRequirements} /></label></div><textarea className="student-requirements-editor" value={requirementsText} onChange={(event) => setRequirementsText(event.target.value)} onBlur={() => updateDependencies(normalizeDependencies(requirementsText))} placeholder={'requests==2.32.3\nrich>=13.0'} aria-label="全局 requirements 配置" /><div className="student-package-actions"><Button variant="contained" startIcon={<PlayArrowRounded />} disabled={busy || !dependencies.length || !canInstallPackages} onClick={installAll}>{busy ? "验证并安装中…" : "验证并安装全部"}</Button><Button variant="outlined" startIcon={<RestartAltRounded />} onClick={() => setRequirementsText(dependenciesToRequirements(dependencies))}>恢复已保存配置</Button></div><p className="student-environment-hint">这里的依赖不属于某一个项目。保存或安装后，系统课程 Notebook 和个人 Notebook 都可以使用。</p></article>
      <article className="workspace-panel"><div className="student-section-heading"><div><span className="eyebrow">全局额外依赖</span><h2>{dependencies.length} 个包</h2></div></div>{dependencies.length ? <div className="student-package-list">{dependencies.map((item) => <div key={item}><span>{dependencyName(item)}</span><code>{installedPackageNames.has(dependencyName(item)) ? "全局已记录" : item.slice(dependencyName(item).length) || "待验证"}</code></div>)}</div> : <div className="student-package-empty">还没有额外依赖；上方默认包可以直接使用。</div>}<div className="student-add-package"><input value={draftPackage} onChange={(event) => setDraftPackage(event.target.value)} placeholder="输入包名，例如 requests" onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addAndInstallPackage(); } }} /><Button size="small" startIcon={<AddRounded />} disabled={busy || !draftPackage.trim() || !canInstallPackages} onClick={addAndInstallPackage}>{busy ? "安装中…" : "添加并安装"}</Button></div><p className="student-environment-hint">浏览器端仅支持与 Pyodide 兼容的包；安装完成后列表会异步刷新。</p><div className="student-package-catalog"><h3>常用包建议</h3>{studentPackageCatalog.map((item) => <button type="button" key={item.name} onClick={() => setDraftPackage(item.name)}><strong>{item.label}</strong><span>{item.description}</span><small>{item.browser} · 点击填入</small></button>)}</div></article>
    </section>
    <Snackbar open={Boolean(message)} autoHideDuration={2600} message={message} onClose={() => setMessage("")} />
  </main>;
}
