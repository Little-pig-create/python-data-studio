import { APP_VERSION } from "./appVersion";

export const UPDATE_KIND = Object.freeze({
  NONE: "none",
  TAURI: "tauri",
  MANUAL: "manual",
});

export const GITHUB_RELEASE_URL = "https://github.com/Little-pig-create/python-data-studio/releases/latest";
const GITHUB_RELEASE_API = "https://api.github.com/repos/Little-pig-create/python-data-studio/releases/latest";
const IS_TAURI = typeof window !== "undefined" && Boolean(window.__TAURI_INTERNALS__);
const UPDATER_ENABLED = import.meta.env.VITE_TAURI_UPDATER_ENABLED === "true";

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

function friendlyError(error) {
  const message = error?.message || String(error || "未知错误");
  if (/404|not found/i.test(message)) return "在线更新清单 latest.json 尚未发布";
  if (/signature|public key|key/i.test(message)) return "更新包签名或公钥校验失败";
  if (/timed? out|timeout/i.test(message)) return "连接更新服务器超时";
  if (/network|fetch|connect|dns|http/i.test(message)) return "无法连接更新服务器";
  return message;
}

async function fetchLatestGithubRelease() {
  const response = await fetch(GITHUB_RELEASE_API, {
    cache: "no-store",
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!response.ok) throw new Error(`GitHub Release 请求失败（${response.status}）`);
  return response.json();
}

export async function checkForAppUpdate() {
  if (!IS_TAURI) throw new Error("浏览器版不支持桌面端自动更新");
  if (!UPDATER_ENABLED) throw new Error("当前桌面构建未启用在线更新");

  let updaterError = null;
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
    return { kind: UPDATE_KIND.NONE, currentVersion: APP_VERSION, degraded: false };
  } catch (error) {
    updaterError = error;
  }

  // GitHub Release API 是容错通道：即使 latest.json 尚未上传，也能识别
  // 新版本并给出下载安装按钮；签名清单恢复后会自动切回应用内更新。
  try {
    const release = await fetchLatestGithubRelease();
    const version = String(release.tag_name || release.name || "").replace(/^v/i, "");
    if (!version || compareVersions(version, APP_VERSION) <= 0) {
      return {
        kind: UPDATE_KIND.NONE,
        currentVersion: APP_VERSION,
        degraded: true,
        notice: "",
      };
    }
    const installer = selectWindowsInstaller(release.assets);
    return {
      kind: UPDATE_KIND.MANUAL,
      version,
      currentVersion: APP_VERSION,
      body: release.body || "",
      date: release.published_at || release.created_at || "",
      releaseUrl: release.html_url || GITHUB_RELEASE_URL,
      downloadUrl: installer?.browser_download_url || release.html_url || GITHUB_RELEASE_URL,
      downloadName: installer?.name || "",
      downloadSize: Number(installer?.size || 0),
      notice: "检测到新版本；应用内更新暂不可用，将使用 GitHub 安装包更新。",
    };
  } catch (fallbackError) {
    throw new Error(`${friendlyError(updaterError)}；${friendlyError(fallbackError)}`);
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
