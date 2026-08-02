# Notebook 教学文件独立质量评估报告

- **评估日期**：2026-08-02
- **评估对象**：109 个连续教学章节 Notebook + 8 个独立模块大作业 Notebook
- **评估性质**：独立静态评估，不采用增强脚本的自我声明作为结论
- **范围边界**：只评估课程内容、Notebook 结构、代码静态可读性和数据路径；不修改应用源代码

## 1. 评估方法

逐个解析 Notebook JSON，检查格式、单元格类型、代码单元 AST 可解析性、教学结构关键词、输出能力、注释、图表调用、正式作业残留、模块大作业位置和数据路径。由于教材 Notebook 不一定保存执行输出，本报告区分“代码具备输出能力”和“Notebook 已保存输出”，不把未保存输出直接判为失败。

## 2. 总体结果

| 指标 | 结果 | 判定与解释 |
|---|---:|---|
| JSON/nbformat/单元格结构通过 | 117/117 | 通过；117 个课程章节（109 个连续教学章节 + 8 个独立模块大作业章节）均可解析 |
| 正式章节作业残留 | 0 | 通过；当前主路径改为模块末大作业 |
| 教学代码中的 `assert` 残留 | 0/117 | 通过；已将机器学习章节的残余断言改为 `print()` 反馈 |
| 章节具备可观察结果逻辑 | 109/109 | 通过“存在输出/展示逻辑”检查；不等同于每个输出都已人工解释 |
| 章节含代码注释 | 45/109 | 部分通过；仍需按章节提升注释密度和解释质量 |
| 章节含教学目标或“本章要会” | 109/109 | 通过关键词覆盖检查；仍需人工检查目标是否可观察 |
| 章节含前置知识/准备说明 | 约 55/109 | 部分通过；约 54 章需要补齐或统一标题 |
| 章节含显式结果解释/结论提示 | 约 55/109 | 部分通过；存在“有输出但没有紧邻解释”的章节 |
| 章节含常见错误/排错提示 | 100/109 | 基本通过；剩余章节需要补充可恢复错误示例 |
| public/dist 静态内容同步 | 117/117 | 通过；109 个连续教学章节和 8 个独立模块大作业章节已完成文件名与内容比对 |

说明：以上指标区分“静态结构存在”和“教学质量已被人工验证”。关键词命中、输出函数存在或代码可解析，不能单独证明学生能够理解结果。

## 3. 模块大作业合规性

| 模块 | 最后教学章 / 作业位置 | 独立大作业数量 | 结果 |
|---|---:|---:|---|
| Python 基础 | 第11章之后的独立章节 | 1 | 通过 |
| NumPy | 第16章之后的独立章节 | 1 | 通过 |
| Pandas | 第25章之后的独立章节 | 1 | 通过 |
| Matplotlib | 第36章之后的独立章节 | 1 | 通过 |
| Seaborn | 第55章之后的独立章节 | 1 | 通过 |
| Plotly | 第72章之后的独立章节 | 1 | 通过 |
| 综合项目 | 第76章之后的独立章节 | 1 | 通过 |
| 机器学习 | 第109章之后的独立章节 | 1 | 通过 |

8 个末章均保留 1 个模块大作业入口，且每个模块均有独立 Notebook：

- `module-capstone-machine-learning.ipynb`
- `module-capstone-matplotlib.ipynb`
- `module-capstone-numpy.ipynb`
- `module-capstone-pandas.ipynb`
- `module-capstone-plotly.ipynb`
- `module-capstone-projects.ipynb`
- `module-capstone-python.ipynb`
- `module-capstone-seaborn.ipynb`

## 4. 章节结构分布

| 等级 | 分数区间 | 章节数量 | 说明 |
|---|---:|---:|---|
| A | 85–100 | 85 | 结构完整，适合直接教学 |
| B | 70–84 | 15 | 可教学，存在局部增强项 |
| C | 55–69 | 8 | 可运行但教学要素不完整 |
| D | 0–54 | 0 | 存在重大结构或运行问题 |

说明：该分数是结构覆盖度指标，不等同于学生学习效果；结果解释、图表语义和代码注释仍需人工复核。

## 5. 数据与运行路径审计

| Notebook 引用路径 | 本地运行时文件 | 结果 |
|---|---|---|
| `/datasets/bank_marketing_full.csv` | `D:/Research/Python数据工作台_2026-07-22/public/datasets/bank_marketing_full.csv` | 存在 |
| `/datasets/bike_sharing_hour.csv` | `D:/Research/Python数据工作台_2026-07-22/public/datasets/bike_sharing_hour.csv` | 存在 |
| `/datasets/diamonds.csv` | `D:/Research/Python数据工作台_2026-07-22/public/datasets/diamonds.csv` | 存在 |
| `/datasets/flights.csv` | `D:/Research/Python数据工作台_2026-07-22/public/datasets/flights.csv` | 存在 |
| `/datasets/gapminder.csv` | `D:/Research/Python数据工作台_2026-07-22/public/datasets/gapminder.csv` | 存在 |
| `/datasets/olist_customers_dataset.csv` | `D:/Research/Python数据工作台_2026-07-22/public/datasets/olist_customers_dataset.csv` | 存在 |
| `/datasets/olist_order_items_dataset.csv` | `D:/Research/Python数据工作台_2026-07-22/public/datasets/olist_order_items_dataset.csv` | 存在 |
| `/datasets/olist_orders_dataset.csv` | `D:/Research/Python数据工作台_2026-07-22/public/datasets/olist_orders_dataset.csv` | 存在 |
| `/datasets/olist_sellers_dataset.csv` | `D:/Research/Python数据工作台_2026-07-22/public/datasets/olist_sellers_dataset.csv` | 存在 |
| `/datasets/sklearn/breast_cancer.csv` | `D:/Research/Python数据工作台_2026-07-22/public/datasets/sklearn/breast_cancer.csv` | 存在 |
| `/datasets/sklearn/diabetes.csv` | `D:/Research/Python数据工作台_2026-07-22/public/datasets/sklearn/diabetes.csv` | 存在 |
| `/datasets/sklearn/iris.csv` | `D:/Research/Python数据工作台_2026-07-22/public/datasets/sklearn/iris.csv` | 存在 |
| `/datasets/sklearn/wine.csv` | `D:/Research/Python数据工作台_2026-07-22/public/datasets/sklearn/wine.csv` | 存在 |
| `/datasets/taxis.csv` | `D:/Research/Python数据工作台_2026-07-22/public/datasets/taxis.csv` | 存在 |
| `/datasets/titanic.csv` | `D:/Research/Python数据工作台_2026-07-22/public/datasets/titanic.csv` | 存在 |
| `/datasets/uci_online_retail_200k.csv` | `D:/Research/Python数据工作台_2026-07-22/public/datasets/uci_online_retail_200k.csv` | 存在 |

scikit-learn 数据集已同时保存于源数据目录和浏览器静态目录：

- 源快照：`D:\Research\Python数据工作台_2026-07-22/datasets/sklearn/`
- 浏览器静态目录：`D:\Research\Python数据工作台_2026-07-22/public/datasets/sklearn/`
- 元数据清单：`D:\Research\Python数据工作台_2026-07-22/datasets/sklearn/MANIFEST.json` 与 `D:\Research\Python数据工作台_2026-07-22/public/datasets/sklearn/MANIFEST.json`

## 6. 已确认的优点

- 课程作业结构已从章节作业切换为模块末大作业，避免重复提交和学习路径分散。
- 8 个模块的作业入口全部位于各自最后一个教学章节之后的独立课程章节。
- 所有章节 Notebook 和独立大作业 Notebook 均通过 JSON 结构校验。
- 对 117 个发布 Notebook 进行 `assert` 搜索和 Python AST 检查，当前断言残留为 0，语法错误为 0。
- 章节均包含可运行的输出逻辑；机器学习章节包含指标、预测或诊断流程。
- 大作业均包含数据来源、本地路径、任务清单、交付物、自检清单和评分参考。
- 公共数据集优先采用 scikit-learn、Kaggle/UCI 已有本地快照，减少课堂运行时联网依赖。

## 7. 当前风险与优先级

| 优先级 | 问题 | 建议 |
|---|---|---|
| P1 | 仍有部分章节缺少显式“前置知识、常见错误、结果解释”标题 | 下一轮按章节补齐，并为每个核心示例增加 1 个“输出—解释—限制”三段式说明 |
| P1 | 代码调用图表不等于图表已经生成并被解释 | 对 Matplotlib/Seaborn/Plotly 章节逐章执行并保存代表性输出，检查标题、坐标轴、图例和结论 |
| P2 | Notebook 中可能存在运行时特定路径或内核依赖 | 在目标浏览器/内核中抽样从头运行，记录依赖和失败单元格 |
| P2 | 结构化静态评估不能替代人工教学审阅 | 发布前抽取 Python、Pandas、可视化、机器学习各 2 章进行人工试讲 |

## 8. 发布建议

**结论：当前版本属于“课程内容改造基本完成、教学质量仍需抽样运行和人工试讲、静态发布同步待收尾”的候选版，不应直接标记为最终发布版。**

建议发布门槛：
1. 109 个教学章节（含文件操作专题）至少完成一次静态检查；当前已完成。
2. 8 个模块大作业入口和独立 Notebook 一一对应；当前已完成。
3. 对每个模块抽样 2 章 + 末章大作业执行；完成后记录运行通过率、失败 Cell 和输出截图。
4. 对缺少显式教学要素的章节补齐结果解释、常见错误和前置知识。
5. 维持应用源代码不变，仅继续修改课程 Notebook、数据快照和文档；静态目录同步已完成，后续重点是抽样运行和人工试讲。

---

## 9. 后续审计补充（2026-08-01）

本报告的静态结构结论应与 `docs/NOTEBOOK_NEXT_IMPROVEMENT_ROADMAP.md` 配套阅读。后续审计新增以下关注项：

- 方法标题需要按方法本体归一化，不能按变量限定名计数；例如 `raw.strip` 和 `stripped.strip` 应视为同一个方法。
- “有输出调用”不等于“有已验证输出”；后续报告必须单独记录保存输出和真实运行通过率。
- 跨章节复用的方法应标记为前置知识，避免在每个章节重复完整讲解。
- 机器学习长章节应增加阶段边界、运行入口和阶段验收点。
- 每一项独立方法示例都应记录是否依赖隐藏变量、是否依赖网络和是否产生临时文件。

### 下一版评估必须增加的指标

| 指标 | 统计方式 |
|---|---|
| 方法归一化重复率 | 按方法本体名称去重后统计重复项 |
| 独立示例通过率 | 在干净内核中逐个运行独立示例 |
| 结果解释覆盖率 | 有重要输出的示例中，紧邻结果解释的比例 |
| 代表性输出覆盖率 | 关键教学节点中保存示例输出的比例 |
| 数据来源覆盖率 | 使用数据文件的章节中，具有完整来源说明的比例 |
| 阶段导航覆盖率 | 长章节中具有阶段标题、阶段目标和阶段检查的比例 |
| 临时文件风险 | 代码中写入文件但未说明路径和清理策略的数量 |

## 9. 本轮文档一致性复核补充（2026-08-02）

### 9.1 静态发布目录同步已完成

本轮复核结果：

- `public/course/`：109 个连续教学章节 Notebook 和 8 个独立模块大作业 Notebook；
- `dist/course/`：109 个连续教学章节 Notebook 和 8 个独立模块大作业 Notebook；
- `public/course/module-capstones/` 与 `dist/course/module-capstones/` 的 8 个文件已逐一进行 SHA-256 内容比对，结果全部一致；
- 117 个课程 Notebook 的 JSON 结构、Python AST 和 `assert` 搜索复核通过。

### 9.2 当前剩余发布门槛

静态文件同步已不再是阻塞项。仍需完成：

1. 每个模块抽样章节和模块大作业的干净内核运行；
2. 图表、表格、错误恢复和结果解释的人工检查；
3. 学生视角试学和教师视角试讲；
4. 将运行通过率、失败 Cell、截图和反馈写入下一版质量报告。

---

## 10. Notebook 增强后的独立复核（2026-08-02）

本轮依据 `FOUNDATION_AND_MODULE_TEACHING_DESIGN.md` 对 `public/course/` 中的 109 个教学 Notebook 和 8 个独立模块大作业进行静态复核：

| 检查项 | 结果 |
|---|---:|
| 教学 Notebook JSON 可解析 | 109/109 |
| 模块大作业 JSON 可解析 | 8/8 |
| Python Code Cell AST 可解析 | 通过；未发现语法错误 |
| 方法说明字段增强 | 1292 个方法说明 Cell |
| 方法 Markdown → 独立 Code Cell 配对 | 1292/1292 |
| 日期/时间衔接章节 | 第 21、25、77 章已加入 |
| 模块大作业交付自检 | 8/8 |
| Notebook 中 `assert` 字面量 | 0 |
| `public/course/` 与 `dist/course/` 内容一致 | 通过 |

### 10.1 运行验证边界

本地 `jupyter nbconvert` 对第 1、77 章可以执行；第 21、25 章的完整执行依赖浏览器提供的 `/datasets/...` 数据路径；部分批量执行还会受到本机 Kernel 资源和 IOPub 超时影响。因此，静态检查通过不等于所有 Notebook 已在浏览器运行时完成冷启动验收，发布前仍需按 `RELEASE_RUNBOOK.md` 进行浏览器抽样运行。

