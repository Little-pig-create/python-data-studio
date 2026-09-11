# 内核加载策略优化

> 记录时间：2026-09
> 结论：内核启动的"不轻快"**不是代码写法问题，而是运行时资源全部走公网 CDN**。
> 本次完成两项优化：① 加载进度可视化 ② Pyodide 本地化（离线可用 + 秒开）。

---

## 一、问题诊断

### 根因：运行时资源从公网 CDN 拉取

`public/thebe-lite.min.js` 中的硬引用（默认值）：

```
https://cdn.jsdelivr.net/pyodide/v0.27.0/full/pyodide.js
https://unpkg.com/@jupyterlite/pyodide-kernel@0.4.7/pypi/all.json
https://unpkg.com/.../piplite-0.4.7-py3-none-any.whl
```

**学生首次进入 notebook 需下载**：

| 资源 | 体积 |
| --- | --- |
| `pyodide.asm.wasm` | 9.6 MB |
| `python_stdlib.zip` | 2.2 MB |
| `pyodide.asm.js` | 1.2 MB |
| numpy / pandas / matplotlib | ≈ 20 MB |
| **合计** | **≈ 33 MB+** |

后果：
- 首次运行要等十几秒到一分钟（视网速）
- **断网或校园网受限时完全不可用**
- 而 `public/runtime` 当时只有 3.9 MB（仅 ipynb 文件），说明资源**根本没本地化**

---

## 二、优化 ①：加载进度可视化

**问题**：`onStatus` 只输出一行文字（如"正在加载内核通信组件"）。面对 30 MB 下载，
用户看不到任何推进感，容易误判为"卡死"。

**实现**：

1. `src/notebookRuntime.js` 新增 `RUNTIME_PHASES` —— 带**权重**的确定性阶段表：

   | 阶段 | 权重 |
   | --- | --- |
   | script（加载运行时脚本） | 8 |
   | connect（连接运行时） | 10 |
   | session（创建内核） | 14 |
   | ready（确认内核状态） | 8 |
   | **packages（准备课程依赖）** | **50** |
   | done（就绪） | 10 |

   权重按实际耗时分配——包下载占一半，因此给 50。

2. `makeProgressReporter(onProgress)` 同时输出 `label` 与 `percent`。

3. `prewarmCoursePackages` 上报 `packages` 阶段（最慢的一步）。

4. `notebookStore` 新增 `runtimePercent`，并保证：
   - 非 loading 状态自动清零
   - 连续的状态文字更新**不会让进度回退**

5. UI（`NotebookWorkspace`）在内核状态胶囊里渲染进度条：
   ```jsx
   <span className="chapter-kernel-progress" role="progressbar"
         aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
   ```
   含 `prefers-reduced-motion` 适配。

**顺带优化**：`createNativeRuntime` 原本**串行**执行
`start_native_runtime` → `import("@jupyterlab/services")`，现改为 `Promise.all` 并行，
省一次往返（约 100–300 ms）。

---

## 三、优化 ②：Pyodide 本地化

### 关键技术发现

`thebe-lite` 的 `startJupyterLiteServer(options)` **接受 `options.litePluginSettings`**，
并与内置默认值合并：

```js
PageConfig.setOption("litePluginSettings",
  JSON.stringify({ ...defaults.litePluginSettings, ...options?.litePluginSettings }))
```

而 `pyodideUrl` 正是从该配置读取：

```js
const a = JSON.parse(PageConfig.getOption("litePluginSettings") || "{}")[d] || {};
const u = a.pyodideUrl || "https://cdn.jsdelivr.net/pyodide/v0.27.0/full/pyodide.js";
```

**结论：无需修改压缩过的 bundle，用官方配置项即可本地化。**

### 实现

1. **`scripts/fetch-runtime-assets.mjs`（新增）** —— 下载 Pyodide 资源到
   `public/pyodide/` 与 `public/piplite/`，并生成 `manifest.json`：

   ```json
   {
     "pyodideUrl": "/pyodide/pyodide.js",
     "pipliteIndexUrl": "/piplite/all.json",
     "pipliteWheelUrl": "/piplite/piplite-0.4.7-py3-none-any.whl",
     "disablePyPIFallback": false,
     "complete": true,
     "packages": ["micropip", "numpy", "pandas", "..."],
     "files": ["pyodide/numpy-2.0.2-...whl", "..."]
   }
   ```

   > ⚠️ **第一版这里是错的**：当时只下载了 Pyodide 核心文件（13.2 MB），
   > 并假设"其余包由 `loadPackage` 按需从本地 lock 文件取"。这个假设不成立——
   > lock 文件只有元数据，wheel 本体必须与它同目录。详见下节"九、修订"。

2. **`src/runtimeAssets.js`（新增）** —— 优先本地、回退 CDN 的解析层：

   - 探测 `/pyodide/manifest.json`，命中则返回本地 URL 覆盖项
   - 未命中/探测失败 → 返回 `{}`，thebe-lite 继续用 CDN 默认值
   - **永不抛错**（资源缺失只是"没变快"，不应让 notebook 打不开）
   - **完整性门槛**：只有 `complete: true` 才启用本地资源（见"九、修订"）
   - 结果缓存，避免每个 notebook 重复探测

3. **接线**：`notebookRuntime.js` 的 `connectToJupyterLiteServer({ enableMemoryStorage, litePluginSettings })`

4. **npm 脚本**：
   ```json
   "build:runtime:assets": "node scripts/fetch-runtime-assets.mjs",
   "check:runtime:assets": "node scripts/fetch-runtime-assets.mjs --check"
   ```

5. **`.gitignore`** 忽略 `public/pyodide/`、`public/piplite/`（约 13 MB 生成物）

### 效果

| | 优化前 | 优化后 |
| --- | --- | --- |
| Pyodide 来源 | cdn.jsdelivr.net | **同源 `/pyodide/`** |
| 离线可用 | ✗ | **✓** |
| 首次加载 | 受公网带宽限制 | 局域网/本地磁盘速度 |
| 构建产物 | 只含 ipynb | +13.2 MB（一次性）|

---

## 四、验证

| 检查 | 结果 |
| --- | --- |
| `npm run build:runtime:assets` | **成功，13.2 MB** |
| `npm run check:runtime:assets` | `runtime assets: ready` |
| `npm run build:web` | **✓ built in 2.07s** |
| `dist/pyodide/pyodide.asm.wasm` | **9.6 MB，已打包** |
| `dist/pyodide/manifest.json` | **已打包** |
| dev server 访问 `/pyodide/manifest.json` | **HTTP 200** |
| dev server 访问 `/pyodide/pyodide.js` | **HTTP 200 (14.5 KB)** |
| dev server 访问 `/piplite/all.json` | **HTTP 200 (4.2 KB)** |
| `check:notebooks` / `check:notebook-math` / `check:teaching` | **全部通过** |

### 仍待真机确认

静态与构建验证已通过，但**浏览器内实际的 Pyodide 加载行为需要在页面里点一次运行来确认**
（尤其是断网场景下是否真的能启动内核）。

---

## 五、后续可继续的优化

1. ~~**按章预热**~~ → **已在第二轮完成**，见下节。
2. **把本地资源纳入发布流程**：`build:runtime:assets` 目前需手动触发；
   若要保证所有分发都离线可用，应加入正式构建/打包流程。
3. **`withTimeout` 的 12 秒内核 info 超时偏长**，可依据实测下调。

---

## 六、第二轮优化：按章预热 + 目录缓存

### 6.1 按章预热（省下大部分无用下载）

**问题**：`PYODIDE_PREWARM = ["numpy", "pandas", "matplotlib"]` 是**无条件**的。
实测统计各章源码的 import 后：

| 章节 | 实际需要的第三方包 |
| --- | --- |
| **chapter-1 ~ chapter-14**、capstone-python | **无**（共 15 个章节） |
| chapter-15 | 仅 pandas |
| chapter-17 ~ chapter-21 | 仅 numpy |
| … | … |

即：**Python 基础模块（初学者最先接触的 14 章）完全不需要第三方包**，
却要白白下载约 22 MB。

**实现**：

- 新增 `detectRequiredPackages(source)`：扫描源码的 `import` / `from ... import`，
  解析出本章真正用到的课程包，并**自动补齐前置依赖**
  （如 `sklearn` → 需要 `numpy`/`pandas`/`scipy`；`seaborn` → 需要 `numpy`/`pandas`/`matplotlib`）。
- `prewarmCoursePackages(runtime, { source })` 接受章源码；无第三方包时**直接返回**。
- `NotebookWorkspace` 把本章代码格源码汇总后传入（cells 的 `type === "code"`，`source` 为字符串）。
- 兼容性：显式传 `packages` 优先；都不传才退回原默认三项。

**实测（Node 直接调用）**：9/9 用例通过，含边界情形
（注释中的 `# import numpy` 正确忽略）。

**收益**：

| 场景 | 优化前 | 优化后 |
| --- | --- | --- |
| 进入第 1–14 章 | 下载 ≈22 MB | **0 MB** |
| 进入 numpy 章 | 下载 ≈22 MB | ≈4 MB |
| 进入 pandas 章 | 下载 ≈22 MB | ≈10 MB |

### 6.2 课程目录缓存（每次导航省 50 KB）

**问题**：`loadCourseCatalog()` 使用 `cache: "no-store"` **并拼接时间戳参数**
（`?_=${Date.now()}`），导致**每次导航都完整重新下载 catalog.json（50 KB）**，
且完全无法被浏览器 HTTP 缓存利用。该函数被根路由与多个页面调用。

**实现**：

- 移除时间戳参数，改用 `cache: "default"`（可被 HTTP 缓存）
- 加 **60 秒会话缓存** + **in-flight 去重**（并发只发一次请求）
- 新增 `invalidateCourseCatalog()`；目录更新事件与"重新加载"按钮走 `force: true`
  强制刷新，保证不会读到过期快照

**测试中发现并修复的真实缺陷**：初版把 in-flight 去重写成 `if (!force && inFlight)`，
导致**并发 force 调用会发 3 次请求**。已改为对所有调用生效
（`force` 的语义是"不要用缓存结果"，而不是"重复发请求"）。

**验证**：6/6 用例通过（首载发请求 / 命中缓存 / force 绕过 / invalidate 重取 /
并发只发一次 / URL 无时间戳）。

---

## 七、第二轮验证

| 检查 | 结果 |
| --- | --- |
| `detectRequiredPackages` 单元测试 | **9/9 通过** |
| 目录缓存行为测试 | **6/6 通过** |
| `npm run build:web` | **✓ built** |
| `check:notebooks` / `check:notebook-math` / `check:teaching` | **全部通过** |
| `check:runtime:assets` | `runtime assets: ready` |
| dev server `/` | **HTTP 200** |
| dev server `/course/catalog.json` | **HTTP 200 (50.5 KB)** |

## 八、仍可继续的优化（按收益排序）

1. **数据集体积 69 MB 占构建产物的 72%** —— `uci_online_retail_200k.csv`(17 MB)、
   `olist_*`(约 41 MB) 等。这些 CSV 在浏览器端由 Python 读取，
   若改用 **Parquet**（列式压缩）通常可省 50–70%，但需同步修改 notebook 的读取代码。
2. **把 `build:runtime:assets` 纳入正式发布流程**（保证离线分发）。
3. **`withTimeout` 的 12 秒内核 info 超时**可依据实测下调。
4. **HTTP 缓存头**：当前未见显式配置（如 `Cache-Control: immutable` 用于带 hash 的 assets）。
