"""course-chapter-18 统计计算与随机抽样"""

TITLE = "统计计算与随机抽样"
EST_MINUTES = 50

CELLS = [
    ("md", """\
# 第21章 统计计算与随机抽样

描述统计（均值、中位数、分位数）是数据分析的“体检报告”；
随机抽样是模拟与实验的“原料车间”。本章把两件事讲清：

- 一套统计函数怎么用、`axis` 怎么选、**缺失值怎么办**；
- 随机数为什么**必须设种子**，以及怎么设。""", []),

    ("md", """## 学习目标

学完本章，你能够：

- 用 `mean`、`median`、`std`、`percentile`、`corrcoef` 做描述统计；
- 用 `np.nanmean` 等系列处理含缺失值的数据，说出 nan 传播的原理；
- 用 `default_rng` 生成可复现的随机数并完成抽样；
- 避开三大坑：nan 污染统计量、忘记种子、抽样当随机“抽奖”用混 API。""", []),

    ("md", """## 1. 描述统计：一套函数看懂一批数

**概念**：中心趋势看 `mean`（均值）/`median`（中位数），
离散程度看 `std`（标准差）/`ptp`（极差），位置看 `percentile`（分位数）。
**均值怕极端值，中位数不怕**——消费数据高度右偏时两者差别很大。""", []),

    ("md", "### 例 1｜最小例子：五个统计量", []),

    ("code", """\
import numpy as np

a = np.array([20.0, 35.5, 88.0, 12.0, 45.0])

print(a.mean(), np.median(a), a.std())        # 均值/中位数/标准差
print(np.percentile(a, [25, 50, 75]))         # 分位数（自动插值）
print(a.min(), a.max())""", ["example"]),

    ("md", "### 例 2｜业务例子：月账单体检", []),

    ("code", """\
import numpy as np

daily = np.array([20.0, 35.5, 0.0, 88.0, 12.0, 45.0, 66.5,
                  18.0, 22.0, 30.0, 5.5, 27.0, 480.0, 40.0])

print(f"均值 {daily.mean():.1f} vs 中位数 {np.median(daily):.1f}")
print(f"标准差 {daily.std():.1f}（480 的 outliers 抬高了均值）")
print(f"90% 分位: {np.percentile(daily, 90):.1f} 元")
print(f"有一天花了 {daily.max():.0f} 元，是均值的 {daily.max() / daily.mean():.1f} 倍")""", ["example"]),

    ("md", "### 例 3｜常见错误：outlier 让均值说谎", []),

    ("code", """\
import numpy as np

a = np.array([20.0, 30.0, 25.0, 28.0, 1000.0])

print(a.mean())     # 220.6：被一笔 1000 带飞，代表不了“典型一天”
print(np.median(a)) # 28.0：更接近真实水平

# 修复 1：报中位数或截尾均值（去掉两端 10%）
print(np.sort(a)[1:-1].mean())   # 截尾均值

# 反例：直接用 std 判断波动，也会被 outlier 抬高
print(a.std())      # 385+：虚高
# 修复 2：剔除离群值后再算（简单规则：3 倍中位数绝对差）
med = np.median(a)
mad = np.median(np.abs(a - med))
print(a[np.abs(a - med) <= 3 * mad].mean())   # 稳健均值""", ["example"]),

    ("md", """\
**要点**：**报统计量先看分布**——均值、中位数一起看，
差距大就说明有离群值，选中位数或截尾均值。""", []),

    ("md", """## 2. 缺失值：nan 的传播与 nan 系函数

**概念**：NumPy 用 `np.nan` 表示缺失。nan 有“传染性”：
任何与 nan 的算术结果都是 nan，`a.sum()` 遇到 nan 直接变 nan。
解法是 **nan 系函数**：`np.nanmean`、`np.nansum`、`np.nanmax`
自动忽略 nan（不修改原数组）。""", []),

    ("md", "### 例 1｜最小例子：nan 传播与 nan 系", []),

    ("code", """\
import numpy as np

a = np.array([20.0, np.nan, 88.0, 12.0])

print(a.sum())        # nan：一个 nan 污染全部
print(np.nansum(a))   # 120.0：忽略 nan
print(np.nanmean(a))  # 40.0：按“有效元素”求均值
print(np.count_nonzero(np.isnan(a)))   # 1：统计缺失个数""", ["example"]),

    ("md", "### 例 2｜业务例子：漏记账的日子", []),

    ("code", """\
import numpy as np

# 没记账的日子记为 nan（而不是 0！）
daily = np.array([20.0, np.nan, 88.0, np.nan, 12.0, 45.0, 66.5])

print(f"有效记录 {np.count_nonzero(~np.isnan(daily))} / {daily.size} 天")
print(f"有效日均 {np.nanmean(daily):.1f} 元")

# 填补：用有效均值填充缺失（生成新数组）
filled = np.where(np.isnan(daily), np.nanmean(daily), daily)
print(np.round(filled, 1))""", ["example"]),

    ("md", "### 例 3｜常见错误：用 0 顶替缺失", []),

    ("code", """\
import numpy as np

# 反例：没记账写成 0
daily = np.array([20.0, 0.0, 88.0, 0.0, 12.0])
print(daily.mean())   # 24.0：把“没花”当“花了 0 元”，日均被拉低

# 区分两个语义：
#   花了 0 元（真的没消费）-> 合法数据，保留 0
#   没记账（不知道花没花）-> 缺失，用 nan
daily2 = np.array([20.0, np.nan, 88.0, np.nan, 12.0])
print(np.nanmean(daily2))   # 40.0：真实的有效日均""", ["example"]),

    ("md", """\
**要点**：**0 和 nan 是两种语义**——录入数据时就区分好；
统计前先 `np.isnan(a).sum()` 数一数缺失量。""", []),

    ("md", """## 3. 随机抽样：可复现的“运气”

**概念**：现代 NumPy 用 `rng = np.random.default_rng(seed)` 创建随机数生成器：
`rng.random(n)` 均匀随机、`rng.integers(low, high, n)` 随机整数、
`rng.choice(a, n)` 抽样、`rng.normal(mu, sigma, n)` 正态分布。
**seed 是“运气的存档”**：同一种子每次运行结果完全一样。""", []),

    ("md", "### 例 1｜最小例子：种子与抽样", []),

    ("code", """\
import numpy as np

rng = np.random.default_rng(42)      # 种子 42

print(rng.integers(1, 7, 5))         # 掷 5 次骰子
print(np.round(rng.normal(50, 10, 3), 1))   # 均值50、标准差10

rng2 = np.random.default_rng(42)     # 同一种子
print(rng2.integers(1, 7, 5))        # 结果与第一次完全相同""", ["example"]),

    ("md", "### 例 2｜业务例子：抽查账目与模拟月支出", []),

    ("code", """\
import numpy as np

rng = np.random.default_rng(2026)

# 从 100 笔账中随机抽 5 笔审计
ledger = np.arange(100) * 1.0
sample_idx = rng.choice(len(ledger), size=5, replace=False)  # 不放回
print("抽查的账目编号:", sorted(sample_idx))

# 模拟“下个月”支出：日支出 ~ 正态(60, 25)
sim = rng.normal(60, 25, 30).clip(0)     # 金额不能为负
print(f"模拟月支出: {sim.sum():.0f} 元（日均 {sim.mean():.1f}）")""", ["example"]),

    ("md", "### 例 3｜常见错误：不设种子 + 有放回抽样", []),

    ("code", """\
import numpy as np

# 反例 1：不设种子——每次运行结果不同，老师/同事无法复现
a = np.random.default_rng().integers(0, 100, 5)   # 每次都变

# 修复：default_rng(固定数字)
print(np.random.default_rng(7).integers(0, 100, 5))

# 反例 2：想抽 5 个“不同的账目”却用了有放回抽样
ledger = np.arange(10)
dup = np.random.default_rng(1).choice(ledger, 5)   # 默认 replace=True
print(dup)      # 可能有重复编号，重复账目会被重复审计

# 修复：replace=False
print(np.random.default_rng(1).choice(ledger, 5, replace=False))""", ["example"]),

    ("md", """\
**要点**：**任何“随机”环节都要种子**——种子在 Notebook 开头定义一次；
**抽样场景想清“放不放回”**：审计用不放回，模拟重复事件用放回。""", []),

    ("md", """## 4. 相关性：两个变量的联动

**概念**：`np.corrcoef(x, y)` 计算皮尔逊相关系数（-1 到 1）：
接近 1 同涨同跌、接近 -1 反向、接近 0 没有线性关系。
**相关不等于因果**——冰淇淋销量和溺水人数正相关，第三者是夏天。""", []),

    ("md", "### 例 1｜业务例子：消费与外卖单量的关系", []),

    ("code", """\
import numpy as np

delivery = np.array([2, 4, 0, 6, 1, 5, 3])     # 一周外卖单数
spend = np.array([45.0, 80.0, 12.0, 110.0, 30.0, 95.0, 60.0])

r = np.corrcoef(delivery, spend)[0, 1]   # 取 [0,1] 的相关系数
print(f"相关系数 r = {r:.2f}")            # 接近 1：点外卖多花钱多""", ["example"]),

    ("md", "### 例 2｜常见错误：把相关当因果 / 忘记取 [0,1]", []),

    ("code", """\
import numpy as np

x = np.array([1, 2, 3, 4])
y = np.array([2, 4, 6, 8])

# 反例 1：直接打印 corrcoef 得到 2×2 矩阵
print(np.corrcoef(x, y))
# 真正的相关系数是 [0,1] 位置：
print(np.corrcoef(x, y)[0, 1])   # 1.0

# 反例 2：看到强相关就下因果结论
# y 与 x 完全相关，但可能只是“y 本来就是 x 的 2 倍”——
# 相关只说明线性联动，因果要靠业务逻辑或实验设计。""", ["example"]),

    ("md", """## 综合练习""", []),

    ("md", "### 练一练 18.1：月账单体检", ["exercise"]),

    ("code", """\
import numpy as np

daily = np.array([20.0, 35.5, 0.0, 88.0, 12.0, 145.0, 66.5,
                  18.0, 22.0, 30.0, 5.5, 27.0, 480.0, 40.0])

# TODO 1：打印均值与中位数，判断是否存在离群值（差距 > 2 倍即有嫌疑）
# TODO 2：打印 75 分位数与 25 分位数（四分位距 = 两者之差）
# TODO 3：用 3 倍中位数绝对差规则筛出离群值并打印""", ["exercise"]),

    ("md", "### 练一练 18.2：含缺失的周报", ["exercise"]),

    ("code", """\
import numpy as np

daily = np.array([20.0, np.nan, 88.0, np.nan, 12.0, 45.0, 66.5,
                  np.nan, 30.0, 18.0])

# TODO 1：打印缺失天数与有效天数
# TODO 2：用 nanmean 计算有效日均
# TODO 3：生成 filled：缺失处填有效中位数（不是均值），打印保留 1 位""", ["exercise"]),

    ("md", "### 练一练 18.3：模拟与抽查", ["exercise"]),

    ("code", """\
import numpy as np

# TODO 1：用种子 2026 创建 rng，掷 1000 次“两枚骰子的点数和”，
#         打印均值（理论值是 7）
# TODO 2：从编号 0-49 中不放回抽 8 个检查点，打印排序结果
# TODO 3：模拟 12 个月的月支出（各 ~ N(1800, 300)），
#         打印模拟年支出合计""", ["exercise"]),

    ("md", """## 易错点清单

- 均值怕离群值：和中位数一起看，必要时截尾；
- nan 会污染一切统计量，用 `np.nanmean` 系列；
- `0`（真没花）和 `nan`（没记录）是两种语义，不要混用；
- 随机数必须 `default_rng(种子)`，否则不可复现；
- 放回/不放回抽样要主动指定 `replace`；
- 相关系数取 `[0, 1]`，且相关不等于因果。""", []),

    ("md", """## 本章小结

- 描述统计五件套：mean/median、std、percentile、corrcoef，axis 决定方向。
- nan 系函数让含缺失数据照常统计；0 与 nan 的语义要在录入时分清。
- default_rng(种子) 是可复现模拟与抽样的标准姿势。
- NumPy 到此收官。下一章进入 Pandas：带表头、带列名、带时间的数据表。""", []),

    ("md", """## 参考答案""", []),

    ("code", """\
# 练一练 18.1 参考答案
import numpy as np

daily = np.array([20.0, 35.5, 0.0, 88.0, 12.0, 145.0, 66.5,
                  18.0, 22.0, 30.0, 5.5, 27.0, 480.0, 40.0])

print(f"均值 {daily.mean():.1f} vs 中位数 {np.median(daily):.1f}")
q25, q75 = np.percentile(daily, [25, 75])
print("四分位距:", q75 - q25)

med = np.median(daily)
mad = np.median(np.abs(daily - med))
print("离群值:", daily[np.abs(daily - med) > 3 * mad])""", ["solution"]),

    ("code", """\
# 练一练 18.2 参考答案
import numpy as np

daily = np.array([20.0, np.nan, 88.0, np.nan, 12.0, 45.0, 66.5,
                  np.nan, 30.0, 18.0])

n_nan = np.isnan(daily).sum()
print(f"缺失 {n_nan} 天，有效 {daily.size - n_nan} 天")
print(f"有效日均 {np.nanmean(daily):.1f} 元")

filled = np.where(np.isnan(daily), np.nanmedian(daily), daily)
print(np.round(filled, 1))""", ["solution"]),

    ("code", """\
# 练一练 18.3 参考答案
import numpy as np

rng = np.random.default_rng(2026)

dice = rng.integers(1, 7, (1000, 2)).sum(axis=1)
print(f"两骰点数和均值 {dice.mean():.2f}（理论 7）")

print(sorted(rng.choice(50, 8, replace=False)))

monthly = rng.normal(1800, 300, 12).clip(0)
print(f"模拟年支出 {monthly.sum():.0f} 元")""", ["solution"]),
]
