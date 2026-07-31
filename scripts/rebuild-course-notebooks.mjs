import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chapters, moduleMap, modules } from "../src/data.js";
import { foundationContexts, foundationProfiles } from "./course-content-foundations.mjs";
import { visualizationProfiles, visualizationSetups } from "./course-content-visualization.mjs";
import { projectProfiles } from "./course-content-projects-business.mjs";
import { machineLearningProfiles } from "./course-content-machine-learning-advanced.mjs";
import { machineLearningProjectProfiles } from "./course-content-machine-learning-projects.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = path.join(root, "public", "course");  // 直接生成到 public/course
const catalogOutputPath = path.join(root, "public", "course", "catalog.json");
const COURSE_CONTENT_VERSION = 14;

const largeOrderSetup = `import numpy as np
import pandas as pd
from js import window

# UCI Machine Learning Repository: Online Retail
# 原始数据 541,909 行；课程使用固定随机种子抽取的 200,000 行子集。
data_url = f"{window.location.origin}/datasets/uci_online_retail_200k.csv"
large_orders = pd.read_csv(
    data_url,
    parse_dates=["InvoiceDate"],
    dtype={"InvoiceNo": "string", "StockCode": "string", "Description": "string", "Country": "category"},
).rename(columns={
    "InvoiceNo": "order_id", "StockCode": "stock_code", "Description": "description",
    "Quantity": "quantity", "InvoiceDate": "order_time", "UnitPrice": "unit_price",
    "CustomerID": "customer_id", "Country": "country",
})
large_orders["sales"] = (large_orders["quantity"] * large_orders["unit_price"]).round(2)
large_orders["status"] = np.where(
    large_orders["order_id"].str.startswith("C") | (large_orders["quantity"] < 0),
    "取消/退货", "完成"
)
print(f"UCI Online Retail 公开数据：{len(large_orders):,} 行 × {large_orders.shape[1]} 列")
print("内存占用：", f"{large_orders.memory_usage(deep=True).sum() / 1024**2:.1f} MB")
large_orders.head()`;

const largeDataCases = {
  16: `print(large_orders.info(memory_usage="deep"))
print("\\n数值列概览：")
display(large_orders[["quantity", "unit_price", "sales"]].describe().round(2))
print("唯一订单数：", large_orders["order_id"].nunique())`,
  17: `completed = large_orders.query("status == '完成' and sales > 0")
high_value = completed.loc[
    completed["sales"] >= completed["sales"].quantile(0.99),
    ["order_id", "stock_code", "description", "country", "sales"]
].sort_values("sales", ascending=False)
print(f"Top 1% 高价值订单：{len(high_value):,} 条")
display(high_value.head(10))`,
  18: `optimized = large_orders.copy()
before_mb = optimized.memory_usage(deep=True).sum() / 1024**2
for column in ["country", "status"]:
    optimized[column] = optimized[column].astype("category")
after_mb = optimized.memory_usage(deep=True).sum() / 1024**2
print(f"类型优化前：{before_mb:.1f} MB，优化后：{after_mb:.1f} MB，节省 {(1-after_mb/before_mb):.1%}")
print(optimized.dtypes)`,
  19: `quality = pd.DataFrame({
    "缺失数": large_orders.isna().sum(),
    "缺失率": large_orders.isna().mean(),
    "唯一值": large_orders.nunique(dropna=False),
}).sort_values("缺失率", ascending=False)
print("完全重复行：", large_orders.duplicated().sum())
print("取消/退货行：", (large_orders["status"] == "取消/退货").sum())
display(quality.head(8))
clean_orders = large_orders.drop_duplicates().query("quantity > 0 and unit_price > 0").dropna(subset=["description"])
print(f"清洗后保留：{len(clean_orders):,} / {len(large_orders):,} 行")`,
  20: `features = large_orders.assign(
    order_date=large_orders["order_time"].dt.date,
    month=large_orders["order_time"].dt.to_period("M").astype("string"),
    weekday=large_orders["order_time"].dt.day_name(),
    hour=large_orders["order_time"].dt.hour,
    is_weekend=large_orders["order_time"].dt.dayofweek >= 5,
    description_clean=large_orders["description"].str.strip().str.title(),
    order_label=large_orders["country"].astype("string").str.cat(large_orders["stock_code"], sep=" / "),
)
display(features[["order_time", "month", "weekday", "hour", "is_weekend", "description_clean", "order_label"]].head())
print("月份跨度：", features["month"].min(), "至", features["month"].max())`,
  21: `loaded = pd.read_csv(
    data_url,
    parse_dates=["InvoiceDate"],
    dtype={"InvoiceNo": "string", "StockCode": "string", "Country": "category"},
)
print(f"从公开 CSV 读取：{loaded.shape}，日期类型：{loaded['InvoiceDate'].dtype}")
display(loaded.head())`,
  22: `summary = (
    large_orders.query("status == '完成'")
    .groupby([large_orders["order_time"].dt.to_period("M"), "country"], observed=True)
    .agg(销售额=("sales", "sum"), 订单数=("order_id", "size"), 客单价=("sales", "mean"))
    .reset_index()
)
pivot = summary.pivot(index="order_time", columns="country", values="销售额")
print(f"聚合前 {len(large_orders):,} 行，聚合后 {len(summary):,} 行")
display(summary.head(10))
display(pivot.tail().round(0))`,
  23: `customer_dimension = (
    large_orders.dropna(subset=["customer_id"])
    .groupby("customer_id", as_index=False)
    .agg(home_country=("country", "first"), first_order=("order_time", "min"))
)
enriched = large_orders.merge(customer_dimension, on="customer_id", how="left", validate="many_to_one", indicator=True)
country_sales = enriched.groupby("home_country", observed=True).agg(
    订单行数=("order_id", "size"), 销售额=("sales", "sum"), 客户数=("customer_id", "nunique")
).sort_values("销售额", ascending=False)
print("连接结果：", enriched.shape, "缺失客户维度：", (enriched["_merge"] != "both").sum())
display(country_sales.head(10).round(2))`,
  24: `daily_sales = (
    large_orders.query("status == '完成'")
    .set_index("order_time")["sales"]
    .resample("D").sum()
    .to_frame("sales")
)
daily_sales["rolling_7d"] = daily_sales["sales"].rolling(7, min_periods=1).mean()
daily_sales["rolling_30d"] = daily_sales["sales"].rolling(30, min_periods=7).mean()
daily_sales["growth_7d"] = daily_sales["sales"].pct_change(7)
daily_sales["z_score"] = (daily_sales["sales"] - daily_sales["sales"].mean()) / daily_sales["sales"].std()
print(f"从 {len(large_orders):,} 笔订单得到 {len(daily_sales):,} 天趋势")
display(daily_sales.tail(10).round(3))
display(daily_sales.nlargest(5, "z_score").round(2))`
};

const sourceLines = (source) => {
  const normalized = `${String(source ?? "").trim()}\n`;
  return normalized.match(/[^\n]*\n|[^\n]+$/g) || [];
};

const markdown = (id, source) => ({
  id,
  cell_type: "markdown",
  metadata: {},
  source: sourceLines(source)
});

const code = (id, source, tags = [], options = {}) => ({
  id,
  cell_type: "code",
  execution_count: null,
  metadata: {
    ...(tags.length ? { tags } : {}),
    ...(options.sourceHidden ? { jupyter: { source_hidden: true } } : {})
  },
  outputs: [],
  source: sourceLines(source)
});

const summarySection = (id, source) => ({ id, source });
const renderSummarySections = (sections) => sections.map(({ id, source }) => markdown(id, source));

const bullets = (items) => items.map((item) => `- ${item}`).join("\n");
const numbered = (items) => items.map((item, index) => `${index + 1}. ${item}`).join("\n");
const checklist = (items) => items.map((item) => `- [ ] ${item}`).join("\n");
const escapeTableCell = (value) => String(value).replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
const markdownTable = (headers, rows) => [
  `| ${headers.map(escapeTableCell).join(" | ")} |`,
  `| ${headers.map(() => "---").join(" | ")} |`,
  ...rows.map((row) => `| ${row.map(escapeTableCell).join(" | ")} |`)
].join("\n");
const keySyntax = (source) => {
  const snippets = [];
  const seen = new Set();
  const seenMethods = new Set();
  // Blacklist of generic functions to exclude
  const genericFunctions = new Set(['print', 'type', 'len', 'range']);

  const add = (value) => {
    const normalized = value.trim();
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    snippets.push(normalized);
  };

  for (const match of String(source).matchAll(/\b[A-Za-z_]\w*(?:\.[A-Za-z_]\w*)+\s*\(/g)) {
    const snippet = match[0].replace(/\s*\($/, "()");
    add(snippet);
    seenMethods.add(snippet.match(/\.([A-Za-z_]\w*)\(\)$/)?.[1]);
  }
  for (const match of String(source).matchAll(/\.([A-Za-z_]\w*)\s*\(/g)) {
    const method = match[1];
    if (!seenMethods.has(method)) {
      add(`.${method}()`);
      seenMethods.add(method);
    }
  }
  for (const match of String(source).matchAll(/\b[A-Za-z_]\w*\[[^\]\n]{1,32}\]/g)) {
    add(match[0]);
  }
  for (const match of String(source).matchAll(/\b(?:sum|min|max|sorted|enumerate|zip|open|int|float|str|bool|list|tuple|dict|set)\s*\(/g)) {
    const funcName = match[0].replace(/\s*\($/, "");
    if (!genericFunctions.has(funcName)) {
      add(funcName + "()");
    }
  }

  return snippets.slice(0, 4).map((snippet) => `\`${snippet}\``).join("、") || "参见本节示例";
};
const table = (rows) => [
  "| 字段 | 含义 | 使用说明 |",
  "| --- | --- | --- |",
  ...rows.map((row) => `| ${row[0]} | ${row[1]} | ${row[2]} |`)
].join("\n");

const lessonContext = (lesson, profile) => {
  const moduleLabel = moduleMap[lesson.module]?.label || lesson.module;
  const foundationContext = foundationContexts[lesson.chapter];
  if (lesson.module === "python" && foundationContext) {
    return foundationContext;
  }
  if (lesson.chapter >= 76 && lesson.chapter < 105) {
    const focus = lesson.title || "本章方法";
    const objectives = profile?.objectives?.slice(0, 3) || [];
    return {
      scenario: `围绕“${focus}”完成一个可验证的小型建模实验：先明确输入和目标，再比较方法带来的变化。${profile?.summary || ""}`,
      position: `这是“${moduleLabel}”建模主线中的第 ${lesson.chapter} 章，重点放在“${focus}”对应的一个具体决策，而不是重复完整流程。`,
      prerequisites: [
        "能够使用 pandas 读取、筛选和汇总数据",
        "理解训练集、测试集和基本统计指标",
        objectives.length ? `本章会进一步练习：${objectives.join("、")}` : "知道如何从 Notebook 从上到下复现结果"
      ],
      output: `完成一份围绕“${focus}”的可运行实验：包含数据准备、方法执行、指标或图表证据，以及一句有边界的结论。`
    };
  }
  if (lesson.module === "numpy" || lesson.module === "pandas") {
    const focus = lesson.title || "本章数据操作";
    const objective = profile?.objectives?.[0] || "完成一次可核对的数据处理";
    return {
      scenario: `拿一组小型业务数据练习“${focus}”：先看数据结构，再完成一次明确的计算或转换。${profile?.summary || ""}`,
      position: `这是“${moduleLabel}”路线中第 ${lesson.chapter} 章的操作重点。本章只解决“${focus}”，不重复前面章节已经完成的准备工作。`,
      prerequisites: [
        lesson.module === "numpy" ? "掌握 Python 列表、切片和基本运算" : "掌握 Python 基础语法、列表和字典",
        `开始前先确认：${objective}`
      ],
      output: `产出一个与“${focus}”直接对应的结果，并记录输入形状、字段或筛选口径。`
    };
  }
  const contexts = {
    python: {
      scenario: "先用几个变量算出一个结果，再观察 Notebook 怎样保存变量、显示输出，以及为什么运行顺序会影响结果。",
      position: "这是课程的起点。后面的 NumPy、Pandas 和机器学习代码，都依赖这里的运行方式。",
      prerequisites: ["会使用浏览器打开并运行 Notebook", "能区分代码单元格和 Markdown 单元格"],
      output: "完成一个包含输入、计算、检查和文字结论的小型分析。"
    },
    numpy: {
      scenario: "当数据从几个数扩展到成批的数值时，使用数组和向量化计算提高效率，并保持形状和单位清晰。",
      position: "NumPy 是后续 Pandas、科学计算和机器学习数值输入的基础。",
      prerequisites: ["掌握 Python 基础数据类型和切片", "理解行、列、维度等基本概念"],
      output: "完成一次数组创建、变形、计算和结果验证。"
    },
    pandas: {
      scenario: "把真实业务表格整理成可分析的数据集：先认识字段，再清洗质量问题，最后计算能回答业务问题的指标。",
      position: "Pandas 连接 Python 基础与可视化、机器学习，是课程中最常用的数据处理工具。",
      prerequisites: ["掌握 Python 基础语法和列表/字典", "理解列、行、索引和缺失值"],
      output: "产出一张结构清晰、口径明确、可继续分析的 DataFrame。"
    }
  };
  return contexts[lesson.module] || {
    scenario: "从一个明确的问题出发，完成数据准备、分析动作和结果解释。",
    position: `这是“${moduleLabel}”学习路线中的实践章节。`,
    prerequisites: ["能够运行 Notebook 代码", "能够阅读表格和图表输出"],
    output: "完成一个可复现的分析结果，并用文字说明结论和限制。"
  };
};

const practiceGuide = (lesson, profile) => {
  const firstTask = profile.practice?.[0] || "完成示例中的核心操作";
  const secondTask = profile.practice?.[1] || "改变一个参数并比较结果";
  const transferTask = profile.practice?.[2] || "把方法迁移到一份相似的数据";
  return `## 练习路径\n\n1. **跟练**：先运行示例，确认输出结构，再完成“${firstTask}”。\n2. **独立完成**：不复制示例代码，完成“${secondTask}”，并保留一个中间结果用于检查。\n3. **迁移挑战**：尝试“${transferTask}”，用一两句话说明你修改了什么。\n\n### 完成标准\n\n- 代码从上到下运行不报错，关键变量类型和形状符合预期。\n- 至少输出一个可核对的数值、表格或图形，并写明计算口径。\n- 结论能够回答任务问题，同时说明一个限制或未验证的假设。\n\n### 分级提示\n\n- **提示 1**：先复用示例中的数据结构和变量命名。\n- **提示 2**：把任务拆成“准备数据 → 计算 → 检查 → 表达”四步。\n- **提示 3**：运行隐藏答案前，先用 type()、shape、head() 或断言定位问题。`;
};

const projectTeachingPlan = (lesson, profile) => {
  const isMl = lesson.chapter >= 105;
  const deliverables = isMl
    ? ["一份从数据审计到模型评价可完整运行的 Notebook", "数据清洗前后样本变化和关键质量检查结果", "基线与候选模型的指标对比表", "错误切片、特征解释和有边界的业务结论"]
    : ["一份可复现的分析 Notebook", "清洗规则与关键指标表", "至少一张支持结论的图表", "结论、限制和下一步建议"];
  const checkpoints = isMl
    ? ["数据与目标定义完成：样本粒度、预测时点和指标已写清楚", "基线完成：知道复杂模型相对什么标准比较", "模型评价完成：测试集只使用一次，并检查误差切片", "交付完成：结论与证据对应，不把相关性写成因果"]
    : ["问题和数据字典完成", "质量检查和清洗记录完成", "核心指标或图表完成", "结论与限制完成"];
  return `## 项目交付物\n\n${bullets(deliverables)}\n\n## 阶段检查点\n\n${checklist(checkpoints)}\n\n## 最低完成标准\n\n- 每个代码阶段都有可见输出，不能依赖未展示的隐藏状态。\n- 所有关键清洗、筛选和评价口径都写在 Markdown 或注释中。\n- 最终结论至少引用一个数值或图表证据，并说明适用范围。\n\n## 提升任务\n\n完成基础验收后，可以增加一个对照方案、一个分组切片或一个参数敏感性实验，比较结果是否稳定。`;
};

const foundationSummary = (lesson, profile) => {
  const quickRows = profile.examples.map((example) => [
    example.title,
    example.explanation,
    example.keySyntax || keySyntax(example.code)
  ]);
  const checks = profile.objectives.map((objective) => `能够${objective}`);

  return [
    summarySection("summary-intro", `## 本章小结\n\n${profile.summaryQuestion || profile.summary}`),
    summarySection("summary-mastery", `### 你已经掌握\n\n${bullets(profile.objectives)}`),
    summarySection("summary-output", `### 验收标准\n\n- 输入、计算和输出单元格完整。\n- 关键变量类型、形状或数值可核对。\n- 结论引用输出证据，并注明适用范围。`),
    summarySection("summary-reference", `### 关键知识速查\n\n${markdownTable(["知识点", "作用与提醒", "关键写法"], quickRows)}`),
    summarySection("summary-pitfalls", `### 需要注意\n\n${bullets(profile.pitfalls)}`),
    summarySection("summary-checklist", `### 完成检查\n\n${checklist(checks)}`),
    summarySection("summary-next", `### 排错顺序\n\n1. 从上到下重新运行依赖单元格。\n2. 检查变量类型、列名、形状和缺失值。\n3. 缩小输入范围，定位产生错误的最小步骤。\n4. 修复后重新运行完整流程。`)
  ];
};

const visualizationSummary = (lesson, profile) => {
  const parameterRows = profile.parameters.map((item) => {
    const [name, ...description] = item.split(/[：:]/);
    return [`\`${name.trim()}\``, description.join("：").trim() || "控制图表表达方式"];
  });
  const checks = [
    `能判断什么问题适合使用${lesson.title}`,
    "能准备符合要求的数据结构",
    "能独立完成基础图表和一个进阶变体",
    "能调整关键参数并解释视觉变化",
    "能根据图表写出有边界的数据结论"
  ];

  return [
    summarySection("summary-intro", `## 本章小结\n\n${profile.summary}`),
    summarySection("summary-mastery", `### 你已经掌握\n\n- 判断${lesson.title}的适用场景\n- 准备与图表匹配的数据结构\n- 从基础图表扩展到分组、注释或交互变体\n- 按照业务问题解读图表并说明结论边界`),
    summarySection("summary-reference", `### 图表选择速查\n\n${markdownTable(["选择要点", "本章说明"], [
      ["适用场景", profile.when],
      ["数据结构", profile.dataShape],
      ["结果解读", profile.interpretation]
    ])}`),
    summarySection("summary-parameters", `### 关键参数\n\n${markdownTable(["参数", "作用"], parameterRows)}`),
    summarySection("summary-pitfalls", `### 需要注意\n\n${bullets(profile.pitfalls)}`),
    summarySection("summary-checklist", `### 完成检查\n\n${checklist(checks)}`),
    summarySection("summary-next", `### 下一步推荐\n\n把同一图表迁移到另一份数据，先保留同样的编码，再只改变一个维度。比较迁移前后的可读性，并说明哪些结论仍然成立。`)
  ];
};

const projectSummary = (lesson, profile) => {
  const taskRows = profile.tasks.map((task, index) => [`步骤 ${index + 1}`, task]);
  const reminders = [...profile.qualityChecks.slice(0, 3), ...profile.conclusions];
  const isTeachingProject = lesson.chapter >= 105;

  return [
    summarySection("summary-intro", `## 本章小结\n\n${profile.summary}`),
    summarySection("summary-mastery", `### 你已经完成\n\n${bullets(profile.objectives)}`),
    summarySection("summary-reference", `### ${isTeachingProject ? "建模流程速查" : "项目流程速查"}\n\n${markdownTable(["阶段", isTeachingProject ? "学习内容" : "交付内容"], taskRows)}`),
    summarySection("summary-reminders", `### 质量与结论提醒\n\n${bullets(reminders)}`),
    summarySection("summary-checklist", `### ${isTeachingProject ? "学习检查" : "项目交付检查"}\n\n${checklist(profile.acceptance)}`),
    summarySection("summary-next", `### 后续迭代建议\n\n完成验收后，记录一个最值得继续验证的假设：可以是更多数据、不同时间窗口、另一种模型，或一个更细的分组分析。`)
  ];
};

const createNotebook = (lesson, cells) => ({
  cells,
  metadata: {
    course_content_version: COURSE_CONTENT_VERSION,
    generated_by: "course-notebook-generator",
    course: {
      chapter: lesson.chapter,
      module: lesson.module,
      title: lesson.title,
      file_name: path.basename(decodeURIComponent(lesson.path))
    },
    kernelspec: {
      display_name: "Python 3",
      language: "python",
      name: "python3"
    },
    language_info: {
      name: "python",
      version: "3.x",
      pygments_lexer: "ipython3"
    }
  },
  nbformat: 4,
  nbformat_minor: 5
});

const foundationCells = (lesson, profile) => {
  const context = lessonContext(lesson, profile);
  const cells = [
    markdown("intro", `# ${lesson.label}\n\n${profile.summary}`),
    markdown("context-scenario", `## 先解决一个小问题\n\n${context.scenario}`),
    markdown("context-position", `## 这章为什么先学\n\n${context.position}`),
    markdown("context-prerequisites", `## 开始前确认\n\n${bullets(context.prerequisites)}`),
    markdown("context-output", `## 做完要留下什么\n\n${context.output}`),
    markdown("context-execution", `## 运行规则\n\n代码单元格按依赖顺序执行；需要复现结果时从上到下运行，并保留输入、计算和输出。`),
    markdown("context-objectives", `## 本章要会\n\n${bullets(profile.objectives)}`),
    markdown("concepts", `## 核心概念\n\n${bullets(profile.concepts)}`),
    ...(profile.detailNotes ? [markdown("concepts-detail", profile.detailNotes)] : [])
  ];

  profile.examples.forEach((example, index) => {
    const number = index + 1;
    cells.push(
      markdown(`example-${number}-notes`, `## 示例 ${number}：${example.title}\n\n${example.explanation}`),
      code(`example-${number}`, example.code)
    );
  });

  if (lesson.chapter >= 76 && lesson.chapter < 105) {
    cells.push(
      markdown("modeling-workflow", `## 建模流程提醒\n\n1. **定义问题**：写清楚样本粒度、预测时点、目标变量和业务代价。\n2. **建立基线**：先用均值、规则或 Dummy 模型得到最低可接受结果。\n3. **准备数据**：只用预测时点可获得的信息，避免目标泄漏和时间穿越。\n4. **训练与验证**：在训练/验证数据上选择方案，测试集只用于最终估计泛化表现。\n5. **评价与解释**：同时看总体指标、错误切片和结果边界，不能只报一个分数。`)
    );
  }

  if (largeDataCases[lesson.chapter]) {
    cells.push(
      markdown("large-data-notes", "## 公开大型数据实战\n\n下面使用 UCI Machine Learning Repository 的 Online Retail 公开数据集。原始数据包含 541,909 条英国在线零售交易，本课程使用固定随机种子抽取的 200,000 行子集。分析时在完整子集上计算，只展示摘要或少量样本。"),
      code("large-data-setup", largeOrderSetup),
      code("large-data-case", largeDataCases[lesson.chapter])
    );
  }

  cells.push(
    markdown("pitfalls", `## 常见误区\n\n${bullets(profile.pitfalls)}`),
    markdown("practice-notes", `## 综合练习\n\n${numbered(profile.practice)}\n\n提交前检查：代码可从上到下运行，关键中间结果可核对，结论注明计算口径。\n\n${practiceGuide(lesson, profile)}`)
  );

  // Add practice scaffold if provided
  if (profile.practiceScaffold) {
    cells.push(code("practice-scaffold", profile.practiceScaffold));
  }

  // Add solution with assert statements
  const solutionCode = profile.practiceCode + (profile.practiceAssert ? `\n\n# 自检\n${profile.practiceAssert}` : "");
  cells.push(code("practice-solution", solutionCode, ["solution"], { sourceHidden: true }));

  cells.push(...renderSummarySections(foundationSummary(lesson, profile)));
  return cells;
};

const visualizationCells = (lesson, profile) => {
  const setup = visualizationSetups[lesson.module];
  const cells = [
    markdown("intro", `# ${lesson.label}\n\n${profile.summary}\n\n## 学习目标\n\n本章围绕一种明确的图表结构展开，先看最小可用示例，再加入分组、注释或交互细节。学习重点不是“把图画出来”，而是让图表服务于一个可回答的问题。`),
    markdown("when", `## 适用场景\n\n${profile.when}\n\n## 数据结构\n\n${profile.dataShape}\n\n## 本章练习任务\n\n${profile.practiceTask || "明确要比较的变量，改变一个关键参数，记录视觉变化，并说明这个变化是否让结论更清楚。"}`),
    markdown("setup-notes", "## 0. 准备可复现数据\n\n先完成导入和数据准备，后续单元格只负责一种图表或一种分析动作。"),
    code("setup", setup),
    markdown("basic-notes", "## 1. 基础图表\n\n先保留必要的编码：位置、颜色或大小。图表标题、坐标轴和单位应能让读者脱离代码理解结果。"),
    code("basic-chart", profile.basicCode),
    markdown("advanced-notes", "## 2. 进阶变体\n\n在基础图表可读的前提下增加分组、布局、注释或交互。新增编码必须服务于一个明确问题。"),
    code("advanced-chart", profile.advancedCode),
    markdown("parameters", `## 3. 参数说明\n\n${bullets(profile.parameters)}`),
    markdown("interpretation", `## 4. 结果解读\n\n${profile.interpretation}`),
    markdown("pitfalls", `## 常见误区\n\n${bullets(profile.pitfalls)}`),
    markdown("practice-notes", "## 综合练习\n\n请使用同一份数据完成下面任务，并说明你选择该图表的原因。完成后补充：图表回答了什么问题、最重要的视觉信号是什么、还有哪些信息无法从图中得出。"),
    code("practice", profile.practice, ["exercise"]),
    ...renderSummarySections(visualizationSummary(lesson, profile))
  ];
  return cells;
};

const projectCells = (lesson, profile) => {
  const cells = [
    markdown("intro", `# ${lesson.label}\n\n${profile.summary}\n\n## 项目背景\n\n${profile.background}\n\n## 学习目标\n\n${bullets(profile.objectives)}`),
    markdown("data-dictionary", `## 数据字典\n\n${table(profile.dataDictionary)}\n\n## 数据质量检查清单\n\n${bullets(profile.qualityChecks)}`),
    markdown("tasks", `## 项目任务\n\n${numbered(profile.tasks)}`),
    markdown("teaching-plan", projectTeachingPlan(lesson, profile))
  ];

  profile.codeCells.forEach((cell, index) => {
    const id = `project-${cell.title.split(".")[0].replace(/\D/g, "") || cells.length}`;
    cells.push(
      markdown(`${id}-notes`, `## ${cell.title}\n\n${cell.explanation}`),
      code(id, cell.code, index === profile.codeCells.length - 1 ? ["exercise"] : [])
    );
  });

  cells.push(
    markdown("conclusions", `## 结论与表达\n\n${bullets(profile.conclusions)}`),
    markdown("acceptance-notes", `## 项目验收清单\n\n${bullets(profile.acceptance)}\n\n建议重新启动内核后从第一个代码单元格运行，确认项目不依赖隐藏状态。`),
    ...renderSummarySections(projectSummary(lesson, profile))
  );
  return cells;
};

const contentForLesson = (lesson) => {
  if (lesson.chapter <= 24) return foundationCells(lesson, foundationProfiles[lesson.chapter]);
  if (lesson.chapter <= 71) return visualizationCells(lesson, visualizationProfiles[lesson.chapter]);
  if (lesson.chapter <= 75) return projectCells(lesson, projectProfiles[lesson.chapter]);
  if (lesson.chapter >= 105) return projectCells(lesson, machineLearningProjectProfiles[lesson.chapter]);
  return foundationCells(lesson, machineLearningProfiles[lesson.chapter]);
};

const catalogFromNotebooks = () => {
  const moduleDetails = Object.fromEntries(modules.map((module) => [module.id, module]));
  const chaptersFromFiles = fs.readdirSync(outputDirectory)
    .filter((name) => name.endsWith(".ipynb") && name !== "00_课程环境初始化.ipynb")
    .map((name) => {
      const notebook = JSON.parse(fs.readFileSync(path.join(outputDirectory, name), "utf8"));
      const course = notebook.metadata?.course || {};
      const chapter = Number(course.chapter || name.match(/第(\d+)章/)?.[1]);
      const module = course.module
        || modules.find((item) => name.startsWith(`${item.label}-`))?.id
        || name.match(/^(.*?)-第\d+章-/)?.[1]
        || "other";
      const title = course.title || name.replace(/^.*?-第\d+章-/, "").replace(/\.ipynb$/, "");
      return {
        id: `chapter-${chapter}`,
        chapter,
        title,
        label: `第${chapter}章 ${title}`,
        module,
        path: `/course/${encodeURIComponent(name)}`,  // 统一使用 /course/ 路径
        kind: (chapter >= 72 && chapter <= 75) || chapter >= 105 ? "project" : "lesson",
        estimatedMinutes: (chapter >= 72 && chapter <= 75) || chapter >= 105 ? 120 : chapter >= 76 ? 55 : chapter === 1 ? 25 : 35 + (chapter % 3) * 5,
        hasCode: notebook.cells?.some((cell) => cell.cell_type === "code") || false,
        tags: chapter <= 10 ? ["语法", "基础"] : chapter <= 24 ? ["数据处理"] : chapter <= 71 ? ["可视化", "实践"] : chapter <= 75 || chapter >= 105 ? ["项目", "机器学习"] : ["机器学习", "sklearn"]
      };
    })
    .filter((lesson) => Number.isFinite(lesson.chapter))
    .sort((left, right) => left.chapter - right.chapter);

  const discoveredModules = [...new Set(chaptersFromFiles.map((lesson) => lesson.module))]
    .map((id) => ({ id, firstChapter: chaptersFromFiles.find((lesson) => lesson.module === id)?.chapter ?? Number.MAX_SAFE_INTEGER }))
    .sort((left, right) => left.firstChapter - right.firstChapter);

  return {
    version: COURSE_CONTENT_VERSION,
    modules: discoveredModules.map(({ id }) => {
      const known = moduleDetails[id];
      const chapterNumbers = chaptersFromFiles.filter((lesson) => lesson.module === id).map((lesson) => lesson.chapter);
      return {
        id,
        label: known?.label || id,
        range: chapterNumbers.length === 1 ? `第${chapterNumbers[0]}章` : `第${Math.min(...chapterNumbers)}–${Math.max(...chapterNumbers)}章`,
        color: known?.color || "#64748B"
      };
    }),
    chapters: chaptersFromFiles
  };
};

fs.mkdirSync(outputDirectory, { recursive: true });
for (const entry of fs.readdirSync(outputDirectory, { withFileTypes: true })) {
  if (entry.isFile() && entry.name.endsWith(".ipynb") && entry.name !== "00_课程环境初始化.ipynb") {
    const notebookPath = path.join(outputDirectory, entry.name);
    try {
      const notebook = JSON.parse(fs.readFileSync(notebookPath, "utf8"));
      if (notebook.metadata?.generated_by === "course-notebook-generator") fs.unlinkSync(notebookPath);
    } catch {
      // Keep custom or incomplete notebooks so they can be repaired separately.
    }
  }
}

for (const lesson of chapters) {
  const cells = contentForLesson(lesson);
  if (!cells.length || !cells.some((cell) => cell.cell_type === "code")) {
    throw new Error(`第${lesson.chapter}章没有可运行代码`);
  }
  const notebook = createNotebook(lesson, cells);
  const fileName = path.basename(decodeURIComponent(lesson.path));
  const outputPath = path.join(outputDirectory, fileName);
  fs.writeFileSync(outputPath, `${JSON.stringify(notebook, null, 2)}\n`, "utf8");
  console.log(`Generated ${fileName} (${cells.length} cells, ${moduleMap[lesson.module]?.label || lesson.module})`);
}

console.log(`Generated ${chapters.length} course notebooks in ${outputDirectory}`);

fs.mkdirSync(path.dirname(catalogOutputPath), { recursive: true });
fs.writeFileSync(catalogOutputPath, `${JSON.stringify(catalogFromNotebooks(), null, 2)}\n`, "utf8");
console.log(`Generated course catalog at ${catalogOutputPath}`);
