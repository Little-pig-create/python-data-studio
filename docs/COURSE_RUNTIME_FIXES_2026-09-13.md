# 课程 Notebook 运行时缺陷与修复记录

> 记录时间：2026-09-13
> 背景：`2026-09-13-course-restructure-v1` 全课程重写（ch1–ch111 共 113 份 Notebook）尚未提交，
> 也没有跑过 `course:core` 管线。本次先把**课程能不能跑通**这件事做实：
> 逐格顺序执行全部 113 份 Notebook，把「真实运行错误」清零。
>
> 结论：**50 章 / 71 处真实运行错误 → 0 处**（113 章全绿）。
> 其中 16 处经逐格比对确认**在 HEAD（v0.1.11）就已存在**，本次重写**零回归**；
> 55 处来自管道格式化器新引入/未清除的 f-string 损坏。
>
> **第二轮（第五节）**：把派生树与 catalog 对齐并补跑格式化，过程中又发现
> **两处本次重写新造成的回归**（ch02–13 小节编号退回 `## 1.x`、ch14–27 模块归属被写成 `python`），
> 已一并修复。现在 `check:notebooks` / `check:teaching` / `check:notebook-math` /
> `check:module-intros` / `check:course-runtime` **全部通过**。
> 另发现 **`npm run course:core` 已不能整体重跑**（第六节）。

---

## 一、先说结论：错误分类

| 类别 | 处数 | 章节 | 性质 |
| --- | --- | --- | --- |
| f-string 格式说明符被换行撑坏 | 55 处 / 26 章 | ch39–ch74 | **管道格式化器引入**，且在 HEAD 中已存在 |
| 长度/类型不匹配（演示数据与本章序列不同长） | 7 处 / 6 章 | ch31/34/35/36/38/42 | 在 HEAD 中已存在 |
| 通用「what-if」实验格与本章模型/数据不匹配 | 9 处 / 9 章 | ch79/82/92/95/97/98/103/108/111 | 在 HEAD 中已存在 |

「在 HEAD 中已存在」的判定方式：把失败格的源码做空白归一化后，与
`git show HEAD:<notebook>` 中同章的代码格逐一比对。16 处非 f-string 失败**全部命中 HEAD**，
即**没有一个失败是本次重写新造成的**。

> 这一点修正了上一轮的初步判断。上一轮看到 ch31 的参考答案里有
> `n = min(len(ad_spend), len(sales), ...)` 截断保护、而重写后的示例格没有，
> 曾判断为「重写丢了保护」。实际比对后确认：**该保护只存在于 HEAD 的参考答案格，
> 示例格在 HEAD 里同样是坏的**——重写只是把同一处缺陷一起搬了过来。

---

## 二、根因逐条

### ① `format-course-notebooks.py`：autopep8 会把 f-string 拆行拆坏（最严重）

`autopep8.fix_code(..., aggressive=2, max_line_length=79)` 会把
**f-string 替换字段的花括号当成断行点**，并把续行缩进塞进格式说明符：

```python
# 输入（正确）
print(f"Diamonds {len(diamonds):,} | Taxis {len(taxis):,} 行")

# autopep8 输出（损坏）
print(
    f"Diamonds {
        len(diamonds):,    } | Taxis {
            len(taxis):,        } 行"
)
```

损坏后的写法在 **PEP 701（Python 3.12+）下依然能编译**，所以语法检查、Cell 编译都发现不了，
只在运行时抛 `ValueError: Invalid format specifier ',    '`。

已用 `autopep8 2.3.2` 独立复现（与 black 无关，black 不拆字符串）。实测范围：
`public/course` 下 **36 份 Notebook、165 个格式说明符**受损（ch39–ch74 的
「准备可复现数据」共享格，另有 `module-capstone-projects.ipynb` 各 1 处）。

**关键点**：该脚本在 `npm run course:core`（即 `build:course`）里。
只修 Notebook 而不修脚本，下一次跑管线会**重新拆坏**。

### ② `pd.crosstab` 在 category 列上返回全部 38 个国家

`transactions` 以 `dtype={"Country": "category"}` 读入，`pd.crosstab(rows["Country"], ...)`
默认 `observed=False`，于是即使只看销售额前 4 国，结果仍有 **38 行**（其余 34 行全 0）。
`regions` / `online` / `offline` 因此都是 38 长，而注释写的是「销售额前 4 国」。

影响：ch28–ch38 共 11 章的区域图表画了 34 根高度为 0 的柱子；
ch36 cell#42 直接报 `shape mismatch (38,) vs (4,)`。

### ③ ch36：只给 `months` 切了前 6 个月

```python
months = monthly_summary.index.to_numpy()[:6]   # 只有这一行切片
sales = (monthly_summary["sales"] / 10_000).to_numpy()
orders = monthly_summary["orders"].to_numpy()
```

4 个序列从此长度不一致，后续 `ax.bar(months, sales)` 报 broadcast 失败。

### ④ ch31 / ch34：演示数组长度与本章序列不一致

`ad_spend` 写死 6 个值、`office`/`digital` 写死 6 个值，而本章 `months`/`sales` 是 13 期。
`np.argmin`、`zip(ad_spend, sales, months)`、`sales - office - digital` 全部踩空。

### ⑤ 练习脚手架（exercise）回写了本章变量

`transform_rest.py` 的变量保护只作用于 `experiment` / `error-recovery` 两类标签的格，
**练习格（`exercise`）不在保护范围内**：

- ch35 cell#11 脚手架写 `labels = ["选项A", ..., "选项D"]`（4 个），
  而本章 `labels` 是 3 个渠道名 → 后续环形图 `ax.pie(channel_sales, labels=labels)`
  报 `'labels' must be of length 'x', not 4`。
- ch38 cell#14 脚手架把 `months`/`sales` 改成 6 个月，
  → 紧随其后的「例 2」用这 6 个月去配 13 期的 `profit`，报形状不匹配。
  （同章 cell#20/#25 因为标签是 `experiment`/`error-recovery`，已被正确改名为
  `_demo_months`/`_demo_sales`；练习格被漏掉了。）

### ⑥ 变量保护是**逐格**做的，导致「定义改了、读取没改」

这是 ch79–ch105 那 28 个「第一个结果怎么读」实验格的共同病根。模板原文统一是：

```python
X_changed = X.copy()
X_changed["visits"] = X_changed["visits"] + 1
changed_prediction = model.predict(X_changed)
```

而**前一格**是自带的营销回归小样：

```python
X = pd.DataFrame({"visits": [...], "discount": [...]})
model = LinearRegression().fit(X, y)        # ← 原文
```

`protect_demo_variables()` 按「本格顶层赋值 ∩ 受保护名」改名，于是：

- **定义格**：`X` → `_demo_X`、`model` → `_demo_model`（防止污染本章 `X`/`model`）；
- **紧随的读取格**：`X` / `model` 不是它的赋值，**不参与改名**。

结果读取格一边用本章自己的 `model`（在 ch79 是鸢尾花 4 特征模型），
一边用被改名后的 2 列营销 `X` → `ValueError: The feature names should match those
that were passed during fit`。ch92 的变体是反向的（定义格造了 `_demo_X`，读取格还在用 `X`）。
ch108/ch111 同理：定义格把 demo 的 `raw` 改名为 `_demo_raw`，下一格 `clean = raw.drop_duplicates()`
仍在读本章真实 `raw` → `KeyError: 'amount'`。

> 注：这类失败在旧版校验日志里显示为空错误信息，是因为 sklearn 的
> `ValueError` 消息是多行的，而日志只取了 traceback 最后一行。

### ⑦ ch42：`pointplot` 给的标记数少于 hue 层数

`channel` 来自钻石 `color`（D…J，7 层），但 `markers`/`linestyles` 只给了 3 个，
seaborn 内部 `markers[sub_vars.get("hue")]` 直接 `KeyError: 'F'`。

### ⑧ ch38：标题写死了「利润在6月达到最高」

数据峰值并不在 6 月，这张图原本因为形状不匹配根本没画出来，所以没人发现标题是错的。

---

## 三、修复内容

### 新增

| 文件 | 作用 |
| --- | --- |
| `scripts/fstring_guard.py` | 用 AST 检测并重建「格式说明符被塞了空白」的 f-string；`count_damaged_specs()` 可做门禁 |
| `scripts/check-course-runtime.py` | 逐格执行 113 份 Notebook 的**回归门禁**；区分 DESIGN（故意的报错演示 / 未填练习）与 REAL，有 REAL 就 `exit 1` |
| `scripts/rewrite_python_basics/apply_rewrite_fixes.py` | **幂等**补丁集：一次性修复本节②–⑧ 在已生成 Notebook 中的表现；每条替换都带出现次数断言，对不上就报错而不是静默改坏 |
| `scripts/test_rewrite_fixes.py` | 变量保护的单元测试（6 例） |

### 修改

| 文件 | 改动 |
| --- | --- |
| `scripts/format-course-notebooks.py` | 格式化后统一走 `repair_fstrings()`；若损坏数比原文更多则**回退为原文**；新增 `--repair-only` / `--include-source` |
| `scripts/rewrite_python_basics/transform_rest.py` | 变量保护改为**成组**：只被 markdown 隔开的相邻演示格视为一次演示，按「组内赋值 ∩ 受保护名」统一改名。这正是⑥的根因修复 |
| `package.json` | 新增 `check:course-runtime`、`repair:course-fstrings`、`test:rewrite`；修正原本就坏的 `test:teaching`（`scripts/` 不是包，`-m unittest scripts/xxx.py` 导入必失败，改为直接执行文件） |

### 修复后的写法示例

```python
# ch39 准备格（修复后，输出也变干净）
print(f"Diamonds {len(diamonds):,} | Taxis {len(taxis):,} | Flights {len(flights):,} 行")

# ch34 品类构成（改为由本章序列派生，长度天然一致）
office = (sales * 0.35).round(1)
digital = (sales * 0.45).round(1)
home = (sales - office - digital).round(1)

# ch79–ch103 what-if 格（改为使用前一格真正拟合出的模型）
changed_prediction = _demo_model.predict(X_changed)

# ch108/111 清洗格（改为续用前一格造的 demo 数据）
clean = _demo_raw.drop_duplicates().copy()
```

---

## 四、验证

```bash
python scripts/check-course-runtime.py          # 113 章逐格执行，REAL 必须为 0
python scripts/test_rewrite_fixes.py -v         # 变量保护单元测试
```

实测结果（`logs/course-runtime-check.txt`）：

```
=== chapters with REAL errors: 0 -> []
=== total REAL errors: 0
=== chapters checked: 113
```

日志留档：

| 文件 | 含义 |
| --- | --- |
| `logs/course-runtime-check-2026-09-13-before-fixes.txt` | 修复前基线：50 章 / 71 处 REAL |
| `logs/course-runtime-check-2026-09-13-after-fixes.txt` | 修完 f-string + 对齐问题后：9 章 / 9 处 REAL |
| `logs/course-runtime-check.txt` | 当前状态：0 处 REAL |

备份：修复前的 `ch39–ch74` 与 `ch28–42` 两份 Notebook 快照存放在
`.dsh-work/backup-fstring-repair/` 与 `.dsh-work/backup-step2/`。

---

## 五、第二轮：管线对齐（本条做完后 113 章全绿 + 全部门禁通过）

运行时清零只保证「能跑」，不代表与设计产物一致。第二轮把派生树与 catalog 对齐，
过程中又发现**两处本次重写新造成的回归**（都不影响运行，只影响课程结构与教学资源）：

### 5.1 跑通对齐

```bash
python scripts/normalize-notebook-architecture.py --sync-runtime   # 386 files, 补稳定 cell id + content_fingerprint
node   scripts/sync-catalog.mjs                                    # catalog v82 -> v84
```

- `check:notebooks`：`notebook architecture check passed: 386 files`（此前报 `missing or duplicate cell IDs`）。
- `check:teaching`：`catalog checked: 127 resources, 8 modules; stale files: 0`。
- `check:module-intros`：`stale: 0`。

> **更正上一轮的判断**：此前担心「教学契约冲突」（重写章节写 `## 学习目标`，而
> `maintain-teaching-resources.py` 要求 `## 本章目标`），并认为需要在「改校验器」与
> 「补章节小节」之间二选一。实际排查后**该冲突不存在**：`## 本章目标` 只被
> `enrich_capstone()`（`--write` 模式）使用，`--check` 走的是
> `validate_catalog()` + `validate_design()`，两者都不要求这个标题。
> 当时 `check:teaching` 报红，真正原因依次是 **cell id 缺失**（5.1 修好）和
> **模块归属漂移**（5.3 修好）。

### 5.2 回归一：ch02–ch13 的小节编号退回 `## 1.x`

`scripts/rewrite_python_basics/chNN.py` 是从 `ch01.py` 复制出来的骨架，
小节编号没有跟着改，于是**第 2–13 章全都印着「1.1、1.2、…」**。
而章节自身身份是第 N 章（`course.chapter == N`、H1 `第N章`，练习里也写着「练一练 2.1」），
HEAD 里更是正确的 `## 2.1` / `## 10.1` —— 属于本次重写新造成的回归。

修复：`apply_rewrite_fixes.py` 新增 `RENUMBER_CHAPTERS`（02–13，共 12 章、50 处标题），
**同时改内容模块与已生成 Notebook**，所以日后重跑 `build.py 2..13` 不会再退回去。
`ch01.py` 的 `## 1.x` 是合法的，未动。

### 5.3 回归二：ch14–ch27 的模块归属被写成 `python`

`build.py` 的 `chapter_metadata()` 把 `course.module` 写死成 `"python"`，
而 `sync-catalog.mjs` 以 Notebook 内容优先，于是 numpy 的课
（文件 14–18）与 pandas 的课（文件 19–27）**全被并进 python 模块**：

| 模块 | HEAD（正确） | 重写后（错） |
| --- | --- | --- |
| python | 16 章 | **30 章** |
| numpy | 7 章（入门 + 5 课 + 大作业） | **2 章**（只剩入门 + 大作业） |
| pandas | 11 章（入门 + 9 课 + 大作业） | **2 章**（只剩入门 + 大作业） |

这正是 `check:teaching` 报 `invalid recovery resource: numpy/course-chapter-14.ipynb`
的原因 —— `course-teaching-design.json` 的补学路径仍指向 numpy/pandas 模块里的课，
而那些课已经被搬到 python 模块。展示章号本来就是对的，所以只有模块字段需要修。

修复：`build.py` 的 `CHAPTERS` 增加第 5 个字段 `module`（14–18 → numpy，19–27 → pandas），
`chapter_metadata()` 不再写死；`apply_rewrite_fixes.py` 新增 `MODULE_BY_KEY` 就地修
已生成的 14 章 × 2 棵树。修完 catalog v84 的模块分布与 HEAD 完全一致。

### 5.4 回填被重写丢弃的数学注释

`check:notebook-math` 报 `stale: 87 / 96`。原因是每章被整体重写，HEAD 里由
`enrich-notebook-math.py` 注入的 `<!-- math-foundation:… -->` 注释（每章 1 格）全部丢失
（`git show HEAD` 里 ch2/ch60/ch100 各有 2 处标记，当前为 0）。

```bash
python scripts/enrich-notebook-math.py                              # changed: 87
python scripts/normalize-notebook-architecture.py --scope app       # 重算 app 树 id/fingerprint
```

`stale` 87 → 0。该脚本只写 `public/course`（app 树），按 marker 幂等替换，
锚点为「第一个代码格之前」，不碰 `notebooks/course`（源码树）与 runtime 树。

### 5.5 补跑格式化，并复核 PEP 8

重写后的 Notebook 走的是「内容模块直出」状态，从未过 autopep8。这与 HEAD 差距很大
（HEAD 每格都格式化过），也是 PEP 8 计数暴涨的原因：

```bash
runtime/native/dist/python-runtime/python.exe scripts/format-course-notebooks.py --include-source
# Formatted 792 code cells in 184 course notebooks (f-string format specifiers rebuilt: 0)
```

**`rebuilt: 0` 是根因修复有效的直接证据** —— 修复后 `autopep8` 再跑一遍，
没有任何格式说明符被拆坏，也没有触发「更差则回退原文」的保护。

格式化会重排 `module-intro-*.ipynb` 里注入的检查点代码，使
`check:module-intros` 从 0 stale 变成 2 stale，因此需**按顺序**再补跑：

```bash
python scripts/enrich-module-intro-checkpoints.py            # changed: 2
python scripts/normalize-notebook-architecture.py --scope app # 重算 app 树 id/fingerprint
```

PEP 8 三阶段对比（同一份 `pycodestyle 2.14.0`、`max_line_length=79`、无 ignore）：

| 规则 | HEAD | 重写后·格式化前 | 重写后·格式化后 | 相对 HEAD |
| --- | ---: | ---: | ---: | ---: |
| E501 行太长 | 32 | 115 | **82** | +50 |
| E305 函数后空行 | 0 | 40 | **0** | 0 |
| E302 定义前空行 | 0 | 28 | **0** | 0 |
| E261/E262 行内注释空格 | 0 | 6 | **0** | 0 |
| E303 空行过多 | 0 | 4 | **0** | 0 |
| E402 导入不在顶部 | 0 | 3 | **0** | 0 |
| E731 赋值 lambda / E722 裸 except / E711 `== None` | 0 | 4 | **0** | 0 |
| E122/E127 续行缩进 | 3 | 5 | **0** | −3 |
| **合计** | **35** | **205** | **82** | **+47** |

即：**除 E501 外全部清零**（连 HEAD 遗留的 3 处 E127 也顺手修掉了）。
剩下的 82 处 E501 拆解如下：

| 类型 | 处数 | 能否拆 | 例 |
| --- | ---: | --- | --- |
| 修复后的 f-string 状态串 | 57 | **不能**（拆了就重新变成 §二①的损坏写法） | `f'Diamonds {len(diamonds):,} \| Taxis {len(taxis):,} \| Flights {len(flights):,} 行'` |
| Plotly `hovertemplate` 模板串 | 4 | 否（`%{x \| %Y-%m-%d}<br>` 是单 token） | `hovertemplate="周=%{x \| %Y-%m-%d}<br>销售额=%{y:,.0f}…"` |
| 中文字体候选列表 | 14 | 可（拆成多行 list） | `plt.rcParams["font.sans-serif"] = ["Microsoft YaHei", "SimHei", …]` |
| 长注释（练习说明/提示） | 6 | 可（但纯属排版） | `# 请在下方填写代码：把透视表的 values 参数从 "order_value" 改为…` |

**结论**：E501 的增长主要由「不可避免的长 f-string」贡献（57/82）。
`check:pep8` 是**独立开发脚本，没有接入任何 CI/发布门禁**（全仓仅 `package.json`
一处引用），因此这 82 处属于**信息性**结果。是否清理那 20 处「可拆」的长行，
是排版偏好问题，留作可选后续。

### 5.6 复检结果

```bash
runtime/native/dist/python-runtime/python.exe scripts/check-course-runtime.py
npm run check:notebooks && npm run check:teaching
npm run check:notebook-math && npm run check:module-intros
```

```
checked 113 chapters: REAL=0, DESIGN=0
notebook architecture check passed: 386 files
catalog checked: 127 resources, 8 modules; stale files: 0
math formula notebooks configured: 96 / stale: 0
module intro checkpoints configured: 6 / stale: 0
```

以上为**跑完格式化之后**的复检结果（格式化改动了 792 个代码格，必须重跑）：
运行时仍为 113 章 REAL 0 / DESIGN 0。

> **运行检查必须用带依赖的解释器**。误用 `.workbuddy` 托管 Python 3.13（无 numpy/pandas/sklearn）
> 会得到 `REAL=762` 的假警报（全部是 `ModuleNotFoundError`）。
> 用仓库自带 `runtime/native/dist/python-runtime/python.exe` 或 `D:\Python3\python.exe`。

---

## 六、`course:core` 已不能整体重跑（重要）

`npm run course:core` 的第 3、4 步是**内容生成器**，它们会**覆盖重写成果**：

| 步骤 | 行为 | 现状 |
| --- | --- | --- |
| `build-python-foundation-module.py` | 用自带（`2026-08-07-python-merged-chapters-v1`）生成器**重写 `public/course/course-chapter-1..13 / common-modules / time`** | **已被重写取代，必须从管线移除** |
| `build-module-capstones.py` | 重写 `public/course/module-capstones/*` | 需单独确认是否仍与重写一致 |

其余步骤（`enhance-notebooks-for-beginners` / `prune-redundant-notebook-sections` /
`format-course-notebooks` / `close-notebook-learning-loops` /
`enrich-module-intro-checkpoints` / `enrich-notebook-math` /
`normalize` / `sync-catalog` / `maintain-teaching-resources`）都是后处理，
可以安全重跑（`format` 的 f-string 损坏已做根因修复）。

本轮**只手工执行了需要的子集**，没有跑 `course:core`，避免第 3、4 步回退 ch1–13。
后续应把 `course:core` 拆成 `course:author`（内容生成）与 `course:enrich`（后处理）两条链。

---

## 七、尚未处理（下一步）

1. **E501 清理（可选、纯排版）**：见 §5.5 —— 82 处里约 20 处（字体候选列表 + 长注释）
   是可拆的，其余 61 处是不可避免的长字符串。`check:pep8` 未接入任何门禁，可不做；
   若要做，建议一次性处理「字体候选列表」这个重复了 14 次的模式（抽成共享常量或跨行 list）。
2. **`course:core` 收敛**：按第六节把内容生成与后处理拆开，并删掉
   `build-python-foundation-module.py` 这一步（它会覆盖重写后的 ch1–13）。
3. **收尾**：`docs/CODE_CELL_SPLIT_AUDIT.md`、`docs/CONTENT_REVIEW_ROUND4.md` 的结论
   已被本次重写大面积覆盖，建议作废或改写，不要再去执行旧清单。
4. **入库**：`scripts/rewrite_python_basics/`（重写工具链，`__pycache__` 已被 gitignore）
   尚未纳入版本控制；需决定提交切分（重写 vs 修复）。
   注意 `.gitignore` 里 `notebooks/course/*` 是**被忽略**的，git 实际跟踪的产物只有
   `public/course/`。

### 本轮新增/改动的留档与快照

| 路径 | 内容 |
| --- | --- |
| `.dsh-work/pre-format-snapshot.tgz` | 格式化前 `notebooks/course` + `public/course` 整树快照（1.2 MB） |
| `.dsh-work/pep8-head.json` / `-current.json` / `-after-format.json` | 三阶段 PEP 8 明细（按规则、按 Notebook） |
| `.dsh-work/pep8_report.py` | 生成上述明细的脚本（用 `pycodestyle` 聚合） |
| `.dsh-work/pep8-baseline/` | `git archive HEAD public/course` 解出的基线树 |
| `.dsh-work/catalog-v84.json` | 对齐后的 catalog（v82 → v84） |

（`.dsh-work/` 已被 gitignore，仅本地留存。）


