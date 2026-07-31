/**
 * fix-python-basics-intro.mjs
 *
 * 修复第 1–10 章（Python 基础模块）的通用模板内容：
 *  - 场景引入  → 按章节定制
 *  - 本章在学习路线中的位置 → 按章节定制
 *  - 前置知识 → 按章节定制
 *  同时修复第 1 章 chapter_count = 75 → 108
 *  并为第 78 章补充 practice-scaffold 单元格
 *
 * 用法：node scripts/fix-python-basics-intro.mjs [--dry-run]
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const courseDir = path.join(root, "public", "course");
const isDryRun = process.argv.includes("--dry-run");

// ── 每章定制内容 ──────────────────────────────────────────────────────────────
const chapterMeta = {
  1: {
    scene: "你刚拿到一份陌生数据，需要快速验证几个数字是否合理。用 Notebook 把计算步骤、输出和结论放在一起，别人也能一键重现你的结论。",
    position: "这是整门课程的起点。Notebook 是本课程的主要工作环境，熟悉它的运行方式将贯穿全部 108 章。",
    prerequisites: "- 会在浏览器中打开本平台\n- 无需任何编程经验",
  },
  2: {
    scene: "写一段记录商品单价、库存数量和折扣率的代码——你会立刻遇到\"字符串不能和数字相加\"这样的类型错误。理解数据类型是避免此类错误的基础。",
    position: "变量和数据类型是 Python 的地基，后续所有章节都会用到。",
    prerequisites: "- 完成第 1 章（会运行 Notebook 单元格）",
  },
  3: {
    scene: "从一张包含姓名、邮箱和订单号的表格里提取关键信息、统一大小写格式、剔除多余空格——字符串操作是数据清洗的日常。",
    position: "字符串处理是数据清洗的核心工具，在 Pandas、正则表达式和文本分析章节中会持续用到。",
    prerequisites: "- 掌握变量定义和基本数据类型（第 2 章）",
  },
  4: {
    scene: "你有一批销售记录需要按地区排序，同时有一组固定的品类代码不允许修改——这正是列表和元组各自适合的场景。",
    position: "列表是 Python 最常用的集合类型，也是 Pandas Series 和 NumPy 数组的前置概念。",
    prerequisites: "- 掌握变量和基本数据类型（第 2 章）\n- 理解字符串索引（第 3 章）",
  },
  5: {
    scene: "统计每种商品的出现次数，或快速判断某个用户 ID 是否在黑名单里——字典和集合让这两件事变得极其高效。",
    position: "字典是 JSON、API 响应和 Pandas 参数的底层结构；集合是去重与集合运算的利器。",
    prerequisites: "- 掌握列表操作（第 4 章）",
  },
  6: {
    scene: "根据订单金额决定是否触发审核流程，或者按用户等级给出不同折扣——业务逻辑的核心就是条件判断。",
    position: "条件判断是控制程序流程的基础，与循环（第 7 章）、函数（第 8 章）共同构成 Python 控制流三件套。",
    prerequisites: "- 掌握变量、类型和布尔运算（第 2 章）\n- 理解列表和字典（第 4–5 章）",
  },
  7: {
    scene: "对 10000 行销售数据逐条计算折扣价，或者持续读取文件直到找到目标行——手动重复是不可能的，循环是标准答案。",
    position: "循环是批量处理数据的基础。掌握循环后，你才能理解 Pandas 向量化操作\"为什么不需要循环\"。",
    prerequisites: "- 掌握列表、字典和条件判断（第 4–6 章）",
  },
  8: {
    scene: "同一段计算增长率的代码出现在三个地方，你只改了两处——这是函数存在的理由：把可重用的逻辑封装起来，一处修改处处生效。",
    position: "函数是代码复用的基本单元，也是后续自定义数据清洗管道、特征工程和模型封装的基础。",
    prerequisites: "- 熟练使用变量、条件和循环（第 2–7 章）",
  },
  9: {
    scene: "把清洗好的数据写入文件留存，或者读取昨天生成的中间结果继续分析——文件操作是数据工作流的连接器。",
    position: "文件读写是与外部世界交换数据的基础，也是理解 Pandas read_csv / to_csv 底层逻辑的前置知识。",
    prerequisites: "- 掌握字符串操作（第 3 章）\n- 理解函数（第 8 章）",
  },
  10: {
    scene: "用户输入了一个非数字、文件路径写错了、网络请求超时了——这些情况在真实分析中随时发生。异常处理让程序在出错时给出清晰提示而不是崩溃。",
    position: "异常处理是编写健壮数据脚本的必备技能，也是 Python 基础模块的收尾章节。完成后你将进入 NumPy 数值计算阶段。",
    prerequisites: "- 掌握 Python 基础控制流和函数（第 1–9 章）",
  },
};

// ── 第 78 章 practice-scaffold ────────────────────────────────────────────────
const ch78Scaffold = {
  id: "practice-scaffold",
  cell_type: "code",
  source: [
    "# TODO: 对 alpha = [0.1, 1, 10, 100] 分别训练 Ridge 并记录 RMSE 和系数范数\n",
    "from sklearn.linear_model import Ridge\n",
    "from sklearn.metrics import mean_squared_error\n",
    "import numpy as np\n",
    "\n",
    "ridge_rows = []\n",
    "for alpha in [0.1, 1, 10, 100]:\n",
    "    model = Ridge(alpha=alpha)\n",
    "    # TODO: 训练模型，预测测试集\n",
    "    model.fit(_____, _____)\n",
    "    pred = model.predict(_____)\n",
    "    rmse = mean_squared_error(y_test, pred) ** 0.5\n",
    "    coef_norm = np.linalg.norm(model.coef_)\n",
    "    ridge_rows.append([alpha, rmse, coef_norm])\n",
    "\n",
    "import pandas as pd\n",
    "result = pd.DataFrame(ridge_rows, columns=['alpha', 'RMSE', 'coef_norm'])\n",
    "display(result.round(3))\n",
    "# 观察：随着 alpha 增大，RMSE 和 coef_norm 分别怎么变化？"
  ],
  outputs: [],
  execution_count: null,
  metadata: {},
};

// ── 工具函数 ──────────────────────────────────────────────────────────────────
/** 从旧 intro 文本中提取 ## 学习目标 下的内容（保留原有目标列表） */
function extractGoals(introText) {
  const match = introText.match(/## 学习目标\n+([\s\S]*?)(?=\n##|\s*$)/);
  return match ? match[1].trimEnd() : "";
}

/** 从旧 intro 文本中提取 ## 本章产出 下的内容 */
function extractOutput(introText) {
  const match = introText.match(/## 本章产出\n+([\s\S]*?)(?=\n##)/);
  return match ? match[1].trim() : "完成一个包含输入、计算、检查和文字结论的小型分析。";
}

/**
 * 从旧 intro 文本提取章节标题行下方的一句描述
 * （即 # 第N章 标题 的下一个非空段落，到第一个 ## 之前）
 */
function extractOneLineDesc(introText) {
  const match = introText.match(/^#[^\n]*\n+([^#][^\n]*)\n/);
  return match ? match[1].trim() : "";
}

/** 把字符串按行分割为 source 数组（每行保留 \n） */
function toSourceArray(text) {
  return text.match(/[^\n]*\n|[^\n]+$/g) || [text];
}

/** 重建完整 intro 文本（从零构建，不依赖旧内容结构） */
function buildIntroSource(chNum, title, oneLiner, goals, output) {
  const meta = chapterMeta[chNum];
  const lines = [
    `# 第${chNum}章 ${title}`,
    ``,
    oneLiner,
    ``,
    `## 场景引入`,
    ``,
    meta.scene,
    ``,
    `## 本章在学习路线中的位置`,
    ``,
    meta.position,
    ``,
    `## 前置知识`,
    ``,
    meta.prerequisites,
    ``,
    `## 本章产出`,
    ``,
    output,
    ``,
    `## 学习路径`,
    ``,
    `本章按"概念 → 最小示例 → 公开数据或业务场景 → 分级练习 → 总结迁移"的顺序组织。代码单元格可以单独运行，也可以从上到下完整运行。`,
    ``,
    `## 学习目标`,
    ``,
    goals,
  ];
  return lines.join("\n");
}

// ── 修复函数 ──────────────────────────────────────────────────────────────────
function fixChapter(chNum) {
  const filePath = path.join(courseDir, `course-chapter-${chNum}.ipynb`);
  const nb = JSON.parse(fs.readFileSync(filePath, "utf8"));

  // 找到 intro 单元格（包含"本章在学习路线中的位置"的 markdown 单元格）
  const introIdx = nb.cells.findIndex((c) => {
    const t = Array.isArray(c.source) ? c.source.join("") : (c.source || "");
    return t.includes("本章在学习路线中的位置");
  });
  if (introIdx === -1) { console.log(`  ⚠️  第${chNum}章未找到 intro 单元格，跳过`); return; }

  const introCell = nb.cells[introIdx];
  const oldText = Array.isArray(introCell.source) ? introCell.source.join("") : (introCell.source || "");

  // 提取需要保留的原始字段
  const titleMatch = oldText.match(/^# 第\d+章\s+(.+)/m);
  const title = titleMatch ? titleMatch[1].trim() : `第${chNum}章`;
  const oneLiner = extractOneLineDesc(oldText);
  const goals = extractGoals(oldText);
  const output = extractOutput(oldText);

  // 从零重建 intro
  const newText = buildIntroSource(chNum, title, oneLiner, goals, output);
  nb.cells[introIdx] = { ...introCell, source: toSourceArray(newText) };

  // 第1章额外修复：chapter_count = 75 → 108
  if (chNum === 1) {
    nb.cells = nb.cells.map((cell) => {
      const src = Array.isArray(cell.source) ? cell.source.join("") : (cell.source || "");
      if (src.includes("chapter_count = 75")) {
        const fixed = src.replace("chapter_count = 75", "chapter_count = 108");
        return { ...cell, source: Array.isArray(cell.source) ? toSourceArray(fixed) : fixed };
      }
      return cell;
    });
  }

  if (!isDryRun) {
    fs.writeFileSync(filePath, JSON.stringify(nb, null, 1), "utf8");
    console.log(`  ✅ 第${chNum}章 已修复`);
  } else {
    const meta = chapterMeta[chNum];
    console.log(`  [dry-run] 第${chNum}章`);
    console.log(`    场景: ${meta.scene.slice(0, 55)}...`);
    console.log(`    位置: ${meta.position.slice(0, 55)}...`);
    console.log(`    前置: ${meta.prerequisites.split("\n")[0]}`);
  }
}

function fixCh78Scaffold() {
  const filePath = path.join(courseDir, "course-chapter-78.ipynb");
  const nb = JSON.parse(fs.readFileSync(filePath, "utf8"));

  // 检查是否已有 scaffold
  const hasScaffold = nb.cells.some((c) => c.id === "practice-scaffold");
  if (hasScaffold) { console.log("  ℹ️  第78章已有 practice-scaffold，跳过"); return; }

  // 在 practice-notes 之后、practice-solution 之前插入
  const solutionIdx = nb.cells.findIndex((c) => c.id === "practice-solution");
  if (solutionIdx === -1) { console.log("  ⚠️  第78章未找到 practice-solution，跳过"); return; }

  nb.cells.splice(solutionIdx, 0, ch78Scaffold);
  if (!isDryRun) {
    fs.writeFileSync(filePath, JSON.stringify(nb, null, 1), "utf8");
    console.log("  ✅ 第78章 practice-scaffold 已补充");
  } else {
    console.log("  [dry-run] 第78章 将插入 practice-scaffold");
  }
}

// ── 执行 ──────────────────────────────────────────────────────────────────────
console.log(isDryRun ? "── DRY RUN ──\n" : "── 开始修复 ──\n");

console.log("修复 Python 基础 第1–10章 intro 内容：");
for (let i = 1; i <= 10; i++) fixChapter(i);

console.log("\n补充 第78章 practice-scaffold：");
fixCh78Scaffold();

console.log(isDryRun ? "\n── Dry run 完成，未写入文件 ──" : "\n── 修复完成 ──");
