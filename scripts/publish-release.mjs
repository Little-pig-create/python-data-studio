#!/usr/bin/env node
/**
 * Python Data Studio 一键更新与发布脚本
 *
 * 完整发布：npm run release:publish -- 0.1.6
 * 仅重新上传：npm run release:publish -- 0.1.6 --upload-only
 * 查看说明：npm run release:publish -- --help
 *
 * 完整发布流程：
 *   1. 提前确认 GitHub 凭据可用
 *   2. 调用 release.mjs 更新版本、正式打包、提交、Tag 和 Git 推送
 *   3. 创建或更新 GitHub Release
 *   4. 上传安装包、SHA256SUMS.txt 和 release-info.json
 *   5. 校验 Release、资产大小和静态更新元数据
 *
 * 身份验证优先使用 GITHUB_TOKEN；未设置时读取 git credential 中保存的
 * github.com HTTPS 凭据。脚本不会打印 Token，也不使用 Tauri 签名密钥。
 */

import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const remote = process.env.RELEASE_REMOTE || "origin";
const args = process.argv.slice(2);
const uploadOnly = args.includes("--upload-only");
const verifyOnly = args.includes("--verify-only");
const preflightOnly = args.includes("--preflight");
const showHelp = args.includes("--help") || args.includes("-h");
const version = args.find((value) => /^\d+\.\d+\.\d+$/.test(value));

function fail(message) {
  console.error(`❌ ${message}`);
  process.exit(1);
}

function git(gitArgs, options = {}) {
  return execFileSync("git", gitArgs, {
    cwd: root,
    encoding: "utf8",
    input: options.input,
    stdio: options.input == null ? ["ignore", "pipe", "pipe"] : ["pipe", "pipe", "pipe"],
  }).trim();
}

function runNode(script, scriptArgs) {
  const result = spawnSync(process.execPath, [script, ...scriptArgs], {
    cwd: root,
    env: process.env,
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}

function parseGithubRepository(remoteUrl) {
  const match = String(remoteUrl).trim().match(/github\.com(?::|\/)([^/]+)\/([^/]+?)(?:\.git)?$/i);
  if (!match) fail(`远程仓库不是可识别的 GitHub 地址：${remoteUrl}`);
  return { owner: match[1], repo: match[2].replace(/\.git$/i, "") };
}

function githubToken() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN.trim();

  let output = "";
  try {
    output = git(["credential", "fill"], { input: "protocol=https\nhost=github.com\n\n" });
  } catch {
    fail("无法读取 GitHub 凭据。请先执行 git push 登录，或设置 GITHUB_TOKEN。");
  }

  const values = new Map();
  for (const line of output.split(/\r?\n/)) {
    const separator = line.indexOf("=");
    if (separator > 0) values.set(line.slice(0, separator), line.slice(separator + 1));
  }
  const token = values.get("password")?.trim();
  if (!token) fail("GitHub 凭据中没有可用 Token。请设置 GITHUB_TOKEN 后重试。");
  return token;
}

function collectFiles(directory, result = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) collectFiles(target, result);
    else result.push(target);
  }
  return result;
}

function assetName(filePath) {
  return path.basename(filePath).replace(/\s+/g, ".");
}

function contentType(filePath) {
  if (/\.json$/i.test(filePath)) return "application/json";
  if (/\.txt$/i.test(filePath)) return "text/plain; charset=utf-8";
  return "application/octet-stream";
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function request(url, options = {}, retries = 3) {
  let lastError;
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response;
      const body = await response.text();
      const error = new Error(`GitHub 请求失败（${response.status}）：${body.slice(0, 500)}`);
      error.status = response.status;
      if (response.status !== 429 && response.status < 500) throw error;
      lastError = error;
    } catch (error) {
      lastError = error;
      if (error.status && error.status < 500 && error.status !== 429) throw error;
    }
    if (attempt < retries) await wait(attempt * 1500);
  }
  throw lastError;
}

async function jsonRequest(url, token, options = {}) {
  const response = await request(url, {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "User-Agent": "Python-Data-Studio-Release",
      "X-GitHub-Api-Version": "2022-11-28",
      ...options.headers,
    },
  });
  if (response.status === 204) return null;
  return response.json();
}

async function findRelease(apiBase, tag, token) {
  const response = await request(`${apiBase}/releases/tags/${tag}`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "User-Agent": "Python-Data-Studio-Release",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  }, 1).catch((error) => {
    if (error.status === 404) return null;
    throw error;
  });
  return response ? response.json() : null;
}

async function uploadAsset(apiBase, releaseId, uploadUrl, filePath, name, token) {
  const size = fs.statSync(filePath).size;
  const temporaryName = `${name}.uploading`;
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const currentRelease = await jsonRequest(`${apiBase}/releases/${releaseId}`, token);
      let staged = currentRelease.assets?.find((asset) => asset.name === temporaryName);
      if (staged && staged.size !== size) {
        await jsonRequest(`${apiBase}/releases/assets/${staged.id}`, token, { method: "DELETE" });
        staged = null;
      }
      if (!staged) {
        const stream = Readable.toWeb(fs.createReadStream(filePath));
        const response = await request(`${uploadUrl}?name=${encodeURIComponent(temporaryName)}`, {
          method: "POST",
          duplex: "half",
          headers: {
            Accept: "application/vnd.github+json",
            Authorization: `Bearer ${token}`,
            "Content-Type": contentType(filePath),
            "Content-Length": String(size),
            "User-Agent": "Python-Data-Studio-Release",
            "X-GitHub-Api-Version": "2022-11-28",
          },
          body: stream,
        }, 1);
        staged = await response.json();
      }

      const refreshed = await jsonRequest(`${apiBase}/releases/${releaseId}`, token);
      const existing = refreshed.assets?.find((asset) => asset.name === name);
      if (existing) await jsonRequest(`${apiBase}/releases/assets/${existing.id}`, token, { method: "DELETE" });

      return jsonRequest(`${apiBase}/releases/assets/${staged.id}`, token, {
        method: "PATCH",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({ name }),
      });
    } catch (error) {
      lastError = error;
      if (attempt < 3) await wait(attempt * 2000);
    }
  }
  throw lastError;
}

if (showHelp) {
  console.log(`
Python Data Studio 更新与发布

  npm run release:publish -- <新版本号>
      更新版本、正式打包、提交、推送并创建 GitHub Release。

  npm run release:publish -- <版本号> --upload-only
      使用 release/v<版本号>/ 中的现有产物重新创建或更新 Release，
      不修改版本、不提交、不打包，适合网络上传失败后重试。

  npm run release:publish -- <版本号> --verify-only
      只读校验线上 Release、资产大小和 release-info.json，
      不打包、不上传、不修改 Git。

  npm run release:publish -- <新版本号> --preflight
      检查工作区、main 同步状态、远程 Tag 和 GitHub 发布权限，
      不修改版本、不打包、不提交。

环境变量：
  GITHUB_TOKEN   可选；不设置时读取 git credential
  RELEASE_REMOTE 可选；默认 origin
`);
  process.exit(0);
}

if (!version) fail("请提供 x.y.z 格式的版本号，例如：npm run release:publish -- 0.1.6");
if (typeof fetch !== "function") fail("当前 Node.js 不支持 fetch，请使用 Node.js 20 或更高版本。");
if ([uploadOnly, verifyOnly, preflightOnly].filter(Boolean).length > 1) {
  fail("--upload-only、--verify-only 和 --preflight 不能同时使用。");
}

const tag = `v${version}`;
const remoteUrl = git(["remote", "get-url", remote]);
const { owner, repo } = parseGithubRepository(remoteUrl);
const token = githubToken(); // 在耗时打包前确认发布权限凭据存在。
const apiBase = `https://api.github.com/repos/${owner}/${repo}`;
const repository = await jsonRequest(apiBase, token);
if (repository.permissions && repository.permissions.push === false) {
  fail(`当前 GitHub 凭据没有 ${owner}/${repo} 的发布权限。`);
}

if (preflightOnly) {
  runNode(path.join(root, "scripts", "release.mjs"), [version, "--preflight"]);
  console.log(`   GitHub：${owner}/${repo} 发布权限可用`);
  process.exit(0);
}

if (!uploadOnly && !verifyOnly) {
  const status = git(["status", "--porcelain"]);
  if (status) fail(`工作区不是干净状态，请先提交当前修改：\n${status}`);
  runNode(path.join(root, "scripts", "release.mjs"), [version]);
}

const remoteTag = git(["ls-remote", "--tags", remote, `refs/tags/${tag}`]);
if (!remoteTag) fail(`远程 Tag 不存在：${tag}`);

const releaseDir = path.join(root, "release", tag);
if (!fs.existsSync(releaseDir) || !fs.statSync(releaseDir).isDirectory()) {
  fail(`找不到发布目录：${releaseDir}`);
}

const files = collectFiles(releaseDir);
const installer = files.find((file) => new RegExp(`_${version.replace(/\./g, "\\.")}_.*setup\\.exe$`, "i").test(path.basename(file)));
const checksums = path.join(releaseDir, "SHA256SUMS.txt");
const releaseInfoPath = path.join(releaseDir, "release-info.json");
const notesPath = path.join(releaseDir, "RELEASE_NOTES.md");
for (const [label, filePath] of [["当前版本安装包", installer], ["SHA256SUMS.txt", checksums], ["release-info.json", releaseInfoPath], ["RELEASE_NOTES.md", notesPath]]) {
  if (!filePath || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    fail(`发布产物缺失：${label}`);
  }
}

const releaseInfo = JSON.parse(fs.readFileSync(releaseInfoPath, "utf8"));
if (releaseInfo.version !== version) fail(`release-info.json 版本为 ${releaseInfo.version}，预期为 ${version}`);
const expectedInstallerName = assetName(installer);
const metadataUrl = releaseInfo.platforms?.["windows-x86_64"]?.url || "";
if (!metadataUrl.endsWith(`/${expectedInstallerName}`)) {
  fail(`release-info.json 下载地址与安装包不一致：${metadataUrl}`);
}

const notes = fs.readFileSync(notesPath, "utf8");
const uploads = [installer, checksums, releaseInfoPath];
const expectedAssets = uploads.map((filePath) => ({
  name: assetName(filePath),
  size: fs.statSync(filePath).size,
}));

function verifyAssets(release) {
  for (const expected of expectedAssets) {
    const actual = release.assets?.find((asset) => asset.name === expected.name);
    if (!actual || actual.size !== expected.size) fail(`Release 资产校验失败：${expected.name}`);
  }
  const unexpectedInstallers = release.assets?.filter((asset) => /\.exe$/i.test(asset.name) && asset.name !== expectedInstallerName) || [];
  if (unexpectedInstallers.length) {
    fail(`Release 中存在非当前版本安装包：${unexpectedInstallers.map((asset) => asset.name).join(", ")}`);
  }
}

async function verifyOnlineInfo() {
  let lastVersion = "不可用";
  for (let attempt = 1; attempt <= 12; attempt += 1) {
    try {
      const response = await request(`https://github.com/${owner}/${repo}/releases/latest/download/release-info.json?verify=${Date.now()}`, {
        headers: {
          Accept: "application/json",
          "Cache-Control": "no-cache",
          "User-Agent": "Python-Data-Studio-Release-Verify",
        },
      }, 1);
      const info = await response.json();
      lastVersion = info.version || "缺失";
      if (info.version === version) return info;
    } catch (error) {
      lastVersion = error.message;
    }
    if (attempt < 12) await wait(5000);
  }
  fail(`线上 release-info.json 未切换到 ${version}，最后结果：${lastVersion}`);
}

async function verifyLatestRelease() {
  const latest = await jsonRequest(`${apiBase}/releases/latest`, token);
  if (latest.tag_name !== tag) fail(`GitHub latest 当前为 ${latest.tag_name}，预期为 ${tag}`);
  if (latest.draft || latest.prerelease) fail(`Release ${tag} 不能是草稿或预发布版本。`);
  return latest;
}

if (verifyOnly) {
  const verified = await findRelease(apiBase, tag, token);
  if (!verified) fail(`GitHub Release 不存在：${tag}`);
  verifyAssets(verified);
  await verifyLatestRelease();
  const onlineInfo = await verifyOnlineInfo();
  console.log(`\n✅ 发布校验通过：Python Data Studio ${tag}`);
  console.log(`   Release：${verified.html_url}`);
  console.log(`   资产数量：${expectedAssets.length}`);
  console.log(`   静态更新元数据：release-info.json（v${onlineInfo.version}）`);
  process.exit(0);
}

let release = await findRelease(apiBase, tag, token);
const stagingPayload = {
  tag_name: tag,
  target_commitish: "main",
  name: `Python Data Studio ${tag}`,
  body: notes,
  draft: true,
  prerelease: false,
  make_latest: "false",
};

if (release) {
  release = await jsonRequest(`${apiBase}/releases/${release.id}`, token, {
    method: "PATCH",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(stagingPayload),
  });
  console.log(`\n📝 Release 已转为暂存状态：${tag}`);
} else {
  release = await jsonRequest(`${apiBase}/releases`, token, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(stagingPayload),
  });
  console.log(`\n🆕 已创建草稿 Release：${tag}`);
}

for (const filePath of uploads) {
  const name = assetName(filePath);
  process.stdout.write(`  ⬆️  上传 ${name} ... `);
  const uploaded = await uploadAsset(apiBase, release.id, `https://uploads.github.com/repos/${owner}/${repo}/releases/${release.id}/assets`, filePath, name, token);
  console.log(`${(uploaded.size / 1024 / 1024).toFixed(2)} MB`);
}

let verified = await jsonRequest(`${apiBase}/releases/tags/${tag}`, token);
for (const asset of verified.assets || []) {
  const isStaleInstaller = /\.exe$/i.test(asset.name) && asset.name !== expectedInstallerName;
  const isTemporaryUpload = asset.name.endsWith(".uploading");
  if (isStaleInstaller || isTemporaryUpload) {
    await jsonRequest(`${apiBase}/releases/assets/${asset.id}`, token, { method: "DELETE" });
  }
}
verified = await jsonRequest(`${apiBase}/releases/tags/${tag}`, token);
verifyAssets(verified);
verified = await jsonRequest(`${apiBase}/releases/${release.id}`, token, {
  method: "PATCH",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify({
    name: `Python Data Studio ${tag}`,
    body: notes,
    draft: false,
    prerelease: false,
    make_latest: "true",
  }),
});
await verifyLatestRelease();
const onlineInfo = await verifyOnlineInfo();

console.log(`\n✅ 发布完成：Python Data Studio ${tag}`);
console.log(`   Release：${verified.html_url}`);
console.log(`   安装包：${expectedInstallerName}`);
console.log(`   静态更新元数据：release-info.json（v${onlineInfo.version}）`);
