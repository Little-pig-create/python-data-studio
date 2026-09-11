/**
 * Python 运行时资源定位（Pyodide / piplite）。
 *
 * 背景：JupyterLite 默认从公网 CDN 拉取 Pyodide 与包索引——
 *   pyodide.asm.wasm 约 9–10 MB、python_stdlib.zip 约 5–6 MB，
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
 */

const PYODIDE_VERSION = "v0.27.0";
const PIPLITE_INDEX_VERSION = "0.4.7";

const CDN_PYODIDE = `https://cdn.jsdelivr.net/pyodide/${PYODIDE_VERSION}/full/pyodide.js`;
const CDN_PIPLITE_INDEX = `https://unpkg.com/@jupyterlite/pyodide-kernel@${PIPLITE_INDEX_VERSION}/pypi/all.json`;
const CDN_PIPLITE_WHEEL = `https://unpkg.com/@jupyterlite/pyodide-kernel@${PIPLITE_INDEX_VERSION}/pypi/piplite-${PIPLITE_INDEX_VERSION}-py3-none-any.whl`;

/** 本地资源清单：由 build:runtime:assets 生成。 */
const LOCAL_MANIFEST_PATH = "/pyodide/manifest.json";

export const PYODIDE_KERNEL_PLUGIN_ID = "@jupyterlite/pyodide-kernel-extension:kernel";

let resolvedPromise = null;

async function probeLocalAssets() {
  if (typeof window === "undefined" || typeof fetch !== "function") return null;
  try {
    const response = await fetch(LOCAL_MANIFEST_PATH, { cache: "force-cache" });
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
 * 命中本地资源时返回本地 URL；否则返回 `{}`（thebe-lite 会继续用它的 CDN 默认值）。
 * 永远不抛错——资源缺失只是"没变快"，不应该让 notebook 打不开。
 */
export function resolveLitePluginSettings() {
  if (!resolvedPromise) {
    resolvedPromise = probeLocalAssets()
      .then((manifest) => {
        if (!manifest) {
          return { source: "cdn", settings: {} };
        }
        const settings = {
          [PYODIDE_KERNEL_PLUGIN_ID]: {
            pyodideUrl: manifest.pyodideUrl,
            ...(manifest.pipliteIndexUrl ? { pipliteUrls: [manifest.pipliteIndexUrl] } : {}),
            ...(manifest.pipliteWheelUrl ? { pipliteWheelUrl: manifest.pipliteWheelUrl } : {}),
            ...(manifest.disablePyPIFallback === false ? {} : { disablePyPIFallback: true }),
          },
        };
        return { source: "local", settings };
      })
      .catch(() => ({ source: "cdn", settings: {} }));
  }
  return resolvedPromise;
}

/** 供诊断页展示：当前使用的是本地资源还是 CDN。 */
export async function getRuntimeAssetSource() {
  const { source } = await resolveLitePluginSettings();
  return source;
}

export const runtimeAssetDefaults = {
  pyodideUrl: CDN_PYODIDE,
  pipliteIndexUrl: CDN_PIPLITE_INDEX,
  pipliteWheelUrl: CDN_PIPLITE_WHEEL,
};
