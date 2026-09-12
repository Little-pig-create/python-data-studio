#!/usr/bin/env node
/**
 * 纯 Git 发版脚本
 * 用法: node scripts/release.mjs <新版本号>
 * 例如: node scripts/release.mjs 0.1.3
 *
 * 自动完成:
 *   1. 校验工作区、远程仓库和版本号
 *   2. 更新应用版本号
 *   3. 本地构建桌面安装包（release 产物）
 *   4. 归档产物到 release/vX.Y.Z/，生成发布说明和校验清单
 *   5. 创建版本提交和 v<version> Tag
 *   6. 使用 git push 推送 main 和 Tag
 *
 * 本脚本不调用 GitHub Release、GitHub Actions 或任何 GitHub API。
 * 构建产物位于 release/vX.Y.Z/，可手动上传到任意 Git 托管平台的 Release 页面。
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const remote = process.env.RELEASE_REMOTE || "origin";
const preflightOnly = process.argv.includes("--preflight");

function git(args, options = {}) {
  return execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    stdio: options.stdio || ["ignore", "pipe", "pipe"],
  }).trim();
}

function runGit(args) {
  console.log(`  $ git ${args.join(" ")}`);
  execFileSync("git", args, { cwd: root, stdio: "inherit" });
}

function runLocal(args, options = {}) {
  const label = options.label || args.join(" ");
  let executable = args[0];
  let commandArgs = args.slice(1);
  if (process.platform === "win32" && executable === "npm") {
    // npm_execpath 在本项目里指向 pnpm（用户用 pnpm 管理依赖）。
    // pnpm 对 `run <script> -- <args>` 的解析与 npm 不同：会把 `--` 原样传给
    // 子进程，导致 `tauri -- build` 报 "unexpected argument 'build'"。
    // 因此这里显式定位真正的 npm-cli.js，而不是复用 npm_execpath。
    const candidates = [
      path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js"),
      path.join(root, "node_modules", "npm", "bin", "npm-cli.js"),
    ];
    const npmCli = candidates.find((candidate) => fs.existsSync(candidate));
    if (!npmCli) {
      throw new Error(
        "找不到 npm CLI（npm_execpath 指向 pnpm）。请安装 npm 或改用 `npx tauri build`。",
      );
    }
    executable = process.execPath;
    commandArgs = [npmCli, ...commandArgs];
  }
  console.log(`  $ ${label}`);
  const result = spawnSync(executable, commandArgs, {
    cwd: root,
    stdio: "inherit",
    shell: options.shell || false,
    env: process.env,
  });
  if (result.error) {
    console.error(`命令无法启动：${result.error.message}`);
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`命令失败（exit ${result.status}）：${label}`);
  }
}

function fail(message) {
  console.error(`❌ ${message}`);
  process.exit(1);
}

function parseVersion(version) {
  const match = String(version).match(/^(\d+)\.(\d+)\.(\d+)$/);
  return match ? match.slice(1).map(Number) : null;
}

function isGreaterVersion(next, current) {
  for (let index = 0; index < next.length; index += 1) {
    if (next[index] > current[index]) return true;
    if (next[index] < current[index]) return false;
  }
  return false;
}

function copyDirectory(source, target) {
  fs.mkdirSync(target, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const from = path.join(source, entry.name);
    const to = path.join(target, entry.name);
    if (entry.isDirectory()) copyDirectory(from, to);
    else fs.copyFileSync(from, to);
  }
}

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function assertWindowsGuiExecutable(filePath) {
  if (process.platform !== "win32") return;
  const handle = fs.openSync(filePath, "r");
  try {
    const offsetBuffer = Buffer.alloc(4);
    fs.readSync(handle, offsetBuffer, 0, 4, 0x3c);
    const peOffset = offsetBuffer.readUInt32LE(0);
    const subsystemBuffer = Buffer.alloc(2);
    fs.readSync(handle, subsystemBuffer, 0, 2, peOffset + 4 + 20 + 68);
    const subsystem = subsystemBuffer.readUInt16LE(0);
    if (subsystem !== 2) throw new Error(`正式 EXE 不是 Windows GUI 子系统（Subsystem=${subsystem}），可能弹出 CMD 窗口。`);
  } finally {
    fs.closeSync(handle);
  }
}

function githubWebUrl(remoteUrl) {
  const match = String(remoteUrl).trim().match(/github\.com(?::|\/)([^/]+)\/([^/]+?)(?:\.git)?$/i);
  return match ? `https://github.com/${match[1]}/${match[2].replace(/\.git$/i, "")}` : null;
}

function collectFiles(directory, base = directory, result = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) collectFiles(target, base, result);
    else result.push(target);
  }
  return result;
}

const newVersion = process.argv[2];
if (!newVersion || !/^\d+\.\d+\.\d+$/.test(newVersion)) {
  fail("用法: node scripts/release.mjs <版本号>，版本号必须是 x.y.z，例如 0.1.6");
}

const pkgPath = path.join(root, "package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
const oldVersion = pkg.version;
const oldParts = parseVersion(oldVersion);
const newParts = parseVersion(newVersion);
if (!oldParts || !isGreaterVersion(newParts, oldParts)) {
  fail(`新版本 ${newVersion} 必须严格高于当前版本 ${oldVersion}`);
}

const status = git(["status", "--porcelain"]);
if (status) {
  fail("工作区不是干净状态，请先提交或暂存现有修改后再发版。\n" + status);
}

let remoteUrl;
try {
  remoteUrl = git(["remote", "get-url", remote]);
} catch {
  fail(`找不到远程仓库 ${remote}。可通过 RELEASE_REMOTE 环境变量指定远程名称。`);
}

const branch = git(["branch", "--show-current"]);
if (branch !== "main") fail(`正式发布必须在 main 分支执行，当前分支为 ${branch || "未知"}。`);

try {
  runGit(["fetch", remote, "main", "--tags"]);
} catch {
  fail(`无法同步 ${remote}/main，请先检查网络和 Git 凭据。`);
}
const headCommit = git(["rev-parse", "HEAD"]);
const remoteMainCommit = git(["rev-parse", `${remote}/main`]);
if (headCommit !== remoteMainCommit) {
  fail(`本地 main 与 ${remote}/main 不一致，请先完成同步后再发布。`);
}

const tag = `v${newVersion}`;
if (git(["tag", "--list", tag])) {
  fail(`Tag ${tag} 已存在，请使用新的版本号。`);
}
if (git(["ls-remote", "--tags", remote, `refs/tags/${tag}`])) {
  fail(`远程 Tag ${tag} 已存在，请使用新的版本号。`);
}

if (preflightOnly) {
  console.log(`\n✅ Git 发版预检通过：${oldVersion} → ${newVersion}`);
  console.log(`   分支：main（已与 ${remote}/main 同步）`);
  console.log(`   Tag：${tag} 可用`);
  process.exit(0);
}

console.log(`\n🚀 发版: ${oldVersion} → ${newVersion}`);

function updateFile(filePath, transformer) {
  const content = fs.readFileSync(filePath, "utf8");
  const updated = transformer(content, oldVersion, newVersion);
  if (content === updated) {
    fail(`未找到需要更新的版本号: ${path.relative(root, filePath)}`);
  }
  fs.writeFileSync(filePath, updated, "utf8");
  console.log(`  ✅ ${path.relative(root, filePath)}`);
}

const versionFilePaths = [
  pkgPath,
  path.join(root, "src-tauri", "tauri.conf.json"),
  path.join(root, "src-tauri", "Cargo.toml"),
  path.join(root, "src-tauri", "Cargo.lock"),
];
const originalVersionFiles = new Map(versionFilePaths.map((filePath) => [filePath, fs.readFileSync(filePath, "utf8")]));

function restoreVersionFiles() {
  for (const [filePath, content] of originalVersionFiles) fs.writeFileSync(filePath, content, "utf8");
  restoreVersionFilesOnFailure = false;
}

let restoreVersionFilesOnFailure = true;
process.on("exit", (code) => {
  if (code !== 0 && restoreVersionFilesOnFailure) restoreVersionFiles();
});

updateFile(pkgPath, (src, _old, next) => {
  const data = JSON.parse(src);
  data.version = next;
  return JSON.stringify(data, null, 2) + "\n";
});
updateFile(path.join(root, "src-tauri", "tauri.conf.json"), (src, _old, next) => {
  const data = JSON.parse(src);
  data.version = next;
  return JSON.stringify(data, null, 2) + "\n";
});
updateFile(path.join(root, "src-tauri", "Cargo.toml"), (src, _old, next) =>
  src.replace(/^(version\s*=\s*)"[\d.]+"(\s*#.*)?$/m, `$1"${next}"$2`)
);

// ── Release 产物：本地构建 + 归档 ─────────────────────────────────────────────
const releaseDir = path.join(root, "release", tag);
const bundleSource = path.join(root, "src-tauri", "target", "release", "bundle");
let builtBundles = [];
console.log("\n🔨 本地构建桌面安装包...");
// 正式发布默认使用签名 + updater 配置（tauri.release.conf.json），使生成的
// 安装包带 .sig 签名与 latest.json 更新清单，客户端在线更新才能工作。
//
// 注意执行顺序：tauri.release.conf.json 由 prepare-tauri-release.mjs **从
// tauri.conf.json 复制生成**，因此必须在版本号写入之后重新生成，
// 否则配置里仍是上一版版本号，导致产物体名（…_0.1.6_…）与本版 tag 不一致，
// 进而 latest.json 因匹配不到对应版本而无法生成。
const releaseTauriConfig = process.env.RELEASE_TAURI_CONFIG || "src-tauri/tauri.release.conf.json";
const releaseConfigPath = path.join(root, releaseTauriConfig);
const isGeneratedReleaseConfig = releaseTauriConfig === "src-tauri/tauri.release.conf.json";
if (isGeneratedReleaseConfig) {
  const missingEnv = ["TAURI_SIGNING_PRIVATE_KEY", "TAURI_UPDATER_PUBKEY"]
    .filter((key) => !process.env[key]?.trim());
  if (missingEnv.length) {
    fail(
      `缺少签名环境变量：${missingEnv.join(", ")}。\n` +
      "  在线更新包必须签名。请先设置：\n" +
      "    TAURI_SIGNING_PRIVATE_KEY     私钥内容（或 TAURI_SIGNING_PRIVATE_KEY_PATH 指向文件）\n" +
      "    TAURI_UPDATER_PUBKEY          对应公钥内容\n" +
      "  生成密钥对：npx tauri signer generate -w <路径>\n" +
      "  如不需在线更新，可设 RELEASE_TAURI_CONFIG=src-tauri/tauri.student.conf.json 跳过。",
    );
  }
  // 用 bump 后的 tauri.conf.json 重新生成发布配置（含新版本号与公钥）。
  runLocal(["node", "scripts/prepare-tauri-release.mjs"], {
    label: "prepare-tauri-release（生成含新版本号的发布配置）",
  });
  // 打包前清理原生运行时里的字节码缓存等冗余文件。
  // 这些文件会在本地跑过一次打包后的 Python 后重新生成（实测可达 35 MB），
  // 而 Tauri 打包要把整个运行时压缩进安装包，属于纯粹的时间浪费。
  // 脚本自身是幂等的，且带"只在 runtime 目录内删除"的保护。
  runLocal([
    "pwsh", "-NoProfile", "-ExecutionPolicy", "Bypass",
    "-File", path.join("scripts", "trim-native-runtime.ps1"),
  ], { label: "trim-native-runtime（清理 __pycache__ 等冗余，减小压缩量）" });
}
if (!fs.existsSync(releaseConfigPath)) {
  fail(`Tauri 发布配置不存在：${releaseTauriConfig}。请先运行 prepare-tauri-release.mjs 并配置签名密钥。`);
}
const releaseConfigVersion = JSON.parse(fs.readFileSync(releaseConfigPath, "utf8")).version;
if (releaseConfigVersion !== newVersion) {
  fail(
    `发布配置版本号不一致：${releaseTauriConfig} 为 ${releaseConfigVersion}，期望 ${newVersion}。`,
  );
}
// Tauri 不会自动删除旧版本 bundle；先清空固定的 bundle 目录，避免
// 新 Release 的校验清单和下载元数据误收录上一个版本的安装包。
fs.rmSync(bundleSource, { recursive: true, force: true });

// 必须重建 dist，而且要**先于** tauri build 完成。
//
// 前端版本号（APP_VERSION）是在 vite build 时由 package.json 注入并打包进
// dist/assets/appVersion-*.js 的。而 tauri build 只在 dist 发生变化时才重新
// 嵌入前端资源 —— 若 dist 是上一次构建留下的、且 cargo 认为 Rust 侧无改动，
// 就会直接复用旧二进制，导致安装包里仍是旧版本号
// （实际发生过：v0.1.9 的安装包内显示 0.1.8）。
//
// 顺序很重要：tauri 在运行 beforeBuildCommand **之前**就会校验 frontendDist
// 是否存在，所以不能先把 dist 删掉再交给 tauri（会报
// "Unable to find your web assets"）。这里主动先跑一次前端构建。
console.log("\n🧱 重建前端资源（确保版本号写入 dist）...");
runLocal(
  ["node", "scripts/build-desktop-web.mjs", "--mode", "desktop-online"],
  { label: "build-desktop-web（重建 dist）" },
);

try {
  // 通过 npm run tauri 间接调用，复用 win32 下 npm CLI 的解析逻辑。
  runLocal(
    ["npm", "run", "tauri", "--", "build", "--config", releaseTauriConfig],
    { label: `tauri build --config ${releaseTauriConfig}` }
  );
} catch (error) {
  restoreVersionFiles();
  console.error("\n❌ 桌面构建失败，版本号文件已自动恢复，未创建提交或 Tag。\n");
  process.exit(error.status || 1);
}

// 门禁：确认 dist 里的前端版本号与本次发布一致，防止把旧前端打进安装包。
const appVersionChunk = (() => {
  const assets = path.join(root, "dist", "assets");
  if (!fs.existsSync(assets)) return null;
  const file = fs.readdirSync(assets).find((name) => name.startsWith("appVersion"));
  return file ? path.join(assets, file) : null;
})();
if (!appVersionChunk) {
  restoreVersionFiles();
  fail("dist 中缺少 appVersion 资源，无法确认前端版本号。");
}
const appVersionContent = fs.readFileSync(appVersionChunk, "utf8");
if (!appVersionContent.includes(`\`${newVersion}\``)) {
  restoreVersionFiles();
  fail(
    `前端版本号未更新：dist 中的 appVersion 不含 ${newVersion}。`
      + `实际内容：${appVersionContent.trim().slice(0, 120)}`,
  );
}
console.log(`  ✅ 前端版本号已确认：${newVersion}`);

if (!fs.existsSync(bundleSource)) {
  restoreVersionFiles();
  fail("Tauri 构建已结束，但没有生成 bundle 目录；版本号文件已自动恢复。");
}
fs.rmSync(releaseDir, { recursive: true, force: true });
fs.mkdirSync(releaseDir, { recursive: true });
copyDirectory(bundleSource, releaseDir);
builtBundles = collectFiles(releaseDir).filter((file) => fs.statSync(file).isFile());
console.log(`\n📁 安装包已归档到 release/${tag}/`);

// 签名构建（默认 release 配置）必须带 .sig 签名与 latest.json 更新清单，
// 否则在线更新不可用。非签名配置（RELEASE_TAURI_CONFIG 覆盖为 student）跳过。
if (releaseTauriConfig === "src-tauri/tauri.release.conf.json") {
  // Tauri 只产出安装包与 .sig；latest.json 需要由 generate-updater-manifest.mjs
  // 依据已归档的产物生成（含下载地址与签名内容）。
  const generatedManifest = path.join(bundleSource, "latest.json");
  if (!fs.existsSync(path.join(releaseDir, "latest.json"))) {
    runLocal(["node", "scripts/generate-updater-manifest.mjs"], {
      label: "generate-updater-manifest（生成 latest.json 更新清单）",
    });
  }
  if (fs.existsSync(generatedManifest)) {
    copyDirectory(bundleSource, releaseDir);
    builtBundles = collectFiles(releaseDir).filter((file) => fs.statSync(file).isFile());
  }
  const updaterManifest = path.join(releaseDir, "latest.json");
  if (!fs.existsSync(updaterManifest)) {
    restoreVersionFiles();
    fail("签名构建未生成 latest.json。请确认 TAURI_SIGNING_PRIVATE_KEY / TAURI_UPDATER_PUBKEY 已配置，并先运行 prepare-tauri-release.mjs。");
  }
  const signatureFiles = builtBundles.filter((file) => /\.sig$/i.test(path.basename(file)));
  if (!signatureFiles.length) {
    restoreVersionFiles();
    fail("签名构建未生成 .sig 签名文件，在线更新不可用。");
  }
  console.log(`  ✅ 已生成更新清单 latest.json 与 ${signatureFiles.length} 个签名文件`);
}

const installerPattern = new RegExp(`_${newVersion.replace(/\./g, "\\.")}_.*setup\\.exe$`, "i");
const windowsInstallers = builtBundles.filter((file) => installerPattern.test(path.basename(file)));
if (windowsInstallers.length !== 1) {
  restoreVersionFiles();
  fail(`预期恰好生成 1 个 ${newVersion} Windows 安装包，实际为 ${windowsInstallers.length} 个。`);
}
const windowsInstaller = windowsInstallers[0];
const minimumInstallerBytes = Number(process.env.RELEASE_MIN_INSTALLER_MB || 100) * 1024 * 1024;
if (fs.statSync(windowsInstaller).size < minimumInstallerBytes) {
  restoreVersionFiles();
  fail(`安装包小于 ${process.env.RELEASE_MIN_INSTALLER_MB || 100} MB，可能缺少 Python 运行时或数据集。`);
}
try {
  assertWindowsGuiExecutable(path.join(root, "src-tauri", "target", "release", "python-data-studio.exe"));
} catch (error) {
  restoreVersionFiles();
  fail(error.message);
}

const platformLabel = process.platform === "win32" ? "Windows" : process.platform === "darwin" ? "macOS" : "Linux";
const releaseDate = new Date().toISOString().slice(0, 10);
const checksumLines = builtBundles
  .map((file) => `${sha256(file)}  ${path.relative(releaseDir, file).replace(/\\/g, "/")}`)
  .sort();
const notesLines = [
  `# Release ${tag}`,
  "",
  `- 版本：${newVersion}`,
  `- 日期：${releaseDate}`,
  `- 构建平台：${platformLabel}`,
  `- 发布方式：Git push + GitHub Release`,
  "",
  "## 产物",
  "",
];
if (builtBundles.length) {
  notesLines.push(...builtBundles.map((file) => `- ${path.relative(releaseDir, file).replace(/\\/g, "/")}`));
} else {
  notesLines.push("（未构建安装包，或构建产物目录不存在）");
}
notesLines.push("", "## SHA256 校验", "");
if (checksumLines.length) {
  notesLines.push("```text", ...checksumLines, "```");
} else {
  notesLines.push("（无产物）");
}
notesLines.push("", "## 说明", "", "将 release 目录内容上传到 Git 托管平台的 Release 页面即可分发。");
fs.writeFileSync(path.join(releaseDir, "RELEASE_NOTES.md"), notesLines.join("\n") + "\n", "utf8");
if (checksumLines.length) {
  fs.writeFileSync(path.join(releaseDir, "SHA256SUMS.txt"), checksumLines.join("\n") + "\n", "utf8");
}
console.log(`📝 已生成 release/${tag}/RELEASE_NOTES.md`);

const githubAssetName = windowsInstaller ? path.basename(windowsInstaller).replace(/\s+/g, ".") : "";
const repositoryUrl = githubWebUrl(remoteUrl) || "https://github.com/Little-pig-create/python-data-studio";
const releaseInfo = {
  version: newVersion,
  name: `Python Data Studio ${tag}`,
  notes: notesLines.join("\n"),
  pub_date: new Date().toISOString(),
  release_url: `${repositoryUrl}/releases/tag/${tag}`,
  platforms: windowsInstaller ? {
    "windows-x86_64": {
      url: `${repositoryUrl}/releases/download/${tag}/${encodeURIComponent(githubAssetName)}`,
      name: path.basename(windowsInstaller),
      size: fs.statSync(windowsInstaller).size,
    },
  } : {},
};
fs.writeFileSync(path.join(releaseDir, "release-info.json"), JSON.stringify(releaseInfo, null, 2) + "\n", "utf8");
console.log(`🧭 已生成 release/${tag}/release-info.json`);

// ── 发布前资产自检（push 前门禁）────────────────────────────────────────────
// 调用独立脚本 scripts/verify-release-assets.mjs（CI 中也可单独运行）：
// 核对安装包唯一性、SHA256 一致性、release-info.json / latest.json 与安装包对应。
// 签名构建必须通过完整校验；非签名快速构建（RELEASE_TAURI_CONFIG 覆盖）跳过在线更新资产。
const verifyArgs = [path.join(root, "scripts", "verify-release-assets.mjs"), newVersion];
if (releaseTauriConfig !== "src-tauri/tauri.release.conf.json") verifyArgs.push("--no-updater");
const verifyResult = spawnSync(process.execPath, verifyArgs, { cwd: root, stdio: "inherit" });
if (verifyResult.error || verifyResult.status !== 0) {
  restoreVersionFiles();
  fail("发布前资产自检未通过，已中止发版（版本号文件已自动恢复）。");
}

// ── Git 提交、Tag、推送 ───────────────────────────────────────────────────────
try {
  runGit(["add", "package.json", "src-tauri/tauri.conf.json", "src-tauri/Cargo.toml", "src-tauri/Cargo.lock"]);
  runGit(["commit", "-m", `chore: bump version to ${newVersion}`]);
  restoreVersionFilesOnFailure = false;
  runGit(["tag", tag]);
  runGit(["push", remote, "HEAD:main"]);
  runGit(["push", remote, tag]);
} catch (error) {
  console.error("\n❌ 发版过程中断。请检查 Git 状态；如果提交已完成，可从 Tag 推送步骤继续。\n");
  process.exit(error.status || 1);
}

console.log(`\n✨ Git 发版完成：${tag}`);
console.log(`   已推送分支：${remote}/main`);
console.log(`   已推送 Tag：${remote}/${tag}`);
console.log(`   Release 产物：${path.relative(root, releaseDir)}（可上传到 Release 页面分发）`);
