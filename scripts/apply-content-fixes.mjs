#!/usr/bin/env node
// ============================================================
// apply-content-fixes.mjs — 内容缺口修复（分批落地，高风险最小化）
//
// 只处理"可安全、无歧义"的改动；复杂/歧义项一律进人工清单，绝不生成可能报错的代码。
// 可配合 --only objectives|assert|deprefill|quickref 与 --limit N 分批。
// 每批改完后单独跑校验脚本（normalize-notebook-architecture.py --check 与 sync-catalog.mjs --dry-run）。
//
// 用法：
//   node scripts/apply-content-fixes.mjs --only objectives --report .tmp-obj-report.json --dry-run
//   node scripts/apply-content-fixes.mjs --only assert --dry-run
//   node scripts/apply-content-fixes.mjs --only assert   # 真实写文件
// ============================================================

import { readFileSync, readdirSync, existsSync, writeFileSync, copyFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, basename } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const COURSE_DIR = process.env.GAP_COURSE_DIR || join(ROOT, "public", "course");

const args = process.argv.slice(2);
const only = (args.includes("--only") ? args[args.indexOf("--only") + 1] : "all").split(",").map(s=>s.trim()).filter(Boolean);
const DRY = args.includes("--dry-run");
const reportArg = args.includes("--report") ? args[args.indexOf("--report") + 1] : null;
const limitArg = args.includes("--limit") ? parseInt(args[args.indexOf("--limit") + 1], 10) : Infinity;

const SELF_CHECK_TAGS = new Set(["solution", "answer", "check", "teacher-answer"]);
const SOLUTION_PREFIX = "solution-step-";
const EXERCISE_TAG = "exercise";
const OBJECTIVE_RE = /学完本[章节]|本章目标|学习目标|你将学会|学生能够|学完本节|你将能够/;
const SCENE_RE = /^##\s*本章场景/;
const SCAFFOLD_COMMENT_RE = /#\s*请在下方填写|#\s*TODO|#\s*待填写|#\s*请在.*填写/;

const tagList = (cell) => (cell.metadata?.tags || []).map(String);
const isSelfCheck = (tags) => tags.some((t) => SELF_CHECK_TAGS.has(t) || t.startsWith(SOLUTION_PREFIX));
const codeOf = (cell) => (cell.source || []).join("");
// nbformat 的 source 是列表：每个元素以 \n 结尾（keepends）。必须保留，否则 '' 拼接会合并行。
const toSourceLines = (text) => text.match(/.*(?:\n|$)/g).filter((m) => m.length > 0);
const setSource = (cell, text) => { cell.source = toSourceLines(text); };
const stripComments = (s) => s.replace(/#.*$/gm, "");
const statementCount = (code) => code.split(/\r?\n/).filter((line) => {
  const t = line.trim();
  return t && !t.startsWith("#") && !/^\s*$/.test(t);
}).length;

// ============================================================
// 1) 学习目标：按章节主题生成"理解/操作/迁移"三行可观察可检验目标
// ============================================================
function titleTopic(title) {
  return title.replace(/^\s*(第[一二三四五六七八九十百\d]+[章节]|[\d]+\.|模块大作业：|模块入门)/, "").trim();
}
function objectiveFor(title) {
  const t = titleTopic(title);
  const isCapstone = /模块大作业/.test(title);
  const cap = isCapstone
    ? {
        understand: "理解本次大作业的业务问题、数据边界与交付评分标准。",
        operate: "按任务合同独立完成数据清洗、分析与结论提炼，产出可复核的可视化/报表。",
        transfer: "把你的分析结论讲成一个能支撑业务行动的决策摘要，并用新一批数据复现同类分析。",
      }
    : { understand: "", operate: "", transfer: "" };

  if (isCapstone) return cap;

  const M = [
    // 模块入门（必须先于通用"入门/Notebook"，否则被误匹配）
    [/NumPy 模块入门/, { understand: "理解 NumPy 在数据分析中的定位（多维数组与向量化计算），以及它和 Python 列表的区别。", operate: "能创建 ndarray、做索引/切片/形状操作与基础运算。", transfer: "能用 NumPy 把一批经营数据转成数组并做批量计算。" }],
    [/Pandas 模块入门/, { understand: "理解 Pandas 的定位：用 Series/DataFrame 组织表格数据，并串联起后续所有数据步骤。", operate: "能创建 DataFrame、读入数据并做基础的取列、筛选与汇总。", transfer: "能把一批订单记录整理成表格并算出地区的汇总经营结果。" }],
    [/Matplotlib 模块入门/, { understand: "理解 Matplotlib 的绘图结构（Figure / Axes）与「创建-绘制-显示」的整体流程。", operate: "能创建画布、画一个基础图形并设置标题/中文显示。", transfer: "能把一列经营数据以图表形式呈现并读懂其中的趋势。" }],
    [/Seaborn 模块入门/, { understand: "理解 Seaborn 在统计可视化上的定位及它与 Matplotlib 的关系。", operate: "能用 seaborn 的接口画出分布/关系类统计图。", transfer: "能对一组分组数据画出统计图并比较不同分组的差异。" }],
    [/Plotly 模块入门/, { understand: "理解 Plotly 面向交互式可视化的定位与图对象（Figure）概念。", operate: "能用 plotly.express 画一个基础交互图并查看 hover。", transfer: "能把一份经营表变成可交互探索的图表用于汇报。" }],
    [/机器学习模块入门/, { understand: "理解机器学习解决什么问题、有哪些任务类型与整体工作流（数据→特征→模型→评估）。", operate: "能完成一次最简单的监督学习训练并读出评估指标。", transfer: "能判断一个业务问题是否适合用机器学习，并搭出第一步流水线。" }],
    // Python 基础
    [/Python.*入门|Notebook/, { understand: "理解程序、Python 解释器与 Notebook 单元格/内核的基本概念，以及执行顺序与输出机制。", operate: "能在 Notebook 中新建并运行单元格，用 print/type/isinstance 输出结果、确认数据类型。", transfer: "能把一段日常收支的描述写成可运行、可读懂输出的代码，遇到报错能读懂关键信息。" }],
    [/变量、数据类型/, { understand: "理解变量、整数/浮点/字符串/布尔、类型转换与运算符优先级。", operate: "能声明变量、做数值与字符串运算，并用 type/isinstance 校验类型。", transfer: "能用一个账单金额变量完成计算，并给出可读的格式化结果。" }],
    [/字符串：从文本/, { understand: "理解字符串不可变、索引/切片、清洗/拆分/拼接/格式化方法。", operate: "能用 strip/lower/replace/split/join/f-string 把脏文本清洗成可用字段。", transfer: "能把一行含空格、大小写、分隔符的账目拆成多个干净字段并重新格式化。" }],
    [/列表：管理/, { understand: "理解列表的增删改查、切片、排序与推导式。", operate: "能用列表方法完成记录的追加、筛选、排序和遍历。", transfer: "能把多条账目记录存入列表，并统计、筛选、排序出想要的子集。" }],
    [/元组：固定/, { understand: "理解元组的不可变、索引与解包、命名元组。", operate: "能用元组表示固定字段并解包到多个变量。", transfer: "能用元组/命名元组组织一条账目记录并安全读取字段。" }],
    [/字典：命名/, { understand: "理解字典的键值对、增删改查、遍历与聚合。", operate: "能用字典读写记录、按 key 聚合统计。", transfer: "能把一组账目聚合成‘分类→总额’的字典并给出结论。" }],
    [/集合：去重/, { understand: "理解集合的互异性、关系运算与去重。", operate: "能用集合去重、求交集/并集/差集。", transfer: "能从多笔记录中去重并判断重复编号、合法类别集合。" }],
    [/条件判断/, { understand: "理解布尔表达式、if/elif/else、短路与真值判定。", operate: "能用条件分支对金额/记录做校验与分级。", transfer: "能把一条业务规则写清楚（大额复核、字段校验），并处理边界情况。" }],
    [/循环与迭代/, { understand: "理解 for/while、range、遍历与累加聚合。", operate: "能用循环批量处理多条账目，做求和、计数、筛选。", transfer: "能把一行行的记账数据用循环汇总出总额与有效条数。" }],
    [/函数基础/, { understand: "理解参数、返回值、作用域与单一职责。", operate: "能定义并调用带参数/返回值的函数处理账目。", transfer: "能把重复逻辑封装成可复用函数，并保持职责清晰。" }],
    [/函数进阶/, { understand: "理解内置函数、lambda、可迭代解包与函数组合。", operate: "能用 lambda + 内置函数（sorted/map/filter）简化数据处理。", transfer: "能把多个小函数组合成一条数据处理流水线。" }],
    [/文件、路径/, { understand: "理解 pathlib 路径、JSON 序列化与持久化。", operate: "能用 pathlib/JSON 读写文件并把记录持久化到磁盘。", transfer: "能把记账数据保存为 JSON 并重新加载、恢复成可用的记录对象。" }],
    [/异常处理/, { understand: "理解异常类型、try/except 与调试方法。", operate: "能捕获异常并给出安全转换/校验，且能构造基础测试。", transfer: "能处理输入含脏数据/非法值的场景，保证程序不崩溃并给出明确提示。" }],
    [/常见 Python 模块/, { understand: "了解常用标准库模块（math/random/datetime 等）的用途。", operate: "能调用常用模块完成数值、随机与日期处理。", transfer: "能根据需求选用合适的标准库模块解决问题。" }],
    [/模块、类与项目/, { understand: "理解模块导入、类/对象、数据类与项目组织。", operate: "能定义类/数据类组织记录，并组织多文件项目。", transfer: "能构建一个可复用、可运行的记账小项目（类 + 模块）。" }],
    // NumPy
    [/索引、切片与筛选/, { understand: "理解 ndarray 的索引、切片与布尔筛选。", operate: "能对数组做单点/切片/掩码取数与筛选。", transfer: "能从经营数据数组中按条件取出子集用于分析。" }],
    [/形状、合并与拆分/, { understand: "理解 ndarray 形状、reshape 与 concatenate/stack 合并。", operate: "能reshape、拼接、拆分数组。", transfer: "能把多列经营数据重组/合并成适合计算的形状。" }],
    [/向量化与广播/, { understand: "理解向量化运算与广播规则。", operate: "能对数组整体做运算（按列/标量广播）。", transfer: "能用向量化运算批量计算（如价格×数量）避免写循环。" }],
    [/统计计算与随机/, { understand: "理解常用的统计量（均值/中位数/分位/样本）与随机抽样。", operate: "能用 numpy 计算统计量并抽样。", transfer: "能用统计数字描述一批经营数据（总额、均值、分位、波动）。" }],
    // Pandas
    [/Series与DataFrame/, { understand: "理解 Series/DataFrame 的轴、索引对齐与数据类型。", operate: "能创建 Series/DataFrame 并做取值、索引、聚合。", transfer: "能读懂一张经营表的行/列意义并取出、汇总所需部分。" }],
    [/选择、筛选与排序/, { understand: "理解布尔筛选、loc/iloc 与 sort_values。", operate: "能按条件筛选、定位、排序 DataFrame。", transfer: "能从订单表筛出满足条件（如大额、指定渠道）的记录并排序。" }],
    [/行列操作与类型转换/, { understand: "理解列的新增/删除/rename、stack/unstack 与 astype。", operate: "能新增列、改列名、转换数据类型。", transfer: "能把一张经营表整理成字段规范、类型正确的分析表。" }],
    [/数据质量检查与清洗/, { understand: "理解缺失值/重复值/异常值的识别与处理。", operate: "能检查并清洗缺失、重复、类型不一致的脏数据。", transfer: "能对一份有脏数据的经营明细做出可复核的清洗口径与处理。" }],
    [/文本、日期与特征/, { understand: "理解文本清洗、日期解析与特征构造。", operate: "能把文本/日期列转成可用特征（分类、数值、时间）。", transfer: "能从不规整的原始字段中构造出可用于分析的特征。" }],
    [/数据读取与保存/, { understand: "理解常见数据源（csv/excel/json）读写与 dtype。", operate: "能用 pandas 读取/保存常用格式并核对列类型。", transfer: "能把本地文件读入并另存为分析所需的干净数据集。" }],
    [/分组、聚合与数据透视/, { understand: "理解 groupby、聚合函数与 pivot_table 的分组/透视逻辑。", operate: "能按列分组并聚合，做透视与交叉表。", transfer: "能按地区/渠道/品类分组汇总出经营报表并解读。" }],
    [/数据合并与结构转换/, { understand: "理解 merge/join/concat 与长宽表转换。", operate: "能合并多表、做结构转换（melt/pivot）。", transfer: "能把多张订单表关联成一张完整事实表供分析。" }],
    [/窗口计算与探索性/, { understand: "理解窗口/滚动计算与探索性分析思路。", operate: "能用 rolling/窗口函数做滑动统计与趋势分析。", transfer: "能从时序明细中算出滑动均值等指标并发现经营趋势。" }],
  ];

  for (const [re, obj] of M) {
    if (re.test(title)) return obj;
  }

  // 可视化/ML 通用兜底（按图表类/模型类关键字再细分）
  const isML = /机器学习|回归|分类|聚类|决策树|随机森林|梯度提升|SVM|贝叶斯|K-?Means|PCA|交叉验证|混淆|ROC|PR|阈值|校准|多分类|特征选择|数据切分|Pipeline|不平衡|模型|预测|聚合|K近邻|KNN|Scikit/;
  const isChart = /图|plot|axis|Hover|px\.|treemap|sunburst|funnel|Waterfall|timeline|Map|Geo|结构|主题|美化|注释|导出|heatmap|clustermap|FacetGrid|countplot|barplot|pointplot|violinplot|stripplot|swarmplot|histplot|kdeplot|ecdfplot|scatterplot|lineplot|regplot|jointplot|pairplot/;
  if (isML.test(title)) {
    return {
      understand: "理解「" + t + "」的核心思想、适用场景、关键假设与要解释的业务问题。",
      operate: "能按标准流程完成数据准备、模型训练与评估，并解读「" + t + "」的关键输出指标。",
      transfer: "能把「" + t + "」迁移到一份新数据上，独立完成任务并就结果给出有分寸的结论。",
    };
  }
  if (isChart.test(title)) {
    return {
      understand: "理解「" + t + "」的适用场景、数据结构要求，以及它想帮你读出的规律。",
      operate: "能按参数用相应绘图接口画出「" + t + "」，并做必要的美化、注释与导出。",
      transfer: "能换一份真实经营数据，独立画出同类型的「" + t + "」并读出其中的结论。",
    };
  }
  return {
    understand: "理解「" + t + "」的核心概念、适用场景与关键口径。",
    operate: "能按本章步骤写出可复现的实现，并读懂输出/结果。",
    transfer: "能用本章方法处理一份新数据，独立完成同类任务并给出结论。",
  };
}

function objectiveCellText(title) {
  const o = objectiveFor(title);
  return [
    "## 本章目标",
    "",
    "学完本章，你将能够：",
    "",
    "- **理解**：" + o.understand,
    "- **操作**：" + o.operate,
    "- **迁移**：" + o.transfer,
  ].join("\n");
}

// ============================================================
// 2) assert → 诊断式打印（只处理可安全判定的单条布尔）
//    关键安全点：绝不把含引号/括号的表达式文本嵌入字符串字面量（会破坏语法），
//    只对简单变量名做 repr 打印，表达式仅在赋值语句里求值一次。
// ============================================================
// 查找顶层（不在括号内）的比较运算符；返回 { op, idx } 或 null
function topLevelCompareOp(c) {
  let depth = 0;
  for (let i = 0; i < c.length; i++) {
    const ch = c[i];
    if ("([{".includes(ch)) { depth++; continue; }
    if (")]}".includes(ch)) { depth--; continue; }
    if (depth > 0) continue;
    const two = c.slice(i, i + 2);
    if (two === "==" || two === "!=" || two === "<=" || two === ">=") return { op: two, idx: i };
    if (ch === "<" || ch === ">") return { op: ch, idx: i };
  }
  return null;
}
// 两侧操作数内是否还含比较运算符（嵌套比较 → 歧义）
function hasNestedCompare(s) {
  return /==|!=|<=|>=|<|>/.test(s);
}
// 顶层（括号外）是否含逗号（消息参数未清、元组/多值 → 歧义）
function hasTopLevelComma(s) {
  let depth = 0;
  for (const ch of s) {
    if ("([{".includes(ch)) depth++;
    else if (")]}".includes(ch)) depth--;
    else if (ch === "," && depth === 0) return true;
  }
  return false;
}

function classifyAssert(cond) {
  let c = cond.trim();
  // 多行/续行 assert（以反斜杠结尾）或含换行 → 人工，绝不拆
  if (/\\\s*$/.test(c) || /\n/.test(c)) return { verdict: "manual", reason: "续行/多行" };
  c = c.replace(/,\s*(f?"[^"]*"|f?'[^']*')\s*$/, "").trim();
  if (!c) return { verdict: "manual", reason: "空条件" };
  if (/\b(and|or|not)\b/.test(c)) return { verdict: "manual", reason: "复合布尔(and/or/not)" };
  if (/\.(all|any)\(\)/.test(c)) return { verdict: "manual", reason: "聚合谓词 .all()/.any()" };
  if (hasTopLevelComma(c)) return { verdict: "manual", reason: "顶层逗号(消息/元组/多值)" };
  if (/\bin\b|\bnot\s+in\b/.test(c)) return { verdict: "manual", reason: "成员判断 in" };
  if (/ is (not none|none|true|false)\s*$/.test(c)) return { verdict: "safe", kind: "identity", expr: c };
  const opInfo = topLevelCompareOp(c);
  if (opInfo) {
    const lhs = c.slice(0, opInfo.idx).trim();
    const rhs = c.slice(opInfo.idx + opInfo.op.length).trim();
    // 两侧含嵌套比较 / 空侧 → 歧义，人工
    if (!lhs || !rhs || hasNestedCompare(lhs) || hasNestedCompare(rhs)) {
      return { verdict: "manual", reason: "嵌套比较/操作数含比较符" };
    }
    if (/\b(and|or|not| in)\b/.test(lhs) || /\b(and|or|not| in)\b/.test(rhs)) return { verdict: "manual", reason: "比较含复合" };
    return { verdict: "safe", kind: "compare", lhs, op: opInfo.op, rhs };
  }
  if (/^isinstance\s*\(.*\)$/.test(c)) return { verdict: "safe", kind: "isinstance", expr: c };
  if (/\.is_unique\s*$/.test(c)) return { verdict: "safe", kind: "isunique", expr: c };
  if (/^[A-Za-z_][A-Za-z0-9_.]*$/.test(c)) return { verdict: "safe", kind: "boolean", expr: c };
  if (/[<>]=?[^<>]*[<>]=?/.test(c)) return { verdict: "manual", reason: "链式比较" };
  return { verdict: "manual", reason: "其他/无法判定" };
}

// 生成诊断式打印代码；只用简单变量名做 repr，绝不把表达式文本塞进字符串。
function diagLines(kind, cls, indent) {
  // 已按需求移除“诊断式自检”自检块生成；此函数不再注入自检代码。
  return [];
}

// ============================================================
// 3) 练习去预填：把"脚手架注释 + 完整答案"的 exercise cell 改为自洽脚手架
// ============================================================
function isDataPrepLine(t) {
  if (/^(import|from)\s/.test(t)) return true;
  const m = t.match(/^[A-Za-z_][A-Za-z0-9_]*\s*=\s*(.+)$/);
  if (!m) return false;
  const rhs = m[1].trim();
  // 排除实现代码：方法调用、推导式、函数/构造调用
  if (/\.[A-Za-z_]+\s*\(/.test(rhs)) return false;                 // 方法调用
  if (/\[.*\bfor\b.*\bin\b.*\]/.test(rhs)) return false;          // 列表/字典推导式
  if (/[A-Za-z_][A-Za-z0-9_.]*\s*\(/.test(rhs)) return false;      // 函数/构造调用
  return true; // 纯字面量/容器
}

// 按顶层（括号外、字符串外）把代码切成"逻辑语句"，每条语句可能是多物理行（如多行 dict/list）。
function splitLogicalStatements(code) {
  const lines = code.split(/\r?\n/);
  const stmts = [];
  let cur = [];
  let depth = 0;
  let inString = null; // null | "'" | '"' | "'''" | '"""'
  const flush = () => { if (cur.length) { stmts.push(cur); cur = []; } };

  for (const line of lines) {
    cur.push(line);
    let i = 0;
    while (i < line.length) {
      const ch = line[i];
      if (inString) {
        if (inString.length === 3) {
          if (line.startsWith(inString, i)) { inString = null; i += 3; continue; }
        } else if (ch === inString) { inString = null; i += 1; continue; }
        if (ch === "\\") { i += 2; continue; }
        i += 1;
      } else {
        if (ch === "#") break; // 注释到行尾
        if (ch === "'") { if (line.startsWith("'''", i)) { inString = "'''"; i += 3; continue; } inString = "'"; i += 1; continue; }
        if (ch === '"') { if (line.startsWith('"""', i)) { inString = '"""'; i += 3; continue; } inString = '"'; i += 1; continue; }
        if ("([{".includes(ch)) { depth++; i += 1; continue; }
        if (")]}".includes(ch)) { depth--; i += 1; continue; }
        i += 1;
      }
    }
    const noCont = !/\\\s*$/.test(line.trimEnd());
    if (!inString && depth === 0 && noCont) flush();
  }
  flush();
  return stmts;
}

// 分析一条逻辑语句是否为"数据准备"（自洽的纯字面量/容器赋值或 import/注释）
function isDataPrepStmt(lines) {
  const text = lines.join("\n").trim();
  if (!text) return false;
  if (/^#/.test(text)) return true;                       // 纯注释 → 保留
  if (/^(import|from)\s/.test(text)) return true;         // import → 保留
  const m = text.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$/s);
  if (!m) return false;                                   // 非赋值语句 → 实现
  const rhs = m[2].trim();
  if (/\.[A-Za-z_]+\s*\(/.test(rhs)) return false;        // 方法调用
  if (/\[.*\bfor\b.*\bin\b.*\]/s.test(rhs)) return false; // 推导式
  if (/[A-Za-z_][A-Za-z0-9_.]*\s*\(/.test(rhs)) return false; // 函数/构造调用
  if (!/^([\[\(\{'"]|\d|[-+]?\d|True|False|None)/.test(rhs)) return false; // 以字面量/容器开头
  return true;
}

function dePrefillExercise(code, taskHint) {
  const stmts = splitLogicalStatements(code);
  const result = [];
  for (const stmt of stmts) {
    const text = stmt.join("\n").trim();
    if (!text) continue;
    const firstLine = stmt[0];
    // 缩进语句属于"被移除的块/上下文"的一部分 → 丢弃，避免孤行缩进造成语法错误
    if (!/^\S/.test(firstLine)) continue;
    if (isDataPrepStmt(stmt)) result.push(...stmt);   // 保留顶层数据准备/import/注释
    // 其余（实现）→ 丢弃，下沉到相邻 solution cell
  }
  if (!result.some((l) => SCAFFOLD_COMMENT_RE.test(l))) {
    result.unshift("# 请在下方填写代码");
  }
  const taskNote = taskHint ? "# TODO：请在下方完成 —— " + taskHint : "# TODO：请在下方编写实现代码";
  result.push(taskNote);
  return { code: result.join("\n"), ok: true, reason: "已拆为脚手架+空位（实现下沉到相邻 solution cell）" };
}

// ============================================================
// 主流程
// ============================================================
const collectIpynb = (dir, into = []) => {
  if (!existsSync(dir)) return into;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (name.endsWith(".ipynb")) into.push({ full, base: name });
    else if (name === "module-capstones" && existsSync(full)) {
      for (const sub of readdirSync(full)) if (sub.endsWith(".ipynb")) into.push({ full: join(full, sub), base: sub });
    }
  }
  return into;
};

const summary = { objectives: [], assertManualCells: [], deprefill: [], deprefillManual: [], perFile: [] };
let objectivesTotal = 0, assertTotal = 0, deprefillTotal = 0;

for (const { full, base } of collectIpynb(COURSE_DIR)) {
  let nb;
  try { nb = JSON.parse(readFileSync(full, "utf8")); } catch { continue; }
  const cells = nb.cells || [];
  const fileStat = { file: base, objectives: 0, assert: 0, deprefill: 0 };

  // —— objectives ——
  if (only.includes("objectives") || only.includes("all")) {
    const hasObjective = cells.some((cell) => cell.cell_type === "markdown" && OBJECTIVE_RE.test(cell.source?.join("") || ""));
    if (!hasObjective) {
      // 定位插入点（"## 本章场景"之后；否则首个标题后）
      const h1Idx = cells.findIndex((cell) => cell.cell_type === "markdown" && /^#\s/.test(cell.source?.join("") || ""));
      let sceneIdx = cells.findIndex((cell) => cell.cell_type === "markdown" && SCENE_RE.test(cell.source?.join("") || ""));
      let insertIdx;
      if (sceneIdx >= 0) {
        // 插到场景 cell 之后；若场景 cell 后紧跟的是代码/练习，则插在场景 cell 与下一个内容之间
        insertIdx = sceneIdx + 1;
      } else if (h1Idx >= 0) {
        insertIdx = h1Idx + 1;
      } else {
        insertIdx = 0;
      }
      // 避免插到同一章节的次要标题前——用场景 cell 的下一节边界（保守：直接放场景后，符合需求）
      const h1Text = h1Idx >= 0 ? (cells[h1Idx].source?.join("") || "").split("\n")[0].replace(/^#+\s*/, "").trim() : base;
      const md = { cell_type: "markdown", metadata: {}, source: toSourceLines(objectiveCellText(h1Text)) };
      if (!DRY && objectivesTotal < limitArg) { // 分批数量控制在外层
        cells.splice(insertIdx, 0, md);
      }
      fileStat.objectives += 1;
      objectivesTotal += 1;
      summary.objectives.push({ file: base, insertIdx, title: h1Text });
    }
  }

  // —— assert 转换 ——
  if (only.includes("assert") || only.includes("all")) {
    const newCells = [];
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      const tags = tagList(cell);
      if (cell.cell_type === "code" && isSelfCheck(tags) && /\bassert\b/.test(codeOf(cell))) {
        const code = codeOf(cell);
        const newLines = [];
        let anyAssert = false, anyManual = false, anySafe = false;
        const manualList = [];
        for (const line of code.split(/\r?\n/)) {
          const t = line.trim();
          const am = line.match(/^(\s*)assert\s+(.+)$/);
          if (am) {
            anyAssert = true;
            const indent = am[1];
            // 缩进断言（位于 for/if/def 等块内）→ 人工，避免生成行破坏缩进/块结构
            if (indent.length > 0) {
              anyManual = true;
              manualList.push(am[2].slice(0, 120));
              newLines.push(line); // 原样保留
              continue;
            }
            const r = classifyAssert(am[2]);
            if (r.verdict === "safe") {
              anySafe = true;
              // 用诊断式打印替换该条 assert（顶层断言）
              newLines.push(line); // 保留原 assert（不再替换为自检块）
              fileStat.assert += 1;
            } else {
              anyManual = true;
              manualList.push(am[2].slice(0, 120));
              newLines.push(line); // 保留原 assert（不动）
            }
          } else {
            newLines.push(line);
          }
        }
        if (anyAssert) {
          // 只要有一条能安全转换，就写该 cell（把安全条换成诊断打印、疑义条原样保留）
          if (anySafe && !DRY) setSource(cell, newLines.join("\n"));
          if (anyManual) summary.assertManualCells.push({ file: base, cell: i, tags: tags.join(","), manual: manualList });
        }
      }
      newCells.push(cell);
    }
  }

  // —— 练习去预填 ——
  if (only.includes("deprefill") || only.includes("all")) {
    const newCells = [];
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      const tags = tagList(cell);
      const isEx = cell.cell_type === "code" && tags.includes(EXERCISE_TAG);
      if (isEx) {
        const code = codeOf(cell);
        const stmts = statementCount(code);
        if (stmts >= 3 && SCAFFOLD_COMMENT_RE.test(code)) {
          const next = cells[i + 1];
          const nextIsSolution = next && next.cell_type === "code" && isSelfCheck(tagList(next));
          const firstImpl = code.split(/\r?\n/).find((l) => l.trim() && !l.trim().startsWith("#"))?.trim().slice(0, 60) || "";
          // 本 cell 含自检逻辑（exercise+check / 含 assert / 自检/诊断式字样）
          // → 不拆（拆会与自检/实现交互出错），列人工
          const hasOwnCheck = tags.includes("check") || /\bassert\b/.test(code)  || /自检|诊断式/.test(code);
          if (hasOwnCheck) {
            summary.deprefillManual.push({ file: base, cell: i, firstImpl, reason: "exercise 含自检逻辑(assert/诊断式/check)，不拆" });
          } else if (nextIsSolution) {
            // 从前一个 markdown 单元格提取任务提示（"练一练"/"基础N" 描述）；跳过"输出解读/结果记录"这类非任务说明
            let taskHint = "";
            for (let k = i - 1; k >= 0 && k >= i - 3; k--) {
              const pc = cells[k];
              if (pc.cell_type !== "markdown") continue;
              const txt = (pc.source?.join("") || "").trim();
              if (/结果记录|输出解读|你已经掌握|需要注意|解读/.test(txt)) continue;
              taskHint = txt.replace(/[*#`>]/g, "").replace(/\s+/g, " ").trim().slice(0, 60);
              if (taskHint) break;
            }
            const res = dePrefillExercise(code, taskHint);
            if (res.ok && !DRY && deprefillTotal < limitArg) {
              setSource(cell, res.code);
            }
            if (res.ok) { fileStat.deprefill += 1; deprefillTotal += 1; }
            else summary.deprefillManual.push({ file: base, cell: i, firstImpl, reason: res.reason });
          } else {
            summary.deprefillManual.push({ file: base, cell: i, firstImpl, reason: "无相邻 solution cell" });
          }
        } else if (stmts >= 3 && !SCAFFOLD_COMMENT_RE.test(code)) {
          summary.deprefillManual.push({ file: base, cell: i, firstImpl: code.split(/\r?\n/).find((l) => l.trim() && !l.trim().startsWith("#"))?.trim().slice(0, 60) || "", reason: "无脚手架注释" });
        }
      }
      newCells.push(cell);
    }
  }

  // —— 写回（仅当有 objectives 或 assert 或 deprefill 改动）——
  if (!DRY) {
    const dirty = fileStat.objectives > 0 || fileStat.assert > 0 || fileStat.deprefill > 0;
    if (dirty) {
      writeFileSync(full, JSON.stringify(nb, null, 2) + "\n", "utf8");
    }
  }
  summary.perFile.push(fileStat);
}

const out = {
  dry: DRY,
  totals: {
    objectives: objectivesTotal,
    assert: summary.perFile.reduce((s, f) => s + f.assert, 0),
    deprefill: summary.perFile.reduce((s, f) => s + f.deprefill, 0),
    assertManualCells: summary.assertManualCells.length,
    deprefillManual: summary.deprefillManual.length,
  },
  report: summary,
};
if (reportArg) writeFileSync(join(ROOT, reportArg), JSON.stringify(out, null, 2), "utf8");
console.log(JSON.stringify({
  dry: DRY,
  objectives: objectivesTotal,
  assert: summary.perFile.reduce((s, f) => s + f.assert, 0),
  deprefill: summary.perFile.reduce((s, f) => s + f.deprefill, 0),
  assertManualCells: summary.assertManualCells.length,
  deprefillManual: summary.deprefillManual.length,
}, null, 2));
