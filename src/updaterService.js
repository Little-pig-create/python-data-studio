import { APP_VERSION } from "./appVersion";

export const UPDATE_KIND = Object.freeze({
  NONE: "none",
  TAURI: "tauri",
  MANUAL: "manual",
});

export const GITHUB_RELEASE_URL = "https://github.com/Little-pig-create/python-data-studio/releases/latest";
const GITHUB_RELEASE_API = "https://api.github.com/repos/Little-pig-create/python-data-studio/releases/latest";
const RELEASE_INFO_URL = "https://github.com/Little-pig-create/python-data-studio/releases/latest/download/release-info.json";
const IS_TAURI = typeof window !== "undefined" && Boolean(window.__TAURI_INTERNALS__);
const UPDATER_ENABLED = import.meta.env.VITE_TAURI_UPDATER_ENABLED === "true";
const SIGNED_UPDATER_ENABLED = import.meta.env.VITE_TAURI_SIGNED_UPDATER_ENABLED === "true";

export async function openExternalUrl(url) {
  const value = String(url || "").trim();
  if (!/^https?:\/\//i.test(value)) throw new Error("仅支持打开 HTTP/HTTPS 链接");

  if (IS_TAURI) {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("open_external_url", { url: value });
    return;
  }

  window.open(value, "_blank", "noopener,noreferrer");
}

function versionParts(value) {
  const match = String(value || "").trim().match(/^v?(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/i);
  return match ? match.slice(1).map(Number) : null;
}

export function compareVersions(left, right) {
  const leftParts = versionParts(left);
  const rightParts = versionParts(right);
  if (!leftParts || !rightParts) return String(left || "").localeCompare(String(right || ""), undefined, { numeric: true });
  for (let index = 0; index < 3; index += 1) {
    if (leftParts[index] !== rightParts[index]) return leftParts[index] - rightParts[index];
  }
  return 0;
}

function selectWindowsInstaller(assets = []) {
  const candidates = assets.filter((asset) => /\.exe$/i.test(asset?.name || ""));
  return candidates.find((asset) => /x64.*setup|setup.*x64/i.test(asset.name))
    || candidates.find((asset) => /setup/i.test(asset.name))
    || candidates[0]
    || null;
}

function normalizeReleaseInfo(payload) {
  const platform = payload?.platforms?.["windows-x86_64"] || payload?.platforms?.windows || null;
  if (payload?.version && (platform || payload?.download_url || payload?.release_url)) {
    return {
      version: String(payload.version).replace(/^v/i, ""),
      name: payload.name || `Python Data Studio v${payload.version}`,
      body: payload.notes || payload.body || "",
      date: payload.pub_date || payload.published_at || "",
      releaseUrl: payload.release_url || GITHUB_RELEASE_URL,
      downloadUrl: platform?.url || payload.download_url || payload.release_url || GITHUB_RELEASE_URL,
      downloadName: platform?.name || payload.download_name || "",
      downloadSize: Number(platform?.size || payload.download_size || 0),
    };
  }

  const installer = selectWindowsInstaller(payload?.assets);
  return {
    version: String(payload?.tag_name || payload?.name || "").replace(/^v/i, ""),
    name: payload?.name || payload?.tag_name || "最新版本",
    body: payload?.body || "",
    date: payload?.published_at || payload?.created_at || "",
    releaseUrl: payload?.html_url || GITHUB_RELEASE_URL,
    downloadUrl: installer?.browser_download_url || payload?.html_url || GITHUB_RELEASE_URL,
    downloadName: installer?.name || "",
    downloadSize: Number(installer?.size || 0),
  };
}

function friendlyError(error) {
  const message = error?.message || String(error || "未知错误");
  if (/404|not found/i.test(message)) return "在线版本信息尚未发布";
  if (/signature|public key|key/i.test(message)) return "更新包签名或公钥校验失败";
  if (/timed? out|timeout/i.test(message)) return "连接更新服务器超时";
  if (/network|fetch|connect|dns|http/i.test(message)) return "无法连接更新服务器";
  return message;
}

async function fetchJson(url) {
  const response = await fetch(url, { cache: "no-store", headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`版本信息请求失败（${response.status}）`);
  return response.json();
}

export async function fetchLatestReleaseInfo() {
  if (IS_TAURI) {
    const { invoke } = await import("@tauri-apps/api/core");
    return normalizeReleaseInfo(await invoke("fetch_release_info"));
  }

  try {
    return normalizeReleaseInfo(await fetchJson(RELEASE_INFO_URL));
  } catch {
    return normalizeReleaseInfo(await fetchJson(GITHUB_RELEASE_API));
  }
}

export async function checkForAppUpdate() {
  if (!IS_TAURI) throw new Error("浏览器版不支持桌面端自动更新");
  if (!UPDATER_ENABLED) throw new Error("当前桌面构建未启用在线更新");

  let updaterError = null;
  if (SIGNED_UPDATER_ENABLED) {
    try {
      const { check } = await import("@tauri-apps/plugin-updater");
      const update = await check({ timeout: 20_000 });
      if (update) {
        return {
          kind: UPDATE_KIND.TAURI,
          version: update.version,
          currentVersion: update.currentVersion || APP_VERSION,
          body: update.body || "",
          date: update.date || "",
          update,
        };
      }
    } catch (error) {
      updaterError = error;
    }
  }

  try {
    const release = await fetchLatestReleaseInfo();
    const version = release.version;
    if (!version || compareVersions(version, APP_VERSION) <= 0) {
      return {
        kind: UPDATE_KIND.NONE,
        currentVersion: APP_VERSION,
        degraded: false,
        notice: "",
      };
    }
    return {
      kind: UPDATE_KIND.MANUAL,
      version,
      currentVersion: APP_VERSION,
      body: release.body,
      date: release.date,
      releaseUrl: release.releaseUrl,
      downloadUrl: release.downloadUrl,
      downloadName: release.downloadName,
      downloadSize: release.downloadSize,
      notice: "检测到新版本，可下载安装包完成更新。",
    };
  } catch (fallbackError) {
    const details = updaterError
      ? `${friendlyError(updaterError)}；${friendlyError(fallbackError)}`
      : friendlyError(fallbackError);
    throw new Error(details);
  }
}

export async function installAppUpdate(updateInfo, onEvent) {
  if (updateInfo?.kind !== UPDATE_KIND.TAURI || !updateInfo.update) {
    throw new Error("当前版本需要通过下载安装包进行更新");
  }
  await updateInfo.update.downloadAndInstall(onEvent);
}

export function openManualUpdate(updateInfo) {
  const url = updateInfo?.downloadUrl || updateInfo?.releaseUrl || GITHUB_RELEASE_URL;
  return openExternalUrl(url);
}

export async function relaunchApp() {
  const { relaunch } = await import("@tauri-apps/plugin-process");
  await relaunch();
}
