#!/usr/bin/env node
/**
 * 下载 Pyodide 与 piplite 资源到 public/，让课程运行时**不依赖公网 CDN**。
 *
 *   node scripts/fetch-runtime-assets.mjs                 # 下载完整资源集
 *   node scripts/fetch-runtime-assets.mjs --check         # 只检查是否已就绪
 *   node scripts/fetch-runtime-assets.mjs --force         # 已存在也重新下载
 *   node scripts/fetch-runtime-assets.mjs --packages=numpy,pandas
 *                                                         # 只本地化指定包的闭包
 *
 * 产出：
 *   public/pyodide/**                  Pyodide 运行时 + 课程包 wheel（约 43 MB）
 *   public/piplite/**                  piplite 包索引与内核 wheel（约 0.03 MB）
 *   public/pyodide/manifest.json       供 src/runtimeAssets.js 探测
 *
 * ── 为什么必须把包 wheel 一起下载（重要）──────────────────────────────────
 * Pyodide 的 `loadPackage()` 在浏览器里**没有 CDN 回退**。见 pyodide.asm.js：
 *
 *     async downloadPackage(e, r = true) {
 *       let n = isNode ? config.packageCacheDir : config.indexURL;
 *       a = joinPath(file_name, n);
 *       try { return await fetch(a, sha256) }
 *       catch (c) { if (!isNode || ...) throw c }        // ← 浏览器：直接抛错
 *       // 只有 Node 环境才会回退到 cdnURL
 *     }
 *
 * 也就是说：`pyodideUrl` 一旦指向 `/pyodide/pyodide.js`，`indexURL` 就是 `/pyodide/`，
 * 之后 `loadPackage(["micropip"])`、`loadPackage(["numpy"])` 都只会去
 * `/pyodide/<file_name>` 取 wheel。**只下载核心文件而不下载 wheel，会让内核在
 * initPackageManager 阶段（进度 40%）直接失败**，表现为长时间无响应。
 *
 * 同理，`piplite.install()` 读取的是 piplite 索引（all.json）里 `url` 字段所指的
 * 同目录 wheel；索引里列出的内核 wheel 也必须落到 public/piplite/。
 *
 * 因此本脚本会：① 下载 Pyodide 核心 ② 按 pyodide-lock.json 解析课程包的**传递闭包**
 * ③ 下载 piplite 索引中列出的全部 wheel ④ 校验 sha256 ⑤ 写入带完整性标记的 manifest。
 *
 * 说明：下载量较大（完整集约 43 MB），因此**不放进默认构建**，
 * 由 `npm run build:runtime:assets` 显式触发。
 */
import { createHash } from 'node:crypto';
import { createWriteStream, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

const PYODIDE_VERSION = 'v0.27.0';
const PIPLITE_VERSION = '0.4.7';

const PYODIDE_BASE = `https://cdn.jsdelivr.net/pyodide/${PYODIDE_VERSION}/full`;
const PIPLITE_BASE = `https://unpkg.com/@jupyterlite/pyodide-kernel@${PIPLITE_VERSION}/pypi`;

// 既不在 Pyodide 发行版、也不在上游 piplite 索引里，但内核启动会用到的小包。
// `comm` 就属于这类：不本地化的话，内核每次启动都会为它去 pypi.org 试一次
// （断网时会白白等一次超时）。这里从 PyPI 取 wheel 并写进本地索引。
// 课程确实用到、但不在 Pyodide 发行版里的纯 Python 包。seaborn / plotly 是重灾区：
// 涉及 20+ 章节，不本地化时每次预热都要现去 pypi.org 拉（实测 ~7 秒，断网直接失败）。
// 这里从 PyPI 取 wheel 写进本地索引，并**递归补齐它们的依赖**。
const PIPLITE_PYPI_EXTRAS = ['comm', 'seaborn', 'plotly'];

// Pyodide 运行所需的**核心**文件（解释器本体 + 标准库 + 包索引）。
const PYODIDE_CORE_FILES = [
  'pyodide.js',
  'pyodide.mjs',
  'pyodide.asm.js',
  'pyodide.asm.wasm',
  'python_stdlib.zip',
  'pyodide-lock.json',
];

// 内核启动就必须存在的 Pyodide 包。
//
// pyodide-kernel 的 `initKernel()` 会执行：
//     piplite.install('ssl','sqlite3','ipykernel','comm','pyodide_kernel','ipython', keep_going=True)
// 这些包**都不在** piplite 索引里（索引只有 ipykernel/piplite/pyodide-kernel/
// widgetsnbextension 四个 mock）。若不干预，它们只能走 piplite 的 PyPI 回退，
// 首次启动要联网从 pypi.org 拉 IPython 及其依赖——慢，且断网直接失败
// （`keep_going=True` 会吞掉错误，最后表现为 `No module named 'IPython'`）。
//
// 其中 ssl / sqlite3 / ipython / micropip **都在 Pyodide 发行版里**，可以走
// `loadPyodideOptions.packages` 直接从本地 `/pyodide/` 加载。见 src/runtimeAssets.js。
const PYODIDE_BOOTSTRAP_PACKAGES = ['micropip', 'ssl', 'sqlite3', 'ipython'];

// 课程会用到的 Pyodide 包（其余由 --packages 覆盖）。闭包会自动补齐依赖。
const PYODIDE_COURSE_PACKAGES = ['numpy', 'pandas', 'matplotlib', 'scipy', 'scikit-learn'];

const args = new Set(process.argv.slice(2));
const checkOnly = args.has('--check');
const force = args.has('--force');
const packagesArg = [...args].find((arg) => arg.startsWith('--packages='));
const coursePackages = packagesArg
  ? packagesArg.slice('--packages='.length).split(',').map((name) => name.trim()).filter(Boolean)
  : PYODIDE_COURSE_PACKAGES;

const root = process.cwd();
const pyodideDir = join(root, 'public', 'pyodide');
const pipliteDir = join(root, 'public', 'piplite');
const manifestPath = join(pyodideDir, 'manifest.json');

function human(bytes) {
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

const DOWNLOAD_TIMEOUT_MS = 120_000;
const DOWNLOAD_ATTEMPTS = 3;

async function fetchBytes(url, label) {
  const response = await fetch(url, { signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS) });
  if (!response.ok || !response.body) {
    throw new Error(`${label} 下载失败：HTTP ${response.status}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  return buffer;
}

/**
 * 下载单个文件并校验 sha256。
 *
 * 必须带超时：CDN 偶尔会在传输中途挂住，`fetch` 没有超时的话整个构建脚本会
 * 永远卡在那里（实测被卡过 3 分钟以上）。失败按次数退避重试。
 */
async function download(url, dest, label, expectedSha256) {
  mkdirSync(dirname(dest), { recursive: true });
  let lastError;
  for (let attempt = 1; attempt <= DOWNLOAD_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS) });
      if (!response.ok || !response.body) {
        throw new Error(`HTTP ${response.status}`);
      }
      await pipeline(Readable.fromWeb(response.body), createWriteStream(dest));
      const size = statSync(dest).size;
      if (expectedSha256) {
        const actual = createHash('sha256').update(readFileSync(dest)).digest('hex');
        if (actual !== expectedSha256) {
          rmSync(dest, { force: true });
          throw new Error(`sha256 不匹配（期望 ${expectedSha256.slice(0, 12)}…，实际 ${actual.slice(0, 12)}…）`);
        }
      }
      return size;
    } catch (error) {
      lastError = error;
      rmSync(dest, { force: true });
      if (attempt < DOWNLOAD_ATTEMPTS) {
        const wait = attempt * 2000;
        console.warn(`  ${label} 第 ${attempt} 次失败（${error.message}），${wait / 1000}s 后重试`);
        await new Promise((resolve) => { setTimeout(resolve, wait); });
      }
    }
  }
  throw new Error(`${label} 下载失败：${lastError?.message || lastError}`);
}

/** 校验已存在文件的 sha256（中断的下载会留下"大小对但内容坏"的残缺文件）。 */
function verifyChecksum(dest, expectedSha256) {
  try {
    return createHash('sha256').update(readFileSync(dest)).digest('hex') === expectedSha256;
  } catch {
    return false;
  }
}

/** 按 pyodide-lock.json 解析包的传递闭包。闭包。
 *
 * Pyodide 自己按"归一化名"查表（`prompt_toolkit` → `prompt-toolkit`），
 * 这里必须保持一致，否则会把真实存在的依赖误判为缺失。
 */
function resolvePyodideClosure(lock, roots) {
  const normalize = (name) => String(name).replace(/_/g, '-').toLowerCase();
  const byNormalized = new Map(Object.entries(lock.packages).map(([name, pkg]) => [normalize(name), pkg]));
  const closure = new Map();
  const visit = (rawName) => {
    const pkg = byNormalized.get(normalize(rawName));
    if (!pkg) throw new Error(`pyodide-lock.json 中缺少包：${rawName}`);
    if (closure.has(pkg.name)) return;
    closure.set(pkg.name, pkg);
    for (const dependency of pkg.depends || []) visit(dependency);
  };
  roots.forEach(visit);
  return closure;
}

/** 读取本地 pyodide-lock.json（首次运行时从远端取）。 */
async function loadPyodideLock() {
  const local = join(pyodideDir, 'pyodide-lock.json');
  if (existsSync(local)) return JSON.parse(readFileSync(local, 'utf8'));
  const buffer = await fetchBytes(`${PYODIDE_BASE}/pyodide-lock.json`, 'pyodide/pyodide-lock.json');
  mkdirSync(pyodideDir, { recursive: true });
  writeFileSync(local, buffer);
  return JSON.parse(buffer.toString('utf8'));
}

/**
 * 判断 wheel 能否在浏览器（Pyodide / WebAssembly）中加载。
 *
 * 只有两类可用：
 *   * `py3-none-any.whl`          纯 Python
 *   * `*pyodide*wasm32*.whl`      Emscripten 构建
 *
 * 平台专用 wheel（macosx / manylinux / win_amd64 / cp310-cp310-… 等）
 * 在浏览器里**根本无法加载**。此前只做"优先纯 Python"的排序、没有排除，
 * 于是 fiona（15.4 MB macOS 轮子）、cudf-cu12（2.6 MB Linux aarch64 轮子）
 * 被下载进来，既白占体积，又可能让 piplite 装到不可用的文件。
 */
function isBrowserLoadableWheel(filename) {
  const name = String(filename || '').toLowerCase();
  if (!name.endsWith('.whl')) return false;
  if (name.endsWith('py3-none-any.whl')) return true;
  return name.includes('pyodide') && name.includes('wasm32');
}

/** 读取 piplite 索引，返回需要本地化的 wheel 列表。 */
async function loadPipliteWheels() {
  const indexPath = join(pipliteDir, 'all.json');
  const buffer = existsSync(indexPath)
    ? readFileSync(indexPath)
    : await fetchBytes(`${PIPLITE_BASE}/all.json`, 'piplite/all.json');
  if (!existsSync(indexPath)) {
    mkdirSync(pipliteDir, { recursive: true });
    writeFileSync(indexPath, buffer);
  }
  const index = JSON.parse(buffer.toString('utf8'));
  const wheels = [];
  for (const [name, meta] of Object.entries(index)) {
    for (const files of Object.values(meta.releases || {})) {
      for (const file of files) {
        // 索引里可能残留平台专用 wheel（历史运行遗留），一并跳过。
        if (!isBrowserLoadableWheel(file.filename)) continue;
        // 索引里的 url 是相对路径（"./x.whl"），与索引同目录解析。
        wheels.push({ name, filename: file.filename, sha256: file.digests?.sha256 });
      }
    }
  }
  return wheels;
}

/**
 * 从 PyPI 本地化补充包，并递归拉取它们的依赖。
 *
 * `providedNames` 是已经由 Pyodide 发行版覆盖的包（numpy/pandas/matplotlib…），
 * 这些不需要也不应该再从 PyPI 拉一遍——Pyodide 的构建版本才是 WASM 可用的。
 *
 * @param {string[]} providedNames 已由 pyodide-lock 闭包提供的包名
 */
async function localizePiplitePypiExtras(providedNames = []) {
  if (!PIPLITE_PYPI_EXTRAS.length) return [];
  const indexPath = join(pipliteDir, 'all.json');
  if (!existsSync(indexPath)) return [];

  const index = JSON.parse(readFileSync(indexPath, 'utf8'));
  const normalize = (name) => String(name).replace(/_/g, '-').toLowerCase();
  const provided = new Set(providedNames.map(normalize));
  const results = [];
  const visited = new Set();
  const queue = [...PIPLITE_PYPI_EXTRAS];

  while (queue.length) {
    const name = queue.shift();
    const key = normalize(name);
    if (visited.has(key) || provided.has(key)) continue;
    visited.add(key);

    // 已经本地化过了（索引里有条目且 wheel 确实存在）就跳过，保证可重复执行。
    const existing = Object.values(index[key]?.releases || {})[0]?.[0];
    if (existing && existsSync(join(pipliteDir, existing.filename))) continue;

    try {
      const response = await fetch(`https://pypi.org/pypi/${encodeURIComponent(name)}/json`,
        { signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS) });
      if (!response.ok) throw new Error(`PyPI 元数据 HTTP ${response.status}`);
      const meta = await response.json();
      const version = meta.info?.version;
      const candidates = (meta.releases?.[version] || [])
        .filter((file) => file.packagetype === 'bdist_wheel' && file.filename.endsWith('.whl'))
        // 关键：只保留浏览器可加载的 wheel。此前只按"是否纯 Python"排序而不排除，
        // 导致没有纯 Python 轮子的包（如 fiona、cudf）会退化选到 macOS/Linux 轮子。
        .filter((file) => isBrowserLoadableWheel(file.filename));
      const wheel = candidates
        .sort((left, right) => Number(right.filename.includes('py3-none-any'))
          - Number(left.filename.includes('py3-none-any')))[0];
      if (!wheel) throw new Error('PyPI 上没有浏览器可用的 wheel');

      const dest = join(pipliteDir, wheel.filename);
      const reusable = existsSync(dest)
        && (!wheel.digests?.sha256 || verifyChecksum(dest, wheel.digests.sha256));
      const size = reusable
        ? statSync(dest).size
        : await download(wheel.url, dest, `piplite/${name}`, wheel.digests?.sha256);

      // 只在 wheel 落地后才写索引，避免索引指向不存在的文件。
      //
      // 必须剥掉 PEP 658 元数据字段（core-metadata / dist-info-metadata）：
      // PyPI 会声明"有独立的 .metadata 文件"，而本地只放了 wheel。
      // 留着这些字段，micropip 会去取 <wheel>.metadata 并对不上校验和，
      // 直接抛 Invalid checksum —— 内核启动又会被卡住。
      // 剥掉之后 micropip 会回退到"下载 wheel 读内部 METADATA"，完全可用。
      const entry = { ...wheel, url: `./${wheel.filename}` };
      delete entry['core-metadata'];
      delete entry['dist-info-metadata'];
      index[name] = index[name] || { releases: {} };
      index[name].releases[version] = [entry];
      writeFileSync(indexPath, `${JSON.stringify(index, null, 2)}\n`, 'utf8');

      results.push({ target: `piplite/${wheel.filename}`, size });
      console.log(`  ${`piplite/${name}`.padEnd(30)} ${human(size).padStart(9)}  (PyPI${reusable ? '，已存在' : ''})`);

      // 递归补齐依赖：只拉"Pyodide 没提供"的那些（numpy/pandas/matplotlib 会被
      // provided 挡掉），纯 Python 依赖则继续入队。
      for (const requirement of meta.info?.requires_dist || []) {
        if (/;\s*extra\s*==/i.test(requirement)) continue; // 可选 extras，不装
        const depName = requirement.split(/[\s<>=!~;[(]/)[0].trim();
        if (depName) queue.push(depName);
      }
    } catch (error) {
      console.warn(`  跳过 ${name}：${error.message}`);
    }
  }
  return results;
}

/** 需要本地化的全部文件（路径相对 public/）。 */
async function buildPlan() {
  const lock = await loadPyodideLock();
  const closure = resolvePyodideClosure(lock, [...PYODIDE_BOOTSTRAP_PACKAGES, ...coursePackages]);

  const files = [];
  for (const name of PYODIDE_CORE_FILES) {
    files.push({ target: `pyodide/${name}`, url: `${PYODIDE_BASE}/${name}`, label: `pyodide/${name}` });
  }
  for (const [name, pkg] of closure) {
    files.push({
      target: `pyodide/${pkg.file_name}`,
      url: `${PYODIDE_BASE}/${pkg.file_name}`,
      label: `pyodide/${name}`,
      sha256: pkg.sha256,
    });
  }
  for (const wheel of await loadPipliteWheels()) {
    files.push({
      target: `piplite/${wheel.filename}`,
      url: `${PIPLITE_BASE}/${wheel.filename}`,
      label: `piplite/${wheel.name}`,
      sha256: wheel.sha256,
    });
  }
  return { files, closure: [...closure.keys()] };
}

/** 写入前端探测用的 manifest。 */
function writeManifest({ closure, files, complete }) {
  mkdirSync(pyodideDir, { recursive: true });
  writeFileSync(manifestPath, `${JSON.stringify({
    pyodideUrl: '/pyodide/pyodide.js',
    pipliteIndexUrl: '/piplite/all.json',
    pipliteWheelUrl: `/piplite/piplite-${PIPLITE_VERSION}-py3-none-any.whl`,
    pyodideVersion: PYODIDE_VERSION,
    // seaborn / plotly / nbformat 不在本地 piplite 索引里，保留 PyPI 回退。
    disablePyPIFallback: false,
    complete,
    packages: closure,
    // 内核启动时必须由 loadPyodide 直接装载（而非 piplite 走 PyPI）的包。
    bootstrapPackages: PYODIDE_BOOTSTRAP_PACKAGES,
    files,
  }, null, 2)}\n`, 'utf8');
}

async function main() {
  if (checkOnly) {
    if (!existsSync(manifestPath)) {
      console.log('runtime assets: missing（将回退 CDN；运行 npm run build:runtime:assets 以本地化）');
      return;
    }
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    const missing = (manifest.files || []).filter((file) => !existsSync(join(root, 'public', file)));
    if (!manifest.complete || missing.length) {
      console.log(`runtime assets: incomplete（缺少 ${missing.length} 个文件，将回退 CDN）`);
      missing.slice(0, 10).forEach((file) => console.log(`  缺少 ${file}`));
      process.exitCode = 1;
      return;
    }
    console.log(`runtime assets: ready（${(manifest.files || []).length} 个文件，离线可用）`);
    return;
  }

  if (force) {
    rmSync(pyodideDir, { recursive: true, force: true });
    rmSync(pipliteDir, { recursive: true, force: true });
  }

  const { files, closure } = await buildPlan();
  console.log(`课程包闭包（${closure.length} 个）：${closure.join(', ')}`);
  console.log('');

  // 先把 manifest 标记为"不完整"：下载中途被打断时，前端会老老实实回退 CDN，
  // 而不是拿一份缺 wheel 的本地资源去启动内核（浏览器端没有 CDN 回退，会直接失败）。
  writeManifest({ closure, files: [], complete: false });

  let total = 0;
  let downloaded = 0;
  let skipped = 0;
  const completed = [];

  for (const file of files) {
    const dest = join(root, 'public', file.target);
    if (!force && existsSync(dest)) {
      // 存在 ≠ 可用。上一次下载被中断时可能留下残缺文件（大小一致但内容坏了），
      // 而 Pyodide 是用 `fetch(url, {integrity: 'sha256-…'})` 取包的——
      // 校验不过会表现为 "Failed to fetch"，很难查。所以这里一律校验后复用。
      if (!file.sha256 || verifyChecksum(dest, file.sha256)) {
        total += statSync(dest).size;
        skipped += 1;
        completed.push(file.target);
        continue;
      }
      console.warn(`  ${file.label} 已存在但校验失败，重新下载`);
      rmSync(dest, { force: true });
    }
    const size = await download(file.url, dest, file.label, file.sha256);
    total += size;
    downloaded += 1;
    completed.push(file.target);
    console.log(`  ${file.label.padEnd(30)} ${human(size).padStart(9)}`);
  }

  // 补充包（来自 PyPI）：下载成功才写进本地索引。
  for (const extra of await localizePiplitePypiExtras(closure)) {
    total += extra.size;
    downloaded += 1;
    completed.push(extra.target);
  }

  // manifest 供 src/runtimeAssets.js 探测；URL 使用同源相对路径。
  // `complete` 必须如实反映"闭包是否完整"：只有完整时前端才敢把 pyodideUrl
  // 指向本地——否则 loadPackage 会因缺 wheel 直接失败（浏览器无 CDN 回退）。
  const missing = completed.filter((file) => !existsSync(join(root, 'public', file)));
  writeManifest({ closure, files: completed.sort(), complete: missing.length === 0 });
  if (missing.length) {
    console.warn(`\n警告：仍有 ${missing.length} 个文件缺失，manifest 已标记 complete=false（运行时回退 CDN）。`);
  }

  console.log(`\n本地运行时资源就绪：${human(total)}（新下载 ${downloaded} 个，复用 ${skipped} 个）`);
  console.log(`  ${pyodideDir}`);
  console.log(`  ${pipliteDir}`);
  console.log('提示：这些文件应随构建产物一起发布；public/pyodide 已被 .gitignore 忽略。');
}

main().catch((error) => {
  console.error(`\n下载失败：${error.message}`);
  console.error('运行时会在本地资源不完整时自动回退 CDN，功能不受影响。');
  process.exitCode = 1;
});
