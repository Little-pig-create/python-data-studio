# 数据集卡片与使用规范

- **版本**：V1.0
- **日期**：2026-08-02
- **数据元数据权威来源**：`datasets/sklearn/MANIFEST.json`
- **运行原则**：课堂默认读取本地快照，不依赖运行时联网。

## 1. 统一使用流程

1. 在 Markdown 中说明数据集名称、来源和任务；
2. 读取本地文件并打印路径、形状和前几行；
3. 检查字段类型、缺失值、重复值和目标分布；
4. 进行必要的清洗或转换，并说明是否改变原始语义；
5. 先做描述性统计和可视化，再进入建模；
6. 结果解释必须区分“当前样本中的观察”与“可推广结论”；
7. 在 Notebook 结尾再次给出来源、许可和限制。

## 2. 本地文件约定

- 源数据：`datasets/`；
- 浏览器运行副本：`public/datasets/`；
- 课程 Notebook 中使用相对路径，不使用用户本机绝对路径；
- 文件更新必须先修改源数据和 Manifest，再同步浏览器副本；
- 任何字段重命名、采样或清洗都应在 Notebook 和文档中记录。

## 3. scikit-learn 本地快照

### iris

- **本地文件**：`datasets/sklearn/iris.csv`
- **规模**：150 行，5 列
- **来源**：scikit-learn bundled dataset
- **快照日期**：2026-08-01
- **特征**：sepal length (cm), sepal width (cm), petal length (cm), petal width (cm)
- **目标/类别**：setosa, versicolor, virginica
- **用途建议**：用于离线读取、字段检查、统计汇总、可视化和 scikit-learn 入门示例。
- **限制**：这是面向教学的本地快照，不代表数据可以支持现实世界的因果结论；使用时应保留来源说明并遵守上游许可。
- **原始说明**：CSV snapshot exported locally for offline course use; original dataset metadata remains governed by scikit-learn/upstream source.

### wine

- **本地文件**：`datasets/sklearn/wine.csv`
- **规模**：178 行，14 列
- **来源**：scikit-learn bundled dataset
- **快照日期**：2026-08-01
- **特征**：alcohol, malic_acid, ash, alcalinity_of_ash, magnesium, total_phenols, flavanoids, nonflavanoid_phenols, proanthocyanins, color_intensity, hue, od280/od315_of_diluted_wines, proline
- **目标/类别**：class_0, class_1, class_2
- **用途建议**：用于离线读取、字段检查、统计汇总、可视化和 scikit-learn 入门示例。
- **限制**：这是面向教学的本地快照，不代表数据可以支持现实世界的因果结论；使用时应保留来源说明并遵守上游许可。
- **原始说明**：CSV snapshot exported locally for offline course use; original dataset metadata remains governed by scikit-learn/upstream source.

### diabetes

- **本地文件**：`datasets/sklearn/diabetes.csv`
- **规模**：442 行，11 列
- **来源**：scikit-learn bundled dataset
- **快照日期**：2026-08-01
- **特征**：age, sex, bmi, bp, s1, s2, s3, s4, s5, s6
- **目标/类别**：连续目标值（见数据文件 target 列）
- **用途建议**：用于离线读取、字段检查、统计汇总、可视化和 scikit-learn 入门示例。
- **限制**：这是面向教学的本地快照，不代表数据可以支持现实世界的因果结论；使用时应保留来源说明并遵守上游许可。
- **原始说明**：CSV snapshot exported locally for offline course use; original dataset metadata remains governed by scikit-learn/upstream source.

### breast_cancer

- **本地文件**：`datasets/sklearn/breast_cancer.csv`
- **规模**：569 行，31 列
- **来源**：scikit-learn bundled dataset
- **快照日期**：2026-08-01
- **特征**：mean radius, mean texture, mean perimeter, mean area, mean smoothness, mean compactness, mean concavity, mean concave points, mean symmetry, mean fractal dimension, radius error, texture error, perimeter error, area error, smoothness error, compactness error, concavity error, concave points error, symmetry error, fractal dimension error, worst radius, worst texture, worst perimeter, worst area, worst smoothness, worst compactness, worst concavity, worst concave points, worst symmetry, worst fractal dimension
- **目标/类别**：malignant, benign
- **用途建议**：用于离线读取、字段检查、统计汇总、可视化和 scikit-learn 入门示例。
- **限制**：这是面向教学的本地快照，不代表数据可以支持现实世界的因果结论；使用时应保留来源说明并遵守上游许可。
- **原始说明**：CSV snapshot exported locally for offline course use; original dataset metadata remains governed by scikit-learn/upstream source.

## 4. Classic/Kaggle/UCI 数据集索引

以下数据集来源、许可和原始页面以 `datasets/classic/README.md` 为准。Notebook 使用浏览器副本时，应优先使用 `/datasets/...` 路径。

| 数据主题 | 浏览器文件 | 来源 | 适合教学 |
|---|---|---|---|
| 钻石价格 | `diamonds.csv` | seaborn-data | 分布、分类比较、回归和异常值 |
| Titanic | `titanic.csv` | seaborn-data | 缺失值、分组统计和分类入门 |
| Penguins | `penguins.csv` | seaborn-data | 分组统计、相关关系和成对图 |
| 小费 | `tips.csv` | seaborn-data | 分组聚合、类别比较和推断示例 |
| 航班 | `flights.csv` | seaborn-data | 时间序列、透视表和热力图 |
| 出租车 | `taxis.csv` | seaborn-data | 时间、地理和费用分析 |
| Gapminder | `gapminder.csv` | Plotly datasets | 地理、时间和动画图表 |
| Olist 电商 | `olist_*_dataset.csv` | Kaggle | 多表连接、物流和 SLA 分析 |
| 共享单车 | `bike_sharing_hour.csv` | UCI | 时间特征、需求预测和时间切分 |
| 银行营销 | `bank_marketing_full.csv` | UCI | 分类、转化率、评分和业务限制 |
| Online Retail | `uci_online_retail_200k.csv` | UCI 本地确定性采样 | RFM、客户价值和聚类入门 |

Kaggle/UCI 数据的浏览器副本可能经过格式转换、字段重命名或确定性抽样。每个 Notebook 必须说明这些处理，不得把派生文件称为原始文件。

## 5. 许可和偏差说明

scikit-learn 自带数据集的具体许可、致谢和上游说明应以 scikit-learn 与对应原始数据来源为准。课程可以分发教学快照，但不能把快照包装成自有数据，也不能省略上游来源。

机器学习示例不得暗示医学、金融或社会决策中的真实部署结论。特别是 `breast_cancer` 数据仅用于展示分类流程，不用于医学诊断；`diabetes` 数据仅用于回归教学，不用于个体健康判断。

## 6. 数据集变更验收

- Manifest 中的文件真实存在；
- 行数、列数和字段名与快照一致；
- Notebook 使用的路径与 Manifest 一致；
- `public/datasets/` 与源数据内容一致；
- 许可、来源和快照日期已更新；
- 受影响 Notebook 已完成冷启动运行。
