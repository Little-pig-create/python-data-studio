#!/usr/bin/env node
/**
 * 纯 Git 发版脚本
 * 用法: node scripts/release.mjs <新版本号> [--skip-build]
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
const skipBuild = process.argv.includes("--skip-build");

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
  console.log(`  $ ${label}`);
  const result = spawnSync(args[0], args.slice(1), {
    cwd: root,
    stdio: "inherit",
    shell: options.shell || false,
    env: process.env,
  });
  if (result.error) throw result.error;
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
  fail("用法: node scripts/release.mjs <版本号> [--skip-build]，版本号必须是 x.y.z，例如 0.1.3");
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

try {
  git(["remote", "get-url", remote]);
} catch {
  fail(`找不到远程仓库 ${remote}。可通过 RELEASE_REMOTE 环境变量指定远程名称。`);
}

const tag = `v${newVersion}`;
if (git(["tag", "--list", tag])) {
  fail(`Tag ${tag} 已存在，请使用新的版本号。`);
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
updateFile(path.join(root, "src", "AboutPage.jsx"), (src, _old, next) =>
  src.replace(/const APP_VERSION\s*=\s*"[\d.]+"/, `const APP_VERSION = "${next}"`)
);

// ── Release 产物：本地构建 + 归档 ─────────────────────────────────────────────
const releaseDir = path.join(root, "release", tag);
let builtBundles = [];
if (skipBuild) {
  console.log(`\n📦 跳过本地构建（--skip-build），release 产物目录：${path.relative(root, releaseDir)}`);
} else {
  console.log("\n🔨 本地构建桌面安装包...");
  try {
    runLocal(["npm", "run", "desktop:build"], { label: "npm run desktop:build" });
  } catch (error) {
    console.error("\n❌ 桌面构建失败，版本号文件已被修改但未提交。");
    console.error("   可修复后重试；如确认无需构建，请使用 --skip-build 跳过。\n");
    process.exit(error.status || 1);
  }
}

const bundleSource = path.join(root, "src-tauri", "target", "release", "bundle");
if (fs.existsSync(bundleSource)) {
  fs.mkdirSync(releaseDir, { recursive: true });
  copyDirectory(bundleSource, releaseDir);
  builtBundles = collectFiles(releaseDir).filter((file) => fs.statSync(file).isFile());
  console.log(`\n📁 安装包已归档到 release/${tag}/`);
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
  `- 发布方式：纯 Git（commit + tag + push）`,
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

// ── Git 提交、Tag、推送 ───────────────────────────────────────────────────────
try {
  runGit(["add", "package.json", "src-tauri/tauri.conf.json", "src-tauri/Cargo.toml", "src/AboutPage.jsx"]);
  runGit(["commit", "-m", `chore: bump version to ${newVersion}`]);
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
