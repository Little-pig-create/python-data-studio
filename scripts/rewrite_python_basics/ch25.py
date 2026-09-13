"""course-chapter-25 分组、聚合与数据透视"""

TITLE = "分组、聚合与数据透视"
EST_MINUTES = 55

CELLS = [
    ("md", """\
# 第29章 分组、聚合与数据透视

“每个类别花了多少”“每月合计多少”“谁是大客户”——
这些问题都是同一个模板：**按 X 分组，对 Y 做统计**。

Pandas 的答案是 `groupby` + 命名聚合 + `pivot_table`。
这一章是 Pandas 的“高潮章”：学完后，报表类需求基本全能应对。""", []),

    ("md", """## 学习目标

学完本章，你能够：

- 用 `groupby` + 命名聚合一次算出多个统计量，并理解结果的结构；
- 用 `transform` 把聚合结果回填到原表（组内均值列）；
- 用 `pivot_table` 做交叉汇总，`melt` 反向拉长；
- 避开三大坑：groupby 后索引变化、agg 字典写法歧义、透视表重复聚合。""", []),

    ("md", """## 1. groupby：拆开-计算-合并

**概念**：`groupby("列")` 把表按该列拆成若干组，
对每组应用聚合函数（sum/mean/count...），再把结果合并。
**命名聚合**是最清晰的写法：

```python
df.groupby("类别").agg(
    合计=("金额", "sum"), 笔数=("金额", "count"))
```""", []),

    ("md", "### 例 1｜最小例子：按类别求和", []),

    ("code", """\
import pandas as pd

df = pd.DataFrame({
    "category": ["餐饮", "交通", "餐饮", "娱乐"],
    "amount": [25.5, 4.0, 32.0, 45.0],
})

totals = df.groupby("category")["amount"].sum()
print(totals)
print(type(totals).__name__)    # Series：一列聚合结果""", ["example"]),

    ("md", "### 例 2｜业务例子：月账单分类报表", []),

    ("code", """\
import pandas as pd

ledger = pd.DataFrame({
    "category": ["餐饮", "交通", "餐饮", "数码", "交通", "娱乐", "餐饮"],
    "amount": [25.5, 4.0, 32.0, 399.0, 4.0, 45.0, 18.0],
    "day": [1, 1, 2, 2, 3, 4, 4],
})

report = ledger.groupby("category").agg(
    合计=("amount", "sum"),
    笔数=("amount", "count"),
    最大单笔=("amount", "max"),
).round(1).sort_values("合计", ascending=False)
report["占比"] = (report["合计"] / report["合计"].sum()).round(2)
print(report)""", ["example"]),

    ("md", "### 例 3｜常见错误：groupby 之后的索引变了", []),

    ("code", """\
import pandas as pd

df = pd.DataFrame({"category": ["a", "b", "a"], "amount": [10.0, 20.0, 30.0]})

g = df.groupby("category")["amount"].sum()
print(g)
print(g["a"])          # 聚合结果的索引是类别，不再 0,1,2
# print(g[0])          # KeyError！

# 想要“类别变回普通列”：reset_index
print(g.reset_index())""", ["example"]),

    ("md", """\
**要点**：**groupby 的结果以分组键为索引**。
后续按位置取数或与其他表拼接前，先 `reset_index()`。""", []),

    ("md", """## 2. transform：把组内统计回填到每一行

**概念**：`agg` 把表“压缩”成组数行；`transform` 不压缩——
每个元素得到**所属组的统计值**，适合“组内均值列”“组内占比”这类衍生列。""", []),

    ("md", "### 例 1｜业务例子：每笔账相对组均值的偏离", []),

    ("code", """\
import pandas as pd

ledger = pd.DataFrame({
    "category": ["餐饮", "交通", "餐饮", "娱乐", "餐饮"],
    "amount": [25.5, 4.0, 60.0, 45.0, 12.0],
})

ledger["cat_mean"] = ledger.groupby("category")["amount"].transform("mean")
ledger["ratio"] = (ledger["amount"] / ledger["cat_mean"]).round(2)
print(ledger)""", ["example"]),

    ("md", "### 例 2｜常见错误：agg 与 transform 用混", []),

    ("code", """\
import pandas as pd

df = pd.DataFrame({"category": ["a", "b", "a"], "amount": [10.0, 20.0, 30.0]})

print(df.groupby("category")["amount"].agg("mean"))        # 2 行（压缩）
print(df.groupby("category")["amount"].transform("mean"))  # 3 行（回填）

# 口诀：**要报表用 agg，要加列用 transform**。
# 用错的表现：agg 回填行数对不上报错，transform 出的报表行数过多。""", ["example"]),

    ("md", """## 3. pivot_table 与 melt：交叉汇总

**概念**：`pivot_table` 把“两个维度 + 一个指标”变成矩阵——
行=类别、列=星期、值=金额合计。`melt` 是它的反向操作（宽表拉长）。
**同一个 (行,列) 组合若有多条记录会自动求均值**——
通常你想求 sum，记得写 `aggfunc="sum"`。""", []),

    ("md", "### 例 1｜业务例子：类别 × 周末 的交叉表", []),

    ("code", """\
import pandas as pd

ledger = pd.DataFrame({
    "category": ["餐饮", "交通", "餐饮", "娱乐", "餐饮"],
    "weekend": [False, False, False, True, True],
    "amount": [25.5, 4.0, 32.0, 45.0, 18.0],
})

pv = ledger.pivot_table(
    index="category", columns="weekend",
    values="amount", aggfunc="sum", fill_value=0)
print(pv)""", ["example"]),

    ("md", "### 例 2｜常见错误：重复聚合的均值陷阱", []),

    ("code", """\
import pandas as pd

df = pd.DataFrame({
    "category": ["a", "a", "b"],       # a 有两条
    "week": [1, 1, 1],
    "amount": [10.0, 30.0, 20.0],
})

# 默认 aggfunc="mean"：(a,1) 有两条 -> 20.0（10+30 的均值），不是合计！
print(df.pivot_table(index="category", columns="week",
                     values="amount"))
print(df.pivot_table(index="category", columns="week",
                     values="amount", aggfunc="sum"))   # 明确写 sum""", ["example"]),

    ("md", """\
**要点**：**pivot_table 永远显式写 aggfunc**；
交叉表出现“不对劲的小数”，第一嫌疑就是默认均值在作怪。""", []),

    ("md", """## 综合练习""", []),

    ("md", "### 练一练 25.1：分类报表", ["exercise"]),

    ("code", """\
import pandas as pd

df = pd.DataFrame({
    "category": ["餐饮", "交通", "餐饮", "数码", "娱乐", "交通"],
    "amount": [25.5, 4.0, 32.0, 399.0, 45.0, 8.0],
    "paid_by": ["微信", "支付宝", "微信", "微信", "现金", "支付宝"],
})

# TODO 1：按 category 聚合出 合计、笔数、均值（命名聚合）
# TODO 2：按 合计 降序排列，计算占比列
# TODO 3：按 paid_by 分别统计笔数（value_counts 与 groupby 两种写法）""", ["exercise"]),

    ("md", "### 练一练 25.2：transform 回填", ["exercise"]),

    ("code", """\
# 沿用练一练 25.1 的表
# TODO 1：新增列 cat_mean（所在类别的均值，transform）
# TODO 2：新增列 vs_mean = amount - cat_mean
# TODO 3：打印 vs_mean 最大的两笔（哪笔消费最“超类内水平”）""", ["exercise"]),

    ("md", "### 练一练 25.3：交叉表", ["exercise"]),

    ("code", """\
import pandas as pd

df = pd.DataFrame({
    "category": ["餐饮", "餐饮", "交通", "娱乐", "娱乐"],
    "weekend": [True, False, False, True, True],
    "amount": [25.5, 32.0, 4.0, 45.0, 12.0],
})

# TODO 1：pivot_table：行=category、列=weekend、值=amount 合计（fill_value=0）
# TODO 2：用 melt 把结果拉长回三列（category, weekend, amount）——提示
#         reset_index 后 melt(id_vars="category")""", ["exercise"]),

    ("md", """## 易错点清单

- groupby 结果以分组键为索引，接续操作前 `reset_index()`；
- 报表用 agg、加列用 transform，用混行数对不上；
- pivot_table 默认 aggfunc="mean"，要合计必须显式写；
- 交叉表出现意外的 nan，用 `fill_value=0` 补齐；
- 命名聚合 `列名=("原列", "函数")` 优先于字典写法。""", []),

    ("md", """## 本章小结

- groupby = 拆开-计算-合并；命名聚合一次出多指标报表。
- transform 回填组统计，agg/transform 分工明确。
- pivot_table/melt 一对逆操作完成宽窄表转换。
- 下一章：多张表怎么拼——merge 与 concat。""", []),

    ("md", """## 参考答案""", []),

    ("code", """\
# 练一练 25.1 参考答案
import pandas as pd

df = pd.DataFrame({
    "category": ["餐饮", "交通", "餐饮", "数码", "娱乐", "交通"],
    "amount": [25.5, 4.0, 32.0, 399.0, 45.0, 8.0],
    "paid_by": ["微信", "支付宝", "微信", "微信", "现金", "支付宝"],
})
report = df.groupby("category").agg(
    合计=("amount", "sum"), 笔数=("amount", "count"),
    均值=("amount", "mean"),
).round(1).sort_values("合计", ascending=False)
report["占比"] = (report["合计"] / report["合计"].sum()).round(2)
print(report)
print(df["paid_by"].value_counts())
print(df.groupby("paid_by")["amount"].count())""", ["solution"]),

    ("code", """\
# 练一练 25.2 参考答案
import pandas as pd

df = pd.DataFrame({
    "category": ["餐饮", "交通", "餐饮", "数码", "娱乐", "交通"],
    "amount": [25.5, 4.0, 32.0, 399.0, 45.0, 8.0],
    "paid_by": ["微信", "支付宝", "微信", "微信", "现金", "支付宝"],
})
df["cat_mean"] = df.groupby("category")["amount"].transform("mean")
df["vs_mean"] = df["amount"] - df["cat_mean"]
print(df.nlargest(2, "vs_mean"))""", ["solution"]),

    ("code", """\
# 练一练 25.3 参考答案
import pandas as pd

df = pd.DataFrame({
    "category": ["餐饮", "餐饮", "交通", "娱乐", "娱乐"],
    "weekend": [True, False, False, True, True],
    "amount": [25.5, 32.0, 4.0, 45.0, 12.0],
})
pv = df.pivot_table(index="category", columns="weekend",
                    values="amount", aggfunc="sum", fill_value=0)
print(pv)
long = pv.reset_index().melt(id_vars="category",
                             var_name="weekend", value_name="amount")
print(long)""", ["solution"]),
]
