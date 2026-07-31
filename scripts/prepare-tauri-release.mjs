import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.join(root, "src-tauri", "tauri.conf.json");
const releasePath = path.join(root, "src-tauri", "tauri.release.conf.json");

const provider = (process.env.TAURI_UPDATER_PROVIDER || "github").trim().toLowerCase();
const pubkey = process.env.TAURI_UPDATER_PUBKEY?.trim();
const privateKey = process.env.TAURI_SIGNING_PRIVATE_KEY?.trim();

const repository = process.env.GITHUB_REPOSITORY?.trim();
const owner = process.env.TAURI_RELEASE_OWNER?.trim() || repository?.split("/")[0];
const repo = process.env.TAURI_RELEASE_REPO?.trim() || repository?.split("/")[1];
let endpoint = process.env.TAURI_UPDATER_ENDPOINT?.trim();

if (!endpoint && provider === "github" && owner && repo) {
  endpoint = `https://github.com/${owner}/${repo}/releases/latest/download/latest.json`;
}

if (!endpoint && provider === "gitee") {
  endpoint = process.env.TAURI_UPDATER_MANIFEST_URL?.trim();
  if (!endpoint) {
    throw new Error(
      "Gitee 不提供 GitHub 风格的 releases/latest/download/latest.json 稳定地址。请设置 TAURI_UPDATER_MANIFEST_URL，指向稳定托管的 latest.json（例如 Gitee Pages 或自有 CDN）。"
    );
  }
}

if (!endpoint) {
  throw new Error(
    "缺少更新清单地址。请设置 TAURI_UPDATER_ENDPOINT，或同时设置 TAURI_UPDATER_PROVIDER=github、TAURI_RELEASE_OWNER 和 TAURI_RELEASE_REPO。"
  );
}

if (!pubkey) {
  throw new Error(
    "缺少 TAURI_UPDATER_PUBKEY。请使用 tauri signer generate 生成公钥，并将公钥放入发布环境。"
  );
}

if (!privateKey) {
  throw new Error(
    "缺少 TAURI_SIGNING_PRIVATE_KEY。在线更新包必须使用签名私钥构建，私钥不要提交到代码仓库。"
  );
}

const config = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
config.build = {
  ...(config.build || {}),
  beforeBuildCommand: "npm run build:desktop-web:online"
};
config.bundle = {
  ...(config.bundle || {}),
  createUpdaterArtifacts: true
};
config.plugins = {
  ...(config.plugins || {}),
  updater: {
    ...(config.plugins?.updater || {}),
    pubkey,
    endpoints: [endpoint],
    dialog: false
  }
};

fs.writeFileSync(releasePath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
console.log(`Generated ${path.relative(root, releasePath)}`);
console.log(`Updater endpoint: ${endpoint}`);
