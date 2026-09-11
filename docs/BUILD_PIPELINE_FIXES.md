# 构建管线缺陷与修复记录

> 记录时间：2026-09
> 结论：`npm run build:course` 此前**长期失败**，且会**破坏已提交的 notebook 内容**。
> 根因是「生成器脚本」与「校验器 / 已提交内容」三者**格式代际不一致**。
> 本次已定位并修复 5 个缺陷，`build:course` 现可完整跑通（exit 0），四项检查全绿。

---

## 一、五个缺陷与修复

### ① `build-python-foundation-module.py` 破坏已升级章节

**现象**：该脚本无条件调用 `write_notebook()` 覆盖 12 个章节
（ch1–ch9、ch11、ch12、ch15），把它们从**新格式**退回**旧格式**，
随后 `check:teaching` 报：

```
ERROR: expected one section, found 0: ## 本章目标
```

**两种格式的区分特征**：

| | 标记小节 |
| --- | --- |
| 新格式（已提交、应保留） | `本章目标` / `本章场景` / `工具速查` / `本章实训` / `易错点提醒` |
| 旧格式（本脚本产出） | `这一章要解决什么` / `这一章怎么走` / `学完以后，你应该能做到` |

**修复**：新增 `is_upgraded_on_disk(path)` 守卫——检测到新格式标记小节即**跳过生成**，
保留磁盘上的版本。实测输出：

```
Built 0 integrated Python lessons and 1 capstone.
Skipped 13 already-upgraded notebooks: course-chapter-1.ipynb, …, course-chapter-time.ipynb
```

### ② catalog / notebook H1 标题错位（ch6–ch12）

**现象**：`check:teaching` 报 `catalog title differs from notebook: /course/course-chapter-6.ipynb`。

**根因**：标题有**三个来源**且互相矛盾——

1. `scripts/sync-catalog.mjs` 的 `DISPLAY_MAP`（权威展示映射）
2. `scripts/build-python-foundation-module.py` 的 `CHAPTERS`
3. notebook 文件自身的 H1

ch7–ch12 的映射整体**错位一格**。

**判定依据**：以**章节实际小节内容**为准。例如 ch7 的小节是
「集合的特性与创建 / 增删元素 / 关系运算与去重」，因此正确标题是
**「集合：去重与关系」**，而不是错位来的「条件判断：把规则写清楚」。

**修复**：三处同步为按内容判定的正确标题。校验结果：
`title 不是 H1 子串的章节：0`。

### ③ ch7 章节内重复标题（既有缺陷）

**现象**：单个 markdown cell 内出现两个标题且**标题文字相同**：

- `cell#7`：`## 7.1 集合的特性与创建` + `## 7.2 集合的特性与创建`
- `cell#14`：`## 7.3 增删元素` + `## 7.4 增删元素`
- `cell#20`：`## 7.5 关系运算与去重` + `## 7.6 关系运算与去重`

**核实**：用 `git show HEAD:<path>` 对比确认这是**既有缺陷**，并非本次改动引入。

**修复**：删除 3 个重复标题行；并把因此产生的跳号
（7.1, 7.3, 7.5, 7.7 …）重编为连续的 **7.1–7.9**。

> **澄清**：ch11 与 ch10 的内容**并不重复**
> （ch10 = 认识函数 / 参数 / 返回值；ch11 = key 参数 / 推导式 / `*args`）。
> 此前的判断基于过期构建产物，特此更正。

### ④ `build-module-capstones.py` 未纳入构建管线

**现象**：`capstone-python` 被 `build-python-foundation-module.py` 覆盖为旧式结构，
丢失 `capstone-stage` / `teacher-answer` 标签，校验报：

```
ERROR: capstone requires three tasks before three answers: capstone-python
```

**修复**（两步）：

1. 把 `python scripts/build-module-capstones.py` 加入 `course:core` 管线，
   位置在 `build-python-foundation-module.py` **之后**（后者会先覆盖 capstone）。
2. 该生成器补落两个必需小节：`## 本章目标` 与 `## 学习准备与补学路径`。
   注意 —— `maintain-teaching-resources.py` 会按模块规格**重写**这两节，
   但要求它们**先由生成器落下**，且必须带 `module-teaching-design` 标签，
   否则报 `unmanaged or duplicate readiness section`。

### ⑤ 构建管线重复定义（易漂移）

`build:course`（11 步）与 `rebuild:course:generated`（12 步）曾**重复 11 步完全相同的命令**，
修改时容易只改一处导致两条管线漂移。

**修复**：抽出 `course:core` 作为唯一真相，两个入口均委托它：

```json
"course:core": "… 11 步 …",
"build:course": "npm run course:core",
"rebuild:course:generated": "node scripts/rebuild-course-notebooks.mjs && npm run course:core"
```

---

## 二、校验契约（修复后必须全绿）

| 命令 | 期望输出 |
| --- | --- |
| `npm run check:notebooks` | `notebook architecture check passed: 386 files` |
| `npm run check:notebook-math` | `stale: 0` |
| `npm run check:teaching` | `catalog checked: 127 resources, 8 modules; stale files: 0` |
| `npm run check:module-intros` | `stale: 0` |
| `npm run build:course` | **exit 0** |

派生树（由 `--sync-runtime` 生成，均已重建）：

- `notebooks/course/` —— 127 个 ipynb（JupyterLite 打包输入）
- `public/runtime/files/course/` —— 127 个 ipynb
- `public/runtime/files/extras/` —— 2 个 ipynb

---

## 三、经验教训

1. **生成器必须尊重"磁盘上更新的内容"。**
   当生成器代际落后于已提交内容时，无条件覆盖会造成**静默回退**。
   守卫条件应基于**内容特征**（标记小节），而不是文件名或时间戳。

2. **同一个信息有多个来源时，必须以内容为准并一次性对齐全部来源。**
   否则会陷入「改 A → B 覆盖 → 改 B → A 覆盖」的循环（本次确实绕了几圈）。

3. **删除"看似无用"的脚本前，要确认它不在构建管线里被间接依赖。**
   `build-module-capstones.py` 当时无任何引用，却是 8 个大作业的**唯一正确生成器**。

4. **校验器与生成器的命名契约必须一致**：
   小节标题（`## 本章目标`，而非 `## 学习目标`）
   与必需的 cell 标签（`module-teaching-design`）。
