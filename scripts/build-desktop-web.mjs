import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const modeIndex = args.indexOf("--mode");
const mode = modeIndex >= 0 ? args[modeIndex + 1] : "desktop";
if (!mode || !mode.startsWith("desktop")) {
  throw new Error(`桌面构建脚本需要 desktop 模式，收到：${mode || "(空)"}`);
}
const isStudentEdition = mode === "desktop-student";

const distDir = path.join(root, "dist");

// Node 在 Windows 上对包含超长路径的大型目录执行 rmSync 偶尔会静默失败，
// 因此这里逐层删除，确保上一轮 Web 构建的 runtime/ 不会残留。
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
removeTree(distDir);
const removeIfExists = (target, label) => {
  if (!fs.existsSync(target)) return;
  removeTree(target);
  console.log(`  [desktop-cleanup] removed: ${label}`);
};

console.log(`[desktop-build] vite build --mode ${mode}`);
const viteCli = path.join(root, "node_modules", "vite", "bin", "vite.js");
const result = spawnSync(process.execPath, [viteCli, "build", "--mode", mode], {
  cwd: root,
  env: process.env,
  stdio: "inherit",
});
if (result.error) throw result.error;
if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
console.log("[desktop-build] vite build finished; preparing desktop assets");

// Tauri 的 frontendDist 入口固定为 dist/index.html；桌面源码入口仍保持
// index.desktop.html，以避免 Web 构建误加载桌面专用入口。
const desktopEntry = path.join(distDir, "index.desktop.html");
const tauriEntry = path.join(distDir, "index.html");
if (!fs.existsSync(desktopEntry)) {
  throw new Error("桌面构建完成但 dist/index.desktop.html 不存在");
}
if (fs.existsSync(tauriEntry)) fs.unlinkSync(tauriEntry);
fs.renameSync(desktopEntry, tauriEntry);
console.log("  [desktop-entry] renamed: index.desktop.html -> index.html");

console.log(`[desktop-build] runtime after vite: ${fs.existsSync(path.join(distDir, "runtime")) ? "present" : "absent"}`);

// 学生端的数据集作为 Tauri 原生资源单独打包，避免在 frontendDist 中
// 再复制一份。完整桌面版仍保留静态 datasets，兼容教师数据预览页。
const copyDirectory = (source, target) => {
  fs.mkdirSync(target, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const from = path.join(source, entry.name);
    const to = path.join(target, entry.name);
    if (entry.isDirectory()) copyDirectory(from, to);
    else fs.copyFileSync(from, to);
  }
};
const desktopAssetDirectories = isStudentEdition
  ? ["course", "fonts"]
  : ["course", "datasets", "fonts"];
for (const directory of desktopAssetDirectories) {
  const source = path.join(root, "public", directory);
  const target = path.join(distDir, directory);
  copyDirectory(source, target);
  console.log(`  [desktop-assets] copied: ${directory}/`);
}

removeIfExists(path.join(distDir, "runtime"), "runtime/");
removeIfExists(path.join(distDir, "service-worker.js"), "service-worker.js");
for (const entry of fs.readdirSync(distDir, { withFileTypes: true })) {
  if (entry.isFile() && entry.name.includes("thebe-lite")) {
    removeIfExists(path.join(distDir, entry.name), entry.name);
  }
}

const leftovers = [path.join(distDir, "runtime"), path.join(distDir, "service-worker.js")];
if (isStudentEdition) leftovers.push(path.join(distDir, "datasets"));
if (leftovers.some((target) => fs.existsSync(target))) {
  throw new Error("桌面构建清理失败：学生端不需要的 Web 资源仍存在于 dist/");
}

const files = [];
const walk = (directory) => {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(target);
    else files.push(target);
  }
};
walk(distDir);
const total = files.reduce((sum, file) => sum + fs.statSync(file).size, 0);
console.log(`[desktop-build] dist: ${(total / 1024 / 1024).toFixed(1)} MB (${files.length} files)`);
