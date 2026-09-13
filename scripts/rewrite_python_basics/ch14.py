"""course-chapter-14 数组基础（ndarray）"""

TITLE = "数组基础（ndarray）"
EST_MINUTES = 50

CELLS = [
    ("md", """\
# 第17章 数组基础（ndarray）

Python 列表已经能装一批数字了，为什么还需要 NumPy 数组？
一句话：**列表是“装东西的柜子”，ndarray 是“为批量计算设计的表格”**——
几十万行数据做一次求和，列表要写循环，ndarray 一行搞定，还快几十倍。

本章认识 ndarray：怎么创建、怎么看形状和类型，以及它和列表的核心区别。
主线任务：**把记账数据从列表升级为数组**。""", []),

    ("md", """\
## 学习目标

学完本章，你能够：

- 从列表创建 ndarray，并用 `zeros`、`ones`、`arange`、`linspace` 创建规则数组；
- 读懂 `shape`、`ndim`、`dtype` 三个属性，说出数组与列表的三个区别；
- 用 `astype` 转换数据类型，避免 int/float 踩坑；
- 避开数组三大坑：整除截断、形状误判、切片是视图不是副本。""", []),

    ("md", """\
## 1. 创建数组：从列表到 ndarray

**概念**：`np.array(列表)` 把 Python 列表变成数组。
数组创建后**所有元素必须是同一类型**（由 `dtype` 描述）——
这正是它计算快的原因：数据整齐地排在连续内存里。""", []),

    ("md", "### 例 1｜最小例子：第一个数组", []),

    ("code", """\
import numpy as np

a = np.array([10, 25, 30, 5])

print(a)          # [10 25 30  5]：注意没有逗号
print(a.dtype)    # int64：全部元素同类型
print(a.shape)    # (4,)：一维、4 个元素
print(a.ndim)     # 1：一维""", ["example"]),

    ("md", "### 例 2｜业务例子：一周支出数组", []),

    ("code", """\
import numpy as np

week = np.array([18.5, 6.0, 25.5, 32.0, 12.0, 88.0, 45.9])

print(f"形状 {week.shape}，类型 {week.dtype}")
print(f"总支出 {week.sum():.1f} 元，日均 {week.mean():.1f} 元")
print(f"最大单笔在第 {week.argmax() + 1} 天")""", ["example"]),

    ("md", """\
**输出解读**：`week.sum()`、`week.mean()` 是数组自带的方法——
不用写 `sum(week)`，也不用循环。**“数据 + 一个方法 = 一个统计量”**
就是数组的基本用法，第 9 章手写的聚合循环在这里都变成了一个词。""", []),

    ("md", "### 例 3｜常见错误：dtype 踩坑", []),

    ("code", """\
import numpy as np

# 反例 1：混入一个字符串，整组全变字符串
mixed = np.array([1, 2, "3"])
print(mixed.dtype)          # <U11：全部变成了文本！

# 反例 2：整数数组做除法，结果类型会“升级”为 float
a = np.array([1, 2, 3])
print((a / 2).dtype)        # float64（除法总是 float）

# 但整数除法用 // 会截断
print(np.array([3, 7]) // 2)   # [1 3]：小数部分直接丢掉

# 修复：需要小数先转 float
a = a.astype(float)
print(a // 2)                  # [0.5 1.  1.5]""", ["example"]),

    ("md", """\
**要点**：数组是“整齐”的——混类型会被**静默统一**（通常变成字符串），
整除会**截断**。创建后打一句 `print(a.dtype)` 是好习惯。""", []),

    ("md", """\
## 2. 规则数组：zeros、arange、linspace

**概念**：不用手打每个数——
`np.zeros(n)` / `np.ones(n)` 创建全 0/全 1；
`np.arange(start, stop, step)` 等差整数序列（含头不含尾，同 range）；
`np.linspace(start, stop, n)` 指定**点数**的等分序列（含两端）。""", []),

    ("md", "### 例 1｜最小例子：四种创建方式", []),

    ("code", """\
import numpy as np

print(np.zeros(3))            # [0. 0. 0.]：默认 float
print(np.ones(3, dtype=int))  # [1 1 1]：dtype 可指定
print(np.arange(1, 7, 2))     # [1 3 5]：步长 2，不含 7
print(np.linspace(0, 1, 5))   # [0. 0.25 0.5 0.75 1.]：含两端！""", ["example"]),

    ("md", "### 例 2｜业务例子：预算线与记账日期", []),

    ("code", """\
import numpy as np

# 每日预算：30 天，每天 100 元
daily_budget = np.full(30, 100.0)
print("预算数组:", daily_budget[:5], "...")

# 月内每 5 天一个检查点（含第 30 天）
checkpoints = np.linspace(1, 30, 6).astype(int)
print("检查点(天):", checkpoints)""", ["example"]),

    ("md", "### 例 3｜常见错误：arange 与 linspace 记反", []),

    ("code", """\
import numpy as np

# 反例：想要“1 到 30 共 6 个点”却用了 arange
print(np.arange(1, 30, 6))    # [ 1  7 13 19 25]：步长是 6，少了 30！

# arange 管步长，linspace 管点数：
print(np.arange(1, 31, 6))    # 手动调 stop 很容易错
print(np.linspace(1, 30, 6))  # [ 1.  6.8 12.6 18.4 24.2 30.]：一步到位

# 反例 2：arange 用 float 步长会有累积误差
print(np.arange(0, 0.3, 0.1))   # [0.  0.1 0.2 0.30000004? 看 dtype]""", ["example"]),

    ("md", """\
**要点**：**步长固定用 arange，点数固定用 linspace**；
浮点步长的 arange 有精度陷阱，等分场景一律 linspace。""", []),

    ("md", """\
## 3. shape：数组的形状是它的身份证

**概念**：`shape` 用元组描述形状——`(7,)` 是 7 个数的一维数组，
`(4, 7)` 是 4 行 7 列的二维数组（比如 4 周 × 每天 7 笔账）。
`reshape` 在**元素总数不变**的前提下改变形状。""", []),

    ("md", "### 例 1｜最小例子：一维变二维", []),

    ("code", """\
import numpy as np

a = np.arange(1, 29)          # 28 个数
m = a.reshape(4, 7)           # 4 周 × 7 天
print(m.shape)
print(m[0])                   # 第 1 周：[1 2 3 4 5 6 7]
print(m.sum(axis=1))          # 每周合计（按行求和）
print(m.sum(axis=0))          # 每个星期几合计（按列求和）""", ["example"]),

    ("md", "### 例 2｜业务例子：四周账本", []),

    ("code", """\
import numpy as np

# 28 天支出，重排成 4 周
daily = np.array([18.5, 6.0, 25.5, 32.0, 12.0, 88.0, 45.9,
                  20.0, 8.5, 15.0, 30.0, 22.0, 66.0, 30.0,
                  25.5, 5.0, 28.0, 41.0, 18.0, 95.0, 52.0,
                  15.0, 6.5, 20.0, 26.0, 16.0, 70.0, 40.0]).reshape(4, 7)

weekly = daily.sum(axis=1)
for w, total in enumerate(weekly, start=1):
    print(f"第 {w} 周支出 {total:6.1f} 元")""", ["example"]),

    ("md", "### 例 3｜常见错误：reshape 元素数对不上", []),

    ("code", """\
import numpy as np

a = np.arange(28)

# 反例：4 × 8 = 32 ≠ 28
# a.reshape(4, 8)     # ValueError: cannot reshape array of size 28 ...

# 反例 2：把 shape 当函数用（属性不是方法）
# a.shape()           # TypeError: 'tuple' object is not callable
print(a.shape)          # 属性，不带括号

# 修复：reshape 前先核对 size
print(a.size, "个元素可以 reshape 成", (4, 7))
print(a.reshape(4, 7).shape)""", ["example"]),

    ("md", """\
**要点**：`reshape` 前**乘一下各维度**核对总数；`shape` 是属性不是方法。
另一个高频坑在第 18 章细讲：切片出来的数组是**视图**，
改它会连带改原数组——需要独立副本时用 `.copy()`。""", []),

    ("md", """## 综合练习""", []),

    ("md", "### 练一练 14.1：创建与自检", ["exercise"]),

    ("code", """\
import numpy as np

# TODO 1：从列表 [125.5, 88.0, 302.4, 66.0] 创建数组 spends
# TODO 2：打印它的 dtype、shape、ndim
# TODO 3：打印总和与平均值（保留 1 位小数）""", ["exercise"]),

    ("md", "### 练一练 14.2：预算检查点", ["exercise"]),

    ("code", """\
import numpy as np

# TODO 1：创建 0-2000 元的等分刻度，共 5 个点（含两端）
# TODO 2：创建前 10 天、每天 80 元的预算数组 budget（用 full）
# TODO 3：打印 budget 的前 3 个元素和总预算""", ["exercise"]),

    ("md", "### 练一练 14.3：周账本矩阵", ["exercise"]),

    ("code", """\
import numpy as np

daily = np.array([20.0, 35.5, 0.0, 88.0, 12.0, 45.0, 66.5,
                  18.0, 22.0, 30.0, 5.5, 27.0, 80.0, 40.0])

# TODO 1：reshape 成 2 周 × 7 天的矩阵 m
# TODO 2：打印每周合计（axis 参数用对）
# TODO 3：打印矩阵中最大的单笔支出及其星期几（提示：argmax 展平后的位置 % 7 + 1）""", ["exercise"]),

    ("md", """## 易错点清单

- 混类型列表转数组被静默统一成字符串，先检查 `dtype`；
- 整数数组 `//` 会截断小数，需要小数先 `astype(float)`；
- `arange` 管步长、`linspace` 管点数，浮点步长有精度陷阱；
- `reshape` 各维度乘积必须等于 `size`；
- `shape` 是属性不是方法；
- 数组切片是视图：改切片会改原数组，需要副本用 `.copy()`。""", []),

    ("md", """## 本章小结

- ndarray = 同类型、同形状的批量数据，统计量是它的内置方法。
- 四种创建：`array`、`zeros/ones/full`、`arange`（步长）、`linspace`（点数）。
- `shape` 是数组的身份证；reshape 总数不变、axis 决定按行还是按列聚合。
- 下一章：不写循环也能按条件取数——索引、切片与布尔筛选。""", []),

    ("md", """## 参考答案""", []),

    ("code", """\
# 练一练 14.1 参考答案
import numpy as np

spends = np.array([125.5, 88.0, 302.4, 66.0])
print(spends.dtype, spends.shape, spends.ndim)
print(f"{spends.sum():.1f} / {spends.mean():.1f}")""", ["solution"]),

    ("code", """\
# 练一练 14.2 参考答案
import numpy as np

print(np.linspace(0, 2000, 5))
budget = np.full(10, 80.0)
print(budget[:3], budget.sum())""", ["solution"]),

    ("code", """\
# 练一练 14.3 参考答案
import numpy as np

daily = np.array([20.0, 35.5, 0.0, 88.0, 12.0, 45.0, 66.5,
                  18.0, 22.0, 30.0, 5.5, 27.0, 80.0, 40.0])
m = daily.reshape(2, 7)
print(m.sum(axis=1))

flat_pos = daily.argmax()
print(daily[flat_pos], "元，星期", flat_pos % 7 + 1)""", ["solution"]),
]
