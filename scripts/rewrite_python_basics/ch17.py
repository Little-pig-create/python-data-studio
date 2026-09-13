"""course-chapter-17 向量化与广播"""

TITLE = "向量化与广播"
EST_MINUTES = 50

CELLS = [
    ("md", """\
# 第20章 向量化与广播

前两章你已经体会过 `a.sum()` 的爽快。这一章把 NumPy 的核心哲学讲透：

- **向量化**：对整个数组做运算，不写循环；
- **广播**：形状不同的数组之间也能运算——比如“每个价格 × 一个折扣率”。

理解广播规则后你会发现，第 9 章一大半的循环都可以删掉。""", []),

    ("md", """## 学习目标

学完本章，你能够：

- 用向量化表达式替代显式循环完成批量计算；
- 说出广播的两条对齐规则，预判 `数组 + 标量`、`数组 + 一维数组` 的结果形状；
- 识别 `(n,)` 与 `(1, n)` / `(n, 1)` 的形状陷阱；
- 避开“静默广播出错”——形状兼容但结果不是你想要的。""", []),

    ("md", """## 1. 向量化：循环消失的魔法

**概念**：`a * 2`、`a + b`、`a ** 2` 逐元素作用于整个数组，
底层是编译好的 C 循环——代码短、速度快、语义清晰。
**能用向量化就别写 for**，这是 NumPy 的第一守则。""", []),

    ("md", "### 例 1｜最小例子：一行顶十行", []),

    ("code", """\
import numpy as np

prices = np.array([3.5, 12.0, 45.0])

# 第 9 章的写法：循环 + 累计器
# result = []
# for p in prices:
#     result.append(p * 1.06)

# 向量化：一行
print(prices * 1.06)             # 含税价
print(prices ** 2)               # 平方
print(np.round(prices * 0.85, 2))  # 折后价（保留 2 位）""", ["example"]),

    ("md", "### 例 2｜业务例子：整月账单一次性处理", []),

    ("code", """\
import numpy as np

daily = np.array([20.0, 35.5, 0.0, 88.0, 12.0, 45.0, 66.5])

# 所有金额统一打 9 折再减 2 元（会员优惠）
discounted = daily * 0.9 - 2
print(np.round(discounted, 1))

# 条件优惠：超 50 的部分打 8 折（np.where + 向量化）
better = np.where(daily > 50, 50 + (daily - 50) * 0.8, daily)
print(np.round(better, 1))""", ["example"]),

    ("md", "### 例 3｜常见错误：把向量化写回循环思维", []),

    ("code", """\
import numpy as np

a = np.array([1.0, 2.0, 3.0])

# 反例 1：对数组用 len 遍历再逐个算（能跑但丢掉 NumPy 的意义）
# out = []
# for x in a:
#     out.append(x * 2)

# 反例 2：以为 a + 1 会改原数组
a + 1
print(a)          # [1. 2. 3.]：向量化返回新数组，原数组不变

# 修复：想要原地更新用 +=
a += 1
print(a)          # [2. 3. 4.]""", ["example"]),

    ("md", """\
**要点**：向量化运算**返回新数组**（除 += 等原地运算符）。
判断“该不该向量化”的口诀：**循环里没有 if 分支控制流，就该向量化。**""", []),

    ("md", """## 2. 广播：形状不同的数组如何相加

**概念**：`数组 + 标量`、`(4,7) + (7,)` 能直接算，靠的是**广播**：
从**尾部维度**向前对齐，两个规则——

1. 维度相等 → 直接算；
2. 一方是 1 → 沿该维度复制扩展。

对不齐（如 7 和 8）就报错。""", []),

    ("md", "### 例 1｜最小例子：数组 + 标量与行向量", []),

    ("code", """\
import numpy as np

m = np.arange(1, 7).reshape(2, 3)

print(m + 100)        # 标量广播到每个元素
b = np.array([10, 20, 30])
print(m + b)          # (2,3) + (3,)：b 沿行方向复制到每一行
print(m * 10)         # 标量同理广播""", ["example"]),

    ("md", "### 例 2｜业务例子：每类支出用不同汇率折算", []),

    ("code", """\
import numpy as np

# 3 类支出 × 4 个月（元）
spend = np.array([[120.0, 98.0, 132.0, 88.0],
                  [45.0, 51.0, 60.0, 40.0],
                  [200.0, 180.0, 210.0, 190.0]])

rates = np.array([1.0, 1.02, 1.04, 1.06])   # 每个月的汇率
usd = spend / rates                          # (3,4) / (4,) 广播
print(np.round(usd, 1))

budget_per_month = np.array([450.0, 460.0])  # 反例预告：形状 (2,) 对不上 (3,4)
# spend - budget_per_month    # ValueError: operands could not be broadcast""", ["example"]),

    ("md", "### 例 3｜常见错误：(n,) 与 (n,1) 的隐形陷阱", []),

    ("code", """\
import numpy as np

a = np.array([1, 2, 3])            # 形状 (3,)
col = a.reshape(3, 1)              # 形状 (3,1)

print(col + a)                     # (3,1)+(3,) 广播出 (3,3) 矩阵！
print((col + a).shape)             # 不是你想要的逐元素相加！

# 修复：对齐形状（都用 (n,) 或都用 (n,1)）
print(col.ravel() + a)             # [2 4 6]
print((col + col.T).shape)         # 又一个 (3,3)：转置相加同理要小心""", ["example"]),

    ("md", """\
**要点**：形状**兼容但错误**的广播不报错、只给“看起来不对”的结果——
它比 ValueError 更危险。**算完先 print 结果的 shape**，
形状对了再检查数值。""", []),

    ("md", """## 3. 聚合函数与 axis：往哪个方向汇总

**概念**：`sum/mean/max/argmax/std` 都支持 `axis` 参数。
记忆口诀：**axis=0 压扁行（每列一个结果），axis=1 压扁列（每行一个结果）**。
不指定 axis 就是全部元素汇总。""", []),

    ("md", "### 例 1｜业务例子：周账本的方向性统计", []),

    ("code", """\
import numpy as np

ledger = np.array([[20.0, 35.5, 0.0, 88.0, 12.0, 45.0, 66.5],
                   [18.0, 22.0, 30.0, 5.5, 27.0, 80.0, 40.0]])

print("每周合计:", ledger.sum(axis=1))     # 按行 → 2 个结果
print("每个星期几合计:", ledger.sum(axis=0))  # 按列 → 7 个结果
print("全部合计:", ledger.sum())
print("最贵的单笔:", ledger.max(), "在第", ledger.argmax() + 1, "格")""", ["example"]),

    ("md", "### 例 2｜常见错误：axis 记反与 keepdims", []),

    ("code", """\
import numpy as np

m = np.arange(1, 7).reshape(2, 3)

print(m.sum(axis=0).shape)    # (3,)：压掉行，剩每列
print(m.sum(axis=1).shape)    # (2,)：压掉列，剩每行

# 反例：想“每行减去该行均值”却报错
row_mean = m.mean(axis=1)     # (2,)
# print(m - row_mean)         # ValueError：(2,3) 和 (2,) 对不齐！

# 修复：keepdims 保留被压掉的维度
row_mean_k = m.mean(axis=1, keepdims=True)   # (2,1)
print((m - row_mean_k).round(1))             # 广播成功：每行标准化""", ["example"]),

    ("md", """\
**要点**：**axis 指的是“被压掉的那个轴”。**
“每行减行均值、每列减列均值”这类标准化操作，
`keepdims=True` 是标准搭档。""", []),

    ("md", """## 综合练习""", []),

    ("md", "### 练一练 17.1：向量化改写", ["exercise"]),

    ("code", """\
import numpy as np

spends = np.array([120.5, 88.0, 302.4, 66.0, 45.9])

# TODO 1：全部金额打 8.8 折（向量化，不写循环）
# TODO 2：生成布尔标签数组：>=100 为 True
# TODO 3：用 np.where 生成折后价数组：>=100 打 8.8 折，否则原价""", ["exercise"]),

    ("md", "### 练一练 17.2：广播汇率", ["exercise"]),

    ("code", """\
import numpy as np

# 2 类支出 × 3 个月
spend = np.array([[100.0, 120.0, 90.0],
                  [50.0, 60.0, 45.0]])
rates = np.array([1.0, 1.05, 1.1])     # 各月汇率

# TODO 1：用广播算出各月折算价（spend / rates）
# TODO 2：打印每月两类支出合计（axis 用对）
# TODO 3：每类支出减去该类均值（keepdims）并打印""", ["exercise"]),

    ("md", "### 练一练 17.3：识别危险广播", ["exercise"]),

    ("code", """\
import numpy as np

a = np.array([1.0, 2.0, 3.0])          # (3,)
col = a.reshape(3, 1)                  # (3,1)

# TODO 1：预测 col + a 的形状，运行验证
# TODO 2：写出“逐元素相加”的正确写法（两种）
# TODO 3：m = a.reshape(1,3)；打印 (m + col) 的形状并解释为什么是 (3,3)""", ["exercise"]),

    ("md", """## 易错点清单

- 向量化返回新数组，原地更新用 `+=` 等运算符；
- 广播从尾部维度对齐：相等或有一方为 1 才能算；
- `(n,)` 与 `(n,1)` 广播出 `(n,n)`——形状兼容但语义错误，先查 shape；
- axis 是“被压掉的轴”：axis=0 按列汇总、axis=1 按行汇总；
- “每行/列减均值”记得 `keepdims=True`。""", []),

    ("md", """## 本章小结

- 向量化消灭循环，广播消灭“形状对齐”的手工劳动。
- 两条广播规则 + `keepdims` + `np.where` 覆盖 90% 的批量计算需求。
- 危险的不是广播报错，而是广播“静默成功”——结果先看 shape。
- 下一章：统计函数全家桶与随机抽样，让数组替你做描述统计。""", []),

    ("md", """## 参考答案""", []),

    ("code", """\
# 练一练 17.1 参考答案
import numpy as np

spends = np.array([120.5, 88.0, 302.4, 66.0, 45.9])

print(np.round(spends * 0.88, 2))
print(spends >= 100)
print(np.where(spends >= 100, np.round(spends * 0.88, 2), spends))""", ["solution"]),

    ("code", """\
# 练一练 17.2 参考答案
import numpy as np

spend = np.array([[100.0, 120.0, 90.0],
                  [50.0, 60.0, 45.0]])
rates = np.array([1.0, 1.05, 1.1])

print(np.round(spend / rates, 1))
print((spend / rates).sum(axis=0).round(1))
centered = spend - spend.mean(axis=1, keepdims=True)
print(centered)""", ["solution"]),

    ("code", """\
# 练一练 17.3 参考答案
import numpy as np

a = np.array([1.0, 2.0, 3.0])
col = a.reshape(3, 1)

print((col + a).shape)        # (3, 3)：广播成矩阵
print(col.ravel() + a)        # 写法 1：拉平对齐成 (3,)
print(a + a)                  # 写法 2：形状一致直接加
m = a.reshape(1, 3)
print((m + col).shape)        # (1,3)+(3,1) -> (3,3)：各自沿为 1 的维度复制""", ["solution"]),
]
