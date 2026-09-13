"""course-chapter-common-modules 常见 Python 模块"""

TITLE = "常见 Python 模块"
EST_MINUTES = 45

CELLS = [
    ("md", """\
# 第14章 常见 Python 模块

标准库是 Python 自带的“工具房”：处理日期用 `datetime`、
数数用 `collections.Counter`、取组合用 `itertools`、
精确计算用 `decimal`。

本章带你认识最常用的 5 个模块——不追求记全，
而是知道**遇到什么问题去哪个房间找工具**。""", []),

    ("md", """## 学习目标

学完本章，你能够：

- 用 `datetime` 解析日期字符串、做日期加减、算两个日期差；
- 用 `collections.Counter` 一行完成计数统计，用 `defaultdict` 免去键判断；
- 用 `math` 与 `decimal` 处理数学运算与金额精度；
- 建立查询习惯：查官方文档而不是背 API。""", []),

    ("md", """## 1. datetime：日期与时间的标准答案

**概念**：`datetime.date` 只含日期、`datetime.datetime` 含时间；
`strptime` 把字符串解析成日期对象，`strftime` 反向格式化；
日期对象可直接加减 `timedelta`，两个日期相减得到天数差。""", []),

    ("md", "### 例 1｜最小例子：解析、格式化、加减", []),

    ("code", """\
from datetime import date, datetime, timedelta

d = datetime.strptime("2026-08-01", "%Y-%m-%d")   # 文本 -> 日期
print(d.strftime("%Y/%m/%d"))                     # 日期 -> 自定义文本

later = d + timedelta(days=30)
print(later.date())          # 一个月后
print((later - d).days)      # 30：相差天数""", ["example"]),

    ("md", "### 例 2｜业务例子：账单周期计算", []),

    ("code", """\
from datetime import date, timedelta

start = date(2026, 8, 1)
end = date(2026, 8, 31)

# 每周一记账提醒：找到区间内的所有周一
mondays = []
d = start
while d <= end:
    if d.weekday() == 0:          # 0 = 周一
        mondays.append(d)
    d += timedelta(days=1)
print([str(m) for m in mondays])

print(f"账期 {start} 至 {end} 共 {(end - start).days + 1} 天")""", ["example"]),

    ("md", "### 例 3｜常见错误：格式码与字符串对不上", []),

    ("code", """\
from datetime import datetime

# 反例：格式码与实际字符串不匹配
# datetime.strptime("2026/08/01", "%Y-%m-%d")   # ValueError: time data ...
# 修复：格式码逐字符对应
print(datetime.strptime("2026/08/01", "%Y/%m/%d"))

# 常用格式码：%Y 年 %m 月 %d 日 %H 时 %M 分 %S 秒
# 反例 2：%M（分钟）写成 %m（月），时间全错——排错时先查大小写""", ["example"]),

    ("md", """\
**要点**：`strptime` 的格式码必须与字符串**逐字符对应**；
`%m` 月 / `%M` 分的大小写最易混。""", []),

    ("md", """## 2. collections：Counter 与 defaultdict

**概念**：
`Counter(列表)` 一行完成计数统计，`most_common(n)` 直接拿 Top-N；
`defaultdict(默认工厂)` 访问不存在的键时自动创建默认值——
第 6 章手写的 `totals.get(k, 0) + v` 聚合模板，用 defaultdict 更简洁。""", []),

    ("md", "### 例 1｜最小例子：计数与 Top-N", []),

    ("code", """\
from collections import Counter

categories = ["餐饮", "交通", "餐饮", "娱乐", "餐饮", "交通"]

c = Counter(categories)
print(c)                      # Counter({'餐饮': 3, '交通': 2, '娱乐': 1})
print(c.most_common(2))       # [('餐饮', 3), ('交通', 2)]
print(c["没有的类别"])         # 0：不存在的键返回 0，不报错""", ["example"]),

    ("md", "### 例 2｜业务例子：聚合账目金额", []),

    ("code", """\
from collections import defaultdict

records = [("餐饮", 25.5), ("交通", 4.0), ("餐饮", 32.0), ("娱乐", 45.0)]

totals = defaultdict(float)
for category, amount in records:
    totals[category] += amount      # 新键自动从 0.0 起步

print(dict(totals))""", ["example"]),

    ("md", "### 例 3｜常见错误：defaultdict 的“自动长键”", []),

    ("code", """\
from collections import defaultdict

totals = defaultdict(float)

# 反例：只读一次也会“无中生有”
print(totals["餐饮"])        # 0.0：同时往字典里写入了 "餐饮": 0.0！
print(len(totals))           # 1：本来只是想查一下

# 修复：只读判断用 in
print("交通" in totals)      # False，且不污染字典""", ["example"]),

    ("md", """\
**要点**：defaultdict 的默认值是“写入 + 返回”；
**纯查询场景用 `in` 或普通 dict 的 get**。""", []),

    ("md", """## 3. math 与 decimal：数学与精度

**概念**：`math` 提供数学函数（sqrt、floor、ceil、pi）；
`decimal.Decimal` 提供**十进制精确计算**——
`0.1 + 0.2 == 0.3` 为 False 的浮点误差在金额计算里不可接受时用它。""", []),

    ("md", "### 例 1｜最小例子：math 常用函数", []),

    ("code", """\
import math

print(math.sqrt(16))     # 4.0
print(math.floor(3.7), math.ceil(3.2))   # 3 4：向下/向上取整
print(round(math.pi, 4)) # 3.1416""", ["example"]),

    ("md", "### 例 2｜业务例子：金额精确分摊", []),

    ("code", """\
from decimal import Decimal, ROUND_HALF_UP

# 100 元三人分摊，每人多少？浮点版：
print(100 / 3)                    # 33.333333333333336：不精确

# Decimal 版：金额用字符串构造，指定舍入规则
total = Decimal("100")
share = (total / 3).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
print(share)                      # 33.33：银行级精度""", ["example"]),

    ("md", "### 例 3｜常见错误：浮点金额直接相等比较", []),

    ("code", """\
# 反例（第 2 章的老朋友）：
print(0.1 + 0.2 == 0.3)          # False！

# 日常统计用 float 足够；涉及钱的对账、分摊，用 Decimal：
from decimal import Decimal
print(Decimal("0.1") + Decimal("0.2") == Decimal("0.3"))   # True""", ["example"]),

    ("md", """\
**要点**：**展示用 float，对账分摊用 Decimal**（构造时用字符串）。
math.floor/ceil 与 round 的语义不同，取整前想清方向。""", []),

    ("md", """## 4. itertools 与 random：组合与抽签

**概念**：`itertools.product` 笛卡尔积、`combinations` 组合；
`random`（标准库版）用于轻量随机：`random.choice` 抽一个、
`random.sample` 不放回抽多个。**正式数据工作仍建议 NumPy 的
default_rng（第 21 章），标准库版适合小脚本。**""", []),

    ("md", "### 例 1｜业务例子：优惠券组合与抽奖", []),

    ("code", """\
from itertools import combinations
import random

coupons = ["满100减10", "满50减5", "免运费"]

# 两两组合：哪些券能叠加试用？
for a, b in combinations(coupons, 2):
    print(f"试叠加: {a} + {b}")

random.seed(2026)                       # 标准库也要设种子
print("幸运用户:", random.sample(["A", "B", "C", "D"], 2))""", ["example"]),

    ("md", """\
## 5. 查文档：比记忆更可靠的习惯

**概念**：记不住 API 是正常的，**会查才是能力**：

- 官方文档：`docs.python.org/zh-cn/3/library/…`；
- 交互式查询：`help(str.split)`、`dir(str)` 列出所有方法；
- 看 `.__doc__`：`print(pd.read_csv.__doc__[:200])`。""", ["exercise"]),

    ("code", """\
import math

# TODO 1：用 help 查看 math.floor 的说明（输出较长，看第一段即可）
# TODO 2：用 dir(math) 列出 math 的全部公开函数（过滤下划线开头）
# TODO 3：自选一个函数（如 math.gcd），试算 12 和 18 的最大公约数
# help(math.floor)""", ["exercise"]),

    ("md", """## 综合练习""", []),

    ("md", "### 练一练 14.1：账期计算", ["exercise"]),

    ("code", """\
from datetime import date, timedelta

# TODO 1：计算 2026-08-01 到 2026-08-31 之间有多少个“周末日”
# TODO 2：打印账期总天数""", ["exercise"]),

    ("md", "### 练一练 14.2：Counter 热力榜", ["exercise"]),

    ("code", """\
pays = ["微信", "支付宝", "微信", "现金", "微信", "支付宝", "微信"]

# TODO 1：用 Counter 统计各支付方式次数
# TODO 2：打印使用最多的前 2 种（most_common）
# TODO 3：打印各方式占比（次数/总数，保留 2 位小数）""", ["exercise"]),

    ("md", "### 练一练 14.3：Decimal 精确分摊", ["exercise"]),

    ("code", """\
# TODO 1：用 Decimal 把 88.0 元精确分摊给 3 人（保留 2 位，四舍五入）
# TODO 2：验证 3 人份额相加 <= 88.00 且差额 < 0.03（尾差正常存在）
# TODO 3：把 float 版 88/3 与 Decimal 版并排打印，直观对比""", ["exercise"]),

    ("md", """## 易错点清单

- strptime 格式码与字符串逐字符对应，%m 月 / %M 分最易混；
- Counter 查不存在的键返回 0 不报错（这正是它的好用之处）；
- defaultdict 只读也会写入默认值，纯查询用 in；
- 浮点不能精确表示 0.1：金额对账用 Decimal（字符串构造）；
- 标准库 random 也应设种子（random.seed），可复现原则不变。""", []),

    ("md", """## 本章小结

- datetime 管日期、collections 管计数与聚合、math/decimal 管数学与精度。
- 标准库的定位是“小工具”，批量数据分析交给 NumPy/Pandas。
- 比背 API 更重要：help / dir / 官方文档的查询习惯。
- 下一章：模块、类与项目组织——把代码整理成“可交付”的形态。""", []),

    ("md", """## 参考答案""", []),

    ("code", """\
# 练一练 14.1 参考答案
from datetime import date, timedelta

start, end = date(2026, 8, 1), date(2026, 8, 31)
d, weekend_days = start, 0
while d <= end:
    if d.weekday() >= 5:
        weekend_days += 1
    d += timedelta(days=1)
print(weekend_days, (end - start).days + 1)""", ["solution"]),

    ("code", """\
# 练一练 14.2 参考答案
from collections import Counter

pays = ["微信", "支付宝", "微信", "现金", "微信", "支付宝", "微信"]
c = Counter(pays)
print(c)
print(c.most_common(2))
total = sum(c.values())
for method, n in c.most_common():
    print(method, round(n / total, 2))""", ["solution"]),

    ("code", """\
# 练一练 14.3 参考答案
from decimal import Decimal, ROUND_HALF_UP

share = (Decimal("88.0") / 3).quantize(Decimal("0.01"),
                                       rounding=ROUND_HALF_UP)
print("Decimal:", share)
print("float  :", 88.0 / 3)
total = share * 3
print("三人合计:", total, "与 88.00 的差额:", Decimal("88.00") - total)""", ["solution"]),
]
