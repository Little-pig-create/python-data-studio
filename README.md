# Python 数据工作台

> 面向数据分析教学的浏览器端 Python 学习平台。学生在浏览器中直接运行 Python，无需本地安装任何环境。

---

## 技术栈

- **前端**：React 18 + Vite + MUI + Zustand
- **Python 运行时**：JupyterLite（WebAssembly，零服务器）/ Thebe-lite（章节 72–75）
- **存储**：IndexedDB（Notebook 草稿 + 自定义内容）+ localStorage（进度、配置）
- **认证**：内置角色系统（学生 / 教师 / 学校管理员）

---

## 快速启动

```bash
npm install
npm run dev
```

浏览器打开 `http://127.0.0.1:5173`，默认账号见 `src/AuthProvider.jsx`。

---

## 课程内容管理

### 目录结构

```
public/course/
  catalog.json              ← 课程目录（由脚本生成，勿手动编辑）
  course-chapter-1.ipynb
  course-chapter-2.ipynb
  ...
  course-chapter-108.ipynb
```

### 更新 / 替换课程 Notebook

1. 将 `.ipynb` 文件放入 `public/course/`，文件名格式：`course-chapter-{n}.ipynb`
2. 运行同步脚本，重新生成目录：

```bash
npm run sync:catalog
```

脚本会扫描目录中实际存在的 `.ipynb` 文件，根据文件名推断章节号，从 `src/data.js` 查找标题/模块/标签，生成新的 `catalog.json`。

### Notebook 元数据覆盖（可选）

在 `.ipynb` 文件的顶层 `metadata` 中添加以下字段，脚本会优先使用这些值（兜底 `src/data.js`）：

```json
{
  "metadata": {
    "chapter_title": "自定义标题",
    "chapter_module": "pandas",
    "chapter_kind": "lesson",
    "estimated_minutes": 60,
    "tags": ["数据清洗", "实战"],
    "difficulty": "进阶",
    "description": "本章简介..."
  }
}
```

| 字段 | 说明 | 默认值 |
|------|------|--------|
| `chapter_title` | 章节标题 | `data.js` 中对应章节名 |
| `chapter_module` | 所属模块 ID | 按章节号自动推断 |
| `chapter_kind` | `"lesson"` 或 `"project"` | `"lesson"` |
| `estimated_minutes` | 预计学习时间（分钟） | 45 |
| `tags` | 标签数组 | `data.js` 中的默认标签 |
| `difficulty` | 难度标注 | 无 |
| `description` | 章节简介 | 无 |

### 预览变更（不写入）

```bash
node scripts/sync-catalog.mjs --dry-run
```

---

## 可用命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器（127.0.0.1:5173） |
| `npm run build` | 生产构建 |
| `npm run preview` | 预览生产构建 |
| `npm run sync:catalog` | 扫描 `public/course/` 重新生成 `catalog.json` |
| `npm run build:course` | 旧流程：从 mjs 脚本生成 Notebook（已保留，一般不再使用） |

---

## 项目结构

```
src/
  main.jsx                  ← 应用入口：路由、侧边栏、进度逻辑
  NotebookWorkspace.jsx     ← Notebook 阅读/运行工作区
  NotebookContentCenter.jsx ← 内容管理界面（上传自定义 Notebook）
  notebookStore.js          ← Notebook 状态管理（单元格、草稿）
  notebookRepository.js     ← IndexedDB 存取封装
  courseCatalog.js          ← catalog.json 加载 + 自定义章节合并
  store.js                  ← 全局应用状态（进度、展开模块、侧边栏模式）
  data.js                   ← 模块定义 + 108 章节元数据表
  AuthProvider.jsx          ← 认证与角色（学生/教师/管理员）
  StudentTrainingCenter.jsx ← 学生实训页（学校实训接口预留）
  PracticeCenter.jsx        ← 练习中心
  DatasetCenter.jsx         ← 数据集管理
  LearningBackupPanel.jsx   ← 进度备份/恢复

scripts/
  sync-catalog.mjs          ← 扫描 public/course/ 生成 catalog.json ✅ 主要使用
  rebuild-course-notebooks.mjs ← 旧流程：从 mjs 内容生成 Notebook（已弃用）

public/
  course/                   ← 课程 Notebook 文件 + catalog.json
  datasets/                 ← 课程数据集（CSV 等）
  runtime/                  ← JupyterLite 运行时（构建产物）
```

---

## 进度计算说明

章节进度 = 已运行代码单元格数 ÷ 总代码单元格数，基于每个单元格的 `executionCount > 0` 判断。

- 所有代码单元格至少执行一次后自动标为完成
- 学生也可手动点击"标记完成"
- 完成状态持久化在 `localStorage`，换浏览器/清缓存后失效（可使用备份导出/导入）

---

## 角色与权限

| 角色 | 可访问页面 |
|------|-----------|
| `student` | 课程工作区、学习记录、练习中心、我的实训 |
| `teacher` | 课程工作区、教学工作台、数据集管理 |
| `school_admin` | 学校管理中心 |

---

## 学生端扩展（待接入）

`src/StudentTrainingCenter.jsx` 和 `src/studentPlatform.js` 已预留接口，对接学校实训服务时：

1. 配置 `studentPlatform.js` 中的 `apiBaseUrl`
2. 实现 `studentApiContract` 中定义的接口（任务获取、提交、进度同步）
3. 学生登录后自动拉取教师发布的任务

详见 `src/studentPlatform.js` 中的 API 契约定义。


- React + Vite + JavaScript
- Tailwind CSS
- MUI Core、MUI X Tree View、Data Grid、Charts
- Zustand
- JupyterLite 0.8 + Pyodide kernel
- JupyterLab federated extensions：`jupyterlite-course-bridge`、`jupyterlite-course-theme`

## 开发

```powershell
npm install
.\.venv\Scripts\python.exe -m pip install -r runtime\requirements.txt
npm run build:runtime
npm run dev -- --port 8766
```

打开 `http://127.0.0.1:8766/course/chapter-1`。

`npm run build:runtime` 会先编译 JupyterLab 扩展，再把 `notebooks/course` 和 `notebooks/extras` 保留目录层级打包到 JupyterLite，避免同名 Notebook 覆盖。生产构建使用 `npm run build`，输出到 `dist/`。

Notebook 界面使用 JupyterLab 官方简体中文语言包，不通过前端脚本替换英文文案。

## Tauri 桌面版

首次安装桌面构建依赖：

```powershell
npm install --include=dev
```

开发模式启动桌面窗口：

```powershell
npm run desktop:dev
```

生成 Windows 可执行程序、MSI 和 NSIS 安装包：

```powershell
npm run desktop:build
```

构建产物位于 `src-tauri/target/release/`，安装包位于其下的 `bundle/msi` 与 `bundle/nsis`。浏览器版仍使用原有 `npm run dev` 和 `npm run build`。

### 在线更新发布

在线更新包必须使用签名私钥构建，私钥不要提交到仓库。GitHub Release 使用 tag 触发 `.github/workflows/release.yml`：

```powershell
$env:TAURI_UPDATER_PROVIDER = "github"
$env:TAURI_RELEASE_OWNER = "your-org"
$env:TAURI_RELEASE_REPO = "python-data-studio"
$env:TAURI_UPDATER_PUBKEY = "<tauri signer 公钥>"
$env:TAURI_SIGNING_PRIVATE_KEY = "<tauri signer 私钥>"
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = "<私钥密码>"
npm run desktop:build:online
```

GitHub 模式会自动使用：

```text
https://github.com/{owner}/{repo}/releases/latest/download/latest.json
```

Gitee 可以通过 `TAURI_UPDATER_MANIFEST_URL` 指向稳定托管的 `latest.json`（例如 Gitee Pages 或自有 CDN），安装包仍可放在 Gitee Release 中。这样客户端不需要把某一个旧 tag 写死，后续发布新 tag 时仍能检测到更新。

## 目录

```text
src/                         React 外壳、Zustand 和 Runtime Bridge 客户端
runtime/extensions/          JupyterLab Bridge 与课程主题扩展源码
notebooks/course/             75 个正式课程 Notebook
notebooks/extras/             2 个补充 Notebook
scripts/                     扩展与 JupyterLite 构建脚本
docs/                        产品、交互、状态和 QA 设计文档
```

Notebook 内部不由 React 查询或覆盖 DOM。主题通过 JupyterLab 正式主题扩展加载，运行、保存、内核和选中状态通过 `postMessage` 协议传回外壳。
