# React 应用外壳规范

## 1. 职责

应用外壳负责：

- 课程导航；
- 搜索；
- 路由；
- 学习进度；
- 数据查看器；
- 设置；
- 运行时状态展示；
- Notebook iframe 生命周期。

应用外壳不复制 Notebook 的文件、编辑、运行和保存工具栏。

## 2. 组件结构

```text
App
├─ AppProviders
├─ AppRouter
└─ WorkspaceLayout
   ├─ CourseSidebar
   │  ├─ ProductHeader
   │  ├─ CourseProgress
   │  ├─ CourseSearch
   │  ├─ CourseTree
   │  ├─ WorkspaceTabs
   │  └─ RuntimeStatus
   ├─ NotebookWorkspace
   │  ├─ RuntimeFrame
   │  ├─ LoadingOverlay
   │  └─ RuntimeErrorBoundary
   └─ AuxiliaryPanel
      ├─ NotebookOutline
      ├─ DataExplorer
      └─ ProgressSummary
```

## 3. 课程侧栏

### ProductHeader

显示：

- 产品名称；
- 侧栏折叠按钮；
- 当前课程总进度。

不显示：

- 营销文案；
- 用户头像；
- 登录按钮；
- 与当前课程无关的入口。

### CourseSearch

- 搜索章节标题、模块和标签；
- 输入后不改变 TreeView 节点身份；
- 无结果时显示明确空状态；
- `Escape` 清空搜索，第二次 `Escape` 关闭移动端 Drawer。

### CourseTree

使用 MUI X RichTreeView：

- 模块为父节点；
- 章节为叶子节点；
- 当前章节显示蓝色左线和浅蓝背景；
- 已完成章节显示完成图标；
- 不使用每项独立卡片；
- 节点高度稳定为 `40px`；
- 长标题允许两行，但不得覆盖状态图标。

### WorkspaceTabs

三个固定视图：

- 目录；
- 数据；
- 课程。

使用 MUI Tabs。Tabs 只切换侧栏内容，不影响当前 Notebook。

### RuntimeStatus

侧栏底部显示：

| 状态 | 文案 |
|---|---|
| idle | Python 未启动 |
| loading | 正在准备 Python |
| ready | Python 已就绪 |
| busy | 正在执行 |
| restarting | 正在重新启动 |
| error | 运行时异常 |

状态区可点击打开详情 Dialog，但不是主操作按钮。

## 4. NotebookWorkspace

- iframe 使用稳定 `key`，普通章节切换不随意销毁运行时；
- 页面切换时先发送 Bridge 打开请求；
- 仅在运行时无法恢复时重建 iframe；
- 加载遮罩覆盖 iframe，但不改变布局尺寸；
- iframe 必须有描述性 `title`；
- React 不读取 iframe 内 DOM。

## 5. 数据查看器

使用 MUI X Data Grid：

- 默认作为右侧辅助面板；
- 数据来自用户主动发送的表格快照；
- 最大保留行数由 Bridge 限制；
- 支持排序、过滤、列显示和 CSV 下载；
- 大数据只传摘要或分页数据；
- 关闭面板不会销毁 Notebook 输出。

移动端使用全屏 Dialog。

## 6. 学习概览

使用 MUI X Charts 展示：

- 六个模块完成率；
- 最近学习章节；
- 已运行章节数量；
- 综合项目完成情况。

图表必须有文本摘要和可访问标签，不以图形作为唯一信息来源。

## 7. React Bits 使用

| 位置 | 组件 | 约束 |
|---|---|---|
| 首次进入工作区 | FadeContent | 仅一次 |
| 进度数字 | CountUp | 变化时触发 |
| 欢迎状态 | SpotlightCard | 只用于单一欢迎区域 |
| 环境初始化 | Stepper | 清晰展示加载阶段 |
| 运行成功 | ClickSpark | 用户主动操作后触发 |

课程树、菜单、Dialog 和 Notebook 不使用 React Bits。

## 8. 响应式

### 桌面

- 侧栏常驻；
- 数据查看器可并排；
- Notebook 最大化使用剩余空间。

### 平板

- 图标轨道常驻；
- 目录用 Drawer；
- 数据查看器覆盖 Notebook 右侧。

### 手机

- Notebook 全宽；
- 目录和数据均使用全屏或近全屏 Dialog；
- 不显示永久侧栏；
- 工具栏不得换行；
- 横向滚动只发生在工具栏或数据表内部。

## 9. 错误边界

分为三层：

1. 应用错误边界：React 渲染错误；
2. RuntimeFrame 错误边界：iframe 无法加载；
3. Notebook 运行错误：由 JupyterLite 单元格输出处理。

三类错误不得使用同一条模糊文案。

## 10. 禁止模式

- Card 嵌套 Card；
- 每个章节一个浮动卡片；
- React 顶栏叠加 JupyterLite 顶栏；
- 在 Tailwind 中使用 `!` 覆盖 MUI；
- 通过轮询 DOM 获取 Notebook 状态；
- 把运行时对象放入 Zustand；
- 用 React Bits 替换基本导航组件。
