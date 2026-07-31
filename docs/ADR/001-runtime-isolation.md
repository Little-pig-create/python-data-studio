# ADR 001：使用同源 iframe 隔离 Notebook 运行时

状态：接受  
日期：2026-07-25

## 背景

React 工作台使用 Tailwind、MUI、MUI X 和 React Bits。JupyterLite 使用 JupyterLab、Lumino、CodeMirror 和自己的主题系统。

此前将两套系统放在同一个 DOM 中，并通过高优先级 CSS 隐藏或重排 JupyterLab 区域，导致：

- 顶栏与工具栏重叠；
- 菜单 z-index 冲突；
- 命令面板无法可靠关闭；
- Lumino 布局和虚拟滚动出现异常；
- React 与 Jupyter 同时控制相同区域；
- 每次升级都需要重新修补内部选择器。

## 决策

JupyterLite Notebook 运行在同源 iframe 中。

React 工作台负责 iframe 外部课程体验；JupyterLite 负责 iframe 内部 Notebook。两者只通过版本化 Runtime Bridge 通信。

## 原因

- CSS 和布局天然隔离；
- 键盘和焦点边界更清晰；
- JupyterLite 可以独立升级和构建；
- 主题由 JupyterLite 扩展控制；
- React 无需依赖 Jupyter 内部 DOM；
- 同源部署允许安全校验后的消息通信。

## 后果

### 正面

- 消除全局 CSS 冲突；
- 降低 Jupyter 升级风险；
- Notebook 运行时可独立测试；
- 应用状态与内核状态通过明确协议同步。

### 负面

- 需要实现和维护 Runtime Bridge；
- 跨 iframe 焦点和快捷键需要明确规则；
- 自动化测试需要覆盖两个上下文；
- 外层不能直接使用 Jupyter 内部 React 组件。

## 被拒绝方案

### 同 DOM 覆盖 JupyterLab

已验证维护成本和回归风险过高。

### 从零实现 Notebook 编辑器

需要重新实现单元格模型、CodeMirror、输出、内核、保存和扩展系统，超出项目目标。

### 远程 Jupyter Server

需要后端、账号、资源管理和安全边界，与首期纯静态部署目标冲突。

## 约束

- React 不得读取 iframe DOM；
- Bridge 必须校验 origin、source 和协议版本；
- iframe 与 Shell 必须同源部署；
- Notebook 美化在 Runtime 内完成；
- 所有 Bridge 命令和事件必须写入协议文档。

## 参考

- [JupyterLite frontend extensions](https://github.com/jupyterlite/jupyterlite/blob/main/docs/howto/extensions/frontend.md)
- [JupyterLite repository](https://github.com/jupyterlite/jupyterlite)
