import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageInfo = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const version = String(process.env.TAURI_RELEASE_VERSION || packageInfo.version).replace(/^v/i, "");
const repository = process.env.GITHUB_REPOSITORY || "Little-pig-create/python-data-studio";
const tag = process.env.TAURI_RELEASE_TAG || `v${version}`;
const bundleRoot = path.resolve(root, process.env.TAURI_BUNDLE_ROOT || "src-tauri/target/release/bundle");

function collectFiles(directory, result = []) {
  if (!fs.existsSync(directory)) return result;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) collectFiles(target, result);
    else result.push(target);
  }
  return result;
}

const signatures = collectFiles(bundleRoot)
  .filter((file) => /\.(exe|msi)\.sig$/i.test(file))
  .filter((file) => path.basename(file).includes(version))
  .sort((left, right) => {
    const leftNsis = /[\\/]nsis[\\/]/i.test(left) ? 0 : 1;
    const rightNsis = /[\\/]nsis[\\/]/i.test(right) ? 0 : 1;
    return leftNsis - rightNsis || left.localeCompare(right);
  });

if (!signatures.length) {
  throw new Error(
    `未找到版本 ${version} 的签名更新包。请设置 TAURI_SIGNING_PRIVATE_KEY 和 TAURI_UPDATER_PUBKEY 后执行 npm run desktop:build:online。`,
  );
}

const signaturePath = signatures[0];
const artifactPath = signaturePath.slice(0, -4);
if (!fs.existsSync(artifactPath)) throw new Error(`签名对应的安装包不存在：${artifactPath}`);

const assetName = path.basename(artifactPath);
const downloadBase = (process.env.TAURI_RELEASE_DOWNLOAD_BASE_URL
  || `https://github.com/${repository}/releases/download/${tag}`)
  .replace(/\/$/, "");
const notes = process.env.TAURI_RELEASE_NOTES
  || `Python Data Studio v${version}\n\n请查看 GitHub Release 获取本次更新说明。`;
const pubDate = process.env.TAURI_RELEASE_PUB_DATE || new Date().toISOString();

const manifest = {
  version,
  notes,
  pub_date: pubDate,
  platforms: {
    "windows-x86_64": {
      signature: fs.readFileSync(signaturePath, "utf8").trim(),
      url: `${downloadBase}/${encodeURIComponent(assetName)}`,
    },
  },
};

const manifestPath = path.join(bundleRoot, "latest.json");
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

console.log(`[updater] manifest: ${path.relative(root, manifestPath)}`);
console.log(`[updater] artifact: ${path.relative(root, artifactPath)}`);
console.log(`[updater] signature: ${path.relative(root, signaturePath)}`);
console.log(`[updater] download: ${manifest.platforms["windows-x86_64"].url}`);
console.log("[updater] 将上述安装包、.sig 和 latest.json 一起上传到同一个 GitHub Release。");
