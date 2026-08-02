#!/usr/bin/env node
/**
 * 一键发版脚本
 * 用法: node scripts/release.mjs <新版本号>
 * 例如: node scripts/release.mjs 0.1.2
 *
 * 自动完成:
 *   1. 更新 package.json / tauri.conf.json / Cargo.toml / AboutPage.jsx 的版本号
 *   2. 校验工作区、远程仓库和 Tag，创建提交与 Tag
 *   3. 推送 main 和 v<version>，触发 GitHub Actions 编译并发布安装包
 */

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const remote = process.env.RELEASE_REMOTE || "origin";

function git(args, options = {}) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: options.stdio || ["ignore", "pipe", "pipe"] }).trim();
}

function runGit(args) {
  console.log(`  $ git ${args.join(" ")}`);
  execFileSync("git", args, { cwd: root, stdio: "inherit" });
}

function fail(message) {
  console.error(`❌ ${message}`);
  process.exit(1);
}

const newVersion = process.argv[2];
if (!newVersion || !/^\d+\.\d+\.\d+$/.test(newVersion)) {
  fail("用法: node scripts/release.mjs <版本号>，版本号必须是 x.y.z，例如 0.1.2");
}

const pkgPath = path.join(root, "package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
const oldVersion = pkg.version;

function parseVersion(version) {
  const match = String(version).match(/^(\d+)\.(\d+)\.(\d+)$/);
  return match ? match.slice(1).map(Number) : null;
}

const oldParts = parseVersion(oldVersion);
const newParts = parseVersion(newVersion);
if (!oldParts || newParts.every((part, index) => part === oldParts[index]) || newParts.some((part, index) => part < oldParts[index] && newParts.slice(0, index).every((value, i) => value === oldParts[i]))) {
  fail(`新版本 ${newVersion} 必须严格高于当前版本 ${oldVersion}`);
}

const status = git(["status", "--porcelain"]);
if (status) {
  fail("工作区不是干净状态，请先提交或暂存现有修改后再发版。\n" + status);
}

try {
  const remoteUrl = git(["remote", "get-url", remote]);
  if (!/^https:\/\/github\.com\/[^/]+\/[^/]+(?:\.git)?$/i.test(remoteUrl) && !/^git@github\.com:[^/]+\/[^/]+(?:\.git)?$/i.test(remoteUrl)) {
    fail(`远程 ${remote} 不是 GitHub 仓库：${remoteUrl}`);
  }
} catch {
  fail(`找不到远程仓库 ${remote}。可通过 RELEASE_REMOTE 环境变量指定远程名称。`);
}

const tag = `v${newVersion}`;
try {
  if (git(["tag", "--list", tag])) fail(`Tag ${tag} 已存在，请使用新的版本号。`);
} catch {
  fail(`无法检查 Tag ${tag}。`);
}

console.log(`\n🚀 发版: ${oldVersion} → ${newVersion}`);

function updateFile(filePath, transformer) {
  const content = fs.readFileSync(filePath, "utf8");
  const updated = transformer(content, oldVersion, newVersion);
  if (content === updated) fail(`未找到需要更新的版本号: ${path.relative(root, filePath)}`);
  fs.writeFileSync(filePath, updated, "utf8");
  console.log(`  ✅ ${path.relative(root, filePath)}`);
}

updateFile(pkgPath, (src, _ov, nv) => {
  const obj = JSON.parse(src);
  obj.version = nv;
  return JSON.stringify(obj, null, 2) + "\n";
});
updateFile(path.join(root, "src-tauri", "tauri.conf.json"), (src, _ov, nv) => {
  const obj = JSON.parse(src);
  obj.version = nv;
  return JSON.stringify(obj, null, 2) + "\n";
});
updateFile(path.join(root, "src-tauri", "Cargo.toml"), (src, _ov, nv) => src.replace(/^(version\s*=\s*)"[\d.]+"(\s*#.*)?$/m, `$1"${nv}"$2`));
updateFile(path.join(root, "src", "AboutPage.jsx"), (src, _ov, nv) => src.replace(/const APP_VERSION\s*=\s*"[\d.]+"/, `const APP_VERSION = "${nv}"`));

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

console.log(`\n✨ 完成！GitHub Actions 正在编译 ${tag}，完成后自动发布安装包。`);
console.log(`   查看进度: https://github.com/Little-pig-create/python-data-studio/actions`);
console.log(`   发布页面: https://github.com/Little-pig-create/python-data-studio/releases`);
