# Runtime Bridge 协议

## 1. 目标

Runtime Bridge 是 React 工作台与 JupyterLite 之间唯一的业务通信通道。

桌面自定义工作区不使用 iframe Bridge：`src/notebookRuntime.js` 通过
`@jupyterlab/services` 连接 Rust 启动的本地 Jupyter Server。两条链路共享
Notebook 输出模型和工作区 UI，但不共享 Token；Native Token 只存在于当前
运行时对象和 ServerConnection 内存中。

它解决：

- 打开 Notebook；
- 获取保存和运行状态；
- 同步主题与编辑器偏好；
- 请求运行、停止、保存和下载；
- 获取 Notebook 标题目录；
- 获取受限的数据表快照。

它不允许外层应用直接访问 JupyterLite DOM。

## 2. 组成

```text
src/notebookBridge.js
        ⇅ same-origin postMessage
runtime/extensions/jupyterlite-course-bridge
```

协议首期以稳定的 JSON 信封实现；React 外壳和 JupyterLab 扩展各自校验版本、来源和消息来源窗口。

## 3. 消息信封

每条消息包含：

```text
protocolVersion
source
type
requestId
timestamp
payload
```

约束：

- `protocolVersion` 首期为 `1`；
- `source` 只能是 `course-shell` 或 `jupyter-runtime`；
- 请求和响应共享 `requestId`；
- payload 必须可结构化克隆；
- 不传递函数、DOM、Window 或内核对象。

## 4. 握手

```text
React iframe loaded
  -> bridge:hello
JupyterLite extension ready
  -> bridge:ready
React validates version
  -> bridge:ack
```

在 `bridge:ready` 前：

- 所有命令进入有界队列；
- 队列最多保留最近 20 条；
- 打开 Notebook 只保留最后一次请求；
- 超时后进入可重试错误状态。

## 5. Shell 到 Runtime 命令

| 类型 | Payload |
|---|---|
| `notebook:open` | `path` |
| `notebook:save` | 无 |
| `notebook:download` | 无 |
| `notebook:restore` | `path`, `confirmationToken` |
| `notebook:scroll-to-heading` | `headingId` |
| `cell:run-selected` | 无 |
| `cell:run-all` | 无 |
| `cell:interrupt` | 无 |
| `kernel:restart` | 无 |
| `theme:set` | `theme` |
| `preferences:set` | `editorFontSize`, `wrapCode`, `showLineNumbers` |
| `data:request-preview` | `variableName`, `maxRows`, `maxColumns` |

## 6. Runtime 到 Shell 事件

| 类型 | Payload |
|---|---|
| `notebook:opened` | `path`, `title` |
| `notebook:dirty-changed` | `isDirty` |
| `notebook:save-state` | `state`, `error?` |
| `notebook:outline-changed` | `headings` |
| `cell:selected` | `cellId`, `cellType` |
| `execution:started` | `executionId`, `cellId?` |
| `execution:completed` | `executionId`, `durationMs` |
| `execution:failed` | `executionId`, `summary` |
| `kernel:state-changed` | `state`, `kernelName` |
| `theme:changed` | `theme` |
| `data:preview` | `columns`, `rows`, `truncated` |
| `bridge:error` | `code`, `message`, `requestId?` |

## 7. 数据预览限制

为避免把大型 DataFrame 放入 Zustand 或 postMessage：

- 默认最多 `200` 行；
- 默认最多 `50` 列；
- 字符串单元格最大长度受限；
- 超出限制时返回 `truncated: true`；
- 二进制数据不通过 Bridge 发送；
- Data Grid 只保存当前快照。

## 8. 安全

- Shell 和 Runtime 必须同源；
- 接收消息时校验 `event.origin`；
- 校验 `event.source === iframe.contentWindow`；
- 校验协议版本和消息结构；
- 不接受任意 Python 代码字符串命令；
- 恢复原始 Notebook 需要确认 token；
- 错误详情不得包含浏览器存储中的其他文件内容。

## 9. 超时与重试

| 操作 | 超时 |
|---|---:|
| Bridge 握手 | 10s |
| 打开 Notebook | 20s |
| 保存 | 10s |
| 下载准备 | 10s |
| 主题同步 | 3s |
| 数据预览 | 10s |

代码执行不使用固定超时，由用户主动中断。

请求重试原则：

- 幂等操作可以重试一次；
- 运行单元格不得自动重试；
- 恢复原始 Notebook 不得自动重试；
- 重启内核必须由用户再次确认。

## 10. 生命周期

### 打开章节

```text
openChapter
-> update route
-> notebook:open
-> notebook:opened
-> notebookStore.markOpened
-> update recent chapters
```

### 运行代码

```text
cell:run-selected
-> execution:started
-> runtimeStore.busy
-> execution:completed | execution:failed
-> runtimeStore.ready | error
```

### 保存

```text
notebook:save
-> save-state saving
-> save-state saved | failed
```

## 11. 禁止模式

## 12. Native Adapter 边界

```text
NotebookWorkspace
  -> RuntimeAdapter.execute / interrupt / restart / dispose
  -> @jupyterlab/services SessionManager
  -> local Jupyter Server / Kernel WebSocket
```

Native Adapter 启动前从 Tauri 获取随机端口和 Token，连接前等待 `/api/status`。
课程代码中的 `/datasets/name` 由 Adapter 转换为 `studio_dataset("name")`，并
由 `PDS_DATASETS_DIR` 解析到只读资源目录。Native 失败时可切换到 JupyterLite，
代码执行不会自动重放。

- `document.querySelector` 访问 iframe 内容；
- 定时轮询单元格；
- 通过模拟鼠标点击调用 Jupyter 命令；
- 使用不受控的字符串事件名；
- 将完整 Notebook JSON 放入 Zustand；
- 在 Bridge 中实现 UI；
- 用“乐观运行成功”代替真实内核事件。
