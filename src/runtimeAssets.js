/**
 * Python 运行时资源定位（Pyodide / piplite）。
 *
 * 背景：JupyterLite 默认从公网 CDN 拉取 Pyodide 与包索引——
 *   pyodide.asm.wasm 约 9.7 MB、python_stdlib.zip 约 2.3 MB，
 *   再叠加 numpy/pandas/matplotlib 约 20 MB。
 * 首次进入 notebook 必须等这些下载完成，断网时完全不可用。
 *
 * 本模块把资源**优先指向本地同源路径**（由 `npm run build:runtime:assets`
 * 预先下载到 public/pyodide 与 public/piplite），CDN 仅作兜底。
 *
 * 设计要点：
 *   - 探测是**异步且非阻塞**的：先看本地清单是否存在，存在才用本地。
 *   - 探测失败（离线构建、资源未下载）自动回退 CDN，不抛错、不阻塞启动。
 *   - 结果缓存一次，避免每个 notebook 重复探测。
 *   - **完整性门槛**：只有 manifest 明确声明 `complete: true` 才启用本地资源。
 *     原因是 Pyodide 在浏览器端**没有 CDN 回退**（见 pyodide.asm.js 的
 *     downloadPackage）：一旦 indexURL 指向本地，loadPackage 只会读本地 wheel，
 *     缺一个包就会让内核启动失败。宁可慢，也不能起不来。
 */

const PYODIDE_VERSION = "v0.27.0";
const PIPLITE_INDEX_VERSION = "0.4.7";

const CDN_PYODIDE = `https://cdn.jsdelivr.net/pyodide/${PYODIDE_VERSION}/full/pyodide.js`;
const CDN_PIPLITE_INDEX = `https://unpkg.com/@jupyterlite/pyodide-kernel@${PIPLITE_INDEX_VERSION}/pypi/all.json`;
const CDN_PIPLITE_WHEEL = `https://unpkg.com/@jupyterlite/pyodide-kernel@${PIPLITE_INDEX_VERSION}/pypi/piplite-${PIPLITE_INDEX_VERSION}-py3-none-any.whl`;

/** 本地资源清单：由 build:runtime:assets 生成。 */
const LOCAL_MANIFEST_PATH = "/pyodide/manifest.json";

/** 内核启动路径上的关键资源；提前 preload 可与 JS 解析并行下载。 */
const PRELOAD_SCRIPTS = ["/thebe-lite.min.js"];
const PRELOAD_FETCHES = ["/pyodide/pyodide.asm.wasm", "/pyodide/python_stdlib.zip"];

export const PYODIDE_KERNEL_PLUGIN_ID = "@jupyterlite/pyodide-kernel-extension:kernel";

let resolvedPromise = null;

async function probeLocalAssets() {
  if (typeof window === "undefined" || typeof fetch !== "function") return null;
  try {
    // no-cache：重新执行 build:runtime:assets 后能立刻生效，代价只有 200 字节。
    const response = await fetch(LOCAL_MANIFEST_PATH, { cache: "no-cache" });
    if (!response.ok) return null;
    const manifest = await response.json();
    if (!manifest?.pyodideUrl) return null;
    return manifest;
  } catch {
    return null;
  }
}

/**
 * 返回 JupyterLite 的 litePluginSettings 覆盖项。
 *
 * 命中**完整**的本地资源时返回本地 URL；否则返回 `{}`（thebe-lite 继续用它的
 * CDN 默认值）。永远不抛错——资源缺失只是"没变快"，不应该让 notebook 打不开。
 */
export function resolveLitePluginSettings() {
  if (!resolvedPromise) {
    resolvedPromise = probeLocalAssets()
      .then((manifest) => {
        if (!manifest) {
          // 便于在 DevTools 中确认当前走的是本地资源还是 CDN。
          console.info("[runtime] 未找到本地 Pyodide 资源，回退 CDN。"
            + "如需离线可用，请运行 npm run build:runtime:assets");
          return { source: "cdn", reason: "manifest-missing", settings: {} };
        }
        if (manifest.complete !== true) {
          console.warn("[runtime] 本地 Pyodide 资源不完整，回退 CDN。"
            + "请重新运行 npm run build:runtime:assets（浏览器端没有 CDN 回退，"
            + "缺 wheel 会导致内核启动失败）。");
          return { source: "cdn", reason: "incomplete", settings: {} };
        }
        const bootstrapPackages = Array.isArray(manifest.bootstrapPackages)
          ? manifest.bootstrapPackages
          : [];
        const settings = {
          [PYODIDE_KERNEL_PLUGIN_ID]: {
            pyodideUrl: manifest.pyodideUrl,
            ...(manifest.pipliteIndexUrl ? { pipliteUrls: [manifest.pipliteIndexUrl] } : {}),
            ...(manifest.pipliteWheelUrl ? { pipliteWheelUrl: manifest.pipliteWheelUrl } : {}),
            // 本地索引只覆盖内核依赖；seaborn/plotly/nbformat 仍需 PyPI 回退。
            ...(manifest.disablePyPIFallback === false ? {} : { disablePyPIFallback: true }),
            // 内核启动时会 `piplite.install('ssl','sqlite3','ipykernel','comm',
            // 'pyodide_kernel','ipython')`。其中 ssl/sqlite3/ipython 在 Pyodide
            // 发行版里就有——把它们交给 loadPyodide 直接装载，内核就会跳过
            // piplite，从而**不再联网去 PyPI 拉 IPython**（本地磁盘即可）。
            ...(bootstrapPackages.length ? { loadPyodideOptions: { packages: bootstrapPackages } } : {}),
          },
        };
        console.info("[runtime] 使用本地 Pyodide 资源：", manifest.pyodideUrl,
          `（已本地化 ${manifest.packages?.length ?? 0} 个包）`);
        return { source: "local", reason: "complete", settings };
      })
      .catch((reason) => {
        console.warn("[runtime] 探测本地资源失败，回退 CDN：", reason?.message || reason);
        return { source: "cdn", reason: "probe-failed", settings: {} };
      });
  }
  return resolvedPromise;
}

/**
 * 提前拉取 Pyodide 核心大文件与 thebe-lite 脚本。
 *
 * 内核启动是**串行**的：加载 thebe-lite 脚本（0.5 MB）→ 下载 pyodide.asm.wasm
 * （9.7 MB）→ 下载 python_stdlib.zip（2.3 MB）→ 启动内核。这 12 MB 的下载完全
 * 可以与脚本解析、内核握手并行。这里用 `<link rel="preload">` 把它们塞进浏览器的
 * 早期下载队列，命中 HTTP 缓存后 `loadPyodide` 无需再等网络。
 *
 * 幂等：重复调用不会插入重复标签；非浏览器环境直接返回。
 */
export function preloadRuntimeAssets() {
  if (typeof document === "undefined") return;
  const specs = [
    ...PRELOAD_SCRIPTS.map((href) => ({ href, as: "script", crossOrigin: undefined })),
    // pyodide 内部用 fetch() 取这两个文件，as="fetch" 才能命中同一条缓存。
    ...PRELOAD_FETCHES.map((href) => ({ href, as: "fetch", crossOrigin: "anonymous" })),
  ];
  for (const spec of specs) {
    if (document.querySelector(`link[data-runtime-preload="${spec.href}"]`)) continue;
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = spec.as;
    if (spec.crossOrigin) link.crossOrigin = spec.crossOrigin;
    link.href = new URL(spec.href, window.location.origin).href;
    link.dataset.runtimePreload = spec.href;
    document.head.appendChild(link);
  }
}

/** 供诊断页展示：当前使用的是本地资源还是 CDN，以及原因。 */
export async function getRuntimeAssetSource() {
  const { source } = await resolveLitePluginSettings();
  return source;
}

/** 供诊断页展示：本地资源探测的完整结果。 */
export async function getRuntimeAssetDetail() {
  return resolveLitePluginSettings();
}

export const runtimeAssetDefaults = {
  pyodideUrl: CDN_PYODIDE,
  pipliteIndexUrl: CDN_PIPLITE_INDEX,
  pipliteWheelUrl: CDN_PIPLITE_WHEEL,
};
