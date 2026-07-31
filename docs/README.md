# Python Data Studio 设计档案

版本：1.0  
状态：已确认，待实现  
更新日期：2026-07-25

## 项目定位

Python Data Studio 是面向 Python 数据分析初学者的浏览器课程工作台。产品把课程导航、学习进度、数据查看与可运行 Notebook 组织在一个稳定界面中。

系统采用“双层设计系统”和“双运行时策略”：

1. React 工作台负责课程、路由、状态和辅助工具；
2. 浏览器版使用 JupyterLite/Pyodide，桌面版规划使用本地 CPython/Jupyter Server；
3. 两种运行时通过统一 Runtime Adapter 接入 React 工作区；
4. 两层共享设计令牌，通过正式 Bridge 或 Jupyter 协议通信，不互相操作 DOM。

## 核心约束

- 保留 `notebooks/` 中的全部课程内容；
- 首期不引入远程 Python 服务；桌面版允许由 Tauri 管理本地 Jupyter Server；
- 必须使用 React、TypeScript、Tailwind CSS、MUI Core、MUI X、React Bits 和 Zustand；
- 浏览器版 Notebook 使用 JupyterLite 与 Pyodide 运行；桌面版 Notebook 使用本地 CPython Runtime；
- 外层应用不得通过 CSS 或 DOM 查询修改 JupyterLite 内部结构；
- Notebook 美化必须由正式 JupyterLite/JupyterLab 主题扩展完成；
- 第一章保持纯阅读模式，不引入代码；
- 所有关键工作流必须支持键盘、移动端和减少动画偏好。

## 文档索引

| 文档 | 作用 |
|---|---|
| [PRODUCT.md](./PRODUCT.md) | 产品目标、用户、范围与成功指标 |
| [INFORMATION_ARCHITECTURE.md](./INFORMATION_ARCHITECTURE.md) | 页面、路由、课程结构和响应式布局 |
| [TECH_STACK.md](./TECH_STACK.md) | 技术栈、职责边界与依赖原则 |
| [DESIGN_TOKENS.md](./DESIGN_TOKENS.md) | 色彩、字体、尺寸、状态和主题同步 |
| [APP_SHELL.md](./APP_SHELL.md) | React 工作台、课程侧栏和 MUI X 面板 |
| [NOTEBOOK_THEME.md](./NOTEBOOK_THEME.md) | Notebook 画布、单元格、输出和工具栏 |
| [STATE_MODEL.md](./STATE_MODEL.md) | Zustand 状态模型、持久化与动作 |
| [RUNTIME_BRIDGE.md](./RUNTIME_BRIDGE.md) | React 与 JupyterLite 的通信协议 |
| [LOCAL_RUNTIME_UPGRADE_PLAN.md](./LOCAL_RUNTIME_UPGRADE_PLAN.md) | 本地 CPython/Jupyter Server、桌面打包与双运行时迁移方案 |
| [INTERACTIONS.md](./INTERACTIONS.md) | React Bits 使用范围和交互动效 |
| [ACCESSIBILITY.md](./ACCESSIBILITY.md) | 键盘、焦点、语义、对比度与减少动画 |
| [QA_CHECKLIST.md](./QA_CHECKLIST.md) | 功能、视觉、运行时和发布验收 |
| [ADR-001](./ADR/001-runtime-isolation.md) | iframe 运行时隔离决策 |
| [ADR-002](./ADR/002-theme-extension.md) | Notebook 主题扩展决策 |

## 推荐阅读顺序

1. 产品与信息架构；
2. 技术栈与设计令牌；
3. 应用外壳与 Notebook 主题；
4. 状态模型、Runtime Bridge 与本地运行时迁移方案；
5. 动效、无障碍与 QA；
6. ADR。

## 实现门禁

开始实现前，必须完成以下检查：

- 所有页面和状态均能映射到本档案；
- 共享设计令牌拥有唯一数据源；
- JupyterLite 主题扩展和 Bridge 有独立包边界；
- 不存在“先写全局 CSS 再修冲突”的实施路径；
- MUI X 和 React Bits 的使用位置已明确；
- Notebook 原始文件与用户工作副本的生命周期已明确。
- 浏览器版和桌面版的 Runtime Adapter 边界已明确；
- 本地 Python Runtime 的版本、资源路径和升级策略已明确。
