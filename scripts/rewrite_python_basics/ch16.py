"""course-chapter-16 形状、合并与拆分"""

TITLE = "形状、合并与拆分"
EST_MINUTES = 45

CELLS = [
    ("md", """\
# 第19章 形状、合并与拆分

真实数据很少“一次到位”：两周的账本要拼成一个月，
“每日金额”一列要变成“周 × 天”的表格。
本章学数组的**形状改造**（reshape / 转置）与**拼拆**（合并 / 拆分）。""", []),

    ("md", """\
## 学习目标

学完本章，你能够：

- 用 `reshape`、`ravel`、`flatten`、`T` 完成常见形状变换，说出 ravel 与 flatten 的区别；
- 用 `np.concatenate` / `vstack` / `hstack` 合并数组；
- 用 `np.split` / `vsplit` 拆分数组；
- 避开三大坑：reshape 总数不匹配、合并维度不一致、ravel 改动影响原数组。""", []),

    ("md", """## 1. reshape / ravel / T：形状的自由变换

**概念**：`reshape(r, c)` 改形状（总数不变）；`ravel()` / `flatten()`
拉平成一维；`.T` 转置（行列互换）。
**ravel 尽可能返回视图，flatten 总是返回副本**——
对 ravel 结果的原地修改可能写回原数组。""", []),

    ("md", "### 例 1｜最小例子：一维二维来回变", []),

    ("code", """\
import numpy as np

a = np.arange(1, 7)
m = a.reshape(2, 3)
print(m)
print(m.ravel())    # 拉平：[1 2 3 4 5 6]
print(m.T)          # 转置：3 行 2 列
print(m.T.shape, m.shape)""", ["example"]),

    ("md", "### 例 2｜业务例子：月账本在“日视图”和“周视图”间切换", []),

    ("code", """\
import numpy as np

daily = np.array([20.0, 35.5, 0.0, 88.0, 12.0, 45.0, 66.5,
                  18.0, 22.0, 30.0, 5.5, 27.0, 80.0, 40.0])

weekly = daily.reshape(2, 7)        # 日视图 -> 周视图
print("每周合计:", weekly.sum(axis=1))

back = weekly.ravel()               # 周视图 -> 日视图
print("拉平后前 3 天:", back[:3])""", ["example"]),

    ("md", "### 例 3｜常见错误：ravel 改动写回原数组", []),

    ("code", """\
import numpy as np

m = np.arange(1, 7).reshape(2, 3)
flat = m.ravel()        # 视图
flat[0] = 100
print(m[0, 0])          # 100：原矩阵被改！

m2 = np.arange(1, 7).reshape(2, 3)
flat2 = m2.flatten()    # 副本
flat2[0] = 100
print(m2[0, 0])         # 1：安全""", ["example"]),

    ("md", """\
**要点**：**要改数据 → flatten（副本）；只读浏览 → ravel（更快）**。
拿不准就用 flatten，性能差异微不足道。""", []),

    ("md", """## 2. 合并：把多段数据拼起来

**概念**：`np.concatenate([a, b], axis=0)` 沿轴拼接；
一维数组用 `np.vstack`（上下叠成列）与 `np.hstack`（左右连）更直观。
**合并的数组在非拼接轴上长度必须一致**。""", []),

    ("md", "### 例 1｜最小例子：三种合并", []),

    ("code", """\
import numpy as np

a = np.array([1, 2, 3])
b = np.array([4, 5, 6])

print(np.concatenate([a, b]))   # [1 2 3 4 5 6]
print(np.vstack([a, b]))        # 2 行 3 列：按行叠
print(np.hstack([a, b]))        # 与 concatenate 一维等价""", ["example"]),

    ("md", "### 例 2｜业务例子：两个月的账本合并", []),

    ("code", """\
import numpy as np

july = np.array([120.0, 88.0, 66.0, 45.0, 210.0])
august = np.array([98.0, 132.0, 55.0, 71.0, 188.0])

two_months = np.vstack([july, august])      # 2 行 × 5 天
print(two_months.shape)
print("两个月同日对比:", two_months[1] - two_months[0])
print("月合计:", two_months.sum(axis=1))""", ["example"]),

    ("md", "### 例 3｜常见错误：形状不齐硬合并", []),

    ("code", """\
import numpy as np

a = np.array([[1, 2, 3]])
b = np.array([[4, 5]])

# 反例：列数不一致
# np.concatenate([a, b], axis=0)   # ValueError: all the input array
#                                  # dimensions ... must match exactly

# 反例 2：一维数组 vstack 后形状是 (2, 3)，想拼成 (2, 1) 需要先 reshape
x = np.array([1, 2, 3])
y = np.array([4, 5, 6])
pair = np.stack([x, y], axis=1)     # 按列配对
print(pair)                          # [[1 4] [2 5] [3 6]]""", ["example"]),

    ("md", """\
**要点**：合并前先 `print(a.shape, b.shape)`——
报错信息再长，本质都是“对不齐”。行数对不上就竖着拼不了，
列数对不上就横着拼不了。""", []),

    ("md", """## 3. 拆分：把一段数据切开

**概念**：`np.split(a, n)` 把数组均分成 n 段；
二维用 `np.vsplit(m, n)` 按行切。**均分要求长度能被整除**，
切不匀就报错。""", []),

    ("md", "### 例 1｜业务例子：一个月切成四周", []),

    ("code", """\
import numpy as np

daily = np.arange(1, 29) * 1.0     # 28 天
weeks = np.split(daily, 4)          # 均分 4 段
for w, week in enumerate(weeks, start=1):
    print(f"第 {w} 周: {week[:3]}... 合计 {week.sum():.1f}")""", ["example"]),

    ("md", "### 例 2｜常见错误：切不匀与“切出来是视图”", []),

    ("code", """\
import numpy as np

daily = np.arange(1, 29) * 1.0

# 反例：28 天切 5 份
# np.split(daily, 5)    # ValueError: array split does not result
#                       # in an equal division

# 修复 1：np.array_split 允许不均匀（前面多一个）
parts = np.array_split(np.arange(10), 3)
print([len(p) for p in parts])    # [4 3 3]

# 修复 2：注意切出来的是视图，改它会影响原数组
w1 = np.split(daily, 4)[0]
w1[0] = -1
print(daily[0])                   # -1.0：被写回了""", ["example"]),

    ("md", """\
**要点**：**均匀切用 split，切不匀用 array_split；**
切出来的片段同样是视图，要独立修改就 copy。""", []),

    ("md", """## 综合练习""", []),

    ("md", "### 练一练 16.1：形状变换", ["exercise"]),

    ("code", """\
import numpy as np

daily = np.array([20.0, 35.5, 0.0, 88.0, 12.0, 45.0, 66.5,
                  18.0, 22.0, 30.0, 5.5, 27.0, 80.0, 40.0,
                  25.5, 5.0, 28.0, 41.0, 18.0, 95.0, 52.0,
                  15.0, 6.5, 20.0, 26.0, 16.0, 70.0, 40.0])

# TODO 1：reshape 成 4 周 × 7 天
# TODO 2：转置后打印形状（7 天 × 4 周）
# TODO 3：flatten 后打印前 7 个元素""", ["exercise"]),

    ("md", "### 练一练 16.2：合并对比", ["exercise"]),

    ("code", """\
import numpy as np

aug = np.array([98.0, 132.0, 55.0, 71.0, 188.0, 64.0, 90.0])
sep = np.array([120.0, 88.0, 66.0, 45.0, 210.0, 58.0, 85.0])

# TODO 1：把两个月 vstack 成 2×7 矩阵 m
# TODO 2：打印 9 月相对 8 月每天的变化（按列相减）
# TODO 3：打印变化最大的那天（索引 + 金额差）""", ["exercise"]),

    ("md", "### 练一练 16.3：安全拆分", ["exercise"]),

    ("code", """\
import numpy as np

daily = np.arange(1, 30) * 1.0     # 29 天，故意切不匀

# TODO 1：用 array_split 切成 4 份，打印每份长度
# TODO 2：取出第 1 份并修改第一个元素为 0，
#         验证是否影响原数组；若有影响，改成安全写法""", ["exercise"]),

    ("md", """## 易错点清单

- `reshape` 总数必须等于 `size`，先乘一下各维度；
- `ravel` 可能返回视图、`flatten` 一定是副本——要改数据用 flatten；
- 合并要求非拼接轴长度一致，先看 shape 再拼；
- `split` 要求整除，切不匀用 `array_split`；
- 切出来的片段是视图，原地修改会写回原数组。""", []),

    ("md", """## 本章小结

- reshape/T/ravel 三件套让同份数据在日视图、周视图、列向量间自由切换。
- vstack/hstack/concatenate 管拼，split/array_split 管拆。
- 视图问题贯穿本章：**变换多半是视图，改前想清楚要不要 copy**。
- 下一章：让形状不同的数组直接运算——向量化与广播。""", []),

    ("md", """## 参考答案""", []),

    ("code", """\
# 练一练 16.1 参考答案
import numpy as np

daily = np.array([20.0, 35.5, 0.0, 88.0, 12.0, 45.0, 66.5,
                  18.0, 22.0, 30.0, 5.5, 27.0, 80.0, 40.0,
                  25.5, 5.0, 28.0, 41.0, 18.0, 95.0, 52.0,
                  15.0, 6.5, 20.0, 26.0, 16.0, 70.0, 40.0])
m = daily.reshape(4, 7)
print(m.shape, m.T.shape)
print(m.flatten()[:7])""", ["solution"]),

    ("code", """\
# 练一练 16.2 参考答案
import numpy as np

aug = np.array([98.0, 132.0, 55.0, 71.0, 188.0, 64.0, 90.0])
sep = np.array([120.0, 88.0, 66.0, 45.0, 210.0, 58.0, 85.0])

m = np.vstack([aug, sep])
diff = m[1] - m[0]
print(diff)
pos = np.abs(diff).argmax()
print(f"第 {pos + 1} 天变化最大: {diff[pos]:+.1f} 元")""", ["solution"]),

    ("code", """\
# 练一练 16.3 参考答案
import numpy as np

daily = np.arange(1, 30) * 1.0
parts = np.array_split(daily, 4)
print([len(p) for p in parts])

first = parts[0].copy()       # copy 才安全
first[0] = 0.0
print("原数组未受影响:", daily[0] == 1.0)""", ["solution"]),
]
