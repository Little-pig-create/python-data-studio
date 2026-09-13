"""course-chapter-23 文本、日期与特征处理"""

TITLE = "文本、日期与特征处理"
EST_MINUTES = 55

CELLS = [
    ("md", """\
# 第27章 文本、日期与特征处理

账单里的原始字段往往是“午餐-黄焖鸡”和“2026/8/1”这种半成品。
Pandas 提供 `.str`（文本处理）与 `.dt`（日期处理）两个访问器，
把半成品加工成**可分析的特征**——类别、星期、小时、是否周末。

这是从“有数据”到“能分析”的临门一脚。""", []),

    ("md", """## 学习目标

学完本章，你能够：

- 用 `.str` 的 strip / replace / split / contains / slice 清洗与拆分文本列；
- 用 `pd.to_datetime` 把文本列变日期，再用 `.dt` 提取月、日、星期、小时；
- 构造 3 个常用特征：是否周末、时段标签、消费级别；
- 避开三大坑：对非字符串列用 .str、忘了日期先转换、特征方向搞反。""", []),

    ("md", """## 1. .str 访问器：列级别的字符串方法

**概念**：`df["列"].str.xxx()` 把第 3 章学的字符串方法应用到**整列**，
对每个元素自动执行。**前提：该列必须是字符串类型**（`str` 前缀的报错
多半是列里混了数字或 nan）。""", []),

    ("md", "### 例 1｜最小例子：strip / split / contains", []),

    ("code", """\
import pandas as pd

s = pd.Series(["  午餐-黄焖鸡 ", "打车-机场 ", "咖啡-拿铁"])

print(s.str.strip().str.split("-").str[0])   # 去空格 -> 按 - 拆 -> 取前段
print(s.str.strip().str.contains("咖啡"))     # 是否含“咖啡”
print(s.str.len())                            # 每个元素的长度""", ["example"]),

    ("md", "### 例 2｜业务例子：从摘要拆出类别标签", []),

    ("code", """\
import pandas as pd

ledger = pd.DataFrame({
    "raw": ["午餐-黄焖鸡", "打车-机场快线", "咖啡-拿铁", "电影-晚场"],
})

ledger["main"] = ledger["raw"].str.split("-").str[0]     # 主类
ledger["detail"] = ledger["raw"].str.split("-").str[1]   # 明细
ledger["is_food"] = ledger["main"].eq("午餐") | ledger["raw"].str.contains("咖啡")
print(ledger)""", ["example"]),

    ("md", "### 例 3｜常见错误：数字列用 .str 直接 AttributeError", []),

    ("code", """\
import pandas as pd

df = pd.DataFrame({"amount": [25.5, 4.0]})

# 反例：amount 是 float，没有 .str
# df["amount"].str.replace("5", "0")   # AttributeError: Can only use
#                                      # .str accessor with string values!

# 修复：先转字符串
print(df["amount"].astype(str).str.replace(".", "", regex=False))
# 注意：分析时保持数值类型，只在“展示/导出”时才转 str""", ["example"]),

    ("md", """\
**要点**：`.str` 只对字符串列有效；数值列先 `astype(str)`——
但**分析列保持数值**，转字符串只用于展示或拼接。""", []),

    ("md", """## 2. 日期：pd.to_datetime 与 .dt 访问器

**概念**：`pd.to_datetime(列)` 把"2026/8/1"这类文本转成日期类型，
之后 `.dt.year/.month/.day/.dayofweek/.hour` 任取部件；
`dayofweek` 0=周一 6=周日，`>= 5` 即周末。
**日期必须先转换再提取**，文本状态下什么都做不了。""", []),

    ("md", "### 例 1｜最小例子：转换与取部件", []),

    ("code", """\
import pandas as pd

s = pd.Series(["2026-08-01", "2026-08-15", "2026-08-23"])
dates = pd.to_datetime(s)

print(dates.dt.day)         # 日
print(dates.dt.dayofweek)   # 0=周一 ... 6=周日
print(dates.dt.strftime("%m/%d"))   # 反向：日期 -> 自定义格式文本""", ["example"]),

    ("md", "### 例 2｜业务例子：账本加时间特征", []),

    ("code", """\
import pandas as pd

ledger = pd.DataFrame({
    "date": ["2026-08-01", "2026-08-02", "2026-08-08", "2026-08-09"],
    "amount": [25.5, 88.0, 132.0, 45.0],
})
ledger["date"] = pd.to_datetime(ledger["date"])

ledger["weekday"] = ledger["date"].dt.dayofweek          # 0-6
ledger["is_weekend"] = ledger["weekday"] >= 5
print(ledger)
print("周末支出合计:", ledger.loc[ledger["is_weekend"], "amount"].sum())""", ["example"]),

    ("md", "### 例 3｜常见错误：文本日期直接 .dt 报错", []),

    ("code", """\
import pandas as pd

df = pd.DataFrame({"date": ["2026/8/1", "2026/8/15"]})

# 反例：还没转换就用 .dt
# df["date"].dt.month    # AttributeError: Can only use .dt accessor
#                        # with datetimelike values!

# 反例 2：格式不标准时 to_datetime 解析失败（如“8月1日”）
# pd.to_datetime(["8月1日"])   # 会尝试解析，复杂格式要指定 format

# 修复：先转换
df["date"] = pd.to_datetime(df["date"])
print(df["date"].dt.month)""", ["example"]),

    ("md", """\
**要点**：**`.dt` 的前提是 datetime64 类型**；
读入任何日期列的第一反应就是 `pd.to_datetime`。""", []),

    ("md", """## 3. 特征构造：把业务规则变成新列

**概念**：特征 = 对分析有用的衍生列。三个高频模板：
分箱（`pd.cut` 把金额切成档位）、条件标签（`np.where`）、
分组聚合回填（`groupby + transform`，第 29 章展开）。
特征的方向要对：**回答什么问题，就造什么特征**。""", []),

    ("md", "### 例 1｜业务例子：消费档位分箱", []),

    ("code", """\
import pandas as pd

ledger = pd.DataFrame({"amount": [8.0, 25.5, 88.0, 399.0, 132.0]})

ledger["level"] = pd.cut(
    ledger["amount"],
    bins=[0, 20, 100, float("inf")],
    labels=["小额", "中额", "大额"],
)
print(ledger)
print(ledger["level"].value_counts())""", ["example"]),

    ("md", "### 例 2｜业务例子：时段 + 周末交叉标签", []),

    ("code", """\
import pandas as pd
import numpy as np

ledger = pd.DataFrame({
    "date": pd.to_datetime(["2026-08-01 12:30", "2026-08-02 21:05",
                            "2026-08-03 08:40"]),
    "amount": [25.5, 132.0, 18.0],
})
ledger["hour"] = ledger["date"].dt.hour
ledger["slot"] = pd.cut(ledger["hour"], bins=[0, 11, 14, 21, 24],
                        labels=["早", "午", "晚", "夜"],
                        right=False)
ledger["is_weekend"] = ledger["date"].dt.dayofweek >= 5
print(ledger)""", ["example"]),

    ("md", "### 例 3｜常见错误：分箱边界与 NaN", []),

    ("code", """\
import pandas as pd

s = pd.Series([0.0, 10.0, 20.0, 100.0])

# 反例：默认右闭（含右端），20 落进 (10, 20] 而不是你想要的
print(pd.cut(s, bins=[0, 20, 100], labels=["低", "高"]))
# 0.0 低于最低边界 -> NaN！

# 修复：明确边界语义——left/right 参数
print(pd.cut(s, bins=[-1, 20, 1000], labels=["低", "高"]))
# 造完特征先 value_counts(dropna=False) 检查有没有 NaN 桶""", ["example"]),

    ("md", """\
**要点**：`pd.cut` 默认**左开右闭**、低于最小边界的值为 NaN——
造完特征先 `value_counts(dropna=False)` 核对分布。""", []),

    ("md", """## 综合练习""", []),

    ("md", "### 练一练 23.1：文本拆列", ["exercise"]),

    ("code", """\
import pandas as pd

df = pd.DataFrame({
    "raw": ["咖啡-拿铁 18元", "打车-机场 88元", "电影-晚场 45元"],
})

# TODO 1：去掉首尾空格后，按 "-" 拆出 main 与 detail 两列
# TODO 2：从 detail 中提取金额数字列 amount（提示：.str.replace 去掉非数字
#         部分，或用 .str.extract(r"(\\d+\\.?\\d*)")）
# TODO 3：打印 amount 列的和""", ["exercise"]),

    ("md", "### 练一练 23.2：日期特征三连", ["exercise"]),

    ("code", """\
import pandas as pd

df = pd.DataFrame({
    "date": ["2026-08-01", "2026-08-03", "2026-08-08", "2026-08-09"],
    "amount": [25.5, 88.0, 132.0, 45.0],
})

# TODO 1：date 转 datetime
# TODO 2：新增 weekday 名称列（用 dt.day_name()）
# TODO 3：新增 is_weekend，并打印周末与工作日的支出合计对比""", ["exercise"]),

    ("md", "### 练一练 23.3：消费档位分箱", ["exercise"]),

    ("code", """\
import pandas as pd

df = pd.DataFrame({"amount": [8.0, 15.0, 25.5, 88.0, 399.0, 132.0]})

# TODO 1：pd.cut 分三档：<20 小额、20-100 中额、>100 大额
#         （注意左开右闭，别让 20 落错桶）
# TODO 2：value_counts(dropna=False) 验证没有 NaN 桶
# TODO 3：新增 bool 列 is_big = level == "大额"，打印筛选结果""", ["exercise"]),

    ("md", """## 易错点清单

- `.str` 只对字符串列有效，数值列先 `astype(str)`（仅限展示用）；
- `.dt` 只对 datetime64 列有效，文本日期先 `pd.to_datetime`；
- `dayofweek` 0=周一；周末是 `>= 5`；
- `pd.cut` 左开右闭、越界成 NaN，造完特征查 `value_counts(dropna=False)`；
- 特征服务于问题：先明确要回答什么，再造列。""", []),

    ("md", """## 本章小结

- `.str` 与 `.dt` 两个访问器 = 第 3 章字符串方法 + 日期部件的列级版本。
- 日期转换是一切时间分析的前置步骤，dayofweek/is_weekend 是最高频特征。
- pd.cut 分箱把连续金额变成业务档位。
- 下一章：数据的进出口——read_csv 与 to_csv。""", []),

    ("md", """## 参考答案""", []),

    ("code", """\
# 练一练 23.1 参考答案
import pandas as pd

df = pd.DataFrame({
    "raw": ["咖啡-拿铁 18元", "打车-机场 88元", "电影-晚场 45元"],
})
parts = df["raw"].str.strip().str.split("-")
df["main"] = parts.str[0]
rest = parts.str[1].str.split(" ")
df["detail"] = rest.str[0]
df["amount"] = pd.to_numeric(rest.str[1].str.replace("元", "", regex=False))
print(df, df["amount"].sum())""", ["solution"]),

    ("code", """\
# 练一练 23.2 参考答案
import pandas as pd

df = pd.DataFrame({
    "date": ["2026-08-01", "2026-08-03", "2026-08-08", "2026-08-09"],
    "amount": [25.5, 88.0, 132.0, 45.0],
})
df["date"] = pd.to_datetime(df["date"])
df["weekday_name"] = df["date"].dt.day_name()
df["is_weekend"] = df["date"].dt.dayofweek >= 5
print(df.groupby("is_weekend")["amount"].sum())""", ["solution"]),

    ("code", """\
# 练一练 23.3 参考答案
import pandas as pd

df = pd.DataFrame({"amount": [8.0, 15.0, 25.5, 88.0, 399.0, 132.0]})
df["level"] = pd.cut(df["amount"], bins=[-1, 20, 100, 10**9],
                     labels=["小额", "中额", "大额"])
print(df["level"].value_counts(dropna=False))
df["is_big"] = df["level"] == "大额"
print(df[df["is_big"]])""", ["solution"]),
]
