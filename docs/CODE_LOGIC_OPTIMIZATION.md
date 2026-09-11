# 底层代码逻辑优化

> 记录时间：2026-09
> 方式：先只读排查（不改代码），确认问题后用测试驱动的方式逐项修复。

---

## 一、排查结论：整体质量良好

排查覆盖 78 个源文件 / 8125 行。**先排除了一批"看起来像问题、核实后没问题"的点**：

| 候选问题 | 核实结果 |
| --- | --- |
| 55 个 `useEffect` 依赖缺失 | **0 个缺失**（用括号配对精确解析，早期的"可疑"标记是解析器误判） |
| 事件监听 / Observer 泄漏 | **全部正确清理**（`{ once: true }` 自移除；Observer 均有 `disconnect`） |
| 空 catch 泛滥 | 仅 9 处，多在"预热失败不阻塞"等合理场景 |
| 数组越界 | 访问点均有 `?.` / `\|\|` 兜底 |
| 异步竞态无守卫 | 关键路径（notebook 加载）**有** `disposed` 守卫；其余多在纯数据层，守卫应由调用方负责 |

---

## 二、修复的 4 个真实问题

### 问题 1：`useAppStore` 的死字段与职责重叠

项目有**两个 zustand store**，`runtimeState` 在两边都有定义：

```js
useAppStore:      runtimeState / runtimeProgress / isNotebookDirty / sidebarTab
useNotebookStore: runtimeState / runtimeMessage / runtimePercent   ← 实际在用的
```

**精确核实**（区分"读"与"写"）：

| 字段 | 读取点 | 写入点 | 结论 |
| --- | --- | --- | --- |
| `runtimeProgress` | **0** | 2 | 死字段 |
| `isNotebookDirty` | **0** | 2 | 死字段 |
| `sidebarTab` | **0** | 3 | 死字段 |
| `useAppStore.runtimeState` | **0** | 1 | 死字段 |
| `setSidebarTab` / `setNotebookDirty` | 从未调用 | — | 死方法 |

**根因**：`NotebookWorkspace.jsx` 用的是 `useNotebookStore()`，
所以 `store.runtimeState` 读的是 notebookStore；`useAppStore` 的同名字段无人读取。

**风险**：后来者若写 `useAppStore().runtimeState`，会拿到**永远是 `idle` 的死值且不报错**。

**修复**：删除 3 个字段 + 2 个方法 + 2 个孤儿方法（`setRuntime`、`setNotebookDirty`）。
构建通过，全局搜索零残留。

### 问题 2：cell 类型判断散落（我实际踩过的坑）

notebook 数据在代码中有**两种形态**：
- 磁盘 / Jupyter 格式：`cell_type`（下划线）
- 应用内存格式：`type`

历史实现里有 3 处手写防御式判断：

```js
cells.filter((cell) => cell.cell_type === "markdown" || cell.type === "markdown")
```

而 `utils/notebookHelpers.js` 的 `markdownOutline` **只认 `cell.type`** —— 遇到刚解析的原始文件会判断失效。

> 我在做"按章预热"时正是因为这个不一致，一开始写出了
> `cell.type === "code" || cell.cell_type === "code"`。

**修复**：在 `notebookHelpers.js` 新增**唯一入口**：

```js
export const getCellType = (cell) => cell?.type || cell?.cell_type || "";
export const isCodeCell = (cell) => getCellType(cell) === "code";
export const isMarkdownCell = (cell) => getCellType(cell) === "markdown";
export const getCellSource = (cell) => Array.isArray(cell?.source)
  ? cell.source.join("") : String(cell?.source ?? "");
```

并替换 5 处重复模式（`NotebookContentCenter` 3 处、`StudentNotebookCenter` 2 处），
`notebookStore` 的类型归一化也改用 `getCellType`。

**测试**：18 个用例全部通过，含**回归用例**证明 `markdownOutline`
现在能同时识别 `type` 与 `cell_type`（旧实现只认前者）。

### 问题 3：抽取 `useKernelStatus` hook

`NotebookWorkspace.jsx` 原本 919 行、112 个内联箭头函数，
其中"内核信号 → 应用状态"的映射逻辑（46 行）自包含但混在组件里。

**修复**：抽出 `src/hooks/useKernelStatus.js`，负责：
- 把 Jupyter 的 `statusChanged` / `connectionStatusChanged` 映射为
  `idle / loading / busy / error` 并写回 store
- 重复绑定时**自动解除旧监听**（防泄漏）
- 兼容 `runtime` 为 `null`、内核缺失、未知状态

**测试**：12 个行为用例全部通过 —— 状态映射、监听器增减、重绑定清理、边界情况。

**顺带清理**：移除已无用的 `kernelStatusBindingRef` 与 `kernelStatusDetails` 导入。
文件从 **919 → 866 行**。

### 问题 4：消除渲染热路径上的重复计算

渲染单元格列表时有两处"每次渲染都重算"：

| 位置 | 问题 | 修复 |
| --- | --- | --- |
| `codeIndex` | 每个单元格都做 `slice(0, i+1).filter(...)`，整体 **O(n²)** | 一次遍历预计算 `codeIndexMap`，渲染时 O(1) 查表 |
| `onToggleMarkdown` | 内联箭头函数，每次渲染新建引用 | `useCallback` 记忆化 |
| `NotebookCell` | 未 memo，父组件任何重渲染都导致全部单元格重渲染 | 包 `memo` + 自定义比较器 |

一个 notebook 常有上百个单元格，这三项叠加后**输入时的无谓重渲染**显著减少。

---

## 三、验证

| 检查 | 结果 |
| --- | --- |
| cell helper 测试 | **18/18 通过**（含回归用例） |
| useKernelStatus 行为测试 | **12/12 通过** |
| `npm run build:web` | **✓ built**（多轮） |
| `check:notebooks` / `check:notebook-math` / `check:teaching` | **全部通过** |
| `check:runtime:assets` | `ready` |
| dev server `/` | **HTTP 200** |
| dev server `/course/catalog.json` | **HTTP 200** |
| dev server `/pyodide/manifest.json` | **HTTP 200** |
| `NotebookWorkspace.jsx` | **919 → 866 行** |

### ⚠️ 仍待真机确认

以上为静态分析与单元测试验证。**内核状态胶囊、运行按钮的启用/禁用、
单元格在输入时是否真的不再全量重渲染**，需要在浏览器里实际操作确认。

---

## 四、剩余可继续的方向

1. **`NotebookWorkspace` 仍有 866 行** —— 运行时逻辑（ensureRuntime / 运行单元格 /
   重启 / 预热）与 UI 仍交织（约占 77%）。进一步抽取需要先理清共享闭包，
   建议分多步进行，每步都跑一次构建与行为验证。
2. ~~**`NotebookContentCenter` 566 行 / 104 个箭头函数**~~ → **已拆分**，见下节。
3. ~~**补前端测试基础设施**~~ → **已建立**，见下节。

---

## 五、第三轮：测试基础设施 + 继续拆分

### 5.1 测试基础设施（零新增依赖）

项目此前 `src/` **零测试**，前面几轮的验证都靠临时脚本 —— 用完即弃，无法防止回归。

**方案选择**：Node 24 自带测试运行器（`node:test`）已完全够用，
因此**不引入 vitest 等新依赖**，避免增加安装体积与维护面。

```json
"test": "node --test \"scripts/__tests__/**/*.test.mjs\"",
"test:watch": "node --test --watch \"scripts/__tests__/**/*.test.mjs\""
```

**测试结构**：

```
scripts/
  testUtils/
    notebookFixtures.mjs    读取真实课程 notebook 作为夹具
    kernelFixtures.mjs      假内核 + 与 hook 同构的绑定器
  __tests__/
    notebookLogic.test.mjs     17 个用例
    kernelStatus.test.mjs       8 个用例
    customNotebook.test.mjs    21 个用例
```

**关键设计**：测试跑在**真实课程数据**上（通过 `catalog.json` 定位 notebook），
而不是手写的玩具数据 —— 这样课程内容变化时测试仍能反映真实情况。

**共 46 个用例，覆盖**：

| 模块 | 覆盖内容 |
| --- | --- |
| cell 类型判断 | 两种格式兼容、空值安全、`markdownOutline` 回归 |
| notebook 归一化 | 类型/源码/executionCount 映射、稳定 id 生成 |
| 预加载包推断 | 别名解析、前置依赖补齐、忽略注释 |
| 内核状态映射 | 状态转换、监听器增减、重绑定清理、空值边界 |
| 自定义 notebook | 元数据读写与降级、文件名安全化、质量检查规则、nbformat 校验、备份结构 |

> 写测试时发现一处**我的预期有误**：`notebookSummary` 的标题正则只匹配
> `#`–`###`（与 `markdownOutline` 一致，四级及以下不计）。经核实这是**有意的设计**，
> 于是修正了测试断言而非改代码。

### 5.2 拆分 `NotebookContentCenter`（566 → 447 行）

把 117 行**纯函数**抽到 `src/utils/customNotebook.js`：

| 抽出内容 | 说明 |
| --- | --- |
| `readMetadata` / `writeMetadata` / `upsertMetadata` | 自定义章节元数据的读写（含损坏 JSON 降级） |
| `makeId` / `safeFileName` | id 生成、文件名安全化 |
| `notebookSummary` / `notebookQualityCheck` | 概览统计、发布前质量检查 |
| `validateNotebook` | nbformat 4 结构校验（带行号的可读错误） |
| `buildBackupPayload` | 备份文件结构（便于测试其稳定性） |
| `triggerDownload` / `downloadNotebook` / `downloadBackup` | 下载封装 |

**收益**：组件专注 UI；这些含大量边界判断的规则现在**全部有测试覆盖**
（21 个用例，含损坏 JSON、非法单元格类型、非整数 execution_count 等）。

### 5.3 抽出内核状态映射为纯函数

把 `useKernelStatus` 里的映射规则再下沉到 `src/utils/kernelStatusMapping.js`：

```js
mapKernelStatus(kernelStatus)              // 执行状态 → 应用状态
mapConnectionStatus(connStatus, kernelStatus)  // 连接状态 → 应用状态
```

**理由**：hook 依赖 React、难以直接测试；而映射规则是纯逻辑，
下沉后 hook 与测试**共用同一份实现**，不会各自漂移。

其中 `connected` 是特殊情形 —— 连接恢复后应**回读内核自身状态**，
而不是假定它已就绪；这个语义现在被显式表达并有测试覆盖。

---

## 六、第三轮验证

| 检查 | 结果 |
| --- | --- |
| `npm test` | **46/46 通过** |
| `npm run build:web` | **✓ built** |
| `check:notebooks` / `check:notebook-math` / `check:teaching` | **全部通过** |
| dev server `/` / `/course/catalog.json` / `/pyodide/manifest.json` | **HTTP 200** |

**文件规模变化**：

| 文件 | 变化 |
| --- | --- |
| `NotebookWorkspace.jsx` | 919 → **866** 行 |
| `NotebookContentCenter.jsx` | 566 → **447** 行 |
| `utils/customNotebook.js` | 新增 162 行（纯函数，可测试） |
| `hooks/useKernelStatus.js` | 新增 60 行 |
| `utils/kernelStatusMapping.js` | 新增 30 行（纯函数，可测试） |
| **测试代码** | 新增 ~330 行 / 46 个用例 |

---

## 七、事故记录：删除"死方法"导致运行时崩溃

### 现象

浏览器报错 `store.setRuntime is not a function`。

### 根因（我的失误）

在「问题 1」中，我判定 `useAppStore.setRuntime` 是死方法并删除。
判定依据是我写的正则：

```python
for m in re.finditer(r'useAppStore\([^\n]*setRuntime', ln)   # 只在单行内匹配
```

但 `CourseView.jsx` 的调用写在一行很长的 JSX 里：

```jsx
onRuntimeState={(state) => store.setRuntime(state, 100)}
```

而该文件里 `const store = useAppStore()`。**我的正则跨不过这一行，于是漏判。**

更关键的是：**这个错误构建阶段发现不了** —— JS 不做静态检查，
Vite 打包正常通过，只有真正渲染到该路由才崩。

### 修复

1. **`CourseView.jsx`**：移除 `onRuntimeState` 转发。
   核实后确认该回调本就冗余 —— `NotebookWorkspace` 内部已通过
   `useKernelStatus` 自行写入 `notebookStore`；`NotebookWorkspace` 调用
   `onRuntimeState(state)` 也只传一个参数，原代码里的 `100` 是旧 API 的残留。
2. **新增 `scripts/__tests__/storeContract.test.mjs`**（3 个用例），从机制上防复发：
   - 解析两个 store 真正导出的方法名
   - 扫描所有 `const store = useXxxStore()` 的组件
   - 校验每一处 `store.<method>(` 调用是否真实存在
   - 并检查两个 store 不重复定义同名方法（避免 `runtimeState` 那种职责混淆）

### 验证测试确实有效

临时把错误调用注入回 `CourseView.jsx`，测试**准确捕获**：

```
src/pages/CourseView.jsx:27 调用了 AppStore 上不存在的 setRuntime()
ℹ fail 1
```

随即还原。**这条测试现在能在这个错误进入浏览器之前拦住它。**

### 教训

1. **删除"未被引用"的代码前，必须用能处理长行/多行的方式核实**，
   而不是单行正则。后续同类判断应结合构建产物或类型检查。
2. **纯 JS 项目缺少静态检查时，"删方法"是高风险操作** ——
   应配套契约测试（本次已补）。
3. 更根本的改进方向：接入 ESLint 的 `no-undef` 类规则或逐步迁移 TS，
   让这类错误在编辑期而非运行期暴露。

---

## 八、仍可继续

1. **`NotebookWorkspace` 866 行** —— 运行时逻辑与 UI 仍交织（约 77%）。
   下一步建议先抽出「运行单元格」相关闭包（`runCellFromCell` / `runAllCells` /
   `stopRuntime` / `restartRuntime`），它们相对独立且已有测试底座可承接。
2. **`NotebookContentCenter` 仍有 447 行** —— 主要是两个 Dialog
   （`UploadDialog`、`CourseNotebookDialog`），可各自拆为独立组件文件。
3. **组件层测试** —— 当前测试覆盖纯逻辑；若要测组件交互，
   需要引入 DOM 环境（jsdom）并补 React 测试库，属于下一步投入。
4. **接入静态检查** —— 见上文「教训 3」，建议加 ESLint 以根治此类问题。
