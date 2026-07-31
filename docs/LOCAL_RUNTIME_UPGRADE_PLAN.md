# Python 数据工作台本地运行时完善方案

## 1. 文档目的

本文档用于指导“Python 数据工作台”从当前的浏览器端 JupyterLite/Pyodide 运行模式，逐步完善为可下载、可离线使用、支持真实 CPython 的 Tauri 桌面应用。

本文档只描述架构、迁移顺序、工程边界和验收标准，不要求立即修改现有代码。

## 2. 当前项目状态

### 2.1 已具备能力

- React + Vite 应用外壳。
- Tauri 桌面应用配置和 Windows 打包流程。
- 课程目录、章节、用户角色、学习进度和数据集管理。
- Notebook 内容的读取、编辑、运行结果展示和草稿保存。
- 课程 Notebook 和大量数据集资源。
- JupyterLite/Pyodide 运行时构建脚本。
- JupyterLab 主题扩展和 Runtime Bridge 原型。

### 2.2 当前真实运行路径

当前课程工作区的主要执行路径是：

```text
NotebookWorkspace.jsx
  -> notebookRuntime.js
  -> thebe-core / ThebeServer
  -> JupyterLite/Pyodide Kernel
```

`notebookRuntime.js` 中存在 Pyodide 专用逻辑，例如：

- `pyodide_js.loadPackage`；
- `piplite.install`；
- 浏览器数据集 URL 转换；
- 浏览器端字体和数据文件下载。

`main.jsx` 中还保留了基于 JupyterLite iframe 的 `NotebookFrame` 和 `notebookBridge.js`。这条链路与当前自定义 Notebook 工作区并行存在，后续需要明确是否继续保留，避免两套运行时同时维护。

### 2.3 当前缺口

- Tauri Rust 端没有启动、监控和关闭本地 Python/Jupyter Server 的能力。
- `runtime/requirements.txt` 只覆盖 JupyterLite，不是完整 CPython 运行环境。
- 没有桌面版运行时选择器。
- Notebook 代码中的 `/datasets/...`、浏览器 origin 和本地文件路径尚未统一。
- 没有正式的 Python Runtime 安装、升级、修复和诊断流程。
- 运行时、课程内容、用户工作区和缓存目录边界还不够清晰。

## 3. 目标架构

桌面版建议采用双运行时架构：

```text
Tauri Desktop
├── React + TypeScript
│   ├── 课程与用户界面
│   ├── Notebook 编辑器
│   └── Runtime Adapter
├── Rust Core
│   ├── 启动和关闭 Python Runtime
│   ├── 端口和 Token 管理
│   ├── 工作区路径管理
│   ├── 运行时诊断
│   └── 打包资源定位
├── Local Jupyter Server
└── CPython Kernel
```

浏览器版继续使用：

```text
React + JupyterLite + Pyodide
```

运行时选择原则：

| 场景 | 默认运行时 | 备用运行时 |
|---|---|---|
| 浏览器访问 | JupyterLite/Pyodide | 无 |
| Tauri 桌面版 | 本地 CPython/Jupyter Server | JupyterLite |
| 本地 Python 环境损坏 | JupyterLite | 引导修复 Python Runtime |
| 需要完整科学计算包 | 本地 CPython | 不保证 Pyodide 兼容 |

## 4. 关键设计决策

### 4.1 JupyterHub 不进入本地桌面版

单机下载应用不需要 JupyterHub。JupyterHub 适合服务器上的多用户环境，而桌面版只需要：

- 一个本地 Jupyter Server；
- 一个或多个本地 Kernel；
- Rust 管理进程生命周期；
- 前端通过 Jupyter 协议访问服务。

### 4.2 Rust 管理进程，前端管理交互

Rust 负责：

- 查找打包后的 Python Runtime；
- 分配随机本地端口；
- 生成本次启动 Token；
- 启动 Jupyter Server；
- 检查服务是否就绪；
- 应用退出时回收进程；
- 将服务状态传递给前端。

前端负责：

- 创建和关闭 Kernel；
- 发送代码；
- 接收 stdout、stderr、异常和富媒体输出；
- 展示执行状态；
- 保存 Notebook 文档。

推荐使用 Jupyter 协议客户端，而不是在 Rust 中重新实现 Kernel 消息协议。

### 4.3 运行时适配器

前端不应在课程组件中直接判断 Pyodide 或 Jupyter Server。建议抽象为统一接口：

```text
RuntimeAdapter
├── createRuntime(notebookId)
├── executeCell(source)
├── interrupt()
├── restart()
├── getStatus()
├── dispose()
└── capabilities
```

实现：

```text
JupyterLiteRuntimeAdapter
NativeJupyterRuntimeAdapter
```

`NotebookWorkspace` 只依赖 `RuntimeAdapter`，不依赖具体运行时。

### 4.4 暂不强制替换当前编辑器

当前工作区已经有自定义单元格、Markdown、输出和状态管理。迁移到本地 Jupyter Server 时，优先复用当前编辑器和业务界面，不要同时引入 Monaco、JupyterLab 页面和新的 Notebook 状态模型。

Monaco 可以作为后续编辑器升级选项，但它不是接入本地 Kernel 的前置条件。

## 5. 运行时职责边界

### React 层

负责：

- 课程页面；
- 单元格编辑；
- 输出渲染；
- 运行按钮、停止按钮和重启按钮；
- 运行时状态展示；
- 学习进度记录；
- Notebook 草稿和下载。

不负责：

- 启动操作系统进程；
- 查找 Python 可执行文件；
- 管理端口；
- 直接读取桌面安装目录；
- 假设某个固定 Python 版本存在。

### Rust 层

负责：

- Runtime 启动、停止和状态查询；
- 资源目录定位；
- 用户工作区定位；
- Python 环境诊断；
- 日志和崩溃信息收集；
- 应用退出时清理子进程。

不负责：

- 课程业务；
- 直接渲染 Notebook；
- 解析 Markdown 或富媒体输出；
- 在 Rust 中维护另一套 Notebook 数据模型。

### Python/Jupyter Server 层

负责：

- Session 和 Kernel；
- 代码执行；
- Kernel 中断和重启；
- Jupyter API 和 WebSocket；
- Notebook 协议兼容。

## 6. 本地目录规划

桌面应用安装资源和用户可写数据必须分开：

```text
安装目录/
├── Python Data Studio.exe
└── resources/
    ├── python-runtime/
    ├── datasets/
    ├── course/
    └── runtime-manifest.json

用户数据目录/
└── Python Data Studio/
    ├── workspace/
    ├── notebooks/
    ├── outputs/
    ├── cache/
    ├── logs/
    └── runtime-state.json
```

原则：

- 安装目录只读；
- 课程原始文件只读；
- 用户 Notebook、导出文件和运行输出写入用户数据目录；
- 不把用户数据写入 `src`、安装目录或临时目录；
- 不把大数据集复制到每个 Notebook 工作区。

## 7. 数据集路径策略

当前课程代码同时出现以下形式：

- `/datasets/file.csv`；
- `{window.location.origin}/datasets/file.csv`；
- `{base_url}/datasets/file.csv`；
- 本地临时路径。

迁移时应统一为运行时提供的数据集路径函数，例如：

```text
studio_dataset("titanic.csv")
```

运行时初始化时注入：

```text
PDS_DATASETS_DIR=<安装资源目录>/datasets
PDS_WORKSPACE_DIR=<用户数据目录>/workspace
```

对于已有课程内容，建议在 Runtime Adapter 中做兼容转换；新课程内容不要继续直接依赖浏览器 origin。

## 8. 本地 Jupyter Server 启动要求

本地服务必须满足：

- 只监听 `127.0.0.1`；
- 每次启动使用随机端口；
- 每次启动生成随机 Token；
- 禁止自动打开浏览器；
- 根目录指向用户工作区；
- 允许 Tauri 前端的本地来源访问；
- 输出日志进入应用日志目录；
- 启动后通过 `/api/status` 确认就绪；
- 应用退出时关闭 Kernel 和 Server。

前端不得把固定端口、固定 Token 或安装目录写死。

## 9. Python Runtime 内容

桌面版 Runtime 至少应包含：

```text
python
ipykernel
jupyter_server
jupyter_client
numpy
pandas
scipy
scikit-learn
matplotlib
seaborn
plotly
openpyxl
nbformat
```

版本必须锁定。不要在用户首次运行时默认联网执行大量 `pip install`，否则会造成：

- 首次启动不稳定；
- 网络依赖；
- 版本漂移；
- 课程结果不可复现。

推荐提供独立的 Runtime 构建脚本，生成：

```text
runtime-manifest.json
```

其中记录 Python 版本、包版本、构建日期和平台信息。

## 10. 迁移阶段

### 阶段 0：基线整理

目标：确认唯一主运行路径。

- 标记 `NotebookFrame`、JupyterLite iframe Bridge 和自定义 Notebook 工作区的关系；
- 明确浏览器版和桌面版的运行时策略；
- 锁定现有课程 Notebook 和数据集基线；
- 将当前桌面打包作为基线产物保存。

验收：

- 浏览器版可以打开和运行第 1、21、35、72、108 章；
- 桌面版可以正常启动、登录和打开课程；
- 迁移前后课程目录和学习进度不丢失。

### 阶段 1：运行时抽象

目标：让 `NotebookWorkspace` 不再直接绑定 Thebe/Pyodide。

- 定义统一 Runtime Adapter 接口；
- 把运行、停止、重启、状态和输出转换集中到适配器；
- 保留当前 JupyterLite 实现作为第一个适配器；
- 增加运行时能力标记，例如是否支持原生文件、是否支持安装包、是否支持完整 sklearn。

验收：

- 不改变用户界面，浏览器版仍能执行所有现有课程；
- `NotebookWorkspace` 不再出现 Pyodide 专用判断；
- 运行状态和错误格式在两种运行时中一致。

### 阶段 2：接入本地 Jupyter Server

目标：桌面版可以启动真实 CPython Kernel。

- Rust 增加 Runtime Manager；
- 增加端口、Token 和子进程状态管理；
- 增加本地服务就绪检查；
- 前端增加 Native Jupyter Runtime Adapter；
- 接入 Kernel WebSocket；
- 支持执行、输出、异常、中断、重启和关闭。

验收：

```python
import sys
print(sys.executable)
print(2 + 3)
```

输出应来自打包的 CPython，而不是 Pyodide。

### 阶段 3：课程和数据集适配

目标：现有 108 章课程可以在本地 CPython 中运行。

- 统一数据集路径；
- 检查 Windows 路径、中文路径和文件编码；
- 检查 Matplotlib 中文字体；
- 检查 Plotly HTML 输出；
- 检查 Excel 读写依赖；
- 检查 sklearn 模型保存和临时文件；
- 为每章建立最小运行验收样例。

验收：

- Python 基础、Pandas、Matplotlib、Plotly、综合项目和机器学习章节各抽取样例通过；
- 不依赖浏览器 `window`、`base_url` 或 `fetch`；
- 数据集路径在 Windows 安装包中有效。

### 阶段 4：桌面打包和恢复

目标：用户无需安装 Python、Node.js 或 Jupyter 即可使用。

- 将 Python Runtime 放入 Tauri resources；
- 首次启动建立用户数据目录；
- Runtime 缺失时显示可操作诊断；
- 支持日志导出；
- 支持运行时修复或重新安装；
- 验证干净 Windows 环境安装。

验收：

- 干净电脑安装后可启动；
- 断网状态可打开课程并运行代码；
- 关闭应用后没有残留 Python/Jupyter 进程；
- 用户工作区重启后仍然存在。

### 阶段 5：性能和产品化

- 首次启动时间和后续启动时间分开统计；
- Kernel 空闲回收；
- 大型 DataFrame 输出限制；
- 图片和 Plotly 输出大小限制；
- 运行日志分级；
- 课程内容和 Runtime 分开更新；
- 增加运行时诊断页面。

## 11. 安全边界

本地 Python 代码本质上拥有当前用户权限，因此本地运行时不能被描述为安全沙箱。

必须明确：

- 学生运行自己的代码时，代码可以访问用户可访问的文件；
- 不在环境变量中放置云密钥、数据库密码或发布凭据；
- 不自动执行来源不明的 Notebook；
- 打开外部 Notebook 时显示风险提示；
- 教师发布的代码也应被视为可执行代码；
- 如未来需要考试或不可信代码判题，应增加 Docker/虚拟机隔离服务，而不是复用本地 Kernel。

## 12. 监控和诊断

运行时诊断页面至少显示：

- Python 版本；
- Jupyter Server 版本；
- Kernel 名称和状态；
- 当前工作目录；
- 数据集目录；
- Runtime 包清单；
- 启动耗时；
- 最近一次错误；
- 日志目录位置。

错误应分成：

```text
Runtime 未找到
Runtime 启动失败
Jupyter Server 未就绪
Kernel 启动失败
Kernel 已断开
代码执行异常
课程数据文件缺失
```

不要把完整 Python 堆栈直接作为唯一用户提示，应同时提供可复制的诊断信息。

## 13. 测试矩阵

### 运行时测试

- 启动、停止和重复启动；
- 端口占用；
- Runtime 缺失；
- Token 错误；
- Kernel 重启；
- Kernel 中断；
- 应用异常退出后的残留进程；
- 多次切换章节。

### Notebook 测试

- 代码输出；
- stdout；
- 异常；
- Markdown；
- PNG/SVG；
- Plotly HTML；
- DataFrame 大输出；
- Notebook 草稿保存和恢复；
- 下载 `.ipynb`。

### 平台测试

- 浏览器开发模式；
- Tauri 开发模式；
- Windows 安装包；
- 无 Python 干净环境；
- 无网络环境；
- 中文用户目录；
- 中文 Notebook 和数据集路径。

## 14. 最终推荐结论

这个项目不需要推倒重来。推荐保留现有课程、用户系统、学习进度和 Notebook UI，按下面的方向完善：

```text
浏览器版：React + JupyterLite/Pyodide
桌面版：React + Tauri/Rust + 本地 Jupyter Server + CPython
共同层：课程、Notebook 数据模型、进度、数据集目录和输出渲染
```

最重要的工程动作是先建立 Runtime Adapter，再接入 Rust Runtime Manager。不要直接在 `NotebookWorkspace.jsx` 中加入大量 Tauri 判断，也不要让 JupyterLite 和本地 Jupyter Server 共用一套 Pyodide 专用代码。

## 15. 与当前目录的对应关系

迁移时建议保持以下职责边界：

| 当前路径 | 现有职责 | 迁移后的职责 |
|---|---|---|
| `src/NotebookWorkspace.jsx` | 课程 Notebook 工作区 | 只负责界面、单元格和学习进度 |
| `src/notebookRuntime.js` | Thebe/Pyodide 执行 | 保留为 JupyterLite Adapter，逐步拆分 |
| `src/notebookStore.js` | Notebook 文档状态 | 保留为共享文档状态层 |
| `src/notebookRepository.js` | IndexedDB 草稿 | 浏览器版继续使用，桌面版增加文件持久化策略 |
| `src/main.jsx` | 应用路由和外壳 | 增加桌面 Runtime 初始化入口 |
| `src-tauri/src/lib.rs` | Tauri 启动入口 | 增加 Runtime Manager 和命令注册 |
| `runtime/` | JupyterLite 构建和扩展 | 继续服务浏览器版 |
| `datasets/` | 源数据集 | 作为桌面资源和浏览器静态资源的共同来源 |
| `notebooks/` | 源 Notebook | 作为课程构建输入，不直接作为用户工作副本 |
| `public/runtime/` | JupyterLite 构建产物 | 仅作为浏览器版构建产物 |

当前 `main.jsx` 中的 `NotebookFrame`、`notebookBridge.js` 和 JupyterLite 扩展应先标注为“iframe 运行时链路”。在确认没有页面继续使用它们后，再决定删除、保留或将其改为独立浏览器模式入口。

## 16. Runtime API 契约

React 层只需要面对统一的运行时对象，不应知道底层是 Pyodide 还是 CPython。

### 16.1 启动结果

```text
RuntimeInfo
├── kind: "jupyterlite" | "native"
├── status: "starting" | "ready" | "error"
├── kernelName: string
├── pythonVersion?: string
├── serverUrl?: string
├── token?: string
├── workspacePath?: string
└── capabilities
    ├── nativeFileSystem: boolean
    ├── packageInstall: boolean
    ├── interrupt: boolean
    ├── richOutput: boolean
    └── offline: boolean
```

Token 只在内存中保存，不写入 Notebook、学习进度或普通日志。

### 16.2 生命周期操作

```text
start(notebookId)
ready()
execute(source, options)
interrupt()
restart()
save()
dispose()
```

执行结果统一转换为 Notebook 输出格式：

```text
ExecutionResult
├── executionCount: number | null
├── outputs: NotebookOutput[]
├── status: "ok" | "error" | "interrupted"
├── durationMs: number
└── error?: RuntimeError
```

### 16.3 运行时错误

错误至少包含：

```text
RuntimeError
├── code: string
├── title: string
├── message: string
├── detail?: string
├── recoverable: boolean
└── action?: "retry" | "restart" | "repair" | "openLogs"
```

建议错误代码固定化，例如：

```text
RUNTIME_NOT_FOUND
RUNTIME_START_FAILED
SERVER_NOT_READY
KERNEL_START_FAILED
KERNEL_DISCONNECTED
EXECUTION_FAILED
DATASET_NOT_FOUND
```

## 17. 本地运行时状态机

```text
idle
  -> starting
  -> server-ready
  -> kernel-starting
  -> ready
  -> busy
  -> ready
```

异常状态：

```text
starting       -> start-failed
server-ready   -> server-failed
kernel-starting -> kernel-failed
busy           -> interrupted
ready          -> disconnected
```

恢复规则：

- `start-failed`：允许重新启动一次，并显示日志入口；
- `server-failed`：先关闭残留进程，再重新启动；
- `kernel-failed`：只重启 Kernel，不重复创建应用窗口；
- `disconnected`：先尝试重新连接，失败后提示重启；
- `busy`：用户主动中断，不自动重放代码；
- 代码异常不等于 Kernel 异常，代码异常后 Kernel 仍应保持可用。

## 18. Notebook 保存策略

建议把三类数据分开：

### 课程原稿

只读，随应用版本或课程包发布：

```text
course/chapter-1.ipynb
```

### 用户工作副本

可编辑，保存在用户数据目录：

```text
workspace/course/chapter-1.ipynb
```

### 浏览器临时草稿

使用 IndexedDB，保留当前浏览器版行为。

打开课程时按以下顺序加载：

```text
用户工作副本
  -> 版本兼容的自动草稿
  -> 课程原稿
```

课程内容版本变化时，不要静默覆盖用户文件。应提供：

- 使用新版课程原稿；
- 保留我的工作副本；
- 导出差异；
- 恢复课程原稿。

## 19. Python Runtime 构建和发布

### 19.1 构建输入

构建输入应集中管理：

```text
runtime/native/
├── requirements.lock
├── build configuration
├── runtime manifest template
└── README
```

不建议使用没有锁定版本的 `requirements.txt` 直接生成生产 Runtime。

### 19.2 构建产物

每个平台至少生成：

```text
python-runtime-<platform>-<arch>.zip
runtime-manifest.json
checksums.txt
```

Manifest 应包含：

- Python 版本；
- 操作系统和架构；
- 每个包的名称和版本；
- 构建工具版本；
- 资源包校验值；
- 最低应用版本。

### 19.3 应用版本和 Runtime 版本

应用和 Runtime 分开编号：

```text
应用版本：0.2.0
Runtime 版本：py312-data-2026.08.01
课程包版本：course-14
```

应用升级时检查 Runtime manifest：

- 兼容：直接使用；
- 缺少：引导安装；
- 损坏：引导修复；
- 不兼容：禁止启动 Kernel，并给出升级提示。

## 20. 桌面版启动顺序

推荐的启动顺序如下：

```text
Tauri 创建窗口
  -> React 加载应用外壳
  -> Rust 检查 Runtime manifest
  -> Rust 检查 Python 可执行文件
  -> Rust 启动 Jupyter Server
  -> Rust 等待 /api/status
  -> React 获取 RuntimeInfo
  -> React 启动 Kernel
  -> NotebookWorkspace 进入 ready
```

启动失败时，页面应停留在可操作的诊断界面，而不是出现空白 Notebook：

```text
状态
原因
日志位置
重新启动
打开数据目录
导出诊断包
```

## 21. Windows 发行验收

发布前至少在一台没有开发环境的 Windows 设备上测试：

- 没有 Node.js；
- 没有 Python；
- 没有 Jupyter；
- 用户目录包含中文；
- 安装路径包含空格；
- 无管理员权限运行；
- 没有网络；
- 系统已有其他 Python 版本；
- 端口范围内存在占用端口。

必须确认：

- 应用不依赖系统 Python；
- 应用不依赖开发机的当前目录；
- 资源路径不使用固定盘符；
- Jupyter Server 只监听本机；
- 应用关闭后没有残留 Python 进程；
- 用户创建的 Notebook 不会被更新包覆盖；
- 升级失败可以回滚到上一个可用 Runtime。

## 22. 文档维护规则

当运行时方案发生变化时，需要同步更新：

1. 本文档：架构、迁移阶段和验收标准；
2. `docs/TECH_STACK.md`：技术职责和依赖方向；
3. `docs/RUNTIME_BRIDGE.md`：消息协议和生命周期；
4. `docs/STATE_MODEL.md`：运行时状态和持久化边界；
5. `docs/QA_CHECKLIST.md`：实际测试项；
6. `README.md`：开发、构建和发布入口。

每次改变以下内容，都应增加一条 ADR：

- 更换 Kernel 或 Jupyter Server 方案；
- 改变用户工作区路径；
- 改变浏览器版和桌面版的运行时优先级；
- 引入 Docker、虚拟机或远程执行；
- 改变 Runtime 更新和回滚方式。

## 23. 推荐的近期执行顺序

在正式写代码前，按以下顺序确认设计：

1. 确认桌面版默认使用本地 CPython，浏览器版继续使用 JupyterLite；
2. 确认当前自定义 Notebook 编辑器继续保留；
3. 确认用户 Notebook 的真实保存目录；
4. 确认 Python 包清单和版本锁定方式；
5. 确认数据集路径兼容策略；
6. 确认 Runtime 缺失、损坏和升级时的用户体验；
7. 再开始 Runtime Adapter 和 Rust Runtime Manager 的实现。

