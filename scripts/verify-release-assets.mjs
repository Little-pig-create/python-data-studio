#!/usr/bin/env node
/**
 * 发布前资产自检（CI 门禁）
 *
 * 用法:
 *   node scripts/verify-release-assets.mjs <版本号>
 *       完整校验（含在线更新资产 latest.json / .sig）
 *   node scripts/verify-release-assets.mjs <版本号> --no-updater
 *       跳过在线更新资产校验（非签名快速构建，如 tauri.student.conf.json）
 *
 * 在 push 之前核对 release/v<版本号>/ 下的发布资产是否完整且互相一致：
 *   1. 恰好 1 个该版本的 Windows 安装包（xxx-setup.exe）
 *   2. SHA256SUMS.txt 存在，且安装包校验行与文件实际哈希一致
 *   3. release-info.json 版本一致，安装包名 / 下载地址 / 大小与本地产物对应
 *   4. latest.json（在线更新清单）版本一致，下载地址指向安装包，签名非空
 *   5. 安装包同名 .sig 签名文件存在
 *
 * 任一项不通过即退出码 1。可作为 GitHub Actions 等 CI 门禁，
 * 也可由 release.mjs 在 push 前自动调用。
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const noUpdater = args.includes("--no-updater");
const versionArg = args.find((arg) => !arg.startsWith("--"));

if (!versionArg || !/^\d+\.\d+\.\d+$/.test(versionArg)) {
  console.error("用法: node scripts/verify-release-assets.mjs <版本号> [--no-updater]");
  process.exit(1);
}
const version = versionArg.replace(/^v/i, "");
const releaseDir = path.join(root, "release", `v${version}`);
const problems = [];

function check(label, ok, detail = "") {
  if (ok) {
    console.log(`  ✅ ${label}${detail ? `（${detail}）` : ""}`);
  } else {
    problems.push(label);
    console.error(`  ❌ ${label}${detail ? `：${detail}` : ""}`);
  }
}

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function collectFiles(directory, result = []) {
  if (!fs.existsSync(directory)) return result;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) collectFiles(target, result);
    else result.push(target);
  }
  return result;
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

// URL 是否指向指定安装包文件名。
// release-info.json 的 url 用「空格替换为点」后的资产名（assetName），
// latest.json 的 url 用原生文件名，二者都经 encodeURIComponent 编码——
// 因此解码 URL 最后一段后，与原生名或点替换名任一匹配即可。
function urlPointsTo(url, name) {
  if (!url || !name) return false;
  const segment = String(url).split("?")[0].split("/").pop() || "";
  let decoded = segment;
  try {
    decoded = decodeURIComponent(segment);
  } catch {
    // 保持原样，交给下方精确比较
  }
  return decoded === name || decoded === name.replace(/\s+/g, ".");
}

function finish() {
  if (problems.length) {
    console.error(`\n❌ 资产自检未通过（${problems.length} 项）：`);
    for (const item of problems) console.error(`   - ${item}`);
    process.exit(1);
  }
  console.log("\n✅ 资产自检通过，可安全发布。");
  process.exit(0);
}

console.log(`\n🛡️  发布前资产自检：${path.relative(root, releaseDir)}`);

if (!fs.existsSync(releaseDir)) {
  check("发布目录存在", false, path.relative(root, releaseDir));
  finish();
}

const files = collectFiles(releaseDir);

// ── 1. 安装包唯一性 ────────────────────────────────────────────────────────
const installerPattern = new RegExp(`_${version.replace(/\./g, "\\.")}_.*setup\\.exe$`, "i");
const installers = files.filter((file) => installerPattern.test(path.basename(file)));
check(
  "Windows 安装包恰好 1 个",
  installers.length === 1,
  installers.length === 1 ? path.basename(installers[0]) : `实际 ${installers.length} 个`,
);
if (installers.length !== 1) finish();
const installer = installers[0];
const installerName = path.basename(installer);

// ── 2. SHA256 校验清单 ─────────────────────────────────────────────────────
const checksumsPath = path.join(releaseDir, "SHA256SUMS.txt");
const checksumExists = fs.existsSync(checksumsPath) && fs.statSync(checksumsPath).isFile();
check("SHA256SUMS.txt 存在", checksumExists);
if (checksumExists) {
  const relativeName = path.relative(releaseDir, installer).replace(/\\/g, "/");
  const lines = fs.readFileSync(checksumsPath, "utf8").split(/\r?\n/).filter(Boolean);
  const line = lines.find((item) => item.endsWith(`  ${relativeName}`));
  check("校验清单包含安装包", Boolean(line), relativeName);
  const actualHash = sha256(installer);
  check("安装包 SHA256 与清单一致", Boolean(line) && line.startsWith(actualHash));
}

// ── 3. release-info.json ───────────────────────────────────────────────────
const releaseInfo = readJson(path.join(releaseDir, "release-info.json"));
check("release-info.json 存在且可解析", Boolean(releaseInfo));
if (releaseInfo) {
  check("release-info.json 版本一致", releaseInfo.version === version, String(releaseInfo.version));
  const platform = releaseInfo.platforms?.["windows-x86_64"];
  check("release-info.json 包含 windows-x86_64", Boolean(platform));
  if (platform) {
    check("release-info.json 安装包名一致", platform.name === installerName, String(platform.name));
    check("release-info.json 下载地址指向安装包", urlPointsTo(platform.url, installerName));
    check(
      "release-info.json 安装包大小一致",
      platform.size === fs.statSync(installer).size,
      `${platform.size} 字节`,
    );
  }
}

// ── 4/5. 在线更新资产（签名构建必需）─────────────────────────────────────
if (noUpdater) {
  console.log("  （--no-updater：跳过 latest.json 与 .sig 校验，适用于非签名快速构建）");
} else {
  const updaterManifest = readJson(path.join(releaseDir, "latest.json"));
  check("latest.json 存在且可解析", Boolean(updaterManifest));
  if (updaterManifest) {
    check("latest.json 版本一致", updaterManifest.version === version, String(updaterManifest.version));
    const platform = updaterManifest.platforms?.["windows-x86_64"];
    check("latest.json 包含 windows-x86_64", Boolean(platform));
    if (platform) {
      check("latest.json 下载地址指向安装包", urlPointsTo(platform.url, installerName));
      const signature = typeof platform.signature === "string" ? platform.signature.trim() : "";
      check("latest.json 签名非空", Boolean(signature), signature ? `${signature.length} 字符` : "");
    }
  }
  const signaturePath = `${installer}.sig`;
  const signatureExists = fs.existsSync(signaturePath) && fs.statSync(signaturePath).isFile();
  check("安装包 .sig 签名存在", signatureExists, path.basename(signaturePath));
}

finish();
