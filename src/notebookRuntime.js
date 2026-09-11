// ============================================================
// notebookRuntime.js — Python 运行时适配层
// 支持两种后端：
//   - JupyterLite (WASM/Pyodide) — 浏览器内
//   - Native (本地 Python 进程) — Tauri 桌面版
// ============================================================

// 注意：不要在此文件顶层导入 thebe-core 或 @jupyterlab/services
// 它们会在 createJupyterLiteRuntime / createNativeRuntime 中按需动态导入
// 桌面版构建时 thebe-core 会被 vite 别名替换为空桩

import { preloadRuntimeAssets, resolveLitePluginSettings } from "./runtimeAssets.js";

// ---- 常量 ----
const coursePackages = {
  numpy: { loader: "pyodide", name: "numpy" },
  pandas: { loader: "pyodide", name: "pandas" },
  matplotlib: { loader: "pyodide", name: "matplotlib" },
  scipy: { loader: "pyodide", name: "scipy" },
  sklearn: { loader: "pyodide", name: "scikit-learn", prerequisites: ["numpy", "pandas", "scipy"] },
  seaborn: { loader: "piplite", name: "seaborn", prerequisites: ["numpy", "pandas", "matplotlib"] },
  nbformat: { loader: "piplite", name: "nbformat" },
  plotly: { loader: "piplite", name: "plotly", prerequisites: ["nbformat"] }
};

// ---- 工具函数 ----
const requiredCoursePackages = (source) => {
  const imports = [...String(source || "").matchAll(/^\s*(?:from|import)\s+([A-Za-z_]\w*)/gm)]
    .map((match) => match[1]);
  const names = new Set();

  for (const imported of imports) {
    const packageInfo = coursePackages[imported];
    if (!packageInfo) continue;
    names.add(imported);
    packageInfo.prerequisites?.forEach((name) => names.add(name));
  }

  return [...names];
};

const errorMessage = (reason, fallback = "Python 运行时初始化失败") => {
  if (reason instanceof Error && reason.message) return reason.message;
  if (typeof reason === "string" && reason) return reason;
  if (reason?.message) return String(reason.message);
  return fallback;
};

const installedExternalPackages = new Set();

const withTimeout = (promise, timeoutMs, message) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error(message)), timeoutMs);
  Promise.resolve(promise).then(
    (value) => { clearTimeout(timer); resolve(value); },
    (reason) => { clearTimeout(timer); reject(reason); }
  );
});

/**
 * 内核启动阶段（用于进度提示）。
 *
 * 权重按**实测耗时**分配（Chrome 无头 + DevTools 计时）：
 *   冷启动：到达 ready 约 6.4 s，等待 kernel.info 约 5.0 s，总计约 11.4 s；
 *   二次进入：到达 ready 约 6.5 s，等待 kernel.info 约 0.7 s。
 * 可见"等待内核就绪"（ready）才是最耗时且最无反馈的一段，
 * 因此它的权重必须最大 —— 否则进度条会长时间停在同一个数字上，
 * 看起来像卡死（这正是此前"卡在 40%"的成因）。
 */
export const RUNTIME_PHASES = [
  { id: "script", label: "正在加载运行时脚本", weight: 8 },
  { id: "connect", label: "正在连接 Python 运行时", weight: 12 },
  { id: "session", label: "正在创建 Python 内核", weight: 15 },
  // 等待 kernel.info：冷启动约 5 秒且无法上报子进度，给最大权重。
  { id: "ready", label: "正在确认内核状态", weight: 40 },
  { id: "packages", label: "正在准备课程依赖", weight: 20 },
  { id: "done", label: "Python 内核已就绪", weight: 5 },
];

const PHASE_TOTAL_WEIGHT = RUNTIME_PHASES.reduce((sum, phase) => sum + phase.weight, 0);

// 内核就绪等待上限。JupyterLite 首次启动需加载 WebAssembly 与标准库，
// 网络较慢时约 10–20 秒；超过该上限视为失败并给出可读提示，
// 而不是让界面永久停在"正在确认内核状态"。
const KERNEL_READY_TIMEOUT_MS = 45_000;

/** 阶段在整条进度中的起止百分比（含该阶段自身的推进区间）。 */
function phaseRange(phaseId) {
  let acc = 0;
  for (const phase of RUNTIME_PHASES) {
    const start = acc;
    acc += phase.weight;
    if (phase.id === phaseId) {
      return { start: (start / PHASE_TOTAL_WEIGHT) * 100, end: (acc / PHASE_TOTAL_WEIGHT) * 100 };
    }
  }
  return null;
}

/** 按阶段 id 计算累计进度百分比（0–100）。 */
function progressForPhase(phaseId) {
  const range = phaseRange(phaseId);
  return range ? Math.round(range.end) : 0;
}

/**
 * 构造进度上报器。
 *
 * 除按阶段跳变外，还提供 `tick(phaseId)`：在"已知要等但拿不到子进度"的阶段
 * （典型是等待 kernel.info）里按时间**平滑推进**到该阶段上限的 92%，
 * 让用户看到进度在走，而不是长时间纹丝不动。
 */
function makeProgressReporter(onProgress) {
  if (typeof onProgress !== "function") {
    const noop = () => {};
    noop.tick = () => noop;
    noop.stopTick = () => {};
    return noop;
  }

  let timer = null;
  const stopTick = () => {
    if (timer != null) {
      clearInterval(timer);
      timer = null;
    }
  };

  const report = (phaseId, detail) => {
    const phase = RUNTIME_PHASES.find((item) => item.id === phaseId);
    if (!phase) return;
    stopTick(); // 进入新阶段时先停掉上一阶段的平滑推进
    onProgress({
      phase: phaseId,
      label: detail || phase.label,
      percent: progressForPhase(phaseId),
      done: phaseId === "done",
    });
  };

  /**
   * 在指定阶段内按时间平滑推进（每秒一次，最多到该阶段的 92%）。
   * @param phaseId 目标阶段
   * @param expectedMs 预估耗时，用于决定推进速度
   */
  report.tick = (phaseId, expectedMs = 6000) => {
    const phase = RUNTIME_PHASES.find((item) => item.id === phaseId);
    const range = phaseRange(phaseId);
    if (!phase || !range) return report;
    stopTick();
    const startedAt = Date.now();
    // 上限留出余量：真正的阶段完成会由 report() 直接跳到 100%，
    // 避免"自己先跑满再停顿"的观感。
    const ceiling = range.start + (range.end - range.start) * 0.92;
    timer = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const ratio = Math.min(1, elapsed / expectedMs);
      const percent = Math.round(range.start + (ceiling - range.start) * ratio);
      onProgress({
        phase: phaseId,
        label: phase.label,
        percent,
        done: false,
      });
      if (ratio >= 1) stopTick();
    }, 500);
    // Node 环境下不要在退出前挂住事件循环
    timer?.unref?.();
    return report;
  };

  report.stopTick = stopTick;
  return report;
}

const normalizeNotebookPath = (notebookPath) => {
  const normalized = String(notebookPath || "course-runtime.ipynb")
    .replace(/^\/+/, "")
    .replace(/\//g, "-");
  return normalized || "course-runtime.ipynb";
};

const cloneValue = (value) => {
  try { return JSON.parse(JSON.stringify(value)); } catch { return value; }
};

const isTauriDesktop = () => import.meta.env.VITE_DESKTOP_MODE === "true"
  || Boolean(globalThis.__TAURI_INTERNALS__ || globalThis.__TAURI_METADATA__);

// ---- 运行时选择 ----
export function getPreferredRuntimeKind() {
  // Web 版固定使用 JupyterLite，Tauri 版固定使用本地 CPython。
  // 不再让桌面版切回已被排除的 WASM 运行时。
  return isTauriDesktop() ? "native" : "jupyterlite";
}

export function setPreferredRuntimeKind() {
  return getPreferredRuntimeKind();
}

// ---- Tauri IPC ----
async function tauriInvoke(command, args) {
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke(command, args);
}

// ---- JupyterLite 运行时创建（动态导入 thebe-core）----
let serverRuntimePromise;
let thebeLiteScriptPromise;
let activeNotebookRuntime;

async function ensureThebeLiteLoaded() {
  if (typeof window === "undefined") throw new Error("浏览器环境不可用");
  if (window.thebeLite?.startJupyterLiteServer) return window.thebeLite;
  if (!thebeLiteScriptPromise) {
    thebeLiteScriptPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-thebe-lite="true"]');
      if (existing) {
        existing.addEventListener("load", () => resolve(window.thebeLite), { once: true });
        existing.addEventListener("error", () => reject(new Error("Python 运行时脚本加载失败")), { once: true });
        return;
      }
      const script = document.createElement("script");
      script.src = new URL("/thebe-lite.min.js", window.location.origin).href;
      script.async = true;
      script.dataset.thebeLite = "true";
      script.onload = () => resolve(window.thebeLite);
      script.onerror = () => reject(new Error("Python 运行时脚本加载失败"));
      document.head.appendChild(script);
    }).catch((reason) => {
      thebeLiteScriptPromise = null;
      throw reason;
    });
  }
  return thebeLiteScriptPromise;
}

async function getServerRuntime() {
  if (!serverRuntimePromise) {
    const initialization = (async () => {
      // 动态导入 thebe-core（桌面版构建时会被别名替换为空桩）
      const { makeConfiguration, makeRenderMimeRegistry, ThebeServer } = await import("thebe-core");

      await ensureThebeLiteLoaded();
      if (!window.thebeLite?.startJupyterLiteServer) {
        throw new Error("Python 运行时模块未加载");
      }

      const config = makeConfiguration({
        kernelOptions: { kernelName: "python", path: "course-runtime.ipynb" },
        savedSessionOptions: { enabled: false }
      });
      const server = new ThebeServer(config);

      // 优先使用本地同源的 Pyodide / piplite 资源（若已通过
      // `npm run build:runtime:assets` 下载）；缺失则回退 CDN，不阻塞启动。
      const { settings: litePluginSettings } = await resolveLitePluginSettings();

      try {
        await server.connectToJupyterLiteServer({ enableMemoryStorage: true, litePluginSettings });
      } catch (reason) {
        server.dispose();
        throw new Error(errorMessage(reason, "无法连接到 Python 运行时"));
      }

      const renderMime = makeRenderMimeRegistry({
        mathjaxUrl: "",
        mathjaxConfig: ""
      });
      return { server, renderMime, config };
    })();

    serverRuntimePromise = initialization.catch((reason) => {
      serverRuntimePromise = null;
      throw reason;
    });
  }

  return serverRuntimePromise;
}

export async function readActiveRuntimeDirectory(path = "") {
  if (!serverRuntimePromise) return null;
  const runtime = await serverRuntimePromise;
  const contents = runtime?.server?.serviceManager?.contents;
  if (!contents) return null;
  return contents.get(String(path || "").replace(/^\/+|\/+$/g, ""), { content: true });
}

const runtimeFileTreeScript = `
from pathlib import Path
import base64
import json

_studio_file_count = 0

def _studio_file_tree(folder, relative="", depth=0):
    global _studio_file_count
    node = {
        "name": folder.name or "/",
        "path": relative,
        "type": "directory",
        "size": 0,
        "children": [],
    }
    if depth >= 12 or _studio_file_count >= 2000:
        return node
    try:
        entries = sorted(
            folder.iterdir(),
            key=lambda item: (not item.is_dir(), item.name.casefold()),
        )
    except (OSError, PermissionError):
        return node
    for entry in entries:
        if _studio_file_count >= 2000:
            break
        _studio_file_count += 1
        entry_path = f"{relative}/{entry.name}".strip("/")
        try:
            is_directory = entry.is_dir() and not entry.is_symlink()
        except OSError:
            is_directory = False
        if is_directory:
            node["children"].append(_studio_file_tree(entry, entry_path, depth + 1))
            continue
        try:
            size = entry.stat().st_size
        except OSError:
            size = 0
        node["children"].append({
            "name": entry.name,
            "path": entry_path,
            "type": "notebook" if entry.suffix.lower() == ".ipynb" else "file",
            "size": size,
            "children": [],
        })
    return node

_studio_file_payload = json.dumps(
    _studio_file_tree(Path.cwd()),
    ensure_ascii=False,
    separators=(",", ":"),
).encode("utf-8")
print("__STUDIO_FILE_TREE__" + base64.b64encode(_studio_file_payload).decode("ascii"))
`;

export async function readActiveKernelFileTree() {
  const kernel = activeNotebookRuntime?.session?.kernel;
  if (!kernel || kernel.isDisposed || kernel.status === "dead" || kernel.status === "busy") return null;
  let stdout = "";
  const future = kernel.requestExecute({
    code: runtimeFileTreeScript,
    silent: false,
    store_history: false,
    user_expressions: {},
    allow_stdin: false,
    stop_on_error: true
  });
  future.onIOPub = (message) => {
    if (message.header.msg_type === "stream" && message.content?.name === "stdout") {
      stdout += message.content.text || "";
    }
  };
  const reply = await future.done;
  if (reply?.content?.status !== "ok") return null;
  const encodedPayload = stdout.match(/__STUDIO_FILE_TREE__([A-Za-z0-9+/=]+)/)?.[1];
  if (!encodedPayload) return null;
  const bytes = Uint8Array.from(atob(encodedPayload), (character) => character.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

export async function readActiveKernelFile(path, maxBytes = 256 * 1024) {
  const kernel = activeNotebookRuntime?.session?.kernel;
  if (!kernel || kernel.isDisposed || kernel.status === "dead") throw new Error("请先运行一个代码单元格，再预览输出文件");
  if (kernel.status === "busy") throw new Error("Python 正在运行，请稍后再试");
  const normalizedPath = String(path || "").replaceAll("\\", "/").replace(/^\/+/, "");
  const byteLimit = Math.max(1, Math.min(Number(maxBytes) || 0, 1024 * 1024));
  const script = `
from pathlib import Path
import base64
import json

_studio_root = Path.cwd().resolve()
_studio_target = (_studio_root / ${JSON.stringify(normalizedPath)}).resolve()
if _studio_target != _studio_root and _studio_root not in _studio_target.parents:
    raise PermissionError("只能预览课程工作目录中的文件")
if not _studio_target.is_file():
    raise FileNotFoundError("文件不存在")
_studio_size = _studio_target.stat().st_size
with _studio_target.open("rb") as _studio_file:
    _studio_content = _studio_file.read(${byteLimit})
_studio_payload = json.dumps({
    "size": _studio_size,
    "truncated": _studio_size > len(_studio_content),
    "content": base64.b64encode(_studio_content).decode("ascii"),
}, separators=(",", ":")).encode("utf-8")
print("__STUDIO_FILE_PREVIEW__" + base64.b64encode(_studio_payload).decode("ascii"))
`;
  let stdout = "";
  const future = kernel.requestExecute({
    code: script,
    silent: false,
    store_history: false,
    user_expressions: {},
    allow_stdin: false,
    stop_on_error: true
  });
  future.onIOPub = (message) => {
    if (message.header.msg_type === "stream" && message.content?.name === "stdout") {
      stdout += message.content.text || "";
    }
  };
  const reply = await future.done;
  if (reply?.content?.status !== "ok") throw new Error(reply?.content?.evalue || "输出文件读取失败");
  const encodedPayload = stdout.match(/__STUDIO_FILE_PREVIEW__([A-Za-z0-9+/=]+)/)?.[1];
  if (!encodedPayload) throw new Error("输出文件读取失败");
  const bytes = Uint8Array.from(atob(encodedPayload), (character) => character.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

async function createJupyterLiteRuntime(notebookPath, onProgress) {
  const report = makeProgressReporter(onProgress);
  // 分阶段耗时记录：内核启动慢时，先在控制台看清"慢在哪一段"，
  // 而不是靠猜。格式：`[runtime] 内核启动 <阶段> <累计毫秒>ms`。
  const startedAt = performance.now();
  const marks = [];
  const mark = (id) => marks.push(`${id}=${Math.round(performance.now() - startedAt)}`);

  // Pyodide 核心（pyodide.asm.wasm 9.7 MB + python_stdlib.zip 2.3 MB）只在
  // startNewSession 时才被真正请求。这里先发 preload，让这 12 MB 与
  // "动态导入 thebe-core + 下载 thebe-lite 脚本"并行，而不是排在它们之后。
  preloadRuntimeAssets();

  mark("begin");
  report("script");
  const runtime = await getServerRuntime();
  mark("server");
  report("connect");
  const sessionPath = normalizeNotebookPath(notebookPath);
  report("session");
  const session = await runtime.server.startNewSession(runtime.renderMime, {
    path: `/${sessionPath}`,
    kernelName: "python"
  });
  mark("session");
  if (!session?.kernel) {
    session?.dispose?.();
    throw new Error("Python 内核不可用");
  }

  report("ready");
  // 注意：内核就绪等待必须有超时。此前直接 await kernel.info，一旦内核
  // 起不来就会永久停在"正在确认内核状态"（进度 40%），用户看不到任何提示。
  // 同时这是最长且拿不到子进度的一段（实测冷启动约 5 秒），用 tick 平滑推进，
  // 避免进度条长时间停在同一个数字上。
  report.tick("ready", 5000);
  try {
    await withTimeout(
      session.kernel.info,
      KERNEL_READY_TIMEOUT_MS,
      `Python 内核在 ${Math.round(KERNEL_READY_TIMEOUT_MS / 1000)} 秒内未就绪`
        + `（当前状态：${session.kernel.status || "未知"}）。`
        + "常见原因：浏览器阻止了 WebAssembly，或本地运行时资源不完整"
        + "（本地资源缺少包 wheel 时 Pyodide 不会回退 CDN）。"
        + "可尝试刷新页面；若持续失败，请检查 /pyodide/manifest.json 的 complete 字段，"
        + "或重新执行 npm run build:runtime:assets。",
    );
    mark("kernel-ready");
    report("done");
  } catch (reason) {
    mark("kernel-failed");
    report.stopTick();
    await session.shutdown().catch(() => session.dispose?.());
    console.warn(`[runtime] 内核启动失败：${marks.join(" ")}`);
    throw new Error(errorMessage(reason, "Python 内核启动失败"));
  }

  console.info(`[runtime] 内核启动耗时：${marks.join(" ")}（毫秒，累计）`);

  return {
    server: runtime.server,
    session,
    notebookPath: sessionPath,
    config: runtime.config,
    renderMime: runtime.renderMime,
    native: false
  };
}

// ---- Native matplotlib 中文字体配置（桌面端）----
// 打包的 CPython 只带 DejaVu 等西文字体，matplotlib 渲染中文会缺字形。
// 内核就绪后静默执行一次：注册系统常见中文字体并写入 rcParams。
async function configureNativeMatplotlibFont(kernel) {
  if (!kernel || kernel.isDisposed) return;
  const setupCode = `
import os
from matplotlib import font_manager
import matplotlib

_studio_font_candidates = [
    "C:/Windows/Fonts/msyh.ttc",
    "C:/Windows/Fonts/msyhbd.ttc",
    "C:/Windows/Fonts/simhei.ttf",
    "C:/Windows/Fonts/simsun.ttc",
    "/System/Library/Fonts/PingFang.ttc",
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
]
for _path in _studio_font_candidates:
    if os.path.exists(_path):
        try:
            font_manager.fontManager.addfont(_path)
            _name = font_manager.FontProperties(fname=_path).get_name()
            matplotlib.rcParams["font.family"] = [_name]
            matplotlib.rcParams["font.sans-serif"] = [_name, "DejaVu Sans"]
            matplotlib.rcParams["axes.unicode_minus"] = False
            break
        except Exception:
            continue
`;
  const future = kernel.requestExecute({
    code: setupCode,
    silent: true,
    store_history: false,
    user_expressions: {},
    allow_stdin: false,
    stop_on_error: true
  });
  await future.done;
}

// ---- Native 运行时创建（动态导入 @jupyterlab/services）----
async function createNativeRuntime(notebookPath, onStatus, onProgress) {
  const report = makeProgressReporter(onProgress);
  // 阶段 1：启动本地服务 与 加载通信组件 相互独立，并行执行以省一次往返。
  report("script", "正在加载内核通信组件");
  onStatus?.("正在启动本地 Python 服务");
  const [info, services] = await Promise.all([
    tauriInvoke("start_native_runtime"),
    import("@jupyterlab/services"),
  ]);
  if (!info?.serverUrl || !info?.token) throw new Error("本地 Jupyter Server 未返回连接信息");
  const { KernelManager, ServerConnection, SessionManager } = services;

  const settings = ServerConnection.makeSettings({
    baseUrl: `${info.serverUrl}/`,
    wsUrl: `${info.serverUrl.replace(/^http/, "ws")}/`,
    token: info.token,
    appendToken: true
  });
  // @jupyterlab/services 7.x requires an explicit KernelManager. Without it,
  // SessionManager dereferences `kernelManager.isActive` during construction
  // and desktop cell execution remains stuck in "正在启动 Python 内核".
  const kernels = new KernelManager({ serverSettings: settings });
  const sessions = new SessionManager({ serverSettings: settings, kernelManager: kernels });
  const normalizedPath = String(notebookPath || "course-runtime.ipynb").replace(/^\/+/, "");
  try {
    report("session");
    onStatus?.("正在创建 Python 内核");
    const session = await withTimeout(sessions.startNew({
      path: normalizedPath,
      type: "notebook",
      name: normalizedPath.split("/").at(-1) || "course-runtime.ipynb",
      kernel: { name: "python" }
    }), 20_000, "Python 内核创建超时，请重试");
    if (!session?.kernel) {
      session?.dispose?.();
      throw new Error("Python 内核不可用");
    }

    report("ready");
    onStatus?.("正在确认 Python 内核状态");
    // 本地内核通常 1–3 秒就绪，同样平滑推进以保持反馈。
    report.tick("ready", 3000);
    await withTimeout(session.kernel.info, 12_000, "Python 内核连接超时，请重试");
    report("done");
    onStatus?.("Python 内核已就绪");
    let matplotlibSetupPromise = null;
    return {
      info,
      server: sessions,
      session,
      notebookPath: normalizedPath,
      ensureMatplotlibConfigured: () => {
        if (!matplotlibSetupPromise) {
          matplotlibSetupPromise = configureNativeMatplotlibFont(session.kernel).catch(() => {});
        }
        return matplotlibSetupPromise;
      },
      native: true
    };
  } catch (reason) {
    await tauriInvoke("stop_native_runtime").catch(() => {});
    throw new Error(errorMessage(reason, "本地 Python 内核启动失败"));
  }
}

// ---- 公共入口与兼容适配器 ----
// 原生运行时复用：启动本地 Jupyter 服务需要 5–10 秒（spawn Python + 等端口就绪），
// 而每次切换章节都会请求一次运行时。若不复用，切章会反复重启服务，
// 既慢又会在日志里留下多次 spawn/停止记录。
// 这里按"notebook 路径"缓存：同一路径复用，换路径才重建（服务本身与路径绑定）。
let nativeRuntimePromise = null;
let nativeRuntimePath = null;

function createNotebookRuntime(notebookPath, options = {}) {
  const kind = getPreferredRuntimeKind();
  if (kind !== "native") return createJupyterLiteRuntime(notebookPath, options.onProgress);
  const key = String(notebookPath || "");
  if (nativeRuntimePromise && nativeRuntimePath === key) return nativeRuntimePromise;
  nativeRuntimePath = key;
  nativeRuntimePromise = createNativeRuntime(notebookPath, options.onStatus, options.onProgress)
    .catch((error) => {
      // 失败后清空缓存，下次可以重试。
      nativeRuntimePromise = null;
      nativeRuntimePath = null;
      throw error;
    });
  return nativeRuntimePromise;
}

// ---- 公共入口 ----
export async function createRuntimeAdapter(notebookPath, options = {}) {
  const runtime = await createNotebookRuntime(notebookPath, options);
  activeNotebookRuntime = runtime;
  // 包加载阶段（浏览器端最耗时，约占整体的一半）也需要上报进度。
  runtime.progressReporter = makeProgressReporter(options.onProgress);
  return {
    ...runtime,
    capabilities: runtime.info?.capabilities || (runtime.native
      ? { nativeFileSystem: true, packageInstall: false, interrupt: true, richOutput: true, offline: true }
      : { nativeFileSystem: false, packageInstall: true, interrupt: true, richOutput: true, offline: true }),
    execute: async (source) => {
      await ensureCoursePackages(runtime, source);
      return executeNotebookCell(runtime, source);
    },
    prewarm: (options) => prewarmCoursePackages(runtime, options),
    installPackages: (packages) => installExternalPackages(runtime, packages),
    interrupt: () => runtime.session?.kernel?.interrupt(),
    restart: () => restartNotebookRuntime(runtime),
    dispose: () => stopNotebookRuntime(runtime)
  };
}

// 内核对齐后，提前在后台加载本章真正会用到的包，避免首个单元格运行前才下载。
// 仅对 JupyterLite 生效；native runtime 已内置依赖。失败静默，不阻塞启动。
//
// 为什么不无条件预加载 numpy/pandas/matplotlib：
//   课程第 1–14 章（Python 基础）与 capstone-python 完全不使用第三方包，
//   但旧实现会在进入这些章节时下载约 22 MB —— 纯属浪费。
//   因此改为**扫描本章源代码得出实际导入的包**，只预加载这些。
const FALLBACK_PREWARM = ["numpy", "pandas", "matplotlib"];

/** 从 notebook 源码中解析出本章用到的课程包（按 coursePackages 的键返回）。 */
export function detectRequiredPackages(source) {
  const detected = new Set();
  const text = String(source || "");
  for (const match of text.matchAll(/^\s*(?:from|import)\s+([A-Za-z_]\w*)/gm)) {
    const name = match[1];
    if (coursePackages[name]) {
      detected.add(name);
      // 补齐前置依赖（如 sklearn 需要 numpy/pandas/scipy）
      for (const prerequisite of coursePackages[name].prerequisites || []) {
        detected.add(prerequisite);
      }
    }
  }
  return [...detected];
}

/**
 * @param runtime 运行时句柄
 * @param options.source       本章全部代码格的源码；用于推断需要哪些包
 * @param options.packages     显式指定包列表（优先于 source 推断）
 */
export async function prewarmCoursePackages(runtime, options = {}) {
  if (runtime?.native) return;
  const kernel = runtime?.session?.kernel;
  if (!kernel || kernel.isDisposed || kernel.status === "dead") return;

  // 明确给出包列表时用它；给出源码时按源码推断；都没有才退回默认三项。
  const requested = Array.isArray(options.packages) && options.packages.length
    ? options.packages.filter((name) => coursePackages[name])
    : (options.source
      ? detectRequiredPackages(options.source)
      : FALLBACK_PREWARM);

  // 本章不需要任何第三方包：直接跳过，不再白白下载 22 MB。
  if (!requested.length) return;

  const installedPackages = runtime.installedPackages || new Set();
  runtime.installedPackages = installedPackages;
  const pending = requested.filter((name) => !installedPackages.has(name));
  if (!pending.length) return;
  const report = runtime.progressReporter || (() => {});
  report("packages", `正在准备课程依赖（${pending.length} 个包）`);
  console.info(
    `[runtime] 依赖预热开始：识别=${requested.join(",") || "无"} 待装=${pending.join(",") || "无"}`
    + ` 源(${String(options.source || "").length}字)=${JSON.stringify(String(options.source || "").slice(0, 400))}`,
  );
  const pyodideNames = pending
    .filter((name) => coursePackages[name].loader === "pyodide")
    .map((name) => coursePackages[name].name);
  const pipliteNames = pending
    .filter((name) => coursePackages[name].loader === "piplite")
    .map((name) => coursePackages[name].name);
  const setupCode = [];
  if (pyodideNames.length) {
    setupCode.push("from pyodide_js import loadPackage");
    setupCode.push(`await loadPackage(${JSON.stringify(pyodideNames)})`);
  }
  if (pipliteNames.length) {
    setupCode.push("import piplite");
    setupCode.push(`await piplite.install(${JSON.stringify(pipliteNames)}, keep_going=True)`);
  }
  if (!setupCode.length) return;
  const prewarmStart = performance.now();
  try {
    const future = kernel.requestExecute({
      code: setupCode.join("\n"),
      silent: true,
      store_history: false,
      user_expressions: {},
      allow_stdin: false,
      stop_on_error: true,
    });
    const reply = await future.done;
    if (reply?.content?.status === "ok") {
      pending.forEach((name) => installedPackages.add(name));
    }
    runtime.lastPrewarmMs = Math.round(performance.now() - prewarmStart);
    console.info(
      `[runtime] 依赖预热完成：${runtime.lastPrewarmMs} 毫秒（${pending.join(", ")}）`,
    );
  } catch (error) {
    // 预热失败不阻塞：首个单元格仍会按需加载。
    runtime.lastPrewarmMs = Math.round(performance.now() - prewarmStart);
    console.warn(
      `[runtime] 依赖预热失败：${runtime.lastPrewarmMs} 毫秒（${pending.join(", ")}）`,
      error,
    );
  }
}

export async function ensureCoursePackages(runtime, source) {
  // Native CPython is distributed with the course dependencies already
  // installed. Only JupyterLite needs package loading at execution time.
  if (runtime?.native) {
    if (/^\s*(?:from|import)\s+(?:matplotlib|seaborn)\b/m.test(String(source || ""))) {
      await runtime.ensureMatplotlibConfigured?.();
    }
    return;
  }
  const requestedPackages = requiredCoursePackages(source);
  if (!requestedPackages.length) return;

  const kernel = runtime?.session?.kernel;
  if (!kernel || kernel.isDisposed || kernel.status === "dead") {
    throw new Error("Python 内核不可用");
  }

  const installedPackages = runtime.installedPackages || new Set();
  runtime.installedPackages = installedPackages;
  const pendingPackages = requestedPackages.filter((name) => !installedPackages.has(name));
  if (!pendingPackages.length) return;

  const pyodidePackages = pendingPackages
    .filter((name) => coursePackages[name].loader === "pyodide")
    .map((name) => coursePackages[name].name);
  const piplitePackages = pendingPackages
    .filter((name) => coursePackages[name].loader === "piplite")
    .map((name) => coursePackages[name].name);
  const setupCode = [];

  if (pyodidePackages.length) {
    setupCode.push("from pyodide_js import loadPackage");
    setupCode.push(`await loadPackage(${JSON.stringify(pyodidePackages)})`);
  }
  if (piplitePackages.length) {
    setupCode.push("import piplite");
    setupCode.push(`await piplite.install(${JSON.stringify(piplitePackages)}, keep_going=False)`);
  }
  if (pyodidePackages.includes("matplotlib") && !runtime.matplotlibConfigured) {
    setupCode.push(`
from pathlib import Path
from pyodide.http import pyfetch
import matplotlib
from matplotlib import font_manager

# 中文字体专属目录：运行时可写，集中存放课程字体，避免散落各处。
_font_dir = Path("/tmp/pds_fonts")
_font_dir.mkdir(parents=True, exist_ok=True)
font_path = _font_dir / "NotoSansSC-Regular.otf"
if not font_path.exists():
    response = await pyfetch("/fonts/NotoSansSC-Regular.otf")
    response.raise_for_status()
    font_path.write_bytes(bytes(await response.bytes()))
font_manager.fontManager.addfont(str(font_path))
_font_name = font_manager.FontProperties(fname=str(font_path)).get_name()
# 使用真实字体名，避免 seaborn 将 sans-serif 重置为 Arial/DejaVu。
matplotlib.rcParams["font.family"] = [_font_name]
matplotlib.rcParams["font.sans-serif"] = [_font_name, "DejaVu Sans"]
matplotlib.rcParams["axes.unicode_minus"] = False
`);
  }

  const future = kernel.requestExecute({
    code: setupCode.join("\n"),
    silent: true,
    store_history: false,
    user_expressions: {},
    allow_stdin: false,
    stop_on_error: true
  });
  const reply = await future.done;
  if (reply?.content?.status !== "ok") {
    throw new Error(reply?.content?.evalue || "课程依赖安装失败");
  }

  pendingPackages.forEach((name) => installedPackages.add(name));
  if (pyodidePackages.includes("matplotlib")) runtime.matplotlibConfigured = true;
}

export async function installExternalPackages(runtime, packages = []) {
  const specs = [...new Set((Array.isArray(packages) ? packages : [packages])
    .map((item) => String(item || "").trim())
    .filter(Boolean))];
  if (!specs.length) return [];
  if (runtime?.native) {
    throw new Error("桌面端动态 pip 服务尚未启用，请先使用预装依赖或切换到浏览器运行时");
  }

  const kernel = runtime?.session?.kernel;
  if (!kernel || kernel.isDisposed || kernel.status === "dead") {
    throw new Error("Python 内核不可用，无法安装外部依赖");
  }

  const future = kernel.requestExecute({
    code: `import piplite\nawait piplite.install(${JSON.stringify(specs)}, keep_going=False)`,
    silent: true,
    store_history: false,
    user_expressions: {},
    allow_stdin: false,
    stop_on_error: true
  });
  const reply = await future.done;
  if (reply?.content?.status !== "ok") {
    throw new Error(reply?.content?.evalue || "外部 Python 包安装失败");
  }
  runtime.externalPackages = new Set([...(runtime.externalPackages || []), ...specs]);
  specs.forEach((spec) => installedExternalPackages.add(spec));
  return specs;
}

export function getInstalledExternalPackages() {
  return [...installedExternalPackages].sort((left, right) => left.localeCompare(right));
}

// ---- 代码源转换 ----
// JupyterLite kernels may expose `js` without a browser `window` export.
// Keep existing course cells portable by mapping that import to the current app origin.
const normalizeNotebookSource = (source) => {
  const text = String(source || "");
  const origin = typeof window !== "undefined" && window.location ? window.location.origin : "";
  const datasetBase = `${origin}/datasets/`;
  const normalized = text
    .replace(/^\s*from\s+js\s+import\s+window\s*$/gm, "")
    .replace(/f["']\{window\.location\.origin\}\/datasets\//g, (match) => match.startsWith("f'") ? "'" + datasetBase : '"' + datasetBase)
    .replace(/\{window\.location\.origin\}\/datasets\//g, datasetBase)
    .replace(/\{base_url\}\/datasets\//g, datasetBase)
    .replace(/\{base\}\/datasets\//g, datasetBase)
    .replace(/(["'])\/datasets\//g, (_, quote) => `${quote}${datasetBase}`);

  const datasetFiles = [...normalized.matchAll(/(?:https?:\/\/[^"'\s]+)?\/datasets\/([A-Za-z0-9._-]+)/g)]
    .map((match) => match[1])
    .filter((file, index, files) => files.indexOf(file) === index);
  if (!datasetFiles.length) return normalized;

  // urllib cannot open browser-served URLs inside Pyodide. Download once with
  // pyfetch, then let pandas read the local temporary file as usual.
  const downloads = datasetFiles.map((file) => `
_studio_path = "/tmp/studio-${file}"
if not __import__("pathlib").Path(_studio_path).exists():
    _studio_response = await pyfetch(${JSON.stringify(`${datasetBase}${file}`)})
    _studio_response.raise_for_status()
    __import__("pathlib").Path(_studio_path).write_bytes(bytes(await _studio_response.bytes()))
`).join("\n");
  const rewritten = datasetFiles.reduce(
    (code, file) => code.replaceAll(`${datasetBase}${file}`, `/tmp/studio-${file}`).replaceAll(`/datasets/${file}`, `/tmp/studio-${file}`),
    normalized
  );
  return `from pyodide.http import pyfetch\n${downloads}\n${rewritten}`;
};

const normalizeNativeNotebookSource = (source) => {
  const text = String(source || "")
    .replace(/^\s*from\s+js\s+import\s+window\s*$/gm, "");
  const files = [...text.matchAll(/\/datasets\/([A-Za-z0-9._-]+)/g)]
    .map((match) => match[1])
    .filter((file, index, all) => all.indexOf(file) === index);
  if (!files.length && !/window\.location\.origin|\{base_url\}|\{base\}/.test(text)) return text;

  const rewritten = text
    // f"{base_url}/datasets/foo.csv" must become a normal Python expression;
    // leaving braces inside the f-string would generate invalid nested quotes.
    .replace(/f(["'])\{(?:window\.location\.origin|base_url|base)\}\/datasets\/([A-Za-z0-9._-]+)\1/g, (_, _quote, file) => `studio_dataset("${file}")`)
    .replace(/\{(?:window\.location\.origin|base_url|base)\}\/datasets\/([A-Za-z0-9._-]+)/g, (_, file) => `studio_dataset("${file}")`)
    .replace(/(["'])\/datasets\/([A-Za-z0-9._-]+)\1/g, (_, _quote, file) => `studio_dataset("${file}")`)
    .replace(/\/datasets\/([A-Za-z0-9._-]+)/g, (_, file) => `studio_dataset("${file}")`);

  return `import os\nfrom pathlib import Path\n\ndef studio_dataset(name):\n    path = (Path(os.environ.get("PDS_DATASETS_DIR", ".")) / str(name)).resolve()\n    if not path.is_file():\n        raise FileNotFoundError(f"课程数据文件缺失: {path}")\n    return str(path)\n\n${rewritten}`;
};

// ---- Native 每 cell 中文字体兜底（seaborn set_theme 会重置 rcParams）----
const nativeCjkFontSetup = `def _studio_ensure_cjk_font():
    try:
        from matplotlib import font_manager
        import matplotlib
        import os as _os
        _path = "C:/Windows/Fonts/msyh.ttc"
        if not _os.path.exists(_path):
            _path = "C:/Windows/Fonts/simhei.ttf"
        if _os.path.exists(_path):
            font_manager.fontManager.addfont(_path)
            _name = font_manager.FontProperties(fname=_path).get_name()
            matplotlib.rcParams["font.family"] = [_name]
            matplotlib.rcParams["font.sans-serif"] = [_name, "DejaVu Sans"]
            matplotlib.rcParams["axes.unicode_minus"] = False
    except Exception:
        pass

_studio_ensure_cjk_font()
`;

const jupyterLiteCjkFontSetup = `def _studio_ensure_cjk_font():
    try:
        from matplotlib import font_manager
        import matplotlib
        import os as _os
        _font_candidates = [
            "/tmp/pds_fonts/NotoSansSC-Regular.otf",
            "C:/Windows/Fonts/msyh.ttc",
            "C:/Windows/Fonts/simhei.ttf",
        ]
        for _path in _font_candidates:
            if not _os.path.exists(_path):
                continue
            font_manager.fontManager.addfont(_path)
            _name = font_manager.FontProperties(fname=_path).get_name()
            matplotlib.rcParams["font.family"] = [_name]
            matplotlib.rcParams["font.sans-serif"] = [_name, "DejaVu Sans"]
            matplotlib.rcParams["axes.unicode_minus"] = False
            break
    except Exception:
        pass

_studio_ensure_cjk_font()
`;

const applyCjkFont = (source, setup) => {
  const text = String(source || "");
  const needsCjk = /(matplotlib|seaborn|\bplt\.|\bsns\.)/.test(text);
  if (!needsCjk) return text;
  // seaborn 的 set_theme / set 会重置 font.sans-serif，紧跟其后重新应用真实中文字体。
  const patched = text
    .replace(/(sns\.set_theme\s*\([^)]*\)|sns\.set\s*\([^)]*\))/g, "$&\n_studio_ensure_cjk_font()")
    // sns.axes_style/plotting_context 会在进入上下文时恢复默认西文字体，
    // 在 with 块内部重新应用中文字体，避免 Glyph missing。
    .replace(/^([ \t]*)(with\s+sns\.(?:axes_style|plotting_context)\s*\([^\n]*\):)/gm, "$1$2\n$1    _studio_ensure_cjk_font()");
  return setup + patched;
};

const applyNativeCjkFont = (source) => {
  const text = String(source || "");
  const needsCjk = /(matplotlib|seaborn|\bplt\.|\bsns\.)/.test(text);
  if (!needsCjk) return text;
  // seaborn 的 set_theme / set 会重置 font.sans-serif，紧跟其后重新应用字体
  const patched = text
    .replace(/(sns\.set_theme\s*\([^)]*\)|sns\.set\s*\([^)]*\))/g, "$&\n_studio_ensure_cjk_font()")
    .replace(/^([ \t]*)(with\s+sns\.(?:axes_style|plotting_context)\s*\([^\n]*\):)/gm, "$1$2\n$1    _studio_ensure_cjk_font()");
  return nativeCjkFontSetup + patched;
};

const applyJupyterLiteCjkFont = (source) => applyCjkFont(source, jupyterLiteCjkFontSetup);

// IPython 要求 Cell 魔法（%%time、%%capture 等）位于第一条非空语句。
// 数据路径和中文字体预处理会向源码前方插入辅助代码，因此需要把这些辅助代码
// 放进“执行 Python 正文”的 Cell 魔法体内；写文件、HTML、脚本等非 Python 魔法
// 则保持原文，避免改变其内容语义。
const pythonBodyCellMagics = new Set(["time", "timeit", "capture", "prun", "debug"]);

export const preserveCellMagicHeader = (source, transformPythonSource) => {
  const text = String(source || "");
  const match = text.match(/^((?:[ \t]*\r?\n)*[ \t]*%%([A-Za-z_]\w*)[^\r\n]*(?:\r?\n|$))([\s\S]*)$/);
  if (!match) return transformPythonSource(text);
  const magicName = match[2].toLowerCase();
  if (!pythonBodyCellMagics.has(magicName)) return text;
  return `${match[1]}${transformPythonSource(match[3])}`;
};

export const prepareNotebookSourceForExecution = (runtime, source) => preserveCellMagicHeader(
  source,
  runtime?.native
    ? (body) => applyNativeCjkFont(normalizeNativeNotebookSource(body))
    : (body) => applyJupyterLiteCjkFont(normalizeNotebookSource(body))
);

// ---- 单元格执行 ----
export async function executeNotebookCell(runtime, source) {
  const kernel = runtime?.session?.kernel;
  if (!kernel || kernel.isDisposed || kernel.status === "dead") {
    throw new Error("Python 内核不可用");
  }

  const outputs = [];
  const displayOutputs = new Map();
  let clearBeforeNextOutput = false;

  const appendOutput = (output, displayId) => {
    if (clearBeforeNextOutput) {
      outputs.length = 0;
      displayOutputs.clear();
      clearBeforeNextOutput = false;
    }
    if (
      output.output_type === "stream"
      && outputs.at(-1)?.output_type === "stream"
      && outputs.at(-1)?.name === output.name
    ) {
      outputs.at(-1).text = `${outputs.at(-1).text || ""}${output.text || ""}`;
      return;
    }
    outputs.push(output);
    if (displayId) displayOutputs.set(displayId, outputs.length - 1);
  };

  const future = kernel.requestExecute({
    code: prepareNotebookSourceForExecution(runtime, source),
    silent: false,
    store_history: true,
    user_expressions: {},
    allow_stdin: false,
    stop_on_error: true
  });

  future.onIOPub = (message) => {
    const type = message.header.msg_type;
    const content = message.content || {};

    if (type === "clear_output") {
      if (content.wait) {
        clearBeforeNextOutput = true;
      } else {
        outputs.length = 0;
        displayOutputs.clear();
      }
      return;
    }

    if (type === "stream") {
      appendOutput({
        output_type: "stream",
        name: content.name || "stdout",
        text: content.text || ""
      });
      return;
    }

    if (type === "error") {
      appendOutput({
        output_type: "error",
        ename: content.ename || "Error",
        evalue: content.evalue || "",
        traceback: cloneValue(content.traceback || [])
      });
      return;
    }

    if (type === "display_data" || type === "execute_result") {
      const output = {
        output_type: type,
        data: cloneValue(content.data || {}),
        metadata: cloneValue(content.metadata || {})
      };
      if (type === "execute_result") {
        output.execution_count = content.execution_count ?? null;
      }
      const displayId = content.transient?.display_id;
      if (displayId) output.transient = { display_id: displayId };
      appendOutput(output, displayId);
      return;
    }

    if (type === "update_display_data") {
      const displayId = content.transient?.display_id;
      const outputIndex = displayId ? displayOutputs.get(displayId) : undefined;
      if (outputIndex == null) return;
      outputs[outputIndex] = {
        ...outputs[outputIndex],
        data: cloneValue(content.data || {}),
        metadata: cloneValue(content.metadata || {})
      };
    }
  };

  const reply = await future.done;
  if (!reply?.content) {
    throw new Error("Python 内核未返回执行结果");
  }

  return {
    outputs,
    executionCount: reply.content.execution_count ?? null,
    error: reply.content.status === "error"
      || outputs.some((output) => output.output_type === "error")
  };
}

// ---- 生命周期管理 ----
export async function stopNotebookRuntime(runtime) {
  if (!runtime) return;
  if (activeNotebookRuntime === runtime) activeNotebookRuntime = null;
  await runtime.session?.shutdown?.().catch(() => runtime.session?.dispose?.());
  if (runtime.native) {
    await tauriInvoke("stop_native_runtime").catch(() => {});
    // 服务已停止，缓存必须失效，否则下次会复用到一个已死的运行时。
    nativeRuntimePromise = null;
    nativeRuntimePath = null;
  }
}

/**
 * 重启内核。
 *
 * 注意：@jupyterlab/services 的 ISessionConnection **没有 restart()** 方法
 * （只有 shutdown / changeKernel）。此前这里直接调用 `session.restart()`，
 * 在原生运行时下会抛 "session.restart is not a function"，
 * 被上层 catch 吞掉后界面直接变成"错误"且无法恢复。
 *
 * 正确做法按运行时区分：
 *  - 原生：重启内核对内核自身没有意义（内核进程即 Python 解释器），
 *    但 shim 层的 kernel 支持 restart；优先用它，否则退回 changeKernel。
 *  - JupyterLite：用 kernel.restart()，若无则重建内核连接。
 */
export async function restartNotebookRuntime(runtime) {
  const kernel = runtime?.session?.kernel;
  if (!kernel) throw new Error("Python 内核不可用");

  // 内核对象自带 restart（Kernel.IKernelConnection.restart）。
  if (typeof kernel.restart === "function") {
    await kernel.restart();
    return;
  }
  // 退回：通过 changeKernel 重新拉起一个同名内核。
  if (typeof runtime.session.changeKernel === "function") {
    const next = await runtime.session.changeKernel({ name: kernel.name || "python" });
    if (!next) throw new Error("Python 内核重启失败");
    return;
  }
  throw new Error("当前运行时不支持重启");
}

export async function disposeNotebookRuntime() {
  // 原生运行时：停服务并清缓存。
  if (nativeRuntimePromise) {
    nativeRuntimePromise = null;
    nativeRuntimePath = null;
    await tauriInvoke("stop_native_runtime").catch(() => {});
    activeNotebookRuntime = null;
  }
  if (!serverRuntimePromise) return;
  const runtime = await serverRuntimePromise;
  await runtime.server.shutdownAllSessions();
  runtime.server.dispose();
  serverRuntimePromise = null;
  activeNotebookRuntime = null;
}

export { requiredCoursePackages };

