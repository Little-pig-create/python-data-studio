#!/usr/bin/env node
/**
 * 清理本地构建缓存与产物（均已被 .gitignore 忽略，删除不影响仓库）。
 *
 *   node scripts/clean.mjs          安全清理：web 构建、运行时、输出
 *   node scripts/clean.mjs --rust   额外清理 cargo / tauri target（回收最大）
 *   node scripts/clean.mjs --all    全部，含 release 与 datasets 本地副本
 *   node scripts/clean.mjs --dry    只列出将删除的目录，不实际删除
 */
import { existsSync, readdirSync, rmSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';

const args = new Set(process.argv.slice(2));
const dry = args.has('--dry');
const withRust = args.has('--rust') || args.has('--all');
const withAll = args.has('--all');

const TIER_SAFE = [
  ['dist', 'web 构建产物'],
  ['public/runtime', 'JupyterLite 站点'],
  ['notebooks/course', '运行时打包输入'],
  ['output', 'notebook 运行输出'],
  ['.tmp-runtime', 'JupyterLite 中间产物'],
  ['src-tauri/generated', 'tauri 生成文件'],
  ['src-tauri/gen', 'tauri 生成文件'],
  ['__pycache__', 'Python 缓存'],
  ['.ipynb_checkpoints', 'notebook 检查点'],
];

const TIER_RUST = [
  ['src-tauri/target', 'cargo / tauri 构建缓存'],
  ['server/target', 'Rust 服务构建缓存'],
  ['runtime/native/dist', '打包的 CPython 运行时'],
];

const TIER_ALL = [
  ['release', '发布打包产物'],
  ['datasets', '原始数据集本地副本'],
];

function dirSize(path) {
  let total = 0;
  const walk = (p) => {
    let entries;
    try {
      entries = readdirSync(p, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = join(p, entry.name);
      if (entry.isDirectory()) walk(full);
      else {
        try {
          total += statSync(full).size;
        } catch {
          /* ignore */
        }
      }
    }
  };
  walk(path);
  return total;
}

function human(bytes) {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

const targets = [...TIER_SAFE];
if (withRust) targets.push(...TIER_RUST);
if (withAll) targets.push(...TIER_ALL);

/**
 * 删除目录。
 *
 * Windows 上的两个坑：
 *   1) fs.rmSync 对长路径/被占用的文件会**静默无效果**（不抛错但目录仍在）；
 *   2) `cmd rmdir` 不认正斜杠路径（`a/b` 会被当作开关），必须用反斜杠。
 * 因此这里统一走绝对路径 + shell 执行，并在删除后复查，失败就明确报错。
 */
function removeDir(path) {
  const abs = resolve(path);
  if (process.platform === 'win32') {
    // shell: true 让 cmd 正常解析反斜杠路径
    spawnSync(`rmdir /s /q "${abs}"`, { stdio: 'ignore', shell: true });
  } else {
    spawnSync('rm', ['-rf', abs], { stdio: 'ignore' });
  }
  if (!existsSync(abs)) return true;
  // 回退：Node 自带实现
  try {
    rmSync(abs, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  } catch {
    /* fall through to the existsSync check below */
  }
  return !existsSync(abs);
}

let reclaimed = 0;
let removed = 0;
const failed = [];
for (const [path, label] of targets) {
  if (!existsSync(path)) continue;
  const size = dirSize(path);
  if (dry) {
    console.log(`[dry] ${path.padEnd(26)} ${human(size).padStart(10)}  ${label}`);
  } else if (removeDir(path)) {
    console.log(`[del] ${path.padEnd(26)} ${human(size).padStart(10)}  ${label}`);
  } else {
    failed.push(path);
    console.log(`[!! ] ${path.padEnd(26)} ${human(size).padStart(10)}  ${label}（删除失败）`);
  }
  reclaimed += size;
  removed += 1;
}

if (removed === 0) {
  console.log('没有需要清理的目录。');
} else if (failed.length) {
  console.log(
    `\n已回收 ${human(reclaimed)}（${removed} 个目录），但 ${failed.length} 个删除失败：${failed.join(', ')}`,
  );
  console.log('常见原因：文件被其它进程占用（关闭 dev server / 编辑器后重试）。');
  process.exitCode = 1;
} else {
  console.log(
    `\n${dry ? '将回收' : '已回收'} ${human(reclaimed)}（${removed} 个目录）`,
  );
  if (!withRust) {
    console.log('提示：加 --rust 可额外清理 cargo/tauri 构建缓存（通常最大）。');
  }
}
