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
// 彻底去掉 beforeBuildCommand。
//
// 前端资源已由 release.mjs 在调用 tauri 之前构建完成（这一步刻意保留，
// 用于保证 dist 中的版本号是最新的），因此 tauri 侧不需要再构建一次。
//
// 尝试过的写法都失败，原因是 tauri spawn 该命令时的环境异常：
//   `npm run ...`        -> 'npm' is not recognized（node 不在 PATH）
//   `"<node.exe>" ...`   -> tauri 做 JSON 转义，引号变 \" 导致无法识别
//   `cmd /c echo ...`    -> 'cmd' is not recognized（连 System32 都不在子进程 PATH）
// 既然这一步本就是多余的，直接置为 null 让 tauri 跳过，最可靠。
config.build = {
  ...(config.build || {}),
  beforeBuildCommand: null
};
config.bundle = {
  ...(config.bundle || {}),
  createUpdaterArtifacts: true,
  // 正式版把数据集资源指向 dist/datasets，而不是根目录 datasets/。
  //
  // 原因：Tauri 会把 frontendDist 整体嵌入可执行文件（供前端
  // fetch("/datasets/…")），若再把根目录 datasets/ 声明为 bundle.resources，
  // 同一份约 69 MB 数据会在安装包里出现两次，白白拖慢压缩。
  // build-desktop-web 已把两者生成一致，因此指向 dist/ 那一份即可。
  //
  // 基础配置（tauri.conf.json）仍保留 ../datasets：学生版构建不产出
  // dist/datasets，且各 edition 配置未覆盖 resources，改动基础配置会让它们失败。
  resources: {
    ...Object.fromEntries(
      Object.entries(config.bundle?.resources || {})
        // 去掉指向根目录 datasets 的那一条，避免与 dist/datasets 重复打包。
        .filter(([source]) => !/(^|\/)\.\.\/datasets$/.test(source)),
    ),
    "../dist/datasets": "datasets",
  },
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
