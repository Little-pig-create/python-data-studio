## 2026-09-13

### 全课程重写后的运行时清零：50 章 / 71 处真实错误 → 0

- **做法**：逐格顺序执行 `public/course` 下全部 **113 份 Notebook**，把异常分为 DESIGN（故意的报错演示 / 未填练习）与 REAL（真缺陷）。基线 `logs/course-runtime-check-2026-09-13-before-fixes.txt`：**50 章 / 71 处 REAL**；最终 **0 处**。
- **诚实归类**：把 16 处非 f-string 失败格的源码与 `git show HEAD:` 逐格比对，**全部在 HEAD（v0.1.11）中已存在** —— 本次重写**零回归**。这修正了上一轮「ch31 等章截断保护是重写丢的」的判断：该保护只存在于 HEAD 的参考答案格，示例格在 HEAD 里同样是坏的。
- **最严重的根因（管道级）**：`scripts/format-course-notebooks.py` 用的 `autopep8 --aggressive` 会把 f-string 花括号当断行点，把续行缩进塞进格式说明符（`{len(x):,}` → `{\n    len(x):,    }`）。该写法在 Python 3.12+ 依旧能编译，只在运行时抛 `ValueError: Invalid format specifier`，因此语法/编译检查都发现不了。已用 autopep8 2.3.2 独立复现；实测 `public/course` 下 **36 份 Notebook、165 个格式说明符**受损（ch39–ch74 共享准备格）。**因该脚本在 `build:course` 里，只修 Notebook 会被下次跑管线重新拆坏**，故同时做了根因修复。
- **其余根因**：`pd.crosstab` 在 category 列上返回全部 38 国（ch28–38 区域图多出 34 根 0 高柱）；ch36 只给 `months` 切了前 6 个月；ch31/ch34 演示数组 6 个值配 13 期序列；练习脚手架回写本章变量（ch35 `labels`、ch38 `months`/`sales`）；`transform_rest.py` 的变量保护**逐格**生效导致「定义格改了名、紧随的读取格没改」（ch79–105 的 what-if 格用本章模型配 demo 数据、ch108/111 读本章 `raw`，共 9 处）；ch42 `pointplot` 只给 3 个 markers 配 7 个 hue 层；ch38 标题写死「利润在6月达到最高」。
- **新增**：`scripts/fstring_guard.py`（AST 检测 + 重建受损 f-string）、`scripts/check-course-runtime.py`（回归门禁，有 REAL 就非零退出）、`scripts/rewrite_python_basics/apply_rewrite_fixes.py`（幂等补丁集，每条替换带出现次数断言）、`scripts/test_rewrite_fixes.py`（6 例单元测试）。
- **修改**：`format-course-notebooks.py` 格式化后统一修复并带「更差则回退原文」保护，新增 `--repair-only`/`--include-source`；`transform_rest.py` 变量保护改为**相邻演示格成组**统一改名（根因修复）；`package.json` 新增 `check:course-runtime`/`repair:course-fstrings`/`test:rewrite`，并修正原本就坏的 `test:teaching`（`scripts/` 不是包，`-m unittest scripts/xxx.py` 必导入失败）。
- 细节见 `docs/COURSE_RUNTIME_FIXES_2026-09-13.md`。

### 管线对齐：目录 / 派生树 / catalog 重新收敛，并修掉两处重写回归

- **顺序**：`format-course-notebooks.py --include-source`（792 个代码格，**f-string 修复数 0**，即上一条的根因修复有效）→ `normalize-notebook-architecture.py --sync-runtime`（386 份，补稳定 cell id + `content_fingerprint`）→ `sync-catalog.mjs`（catalog **v82 → v84**，127 章 / 8 模块）→ `enrich-notebook-math.py`（回填 87 章数学注释）→ `enrich-module-intro-checkpoints.py`（格式化后 2 处检查点重排）→ 逐次 `normalize --scope app`。
- **门禁全绿**：`check:notebooks`（386 文件）、`check:teaching`（127 资源 / 8 模块 / stale 0）、`check:notebook-math`（96 / stale 0）、`check:module-intros`（6 / stale 0）、`check:course-runtime`（113 章 **REAL 0 / DESIGN 0**，格式化后复跑仍为 0）。
- **回归 A｜ch02–ch13 小节编号退回 `## 1.x`**：`chNN.py` 从 `ch01.py` 复制骨架后编号没改，12 章 50 处标题全印成「1.x」（而 HEAD 是正确的 `## 2.1` / `## 10.1`）。`apply_rewrite_fixes.py` 新增 `RENUMBER_CHAPTERS`，**同时修内容模块与已生成 Notebook**，日后重跑 `build.py 2..13` 不会退回。
- **回归 B｜ch14–ch27 的 `course.module` 被写死为 `python`**：`sync-catalog.mjs` 以 Notebook 内容优先，于是 numpy 的课（文件 14–18）与 pandas 的课（文件 19–27）被并进 python 模块，两个模块只剩「入门 + 大作业」，`check:teaching` 报 `invalid recovery resource: numpy/course-chapter-14.ipynb`。`build.py` 的 `CHAPTERS` 增加 `module` 字段并新增 `MODULE_BY_KEY` 就地修已生成 Notebook；修完模块分布与 HEAD 完全一致（python 16 / numpy 7 / pandas 11）。
- **更正上一轮的判断**：此前列为「待用户决策」的「教学契约冲突（`## 本章目标` vs `## 学习目标`）」**并不存在** —— 该标题只被 `--write` 模式的 `enrich_capstone()` 使用，`--check` 走 `validate_catalog()` + `validate_design()`，不检查它。当时报红的真实原因是 **cell id 缺失**（normalize 修好）与**模块归属漂移**（本节回归 B 修好）。
- **发现｜`npm run course:core` 已不能整体重跑**：其第 3 步 `build-python-foundation-module.py` 会用旧生成器（`2026-08-07-python-merged-chapters-v1`）**覆盖 `public/course/course-chapter-1..13 / common-modules / time`**，第 4 步 `build-module-capstones.py` 同理覆盖 capstones。本轮**只手工执行了需要的后处理子集**，未跑 `course:core`。建议拆成 `course:author`（内容生成）与 `course:enrich`（后处理）两条链并删掉第 3 步。
- **PEP 8 复核**（三阶段对比，`pycodestyle 2.14.0`）：HEAD 35 处 → 重写后未格式化 205 处 → 格式化后 **82 处**，即**除 E501 外全部清零**（E305 40→0、E302 28→0、E261/262 6→0、E303 4→0、E402 3→0、E731/E722/E711 4→0，连 HEAD 遗留的 3 处 E127 也修掉）。剩余 82 处 E501 中 **57 处是修复后无法再拆的长 f-string**（拆了就回到 `Invalid format specifier` 的损坏写法）、4 处是 Plotly `hovertemplate` 模板串，仅约 20 处（中文字体候选列表 14 + 长注释 6）属可选排版清理。`check:pep8` 未接入任何 CI/发布门禁，故为信息性结果。
- **另**：`check:pep8` 之前无法运行是因为 `pycodestyle` 未装；已在隔离虚拟环境装入（`pycodestyle 2.14.0`），未污染系统环境。
- 细节见 `docs/COURSE_RUNTIME_FIXES_2026-09-13.md` 第五～七节。

### 发布标准核对：清掉 ch24 的 `assert` 自检，并修好补丁脚本对格式化的抗性

- **依据**：`docs/RELEASE_RUNBOOK.md`（§1.3 / §4.3 / §6）与 `docs/QA_CHECKLIST.md`（§1 / §11 / §12）要求**教学代码不使用 `assert` 作为自检机制**。逐份核对后：HEAD 为 6 处（ch13×5、ch109×1），重写后为 **12 处**（ch13×9、ch24×2、ch109×1）。
- **修复 ch24（本次重写新引入，HEAD 为 0）**：保存-读回闭环的自检由 `assert back.shape == ledger.shape` 改为**显式 `raise`**（`if ... != ...: raise ValueError(...)`），练习指令「TODO 3：用 assert 验证行数一致」同步改为「用 if + raise」。选 `raise` 而非保留 `assert`，是因为 ch13 本身就教「assert 防自己犯蠢，raise 防数据出格」，两章口径现在一致。改后 **12 → 10 处**。
- **豁免 ch13 的 9 处与 ch109 的 1 处**：ch13 是「异常处理、调试与基础测试」章，`assert` 与 `unittest` 就是该章的教学对象，且它已把「拿 assert 做业务校验」写成反例；ch109 那处 HEAD 即存在。建议在发布记录中说明，而非改内容。
- **根因同步**：`ch24.py` 内容模块一并修补（新增 `MODULE_PATCHES` 机制），日后重跑 `build.py 24` 不会退回。
- **顺带修好 `apply_rewrite_fixes.py` 自身的三处缺陷**（此前的 `--dry-run` 会误报 **22 个 FAILURE**）：
  1. **格式化抗性**：autopep8 会把长行重排并在炸开调用时插入魔法尾逗号，导致补丁的字面量与空白容忍匹配双双失效。新增基于 AST 的判定 —— 只要替换后的语句结构（`ast.dump`）已在格中出现，就判为「已修复（因格式化重排）」。补丁**写入**仍用原文替换，判定不再受排版影响。
  2. **索引漂移**：`enrich-notebook-math.py` / `enrich-module-intro-checkpoints.py` 只往 app 树插格，硬编码下标在 app 树会指到别的格。改为先看下标格、再看**哪一格已含替换后的结构**（`apply_cell_patch`），不再按整章计数 —— 因为同章合法复用同一写法（ch35 有 3 处与本补丁无关的 `labels=labels,`）。
  3. **关键字参数片段**：`labels=pie_labels,` / `dodge=0.25,` 不是完整语句、无法解析，回退到空白容忍的正则判据。
  修完 `--dry-run` 报 **`all patches applied cleanly`**（68 处已应用 + 9 处待写入），再跑一次为 0 写入，幂等成立。
- **发布就绪度结论**：**尚不符合**，当前只能标「候选版」。硬阻塞为 ① 工作区不干净（`release.mjs` 要求 clean tree）② 本地 main 领先 `origin/main` 1 个提交 ③ `.workbuddy/` 未忽略；内容缺口为 `dist/course` 未同步（121/128 差异）与 3 份旧文档未标注为历史。
- **另**：`release.mjs` 自身**不跑任何测试或课程门禁**，且 `tauri.release.conf.json` 的 `beforeBuildCommand` 为 `null`（打包只**复制** `public/course`，不重建课程），故「dist 陈旧」不阻塞 git 发版；会覆盖 ch1–13 的是另一条路 `desktop:build:online`。

## 2026-08-16

### 第一模块大作业重新设计：极客联赛 → 个人账本·年度汇总

- 按用户要求，把第一模块模块大作业从「极客联赛·成绩数据救援」重新设计为贴合「**个人记账助手**」主线的「**个人账本·年度汇总**」，与贯穿第一模块的记账案例呼应；
- **新数据集** `module1_ledger.csv`（84 行）：日期/分类/金额/备注四字段，含缺失、重复、中文数字金额、N/A、缺考、非法日期(13月)等脏数据；参考实现验证：63 有效 + 20 被剔除（重复3/缺字段6/金额非数值10/非法日期1），12 个月支出可统计；
- **大作业 Notebook 重写**（module-capstone-python.ipynb）：背景故事（年底写年度财务报告）→ 数据说明 → 任务（含 datetime 日期校验、错误原因分离、月度/分类/收支统计、5 个函数、输出 rejected/monthly/report 三文件）→ 验收 → 自检 → 评分 → **新增进阶任务**；复用第一模块全部知识点（字符串、列表/字典/集合、文件、函数、异常、datetime）；
- **catalog 修正**：capstone metadata 补顶层 `chapter_kind` 等（对齐其它 capstone），标题更新为「个人账本·年度汇总」，正确识别为 capstone 并排在 python 模块末尾（so15.5）；
- 验证：参考实现证明题目可解且脏数据分布合理；normalize --check 396 通过；dev 加载 catalog/capstone/数据集 200；已同步 notebooks/course + runtime。

## 2026-08-16

### 第一模块补充缺失知识点 + 新增「常见 Python 模块」章节

**补充知识点（改进现有章节内部）**
- **ch4 补「步长切片」**：`[start:stop:step]`、`[::-1]` 倒序、隔一个取，附可运行演示；
- **ch3 补「字符串与数字拼接陷阱」**（+ 只认字符串、str() 转换、f-string 推荐）**+「多行字符串三引号」**；
- **ch8 补「and/or 短路返回值」**：or 取默认值、and 安全组合，返回的是对象而非 True/False，附演示。
- 各演示 code cell 均平台运行通过。

**新增章节「常见 Python 模块」（ch14，插入 ch13 异常之后、time 模块类之前）**
- 内容：`math`（取整/平方根）、`random`（choice/sample/shuffle/randint）、`datetime`（构造/相减/格式化）、`csv`（DictReader 读写）、`os`/pathlib（路径/目录）、本章实训、易错点、练习、小结；
- 6 个 code cell 全部运行通过，小节编号 14.1-14.9；
- DISPLAY_MAP 升级 v6（插入新章，time 顺延 15、后续各模块 +1），catalog 共 127 章，id 唯一、sortOrder 唯一且单调。

**验证**：dev server 加载新章/被改章均 200；frontend catalog 127 章无重复 id；normalize --check 396 文件通过；runtime 副本 130 已同步；已同步 notebooks/course。

## 2026-08-16

### 修复：侧边栏空白（catalog 重复 id）—— 入门章的 catalog 集成

- **根因**：新增 6 个模块入门章后，sync-catalog 中入门章 id 用 `chapter-<展示号>`，与同名技术章（如地图图表 ch75 & 在线零售 ch75）撞名，触发 Tree View 组件"所有 items 需唯一 id"错误 → 侧边栏树渲染异常/空白；
- **修复**：
  1. sync-catalog 全面引入 intro 支持——扫描 module-intro-*.ipynb、kind 识别 intro、intr 页 id 用 `intro-<module>` 唯一化；
  2. **DISPLAY_MAP 重写为 v5**：全局顺序分配展示号（python 1-14 → numpy intro15/tech16-20 → … → projects 76-79 → ML intro80/tech81-118），消除 plotly 与 projects 的 ch75/76 撞号，展示号 1-118 唯一连续；
  3. sortOrder 统一基于展示号（intro = 展示号 - 0.25，定位在前模块 capstone 之后、本模块技术章之前），各模块 sortOrder 无重复且单调递增；
  4. 修复过程中误插报错的 sync-catalog 语法，从备份恢复并重新完整注入补丁；
- **验证**：catalog v3X 共 126 章，id 全部唯一、sortOrder 无重复且单调、各模块首位均为入门章；前端 dev 加载 catalog/入门章 200；normalize --check 393 文件通过；runtime 副本 129 已同步；
- 已同步 notebooks/course。

## 2026-08-16

### 每个模块新增独立「入门介绍章节」

- 按用户要求：每个模块单独开一个入门介绍引章节（参照第一模块 ch1 策略），并把之前临时补在第一章开头的「模块引言」小节**全部撤回**；
- **新增 6 个独立入门章**（module-intro-*.ipynb，kind=intro）：NumPy(展示15)、Pandas(20)、Matplotlib(29)、Seaborn(40)、Plotly(59)、机器学习(80)；每个入门章含「场景 → 这个模块解决什么问题 → 学习地图 → 首个上手示例 → 小结自测+口诀」，并附一个**可运行的示例代码 cell**；
- 这些入门章插在各模块技术第一章之前，技术章展示号顺延（如 numpy 入门=15、数组基础=16）；
- **sync-catalog.mjs 扩展**：扫描 module-intro-*.ipynb、DISPLAY_MAP 加入入门章条目、kind 用 display.kind、入门章 sortOrder=display.chapter-0.25（规避 capstone 的 .5 冲突）；
- **撤回**：移除 6 个技术章开头的临时「模块引言」markdown cell（恢复 title→本章场景）；
- 验证：6 入门章 JSON 合法、示例代码全部运行通过、catalog v34 共 126 章、sortOrder 全唯一、各模块"入门→技术第一章"顺序正确、normalize --check 393 文件通过；已同步 notebooks/course + runtime 副本(129)。

## 2026-08-16

### 章节内部拆分：NumPy/Pandas 模块（ch16-27）示例讲解统一
- **补充**：ch15（样板章）示例讲解原先缺「口诀」，已补齐，使 ch14-27 共 42 个示例全部为「背景引入→讲解→要点→口诀」统一格式；同步 notebooks/course(113)。


- 按用户要求聚焦"每一章节的拆分"（不以设计文档新增专题，而是统一章内教学拆分）；经审计确认 Python基础(1-13+模块类) 正文知识点已具备「背景引入+讲解」，**真正缺口是 ch16-27 的 36 个「示例 N」小节**只有一句话说明、缺少 ch10/ch15 样板的完整讲解；
- **为 ch16-27（12 章）每个示例 markdown cell（cell#4/6/8）补齐「背景引入 → 讲解（要点列表）→ **口诀**」三段式教学块**，风格严格对齐 ch14/ch15 样板，内容基于各示例实际代码 + 方法分类速查表，口语化、贴记账/销售/运营场景：
  - ch16-18 numpy：reshape/转置/合并拆分、向量化/广播/通用函数、按轴统计/分位数/随机抽样；
  - ch19-21 pandas：Series/DataFrame/索引对齐、loc·iloc/筛选/排序、增删列/改列/类型转换；
  - ch22-24 pandas：质量概览/缺失重复/IQR、文本标准化/日期解析/特征构造、CSV读写/类型缺失/导出；
  - ch25-27 pandas：分组聚合/transform占比/透视表、rel join/拼接/melt、滚动累计/描述统计/相关分位；
- 4 个子代理并行处理（numpy 组 + 3 个 pandas 组）；仅改示例 markdown cell，标题/原有说明保留；
- **验证**：12 章全部 cell#4/6/8 含讲解+口诀；普通 JSON 合法；`git diff` 确认 code cell 未被触碰（新增行全是讲解）；平台 Python 语法编译 ALL OK；ch16(16/17)、ch25(18/19) 全章运行通过，仅剩练一练脚手架未填的预期 NameError；
- 同步：notebooks/course(113) + runtime 副本(123) + normalize check(375)。

## 2026-08-16

### 修复：侧边栏章节顺序错乱（catalog 编号全面对齐）

- **根因**：sync-catalog 的 chapterOffset（文件≥14 时 +1）把「模块、类与项目组织」编为第14章，但「数组基础」文件仍标14，导致从数组基础起 catalog 的 chapter 编号与文件内容标题整体错位（侧边栏"第15章 索引切片"实际点开是数组基础）；
- **修复**：在 sync-catalog.mjs 引入权威展示映射 DISPLAY_MAP（从真实文件内容标题重建 112 章连续序列：1-13 Python 基础、14 模块类、15 数组基础、16-112 顺延），decoding 优先于旧的 offset 推断；同时补回被误删的 module 定义行；备份原脚本 sync-catalog.mjs.bak；
- **结果**：catalog v28 共 120 章，112 个普通章节全部与权威展示序列 112/112 精确匹配，chapter/sortOrder 连续 1-112，标题与文件内容一致；模块分组正确（time→python 14、数组基础→numpy 15、capstone 挂各模块末尾）；
- 未改动任何课程文件/文件名/内容标题，仅修正目录显示层，学生学习记录与打开内容不受影响。

## 2026-08-16

### 代码简化与常用化审计（全课程）

- **AST 静态审计**（平台 Python）扫描全部 111 章 code cell：172 个"未使用变量"候选逐一核对——除 ch77 的 `heat = df.pivot_table(...)`（定义后从未使用，已删除）外，其余均为**惯用解包**（`fig, ax = plt.subplots()`、`train_test_split` 4 元解包）或**教学脚手架**（练习占位 `my_jitter = __MY_JITTER_VALUE__`、自检变量），予以保留；
- **旧 API 扫描**：全课程**无** DataFrame.append（pandas 2.x 兼容）、无 np.float/np.int、无 .ix/.as_matrix/.iteritems；63 处 .append 全部为列表操作（含可变默认参数/浅拷贝教学示例）；
- 此前已清理 37 处冗余链尾 .copy()（.sample/.query 后多余）；
- ch18「检查样本:」print 为教学输出、ch4 del 语句为教学点，均保留；
- 验证：ch77 全章运行通过（唯一失败为练一练填空脚手架未填的预期报错）；ch39/ch43 运行通过；
- 同步：notebooks/course（113）+ runtime 副本（123）。

## 2026-08-16

### 章节结构补齐：ch12/13 实训、ch14 练一练、8 个项目章易错点

- **ch12 新增「12.6 本章实训：记账文件的持久化闭环」**：3 个实验（Path 定位文件 / with 读写与 JSON 往返 / save_data·load_data 封装闭环），说明与代码分 cell（markdown 操作步骤 + code 实验代码），平台实测全部运行通过；
- **ch13 新增「13.6 本章实训：防御式记账输入」**：3 个实验（安全金额转换 / 校验函数与 raise / 表驱动测试），实测通过；
- **ch14 补「练一练 14.6」**（3×4 数组形状/布尔筛选/元素修改），与同模块 ch15 脚手架风格一致，实测通过；
- **8 个项目章节补「易错点提醒」**（ch75-78、ch108-111，各 5 条，贴合项目主题：RFM 口径、时区、类别不平衡、duration 泄漏、时间序列切分等），插在错误恢复与结论与表达之间；
- 全部章节重跑编号（2299 处），0 乱序、0 空标题；结构审计：全部章节具备 场景/实训/易错点/小结（项目章的练习环节为「提升任务」，验收清单替代练习与作业，属项目模板设计）；
- 同步：notebooks/course（113）+ runtime 副本（123）+ catalog v27。

## 2026-08-16

### 全课程标题编号重排（99 章 324 处乱序修复）

- 发现系统性编号 bug：模板生成时把「预分配编号」混入内容（如 ch43 的 43.7 数据结构/43.8 本章练习任务出现在 43.1 后、43.2 前）、子节号使用模板默认序号（43.18.x/79.21.x 应为 43.11.x/79.12.x）、「练习路径」错编为 x.2（79.2 与 79.11 冲突）；
- 按 cell 顺序对全部 111 章的数字标题重新连续编号（`## N.M` 与 `### N.M.K`），标题文本完整保留，「本章场景/实验 N/基础 N」等无编号标题不动；重编号后全课程 0 乱序、0 空标题；
- **事故与恢复**：重编号脚本首版误删标题文本 → git checkout 误恢复到早期版本（55 cells 旧版，丢失 36 cells 课程生成版与 CJK 简化改动）→ 以 notebooks/course（权威源，36 cells 版完好）重建 public/course，重做 CJK 字体简化（132 cell）+ ch39 cell#10 重建 + 残留调用删除（0 残留）；
- 流程修正：此后课程修改统一以 public/course 为工作区，完成后同步回 notebooks/course（权威源）再 `normalize --sync-runtime`（123 副本）+ `sync-catalog`（v26，自增标记无影响）；
- 验证：111 章编号 0 异常、标题 0 缺失、CJK 块 133 cell 在位、全部 code cell 语法通过、ch43 全量运行通过（仅练一练脚手架预期 AssertionError）、ch5 结构正常。

## 2026-08-16

### 修复：19 章残留 `_pds_cjk_font()` 调用（第 43 章等无法运行）

- 此前简化字体代码时，部分章节首 cell 中「sns.set_theme 后的第二次 `_pds_cjk_font()` 调用」未被删除，函数定义移除后触发 `NameError: _pds_cjk_font is not defined`，导致第 43 章等 19 章（ch39-57）环境 cell 无法运行；
- 已批量删除 21 处残留调用，全课程复检 0 残留；
- 平台实测：ch43 全部 11 个 code cell 顺序执行通过（唯一失败 cell#9 为「练一练」脚手架未填写的预期 AssertionError，参考答案 cell#10 正常）；ch39/51/56/28 首 cell（字体 + 数据导入）抽查通过；
- normalize --sync-runtime（375 文件通过，19 章变更，123 份运行时副本同步）。

## 2026-08-16

### 数据分析/画图章节：CJK 字体支持代码简化

- **33 章 133 个 cell**（Matplotlib 12 章 + Seaborn 20 章 + 综合项目，ch28-57 / ch75-77）中 25 行的 `_pds_cjk_font()` 函数统一替换为简短字体设置：
  - 章节首 cell：7 行完整块（含 Web 环境 Noto 字体自动加载兼容 + rcParams）；
  - 后续 cell：5 行纯 rcParams（import + 中文字体列表 + 负数符号），可独立运行；
  - 字体列表 `["Microsoft YaHei", "SimHei", "PingFang SC", "Noto Sans CJK SC", "DejaVu Sans"]` 按系统自动选用，Windows（雅黑）/macOS（苹方）/Linux（Noto）全覆盖；
- 数据导入部分原样保留（已完善：parse_dates、dtype 等）；ch39 cell#10 换行损坏的单行 cell 一并重建为规范格式；
- **平台实测**（Python 3.12.4 / matplotlib 3.10.3）：字体解析命中 `C:\Windows\Fonts\msyh.ttc`，200,000 行数据导入正常，中文标题/轴标签/图例渲染清晰无方框；
- normalize --sync-runtime（375 文件通过，33 章变更，123 份运行时副本同步）+ catalog v53 更新。

## 2026-08-16

### md 选中样式 + 文本左侧间距美化

- **选中样式**：md 单元格选中态改为「左侧 3px 蓝色指示条（inset 阴影，零布局占用）+ 淡蓝底 #f0f6ff + 细边框 #d8e6fd」——不再是一圈硬边框，指示条样式与 Jupyter/VS Code 一致；编辑态（深蓝 + 光晕）保持；
- **文本左侧间距**：md 内容左内边距恢复 16px，正文/列表/表格/引用/代码围栏/标题渐变条左缘统一在 82px 线——与代码框内文本（66 + 2px 边框 + 14px padding = 82px）**精确对齐**，文本在选中框内不再贴边；
- vite build 通过（2.94s），dev server 已确认新样式。

## 2026-08-16

### md 单元格选中态柔和化

- 选中 md 单元格时由 2px 深蓝实线边框（#1a73e8）改为浅蓝细框（#c7dcfb）+ 淡蓝底（#f7faff），在紧凑文本流中不再突兀；
- 边框仍保持 2px 占位（与未选中一致），内容零位移，与代码单元格选中态（深蓝）形成主次层级；编辑态（深蓝 + 光晕）保持醒目；
- vite build 通过（3.06s）；dev server 重启（新 job pwsh-1）并确认新样式生效。

## 2026-08-16

### 不同类 cell 对齐 + 整体间隔收紧

- **对齐**：md 段落/列表/引用/表格等文本左边缘与代码框左边缘齐平（去掉 md 内容 16px 左侧 padding）；h2/h3 标题保留渐变条样式且文字与代码文本对齐，整页左缘一条直线；
- **间隔**：md cell 间距 4px → 2px；代码 cell 间距 22px → 12px；
- vite build 通过（2.92s），dev server 已确认新样式生效。

## 2026-08-16

### 修复：md 单元格内两种段落样式并存

- 移除「以加粗开头的段落」（`p:has(strong:first-child)`，如 **背景引入 / **学习路线 / **本章在课程中的位置**）的浅灰背景卡片样式——此前同一 cell 内这类段落有背景、普通段落无背景，视觉分裂；
- 保留 strong 蓝色文字高亮（教学标记强调色，非块级样式），其余段落/引用/表格/任务清单样式统一不变；
- vite build 通过（3.06s），dev server 已确认新样式生效。

## 2026-08-16

### Markdown 单元格：间距再压缩 + 样式统一

- **cell 间距 8px → 4px**：拆分出的 md 小块之间更紧凑；代码 cell 的 22px 间距不变；
- **样式统一**：移除 is-split 卡片样式（边框 / 浅底 / 阴影 / 14px 块间距 / 分段编号徽章）与旧拆分动画（is-splitting）死规则，所有 md 内容统一为单一紧凑文本样式——无边框、无底色、无徽章，选中/编辑时仅由单元格蓝色边框提供反馈；
- JSX 中的 is-split class 保留但被 CSS 中和（防御性，避免未来误用），样式表本身已清理干净；
- vite build 通过（3.01s），dev server 已确认提供新样式。

## 2026-08-16

### Markdown 自动拆分：相邻同类元素块合并

- **分组拆分**：加载拆分与展示拆分统一升级为「元素分组」逻辑——先按块级元素切分，再将**相邻的同类元素**用空行连接合并（连续列表项、连续段落、连续引用/表格/标题等合成一个 cell）；
- 不同类型相邻处仍拆开（标题/段落/列表/表格/引用/代码/分隔线之间）；合并以空行还原 markdown 语义（loose list 编号连续），与切分互为逆操作；
- 效果（ch2）：68 → 117 cell（纯元素拆为 152）；「学习路线」9 个列表项合并为 1 个 cell、「场景」3 个列表项合并为 1 个 cell；
- 展示层（markdownSections）与 cell 结构用同一分组逻辑，看到的块 = 拆出的 cell；幂等、稳定 id（内容哈希）、metadata 继承、代码 cell 与内容保真均保持；
- vite build 通过（3.04s），dev server 无新增错误。

## 2026-08-16

### Markdown 自动拆分：改为加载 notebook 时执行，移除触发按钮

- **触发时机改为加载时**：打开章节（课程或自定义 notebook）即自动把多元素的 markdown cell 按元素拆成独立 cell，不再依赖手动按钮或编辑保存；
- **移除触发按钮**：工具栏「按元素拆分单元格」按钮与保存后自动拆分均已删除，拆分完全静默自动；
- **草稿机制兼容**：加载时对草稿兼容基准（baseDocument）与最终文档做同一拆分，保证拆后结构保存的草稿再次加载时仍能命中兼容检查（幂等），学生编辑不丢失；「恢复本章原始内容」同样先拆分再写入；
- **稳定 id**：拆出的 cell id = 原 id + 序号 + 内容哈希，同一内容每次加载 id 一致，自检清单等按 cell.id 存储的状态不因拆分丢失；
- 拆分继承原 cell 的 metadata，代码 cell 与输出原样不动；实测 ch2 由 68 cell（39 md）拆为 152 cell（123 md），md 内容无损（仅块间空行规范化）；
- vite build 通过（3.10s），dev server 无新增错误。

## 2026-08-16

### Markdown 单元格：保存后自动按元素拆分

- **编辑保存即自动拆分**：文本单元格保存（Ctrl/Shift+Enter 或失焦）后，自动按 Markdown 块级元素拆分为多个独立单元格，并提示「已自动拆分为 N 个单元格」；无需手动操作；
- 拆分粒度与展示层一致：标题 / 段落 / 列表项 / 表格 / 引用 / 代码围栏 / 分隔线各自成为独立 cell（同一识别逻辑抽取到 src/lib/markdownSplit.js 共用，保证「看到的块 = 拆出的 cell」）；
- 工具栏手动拆分按钮同步升级为「按元素拆分单元格」，与自动拆分共用 doSplitMarkdown（手动模式含滚动定位）；仅一个元素块时自动模式静默跳过，手动模式提示无需拆分；
- 自动拆分只替换该单元格本身、选中第一块，不动其他代码单元格与输出；
- vite build 通过（2.73s），dev server 无新增错误。

## 2026-08-16

### Markdown 单元格显示：按元素级精细拆分

- 拆分粒度从「按段落（空行边界）」升级为「按 Markdown 块级元素」：标题、段落、列表（含列表项）、表格、引用块、代码围栏、分隔线各自独立成视觉块，每个块使用卡片式展示（.notebook-md-section）；
- 元素识别器保护代码围栏（\`\`\` 整体一块）、引用连续行、表格连续行、列表连续项（含缩进续行），其余连续非空行合并为段落块；实测 ch2 2.1 由 5 块细化为 16 块、ch3 3.4 由 3 块细化为 12 块；
- 展示拆分（markdownSections）只影响阅读视图，编辑时仍是完整原文的纯净 textarea，不破坏内容与保存流程；
- vite build 通过（3.01s），dev server 无新增错误。

# 课程与文档变更记录

## 2026-08-16

### 章节内部内容重新设计：实训平台风格（第 10 章样板）

- 确认定位：本课程是学生**本机安装的实训平台**，章节内部改为「**先讲解、再练习**」结构，去掉大学课件式板书板块（教学信息表 / 三维教学目标 / 教学重难点 / 导读 / 知识结构图 / 常用工具一览 / 思考与讨论 / 参考资料）；
- 新模板（每章）：开场场景 → 知识点（**背景引入 → 讲解 → 练一练**，每节一个动手练习）→ 本章实训（步骤化任务 + 完成标准）→ 易错点提醒 → 练习与作业（基础/提高/挑战）→ 小结（要点表 + 自检清单）；
- 第 10 章「函数基础」按新模板重写为 70 cell：3 个知识点各带 1 个练一练（填空式脚手架 + 隐藏答案自检）、4 个实训任务（余额计算 / 手续费默认参数 / 多返回值统计 / 仅关键字参数记录构造）、3 个易错点（可变默认值、print 当返回值、作用域误解）、6 道作业；
- 练习 cell 统一为「请在下方填写代码 + 注释提示 + pass」填空式脚手架，答案 cell 隐藏（source_hidden）+ 自检断言；示例与答案全部运行通过，练习脚手架运行时报错是「未完成」的正常提示；
- 新章节 metadata 增加实训平台标识（tags 含「实训平台」，training_platform_version 字段），catalog 升至 v48；normalize 375 文件全部通过，同步镜像与运行时副本；
- 其余章节待样板确认后按同一模板批量推进。

## 2026-08-16

### 第一模块内部内容完善：先介绍再讲解 + 第 10 章重建

- 全模块概念小节统一采用「**先介绍**（为什么/解决什么问题）→ **讲解**（怎么做）」的教学节奏：第 2、6、7、10 章已完整落实，其余章节概念小节同步补入先介绍段落；
- 重建第 6 章「字典：命名记录与聚合」为 55 cell 完整大学风格章节（此前一次清理误删教学信息/目标/重难点/导读/结构图/小结/作业等骨架），概念小节全部带先介绍/讲解，练习恢复基础/提高/挑战 + 隐藏答案自检；
- 重建第 10 章「函数基础：参数、返回值与职责」为 76 cell：10.0-10.15 完整骨架（教学信息/三维目标/重难点/导读/知识结构图/定义与调用/参数与默认值/返回值/常用工具一览/3 个递进实验/6 个重点专题/课堂练习/思考与讨论/小结/作业/参考资料）；
- 第 10 章重点专题覆盖：仅关键字参数、默认参数可变对象陷阱、return 与 print 区别、文档字符串与类型标注、局部/全局变量与闭包、纯函数与副作用分离；
- 第 10 章课堂练习 6 题（基础 3 + 提高 2 + 挑战 1）按既有约定：练习 cell 带「请在下方填写代码」脚手架，答案 cell 隐藏（source_hidden）+ 自检断言，全部 26 个代码 cell 编译与运行验证通过；
- 修复 catalog 第 10 章条目过期问题（此前误显示旧主题「文件与路径」，本次由 notebook metadata 覆盖为「函数基础：参数、返回值与职责」，estimated_minutes 90）；
- 内容同步：public/course → notebooks/course 镜像 → public/runtime/files 运行时副本，normalize 全部 375 文件通过，catalog 升至 v47（120 章节）。

## 2026-08-15

### 第 6 章拆分:字典与集合独立成章

- 原第 6 章「字典与集合」拆分为:第 6 章「字典:命名记录与聚合」(35 cell,删除集合内容,实验 3 改为更新覆盖)与新增第 7 章「集合:去重与关系」(58 cell,完整大学风格章节:特性/增删/关系运算/去重/练习/作业);
- 后续章节全部顺延 +1:条件判断→第 8 章、循环→第 9 章、函数基础→第 10 章、函数进阶→第 11 章、文件→第 12 章、异常→第 13 章、模块类(time 文件)→第 14 章;NumPy 起全部教学章节顺延 +1(数组基础→第 15 章…银行营销→第 111 章);
- 98 个文件批量改名(course-chapter-13..110 → 14..111,git mv 保留历史),改造后章节内容编号同步 +1(标题/小节/板书/metadata),旧版文件仅改名;
- sync-catalog offset 调整:命名章 time 由第 13 章改第 14 章,数字文件 N>=14 时章节号 N+1;
- 交叉引用修复:第 5 章预习改为指向第 6/7 两章,第 6 章预习改指第 8 章;
- 课程基线更新:120 个课程资源(112 连续教学章节 + 8 模块大作业),catalog v43,check:notebooks 383 文件通过。

## 2026-08-15

### 第一模块学习脉络完善（基于课程设计评审）

- 第 3 章常用方法一览表增加「必学/了解」掌握级别标注（拆解账目文本前必须练熟的 8 项 vs 用到再查的 6 项），缓解字符串方法信息过载；
- 第 5 章新增 5.10.5 专题「可变与不可变：为什么改 a 会动 b」（引用共享、浅复制内层共享），补齐初学者最容易形成错误心智模型的短板；
- 第 5 章 5.10.3 字典键示例增加前置提示（字典系统知识在第 6 章，此处先观察）；
- 第 6 章知识结构图增加「字典/集合两大部分」章节导览；6.8 方法表拆分为字典方法、集合运算两部分；
- 第 8 章挑战练习的 try/except 代码增加前置标注（先观察用法，第 12 章系统学习）；
- 全部修改保持章节编号与目录结构不变，`check:notebooks` 364 文件通过，运行时索引已重建。

## 2026-08-15

### 第一模块（Python 基础）大学课题教学文件风格改造完成

- 第 2-13 章（12 个教学章节）全部按第 1 章模板改造为大学课题教学文件风格，统一结构：教学信息 → 三维教学目标 → 教学重难点 → 本章导读 → 知识结构图 → 核心概念 → 上机实验（递进式）→ 常用工具一览 → 重点专题与易错点 → 课堂练习（基础/提高/挑战 + 隐藏答案）→ 思考与讨论 → 本章小结（要点表+自测清单）→ 课后作业与拓展 → 参考资料；
- 章节规模：第 2 章 50 cell、第 3 章 64、第 4 章 64、第 5 章 61、第 6 章 64、第 7 章 64、第 8 章 64、第 9 章 ~66、第 10 章 67、第 11 章 57、第 12 章 55、第 13 章 60，总约 730 个 cell；
- 知识点覆盖完整保留并系统化（循序渐进、无遗漏）：变量与类型 → 字符串 → 列表 → 元组 → 字典集合 → 条件 → 循环 → 函数基础 → 函数进阶 → 文件与 JSON → 异常与测试 → 模块与类；
- 全部章节的 `estimated_minutes` 调整为 90（2 学时），记账主线（个人日常记账助手）贯穿每章导读与练习；
- 修复第 11 章 6 个代码 cell 中 `\n` 转义导致的字符串字面量断裂问题；
- `check:notebooks` 364 文件通过，catalog 升至 v42（119 章节、无重复 id），运行时索引已重建。

## 2026-08-15

### 第 1 章大学课题教学文件风格改造（样章）

- `course-chapter-1.ipynb` 按“大学课题教学文件”风格重写（50 个 cell），结构：1.0 教学信息（课程/学时/对象/环境/主线）→ 1.1 三维教学目标（知识/能力/素养）→ 1.2 教学重难点 → 1.3 本章导读（个人记账助手场景引入）→ 1.4 知识结构图 → 1.5 预备知识（程序/解释器/内核）→ 1.6 工作界面 → 1.7 上机实验（运行/修改/制造错误三递进实验）→ 1.8 常用内置函数（print/type/isinstance/dir/help/input）→ 1.9 课堂练习（基础/提高/挑战，隐藏答案+自检）→ 1.10 思考与讨论 → 1.11 本章小结（要点表+自测清单）→ 1.12 课后作业与拓展 → 1.13 参考资料；
- 教学标签体系保留（example/exercise/solution/check），`estimated_minutes` 调整为 90（2 学时）；
- 同步 notebooks/course 与 public/runtime/files 副本，`check:notebooks` 364 文件通过，catalog 升至 v41；
- 其余章节暂未改造，待第 1 章风格确认后按同一模板批量推进。

## 2026-08-15

### 零基础渐进课程一致性收尾

- 课程现状确认：`public/course/` 为内容权威（111 个连续教学章节 + 8 个模块大作业 + catalog.json），章节统一采用“板书 → 学习目标 → 循序渐进 → 小结”渐进结构，Python 模块以“个人日常记账助手”为主线；
- 8 个模块大作业文件内部标题与目录标题统一（如 Pandas 大作业内部标题改为“Olist 客户生命周期与履约分析”），学生打开作业看到的标题与目录一致；
- 修复 catalog 重复 id（Python 基础大作业此前误用 `chapter-13`，与 NumPy 第 14 章冲突），并加固 `sync-catalog.mjs`：模块大作业 id 改为从文件名稳定推断（`capstone-*`），缺失 `course_id` 不再退化冲突；
- `notebooks/` 角色重新定义：不再是内容源，而是 JupyterLite 运行时打包输入；`build-runtime.ps1` 构建前自动从 `public/course/` 同步，避免双内容源漂移；旧版源（76 个文件）归档至 `docs/archive/notebooks-legacy/`；
- 全量统一 `content_fingerprint`（364 个 Notebook 收敛到 `normalize-notebook-architecture.py` 的校验算法），`check:notebooks` 全部通过，后续 normalize 幂等；
- 文档同步：README、TECH_STACK、NOTEBOOK_AUTHORING_GUIDE、COURSE_IMPROVEMENT_PLAN、runtime/README 中的内容源角色描述统一为“public/course 权威 + notebooks 打包输入”。

## 2026-08-15

### 架构治理与认证服务生产化

- 认证服务（`server/`）升级至 v0.2.0：密码改为 argon2id 哈希存储，账号/会话/验证码/CDKey 持久化到 JSON 文件（`PDS_DATA_DIR`，默认 `server-data/`），会话默认 24 小时过期，登录连续失败 5 次锁定 10 分钟，验证码只存哈希（显式设置 `PDS_DEV_RETURN_CODE=true` 时开发环境可见）；
- 根目录 12 份一次性交付文档归档至 `docs/archive/projects-redesign/`（含互相引用与脚本路径更新）；
- `public/runtime/`（JupyterLite 构建产物，588 个文件）移出版本控制，由 `npm run build:runtime` 重新生成；新增 `public/runtime/.gitkeep` 占位；
- 10 个曾未被跟踪的活跃脚本与 10 个 `src/` 源码文件纳入版本控制，仓库 clone 后可完整构建；
- 10 个一次性/失效脚本归档至 `scripts/archive/`（活跃 `course-content-*` 生成器链保留原位）；
- 清理根目录日志文件与审计截图，`.gitignore` 补充 `public/runtime/`、`server-data/` 规则。

## 2026-08-05

### 课程编号与模块作业顺序统一

- 时间与日期正式作为 Python 基础第13章，不再作为专题或额外资源；
- 第13章及之后的连续章节统一顺延，课程形成第1～111章；
- 8个模块大作业保持独立资源，并统一放在所属模块最后；
- 目录展示移除大作业特殊视觉样式，改用普通目录项加文字标识；
- 课程目录、Notebook 标题、运行时副本和静态构建同步更新。

## 2026-08-02

### 本轮文档设计更新（仅文档）

- 将 `time` 与 `datetime` 基础内容落地到 Python 基础第 11 章末尾：包含时间戳与耗时、`date`/`datetime`、`timedelta`、`strptime()`、`strftime()`、异常日期处理和日志持续时间案例；不新增第 12 章，课程总章节数保持 117。
- 新增 `FOUNDATION_AND_MODULE_TEACHING_DESIGN.md`，补充前置章节基础知识、方法/函数独立 Cell、结果打印、可视化、错误恢复和全模块统一教学流程；
- 增加“日期与时间处理”普通章节的规划方案，覆盖 `date`、`time`、`datetime`、`timedelta`、格式解析、时区、Pandas 时间索引、可视化时间轴和机器学习时间切分；
- 更新模块大作业方案，明确每个模块大作业位于最后一个教学章节之后的独立课程章节，不嵌入最后教学章节 Cell；
- 本轮只修改 `docs/` 文档，未修改 `src/`、Notebook、课程目录、数据集、`public/`、`dist/` 或构建产物；
- 时间专题仍处于设计阶段，当前课程事实仍为 117 个课程章节；若未来正式新增普通章节，必须通过目录和发布流程统一调整编号。

### Notebook 实施更新（2026-08-02）

- 按 `FOUNDATION_AND_MODULE_TEACHING_DESIGN.md` 批量增强 109 个教学 Notebook；
- 为现有方法说明补充作用、调用形式、参数、返回值、原对象变化、边界和相近方法字段；
- 保持方法说明与代码示例为独立 Cell，并补充方法学习动作；
- 在第 21、25、77 章加入日期解析、时间间隔、Pandas 重采样/滚动窗口和机器学习时间切分示例；
- 为 8 个独立模块大作业加入交付自检 Cell；
- `public/course/` 与 `dist/course/` Notebook 已同步；JSON、Python AST、方法 Cell 配对和断言文字检查通过；
- 代表性 Notebook 的完整执行仍需在浏览器运行时验证：本地 Jupyter 执行会受到 `/datasets/...` 浏览器路径和内核资源差异影响。

### 课程结构

- 当前课程统一为 109 个连续教学章节、8 个独立模块大作业章节、8 个模块；第 10 章文件操作为普通教学章节；
- 取消章节正式作业和独立实训主路径；
- 使用模块末大作业作为模块级综合成果；
- 第 1 章定位为计算机基础、Python 语言和 Jupyter Notebook 入门，并允许轻量示例代码。

### Notebook

- 方法与函数拆分为独立 Markdown 和代码 Cell；
- 单元格顺序统一为由浅入深；
- 使用 `print()` 和结果解释替代 `assert` 教学自检；
- 清理机器学习章节残余的 6 处 `assert`，并在 `public/course/` 与 `dist/course/` 中完成 AST/断言复核；
- 增加错误恢复、结果解释、数据来源和可复现性要求。

### 数据

- 登记 scikit-learn 本地公开数据快照；
- 新增数据卡片、许可、来源、字段和快照维护规范；
- 课堂默认不依赖运行时联网。

### 文档

- 新增课程文档索引、完成清单、术语表、数据集卡片、评分量规、Notebook 编写手册和发布操作手册；
- 历史课程方案保留但明确标记为历史基线；
- 完成 `public/course/` 与 `dist/course/` 的 8 个模块大作业目录同步，并完成文件内容比对。

## 变更记录格式

后续每次变更至少记录：日期、版本、影响模块/章节、数据变化、Notebook 变化、运行时变化、验收结果和遗留风险。
## 2026-09-06

### 内部教学资源设计完善

- 审阅当前 `catalog.json` 的 127 个课程资源，确认 8 个模块各有一个独立大作业，展示章号连续为第 1～119 章；
- 为八个模块补充差异化的理解、操作和迁移目标，以及每个目标对应的完成证据；
- 为八个模块各增加三条“困难信号 → 回看章节 → 重试任务”的补学路径，避免把运行进度误当作能力达标；
- 统一八份大作业的达标规则：共同能力 30 分、模块能力 70 分、总分与分组下限并行、关键门槛未满足时返工；
- 新增 `scripts/maintain-teaching-resources.py`、`scripts/course-teaching-design.json` 和 `scripts/test_teaching_resources.py`，支持只读漂移检查、幂等更新、路径安全校验、目录与答案结构校验；
- 新增 `docs/MODULE_TEACHING_RESOURCES.md`，并由脚本生成 `docs/CAPSTONE_RUBRICS.md`；
- 将教学资源检查接入 `build:course`，新增 `build:teaching`、`check:teaching` 和 `test:teaching` 命令；
- 课程大作业已同步到 `notebooks/course/`、`public/runtime/files/course/` 和 `dist/course/`，移除运行时重复的嵌套 capstone 副本。
