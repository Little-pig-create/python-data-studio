# Python Data Studio 课程文档索引与权威性说明

- **版本**：V1.3
- **日期**：2026-08-02
- **适用范围**：课程内容、Notebook、数据集、模块大作业和发布验收
- **维护原则**：内容方案、运行实现、数据清单和质量评估分开维护，但必须通过版本和变更记录保持一致

---

## 1. 阅读顺序

如果要了解当前课程内容，应按以下顺序阅读：

1. 本文档：了解各文档职责、权威级别和更新顺序；
2. `MODULE_CAPSTONE_REDESIGN_AND_NOTEBOOK_ENHANCEMENT_PLAN.md`：了解课程结构、模块大作业和 Notebook 总体规范；
3. `FOUNDATION_AND_MODULE_TEACHING_DESIGN.md`：了解前置章节、时间模块和全模块教学增强方案；
4. `NOTEBOOK_NEXT_IMPROVEMENT_ROADMAP.md`：了解 Notebook 后续完善项、数据治理、无障碍、版本和维护流程；
5. `NOTEBOOK_TEACHING_QUALITY_EVALUATION.md`：了解静态审计结果、风险和发布建议；
6. `DOCUMENTATION_COMPLETION_CHECKLIST.md`：了解教学、数据、可复现性、维护和文档完成定义；
7. `COURSE_GLOSSARY.md`、`DATASET_CARDS.md`、`CAPSTONE_RUBRICS.md`、`NOTEBOOK_AUTHORING_GUIDE.md`：查阅术语、数据、评分和 Notebook 编写细则；
8. `RELEASE_RUNBOOK.md`、`CHANGELOG.md`：执行发布和追踪变更；
9. `datasets/sklearn/MANIFEST.json` 与 `datasets/classic/README.md`：核对数据来源、本地快照和路径；
10. `QA_CHECKLIST.md`、`RUNTIME_BRIDGE.md`、`TECH_STACK.md`：需要检查运行环境、前端和 JupyterLite 技术实现时阅读。

---

## 2. 权威文档清单

| 文档 | 权威级别 | 负责内容 | 发生冲突时的处理 |
|---|---|---|---|
| `MODULE_CAPSTONE_REDESIGN_AND_NOTEBOOK_ENHANCEMENT_PLAN.md` | 当前内容规范 | 章节结构、模块范围、模块大作业、Notebook 顺序和增强标准 | 优先于历史课程方案 |
| `FOUNDATION_AND_MODULE_TEACHING_DESIGN.md` | 当前专题内容规范 | 前置章节、时间模块、全模块方法讲解和实施顺序 | 与总方案冲突时，按最新版本和本索引处理 |
| `NOTEBOOK_NEXT_IMPROVEMENT_ROADMAP.md` | 当前改进规范 | 方法说明、独立示例、数据治理、无障碍、发布门槛和维护流程 | 用于指导下一轮内容改造 |
| `NOTEBOOK_TEACHING_QUALITY_EVALUATION.md` | 当前评估基线 | Notebook 静态质量、路径审计、已知风险和评估指标 | 记录“已经验证了什么”，不替代内容规范 |
| `DOCUMENTATION_COMPLETION_CHECKLIST.md` | 当前补充规范 | 教学行为、Notebook 节奏、方法说明、数据卡片、可复现性、术语、无障碍、维护和文档完成定义 | 用于补齐总方案未覆盖的交付细节 |
| `COURSE_GLOSSARY.md` | 当前内容规范 | 课程术语、变量命名和语言风格 | 新增术语先更新本表 |
| `DATASET_CARDS.md` | 当前数据规范 | 本地公开数据集、来源、许可、字段、偏差和变更验收 | 与 `MANIFEST.json` 同步 |
| `CAPSTONE_RUBRICS.md` | 当前评价规范 | 8 个模块大作业的评分维度、通过线和反馈模板 | 不恢复章节作业 |
| `NOTEBOOK_AUTHORING_GUIDE.md` | 当前作者规范 | Cell 顺序、方法说明、输出、错误恢复和审阅清单 | 用于新旧 Notebook 改造 |
| `RELEASE_RUNBOOK.md` | 当前发布规范 | 内容、数据、运行、同步、无障碍、回滚和发布记录 | 发布前逐项执行 |
| `CHANGELOG.md` | 当前变更记录 | 课程结构、Notebook、数据和文档的变更历史 | 每次发布追加 |
| `datasets/sklearn/MANIFEST.json` | 数据元数据权威来源 | scikit-learn 数据集文件、字段、来源和快照信息 | 数据文件变更后必须同步更新 |
| `datasets/classic/README.md` | 数据集说明 | Kaggle、UCI 和其他已有本地数据 | 新增数据集时补充来源和许可 |
| `QA_CHECKLIST.md` | 发布检查规范 | 页面、Notebook、运行时、交互和构建检查 | 发布前按清单执行并记录结果 |
| `RUNTIME_BRIDGE.md` | 运行时技术规范 | 浏览器端内核、执行、输出和状态桥接 | 技术行为与课程内容分开判断 |
| `TECH_STACK.md` | 技术栈说明 | 前端、Notebook、运行时和构建工具 | 仅描述实现，不决定课程教学内容 |
| `COURSE_IMPROVEMENT_PLAN.md` | 历史实现基线 | 2026-07-26 之前的课程生成链路和练习闭环 | 不得用其中的旧作业、旧模块和 `assert` 规则覆盖当前规范 |

---

## 3. 当前课程事实基线

以下事实应与当前 Notebook 和课程方案保持一致：

| 项目 | 当前值 |
|---|---|
| 课程章节数量 | 117 个课程章节（109 个连续教学章节 + 8 个独立模块大作业章节） |
| 模块数量 | 8 个 |
| Python 基础 | 第 1～11 章（含第10章文件操作专题） |
| NumPy | 第 12～16 章 |
| Pandas | 第 17～25 章 |
| Matplotlib | 第 26～36 章 |
| Seaborn | 第 37～55 章 |
| Plotly | 第 56～72 章 |
| 综合项目 | 第 73～76 章 |
| 机器学习 | 第 77～109 章 |
| 模块大作业位置 | 每个模块最后一章之后的独立模块大作业章节 |
| 正式章节作业 | 已取消，改为课堂自检 |
| 独立实训主路径 | 已取消，不作为课程主要学习结构 |
| 方法示例 | 每个核心方法独立 Markdown 和代码 Cell |
| `assert` | 不作为当前课程教学自检要求 |
| 公开数据运行策略 | 优先使用本地快照，不要求课堂运行时联网 |
| 应用源代码 | 本轮课程内容改造不修改 `src/` |
| 静态发布同步 | `public/course/` 与 `dist/course/` 均有 109 个连续教学章节 + 8 个模块大作业，文件名和内容已完成比对 |

---

## 4. 文档更新依赖关系

### 4.1 修改课程结构时

更新顺序：

1. 修改 `MODULE_CAPSTONE_REDESIGN_AND_NOTEBOOK_ENHANCEMENT_PLAN.md`；
2. 更新本索引的当前课程事实基线；
3. 更新对应章节 Notebook 和模块大作业 Notebook；
4. 更新 `catalog.json` 或按项目构建流程重新生成目录；
5. 更新 `NOTEBOOK_TEACHING_QUALITY_EVALUATION.md`；
6. 更新 `NOTEBOOK_NEXT_IMPROVEMENT_ROADMAP.md` 的完成状态和遗留风险。

### 4.2 修改数据集时

更新顺序：

1. 固定来源、许可、版本和快照日期；
2. 更新源数据目录；
3. 更新 `MANIFEST.json`；
4. 更新浏览器静态数据目录；
5. 更新使用该数据的 Notebook 路径和数据说明；
6. 执行路径、字段和样本规模审计。

### 4.3 修改 Notebook 教学内容时

每次至少同步检查：

- 单元格顺序是否仍然由浅入深；
- 方法是否出现重复标题；
- 独立示例是否依赖隐藏变量；
- 结果是否有标签和解释；
- 数据来源和本地路径是否仍然有效；
- 模块末大作业是否仍位于最后一个教学章节之后的独立课程章节；
- `public/course/` 和实际运行目录是否同步；
- 质量评估报告是否需要更新。

---

## 5. 当前内容改造的验收证据

| 要求 | 证据位置 | 验证方式 |
|---|---|---|
| 取消章节正式作业 | 章节 Notebook 和主方案文档 | 搜索旧作业标题并抽查末尾结构 |
| 每模块一个大作业 | 各模块最后一个教学章节之后和 `module-capstones/` | 统计 8 个入口和 8 个独立 Notebook |
| 每个方法有独立示例 | 章节 Notebook | 检查方法标题与下一代码 Cell 的配对 |
| 单元格由浅入深 | 章节 Notebook | 检查标题、核心概念、方法、案例、解释和小结顺序 |
| 本地公开数据 | `datasets/`、`public/datasets/`、`MANIFEST.json` | 检查来源、路径和文件存在性 |
| 不依赖断言自检 | 当前课程 Notebook | 搜索 `assert`，并抽查运行结果打印 |
| Notebook 可解析 | 质量评估报告 | JSON、nbformat 和代码静态语法检查 |
| 浏览器运行资源同步 | `public/course/` 与 `dist/course/` | 对应文件内容和时间戳核对 |
| 应用源代码边界 | Git 状态和任务说明 | 确认本轮不主动编辑 `src/` |

---

## 6. 历史文档的使用规则

`COURSE_IMPROVEMENT_PLAN.md` 不是删除对象，因为其中保留了运行时、内容生成链路和旧实现的历史背景。但其中以下内容已经过时：

- 75 章、7 模块的旧课程规模；
- 章节综合练习作为主要作业的旧结构；
- TODO 脚手架和 `assert` 作为当前课程统一要求；
- `notebooks/course/` 作为当前内容主路径的表述；
- 旧版“独立实训”作为主要学习路径的描述。

如需引用这些内容，必须明确标注“历史实现基线”，不能直接复制到当前课程方案、Notebook 或发布说明中。

---

## 7. 文档完成定义

当以下条件全部满足时，可以认为课程文档体系完成一个可发布版本：

- `COURSE_DOCUMENTATION_INDEX.md` 作为当前课程事实的权威来源，其他文档只在需要时重复摘要并标注日期；
- 内容方案、改进路线图和质量评估没有互相矛盾；
- 旧文档已标明历史状态；
- 数据来源和本地路径可追溯；
- Notebook 改造要求具有可执行模板；
- 每项重要要求都有对应的验收证据；
- 文档中没有未解释的 TODO、旧路径或过时模块数量；
- 术语、数据卡片、评分量规、作者手册和发布手册均有明确入口；
- 每次 Notebook 或数据变更都有版本、日期和影响范围记录。

---

## 8. 版本记录

| 版本 | 日期 | 变更 |
|---|---|---|
| V1.0 | 2026-08-02 | 创建课程文档索引、权威级别、当前事实基线、依赖关系和验收证据说明 |
| V1.1 | 2026-08-02 | 纳入文档完成检查清单，补充教学、数据、可复现性和发布一致性入口 |
| V1.2 | 2026-08-02 | 新增术语表、数据卡片、评分量规、Notebook 作者手册、发布手册和变更记录；完成静态目录与断言复核 |
| V1.3 | 2026-08-02 | 新增前置章节与全模块教学增强设计，纳入时间与日期专题规划、跨模块衔接和独立 Cell 验收要求 |


## 文件操作专题（Python 基础）

Python 基础模块第 10 章为普通教学章节“文件操作专题：读取、写入与目录管理”，主线使用 `os`、`open`、`csv`、`json`，覆盖路径检查、目录创建、文本读写、追加/覆盖写入、表格文件、结构化结果、目录遍历和文件错误处理。该章节位于第 9 章文件与路径和第 11 章异常处理之间。