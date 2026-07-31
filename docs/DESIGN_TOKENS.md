# 设计令牌

## 1. 令牌架构

设计令牌只有一个数据源：

```text
tokens.json
├─ generate tailwind-theme.css
├─ generate mui-theme.ts
└─ generate jupyter-theme.css
```

禁止在三个系统中分别维护相似颜色。

## 2. 色彩

### 基础表面

| Token | 值 | 用途 |
|---|---|---|
| `canvas` | `#F2F4F7` | 应用与 Notebook 外部工作区 |
| `surface` | `#FFFFFF` | 菜单、抽屉、Notebook 纸面 |
| `surface-subtle` | `#F8F9FB` | 侧栏和次级区域 |
| `code-surface` | `#F7F8FA` | 代码编辑器 |
| `output-surface` | `#FCFCFD` | 输出背景 |

### 文字与边框

| Token | 值 |
|---|---|
| `ink` | `#1B2430` |
| `ink-secondary` | `#667085` |
| `ink-tertiary` | `#8A94A3` |
| `border` | `#D9DEE7` |
| `border-strong` | `#B8C0CC` |

### 状态

| Token | 值 | 用途 |
|---|---|---|
| `accent` | `#2563EB` | 选择、主操作、运行 |
| `accent-soft` | `#EAF2FF` | 选中背景 |
| `success` | `#16865C` | 就绪、执行成功 |
| `success-soft` | `#EAF7F1` | 成功提示 |
| `warning` | `#C77908` | 加载、排队、未保存 |
| `warning-soft` | `#FFF6E5` | 警告提示 |
| `error` | `#C53E4A` | 错误、失败 |
| `error-soft` | `#FFF1F2` | 错误输出 |

状态不能只依赖颜色，必须同时提供图标、文字或形状。

## 3. 字体

| 用途 | 字体 |
|---|---|
| 中文正文 | `"Noto Sans SC"` |
| 英文和界面 | `"IBM Plex Sans"` |
| 代码 | `"JetBrains Mono"` |

字体回退：

```text
UI: "IBM Plex Sans", "Noto Sans SC", "Microsoft YaHei", sans-serif
Code: "JetBrains Mono", "Cascadia Code", Consolas, monospace
```

## 4. 字号与行高

| 用途 | 字号 | 行高 |
|---|---:|---:|
| 页面标题 | 28px | 1.35 |
| Notebook H1 | 30px | 1.35 |
| Notebook H2 | 22px | 1.45 |
| Notebook H3 | 18px | 1.55 |
| 正文 | 16px | 1.75 |
| UI 正文 | 14px | 1.5 |
| 辅助文字 | 12px | 1.5 |
| 代码 | 14px | 1.65 |

字间距统一为 `0`。字号不随视口宽度连续缩放。

## 5. 间距

基础单位为 `4px`。

```text
space-1   4px
space-2   8px
space-3   12px
space-4   16px
space-5   20px
space-6   24px
space-8   32px
space-10  40px
space-12  48px
space-16  64px
space-24  96px
```

## 6. 尺寸

| 元素 | 尺寸 |
|---|---|
| 桌面侧栏 | 304px |
| 紧凑侧栏 | 264px |
| 图标轨道 | 72px |
| Notebook 工具栏 | 48px |
| Notebook 内容宽度 | 左对齐，铺满可用工作区 |
| 数据查看器默认宽度 | 420px |
| 最小点击区域 | 44px |
| 代码运行区 | 44px |

## 7. 圆角

| Token | 值 | 用途 |
|---|---:|---|
| `radius-sm` | 4px | 图标按钮、代码内控件 |
| `radius-md` | 6px | 代码单元格、输入框 |
| `radius-lg` | 8px | 菜单、Dialog、Drawer |

不使用胶囊形状承载普通文字命令。胶囊仅用于状态 Chip 和明确的分段选择器。

## 8. 阴影

| Token | 值 |
|---|---|
| `shadow-menu` | `0 10px 30px rgba(31, 47, 67, 0.16)` |
| `shadow-dialog` | `0 18px 48px rgba(31, 47, 67, 0.20)` |
| `shadow-focus` | `0 0 0 3px rgba(37, 99, 235, 0.18)` |

Notebook 单元格默认无阴影。

## 9. 动效

| Token | 值 |
|---|---:|
| `duration-fast` | 120ms |
| `duration-normal` | 180ms |
| `duration-slow` | 260ms |
| `ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` |

当用户启用减少动画时：

- 所有位移动画变为淡入淡出；
- 持续动画停止；
- 加载状态保留无位移的进度提示；
- ClickSpark 和数字滚动关闭。

## 10. 深色主题

首期只要求浅色主题达到发布质量。深色主题的令牌结构必须预留，但不得在浅色主题尚未通过 QA 前投入实现。
