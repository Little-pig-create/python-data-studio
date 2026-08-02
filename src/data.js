export const modules = [
  { id: "python", label: "Python 基础", range: "第 1–11 章", color: "#2563EB" },
  { id: "numpy", label: "NumPy", range: "第 12–16 章", color: "#0E7490" },
  { id: "pandas", label: "Pandas", range: "第 17–25 章", color: "#16865C" },
  { id: "matplotlib", label: "Matplotlib", range: "第 26–36 章", color: "#C77908" },
  { id: "seaborn", label: "Seaborn", range: "第 37–55 章", color: "#D15B35" },
  { id: "plotly", label: "Plotly", range: "第 56–72 章", color: "#B4236B" },
  { id: "projects", label: "综合项目", range: "第 73–76 章", color: "#7C3AED" },
  { id: "machine-learning", label: "机器学习", range: "第 77–109 章", color: "#0F766E" }
];

const chapterRows = [
  [1, "Python与Notebook入门"], [2, "变量、数据类型与运算符"], [3, "字符串操作（str）"], [4, "列表与元组（list / tuple）"], [5, "字典与集合（dict / set）"], [6, "条件判断（if）"], [7, "循环与迭代（for / while）"], [8, "函数（def / lambda）"],
  [9, "文件与路径（open / pathlib）"], [10, "文件操作专题：读取、写入与目录管理"], [11, "异常处理（try / except）"], [12, "数组基础（ndarray）"], [13, "索引、切片与筛选"], [14, "形状、合并与拆分"], [15, "向量化与广播"], [16, "统计计算与随机抽样"],
  [17, "Series与DataFrame"], [18, "选择、筛选与排序"], [19, "行列操作与类型转换"], [20, "数据质量检查与清洗"], [21, "文本、日期与特征处理"], [22, "数据读取与保存"], [23, "分组、聚合与数据透视"], [24, "数据合并与结构转换"],
  [25, "窗口计算与探索性分析"], [26, "绘图结构（Figure / Axes）"], [27, "折线图（plot）"], [28, "柱状图（bar / barh）"], [29, "散点与气泡图（scatter）"], [30, "直方图（hist）"], [31, "箱线图（boxplot）"], [32, "面积图（fill_between / stackplot）"],
  [33, "饼图与环形图（pie）"], [34, "误差线与区间图（errorbar）"], [35, "子图与组合图（subplots）"], [36, "美化、注释与导出"], [37, "数据结构与主题"], [38, "频数图（countplot）"], [39, "统计柱状图（barplot）"], [40, "点图（pointplot）"],
  [41, "箱线图（boxplot）"], [42, "小提琴图（violinplot）"], [43, "抖动散点图（stripplot）"], [44, "蜂群图（swarmplot）"], [45, "直方图（histplot）"], [46, "核密度图（kdeplot）"], [47, "累积分布图（ecdfplot）"], [48, "散点图（scatterplot）"],
  [49, "统计折线图（lineplot）"], [50, "回归图（regplot / lmplot）"], [51, "联合分布图（jointplot）"], [52, "成对关系图（pairplot）"], [53, "热力图（heatmap）"], [54, "聚类热力图（clustermap）"], [55, "分面图（FacetGrid）"], [56, "图表结构与Hover"],
  [57, "交互折线图（px.line）"], [58, "交互柱状图（px.bar）"], [59, "交互散点图（px.scatter）"], [60, "交互气泡图"], [61, "交互面积图（px.area）"], [62, "交互直方图（px.histogram）"], [63, "交互箱线图（px.box）"], [64, "交互小提琴图（px.violin）"],
  [65, "交互热力图（px.imshow）"], [66, "矩形树图（px.treemap）"], [67, "旭日图（px.sunburst）"], [68, "漏斗图（px.funnel）"], [69, "瀑布图（Waterfall）"], [70, "时间线与甘特图（px.timeline）"], [71, "地图图表（Map / Geo）"], [72, "子图、控件与导出"],
  [73, "在线零售用户消费与RFM"], [74, "Olist电商物流履约分析"], [75, "共享单车需求与运力调度"], [76, "银行客户营销转化分析"], [77, "Scikit-learn工作流与数据切分"], [78, "数据预处理与Pipeline"], [79, "线性回归与正则化"], [80, "逻辑回归分类"],
  [81, "K近邻模型（KNN）"], [82, "决策树"], [83, "随机森林"], [84, "梯度提升模型"], [85, "支持向量机（SVM）"], [86, "朴素贝叶斯"], [87, "K-Means聚类"], [88, "主成分分析（PCA）"],
  [89, "交叉验证与超参数调优"], [90, "不平衡分类与阈值选择"], [91, "随机森林回归"], [92, "梯度提升与加法模型"], [93, "多分类与Softmax"], [94, "混淆矩阵与分类指标"], [95, "ROC、PR曲线与决策阈值"], [96, "类别不平衡与Top-K Lift"],
  [97, "概率校准与Brier Score"], [98, "K-Means客户分群实战"], [99, "层次聚类与DBSCAN"], [100, "PCA降维与可视化"], [101, "交叉验证策略"], [102, "GridSearch与随机搜索"], [103, "模型比较与基线"], [104, "特征选择与模型解释"],
  [105, "模型保存与批量推理"], [106, "用户消费价值预测项目"], [107, "物流延期风险预测项目"], [108, "共享单车需求预测项目"], [109, "银行营销响应预测项目"],
];

const moduleForChapter = (chapter) => chapter <= 11
  ? "python"
  : chapter <= 16
    ? "numpy"
    : chapter <= 25
      ? "pandas"
      : chapter <= 36
        ? "matplotlib"
        : chapter <= 55
          ? "seaborn"
          : chapter <= 72
            ? "plotly"
            : chapter <= 76
              ? "projects"
              : "machine-learning";
const moduleFileLabels = {
  python: "Python基础",
  numpy: "NumPy",
  pandas: "Pandas",
  matplotlib: "Matplotlib",
  seaborn: "Seaborn",
  plotly: "Plotly",
  projects: "综合项目",
  "machine-learning": "机器学习"
};

// 统一所有 notebook 使用 course-chapter-{n}.ipynb 格式
const fileName = (chapter) => `course-chapter-${chapter}.ipynb`;

export const chapters = chapterRows.map(([chapter, title]) => ({
  id: "chapter-" + chapter,
  chapter,
  title,
  label: "第" + chapter + "章 " + title,
  module: moduleForChapter(chapter),
  path: "/course/" + fileName(chapter),  // 统一使用 /course/ 路径
  kind: (chapter >= 72 && chapter <= 75) || chapter >= 105 ? "project" : "lesson",
  estimatedMinutes: (chapter >= 72 && chapter <= 75) || chapter >= 105 ? 120 : chapter >= 76 ? 55 : chapter === 1 ? 25 : 35 + (chapter % 3) * 5,
  hasCode: true,
  tags: chapter <= 11 ? ["语法", "基础"] : chapter <= 25 ? ["数据处理"] : chapter <= 72 ? ["可视化", "实践"] : chapter <= 76 || chapter >= 106 ? ["项目", "机器学习"] : ["机器学习", "sklearn"]
}));

export const extras = [
  { id: "extra-variables", title: "变量与标识符示例", label: "变量与标识符示例", path: "/runtime/files/extras/" + encodeURIComponent("变量与标识符_示例.ipynb"), module: "python", kind: "extra", estimatedMinutes: 20, hasCode: true, tags: ["练习"] },
  { id: "extra-chapter-2", title: "第2章练习版", label: "第2章练习版", path: "/runtime/files/extras/" + encodeURIComponent("第2章_变量_数据类型与运算符.ipynb"), module: "python", kind: "extra", estimatedMinutes: 25, hasCode: true, tags: ["练习"] }
];

export const allLessons = [...chapters, ...extras];
export const moduleMap = Object.fromEntries(modules.map((item) => [item.id, item]));
