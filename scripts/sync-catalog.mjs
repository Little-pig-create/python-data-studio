/**
 * sync-catalog.mjs
 *
 * 扫描 public/course/course-chapter-*.ipynb，根据文件内容（优先）
 * 和 src/data.js 的章节表（兜底），重新生成 public/course/catalog.json。
 *
 * 用法：
 *   node scripts/sync-catalog.mjs          # 扫描 + 生成
 *   node scripts/sync-catalog.mjs --dry-run # 只打印，不写入
 *
 * Notebook 元数据覆盖规则（在 notebook.metadata 中设置）：
 *   chapter_title       字符串   → 章节标题（覆盖 data.js）
 *   chapter_module      字符串   → 模块 ID（覆盖 data.js 推断）
 *   chapter_kind        字符串   → "lesson" | "project" | "capstone" | "extra"（默认 lesson）
 *   estimated_minutes   数字     → 预计学习时长（分钟）
 *   tags                数组     → 标签列表
 *   difficulty          字符串   → 难度标注
 *   description         字符串   → 章节简介
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chapters as dataChapters, modules as dataModules } from "../src/data.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const courseDir = path.join(root, "public", "course");
const catalogPath = path.join(courseDir, "catalog.json");
const isDryRun = process.argv.includes("--dry-run");

// ── 章节号 → data.js 元数据的快速查表 ────────────────────────────────────────
const dataByChapter = new Map(dataChapters.map((c) => [c.chapter, c]));

// ── 扫描 public/course/ 目录 ──────────────────────────────────────────────────
// 普通章节使用 course-chapter-{n}.ipynb；模块大作业使用
// module-capstones/*.ipynb，并通过 Notebook metadata 插入到所属模块末尾。
const chapterFiles = fs.readdirSync(courseDir)
  .filter((name) => /^course-chapter-(\d+)\.ipynb$/.test(name))
  .map((name) => {
    const chapter = parseInt(name.match(/^course-chapter-(\d+)\.ipynb$/)[1], 10);
    return { name, chapter, sortOrder: chapter, filePath: path.join(courseDir, name), isCapstone: false };
  });
// 保留没有数字章节号的正式章节（当前包括时间与日期章节）。
// 这类文件没有可靠的文件名推断信息，因此使用显式维护的发布元数据。
const namedChapterFiles = fs.readdirSync(courseDir)
  .filter((name) => /^course-chapter-[^\d].+\.ipynb$/.test(name))
  .map((name) => ({ name, filePath: path.join(courseDir, name), relativePath: name, isCapstone: false }));
const capstoneDir = path.join(courseDir, "module-capstones");
const capstoneFiles = fs.existsSync(capstoneDir)
  ? fs.readdirSync(capstoneDir)
    .filter((name) => name.endsWith(".ipynb"))
    .map((name) => ({ name, filePath: path.join(capstoneDir, name), relativePath: `module-capstones/${name}`, isCapstone: true }))

  : [];
// 模块入门章（module-intro-*.ipynb）：独立介绍章节。
const introFiles = fs.readdirSync(courseDir)
  .filter((name) => /^module-intro-.*\.ipynb$/.test(name))
  .map((name) => ({ name, filePath: path.join(courseDir, name), relativePath: name, isCapstone: false }));
const ipynbFiles = [...chapterFiles, ...namedChapterFiles, ...introFiles, ...capstoneFiles];

const namedChapterMeta = {
  "course-chapter-time.ipynb": {
    id: "chapter-time",
    chapter: 15,
    sortOrder: 15,
    title: "模块、类与项目组织",
    label: "第15章 模块、类与项目组织",
    module: "python",
    kind: "lesson",
    estimatedMinutes: 90,
    tags: ["Python基础", "模块", "类", "项目组织"],
  },
};
// 权威展示映射：文件 → { chapter(展示号), title }，由真实文件内容标题重建
const DISPLAY_MAP = {
  "course-chapter-common-modules": { chapter: 14, title: "常见 Python 模块", module: "python", kind: "lesson" },
  "course-chapter-1": { chapter: 1, title: "Python 与 Notebook 入门", module: "python", kind: "lesson" },
  "course-chapter-2": { chapter: 2, title: "变量、数据类型与运算符", module: "python", kind: "lesson" },
  "course-chapter-3": { chapter: 3, title: "字符串：从文本到字段", module: "python", kind: "lesson" },
  "course-chapter-4": { chapter: 4, title: "列表：管理多条记录", module: "python", kind: "lesson" },
  "course-chapter-5": { chapter: 5, title: "元组：固定字段与解包", module: "python", kind: "lesson" },
  "course-chapter-6": { chapter: 6, title: "字典与集合：命名记录与去重", module: "python", kind: "lesson" },
  "course-chapter-7": { chapter: 7, title: "集合：去重与关系", module: "python", kind: "lesson" },
  "course-chapter-8": { chapter: 8, title: "条件判断：把规则写清楚", module: "python", kind: "lesson" },
  "course-chapter-9": { chapter: 9, title: "循环与迭代：批量处理账目", module: "python", kind: "lesson" },
  "course-chapter-10": { chapter: 10, title: "函数基础：参数、返回值与职责", module: "python", kind: "lesson" },
  "course-chapter-11": { chapter: 11, title: "函数进阶：内置函数、lambda 与组合", module: "python", kind: "lesson" },
  "course-chapter-12": { chapter: 12, title: "文件、路径与 JSON 持久化", module: "python", kind: "lesson" },
  "course-chapter-13": { chapter: 13, title: "异常处理、调试与基础测试", module: "python", kind: "lesson" },
  "course-chapter-time": { chapter: 15, title: "模块、类与项目组织", module: "python", kind: "lesson" },
  "module-intro-numpy": { chapter: 16, title: "NumPy 模块入门", module: "numpy", kind: "intro" },
  "course-chapter-14": { chapter: 17, title: "数组基础（ndarray）", module: "numpy", kind: "lesson" },
  "course-chapter-15": { chapter: 18, title: "索引、切片与筛选", module: "numpy", kind: "lesson" },
  "course-chapter-16": { chapter: 19, title: "形状、合并与拆分", module: "numpy", kind: "lesson" },
  "course-chapter-17": { chapter: 20, title: "向量化与广播", module: "numpy", kind: "lesson" },
  "course-chapter-18": { chapter: 21, title: "统计计算与随机抽样", module: "numpy", kind: "lesson" },
  "module-intro-pandas": { chapter: 22, title: "Pandas 模块入门", module: "pandas", kind: "intro" },
  "course-chapter-19": { chapter: 23, title: "Series与DataFrame", module: "pandas", kind: "lesson" },
  "course-chapter-20": { chapter: 24, title: "选择、筛选与排序", module: "pandas", kind: "lesson" },
  "course-chapter-21": { chapter: 25, title: "行列操作与类型转换", module: "pandas", kind: "lesson" },
  "course-chapter-22": { chapter: 26, title: "数据质量检查与清洗", module: "pandas", kind: "lesson" },
  "course-chapter-23": { chapter: 27, title: "文本、日期与特征处理", module: "pandas", kind: "lesson" },
  "course-chapter-24": { chapter: 28, title: "数据读取与保存", module: "pandas", kind: "lesson" },
  "course-chapter-25": { chapter: 29, title: "分组、聚合与数据透视", module: "pandas", kind: "lesson" },
  "course-chapter-26": { chapter: 30, title: "数据合并与结构转换", module: "pandas", kind: "lesson" },
  "course-chapter-27": { chapter: 31, title: "窗口计算与探索性分析", module: "pandas", kind: "lesson" },
  "module-intro-matplotlib": { chapter: 32, title: "Matplotlib 模块入门", module: "matplotlib", kind: "intro" },
  "course-chapter-28": { chapter: 33, title: "绘图结构（Figure / Axes）", module: "matplotlib", kind: "lesson" },
  "course-chapter-29": { chapter: 34, title: "折线图（plot）", module: "matplotlib", kind: "lesson" },
  "course-chapter-30": { chapter: 35, title: "柱状图（bar / barh）", module: "matplotlib", kind: "lesson" },
  "course-chapter-31": { chapter: 36, title: "散点与气泡图（scatter）", module: "matplotlib", kind: "lesson" },
  "course-chapter-32": { chapter: 37, title: "直方图（hist）", module: "matplotlib", kind: "lesson" },
  "course-chapter-33": { chapter: 38, title: "箱线图（boxplot）", module: "matplotlib", kind: "lesson" },
  "course-chapter-34": { chapter: 39, title: "面积图（fill_between / stackplot）", module: "matplotlib", kind: "lesson" },
  "course-chapter-35": { chapter: 40, title: "饼图与环形图（pie）", module: "matplotlib", kind: "lesson" },
  "course-chapter-36": { chapter: 41, title: "误差线与区间图（errorbar）", module: "matplotlib", kind: "lesson" },
  "course-chapter-37": { chapter: 42, title: "子图与组合图（subplots）", module: "matplotlib", kind: "lesson" },
  "course-chapter-38": { chapter: 43, title: "美化、注释与导出", module: "matplotlib", kind: "lesson" },
  "module-intro-seaborn": { chapter: 44, title: "Seaborn 模块入门", module: "seaborn", kind: "intro" },
  "course-chapter-39": { chapter: 45, title: "数据结构与主题", module: "seaborn", kind: "lesson" },
  "course-chapter-40": { chapter: 46, title: "频数图（countplot）", module: "seaborn", kind: "lesson" },
  "course-chapter-41": { chapter: 47, title: "统计柱状图（barplot）", module: "seaborn", kind: "lesson" },
  "course-chapter-42": { chapter: 48, title: "点图（pointplot）", module: "seaborn", kind: "lesson" },
  "course-chapter-43": { chapter: 49, title: "箱线图（boxplot）", module: "seaborn", kind: "lesson" },
  "course-chapter-44": { chapter: 50, title: "小提琴图（violinplot）", module: "seaborn", kind: "lesson" },
  "course-chapter-45": { chapter: 51, title: "抖动散点图（stripplot）", module: "seaborn", kind: "lesson" },
  "course-chapter-46": { chapter: 52, title: "蜂群图（swarmplot）", module: "seaborn", kind: "lesson" },
  "course-chapter-47": { chapter: 53, title: "直方图（histplot）", module: "seaborn", kind: "lesson" },
  "course-chapter-48": { chapter: 54, title: "核密度图（kdeplot）", module: "seaborn", kind: "lesson" },
  "course-chapter-49": { chapter: 55, title: "累积分布图（ecdfplot）", module: "seaborn", kind: "lesson" },
  "course-chapter-50": { chapter: 56, title: "散点图（scatterplot）", module: "seaborn", kind: "lesson" },
  "course-chapter-51": { chapter: 57, title: "统计折线图（lineplot）", module: "seaborn", kind: "lesson" },
  "course-chapter-52": { chapter: 58, title: "回归图（regplot / lmplot）", module: "seaborn", kind: "lesson" },
  "course-chapter-53": { chapter: 59, title: "联合分布图（jointplot）", module: "seaborn", kind: "lesson" },
  "course-chapter-54": { chapter: 60, title: "成对关系图（pairplot）", module: "seaborn", kind: "lesson" },
  "course-chapter-55": { chapter: 61, title: "热力图（heatmap）", module: "seaborn", kind: "lesson" },
  "course-chapter-56": { chapter: 62, title: "聚类热力图（clustermap）", module: "seaborn", kind: "lesson" },
  "course-chapter-57": { chapter: 63, title: "分面图（FacetGrid）", module: "seaborn", kind: "lesson" },
  "module-intro-plotly": { chapter: 64, title: "Plotly 模块入门", module: "plotly", kind: "intro" },
  "course-chapter-58": { chapter: 65, title: "图表结构与Hover", module: "plotly", kind: "lesson" },
  "course-chapter-59": { chapter: 66, title: "交互折线图（px.line）", module: "plotly", kind: "lesson" },
  "course-chapter-60": { chapter: 67, title: "交互柱状图（px.bar）", module: "plotly", kind: "lesson" },
  "course-chapter-61": { chapter: 68, title: "交互散点图（px.scatter）", module: "plotly", kind: "lesson" },
  "course-chapter-62": { chapter: 69, title: "交互气泡图", module: "plotly", kind: "lesson" },
  "course-chapter-63": { chapter: 70, title: "交互面积图（px.area）", module: "plotly", kind: "lesson" },
  "course-chapter-64": { chapter: 71, title: "交互直方图（px.histogram）", module: "plotly", kind: "lesson" },
  "course-chapter-65": { chapter: 72, title: "交互箱线图（px.box）", module: "plotly", kind: "lesson" },
  "course-chapter-66": { chapter: 73, title: "交互小提琴图（px.violin）", module: "plotly", kind: "lesson" },
  "course-chapter-67": { chapter: 74, title: "交互热力图（px.imshow）", module: "plotly", kind: "lesson" },
  "course-chapter-68": { chapter: 75, title: "矩形树图（px.treemap）", module: "plotly", kind: "lesson" },
  "course-chapter-69": { chapter: 76, title: "旭日图（px.sunburst）", module: "plotly", kind: "lesson" },
  "course-chapter-70": { chapter: 77, title: "漏斗图（px.funnel）", module: "plotly", kind: "lesson" },
  "course-chapter-71": { chapter: 78, title: "瀑布图（Waterfall）", module: "plotly", kind: "lesson" },
  "course-chapter-72": { chapter: 79, title: "时间线与甘特图（px.timeline）", module: "plotly", kind: "lesson" },
  "course-chapter-73": { chapter: 80, title: "地图图表（Map / Geo）", module: "plotly", kind: "lesson" },
  "course-chapter-74": { chapter: 81, title: "子图、控件与导出", module: "plotly", kind: "lesson" },
  "course-chapter-75": { chapter: 82, title: "在线零售用户消费与RFM", module: "projects", kind: "project" },
  "course-chapter-76": { chapter: 83, title: "Olist电商物流履约分析", module: "projects", kind: "project" },
  "course-chapter-77": { chapter: 84, title: "共享单车需求与运力调度", module: "projects", kind: "project" },
  "course-chapter-78": { chapter: 85, title: "银行客户营销转化分析", module: "projects", kind: "project" },
  "module-intro-machine-learning": { chapter: 86, title: "机器学习模块入门", module: "machine-learning", kind: "intro" },
  "course-chapter-79": { chapter: 87, title: "Scikit-learn工作流与数据切分", module: "machine-learning", kind: "lesson" },
  "course-chapter-80": { chapter: 88, title: "数据预处理与Pipeline", module: "machine-learning", kind: "lesson" },
  "course-chapter-81": { chapter: 89, title: "线性回归与正则化", module: "machine-learning", kind: "lesson" },
  "course-chapter-82": { chapter: 90, title: "逻辑回归分类", module: "machine-learning", kind: "lesson" },
  "course-chapter-83": { chapter: 91, title: "K近邻模型（KNN）", module: "machine-learning", kind: "lesson" },
  "course-chapter-84": { chapter: 92, title: "决策树", module: "machine-learning", kind: "lesson" },
  "course-chapter-85": { chapter: 93, title: "随机森林", module: "machine-learning", kind: "lesson" },
  "course-chapter-86": { chapter: 94, title: "梯度提升模型", module: "machine-learning", kind: "lesson" },
  "course-chapter-87": { chapter: 95, title: "支持向量机（SVM）", module: "machine-learning", kind: "lesson" },
  "course-chapter-88": { chapter: 96, title: "朴素贝叶斯", module: "machine-learning", kind: "lesson" },
  "course-chapter-89": { chapter: 97, title: "K-Means聚类", module: "machine-learning", kind: "lesson" },
  "course-chapter-90": { chapter: 98, title: "主成分分析（PCA）", module: "machine-learning", kind: "lesson" },
  "course-chapter-91": { chapter: 99, title: "交叉验证与超参数调优", module: "machine-learning", kind: "lesson" },
  "course-chapter-92": { chapter: 100, title: "不平衡分类与阈值选择", module: "machine-learning", kind: "lesson" },
  "course-chapter-93": { chapter: 101, title: "随机森林回归", module: "machine-learning", kind: "lesson" },
  "course-chapter-94": { chapter: 102, title: "梯度提升与加法模型", module: "machine-learning", kind: "lesson" },
  "course-chapter-95": { chapter: 103, title: "多分类与Softmax", module: "machine-learning", kind: "lesson" },
  "course-chapter-96": { chapter: 104, title: "混淆矩阵与分类指标", module: "machine-learning", kind: "lesson" },
  "course-chapter-97": { chapter: 105, title: "ROC、PR曲线与决策阈值", module: "machine-learning", kind: "lesson" },
  "course-chapter-98": { chapter: 106, title: "类别不平衡与Top-K Lift", module: "machine-learning", kind: "lesson" },
  "course-chapter-99": { chapter: 107, title: "概率校准与Brier Score", module: "machine-learning", kind: "lesson" },
  "course-chapter-100": { chapter: 108, title: "K-Means客户分群实战", module: "machine-learning", kind: "lesson" },
  "course-chapter-101": { chapter: 109, title: "层次聚类与DBSCAN", module: "machine-learning", kind: "lesson" },
  "course-chapter-102": { chapter: 110, title: "PCA降维与可视化", module: "machine-learning", kind: "lesson" },
  "course-chapter-103": { chapter: 111, title: "交叉验证策略", module: "machine-learning", kind: "lesson" },
  "course-chapter-104": { chapter: 112, title: "GridSearch与随机搜索", module: "machine-learning", kind: "lesson" },
  "course-chapter-105": { chapter: 113, title: "模型比较与基线", module: "machine-learning", kind: "lesson" },
  "course-chapter-106": { chapter: 114, title: "特征选择与模型解释", module: "machine-learning", kind: "lesson" },
  "course-chapter-107": { chapter: 115, title: "模型保存与批量推理", module: "machine-learning", kind: "lesson" },
  "course-chapter-108": { chapter: 116, title: "用户消费价值预测项目", module: "machine-learning", kind: "project" },
  "course-chapter-109": { chapter: 117, title: "物流延期风险预测项目", module: "machine-learning", kind: "project" },
  "course-chapter-110": { chapter: 118, title: "共享单车需求预测项目", module: "machine-learning", kind: "project" },
  "course-chapter-111": { chapter: 119, title: "银行营销响应预测项目", module: "machine-learning", kind: "project" },
};















if (!ipynbFiles.length) {
  console.error("❌ 未找到课程 Notebook 文件，请先把 Notebook 放入 public/course/");
  process.exit(1);
}

// ── 解析每个 notebook，提取元数据 ────────────────────────────────────────────
function readNotebookMeta(filePath) {
  try {
    const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return raw?.metadata || {};
  } catch {
    return {};
  }
}

function hasCode(filePath) {
  try {
    const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return (raw?.cells || []).some((cell) => (cell.cell_type || cell.type) === "code");
  } catch {
    return false;
  }
}

// ── 模块 range 重新计算 ───────────────────────────────────────────────────────
function computeModuleRanges(chapters) {
  const ranges = new Map();
  for (const ch of chapters) {
    if (ch.kind === "capstone" || ch.kind === "extra" || !Number.isFinite(ch.chapter) || ch.chapter <= 0) continue;
    if (!ranges.has(ch.module)) ranges.set(ch.module, { min: ch.chapter, max: ch.chapter });
    const r = ranges.get(ch.module);
    if (ch.chapter < r.min) r.min = ch.chapter;
    if (ch.chapter > r.max) r.max = ch.chapter;
  }
  return ranges;
}

// ── 构建章节列表 ──────────────────────────────────────────────────────────────
const rawChapters = ipynbFiles.map(({ name, chapter, sortOrder, filePath, relativePath, isCapstone }) => {
  const nbMeta = readNotebookMeta(filePath);
  // 兼容嵌套 metadata.course 规范：展开到顶层以便 title/module/chapter 统一使用
  const nbMetaFlat = { ...nbMeta, ...(nbMeta.course || {}) };
  const namedFallback = namedChapterMeta[name];
  const fallback = dataByChapter.get(chapter);
  // 权威展示映射优先：修正 data.js 历史错位，保证侧边栏顺序正确
  const display = DISPLAY_MAP[name.replace(/\.ipynb$/, '')];
  const chapterOffset = Number.isFinite(chapter) && chapter >= 14 ? 1 : 0;
  const canonicalChapter = display ? display.chapter : (Number.isFinite(chapter) ? chapter + chapterOffset : chapter);
  const canonicalSortOrder = Number.isFinite(sortOrder) ? sortOrder + chapterOffset : sortOrder;
  const resolvedChapter = Number(display?.chapter ?? nbMetaFlat.chapter ?? nbMeta.chapter ?? canonicalChapter ?? namedFallback?.chapter ?? 0);
  const resolvedSortOrder = Number(nbMeta.sort_order ?? canonicalSortOrder ?? namedFallback?.sortOrder ?? resolvedChapter);
  const finalSortOrder = display ? (display.kind === "intro" ? display.chapter - 0.25 : display.chapter) : resolvedSortOrder;
  const title = display?.title || nbMetaFlat.title || nbMeta.chapter_title || fallback?.title || namedFallback?.title || (isCapstone ? '模块大作业' : `第${resolvedChapter}章`);
  const module = nbMetaFlat.module || nbMeta.chapter_module || fallback?.module || namedFallback?.module || "python";
  const kind = display?.kind || nbMetaFlat.chapter_kind || fallback?.kind || namedFallback?.kind || "lesson";
  const estimatedMinutes = Number(nbMeta.estimated_minutes) || fallback?.estimatedMinutes || namedFallback?.estimatedMinutes || 45;
  const tags = Array.isArray(nbMeta.tags) ? nbMeta.tags : (fallback?.tags || namedFallback?.tags || []);
  const difficulty = nbMeta.difficulty || fallback?.difficulty || undefined;
  const description = nbMeta.description || fallback?.description || undefined;
  // 模块大作业的稳定 id 从文件名推断(capstone-numpy / capstone-pandas ...),
  // 避免遗漏 course_id 时退化为与教学章节冲突的 chapter-* 编号。
  const capstoneId = isCapstone
    ? `capstone-${name.replace(/^module-capstone-/, "").replace(/\.ipynb$/, "")}`
    : null;
  // intro 章用 intro-<module> 唯一 id（display.chapter 可能与技术章撞名）
  const id = display && display.kind === "intro"
    ? "intro-" + display.module
    : (display ? "chapter-" + display.chapter : (nbMeta.course_id || capstoneId || namedFallback?.id || (Number.isFinite(chapter) ? "chapter-" + chapter : "chapter-" + resolvedChapter)));
  const label = nbMeta.chapter_label || namedFallback?.label || (isCapstone ? title : `第${resolvedChapter}章 ${title}`);
  const entry = {
    id,
    chapter: resolvedChapter,
    sortOrder: finalSortOrder,
    title,
    label,
    module,
    path: `/course/${relativePath || name}`,
    kind,
    estimatedMinutes,
    hasCode: hasCode(filePath),
    tags,
  };
  if (difficulty) entry.difficulty = difficulty;
  if (description) entry.description = description;
  return entry;
});

// 模块大作业必须永远位于所属模块的最后一个教学资源之后。
// 不依赖 Notebook 中可能遗留的旧 sort_order，避免新增章节后大作业重新插回模块中间。
const moduleTeachingEnds = new Map();
for (const entry of rawChapters) {
  if (entry.kind === "capstone") continue;
  const current = moduleTeachingEnds.get(entry.module);
  if (!current || entry.sortOrder > current.sortOrder) {
    moduleTeachingEnds.set(entry.module, { chapter: entry.chapter, sortOrder: entry.sortOrder });
  }
}

const builtChapters = rawChapters.map((entry) => {
  if (entry.kind !== "capstone") return entry;
  const moduleEnd = moduleTeachingEnds.get(entry.module);
  if (!moduleEnd) return entry;
  return {
    ...entry,
    chapter: moduleEnd.chapter,
    sortOrder: moduleEnd.sortOrder + 0.5,
  };
}).sort((a, b) => a.sortOrder - b.sortOrder);

// ── 构建模块列表（保留原始颜色，更新 range）────────────────────────────────────
const ranges = computeModuleRanges(builtChapters);
const builtModules = dataModules.map((mod) => {
  const r = ranges.get(mod.id);
  if (!r) return mod;
  const rangeStr = r.min === r.max ? `第${r.min}章` : `第${r.min}–${r.max}章`;
  return { ...mod, range: rangeStr };
});

// ── 读取旧 catalog 版本号 ─────────────────────────────────────────────────────
let oldVersion = 0;
try {
  oldVersion = JSON.parse(fs.readFileSync(catalogPath, "utf8"))?.version || 0;
} catch { /* 文件不存在时忽略 */ }

const catalog = {
  version: oldVersion + 1,
  modules: builtModules,
  chapters: builtChapters,
};

// ── 输出 ──────────────────────────────────────────────────────────────────────
const output = JSON.stringify(catalog, null, 2);

if (isDryRun) {
  console.log("── DRY RUN：以下是生成的 catalog.json 片段 ──\n");
  console.log(JSON.stringify({ version: catalog.version, chapters: catalog.chapters.slice(0, 3) }, null, 2));
  console.log(`\n共 ${builtChapters.length} 个章节，跨 ${builtModules.filter((m) => ranges.has(m.id)).length} 个模块`);
} else {
  fs.writeFileSync(catalogPath, output, "utf8");
  console.log(`✅ catalog.json 已更新 (v${catalog.version})：${builtChapters.length} 个章节`);
  builtModules.forEach((mod) => {
    const count = builtChapters.filter((ch) => ch.module === mod.id).length;
    if (count) console.log(`   ${mod.label.padEnd(16)} ${count} 章`);
  });
  console.log(`\n📁 文件路径：${catalogPath}`);
}
