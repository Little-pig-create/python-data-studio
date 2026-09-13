"""course-chapter-20 选择、筛选与排序"""

TITLE = "选择、筛选与排序"
EST_MINUTES = 55

CELLS = [
    ("md", """\
# 第24章 选择、筛选与排序

分析一张表的高频动作就三个：**找到那几行**（筛选）、
**按值排个序**（排序）、**按位置取数**（定位）。
Pandas 为此提供了 `loc`、`iloc`、布尔筛选和 `sort_values`。

本章的记账主线：**从一个月的账本里找出“大额、餐饮类、最近一周”的账目**。""", []),

    ("md", """## 学习目标

学完本章，你能够：

- 用 `loc`（按标签）与 `iloc`（按位置）取行取格，说清两者的区别；
- 用布尔筛选 + `&`/`|` 找到目标行，用 `query` 简化写法；
- 用 `sort_values` 多键排序，`nlargest` 直接取 Top-N；
- 避开三大坑：loc/iloc 混淆、条件用 and/or 报错、链式赋值失效。""", []),

    ("md", """## 1. loc 与 iloc：按标签 vs 按位置

**概念**：
`df.loc[标签]` 按**索引标签**取（默认索引是 0,1,2…，但标签可以是字符串/日期）；
`df.iloc[位置]` 按**第几行**取（永远从 0 数起）。
切片规则不同：**loc 含尾，iloc 不含尾**。""", []),

    ("md", "### 例 1｜最小例子：两种取法的对照", []),

    ("code", """\
import pandas as pd

df = pd.DataFrame({"amount": [18.0, 4.0, 45.0]},
                  index=["周一", "周二", "周三"])

print(df.loc["周二"])       # 按标签取行
print(df.iloc[1])           # 按位置取行（结果相同——默认索引恰是数字）

print(df.loc["周一":"周三"])   # loc 切片：含尾，3 行
print(df.iloc[0:2])            # iloc 切片：不含尾，2 行""", ["example"]),

    ("md", "### 例 2｜业务例子：日期索引的账本", []),

    ("code", """\
import pandas as pd

ledger = pd.DataFrame({
    "category": ["餐饮", "交通", "数码", "娱乐", "餐饮"],
    "amount": [25.5, 4.0, 399.0, 45.0, 32.0],
}, index=pd.to_datetime(["2026-08-01", "2026-08-02", "2026-08-03",
                         "2026-08-04", "2026-08-05"]))

print(ledger.loc["2026-08-03"])            # 按日期标签取
print(ledger.loc["2026-08-02":"2026-08-04", "amount"])   # 行区间 + 列
print(ledger.iloc[0, 1])                   # 第 0 行第 1 列 = 25.5""", ["example"]),

    ("md", "### 例 3｜常见错误：默认索引让人放松警惕", []),

    ("code", """\
import pandas as pd

df = pd.DataFrame({"amount": [18.0, 4.0, 45.0]})

print(df.loc[1])    # 标签 1（这里恰好也是位置 1）
df2 = pd.DataFrame({"amount": [18.0, 4.0, 45.0]},
                   index=[10, 20, 30])       # 非连续标签
try:
    df2.loc[1]
except KeyError as e:
    print("KeyError:", e, "<- 没有标签 1")
print(df2.iloc[1])  # 位置 1 -> amount 4.0

# 口诀：**loc 问“叫什么”，iloc 问“排第几”**。
# 标签是日期/字符串/乱序数字时，两者结果完全不同。""", ["example"]),

    ("md", """\
**要点**：排序或筛选之后，**标签和位置会脱钩**——
筛选后的表再取“第 1 行”必须用 iloc，用 loc[1] 可能 KeyError 或取错行。""", []),

    ("md", """## 2. 布尔筛选与 query：找到目标行

**概念**：`df[布尔条件]` 返回满足条件的所有行；
多条件用 `&`、`|`（每个条件加括号）。
`df.query("amount > 100")` 用字符串写条件，更接近自然语言。""", []),

    ("md", "### 例 1｜最小例子：单条件与多条件", []),

    ("code", """\
import pandas as pd

df = pd.DataFrame({
    "category": ["餐饮", "交通", "数码", "娱乐"],
    "amount": [25.5, 4.0, 399.0, 45.0],
})

print(df[df["amount"] > 40])
print(df[(df["amount"] > 20) & (df["category"] == "餐饮")])
print(df.query("amount > 20 and category == '餐饮'"))   # 同上，可读性更好""", ["example"]),

    ("md", "### 例 2｜业务例子：三维组合筛选", []),

    ("code", """\
import pandas as pd

ledger = pd.DataFrame({
    "date": pd.to_datetime(["2026-08-01", "2026-08-03", "2026-08-05",
                            "2026-08-07", "2026-08-09"]),
    "category": ["餐饮", "交通", "数码", "娱乐", "餐饮"],
    "amount": [25.5, 4.0, 399.0, 45.0, 132.0],
})

recent = ledger[ledger["date"] >= "2026-08-03"]
big = recent[recent["amount"] > 100]
print(big)     # 最近一周且大额：只有数码 399

# isin：属于集合中的任一类别
food_transport = ledger[ledger["category"].isin(["餐饮", "交通"])]
print(len(food_transport), "笔餐饮+交通")""", ["example"]),

    ("md", "### 例 3｜常见错误：and/or 报错与链式筛选失效", []),

    ("code", """\
import pandas as pd

df = pd.DataFrame({"amount": [25.5, 399.0], "paid": [True, False]})

# 反例 1：Python 的 and/or 不能连接 Series 条件
# df[(df["amount"] > 10) and (df["paid"])]   # ValueError

# 反例 2：链式赋值可能“改了个寂寞”（ SettingWithCopyWarning ）
sub = df[df["amount"] > 10]
sub["amount"] = 0.0        # 可能只是改了副本！
print(df)                  # 原表未必变

# 修复：一次性定位后用 loc 赋值
df.loc[df["amount"] > 10, "amount"] = 0.0
print(df)""", ["example"]),

    ("md", """\
**要点**：**筛选后要修改，用 `df.loc[条件, 列] = 值` 一步到位**，
不要 `df[条件][列] = 值` 链式写法。""", []),

    ("md", """## 3. 排序：sort_values 与 Top-N

**概念**：`sort_values("列")` 升序排，`ascending=False` 降序；
多键排序传列表：`by=["a", "b"]`；
只要前几名用 `nlargest(n, "列")` / `nsmallest`——
比“全表排序再切片”更快更直观。""", []),

    ("md", "### 例 1｜业务例子：找出花钱最凶的三天", []),

    ("code", """\
import pandas as pd

ledger = pd.DataFrame({
    "date": ["08-01", "08-03", "08-05", "08-07", "08-09"],
    "category": ["餐饮", "交通", "数码", "娱乐", "餐饮"],
    "amount": [25.5, 4.0, 399.0, 45.0, 132.0],
})

print(ledger.sort_values("amount", ascending=False).head(2))
print(ledger.nlargest(3, "amount"))     # Top3，等价且更快
print(ledger.sort_values(["category", "amount"],
                         ascending=[True, False]))   # 类别内按金额降序""", ["example"]),

    ("md", "### 例 2｜常见错误：排序后索引乱了套", []),

    ("code", """\
import pandas as pd

df = pd.DataFrame({"amount": [25.5, 399.0, 45.0]})

ordered = df.sort_values("amount", ascending=False)
print(ordered)
print(ordered.loc[2, "amount"])    # 45.0：loc 按旧标签 2 找（399 那行才是标签 1）
print(ordered.iloc[2, 0])          # 25.5：iloc 才是“排序后的第 3 行”

# 修复：需要干净索引时 reset_index
print(ordered.reset_index(drop=True))    # 丢弃旧标签重建 0..n""", ["example"]),

    ("md", """\
**要点**：**排序只动顺序不动标签**。排序后如果继续 loc/iloc 混用，
必出“张冠李戴”bug；要么 `reset_index(drop=True)`，要么统一用 iloc。""", []),

    ("md", """## 综合练习""", []),

    ("md", "### 练一练 20.1：loc 与 iloc", ["exercise"]),

    ("code", """\
import pandas as pd

df = pd.DataFrame({
    "summary": ["咖啡", "地铁", "耳机", "电影"],
    "amount": [18.0, 4.0, 399.0, 45.0],
}, index=["08-01", "08-02", "08-03", "08-04"])

# TODO 1：用 loc 取标签 "08-03" 的整行
# TODO 2：用 iloc 取第 2 行（应为“地铁”）
# TODO 3：用 loc 取 08-02 到 08-04 的 amount 列（含尾）""", ["exercise"]),

    ("md", "### 练一练 20.2：组合筛选", ["exercise"]),

    ("code", """\
import pandas as pd

df = pd.DataFrame({
    "category": ["餐饮", "交通", "数码", "娱乐", "餐饮", "数码"],
    "amount": [25.5, 4.0, 399.0, 45.0, 132.0, 89.0],
    "paid_by": ["微信", "支付宝", "微信", "现金", "微信", "支付宝"],
})

# TODO 1：筛选餐饮类且金额 > 100 的账目
# TODO 2：用 query 改写 TODO 1
# TODO 3：用 isin 筛选微信或现金支付的账目""", ["exercise"]),

    ("md", "### 练一练 20.3：Top-N 与索引陷阱", ["exercise"]),

    ("code", """\
# 沿用练一练 20.2 的表
# TODO 1：找出金额最大的 2 笔（nlargest）
# TODO 2：按 paid_by 升序、amount 降序排序，打印
# TODO 3：把排序结果 reset_index(drop=True) 后，
#         分别用 loc[0] 和 iloc[0] 取第一行，解释差异""", ["exercise"]),

    ("md", """## 易错点清单

- `loc` 按标签、`iloc` 按位置；loc 切片含尾、iloc 不含尾；
- 筛选/排序后标签与位置脱钩，取“第几行”用 iloc；
- 多条件用 `&`/`|` 加括号，`and/or` 直接 ValueError；
- 修改筛选结果用 `df.loc[条件, 列] = 值`，链式赋值会触发警告且可能失效;
- `sort_values` 不改标签，接续操作前考虑 `reset_index(drop=True)`。""", []),

    ("md", """## 本章小结

- loc/iloc 分管“叫什么”与“排第几”，布尔筛选分管“要哪些”。
- query、isin、nlargest 让常用筛选更简洁。
- 索引陷阱是本章灵魂：**任何筛选排序之后，先想清楚手里是标签还是位置**。
- 下一章：增删改列与类型转换，让表“长成分析要的样子”。""", []),

    ("md", """## 参考答案""", []),

    ("code", """\
# 练一练 20.1 参考答案
import pandas as pd

df = pd.DataFrame({
    "summary": ["咖啡", "地铁", "耳机", "电影"],
    "amount": [18.0, 4.0, 399.0, 45.0],
}, index=["08-01", "08-02", "08-03", "08-04"])

print(df.loc["08-03"])
print(df.iloc[1])
print(df.loc["08-02":"08-04", "amount"])""", ["solution"]),

    ("code", """\
# 练一练 20.2 参考答案
import pandas as pd

df = pd.DataFrame({
    "category": ["餐饮", "交通", "数码", "娱乐", "餐饮", "数码"],
    "amount": [25.5, 4.0, 399.0, 45.0, 132.0, 89.0],
    "paid_by": ["微信", "支付宝", "微信", "现金", "微信", "支付宝"],
})

print(df[(df["category"] == "餐饮") & (df["amount"] > 100)])
print(df.query("category == '餐饮' and amount > 100"))
print(df[df["paid_by"].isin(["微信", "现金"])])""", ["solution"]),

    ("code", """\
# 练一练 20.3 参考答案
import pandas as pd

df = pd.DataFrame({
    "category": ["餐饮", "交通", "数码", "娱乐", "餐饮", "数码"],
    "amount": [25.5, 4.0, 399.0, 45.0, 132.0, 89.0],
    "paid_by": ["微信", "支付宝", "微信", "现金", "微信", "支付宝"],
})

print(df.nlargest(2, "amount"))
ordered = df.sort_values(["paid_by", "amount"],
                         ascending=[True, False])
print(ordered)
clean = ordered.reset_index(drop=True)
print("loc[0] 取标签 0 所在行:", clean.loc[0, "amount"])
print("iloc[0] 取新的第 1 行:", clean.iloc[0]["amount"])""", ["solution"]),
]
