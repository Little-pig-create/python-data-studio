> **文档状态说明（2026-08-02）**：本文档保留了 2026-07-26 时期的课程运行时和练习闭环设计，作为历史实现基线与技术背景参考。关于当前课程内容的权威方案，以 `MODULE_CAPSTONE_REDESIGN_AND_NOTEBOOK_ENHANCEMENT_PLAN.md`、`NOTEBOOK_NEXT_IMPROVEMENT_ROADMAP.md` 和 `NOTEBOOK_TEACHING_QUALITY_EVALUATION.md` 为准。
>
> 当前内容方案已经发生以下变更：取消正式章节作业和独立实训主路径，改为模块末大作业；课程 Notebook 不再以 `assert` 作为教学自检要求；方法和函数改为独立说明与独立示例；章节单元格顺序按由浅入深的教学流程组织。本文中关于 `assert`、TODO 章节作业、75 章/7 模块和旧生成路径的描述，不应作为当前课程内容规范。
# 课程内容与交互改进方案

> 文档用途：记录课程内容、Notebook 运行时和交互层的改进基线，作为后续内容迭代与验收依据。
>
> 当前状态：核心课程生成链路和自定义 Notebook 工作区已经落地；后续工作以内容质量、可靠性和可维护性为主，不再重复建设已完成的基础能力。

## 〇、当前实现基线（2026-07-26）

### 已完成能力

- **Notebook 与页面解耦**：Notebook 文件存放在 `notebooks/course/`，页面通过 `public/course/catalog.json` 动态加载章节和路径。
- **目录动态生成**：`npm run build:course` 扫描 Notebook 元数据和文件名，生成模块、章节、前后章节关系及路由信息；新增 Notebook 不需要修改前端目录代码。
- **课程规模**：当前目录包含 75 个章节、7 个模块，章节名称和 Notebook 文件名保持可追溯关系。
- **内容生成链路**：内容定义位于 `scripts/course-content-*.mjs`，由 `scripts/rebuild-course-notebooks.mjs` 生成 `.ipynb`，再由 `npm run build:runtime` 发布到 JupyterLite。
- **练习闭环**：基础章支持题目说明、TODO 脚手架、折叠参考答案和 `assert` 自检；答案展开后可以单独运行，隐藏答案不会参与运行。
- **运行时**：使用原生 JupyterLite Python 内核，不使用自定义内核池；每个章节拥有独立运行时生命周期，切换章节时释放旧内核。
- **执行状态**：内核状态通过 kernel status/connection status 事件及时更新，覆盖连接、启动、空闲、运行、重启和错误状态。
- **学习状态**：完成检查项通过 `localStorage` 按章节和单元格保存，页面刷新或切换章节后仍可恢复。
- **单元格编辑**：支持添加、删除、上移、下移、编辑、复制和剪切；修改结果通过 IndexedDB 保存为 Notebook 草稿。
- **输出渲染**：支持文本、HTML、PNG/JPEG、Plotly 和 AssertionError 的差异化展示；输出支持折叠和再次展开。
- **交互规范**：Toast 位于顶部中央；按钮提供图标、禁用态和 tooltip；选中态只改变边框，不改变单元格布局高度。

### 当前约束

- `public/course/catalog.json` 是构建产物，不能手工作为内容源修改。
- 页面草稿优先于同版本的源 Notebook；修改源内容后需要递增 `COURSE_CONTENT_VERSION`，避免旧草稿覆盖新结构。
- JupyterLite 的 Python 包必须进入运行时构建流程；浏览器端不能把 `pip install` 当作稳定的课程初始化方案。
- Notebook 输出和执行计数属于用户草稿状态，不应直接写回课程源文件。

## 一、现状确认

### 1.1 架构确认
- **Notebook 来源**：由 `scripts/rebuild-course-notebooks.mjs` 根据内容定义生成
- **内容定义**：
  - `scripts/course-content-foundations.mjs` (316行) - Python基础10章
  - `scripts/course-content-visualization.mjs` (1370行) - 可视化47章
  - `scripts/course-content-projects.mjs` (454行) - 综合项目4章
- **版本控制**：`COURSE_CONTENT_VERSION = 7`
- **生成流程**：`npm run build:course` → 生成 `.ipynb` → `npm run build:runtime` → 构建到 JupyterLite

### 1.2 当前内容结构

**基础章模板**（第1-10章）：
```
# 章节标题 + 学习目标
## 核心概念（3-4条）
## 示例 1/2/3：标题 + 解释 + 代码
## 常见误区（3条）
## 综合练习：题目描述 + TODO 脚手架 + 折叠参考答案 + 自检
## 小结：迁移思考 + 知识速查表 + 需要注意 + 完成检查
```

**可视化章模板**（第25-71章）：
```
# 章节标题 + 适用场景 + 数据结构
## 0. 准备可复现数据
## 1. 基础图表
## 2. 进阶变体
## 3. 参数说明
## 4. 结果解读
## 练习：每章独立的参数修改任务与观察重点
```

---

## 二、核心问题

### 2.1 练习设计薄弱
**问题**：
- 题目描述后直接给出完整答案代码，缺少"做题→检查→看答案"的学习闭环
- 没有即时反馈机制，学习者不知道自己做对了没有
- 答案代码直接暴露，降低练习价值

**影响**：
- 学习者倾向直接看答案而不是动手尝试
- 缺少自我检验环节，学习效果打折

### 2.2 可视化章练习通用化
**问题**：
- 47章可视化内容全部使用同一句话："运行示例后，改变一个参数并记录图表中发生的变化"
- 没有给出具体的参数修改建议和观察重点
- 学习者不知道该改什么参数、观察什么现象

**影响**：
- 练习目标不明确，学习者随意改参数后不知道得到什么结论
- 失去针对性训练图表参数理解的机会

### 2.3 知识速查表噪音
**问题**：
- `keySyntax()` 函数提取代码中的关键语法，但会提取 `print()`, `type()`, `len()` 等通用函数
- 第2章速查表三行"关键写法"全是 `print()`，没有信息量

**影响**：
- 速查表失去参考价值
- 学习者无法快速定位本章的核心 API

### 2.4 小结内容重复
**问题**：
- "本章小结"第一句 = 章首 summary（完全重复）
- "你已经掌握" = "学习目标"（完全重复）

**影响**：
- 浪费屏幕空间
- 没有起到巩固、迁移知识的作用

---

## 三、改进方案

### 3.1 练习交互强化

#### 3.1.1 三段式练习结构

**改为三个 cell**：

1. **题目描述 cell**（markdown）
```markdown
## 综合练习

1. 定义商品单价、数量和优惠券金额
2. 计算优惠后的订单金额
3. 判断订单是否达到300元

请在下方代码框中完成，运行后查看"自检"部分的反馈。
```

2. **TODO 脚手架 cell**（code，无 tags）
```python
# 定义变量
price = 128.0
quantity = 3
coupon_amount = 30.0

# TODO: 在这里计算优惠后的订单金额
order_amount = 

# TODO: 在这里判断是否达到300元门槛
reaches_threshold = 

print(f"订单金额: {order_amount:.2f} 元")
print("达到300元门槛:", reaches_threshold)
```

3. **参考答案 cell**（code，tags: `["solution"]`，metadata: `jupyter.source_hidden: true`）
```python
price = 128.0
quantity = 3
coupon_amount = 30.0
order_amount = price * quantity - coupon_amount
reaches_threshold = order_amount >= 300
print(f"订单金额: {order_amount:.2f} 元")
print("达到300元门槛:", reaches_threshold)

# 自检
assert order_amount == 354.0, "检查订单金额计算：应该是 price * quantity - coupon_amount"
assert reaches_threshold == True, "354元应该达到300元门槛"
```

#### 3.1.2 数据结构修改

在 `course-content-foundations.mjs` 的每个 profile 中添加：

```javascript
{
  // ... 现有字段 ...
  practice: ["步骤1", "步骤2", "步骤3"],  // 现有
  practiceCode: `完整答案代码`,            // 现有
  
  // 新增字段
  practiceScaffold: `# 变量已给出\nprice = 128.0\n\n# TODO: 计算\norder_amount = `,
  practiceAssert: `assert order_amount == 354.0, "提示信息"`
}
```

#### 3.1.3 生成器修改

**修改 `scripts/rebuild-course-notebooks.mjs` 的 `foundationCells()` 函数**：

```javascript
// 旧代码（182-183行）
markdown("practice-notes", `## 综合练习\n\n${numbered(profile.practice)}\n\n请先独立完成，再运行参考代码核对结果。`),
code("practice", profile.practiceCode, ["exercise"]),

// 新代码
markdown("practice-notes", `## 综合练习\n\n${numbered(profile.practice)}\n\n请在下方代码框中完成，运行后查看"自检"部分的反馈。`),
// 如果有 scaffold 就生成 TODO cell
...(profile.practiceScaffold ? [code("practice-scaffold", profile.practiceScaffold)] : []),
// 答案 cell 默认折叠 + 加 assert
code("practice-solution", 
  profile.practiceCode + (profile.practiceAssert ? `\n\n# 自检\n${profile.practiceAssert}` : ""),
  ["solution"],
  { sourceHidden: true }  // 需要修改 code() 函数支持此选项
),
```

**修改 `code()` 函数支持 `sourceHidden` 选项**（25-32行）：

```javascript
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
```

---

### 3.2 可视化章具体化

#### 3.2.1 为每章添加具体任务

**修改 `scripts/rebuild-course-notebooks.mjs` 的 `visualizationCells()` 函数**（193行）：

```javascript
// 旧代码
markdown("when", `## 适用场景\n\n${profile.when}\n\n## 数据结构\n\n${profile.dataShape}\n\n## 本章练习任务\n\n运行示例后，改变一个参数并记录图表中发生的变化。`),

// 新代码
markdown("when", `## 适用场景\n\n${profile.when}\n\n## 数据结构\n\n${profile.dataShape}\n\n## 本章练习任务\n\n${profile.practiceTask || "运行示例后，改变一个参数并记录图表中发生的变化。"}`),
```

#### 3.2.2 补充内容定义

在 `scripts/course-content-visualization.mjs` 的每个 profile 中添加 `practiceTask` 字段。

**示例**（Seaborn 小提琴图 - 第41章）：

```javascript
{
  title: "小提琴图（violinplot）",
  summary: "用小提琴图展示分类组的平滑密度形状和中心信息。",
  // ... 其他字段 ...
  
  // 新增
  practiceTask: `运行基础图表后，完成以下任务：

1. 将 \`inner="quart"\` 改为 \`inner="box"\`，观察内部显示的统计量差异
2. 调整 \`bw_adjust\` 参数（如 0.5 或 2.0），说明带宽对密度曲线平滑度的影响
3. 比较小提琴图与箱线图在展示分布形状上的优势`
}
```

**批量补充策略**（47章可视化内容）：
- Matplotlib（11章）：参数修改 + 样式变化
- Seaborn（19章）：统计参数 + 分组效果
- Plotly（17章）：交互参数 + 动态效果

---

### 3.3 知识速查表优化

#### 3.3.1 过滤通用函数

**修改 `keySyntax()` 函数**（46-77行）：

```javascript
const keySyntax = (source) => {
  const snippets = [];
  const seen = new Set();
  const seenMethods = new Set();
  
  // 新增：通用函数黑名单
  const genericFunctions = new Set(['print', 'type', 'len', 'range']);

  // ... 提取逻辑 ...

  // 修改：过滤通用函数（72-74行）
  for (const match of String(source).matchAll(/\b(?:sum|min|max|sorted|enumerate|zip|open|int|float|str|bool|list|tuple|dict|set)\s*\(/g)) {
    const funcName = match[0].replace(/\s*\($/, "");
    if (!genericFunctions.has(funcName)) {  // 新增判断
      add(funcName + "()");
    }
  }

  return snippets.slice(0, 4).map((snippet) => `\`${snippet}\``).join("、") || "参见本节示例";
};
```

#### 3.3.2 允许手动覆盖

在 profile 中允许指定 `keySyntax` 字段手动覆盖：

```javascript
// 在 foundationSummary() 函数中（84-98行）
const quickRows = profile.examples.map((example) => [
  example.title,
  example.explanation,
  example.keySyntax || keySyntax(example.code)  // 允许手动覆盖
]);
```

---

### 3.4 小结内容优化

#### 3.4.1 改为迁移问题

**修改 `foundationSummary()` 函数**（84-98行）：

```javascript
// 旧代码（93行）
summarySection("summary-intro", `## 本章小结\n\n${profile.summary}`),

// 新代码
summarySection("summary-intro", `## 本章小结\n\n${profile.summaryQuestion || profile.summary}`),
```

#### 3.4.2 补充迁移问题

在每个 profile 中添加 `summaryQuestion` 字段：

**示例**（第2章）：

```javascript
{
  summary: "掌握变量、核心数据类型和运算符，能够写出口径清晰的指标计算。",
  
  // 新增
  summaryQuestion: `掌握变量、核心数据类型和运算符，能够写出口径清晰的指标计算。

**迁移思考**：

1. 如果会员折扣改为满减券（满300减30），`discount_rate` 的计算逻辑需要如何修改？
2. 为什么金额计算要用 `float` 而不是 `int`？什么场景下会出错？`,
}
```

---

### 3.5 前端支持

#### 3.5.1 折叠答案 Cell

**修改 `src/NotebookWorkspace.jsx` 的 `NotebookCell` 组件**：

在 `NotebookCell` 函数内检测 `cell.metadata.tags`：

```jsx
function NotebookCell({ cell, index, cellCount, runningCellId, onRun, onAdd, onMove, onDelete }) {
  const { activeCellId, selectCell, updateCellSource } = useNotebookStore();
  const [outputCollapsed, setOutputCollapsed] = useState(false);
  const [markdownEditing, setMarkdownEditing] = useState(false);
  
  // 新增：检测 solution tag
  const [solutionCollapsed, setSolutionCollapsed] = useState(
    cell.metadata?.tags?.includes('solution') || false
  );
  
  const selected = activeCellId === cell.id;
  const isRunning = runningCellId === cell.id;
  const isSolution = cell.metadata?.tags?.includes('solution');
  
  return (
    <article className={`notebook-cell ${isSolution ? 'is-solution' : ''} ...`}>
      {/* ... 现有内容 ... */}
      
      {isSolution && solutionCollapsed && (
        <div className="solution-placeholder">
          <button onClick={() => setSolutionCollapsed(false)}>
            显示参考答案
          </button>
        </div>
      )}
      
      {(!isSolution || !solutionCollapsed) && (
        <CodeEditor value={cell.source} onChange={...} onRun={run} />
      )}
      
      {/* ... 现有输出渲染 ... */}
    </article>
  );
}
```

**添加样式**（`src/notebook.css`）：

```css
.notebook-cell.is-solution {
  border-left: 3px solid #f59e0b;
}

.solution-placeholder {
  padding: 24px;
  text-align: center;
  background: #fffbeb;
  border-radius: 6px;
}

.solution-placeholder button {
  padding: 8px 16px;
  background: #f59e0b;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
```

#### 3.5.2 Assert 错误友好显示

**修改 `OutputRenderer` 组件**（NotebookWorkspace.jsx:145-158）：

```jsx
function OutputRenderer({ outputs = [] }) {
  if (!outputs.length) return null;
  return <div className="notebook-output-content">{outputs.map((output, index) => {
    if (output.output_type === "stream") return <pre key={index} className="notebook-stream">{outputText(output.text)}</pre>;
    
    // 修改：检测 AssertionError
    if (output.output_type === "error") {
      const isAssertionError = output.ename === "AssertionError";
      const className = isAssertionError ? "notebook-assert-error" : "notebook-error-output";
      const prefix = isAssertionError ? "❌ 自检未通过：" : "";
      
      return (
        <pre key={index} className={className}>
          {prefix}
          {[output.ename, output.evalue, ...(output.traceback || [])].filter(Boolean).join("\n")}
        </pre>
      );
    }
    
    // ... 其他输出类型 ...
  })}</div>;
}
```

**添加样式**（`src/notebook.css`）：

```css
.notebook-assert-error {
  background: #fef3c7;
  border-left: 4px solid #f59e0b;
  padding: 12px;
  color: #92400e;
  font-family: monospace;
  font-size: 14px;
  white-space: pre-wrap;
}
```

---

## 四、实施步骤

### Phase 1: 生成器基础改造（2-3小时）

1. **修改工具函数**
   - [x] `code()` 函数支持 `sourceHidden` 选项
   - [x] `keySyntax()` 函数过滤通用函数
   - [x] `foundationCells()` 函数支持三段式练习

2. **测试生成流程**
   - [x] 为基础章添加 `practiceScaffold` 和 `practiceAssert`
   - [x] 运行 `npm run build:course`
   - [x] 检查生成的 Notebook 结构是否正确
   - [x] 检查 metadata 是否包含 `jupyter.source_hidden`

### Phase 2: 内容补充（8-12小时，可分批）

**批次1：基础章（10章，3-4小时）**
- [x] 为每章补充 `practiceScaffold`（TODO 代码框架）
- [x] 为每章补充 `practiceAssert`（2-3条 assert 语句）
- [x] 为每章补充 `summaryQuestion`（1-2个迁移问题）

**批次2：可视化章（47章，6-8小时）**
- [x] Matplotlib（11章）：每章补充 `practiceTask`（参数修改建议）
- [x] Seaborn（19章）：每章补充 `practiceTask`（统计参数任务）
- [x] Plotly（17章）：每章补充 `practiceTask`（交互参数任务）

**批次3：项目章（4章，1小时）**
- [x] 检查是否需要调整练习结构

### Phase 3: 前端支持（3-4小时）

1. **折叠答案功能**
   - [x] 修改 `NotebookCell` 组件检测 `solution` tag
   - [x] 添加"显示答案"按钮和折叠状态
   - [x] 添加样式（橙色边框标识）

2. **Assert 友好显示**
   - [x] 修改 `OutputRenderer` 检测 `AssertionError`
   - [x] 应用黄色警告样式而非红色错误样式
   - [x] 添加"❌ 自检未通过："前缀

3. **测试验收**
   - [x] 在浏览器中打开基础章和 Pandas 章抽样验证
   - [x] 验证答案 cell 默认折叠
   - [x] 点击"显示答案"后展开
   - [x] 运行错误答案，验证 assert 提示友好
   - [x] 运行正确答案，验证 assert 通过

### Phase 4: 构建与验证（1-2小时）

1. **完整构建**
   - [x] `npm run build:course` 生成所有 Notebook
   - [x] `npm run build:runtime` 构建 JupyterLite
   - [x] `npm run build` 构建前端页面
   - [x] `npm run dev` 启动开发服务器

2. **抽样验证**（每个模块抽2章）
   - [x] Python基础：第2章、第6章
   - [x] NumPy：第11章、第14章
   - [x] Pandas：第16章、第22章
   - [x] Matplotlib：第26章、第30章
   - [x] Seaborn：第41章、第48章
   - [x] Plotly：第56章、第64章

3. **更新文档**
   - [x] 同步 README.md（75章）
   - [x] 同步 docs/PRODUCT.md（7模块）

### Phase 5：持续维护与可靠性（当前阶段）

#### Notebook 内容变更流程

1. 修改 `scripts/course-content-*.mjs` 中的内容定义；不要直接编辑生成的课程 Notebook。
2. 内容结构发生变化时递增 `COURSE_CONTENT_VERSION`。
3. 执行 `npm run build:course`，检查生成的 Notebook 数量、名称和目录协议。
4. 执行 `npm run build:runtime`，将 Notebook 和 Python 运行时依赖发布到 JupyterLite。
5. 执行 `npm run build`，确认前端和运行时资源可以正常打包。
6. 抽查一个基础章、一个 Pandas 章和一个可视化章，分别验证练习、输出和目录跳转。

#### 源文件与草稿边界

- `scripts/course-content-*.mjs`：课程内容源文件，进入版本控制。
- `notebooks/course/*.ipynb`：可发布的生成结果，可用于检查和渲染，不作为日常手工编辑入口。
- `public/course/catalog.json`：目录构建产物，由 Notebook 文件名和元数据推断生成。
- 浏览器 IndexedDB：用户编辑内容、输出和执行计数的草稿存储。
- 浏览器 `localStorage`：完成检查项等轻量学习状态。

#### 待办优先级

- **P0：运行可靠性**：为内核启动超时、断开连接、重启失败和包加载失败提供可操作错误信息；补充无内核、内核忙和切换章节期间的按钮禁用测试。
- **P1：单元格编辑完整性**：完善复制、剪切后的粘贴语义，增加键盘快捷键，并验证复制内容不会复用原单元格 ID。
- **P1：内容质量**：逐章检查代码是否可独立运行、输出是否有解释、中文图表字体是否可用、练习答案是否与题目一致。
- **P2：学习进度**：在 assert 成功后记录练习完成状态，并在目录中展示章节级进度；保留用户手动勾选作为独立状态。
- **P2：发布检查**：增加自动 Notebook schema 校验、章节数量校验、目录路径可达性校验和基础包导入检查。

#### 发布验收清单

- [ ] 所有 Notebook 均为合法 nbformat 4.x 文件。
- [ ] `catalog.json` 的每个 `path` 都能返回 HTTP 200。
- [ ] 目录章节顺序、模块分组和前后导航一致。
- [ ] 基础 Python、NumPy、Pandas、Matplotlib、Seaborn、Plotly 抽样运行成功。
- [ ] 参考答案默认隐藏，隐藏状态不能通过单元格按钮、顶部运行或全部运行执行。
- [ ] 草稿保存、刷新恢复、切换章节隔离均正常。
- [ ] 失败运行不会把内核错误状态伪装成空闲状态。
- [ ] 移动端目录和 Notebook 工具栏不遮挡内容。

---

## 五、验收标准

### 5.1 内容质量
- [x] 每个基础章有 TODO scaffold + 折叠答案 + assert 自检
- [x] 每个可视化章有具体的参数修改任务（不是通用占位符）
- [x] 知识速查表不包含 `print()`, `type()`, `len()` 等噪音
- [x] 小结包含迁移问题而非重复学习目标

### 5.2 用户体验
- [x] Solution cell 默认折叠，点击"显示答案"后展开
- [x] AssertionError 显示黄色警告而非红色错误
- [x] Assert 提示信息清晰（"检查XXX：应该是YYY"）
- [x] 答案 cell 有视觉标识（橙色边框）

### 5.3 技术质量
- [x] Notebook 文件符合 nbformat 4.5 规范
- [x] `metadata.course_content_version = 7`
- [x] `metadata.jupyter.source_hidden = true` 应用于 solution cell
- [x] `metadata.tags = ["solution"]` 正确设置
- [x] 构建流程可重复无报错

---

## 六、风险与注意事项

### 6.1 编码问题
**风险**：JavaScript 文件中混入中文引号（""）导致语法错误

**缓解**：
- 使用编辑器的"替换全部"功能统一为英文引号（""）
- 在 `scripts/` 下添加 ESLint 规则检测

### 6.2 内容量大
**风险**：75章内容补充工作量大（~300处编辑）

**缓解**：
- 分批实施（先做10章验证模板，再批量）
- 使用脚本半自动化（如批量生成 assert 模板）

### 6.3 兼容性
**风险**：JupyterLab 对 `jupyter.source_hidden` 的支持

**验证**：
- 在 JupyterLab 中打开生成的 Notebook
- 确认 solution cell 默认折叠
- 如果不支持，前端自行实现折叠逻辑

### 6.4 用户习惯
**风险**：学习者可能直接点"显示答案"而不尝试

**缓解**：
- 在题目描述中强调"请先独立完成"
- Assert 自检提供即时正反馈，鼓励尝试

---

## 七、后续优化方向（可选）

### 7.1 选图决策章
在 Seaborn（第54章后）和 Plotly（第71章后）各添加一章对比决策内容：

**内容大纲**：
```markdown
# 图表选择决策树

## 你的数据是什么类型？

### 分类数据 + 数值数据
- 比较组间差异 → 柱状图 / 箱线图 / 小提琴图
- 查看分布形状 → 直方图 / 核密度图 / 蜂群图

### 两个数值变量
- 查看相关性 → 散点图 / 回归图
- 展示密度 → 热力图 / 二维核密度图

### 时间序列
- 趋势 → 折线图
- 多条线对比 → 分面折线图

## 你的分析目标是什么？
...
```

### 7.2 用户 Notebook 扩展（长期）
动态目录和 Notebook 解耦已经完成。若未来支持用户上传 Notebook，应在现有协议上增加隔离层，而不是让用户文件直接进入课程目录：

- 用户文件存放在独立目录或用户命名空间中。
- 目录协议增加来源字段，例如 `source: "course" | "user"`。
- Notebook metadata 约定 `course_module`, `course_chapter`, `course_title` 和唯一 ID。
- 用户 Notebook 不参与课程源文件的自动清理和课程目录排序。
- 发布目录与用户草稿目录分离，避免用户内容覆盖课程内容。

### 7.3 进度可视化
增强学习进度追踪：
- 检测 assert 通过后自动标记为"已完成"
- 在课程树中显示完成百分比
- 生成学习报告（完成章节、耗时、错题记录）

---

## 八、参考资料

### 8.1 技术文档
- Jupyter Notebook Format: https://nbformat.readthedocs.io/
- JupyterLab Extensions: https://jupyterlab.readthedocs.io/
- Pyodide Package Management: https://pyodide.org/

### 8.2 教学设计理论
- **形成性评估**：练习中的 assert 即时反馈
- **认知负荷理论**：TODO scaffold 降低入门门槛
- **迁移学习**：小结中的迁移问题促进深度理解

### 8.3 类似产品
- DataCamp：交互式练习 + 即时反馈
- Codecademy：代码框架 + 提示系统
- Kaggle Learn：micro-projects 导向

---

**文档版本**：v1.0  
**最后更新**：2026-07-26  
**作者**：课程设计团队
