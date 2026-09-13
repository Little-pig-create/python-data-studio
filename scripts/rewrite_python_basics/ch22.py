"""course-chapter-22 数据质量检查与清洗"""

TITLE = "数据质量检查与清洗"
EST_MINUTES = 55

CELLS = [
    ("md", """\
# 第26章 数据质量检查与清洗

真实数据三大脏：**缺**（空值）、**重**（重复行）、**怪**（异常值）。
清洗不是“见脏就删”——每一步都要先**量化问题**，再决定策略，并留下记录。

本章主线：**把一份 20 笔的原始账单洗成可分析的干净表**。""", []),

    ("md", """## 学习目标

学完本章，你能够：

- 用 `isna().sum()`、`duplicated().sum()`、`describe` 量化三类质量问题；
- 按业务语义选择 `dropna` / `fillna`（均值、中位数、ffill）；
- 用 `drop_duplicates` 及子集参数去重，区分“完全重复”与“键重复”；
- 避开三大坑：盲目删行、均值填补偏态数据、清洗结果没接住。""", []),

    ("md", """## 1. 质量体检：先量化，再动手

**概念**：清洗前先产出“体检报告”——缺多少、重多少、数值范围怪不怪。
**没量化的清洗等于闭眼删数据**。""", []),

    ("md", "### 例 1｜最小例子：三分钟体检", []),

    ("code", """\
import pandas as pd

df = pd.DataFrame({
    "summary": ["咖啡", "地铁", None, "咖啡", "电影"],
    "amount": [18.0, 4.0, None, 18.0, 450.0],
})

print(df.isna().sum())            # 每列缺失数
print("完全重复行:", df.duplicated().sum())
print(df["amount"].describe().round(1))   # 450 是否异常？看分位""", ["example"]),

    ("md", "### 例 2｜业务例子：20 笔原始账单体检", []),

    ("code", """\
import pandas as pd
import numpy as np

rng = np.random.default_rng(7)
raw = pd.DataFrame({
    "summary": ["午餐", "地铁", "咖啡", None, "午餐", "电影", "咖啡",
                "地铁", "外卖", "购物", "午餐", "咖啡", "地铁", "外卖",
                None, "电影", "购物", "午餐", "咖啡", "地铁"],
    "category": ["餐饮", "交通", "餐饮", "餐饮", "餐饮", "娱乐", "餐饮",
                 "交通", "餐饮", "购物", "餐饮", "餐饮", "交通", "餐饮",
                 "娱乐", "娱乐", "购物", "餐饮", "餐饮", "交通"],
    "amount": rng.normal(40, 25, 20).round(1).clip(0),
})
raw.loc[3, "amount"] = np.nan
raw.loc[3, "summary"] = None
raw.loc[17, "amount"] = 888.0        # 埋一笔异常大额

report = pd.DataFrame({
    "缺失数": raw.isna().sum(),
    "缺失率": (raw.isna().mean() * 100).round(0),
})
print(report)
print("重复行数:", raw.duplicated().sum())
print(raw["amount"].describe().round(1))""", ["example"]),

    ("md", "### 例 3｜常见错误：体检只看均值", []),

    ("code", """\
import pandas as pd

s = pd.Series([20.0, 25.0, 22.0, 24.0, 500.0])

print(s.mean())          # 118.2：均值被一笔 500 抬走
print(s.median())        # 24.0：更真实的“典型水平”
# 体检口诀：describe 之外，必看 median 与最大最小值的倍数关系""", ["example"]),

    ("md", """\
**要点**：**均值与中位数差距大 = 有离群值**；
数值列的体检必须包含 `describe()` 的 min/max 行。""", []),

    ("md", """## 2. 缺失值：dropna 与 fillna 的选择

**概念**：两种策略——
`dropna()` 删含缺失的行（适合缺失少且无分析价值）；
`fillna(值)` 填补（数值列常用中位数，类别列常用“未知”或众数，
时间序列可用 `ffill` 前向填充）。**选择依据是业务语义**。""", []),

    ("md", "### 例 1｜最小例子：删与填", []),

    ("code", """\
import pandas as pd

df = pd.DataFrame({"a": [1.0, None, 3.0], "b": ["x", None, "z"]})

print(df.dropna())                     # 丢掉任何含 nan 的行
print(df["a"].fillna(df["a"].median()))  # 数值列填中位数
print(df["b"].fillna("未知"))            # 类别列填占位""", ["example"]),

    ("md", "### 例 2｜业务例子：分类处理两类缺失", []),

    ("code", """\
import pandas as pd
import numpy as np

ledger = pd.DataFrame({
    "summary": ["午餐", None, "咖啡", "地铁", "电影"],
    "amount": [25.5, np.nan, 18.0, 4.0, 45.0],
})

# summary 缺失 -> 无法分类，删除该行（amount 也缺了，没有补救价值）
clean = ledger.dropna(subset=["summary"])
print(f"删后剩 {len(clean)} 行")

# 若只有 amount 缺失 -> 用该列中位数填补
ledger2 = pd.DataFrame({
    "summary": ["午餐", "咖啡", "地铁", "电影"],
    "amount": [25.5, np.nan, 4.0, 45.0],
})
ledger2["amount"] = ledger2["amount"].fillna(ledger2["amount"].median())
print(ledger2)""", ["example"]),

    ("md", "### 例 3｜常见错误：fillna 没写回 & 均值填补偏态数据", []),

    ("code", """\
import pandas as pd
import numpy as np

df = pd.DataFrame({"amount": [20.0, np.nan, 30.0, 1000.0]})

# 反例 1：fillna 返回新 Series，没接住
df["amount"].fillna(0)
print(df["amount"].isna().sum())     # 1：还是缺失！

# 修复：重新赋值
df["amount"] = df["amount"].fillna(df["amount"].median())
print(df["amount"].isna().sum())

# 反例 2：偏态数据用均值填补（均值被 1000 抬到 350）
# 正解：中位数或分组中位数
print(df["amount"])""", ["example"]),

    ("md", """\
**要点**：**fillna 是返回新列的方法，必须重新赋值**；
填补值优先级：分组中位数 > 整体中位数 > 均值（偏态时别用均值）。""", []),

    ("md", """## 3. 重复与异常：drop_duplicates 与分位截断

**概念**：
`df.duplicated()` 找重复行、`drop_duplicates()` 去重，
`subset=["列"]` 指定“哪些列相同算重复”；
异常值常用 **IQR 规则**（低于 Q1-1.5×IQR 或高于 Q3+1.5×IQR）识别，
处理方式按业务定：修正、保留（真实大额）或删除。""", []),

    ("md", "### 例 1｜业务例子：两种重复", []),

    ("code", """\
import pandas as pd

ledger = pd.DataFrame({
    "summary": ["咖啡", "咖啡", "咖啡", "地铁"],
    "amount": [18.0, 18.0, 25.0, 4.0],
})

print("完全重复:", ledger.duplicated().sum())          # 1 行：两行一模一样
print("键重复(summary相同):", ledger.duplicated(subset=["summary"]).sum())

# 业务规则：同一摘要+金额只记一次 -> 按键去重
clean = ledger.drop_duplicates(subset=["summary", "amount"])
print(clean)""", ["example"]),

    ("md", "### 例 2｜业务例子：IQR 找异常大额", []),

    ("code", """\
import pandas as pd

ledger = pd.DataFrame({"amount": [20.0, 25.5, 18.0, 32.0, 888.0, 22.0]})

q1, q3 = ledger["amount"].quantile([0.25, 0.75])
iqr = q3 - q1
upper = q3 + 1.5 * iqr
print(f"上限 {upper:.1f} 元")
outliers = ledger[ledger["amount"] > upper]
print(outliers)     # 888 元被标记

# 处理：先人工核对！可能是真实大额消费。
# 本例假设是录入错误（多打了两个 8），修正为 8.88
ledger.loc[ledger["amount"] > upper, "amount"] = 8.88
print(ledger["amount"].max())""", ["example"]),

    ("md", "### 例 3｜常见错误：清洗完直接用，没验证", []),

    ("code", """\
import pandas as pd

raw = pd.DataFrame({"amount": [20.0, None, 30.0, 20.0]})

clean = raw.dropna().drop_duplicates()
print(f"原始 {len(raw)} 行 -> 清洗后 {len(clean)} 行")
# 最后一问：剩下的行数还对得上业务吗？
# 若预期 3 笔有效账目、只剩 2 行，说明“删掉的 20.0 重复行”其实要保留。
# 口诀：清洗前后行数、总额两个数字必须记录并核对。""", ["example"]),

    ("md", """\
**要点**：**清洗 = 量化 -> 处理 -> 记录行数与口径变化。**
异常值删除前先问“这笔钱真的没花吗”，宁可标记（flag 列）不轻易删。""", []),

    ("md", """## 综合练习""", []),

    ("md", "### 练一练 22.1：体检报告", ["exercise"]),

    ("code", """\
import pandas as pd
import numpy as np

df = pd.DataFrame({
    "summary": ["咖啡", "地铁", None, "咖啡", "电影", "咖啡"],
    "amount": [18.0, 4.0, np.nan, 18.0, 45.0, 900.0],
})

# TODO 1：打印每列缺失数
# TODO 2：打印完全重复行数与 summary 键重复行数
# TODO 3：打印 amount 的中位数与最大值，判断有无离群嫌疑""", ["exercise"]),

    ("md", "### 练一练 22.2：分类清洗", ["exercise"]),

    ("code", """\
# 沿用练一练 22.1 的表
# TODO 1：summary 缺失的行删除（没有补救价值）
# TODO 2：amount 缺失的行用中位数填补
# TODO 3：打印清洗前后行数变化""", ["exercise"]),

    ("md", "### 练一练 22.3：异常值处理", ["exercise"]),

    ("code", """\
import pandas as pd

df = pd.DataFrame({"amount": [20.0, 25.5, 18.0, 32.0, 900.0, 22.0, 19.0]})

# TODO 1：用 IQR 规则计算上下限
# TODO 2：不打删除，新增列 is_outlier 标记异常行（True/False）
# TODO 3：打印“剔除离群值后的均值”与“原均值”，对比差异""", ["exercise"]),

    ("md", """## 易错点清单

- 清洗前必须量化：isna().sum()、duplicated().sum()、describe 一个不能少；
- dropna 慎用——先想该行还有没有分析价值；
- fillna 返回新对象必须重新赋值；偏态数据用中位数填补；
- drop_duplicates 分清“完全重复”与“键重复”，业务规则决定用哪个；
- 异常值先标记后人工核对，直接删可能丢真实大额；
- 清洗后记录“行数、总额”两个数字的变化。""", []),

    ("md", """## 本章小结

- 清洗三步曲：量化问题 -> 按语义处理 -> 记录影响。
- 缺失按“能否补救”分流：删行 vs 填中位数/未知。
- 重复分两类，异常值用 IQR 识别、按业务处置。
- 下一章：文本与日期——把“25.5元”和“2026-08-01”变成可计算的特征。""", []),

    ("md", """## 参考答案""", []),

    ("code", """\
# 练一练 22.1 参考答案
import pandas as pd
import numpy as np

df = pd.DataFrame({
    "summary": ["咖啡", "地铁", None, "咖啡", "电影", "咖啡"],
    "amount": [18.0, 4.0, np.nan, 18.0, 45.0, 900.0],
})
print(df.isna().sum())
print("完全重复:", df.duplicated().sum(),
      "键重复:", df.duplicated(subset=["summary"]).sum())
print(df["amount"].median(), df["amount"].max())   # 900 vs 31.5：离群嫌疑""", ["solution"]),

    ("code", """\
# 练一练 22.2 参考答案
import pandas as pd
import numpy as np

df = pd.DataFrame({
    "summary": ["咖啡", "地铁", None, "咖啡", "电影", "咖啡"],
    "amount": [18.0, 4.0, np.nan, 18.0, 45.0, 900.0],
})

before = len(df)
df = df.dropna(subset=["summary"])
df["amount"] = df["amount"].fillna(df["amount"].median())
print(f"{before} -> {len(df)} 行，剩余缺失 {df.isna().sum().sum()}")""", ["solution"]),

    ("code", """\
# 练一练 22.3 参考答案
import pandas as pd

df = pd.DataFrame({"amount": [20.0, 25.5, 18.0, 32.0, 900.0, 22.0, 19.0]})

q1, q3 = df["amount"].quantile([0.25, 0.75])
iqr = q3 - q1
df["is_outlier"] = (df["amount"] > q3 + 1.5 * iqr) | (
    df["amount"] < q1 - 1.5 * iqr)
print(df["is_outlier"].value_counts())
print(f"剔除后均值 {df.loc[~df['is_outlier'], 'amount'].mean():.1f}"
      f" vs 原均值 {df['amount'].mean():.1f}")""", ["solution"]),
]
