export const modules = [
  { id: "python", label: "Python 基础", range: "第 1–10 章", color: "#2563EB" },
  { id: "numpy", label: "NumPy", range: "第 11–15 章", color: "#0E7490" },
  { id: "pandas", label: "Pandas", range: "第 16–24 章", color: "#16865C" },
  { id: "matplotlib", label: "Matplotlib", range: "第 25–35 章", color: "#C77908" },
  { id: "seaborn", label: "Seaborn", range: "第 36–54 章", color: "#D15B35" },
  { id: "plotly", label: "Plotly", range: "第 55–71 章", color: "#B4236B" },
  { id: "projects", label: "综合项目", range: "第 72–75 章", color: "#7C3AED" },
  { id: "machine-learning", label: "机器学习", range: "第 76–108 章", color: "#0F766E" }
];

const chapterRows = [
  [1, "Python与Notebook入门"], [2, "变量、数据类型与运算符"], [3, "字符串操作（str）"], [4, "列表与元组（list / tuple）"], [5, "字典与集合（dict / set）"], [6, "条件判断（if）"], [7, "循环与迭代（for / while）"], [8, "函数（def / lambda）"], [9, "文件与路径（open / pathlib）"], [10, "异常处理（try / except）"],
  [11, "数组基础（ndarray）"], [12, "索引、切片与筛选"], [13, "形状、合并与拆分"], [14, "向量化与广播"], [15, "统计计算与随机抽样"],
  [16, "Series与DataFrame"], [17, "选择、筛选与排序"], [18, "行列操作与类型转换"], [19, "数据质量检查与清洗"], [20, "文本、日期与特征处理"], [21, "数据读取与保存"], [22, "分组、聚合与数据透视"], [23, "数据合并与结构转换"], [24, "窗口计算与探索性分析"],
  [25, "绘图结构（Figure / Axes）"], [26, "折线图（plot）"], [27, "柱状图（bar / barh）"], [28, "散点与气泡图（scatter）"], [29, "直方图（hist）"], [30, "箱线图（boxplot）"], [31, "面积图（fill_between / stackplot）"], [32, "饼图与环形图（pie）"], [33, "误差线与区间图（errorbar）"], [34, "子图与组合图（subplots）"], [35, "美化、注释与导出"],
  [36, "数据结构与主题"], [37, "频数图（countplot）"], [38, "统计柱状图（barplot）"], [39, "点图（pointplot）"], [40, "箱线图（boxplot）"], [41, "小提琴图（violinplot）"], [42, "抖动散点图（stripplot）"], [43, "蜂群图（swarmplot）"], [44, "直方图（histplot）"], [45, "核密度图（kdeplot）"], [46, "累积分布图（ecdfplot）"], [47, "散点图（scatterplot）"], [48, "统计折线图（lineplot）"], [49, "回归图（regplot / lmplot）"], [50, "联合分布图（jointplot）"], [51, "成对关系图（pairplot）"], [52, "热力图（heatmap）"], [53, "聚类热力图（clustermap）"], [54, "分面图（FacetGrid）"],
  [55, "图表结构与Hover"], [56, "交互折线图（px.line）"], [57, "交互柱状图（px.bar）"], [58, "交互散点图（px.scatter）"], [59, "交互气泡图"], [60, "交互面积图（px.area）"], [61, "交互直方图（px.histogram）"], [62, "交互箱线图（px.box）"], [63, "交互小提琴图（px.violin）"], [64, "交互热力图（px.imshow）"], [65, "矩形树图（px.treemap）"], [66, "旭日图（px.sunburst）"], [67, "漏斗图（px.funnel）"], [68, "瀑布图（Waterfall）"], [69, "时间线与甘特图（px.timeline）"], [70, "地图图表（Map / Geo）"], [71, "子图、控件与导出"],
  [72, "在线零售用户消费与RFM"], [73, "Olist电商物流履约分析"], [74, "共享单车需求与运力调度"], [75, "银行客户营销转化分析"],
  [76, "Scikit-learn工作流与数据切分"], [77, "数据预处理与Pipeline"], [78, "线性回归与正则化"], [79, "逻辑回归分类"],
  [80, "K近邻模型（KNN）"], [81, "决策树"], [82, "随机森林"], [83, "梯度提升模型"], [84, "支持向量机（SVM）"],
  [85, "朴素贝叶斯"], [86, "K-Means聚类"], [87, "主成分分析（PCA）"], [88, "交叉验证与超参数调优"], [89, "不平衡分类与阈值选择"],
  [90, "随机森林回归"], [91, "梯度提升与加法模型"], [92, "多分类与Softmax"], [93, "混淆矩阵与分类指标"],
  [94, "ROC、PR曲线与决策阈值"], [95, "类别不平衡与Top-K Lift"], [96, "概率校准与Brier Score"],
  [97, "K-Means客户分群实战"], [98, "层次聚类与DBSCAN"], [99, "PCA降维与可视化"],
  [100, "交叉验证策略"], [101, "GridSearch与随机搜索"], [102, "模型比较与基线"], [103, "特征选择与模型解释"], [104, "模型保存与批量推理"],
  [105, "用户消费价值预测项目"], [106, "物流延期风险预测项目"], [107, "共享单车需求预测项目"], [108, "银行营销响应预测项目"]
];

const moduleForChapter = (chapter) => chapter <= 7
  ? "python"
  : chapter <= 10
    ? "python"
    : chapter <= 15
      ? "numpy"
      : chapter <= 24
        ? "pandas"
        : chapter <= 35
          ? "matplotlib"
          : chapter <= 54
            ? "seaborn"
            : chapter <= 71
              ? "plotly"
              : chapter <= 75
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
  tags: chapter <= 10 ? ["语法", "基础"] : chapter <= 24 ? ["数据处理"] : chapter <= 71 ? ["可视化", "实践"] : chapter <= 75 || chapter >= 105 ? ["项目", "机器学习"] : ["机器学习", "sklearn"]
}));

export const extras = [
  { id: "extra-variables", title: "变量与标识符示例", label: "变量与标识符示例", path: "/runtime/files/extras/" + encodeURIComponent("变量与标识符_示例.ipynb"), module: "python", kind: "extra", estimatedMinutes: 20, hasCode: true, tags: ["练习"] },
  { id: "extra-chapter-2", title: "第2章练习版", label: "第2章练习版", path: "/runtime/files/extras/" + encodeURIComponent("第2章_变量_数据类型与运算符.ipynb"), module: "python", kind: "extra", estimatedMinutes: 25, hasCode: true, tags: ["练习"] }
];

export const allLessons = [...chapters, ...extras];
export const moduleMap = Object.fromEntries(modules.map((item) => [item.id, item]));
