"""course-chapter-15 索引、切片与筛选"""

TITLE = "索引、切片与筛选"
EST_MINUTES = 50

CELLS = [
    ("md", """\
# 第18章 索引、切片与筛选

上一章你已经会创建数组和做整体统计，但真实分析要回答的是
“**哪些天**超支了”“**周末**花了多少”——这需要按位置取数、按条件取数。

本章四件套：基础索引、二维索引、切片、布尔筛选。
最后一个是 NumPy 的灵魂：**不写循环，一行筛出所有满足条件的元素**。""", []),

    ("md", """\
## 学习目标

学完本章，你能够：

- 用一维/二维索引和切片取数，说出“含头不含尾”在数组上的表现；
- 用布尔数组筛选，并用 `&`、`|`、`~` 组合条件；
- 区分**视图**与**副本**，避免“改切片连累原数组”的事故；
- 避开两大坑：布尔条件用 `and/or` 报错、以为筛选返回的是复制。""", []),

    ("md", """## 1. 基础索引与切片：和列表同规则

**概念**：`a[i]` 取单个元素（从 0 数起）、`a[i:j]` 切片**含头不含尾**、
负索引从尾部数——第 4 章列表的规则在数组上**全部适用**，
只是数组的切片返回的是原数据的**视图**（本章第 3 节细讲）。""", []),

    ("md", "### 例 1｜最小例子：取数三连", []),

    ("code", """\
import numpy as np

a = np.array([18.5, 6.0, 25.5, 32.0, 88.0])

print(a[0])      # 18.5：第一个
print(a[-1])     # 88.0：最后一个
print(a[1:4])    # [ 6. 25.5 32. ]：含头不含尾
print(a[::2])    # [18.5 25.5 88. ]：隔一个取一个""", ["example"]),

    ("md", "### 例 2｜业务例子：工作日与周末", []),

    ("code", """\
import numpy as np

week = np.array([18.5, 6.0, 25.5, 32.0, 12.0, 88.0, 45.9])
# 约定：0-4 是周一到周五，5-6 是周末

workday_total = week[:5].sum()
weekend_total = week[5:].sum()
print(f"工作日 {workday_total:.1f} 元，周末 {weekend_total:.1f} 元")
print(f"周末日均 {week[5:].mean():.1f} 元")""", ["example"]),

    ("md", "### 例 3｜常见错误：切片以为拿到的是“新数组”", []),

    ("code", """\
import numpy as np

week = np.array([18.5, 6.0, 25.5, 32.0, 12.0, 88.0, 45.9])
weekend = week[5:]          # 视图：和 week 共享内存！

weekend[0] = 0.0            # 想改“周末副本”
print(week)                 # week 的 88.0 也变成了 0.0——被连累了！

# 修复：需要独立数据就 .copy()
week = np.array([18.5, 6.0, 25.5, 32.0, 12.0, 88.0, 45.9])
weekend = week[5:].copy()
weekend[0] = 0.0
print(week[5:])             # 原数组安全""", ["example"]),

    ("md", """\
**要点**：**切片是视图，`copy()` 才是副本。**
改视图 = 改原数组。判断标准：这条数据后面还要不要保持原样？要，就 copy。""", []),

    ("md", """## 2. 二维数组：按 [行, 列] 取数

**概念**：二维数组用 `a[行, 列]` 双下标——
`m[1, 3]` 是第 1 行第 3 列；`m[1]` 整行、`m[:, 3]` 整列（冒号=全选）。
切片同理：`m[0:2, 3:]` 取前两行的后半段。""", []),

    ("md", "### 例 1｜最小例子：行、列、单格", []),

    ("code", """\
import numpy as np

m = np.arange(1, 15).reshape(2, 7)

print(m[1])        # 第二行
print(m[:, 0])     # 第一列：[1 8]
print(m[1, 3])     # 第 2 行第 4 列：12
print(m[0:2, 5:])  # 两行的最后两列""", ["example"]),

    ("md", "### 例 2｜业务例子：两周账本取列", []),

    ("code", """\
import numpy as np

# 2 周 × 7 天
ledger = np.array([[20.0, 35.5, 0.0, 88.0, 12.0, 45.0, 66.5],
                   [18.0, 22.0, 30.0, 5.5, 27.0, 80.0, 40.0]])

print(f"每周六(索引5)支出: {ledger[:, 5]}")     # 整列
print(f"第 2 周周三(索引2): {ledger[1, 2]}")    # 单格
print(f"第 2 周合计: {ledger[1].sum():.1f} 元") # 整行求和""", ["example"]),

    ("md", "### 例 3｜常见错误：以为 m[:, 3] 是“复制出的一列”", []),

    ("code", """\
import numpy as np

m = np.arange(1, 15).reshape(2, 7)

col = m[:, 3]        # 视图！
col[:] = -1          # 整列改成 -1
print(m)             # 原矩阵第 4 列全变 -1

# 修复：copy
m = np.arange(1, 15).reshape(2, 7)
col = m[:, 3].copy()
col[:] = -1
print(m[0])""", ["example"]),

    ("md", """\
**要点**：二维取数 `m[1]` 返回行视图、`m[:, 3]` 返回列视图——
**对视图的任何原地修改都会写回原数组**。""", []),

    ("md", """## 3. 布尔筛选：NumPy 的灵魂

**概念**：`a > 50` 得到一个 True/False 数组；
`a[a > 50]` 直接取出所有 True 位置的元素——**不用循环、不用 if**。
组合条件必须用 `&`（且）、`|`（或）、`~`（非），
并且**每个条件要加括号**。""", []),

    ("md", "### 例 1｜最小例子：一行筛出大额", []),

    ("code", """\
import numpy as np

spends = np.array([18.5, 235.0, 6.0, 88.0, 199.9, 45.9, 312.0])

mask = spends > 100          # 布尔数组
print(mask)
print(spends[mask])          # [235.  199.9 312. ]
print(spends[spends > 100].mean())   # 大额均值，一行完成""", ["example"]),

    ("md", "### 例 2｜业务例子：超支日与正常日", []),

    ("code", """\
import numpy as np

daily = np.array([20.0, 35.5, 0.0, 88.0, 12.0, 45.0, 66.5])
budget = 50.0

over = daily[daily > budget]
normal = daily[daily <= budget]
print(f"超支 {len(over)} 天，合计 {over.sum():.1f} 元")
print(f"超支日均值 {over.mean():.1f}，正常日均 {normal.mean():.1f}")

# 组合条件：周末 且 超过 40 元（周末=索引 5,6，用位置数组配合）
days = np.arange(7)
print(daily[(daily > 40) & (days >= 5)])""", ["example"]),

    ("md", "### 例 3｜常见错误：and/or 用于数组条件", []),

    ("code", """\
import numpy as np

daily = np.array([20.0, 66.0, 88.0])

# 反例：Python 的 and 会报“真值不确定”
# daily[(daily > 30) and (daily < 80)]   # ValueError: The truth value ...

# 原因：and 只能比较“单个真假”，而数组条件是“一组真假”。
# 修复：数组条件组合一律 & | ~，且每个条件加括号
print(daily[(daily > 30) & (daily < 80)])   # [66.]
print(daily[~(daily > 30)])                 # [20.]：取反""", ["example"]),

    ("md", """\
**要点**：**单个值用 and/or，数组条件用 &/|/~，条件加括号。**
这是 NumPy 第一大新手错误，报错信息 `The truth value of an array ...`
一出现就检查这里。""", []),

    ("md", """## 4. 筛选后再加工：条件赋值与 np.where

**概念**：布尔筛选不止能“取数”——
`a[条件] = 新值` 批量改数；`np.where(条件, 值1, 值2)` 是数组版的三元表达式，
按条件生成新数组。""", []),

    ("md", "### 例 1｜业务例子：把 0 元账替换为均值", []),

    ("code", """\
import numpy as np

daily = np.array([20.0, 0.0, 88.0, 0.0, 12.0])
mean_valid = daily[daily > 0].mean()

fixed = daily.copy()
fixed[fixed == 0] = mean_valid        # 条件赋值：0 元的换成有效均值
print(fixed.round(1))

graded = np.where(daily > 50, "大额", "正常")   # 逐元素判断
print(graded)""", ["example"]),

    ("md", "### 例 2｜常见错误：在视图上做条件赋值", []),

    ("code", """\
import numpy as np

week = np.array([18.5, 6.0, 25.5, 32.0, 12.0, 88.0, 45.9])
weekend = week[5:]            # 视图
weekend[weekend > 50] = 0.0   # 看似只改 weekend，实际写回了 week！
print(week)                   # 88.0 变成 0.0

# 修复：先 copy 再改
week = np.array([18.5, 6.0, 25.5, 32.0, 12.0, 88.0, 45.9])
weekend = week[5:].copy()
weekend[weekend > 50] = 0.0
print(week[5:])""", ["example"]),

    ("md", """\
**要点**：条件赋值是**原地修改**，作用在视图上就会污染原数组——
**“筛选出的数据要改，先 copy”**，把这句话贴在工位上。""", []),

    ("md", """## 综合练习""", []),

    ("md", "### 练一练 15.1：切片取数", ["exercise"]),

    ("code", """\
import numpy as np

month = np.array([120.5, 0.0, 88.0, 210.0, 66.5, 0.0, 302.0,
                  45.0, 18.0, 95.0])

# TODO 1：取出前 5 天的支出
# TODO 2：取出最后 3 天的支出（负索引）
# TODO 3：每隔一天取一个样本（步长 2）""", ["exercise"]),

    ("md", "### 练一练 15.2：布尔筛选三连", ["exercise"]),

    ("code", """\
import numpy as np

daily = np.array([20.0, 35.5, 0.0, 88.0, 12.0, 45.0, 66.5])

# TODO 1：筛选出大于 30 的支出，打印它们的均值
# TODO 2：筛选“大于 0 且小于 60”的支出（注意 & 与括号）
# TODO 3：用 np.where 生成标签数组：>60 -> "高"，30-60 -> "中"，其余 -> "低" """, ["exercise"]),

    ("md", "### 练一练 15.3：视图还是副本？", ["exercise"]),

    ("code", """\
import numpy as np

week = np.array([18.5, 6.0, 25.5, 32.0, 12.0, 88.0, 45.9])

# 下面的代码想把周末数据归档后清零，但结果污染了原数组。
# TODO：修改为安全写法（copy），并打印归档数组和原数组验证
archive = week[5:]
archive[archive > 40] = 0.0
print(week)""", ["exercise"]),

    ("md", """## 易错点清单

- 数组条件组合必须 `&`/`|`/`~` 且加括号，`and/or` 直接 ValueError；
- 切片是**视图**：改切片（含条件赋值）会写回原数组，需要独立数据先 `.copy()`；
- `a[i:j]` 含头不含尾；负索引从 -1 开始；
- 二维取数 `m[行, 列]`，整列是 `m[:, j]` 返回的也是视图；
- `np.where` 返回的是**新数组**，不修改原数组。""", []),

    ("md", """## 本章小结

- 索引切片沿用列表规则，二维按 `[行, 列]`。
- 布尔筛选 `a[条件]` 是 NumPy 的核心用法，替代了大量循环与 if。
- 视图与副本是本章最重要的概念：筛选后要修改，先 copy。
- 下一章：把数组揉成想要的形状——reshape、合并与拆分。""", []),

    ("md", """## 参考答案""", []),

    ("code", """\
# 练一练 15.1 参考答案
import numpy as np

month = np.array([120.5, 0.0, 88.0, 210.0, 66.5, 0.0, 302.0,
                  45.0, 18.0, 95.0])
print(month[:5])
print(month[-3:])
print(month[::2])""", ["solution"]),

    ("code", """\
# 练一练 15.2 参考答案
import numpy as np

daily = np.array([20.0, 35.5, 0.0, 88.0, 12.0, 45.0, 66.5])

print(daily[daily > 30].mean().round(1))
print(daily[(daily > 0) & (daily < 60)])
print(np.where(daily > 60, "高", np.where(daily >= 30, "中", "低")))""", ["solution"]),

    ("code", """\
# 练一练 15.3 参考答案
import numpy as np

week = np.array([18.5, 6.0, 25.5, 32.0, 12.0, 88.0, 45.9])

archive = week[5:].copy()     # 关键：copy
archive[archive > 40] = 0.0
print("归档:", archive)
print("原数组:", week)        # 88.0 保留""", ["solution"]),
]
