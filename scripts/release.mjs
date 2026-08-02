#!/usr/bin/env node
/**
 * 纯 Git 发版脚本
 * 用法: node scripts/release.mjs <新版本号>
 * 例如: node scripts/release.mjs 0.1.2
 *
 * 自动完成:
 *   1. 更新应用版本号
 *   2. 创建版本提交和 v<version> Tag
 *   3. 使用 git push 推送 main 和 Tag
 *
 * 本脚本不调用 GitHub Release、GitHub Actions 或任何 GitHub API。
 */

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const remote = process.env.RELEASE_REMOTE || "origin";

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

const newVersion = process.argv[2];
if (!newVersion || !/^\d+\.\d+\.\d+$/.test(newVersion)) {
  fail("用法: node scripts/release.mjs <版本号>，版本号必须是 x.y.z，例如 0.1.2");
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
