# Notebook 编写与审阅手册

- **版本**：V1.0
- **日期**：2026-08-02
- **适用范围**：普通章节 Notebook、模块大作业 Notebook 和教师审阅

## 1. 编写前

前置章节、时间模块和各模块统一增强要求以 `FOUNDATION_AND_MODULE_TEACHING_DESIGN.md` 为内容设计参考。

- 明确章节在模块中的位置和前置知识；
- 写出理解、操作、迁移三类目标；
- 列出本章真正需要独立讲解的方法；
- 确定是否使用本地公开数据，并登记数据卡片；
- 设计至少一个错误恢复示例和一个结果解释段落。

## 2. Cell 编写标准

推荐顺序：标题 → 学习路线 → 目标 → 前置知识 → 核心概念 → 分类速查 → 最小示例 → 方法独立示例 → 参数实验 → 错误恢复 → 综合案例 → 结果解释 → 小结。

分类速查应放在正式示例之前：

- 语法、NumPy、Pandas 和机器学习章节使用“类别｜常用方法或写法｜主要用途｜需要特别注意”；
- Matplotlib、Seaborn 和 Plotly 章节使用“基础图表｜进阶变体｜关键参数｜注意事项”；
- 综合项目使用“阶段｜关键操作｜主要产出｜质量风险”；
- 表格中的每一行都必须能在后续找到对应的说明、代码或练习，不能只列名词。

每个核心方法至少使用一个 Markdown Cell + 一个代码 Cell；说明作用、调用形式、参数、返回值、是否修改原对象、文件/目录副作用和边界情况。复杂方法可增加第二个参数实验 Cell。代码 Cell 应短小、输出受控、变量来源清楚，不使用 `assert` 作为教学自检。

## 3. 输出标准

代码运行后应能回答：输入是什么、处理做了什么、结果是什么、结果说明什么。裸数字、裸数组和没有标题的图表不能作为完整教学输出。

图表至少检查标题、坐标轴、单位、图例、颜色/标记、字体和窄屏可读性。

## 4. 审阅清单

- [ ] 章节目标能通过代码或解释验证；
- [ ] 单元格由浅入深；
- [ ] 方法示例相互独立；
- [ ] 没有隐藏变量依赖；
- [ ] 没有 `assert` 教学自检；
- [ ] 错误示例有修复路径；
- [ ] 数据来源和本地路径完整；
- [ ] 结果有解释和限制；
- [ ] 重启内核后能按顺序运行；
- [ ] 模块末大作业仅出现在模块最后一章之后的独立大作业章节，并与章节综合案例区分。

## 5. 内部架构与同步

Notebook 的内容权威、运行时副本和课程页面副本分层管理：

```text
public/course/                          内容权威（教学章节 + module-capstones/ + catalog.json）
notebooks/course|extras/               JupyterLite 运行时打包输入（course 由 build:runtime 自动同步）
public/runtime/files/course|extras/   JupyterLite 运行时副本（构建产物）
docs/archive/notebooks-legacy/         旧版课程源归档（2026-08 前）
```

编辑时修改 `public/course/` 下的 Notebook（或运行课程生成器）。每个 Notebook 的顶层 `metadata` 应包含架构版本、cell ID 方案和内容指纹；每个 cell 应有稳定的 `id`。这些字段用于保留执行状态、识别内容更新和判断旧草稿是否需要失效。

修改后执行：

```powershell
npm run normalize:notebooks
npm run check:notebooks
```

课程发布使用 `npm run build:course`，运行时发布使用 `npm run build:runtime`。日常课程构建不会调用旧生成器覆盖已审阅内容；确需重建时使用 `npm run rebuild:course:generated` 并重新抽样审阅。不要手工修改 `public/runtime/` 或 `notebooks/course/`（后者由 `build:runtime` 自动同步）。

## 6. 交付信息

提交 Notebook 时同时记录：文件路径、课程版本、数据快照版本、修改原因、审阅人、审阅日期、已知风险和是否同步 `public/course/` 与 `dist/course/`。


## 文件操作与时间与日期章节

文件操作普通章节以 `os`、`open`、`csv`、`json` 为主线；第13章时间与日期应覆盖 Python `time`、`datetime`、`date`、`timedelta`、`strptime` 和 `strftime`，并在相关章节中使用独立方法 Cell。Pandas 的 `to_datetime`、`dt`、`resample`、`rolling` 和机器学习时间切分属于后续模块，应在对应章节继续展开。
