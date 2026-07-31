# ADR 002：通过正式主题扩展美化 Notebook

状态：接受  
日期：2026-07-25

## 背景

Notebook 区域需要与课程工作台拥有一致视觉，同时保留 JupyterLite 的编辑、执行、输出和快捷键能力。

直接从外层页面覆盖 Jupyter CSS 会破坏隔离边界；在 Runtime 内注入一次性脚本和 DOM 控件同样依赖内部实现细节。

## 决策

创建独立 `jupyterlite-course-theme` 包：

- 使用 JupyterLab `IThemeManager` 注册主题；
- 使用共享设计令牌生成主题 CSS；
- 映射 JupyterLab `--jp-*` 变量；
- 仅在主题包中维护 Notebook、Cell、CodeMirror 和 Output 样式；
- 使用自动化截图覆盖关键状态。

创建独立 `jupyterlite-course-bridge` 包：

- 通过正式 JupyterLab services 和 commands 获取状态；
- 不通过模拟点击或 DOM 轮询执行命令；
- 将业务事件发送给外层 React。

## 原因

- 符合 JupyterLab 主题机制；
- 可以随 Runtime 一起构建和版本化；
- 样式与行为插件边界清晰；
- 共享令牌保证 React 与 Notebook 一致；
- 允许独立测试浅色、深色、代码和输出。

## 后果

### 正面

- Notebook 区域成为正式设计系统的一部分；
- 不需要外层 CSS 高优先级覆盖；
- 主题可独立启用和回退；
- Jupyter 升级影响集中在两个扩展包。

### 负面

- 需要维护 JupyterLab 扩展工具链；
- 部分单元格细节仍需使用 Jupyter 稳定语义类；
- 主题升级需要视觉回归测试；
- React Bits 不能直接用于 Notebook 内部。

## 允许的样式方式

- JupyterLab 主题变量；
- 稳定公开语义类；
- CodeMirror 正式主题 API；
- 扩展自身创建并拥有的 DOM；
- JupyterLab commands、tracker 和 services。

## 禁止的样式方式

- 外层 React 注入 CSS；
- 随机 ID；
- `nth-child` 定位主结构；
- MutationObserver 反复装饰单元格；
- 模拟鼠标点击调用命令；
- 全局 `!important` 作为主要覆盖策略。

## 回退

若课程主题扩展加载失败：

1. 回退到 JupyterLab Light Theme；
2. 保留 Notebook 全部功能；
3. 向 Shell 发送 `theme:load-failed`；
4. 显示非阻塞错误提示；
5. 不尝试注入临时 CSS。

## 参考

- [JupyterLab light theme extension](https://github.com/jupyterlab/jupyterlab/tree/main/packages/theme-light-extension)
- [JupyterLab theme variables](https://github.com/jupyterlab/jupyterlab/blob/main/packages/theme-light-extension/style/variables.css)
- [JupyterLite frontend extension guide](https://github.com/jupyterlite/jupyterlite/blob/main/docs/howto/extensions/frontend.md)
