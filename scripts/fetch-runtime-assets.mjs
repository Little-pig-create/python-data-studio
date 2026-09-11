#!/usr/bin/env node
/**
 * 下载 Pyodide 与 piplite 资源到 public/，让课程运行时**不依赖公网 CDN**。
 *
 *   node scripts/fetch-runtime-assets.mjs            # 下载到 public/pyodide
 *   node scripts/fetch-runtime-assets.mjs --check    # 只检查是否已就绪
 *   node scripts/fetch-runtime-assets.mjs --force    # 已存在也重新下载
 *
 * 产出：
 *   public/pyodide/**                  Pyodide 运行时（约 25 MB）
 *   public/piplite/**                  piplite 包索引与 wheel（约 0.1 MB）
 *   public/pyodide/manifest.json       供 src/runtimeAssets.js 探测
 *
 * 说明：下载量较大（首次约 25–30 MB），因此**不放进默认构建**，
 * 由 `npm run build:runtime:assets` 显式触发。
 */
import { createWriteStream, existsSync, mkdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

const PYODIDE_VERSION = 'v0.27.0';
const PIPLITE_VERSION = '0.4.7';

const PYODIDE_BASE = `https://cdn.jsdelivr.net/pyodide/${PYODIDE_VERSION}/full`;
const PIPLITE_BASE = `https://unpkg.com/@jupyterlite/pyodide-kernel@${PIPLITE_VERSION}/pypi`;

// Pyodide 运行所需的最小文件集（不含全部可选包，包由 loadPackage 按需取）。
const PYODIDE_FILES = [
  'pyodide.js',
  'pyodide.mjs',
  'pyodide.asm.js',
  'pyodide.asm.wasm',
  'python_stdlib.zip',
  'pyodide-lock.json',
];

const PIPLITE_FILES = ['all.json', `piplite-${PIPLITE_VERSION}-py3-none-any.whl`];

const args = new Set(process.argv.slice(2));
const checkOnly = args.has('--check');
const force = args.has('--force');

const root = process.cwd();
const pyodideDir = join(root, 'public', 'pyodide');
const pipliteDir = join(root, 'public', 'piplite');

function human(bytes) {
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

async function download(url, dest, label) {
  mkdirSync(dirname(dest), { recursive: true });
  const response = await fetch(url);
  if (!response.ok || !response.body) {
    throw new Error(`${label} 下载失败：HTTP ${response.status}`);
  }
  await pipeline(Readable.fromWeb(response.body), createWriteStream(dest));
  return statSync(dest).size;
}

async function main() {
  const manifestPath = join(pyodideDir, 'manifest.json');

  if (checkOnly) {
    const ready = PYODIDE_FILES.every((f) => existsSync(join(pyodideDir, f)))
      && PIPLITE_FILES.every((f) => existsSync(join(pipliteDir, f)));
    console.log(ready
      ? 'runtime assets: ready（本地资源已就绪，运行时不会访问 CDN）'
      : 'runtime assets: missing（将回退 CDN；运行 npm run build:runtime:assets 以本地化）');
    process.exitCode = ready ? 0 : 0;   // 缺失不是错误，只是未本地化
    return;
  }

  if (force) {
    rmSync(pyodideDir, { recursive: true, force: true });
    rmSync(pipliteDir, { recursive: true, force: true });
  }

  let total = 0;
  const skipped = [];

  for (const file of PYODIDE_FILES) {
    const dest = join(pyodideDir, file);
    if (!force && existsSync(dest)) {
      skipped.push(file);
      total += statSync(dest).size;
      continue;
    }
    const size = await download(`${PYODIDE_BASE}/${file}`, dest, `pyodide/${file}`);
    total += size;
    console.log(`  pyodide/${file.padEnd(22)} ${human(size).padStart(9)}`);
  }

  for (const file of PIPLITE_FILES) {
    const dest = join(pipliteDir, file);
    if (!force && existsSync(dest)) {
      skipped.push(file);
      total += statSync(dest).size;
      continue;
    }
    const size = await download(`${PIPLITE_BASE}/${file}`, dest, `piplite/${file}`);
    total += size;
    console.log(`  piplite/${file.padEnd(22)} ${human(size).padStart(9)}`);
  }

  // manifest 供 src/runtimeAssets.js 探测；URL 使用同源相对路径。
  writeFileSync(manifestPath, `${JSON.stringify({
    pyodideUrl: '/pyodide/pyodide.js',
    pipliteIndexUrl: '/piplite/all.json',
    pipliteWheelUrl: `/piplite/piplite-${PIPLITE_VERSION}-py3-none-any.whl`,
    pyodideVersion: PYODIDE_VERSION,
    // 本地资源已完整下载，禁用 PyPI 回退以保证离线可用。
    disablePyPIFallback: true,
  }, null, 2)}\n`, 'utf8');

  console.log(`\n本地运行时资源就绪：${human(total)}（跳过已存在 ${skipped.length} 个文件）`);
  console.log(`  ${pyodideDir}`);
  console.log(`  ${pipliteDir}`);
  console.log('提示：这些文件应随构建产物一起发布；public/pyodide 已被 .gitignore 忽略。');
}

main().catch((error) => {
  console.error(`\n下载失败：${error.message}`);
  console.error('运行时会在缺少本地资源时自动回退 CDN，功能不受影响。');
  process.exitCode = 1;
});
