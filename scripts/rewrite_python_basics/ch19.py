"""course-chapter-19 Series与DataFrame"""

TITLE = "Series与DataFrame"
EST_MINUTES = 55

CELLS = [
    ("md", """\
# 第23章 Series与DataFrame

NumPy 数组快但“没名没姓”——第 2 列是金额还是数量？看不出来。
**Pandas** 给数据加上列名和行索引，是数据分析的行业标准工具。

两个核心对象：**Series**（带标签的一列）和 **DataFrame**（一张表）。
此后 9 章的记账数据都住在这张表里。""", []),

    ("md", """## 学习目标

学完本章，你能够：

- 从字典创建 DataFrame，读懂 `head`、`info`、`describe`、`shape` 的输出；
- 取出一列（Series）与多列（DataFrame），说清两者的类型区别；
- 用 `value_counts`、`unique` 做快速盘点；
- 避开三大坑：列名打错返回 KeyError、单括号双括号混用、把 Series 当 DataFrame 用。""", []),

    ("md", """## 1. 创建与速览：一张表的基本面

**概念**：从字典创建 DataFrame 最常见——键变列名，值变列数据。
拿到任何新表，先跑一遍 `head()`（长什么样）、`info()`（类型与缺失）、
`describe()`（数值概览），再动手分析。""", []),

    ("md", "### 例 1｜最小例子：三行两列的小表", []),

    ("code", """\
import pandas as pd

df = pd.DataFrame({
    "item": ["咖啡", "地铁", "电影"],
    "amount": [18.0, 4.0, 45.0],
})
print(df)
print(df.shape)      # (3, 2)：3 行 2 列""", ["example"]),

    ("md", "### 例 2｜业务例子：一周账本表", []),

    ("code", """\
import pandas as pd

ledger = pd.DataFrame({
    "day": ["周一", "周二", "周三", "周四", "周五", "周六", "周日"],
    "category": ["餐饮", "交通", "餐饮", "数码", "交通", "娱乐", "餐饮"],
    "amount": [20.0, 4.0, 25.5, 399.0, 4.0, 45.0, 32.0],
})

print(ledger.head(3))            # 前 3 行
ledger.info()                    # 类型 + 缺失 + 内存
print(ledger["amount"].describe().round(1))  # 金额列概览""", ["example"]),

    ("md", """\
**输出解读**：`info` 显示 3 列、7 行、无缺失；
`describe` 给出 count/mean/std/min/quartiles/max。
**“先 head-info-describe 再动手”**是处理任何新数据的标准开场。""", []),

    ("md", "### 例 3｜常见错误：列名打错的静默与爆炸", []),

    ("code", """\
import pandas as pd

ledger = pd.DataFrame({
    "item": ["咖啡", "地铁"],
    "amount": [18.0, 4.0],
})

# 反例 1：列名拼错 -> KeyError
# ledger["amout"]     # KeyError: 'amout'

# 修复：先看一眼真实列名
print(ledger.columns.tolist())

# 反例 2：df.columns 当属性没错，但 df.shape() 加括号就错了
# ledger.shape()       # TypeError
print(ledger.shape)      # 属性，无括号""", ["example"]),

    ("md", """\
**要点**：KeyError 先 `print(df.columns.tolist())` 对拼写；
`shape`/`columns`/`dtypes` 是属性，**不加括号**。""", []),

    ("md", """## 2. 取列：Series 与 DataFrame 的分界线

**概念**：`df["amount"]` 取一列，得到 **Series**（带索引的一维数据）；
`df[["item", "amount"]]` 传**列表**取多列，得到 **DataFrame**。
一个方括号 vs 两个方括号，返回类型完全不同。""", []),

    ("md", "### 例 1｜最小例子：一列与两列", []),

    ("code", """\
import pandas as pd

df = pd.DataFrame({"a": [1, 2], "b": [3, 4]})

s = df["a"]            # Series
d = df[["a", "b"]]     # DataFrame（注意双层方括号）
print(type(s).__name__, type(d).__name__)
print(s.mean())        # Series 自带统计方法""", ["example"]),

    ("md", "### 例 2｜业务例子：金额列的独立分析", []),

    ("code", """\
import pandas as pd

ledger = pd.DataFrame({
    "day": ["周一", "周二", "周三", "周四"],
    "category": ["餐饮", "交通", "数码", "餐饮"],
    "amount": [20.0, 4.0, 399.0, 32.0],
})

amount = ledger["amount"]             # 一列
print(f"类型 {type(amount).__name__}，合计 {amount.sum():.1f} 元")
print(f"最大一笔 {amount.max()} 元，占总额 {amount.max() / amount.sum():.0%}")

sub = ledger[["day", "amount"]]       # 两列 -> 新表
print(sub.head(2))""", ["example"]),

    ("md", "### 例 3｜常见错误：双层方括号与点号取列", []),

    ("code", """\
import pandas as pd

df = pd.DataFrame({"amount": [1.0, 2.0]})

# 反例 1：以为单层括号能取多列
# df["amount", "x"]    # KeyError：单括号只取一列

# 反例 2：点号取列 df.amount 能用，但列名带空格/与方法重名就崩——
# 团队规范：一律用方括号
print(df["amount"])

# 反例 3：取“一列”却按 DataFrame 用
s = df["amount"]
# s.shape[1]           # 越界：Series 是一维，shape 只有 (n,)
print(s.shape)          # (2,)""", ["example"]),

    ("md", """\
**要点**：**一列一括号（Series），多列双括号（DataFrame）。**
统一用 `df["列名"]` 方括号写法，别用点号。""", []),

    ("md", """## 3. 快速盘点：unique、value_counts、nunique

**概念**：盘点一列的“内容清单”——
`unique` 列出出现过的值；`value_counts` 按出现次数排序计数；
`nunique` 数种类数。这三个方法是你认识分类列的第一反应。""", []),

    ("md", "### 例 1｜业务例子：账本分类盘点", []),

    ("code", """\
import pandas as pd

ledger = pd.DataFrame({
    "category": ["餐饮", "交通", "餐饮", "数码", "交通", "娱乐", "餐饮"],
})

print(ledger["category"].unique())            # 种类清单
print(ledger["category"].value_counts())      # 次数排序（降序）
print("共", ledger["category"].nunique(), "个类别")""", ["example"]),

    ("md", "### 例 2｜常见错误：value_counts 的空值陷阱", []),

    ("code", """\
import pandas as pd

s = pd.Series(["餐饮", "餐饮", None, "交通"])

print(s.value_counts())            # 默认不含 nan！
print(s.value_counts(dropna=False))  # 想看到缺失计数要显式声明
print(s.nunique())                 # 2：默认也不把 nan 算一类""", ["example"]),

    ("md", """\
**要点**：**value_counts 默认丢弃 nan**——
类别盘点时若“总数对不上”，第一嫌疑就是缺失值被 dropna 了。""", []),

    ("md", """## 4. Series 的向量化：和 NumPy 一脉相承

**概念**：Series 底层就是 NumPy 数组——向量化运算、布尔筛选全部适用，
且**索引会自动对齐**：`s1 + s2` 按标签相加，对不上的位置变 nan。
这是 Series 与裸数组最重要的区别。""", []),

    ("md", "### 例 1｜业务例子：预算对比", []),

    ("code", """\
import pandas as pd

spent = pd.Series({"餐饮": 320.0, "交通": 88.0, "娱乐": 130.0})
budget = pd.Series({"餐饮": 400.0, "交通": 100.0, "娱乐": 100.0})

usage = spent / budget              # 索引对齐相除
print((usage * 100).round(0))
print(usage[usage > 1].index.tolist())   # 超预算类别""", ["example"]),

    ("md", "### 例 2｜常见错误：索引不对齐产生 nan", []),

    ("code", """\
import pandas as pd

s1 = pd.Series([10.0, 20.0], index=["a", "b"])
s2 = pd.Series([1.0, 2.0], index=["b", "c"])

print(s1 + s2)    # a、c 各对不上一个，全是 nan！
print(s1.index.union(s2.index), "<- 并集作为结果索引")

# 修复：加之前先对齐/检查索引
common = s1.index.intersection(s2.index)
print(s1[common] + s2[common])      # 只算共有标签""", ["example"]),

    ("md", """\
**要点**：**Series 运算是按标签对齐的，不是按位置。**
结果莫名多出 nan 时，打印两个对象的 index 对一对。""", []),

    ("md", """## 综合练习""", []),

    ("md", "### 练一练 19.1：建表与速览", ["exercise"]),

    ("code", """\
import pandas as pd

# TODO 1：用字典创建 DataFrame，列：summary(4 个摘要)、category、amount
# TODO 2：打印 shape 与前 2 行
# TODO 3：打印 amount 列的均值与最大值""", ["exercise"]),

    ("md", "### 练一练 19.2：列的盘点", ["exercise"]),

    ("code", """\
# 沿用练一练 19.1 的表（或重新创建）
# TODO 1：打印 category 的 unique 与 nunique
# TODO 2：打印 category 的 value_counts
# TODO 3：取出 [summary, amount] 两列组成新表 sub""", ["exercise"]),

    ("md", "### 练一练 19.3：对齐运算", ["exercise"]),

    ("code", """\
import pandas as pd

spent = pd.Series({"餐饮": 320.0, "交通": 88.0, "数码": 399.0})
budget = pd.Series({"餐饮": 400.0, "交通": 100.0})

# TODO 1：直接 spent / budget，观察哪些位置出现 nan，解释原因
# TODO 2：只对共有类别计算使用率，打印超过 50% 的类别""", ["exercise"]),

    ("md", """## 易错点清单

- 列名拼错 -> KeyError，先 `df.columns.tolist()` 对拼写；
- `shape`/`columns` 是属性不加括号；
- 一列一括号是 Series，多列双括号才是 DataFrame；
- `value_counts`/`nunique` 默认忽略 nan，盘点时记得 `dropna=False`;
- Series 运算按**标签**对齐，索引不一致会静默产生 nan。""", []),

    ("md", """## 本章小结

- DataFrame = 列名的表格；拿到新表先 head / info / describe。
- 取列的一括号/双括号之分，是 Series 与 DataFrame 的分界。
- value_counts 是分类列的“体检”，索引对齐是 Series 运算的暗礁。
- 下一章：按位置、按标签、按条件取数——loc、iloc 与筛选。""", []),

    ("md", """## 参考答案""", []),

    ("code", """\
# 练一练 19.1 参考答案
import pandas as pd

df = pd.DataFrame({
    "summary": ["咖啡", "地铁", "电影", "外卖"],
    "category": ["餐饮", "交通", "娱乐", "餐饮"],
    "amount": [18.0, 4.0, 45.0, 32.0],
})
print(df.shape)
print(df.head(2))
print(df["amount"].mean(), df["amount"].max())""", ["solution"]),

    ("code", """\
# 练一练 19.2 参考答案
import pandas as pd

df = pd.DataFrame({
    "summary": ["咖啡", "地铁", "电影", "外卖"],
    "category": ["餐饮", "交通", "娱乐", "餐饮"],
    "amount": [18.0, 4.0, 45.0, 32.0],
})
print(df["category"].unique(), df["category"].nunique())
print(df["category"].value_counts())
sub = df[["summary", "amount"]]
print(sub)""", ["solution"]),

    ("code", """\
# 练一练 19.3 参考答案
import pandas as pd

spent = pd.Series({"餐饮": 320.0, "交通": 88.0, "数码": 399.0})
budget = pd.Series({"餐饮": 400.0, "交通": 100.0})

print(spent / budget)
# “数码”只出现在 spent 中 -> nan：索引对不上，Pandas 不猜、只填 nan

common = spent.index.intersection(budget.index)
usage = spent[common] / budget[common]
print(usage[usage > 0.5].index.tolist())""", ["solution"]),
]
