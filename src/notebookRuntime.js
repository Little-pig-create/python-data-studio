import {
  makeConfiguration,
  makeRenderMimeRegistry,
  ThebeServer
} from "thebe-core";

let serverRuntimePromise;

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

async function getServerRuntime(notebookPath = "course-runtime.ipynb") {
  if (!serverRuntimePromise) {
    const initialization = (async () => {
      if (typeof window === "undefined" || !window.thebeLite?.startJupyterLiteServer) {
        throw new Error("Python 运行时模块未加载");
      }

      const config = makeConfiguration({
        kernelOptions: {
          kernelName: "python",
          path: notebookPath
        },
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

export async function createNotebookRuntime(notebookPath) {
  const runtime = await getServerRuntime(notebookPath);
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
    renderMime: runtime.renderMime
  };
}

export async function ensureCoursePackages(runtime, source) {
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
matplotlib.rcParams["font.family"] = "sans-serif"
matplotlib.rcParams["font.sans-serif"] = [font_manager.FontProperties(fname=str(font_path)).get_name()]
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

const cloneValue = (value) => {
  if (value == null) return value;
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
};

// JupyterLite kernels may expose `js` without a browser `window` export.
// Keep existing course cells portable by mapping that import to the current app origin.
const normalizeNotebookSource = (source) => {
  const text = String(source || "");
  const origin = typeof window !== "undefined" && window.location ? window.location.origin : "";
  const datasetBase = `${origin}/datasets/`;
  const normalized = text
    .replace(/^(\s*)from\s+js\s+import\s+window\s*$/gm, "")
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
` ).join("\n");
  const rewritten = datasetFiles.reduce((code, file) => code.replaceAll(`${datasetBase}${file}`, `/tmp/studio-${file}`).replaceAll(`/datasets/${file}`, `/tmp/studio-${file}`), normalized);
  return `from pyodide.http import pyfetch\n${downloads}\n${rewritten}`;
};

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
    code: normalizeNotebookSource(source),
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

export async function disposeNotebookRuntime() {
  if (!serverRuntimePromise) return;
  const runtime = await serverRuntimePromise;
  await runtime.server.shutdownAllSessions();
  runtime.server.dispose();
  serverRuntimePromise = null;
}
