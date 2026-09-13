"""course-chapter-27 窗口计算与探索性分析"""

TITLE = "窗口计算与探索性分析"
EST_MINUTES = 55

CELLS = [
    ("md", """\
# 第31章 窗口计算与探索性分析

“日均的**趋势**如何？”“这周比上周**变化**多少？”——
回答这类问题需要**窗口计算**：滚动均值（rolling）、环比变化（pct_change）、
滞后对比（shift）。它们是时间序列分析的入门砖，也是
“未来数据泄漏”事故的高发地。

本章收尾 Pandas 模块：窗口三板斧 + 一次完整的探索性分析（EDA）。""", []),

    ("md", """## 学习目标

学完本章，你能够：

- 用 `rolling(window).mean()` 平滑趋势，理解窗口与 NaN 的关系；
- 用 `shift` 与 `pct_change` 计算环比、同比口径的相对变化；
- 说清“用未来数据算现在”为什么是泄漏，并用 `shift` 规避；
- 完成一次从 describe 到分组的迷你 EDA。""", []),

    ("md", """## 1. rolling：让波动变趋势

**概念**：`s.rolling(window=7).mean()` 计算“最近 7 天”的滚动均值——
每往后一天，窗口就滑动一格。**前 window-1 个位置因数据不足是 NaN**
（这不是错误，是窗口还没“攒满”）。""", []),

    ("md", "### 例 1｜最小例子：滚动窗口的形状", []),

    ("code", """\
import pandas as pd

s = pd.Series([10.0, 20.0, 30.0, 40.0])

print(s.rolling(2).mean())
print(s.rolling(3, min_periods=1).mean())   # 不足 3 个也按已有数据算""", ["example"]),

    ("md", "### 例 2｜业务例子：两周支出的 3 日平滑线", []),

    ("code", """\
import pandas as pd

daily = pd.Series(
    [20.0, 35.5, 0.0, 88.0, 12.0, 45.0, 66.5,
     18.0, 22.0, 30.0, 5.5, 27.0, 80.0, 40.0],
    index=pd.date_range("2026-08-01", periods=14))

smooth = daily.rolling(3).mean()
report = pd.DataFrame({"当日": daily, "3日均值": smooth.round(1)})
print(report)""", ["example"]),

    ("md", "### 例 3｜常见错误：把窗口开头的 NaN 当 bug 修", []),

    ("code", """\
import pandas as pd

s = pd.Series([10.0, 20.0, 30.0])

r = s.rolling(3).mean()
print(r.isna().sum())     # 2 个 NaN：窗口没攒满，正常！
# 反例：dropna 直接扔掉开头的 2 天——如果它们是关键期就丢了信息
# 修复：按分析目的选择——趋势图保留 NaN（不画点），报表用 min_periods""", ["example"]),

    ("md", """\
**要点**：**rolling 的 NaN 是“信息”不是“错误”**：
它告诉你窗口还没满。参数 `min_periods` 控制最少多少个有效值才计算。""", []),

    ("md", """## 2. shift 与 pct_change：和“上一期”比

**概念**：`s.shift(1)` 把序列整体下移一格——`当前行 - shift(1)` 就是环比差；
`s.pct_change()` 直接给出环比变化率。
**shift(负数) 是拿未来数据**，预测场景里这是泄漏重灾区。""", []),

    ("md", "### 例 1｜业务例子：日环比", []),

    ("code", """\
import pandas as pd

daily = pd.Series([20.0, 35.5, 30.0, 88.0, 12.0])

report = pd.DataFrame({
    "当日": daily,
    "昨日": daily.shift(1),
    "环比": daily.pct_change().round(3),
})
print(report)""", ["example"]),

    ("md", "### 例 2｜业务例子：周环比汇总", []),

    ("code", """\
import pandas as pd

daily = pd.Series(
    [20.0, 35.5, 0.0, 88.0, 12.0, 45.0, 66.5,
     18.0, 22.0, 30.0, 5.5, 27.0, 80.0, 40.0])
weekly = daily.groupby(daily.index // 7).sum()
weekly.index = ["第1周", "第2周"]

report = pd.DataFrame({
    "周支出": weekly,
    "周环比": weekly.pct_change().round(3),
})
print(report)""", ["example"]),

    ("md", "### 例 3｜常见错误：shift(-1) 偷看未来", []),

    ("code", """\
import pandas as pd

df = pd.DataFrame({
    "day": [1, 2, 3, 4],
    "amount": [20.0, 35.0, 30.0, 88.0],
})

# 反例：用 shift(-1) 把“明天的支出”当作今天的特征
df["tomorrow"] = df["amount"].shift(-1)
print(df)      # 第 4 行的 tomorrow 是 nan（没有明天），前 3 行在“作弊”！

# 说明：预测类分析中，特征只能来自 shift(正数)（过去）；
# shift(-1) 只能用作**预测目标 y**，绝不能混进特征 X。""", ["example"]),

    ("md", """\
**要点**：**shift 正数看过去、负数看未来。**
建模时“未来”只能当预测目标，混进特征就是目标泄漏——
第 87 章机器学习工作流会反复强调这一点。""", []),

    ("md", """## 3. 迷你 EDA：五步看懂一张表

**概念**：探索性分析（EDA）的目的不是“画很多图”，
而是**用最少的步骤建立对数据的直觉**。模板五步：

1. `head/tail` 看长相；2. `info` 看类型缺失；3. `describe` 看分布；
4. `value_counts` 看类别构成；5. 按时间/类别分组看主趋势。""", []),

    ("md", "### 例 1｜业务例子：两周账本 EDA", []),

    ("code", """\
import pandas as pd

daily = pd.Series(
    [20.0, 35.5, 0.0, 88.0, 12.0, 45.0, 66.5,
     18.0, 22.0, 30.0, 5.5, 27.0, 80.0, 40.0],
    index=pd.date_range("2026-08-01", periods=14, freq="D"))

print(daily.describe().round(1))                    # 分布
print("超均值天数:", (daily > daily.mean()).sum())   # 直觉校验
print("最好的一天:", daily.idxmax().date(), daily.max(), "元")
print("最差的一天:", daily.idxmin().date(), daily.min(), "元")

weekly = daily.groupby(daily.index.isocalendar().week).sum()
print(weekly)                                        # 主趋势""", ["example"]),

    ("md", "### 例 2｜常见错误：EDA 只看 describe", []),

    ("code", """\
import pandas as pd

s = pd.Series([5.0, 5.0, 5.0, 5.0, 100.0])

print(s.describe().round(1))   # 数字层面一切正常？
print(s.value_counts())        # 一看分布：4/5 的日子都是 5 元！
# describe 不看“数据的形状”（众数、离散、双峰）——
# value_counts / 分箱直方是它的必要补充。""", ["example"]),

    ("md", """## 综合练习""", []),

    ("md", "### 练一练 27.1：平滑与窗口", ["exercise"]),

    ("code", """\
import pandas as pd

daily = pd.Series([20.0, 35.5, 0.0, 88.0, 12.0, 45.0, 66.5],
                  index=pd.date_range("2026-08-01", periods=7))

# TODO 1：计算 3 日滚动均值（含开头的 NaN）
# TODO 2：用 min_periods=1 重算，观察开头变化
# TODO 3：打印滚动均值最大的那一天（趋势最高点）""", ["exercise"]),

    ("md", "### 练一练 27.2：环比报表", ["exercise"]),

    ("code", """\
import pandas as pd

weekly = pd.Series({"第1周": 267.5, "第2周": 222.5, "第3周": 259.5})

# TODO 1：新增环比变化率列（pct_change，保留 3 位）
# TODO 2：用 shift 计算逐周增减额（本周 - 上周）
# TODO 3：打印环比绝对值最大的一周""", ["exercise"]),

    ("md", "### 练一练 27.3：泄漏自查", ["exercise"]),

    ("code", """\
import pandas as pd

df = pd.DataFrame({
    "day": [1, 2, 3, 4, 5],
    "amount": [20.0, 35.0, 30.0, 88.0, 45.0],
})

# TODO 1：造特征 prev_amount = 前一天的支出（shift(1)）——合法
# TODO 2：解释为什么 shift(-1) 的 amount 列（next_amount）
#         只能当预测目标，不能进特征
# TODO 3：构造 next_amount 列作为目标 y，打印前 4 行的 (prev_amount, y)""", ["exercise"]),

    ("md", """## 易错点清单

- rolling 开头 window-1 个 NaN 是设计使然，用 min_periods 调节；
- pct_change 首行必为 NaN，报表要先说明口径；
- shift 正数看过去、负数看未来：未来数据只能当预测目标；
- EDA 五步缺一不可：describe 之外必看 value_counts/分布形状；
- 时间序列报表先确认索引有序（sort_index）再算窗口。""", []),

    ("md", """## 本章小结

- rolling 看趋势、shift/pct_change 看变化，窗口计算把“序列”变成“洞察”。
- 未来数据泄漏从 shift(-1) 的滥用开始——从现在起养成自查习惯。
- EDA 五步模板：长相、类型、分布、构成、主趋势。
- Pandas 模块至此收官，下一站：Matplotlib——让数据开口说话。""", []),

    ("md", """## 参考答案""", []),

    ("code", """\
# 练一练 27.1 参考答案
import pandas as pd

daily = pd.Series([20.0, 35.5, 0.0, 88.0, 12.0, 45.0, 66.5],
                  index=pd.date_range("2026-08-01", periods=7))
print(daily.rolling(3).mean().round(1))
smooth = daily.rolling(3, min_periods=1).mean().round(1)
print(smooth)
print("趋势最高点:", smooth.idxmax().date())""", ["solution"]),

    ("code", """\
# 练一练 27.2 参考答案
import pandas as pd

weekly = pd.Series({"第1周": 267.5, "第2周": 222.5, "第3周": 259.5})
report = pd.DataFrame({
    "周支出": weekly,
    "环比": weekly.pct_change().round(3),
    "增减": weekly - weekly.shift(1),
})
print(report)
print("变化最大:", report["环比"].abs().idxmax())""", ["solution"]),

    ("code", """\
# 练一练 27.3 参考答案
import pandas as pd

df = pd.DataFrame({
    "day": [1, 2, 3, 4, 5],
    "amount": [20.0, 35.0, 30.0, 88.0, 45.0],
})
df["prev_amount"] = df["amount"].shift(1)     # 过去 -> 合法特征
df["next_amount"] = df["amount"].shift(-1)    # 未来 -> 只能当目标 y
# 说明：next_amount 是“明天的实际支出”。若把它放进特征 X，
# 模型等于“抄答案”；预测第 5 天时它也不存在（NaN）。
print(df[["day", "prev_amount", "next_amount"]].head(4))""", ["solution"]),
]
