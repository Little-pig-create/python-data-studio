# 技术栈与职责边界

## 1. 正式技术栈

| 层级 | 技术 |
|---|---|
| 应用 | React + TypeScript |
| 构建 | Vite |
| 路由 | React Router |
| 布局与响应式 | Tailwind CSS |
| 基础组件 | MUI Core |
| 复杂组件 | MUI X Tree View、Data Grid、Charts |
| 动效组件 | React Bits |
| 状态管理 | Zustand |
| Notebook | JupyterLite Notebook |
| Python | 浏览器 Pyodide Kernel；桌面锁定版 CPython + Jupyter Server |
| 单元测试 | Vitest |
| 浏览器与视觉测试 | Playwright |
| 工作区 | npm workspaces |

具体版本在运行时原型验证后锁定，并提交 lockfile。不得使用浮动版本构建生产站点。

## 2. 技术职责

桌面 Runtime 的进程生命周期由 `src-tauri/src/lib.rs` 管理，前端通过 `src/notebookRuntime.js` 的统一入口连接 `@jupyterlab/services`。React 不启动进程、不读取安装目录，也不保存 Token。

### React

负责：

- 路由；
- 页面结构；
- 业务组件组合；
- 错误边界；
- Provider；
- Runtime Bridge 的应用端适配。

不负责：

- 操作 JupyterLite DOM；
- 解析 CodeMirror 内部状态；
- 保存 Notebook 文件内容。

### Tailwind CSS

负责：

- Flex、Grid 和容器布局；
- 宽高、间距和响应式；
- 应用外壳的简单视觉样式；
- 基于共享 CSS Variables 的颜色工具类。

不负责：

- 使用 `!important` 覆盖 MUI；
- 修改 `.Mui*`、`.jp-*`、`.lm-*` 或 `.cm-*` 内部类；
- 给 JupyterLite iframe 注入样式。

### MUI Core

负责：

- Button、IconButton；
- Dialog、Drawer、Menu；
- Tooltip、Snackbar；
- Tabs、Badge、Progress；
- 无障碍焦点和键盘行为。

原则：

- 使用 ThemeProvider 和 `sx` API；
- 不通过全局 CSS 修改内部结构；
- 复杂弹层必须使用 MUI，而不是手写绝对定位浮层。

### MUI X

正式使用位置：

| 包 | 用途 |
|---|---|
| `@mui/x-tree-view` | 课程目录和 Notebook 标题目录 |
| `@mui/x-data-grid` | 数据集、CSV 和资源预览 |
| `@mui/x-charts` | 学习进度概览 |

首期只使用 Community 功能。若设计需要 Pro/Premium 能力，必须新增 ADR 说明许可证和替代方案。

### React Bits

负责少量高价值动效：

- 页面或面板首次进入；
- 学习进度数字；
- 运行成功反馈；
- 首次使用向导；
- 欢迎视图。

React Bits 组件按需收口到 `packages/react-bits`。业务代码不得从多个位置复制同一个组件。

禁止使用：

- 粒子背景；
- 持续 WebGL 动画；
- 鼠标跟随；
- 单元格布局动画；
- 会改变 Notebook 尺寸的进入动效。

### Zustand

负责：

- 当前课程和章节；
- 运行时可观察状态；
- 应用布局；
- 学习进度；
- 用户偏好；
- Runtime Bridge 收到的业务事件。

不保存：

- Notebook JSON；
- iframe、Window 或 DOM 实例；
- Pyodide 内核对象；
- DataFrame 全量数据。

### JupyterLite

负责：

- Notebook 打开、编辑、执行；
- 单元格状态；
- 输出渲染；
- IndexedDB 工作副本；
- Notebook 下载；
- Python 内核生命周期。

Notebook 视觉由正式主题扩展控制，应用层不注入覆盖样式。

## 3. 包结构

```text
src/                         React 工作台、状态和 Bridge 客户端
runtime/extensions/          JupyterLab federated extensions
runtime/                     JupyterLite 构建配置
public/course/               当前浏览器课程发布内容
public/course/module-capstones/ 8 个模块大作业 Notebook
datasets/                    源数据、快照和 Manifest
docs/                        设计、教学与验收文档

# 历史生成链路（不作为当前发布路径）
notebooks/course/            早期正式课程内容
notebooks/extras/            早期补充练习内容
```

## 4. 依赖方向

```text
src/
  ├─ uses Tailwind, MUI X, Zustand and React Bits
  └─ communicates with jupyterlite-course-bridge

runtime/extensions/jupyterlite-course-theme
  └─ owns JupyterLab theme variables and Notebook styles

runtime/extensions/jupyterlite-course-bridge
  └─ does not depend on apps/web
```

禁止循环依赖。`src/` 不得导入 JupyterLab 内部实现包。

## 5. 构建输出

```text
dist/
├─ index.html               # React 工作台
├─ assets/
├─ course-manifest.json
└─ runtime/                 # JupyterLite 站点
   ├─ notebooks/
   ├─ files/
   └─ extensions/
```

React 与 JupyterLite 必须同源部署，以便 Bridge 能使用严格 origin 校验。

## 6. 依赖门禁

引入新依赖前必须满足至少一个条件：

- 提供成熟且难以自行实现的核心能力；
- 明显减少重复代码；
- 已在本档案中有明确使用位置；
- 不与现有库争夺相同职责。

不得仅为了展示“技术栈丰富”而安装未使用的包。

## 7. 课程内容与发布路径说明

课程内容文档与运行时发布目录需要区分：

- `public/course/`：当前浏览器课程静态内容入口；
- `dist/course/`：构建/发布后的同步内容入口；
- `datasets/`：源数据、数据说明和 Manifest；
- `public/datasets/`：浏览器运行时可读取的数据副本；
- `docs/`：课程结构、Notebook 编写规范、数据治理和验收文档。

历史文档中的 `notebooks/course/` 仅表示早期生成链路，不应被误读为当前发布目录。内容改造不主动修改 `src/`、路由或运行时实现；修改课程 Notebook 后应按课程索引要求同步静态发布目录，并重新执行 JSON、路径、冷启动和质量审计。

当前课程内容基线为 117 个课程章节（109 个连续教学章节 + 8 个独立模块大作业章节）、8 个模块；第 10 章文件操作是普通教学章节。技术栈文档只说明文件和运行边界，模块划分、教学顺序、方法示例和作业规则以课程内容权威文档为准。


## 文件操作专题（Python 基础）

Python 基础模块第 10 章是普通教学章节“文件操作专题：读取、写入与目录管理”，主线使用 `os`、`open`、`csv`、`json`，覆盖路径检查、目录创建、文本读写、追加/覆盖写入、表格文件、结构化结果和错误处理。日期与时间专题的内容规范以 `FOUNDATION_AND_MODULE_TEACHING_DESIGN.md` 为准。