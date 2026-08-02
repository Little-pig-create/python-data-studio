// ============================================================
// notebookRuntime.js — Python 运行时适配层
// 支持两种后端：
//   - JupyterLite (WASM/Pyodide) — 浏览器内
//   - Native (本地 Python 进程) — Tauri 桌面版
// ============================================================

// 注意：不要在此文件顶层导入 thebe-core 或 @jupyterlab/services
// 它们会在 createJupyterLiteRuntime / createNativeRuntime 中按需动态导入
// 桌面版构建时 thebe-core 会被 vite 别名替换为空桩

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

const normalizeNotebookPath = (notebookPath) => {
  const normalized = String(notebookPath || "course-runtime.ipynb")
    .replace(/^\/+/, "")
    .replace(/\//g, "-");
  return normalized || "course-runtime.ipynb";
};

const cloneValue = (value) => {
  try { return JSON.parse(JSON.stringify(value)); } catch { return value; }
};

const isTauriDesktop = () => Boolean(globalThis.__TAURI_INTERNALS__ || globalThis.__TAURI_METADATA__);

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

      try {
        await server.connectToJupyterLiteServer({ enableMemoryStorage: true });
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

async function createJupyterLiteRuntime(notebookPath) {
  const runtime = await getServerRuntime();
  const sessionPath = normalizeNotebookPath(notebookPath);
  const session = await runtime.server.startNewSession(runtime.renderMime, {
    path: `/${sessionPath}`,
    kernelName: "python"
  });
  if (!session?.kernel) {
    session?.dispose?.();
    throw new Error("Python 内核不可用");
  }

  try {
    await session.kernel.info;
  } catch (reason) {
    await session.shutdown().catch(() => session.dispose?.());
    throw new Error(errorMessage(reason, "Python 内核启动失败"));
  }

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
async function createNativeRuntime(notebookPath) {
  const info = await tauriInvoke("start_native_runtime");
  if (!info?.serverUrl || !info?.token) throw new Error("本地 Jupyter Server 未返回连接信息");

  // 动态导入 jupyterlab 客户端协议（桌面版保留此依赖）
  const { ServerConnection, SessionManager } = await import("@jupyterlab/services");

  const settings = ServerConnection.makeSettings({
    baseUrl: `${info.serverUrl}/`,
    wsUrl: `${info.serverUrl.replace(/^http/, "ws")}/`,
    token: info.token,
    appendToken: true
  });
  const sessions = new SessionManager({ serverSettings: settings });
  const normalizedPath = String(notebookPath || "course-runtime.ipynb").replace(/^\/+/, "");
  try {
    const session = await sessions.startNew({
      path: normalizedPath,
      type: "notebook",
      name: normalizedPath.split("/").at(-1) || "course-runtime.ipynb",
      kernel: { name: "python" }
    });
    if (!session?.kernel) {
      session?.dispose?.();
      throw new Error("Python 内核不可用");
    }

    await session.kernel.info;
    await configureNativeMatplotlibFont(session.kernel).catch(() => {});
    return {
      info,
      server: sessions,
      session,
      notebookPath: normalizedPath,
      native: true
    };
  } catch (reason) {
    await tauriInvoke("stop_native_runtime").catch(() => {});
    throw new Error(errorMessage(reason, "本地 Python 内核启动失败"));
  }
}

// ---- 公共入口与兼容适配器 ----
async function createNotebookRuntime(notebookPath) {
  const kind = getPreferredRuntimeKind();
  if (kind === "native") return createNativeRuntime(notebookPath);
  return createJupyterLiteRuntime(notebookPath);
}

// ---- 公共入口 ----
export async function createRuntimeAdapter(notebookPath) {
  const runtime = await createNotebookRuntime(notebookPath);
  return {
    ...runtime,
    capabilities: runtime.info?.capabilities || (runtime.native
      ? { nativeFileSystem: true, packageInstall: false, interrupt: true, richOutput: true, offline: true }
      : { nativeFileSystem: false, packageInstall: true, interrupt: true, richOutput: true, offline: true }),
    execute: async (source) => {
      await ensureCoursePackages(runtime, source);
      return executeNotebookCell(runtime, source);
    },
    interrupt: () => runtime.session?.kernel?.interrupt(),
    restart: () => restartNotebookRuntime(runtime),
    dispose: () => stopNotebookRuntime(runtime)
  };
}

export async function ensureCoursePackages(runtime, source) {
  // Native CPython is distributed with the course dependencies already
  // installed. Only JupyterLite needs package loading at execution time.
  if (runtime?.native) return;
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

font_path = Path("/tmp/NotoSansSC-Regular.otf")
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
            "/tmp/NotoSansSC-Regular.otf",
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
    code: runtime?.native
      ? applyNativeCjkFont(normalizeNativeNotebookSource(source))
      : applyJupyterLiteCjkFont(normalizeNotebookSource(source)),
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
  await runtime.session?.shutdown?.().catch(() => runtime.session?.dispose?.());
  if (runtime.native) await tauriInvoke("stop_native_runtime").catch(() => {});
}

export async function restartNotebookRuntime(runtime) {
  if (!runtime?.session?.restart) throw new Error("当前运行时不支持重启");
  await runtime.session.restart();
}

export async function disposeNotebookRuntime() {
  if (!serverRuntimePromise) return;
  const runtime = await serverRuntimePromise;
  await runtime.server.shutdownAllSessions();
  runtime.server.dispose();
  serverRuntimePromise = null;
}

export { requiredCoursePackages };

