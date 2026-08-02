import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDir = path.join(root, "dist");
const removeTree = (target) => {
  if (!fs.existsSync(target)) return;
  const stat = fs.lstatSync(target);
  if (!stat.isDirectory()) {
    fs.unlinkSync(target);
    return;
  }
  for (const entry of fs.readdirSync(target, { withFileTypes: true })) {
    removeTree(path.join(target, entry.name));
  }
  fs.rmdirSync(target);
};

// 清理桌面构建遗留的 index.desktop.html/runtime，保证 Web 包是自洽的。
removeTree(distDir);
const viteCli = path.join(root, "node_modules", "vite", "bin", "vite.js");
console.log("[web-build] vite build --mode web");
const result = spawnSync(process.execPath, [viteCli, "build", "--mode", "web"], {
  cwd: root,
  env: process.env,
  stdio: "inherit",
});
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);

if (!fs.existsSync(path.join(distDir, "index.html"))) {
  throw new Error("Web 构建完成但 dist/index.html 不存在");
}
if (fs.existsSync(path.join(distDir, "index.desktop.html"))) {
  throw new Error("Web 构建不应包含 index.desktop.html");
}
console.log("[web-build] dist is clean and ready");
