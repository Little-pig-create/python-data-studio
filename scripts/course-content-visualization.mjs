const chart = ({
  summary,
  when,
  dataShape,
  parameters,
  interpretation,
  pitfalls,
  basicCode,
  advancedCode,
  practice,
  practiceTask
}) => ({
  summary,
  when,
  dataShape,
  parameters,
  interpretation,
  pitfalls,
  basicCode,
  advancedCode,
  practice,
  practiceTask
});

export const visualizationSetups = {
  matplotlib: `import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

from js import window
base_url = window.location.origin
transactions = pd.read_csv(f"{base_url}/datasets/uci_online_retail_200k.csv", parse_dates=["InvoiceDate"])
transactions["amount"] = transactions["Quantity"] * transactions["UnitPrice"]
transactions["month"] = transactions["InvoiceDate"].dt.to_period("M").astype("string")
completed = transactions.query("Quantity > 0 and UnitPrice > 0")
monthly_summary = completed.groupby("month").agg(sales=("amount", "sum"), orders=("InvoiceNo", "nunique"))
months = monthly_summary.index.to_numpy()
sales = (monthly_summary["sales"] / 10_000).to_numpy()
orders = monthly_summary["orders"].to_numpy()
profit = sales * 0.18
top_countries = completed.groupby("Country")["amount"].sum().nlargest(4).index
country_rows = transactions[transactions["Country"].isin(top_countries)].copy()
country_rows["flow"] = np.where(country_rows["Quantity"] > 0, "销售", "退货")
country_rows["amount_abs"] = country_rows["amount"].abs()
regional_summary = country_rows.pivot_table(index="Country", columns="flow", values="amount_abs", aggfunc="sum", fill_value=0) / 10_000
regions = regional_summary.index.to_numpy()
online = regional_summary.get("销售", pd.Series(0, index=regional_summary.index)).to_numpy()
offline = regional_summary.get("退货", pd.Series(0, index=regional_summary.index)).to_numpy()
samples = completed["amount"].sample(2_000, random_state=25).to_numpy()
print(f"UCI Online Retail：{len(transactions):,} 行；图表使用聚合结果与固定样本")`,
  seaborn: `import numpy as np
import pandas as pd
import seaborn as sns
import matplotlib.pyplot as plt

sns.set_theme(style="whitegrid", context="notebook")
from js import window
base_url = window.location.origin
diamonds = pd.read_csv(f"{base_url}/datasets/diamonds.csv")
orders_full = diamonds.assign(
    category=diamonds["cut"], channel=diamonds["color"], region=diamonds["clarity"],
    order_value=diamonds["price"], items=diamonds["carat"],
    satisfied=np.where(diamonds["price"] >= diamonds["price"].median(), "高于中位价", "不高于中位价"),
)
orders = orders_full.sample(2_000, random_state=36).copy()
taxis = pd.read_csv(f"{base_url}/datasets/taxis.csv", parse_dates=["pickup", "dropoff"])
marketing_full = taxis.assign(
    channel=taxis["payment"].fillna("unknown"), visits=taxis["distance"],
    ad_spend=taxis["tip"], sales=taxis["total"],
    conversion=(taxis["tip"] / taxis["total"].replace(0, np.nan)).fillna(0),
)
marketing = marketing_full.sample(min(2_000, len(marketing_full)), random_state=36).copy()
flights = pd.read_csv(f"{base_url}/datasets/flights.csv")
daily = flights.assign(
    date=pd.to_datetime(flights["year"].astype("string") + "-" + flights["month"] + "-01"),
    region="AirPassengers", sales=flights["passengers"],
)
print(f"Diamonds：{len(diamonds):,} 行；NYC Taxis：{len(taxis):,} 行；Flights：{len(flights):,} 行")
print("图表兼容列均由公开数据原始字段直接映射；高成本图使用固定 2,000 行样本")`,
  plotly: `import numpy as np
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots

funnel = pd.DataFrame({
    "stage": ["访问", "查看商品", "加入购物车", "提交订单", "支付成功"],
    "users": [12000, 7200, 3100, 1850, 1420],
})
timeline = pd.DataFrame({
    "task": ["数据准备", "探索分析", "图表制作", "报告复核"],
    "start": pd.to_datetime(["2026-03-01", "2026-03-04", "2026-03-08", "2026-03-12"]),
    "finish": pd.to_datetime(["2026-03-04", "2026-03-09", "2026-03-13", "2026-03-15"]),
    "owner": ["数据", "分析", "分析", "负责人"],
})
from js import window
base_url = window.location.origin
diamonds = pd.read_csv(f"{base_url}/datasets/diamonds.csv")
orders_full = diamonds.assign(
    date=pd.Timestamp("2026-01-01"), category=diamonds["cut"], region=diamonds["clarity"],
    channel=diamonds["color"], order_value=diamonds["price"], items=diamonds["carat"],
    sales=diamonds["price"], month="公开样本",
)
orders = orders_full.sample(5_000, random_state=55).copy()
flights = pd.read_csv(f"{base_url}/datasets/flights.csv")
monthly = flights.query("year == 1960").rename(columns={"passengers": "sales"}).copy()
monthly["orders"] = monthly["sales"]
monthly["profit"] = monthly["sales"].rolling(3, min_periods=1).mean()
regional = orders_full.groupby(["region", "channel"], as_index=False)["sales"].sum()
hierarchy = diamonds.groupby(["cut", "color"], as_index=False)["price"].sum().rename(
    columns={"cut": "department", "color": "category", "price": "sales"}
)
gapminder = pd.read_csv(f"{base_url}/datasets/gapminder.csv")
countries = gapminder.query("year == 2007").assign(
    country=lambda frame: frame["country"], market=lambda frame: frame["country"],
    sales=lambda frame: frame["gdpPercap"], growth=lambda frame: frame["lifeExp"]
)
print(f"Diamonds：{len(diamonds):,} 行；Flights：{len(flights):,} 行；Gapminder：{len(gapminder):,} 行")`
};

export const visualizationProfiles = {
  25: chart({
    summary: "理解Figure、Axes和Artist层级，建立可维护的Matplotlib绘图流程。",
    when: "所有Matplotlib章节的基础；适合需要精确控制布局、注释和静态导出的场景。",
    dataShape: "任意可转换为一维或二维数值序列的数据。先明确画布、绘图区和数据元素的职责。",
    parameters: ["figsize：画布尺寸", "dpi：显示或导出分辨率", "layout：自动布局", "Axes.set：集中设置标题和坐标轴"],
    interpretation: "检查画布中Axes数量、每个Axes的数据对象数量，以及标题、单位是否完整。",
    pitfalls: ["混用多个隐式plt状态导致图画到错误Axes", "创建Figure后未保存引用", "没有关闭不再使用的图"],
    practiceTask: `运行基础图表后，完成以下任务：

1. 将 figsize 从 (9, 4.2) 改为 (12, 5)，观察画布尺寸变化
2. 将 layout="constrained" 改为 layout="tight"，对比布局效果
3. 修改 width_ratios 为 [3, 1]，说明主副图宽度比例的变化`,
    basicCode: `fig, ax = plt.subplots(figsize=(8, 4.2))
line = ax.plot(months, sales, marker="o", color="#1a73e8", label="销售额")[0]
ax.set(title="Figure与Axes示例", xlabel="月份", ylabel="销售额（万元）")
ax.legend(frameon=False)
fig.tight_layout()
plt.show()

print("Axes数量:", len(fig.axes))
print("数据点数量:", len(line.get_xdata()))`,
    advancedCode: `fig = plt.figure(figsize=(9, 4.2), layout="constrained")
grid = fig.add_gridspec(1, 2, width_ratios=[2, 1])
ax_main = fig.add_subplot(grid[0, 0])
ax_side = fig.add_subplot(grid[0, 1])
ax_main.plot(months, sales, marker="o", color="#1a73e8")
ax_main.set(title="月度趋势", ylabel="万元")
ax_side.barh(regions, online + offline, color="#188038")
ax_side.set(title="区域合计")
plt.show()`,
    practice: `fig, axes = plt.subplots(1, 2, figsize=(9, 4))
axes[0].plot(months, profit, marker="o", color="#188038")
axes[0].set(title="月度利润", ylabel="万元")
axes[1].bar(regions, online, color="#1a73e8")
axes[1].set(title="区域线上销售", ylabel="万元")
fig.tight_layout()
plt.show()`
  }),
  26: chart({
    summary: "用折线位置和斜率表达有序时间上的趋势、转折和多序列差异。",
    when: "X轴具有自然顺序，重点是观察连续变化、增长速度或周期。",
    dataShape: "一列有序时间或阶段，一列或多列同单位指标；缺失时间点需要显式处理。",
    parameters: ["marker：观测点", "linestyle：线型", "linewidth：线宽", "label：序列名称"],
    interpretation: "先读总体方向，再找峰谷、转折和序列间差距；不能把连接线误解为未观测区间的真实数据。",
    pitfalls: ["用折线连接无顺序类别", "多条线颜色过近", "时间缺失却直接连接"],
    practiceTask: `运行基础图表后，完成以下任务：

1. 将 marker='o' 改为 marker='s'，观察标记形状变化
2. 调整 linewidth 参数（如 0.5 或 3.5），说明线条粗细对可读性的影响
3. 修改 linestyle 为 '--'，对比虚线与实线的视觉效果`,
    basicCode: `fig, ax = plt.subplots(figsize=(8, 4.2))
ax.plot(months, sales, marker="o", linewidth=2.2, color="#1a73e8")
ax.set(title="上半年销售额趋势", xlabel="月份", ylabel="销售额（万元）")
ax.spines[["top", "right"]].set_visible(False)
ax.grid(axis="y", alpha=0.2)
fig.tight_layout()
plt.show()`,
    advancedCode: `sales_index = sales / sales[0] * 100
profit_index = profit / profit[0] * 100
fig, ax = plt.subplots(figsize=(8, 4.2))
ax.plot(months, sales_index, marker="o", label="销售额指数")
ax.plot(months, profit_index, marker="s", label="利润指数")
ax.axhline(100, color="#9aa0a6", linestyle="--", linewidth=1)
ax.set(title="利润增长快于销售额", ylabel="指数（1月=100）")
ax.legend(frameon=False)
fig.tight_layout()
plt.show()`,
    practice: `growth = np.diff(orders)
fastest = int(growth.argmax()) + 1
fig, ax = plt.subplots(figsize=(8, 4.2))
ax.plot(months, orders, marker="o", color="#188038")
ax.scatter(months[fastest], orders[fastest], s=90, color="#d93025", zorder=3)
ax.annotate(f"增加 {growth[fastest - 1]} 单", (months[fastest], orders[fastest]), xytext=(-45, 25), textcoords="offset points", arrowprops={"arrowstyle": "->"})
ax.set(title="订单量趋势及最大增量", ylabel="订单数")
fig.tight_layout()
plt.show()`
  }),
  27: chart({
    summary: "使用柱形长度比较类别大小，并掌握排序、分组、堆积和水平布局。",
    when: "比较离散类别的数量、金额、均值或组成。",
    dataShape: "一列类别和一列指标；分组或堆积图还需要第二个类别维度。",
    parameters: ["width：柱宽", "bottom：堆积基线", "barh：水平布局", "bar_label：数值标签"],
    interpretation: "比较共享零基线上的柱长；堆积图同时读取总量和构成，但中间序列不易精确比较。",
    pitfalls: ["数值轴不从零开始夸大差异", "类别太多仍使用竖向柱状图", "用不同颜色装饰同一序列"],
    practiceTask: `运行基础图表后，完成以下任务：

1. 将 width 参数从 0.36 改为 0.6，观察柱形间距变化
2. 移除 bar_label 参数，对比有无数值标签的可读性差异
3. 修改 barh 为 bar，将水平柱状图改为垂直布局`,
    basicCode: `totals = online + offline
order = np.argsort(totals)
fig, ax = plt.subplots(figsize=(8, 4.2))
bars = ax.barh(regions[order], totals[order], color="#1a73e8")
ax.bar_label(bars, padding=4)
ax.set(title="各区域总销售额", xlabel="销售额（万元）")
ax.spines[["top", "right", "left"]].set_visible(False)
fig.tight_layout()
plt.show()`,
    advancedCode: `x = np.arange(len(regions))
width = 0.36
fig, ax = plt.subplots(figsize=(8, 4.2))
ax.bar(x - width / 2, online, width, label="线上", color="#1a73e8")
ax.bar(x + width / 2, offline, width, label="线下", color="#f9ab00")
ax.set(title="区域渠道对比", ylabel="销售额（万元）", xticks=x, xticklabels=regions)
ax.legend(frameon=False, ncol=2)
fig.tight_layout()
plt.show()`,
    practice: `fig, ax = plt.subplots(figsize=(8, 4.2))
ax.bar(regions, online, label="线上", color="#1a73e8")
ax.bar(regions, offline, bottom=online, label="线下", color="#f9ab00")
ax.set(title="区域销售渠道构成", ylabel="销售额（万元）")
ax.legend(frameon=False)
fig.tight_layout()
plt.show()`
  }),
  28: chart({
    summary: "用点的位置、颜色和面积检查变量关系、分组差异和异常观察。",
    when: "分析两个数值变量是否共同变化，或比较多个观察的二维位置。",
    dataShape: "每行一条观察，至少包含X与Y两个数值变量；可增加类别和大小字段。",
    parameters: ["s：点面积", "c：颜色", "cmap：连续色盘", "alpha：透明度"],
    interpretation: "观察方向、形状、密度、分组和离群点；视觉相关不等于因果。",
    pitfalls: ["点面积直接使用原值导致差异过大", "过度叠加看不到密度", "只画拟合趋势不看原始点"],
    practiceTask: `运行基础图表后，完成以下任务：

1. 将 s 参数从 75 改为 150，观察点大小变化对可读性的影响
2. 调整 alpha 参数（如 0.3 或 1.0），说明透明度对重叠点显示的作用
3. 修改 cmap 为 'Reds'，对比不同色盘的视觉效果`,
    basicCode: `ad_spend = np.array([18, 22, 20, 27, 31, 35])
fig, ax = plt.subplots(figsize=(7.5, 4.5))
ax.scatter(ad_spend, sales, s=75, color="#1a73e8", alpha=0.75)
for x_value, y_value, month in zip(ad_spend, sales, months):
    ax.annotate(month, (x_value, y_value), xytext=(5, 4), textcoords="offset points")
ax.set(title="广告投入与销售额同向变化", xlabel="广告投入（万元）", ylabel="销售额（万元）")
fig.tight_layout()
plt.show()`,
    advancedCode: `conversion = sales * 10000 / orders
sizes = (orders - orders.min() + 200) / 5
fig, ax = plt.subplots(figsize=(8, 4.8))
points = ax.scatter(orders, sales, s=sizes, c=conversion, cmap="viridis", alpha=0.75)
fig.colorbar(points, ax=ax, label="平均订单金额（元）")
ax.set(title="订单规模、销售额与平均订单金额", xlabel="订单数", ylabel="销售额（万元）")
fig.tight_layout()
plt.show()`,
    practice: `rng_scatter = np.random.default_rng(28)
visits = rng_scatter.integers(100, 900, 80)
conversion = rng_scatter.uniform(0.08, 0.22, 80)
order_count = visits * conversion
fig, ax = plt.subplots(figsize=(8, 4.5))
ax.scatter(visits, order_count, c=conversion, s=45, cmap="Blues", alpha=0.7)
ax.set(title="访问量与订单量关系", xlabel="访问量", ylabel="订单量")
fig.tight_layout()
plt.show()`
  }),
  29: chart({
    summary: "通过分箱展示连续变量的频数或密度，判断集中区间、偏态和多峰。",
    when: "探索一个连续数值变量的分布形状。",
    dataShape: "一维连续数值样本；分组比较时各组应有足够样本量。",
    parameters: ["bins：分箱", "density：密度", "range：统计范围", "histtype：绘制方式"],
    interpretation: "关注中心、离散、偏态、峰数和长尾；改变分箱检查结论是否稳定。",
    pitfalls: ["样本很少却使用过多分箱", "不同组使用不同分箱边界", "把柱高误解为单个精确值"],
    practiceTask: `运行基础图表后，完成以下任务：

1. 将 bins 参数从 18 改为 30，观察分箱数量对分布形状的影响
2. 添加 density=True 参数，对比频数直方图与密度直方图的纵轴含义
3. 修改 edgecolor 为 'black'，说明边框对柱形区分度的作用`,
    basicCode: `fig, ax = plt.subplots(figsize=(8, 4.2))
ax.hist(samples, bins=18, color="#1a73e8", edgecolor="white")
ax.set(title="订单金额分布", xlabel="订单金额（元）", ylabel="订单数")
ax.spines[["top", "right"]].set_visible(False)
fig.tight_layout()
plt.show()`,
    advancedCode: `regular = samples[samples < 260]
premium = samples[samples >= 260]
bins = np.linspace(samples.min(), samples.max(), 20)
fig, ax = plt.subplots(figsize=(8, 4.2))
ax.hist([regular, premium], bins=bins, stacked=True, label=["普通区间", "高价区间"], color=["#1a73e8", "#f9ab00"])
ax.set(title="订单金额分层分布", xlabel="订单金额（元）", ylabel="订单数")
ax.legend(frameon=False)
fig.tight_layout()
plt.show()`,
    practice: `rng_hist = np.random.default_rng(290)
delivery_days = rng_hist.gamma(shape=2.4, scale=1.3, size=260)
fig, axes = plt.subplots(1, 2, figsize=(10, 4))
axes[0].hist(delivery_days, bins=10, color="#188038", edgecolor="white")
axes[0].set(title="10个分箱", xlabel="配送天数")
axes[1].hist(delivery_days, bins=24, color="#188038", edgecolor="white")
axes[1].set(title="24个分箱", xlabel="配送天数")
fig.tight_layout()
plt.show()`
  }),
  30: chart({
    summary: "使用中位数、四分位距和须快速比较分布并标记潜在离群点。",
    when: "比较一个或多个数值样本的中心、离散程度与异常观察。",
    dataShape: "一维样本或多个等价样本列表；类别比较时组名应明确。",
    parameters: ["whis：须范围", "showmeans：均值", "notch：中位数缺口", "patch_artist：填充箱体"],
    interpretation: "箱体中线是中位数，箱体覆盖中间50%，须外点是潜在异常而非必然错误。",
    pitfalls: ["把箱体高度理解为样本量", "机械删除所有须外点", "小样本仍只看箱线摘要"],
    practiceTask: `运行基础图表后，完成以下任务：

1. 添加 showmeans=True 参数，观察均值标记与中位数线的位置差异
2. 将 whis 参数从默认 1.5 改为 2.0，说明须范围对异常点判定的影响
3. 添加 notch=True 参数，对比缺口箱线图与标准箱线图的视觉效果`,
    basicCode: `fig, ax = plt.subplots(figsize=(6.5, 4.5))
ax.boxplot(samples, patch_artist=True, boxprops={"facecolor": "#d2e3fc"}, medianprops={"color": "#d93025", "linewidth": 2})
ax.set(title="订单金额箱线图", ylabel="订单金额（元）", xticks=[1], xticklabels=["全部订单"])
ax.grid(axis="y", alpha=0.2)
fig.tight_layout()
plt.show()`,
    advancedCode: `rng_box = np.random.default_rng(30)
groups = [
    rng_box.normal(180, 30, 100),
    rng_box.normal(240, 48, 100),
    rng_box.normal(210, 36, 100),
]
fig, ax = plt.subplots(figsize=(8, 4.5))
boxes = ax.boxplot(groups, tick_labels=["办公", "数码", "家居"], patch_artist=True, showmeans=True)
for patch, color in zip(boxes["boxes"], ["#d2e3fc", "#ceead6", "#feefc3"]):
    patch.set_facecolor(color)
ax.set(title="品类订单金额分布", ylabel="订单金额（元）")
fig.tight_layout()
plt.show()`,
    practice: `rng_delivery = np.random.default_rng(300)
delivery = [rng_delivery.normal(2.6, 0.6, 90), rng_delivery.normal(3.4, 0.9, 90)]
fig, ax = plt.subplots(figsize=(7, 4.2))
ax.boxplot(delivery, tick_labels=["自营", "第三方"], patch_artist=True)
ax.axhline(3, color="#d93025", linestyle="--", label="3天目标")
ax.set(title="配送时长对比", ylabel="天")
ax.legend(frameon=False)
fig.tight_layout()
plt.show()`
  }),
  31: chart({
    summary: "使用填充区域表达连续趋势、区间范围或多个组成部分的累计变化。",
    when: "强调趋势的累计量、区间或随时间变化的组成。",
    dataShape: "有序X轴和一条或多条非负序列；堆积面积图各序列单位相同。",
    parameters: ["alpha：透明度", "baseline：堆积基线", "labels：组成名称", "where：条件填充"],
    interpretation: "普通面积图读取边界趋势；堆积面积图读取总高度和各层厚度。",
    pitfalls: ["多层面积图难以比较中间序列", "存在负值仍直接堆积", "面积填充遮挡重要网格和文字"],
    practiceTask: `运行基础图表后，完成以下任务：

1. 将 alpha 参数从 0.18 改为 0.5，观察透明度对填充区域可见性的影响
2. 修改 stackplot 中的 alpha 为 0.95，对比不透明堆积与透明堆积的视觉效果
3. 在 fill_between 中添加 where 参数（如 where=(sales > 150)），观察条件填充效果`,
    basicCode: `fig, ax = plt.subplots(figsize=(8, 4.2))
ax.plot(months, sales, color="#1a73e8", linewidth=2)
ax.fill_between(months, sales, color="#1a73e8", alpha=0.18)
ax.set(title="上半年销售额面积图", ylabel="销售额（万元）")
ax.spines[["top", "right"]].set_visible(False)
fig.tight_layout()
plt.show()`,
    advancedCode: `office = np.array([38, 42, 40, 48, 55, 59])
digital = np.array([52, 65, 60, 78, 92, 105])
home = sales - office - digital
fig, ax = plt.subplots(figsize=(8.5, 4.5))
ax.stackplot(months, office, digital, home, labels=["办公", "数码", "家居"], colors=["#8ab4f8", "#81c995", "#fdd663"], alpha=0.85)
ax.set(title="销售额品类构成变化", ylabel="销售额（万元）")
ax.legend(loc="upper left", frameon=False, ncol=3)
fig.tight_layout()
plt.show()`,
    practice: `lower = sales * 0.9
upper = sales * 1.1
fig, ax = plt.subplots(figsize=(8, 4.2))
ax.plot(months, sales, color="#188038", marker="o", label="预测")
ax.fill_between(months, lower, upper, color="#188038", alpha=0.18, label="±10%区间")
ax.set(title="销售预测及区间", ylabel="销售额（万元）")
ax.legend(frameon=False)
fig.tight_layout()
plt.show()`
  }),
  32: chart({
    summary: "在类别很少且总和具有明确整体含义时使用饼图或环形图表达占比。",
    when: "展示2至5个互斥类别在同一整体中的比例。",
    dataShape: "一列非负数值，类别互斥且总和代表完整整体。",
    parameters: ["autopct：百分比", "startangle：起始角", "wedgeprops：扇区样式", "explode：轻微突出"],
    interpretation: "主要读取最大、最小和大致占比；精确比较仍应使用柱状图。",
    pitfalls: ["类别过多", "使用3D效果", "多个饼图之间比较角度", "数据并非同一整体"],
    practiceTask: `运行基础图表后，完成以下任务：

1. 将 startangle 从 90 改为 0，观察扇区起始位置变化
2. 修改 autopct 格式从 "%.1f%%" 为 "%.0f%%"，对比百分比精度显示
3. 调整 wedgeprops 中的 width 参数（如 0.5 或 0.3），说明环形宽度对中心空间的影响`,
    basicCode: `channel_sales = np.array([180, 92, 58])
labels = ["自然流量", "广告", "会员"]
fig, ax = plt.subplots(figsize=(6.5, 5))
ax.pie(channel_sales, labels=labels, autopct="%.1f%%", startangle=90, colors=["#1a73e8", "#f9ab00", "#188038"], wedgeprops={"edgecolor": "white"})
ax.set_title("销售渠道占比")
fig.tight_layout()
plt.show()`,
    advancedCode: `fig, ax = plt.subplots(figsize=(6.5, 5))
wedges, texts, autotexts = ax.pie(channel_sales, labels=labels, autopct="%.1f%%", startangle=90, pctdistance=0.78, colors=["#1a73e8", "#f9ab00", "#188038"], wedgeprops={"width": 0.38, "edgecolor": "white"})
ax.text(0, 0, f"总计\\n{channel_sales.sum()}", ha="center", va="center", fontsize=14, fontweight="bold")
ax.set_title("销售渠道构成（环形图）")
fig.tight_layout()
plt.show()`,
    practice: `satisfaction = np.array([72, 20, 8])
fig, ax = plt.subplots(figsize=(6.5, 5))
ax.pie(satisfaction, labels=["满意", "一般", "不满意"], autopct="%1.0f%%", startangle=90, colors=["#188038", "#f9ab00", "#d93025"], wedgeprops={"width": 0.42, "edgecolor": "white"})
ax.set_title("客户满意度构成")
fig.tight_layout()
plt.show()`
  }),
  33: chart({
    summary: "用误差线和带状区间表达估计值的不确定性、波动范围或上下界。",
    when: "展示均值及标准差、置信区间、预测区间或测量误差。",
    dataShape: "中心估计值及对应的对称或非对称误差。",
    parameters: ["yerr/xerr：误差", "capsize：端帽", "elinewidth：误差线宽", "fill_between：连续区间"],
    interpretation: "先明确区间代表标准差、标准误还是置信区间；重叠不等于没有差异。",
    pitfalls: ["不说明误差类型", "误差线过粗遮挡中心值", "把预测区间解释为置信区间"],
    practiceTask: `运行基础图表后，完成以下任务：

1. 将 capsize 参数从 4 改为 8，观察端帽长度对误差线可读性的影响
2. 调整 elinewidth 参数（如 1.5 或 3），说明误差线粗细的视觉效果
3. 修改 fill_between 的 alpha 值（如 0.1 或 0.35），对比不同透明度的区间显示`,
    basicCode: `average = np.array([120, 148, 139, 176, 205, 228])
standard_error = np.array([6, 8, 7, 9, 11, 10])
fig, ax = plt.subplots(figsize=(8, 4.2))
ax.errorbar(months, average, yerr=standard_error, marker="o", capsize=4, color="#1a73e8", ecolor="#8ab4f8")
ax.set(title="月度销售额及标准误", ylabel="销售额（万元）")
fig.tight_layout()
plt.show()`,
    advancedCode: `forecast = np.array([130, 145, 162, 181, 198, 216])
lower = forecast - np.array([12, 13, 14, 16, 18, 20])
upper = forecast + np.array([12, 13, 14, 16, 18, 20])
fig, ax = plt.subplots(figsize=(8, 4.2))
ax.plot(months, forecast, marker="o", color="#188038", label="预测")
ax.fill_between(months, lower, upper, color="#188038", alpha=0.18, label="预测区间")
ax.set(title="销售预测及不确定区间", ylabel="销售额（万元）")
ax.legend(frameon=False)
fig.tight_layout()
plt.show()`,
    practice: `means = np.array([4.2, 3.8, 4.5, 4.0])
errors = np.array([0.18, 0.22, 0.16, 0.20])
fig, ax = plt.subplots(figsize=(7.5, 4.2))
ax.bar(regions, means, yerr=errors, capsize=5, color="#d2e3fc", edgecolor="#1a73e8")
ax.set(title="区域满意度均值及标准误", ylabel="满意度（5分制）", ylim=(0, 5))
fig.tight_layout()
plt.show()`
  }),
  34: chart({
    summary: "使用subplots和GridSpec把多个相关图组织为共享阅读结构。",
    when: "同一分析需要多个互补图表，或需要比较小倍图。",
    dataShape: "多个共享维度或相关指标的数据集。",
    parameters: ["nrows/ncols：网格", "sharex/sharey：共享轴", "gridspec_kw：比例", "suptitle：画布标题"],
    interpretation: "先阅读总标题，再按固定顺序逐图比较；共享轴时确认量纲一致。",
    pitfalls: ["每个子图重复图例和标签", "子图尺寸太小", "双Y轴制造虚假同步"],
    practiceTask: `运行基础图表后，完成以下任务：

1. 将 sharex=True 改为 sharex=False，观察独立坐标轴与共享坐标轴的差异
2. 修改 gridspec_kw 中的 width_ratios 为 [1, 1]，对比均等与非均等列宽布局
3. 调整 figsize 参数（如 (12, 5) 或 (10, 6)），说明画布尺寸对子图可读性的影响`,
    basicCode: `fig, axes = plt.subplots(2, 1, figsize=(8.5, 6), sharex=True)
axes[0].plot(months, sales, marker="o", color="#1a73e8")
axes[0].set(title="销售额", ylabel="万元")
axes[1].plot(months, profit, marker="s", color="#188038")
axes[1].set(title="利润", xlabel="月份", ylabel="万元")
for ax in axes:
    ax.spines[["top", "right"]].set_visible(False)
    ax.grid(axis="y", alpha=0.18)
fig.suptitle("上半年经营指标", fontsize=16)
fig.tight_layout()
plt.show()`,
    advancedCode: `fig = plt.figure(figsize=(10, 5), layout="constrained")
grid = fig.add_gridspec(2, 2, width_ratios=[2, 1])
ax_trend = fig.add_subplot(grid[:, 0])
ax_region = fig.add_subplot(grid[0, 1])
ax_channel = fig.add_subplot(grid[1, 1])
ax_trend.plot(months, sales, marker="o", color="#1a73e8")
ax_trend.set(title="月度销售趋势", ylabel="万元")
ax_region.barh(regions, online + offline, color="#188038")
ax_region.set(title="区域总量")
ax_channel.pie([online.sum(), offline.sum()], labels=["线上", "线下"], autopct="%.0f%%", colors=["#1a73e8", "#f9ab00"])
ax_channel.set_title("渠道构成")
plt.show()`,
    practice: `fig, axes = plt.subplots(1, 3, figsize=(12, 3.8))
axes[0].plot(months, orders, marker="o", color="#1a73e8")
axes[0].set(title="订单趋势")
axes[1].bar(regions, online, color="#188038")
axes[1].set(title="线上销售")
axes[2].hist(samples, bins=14, color="#f9ab00", edgecolor="white")
axes[2].set(title="订单金额分布")
fig.suptitle("经营分析面板")
fig.tight_layout()
plt.show()`
  }),
  35: chart({
    summary: "通过有限配色、刻度格式、重点注释和规范导出提升图表可读性。",
    when: "图表进入报告、汇报或作品集前的统一整理阶段。",
    dataShape: "任何已经确定分析结论的Matplotlib图表。",
    parameters: ["tick formatter：刻度格式", "annotate：注释", "spines：边框", "savefig：导出"],
    interpretation: "视觉重点应与结论一致；标题表达结论，坐标轴表达指标和单位。",
    pitfalls: ["装饰多于信息", "颜色数量过多", "数据标签互相遮挡", "导出时标题被裁切"],
    practiceTask: `运行基础图表后，完成以下任务：

1. 修改 annotate 的 xytext 参数（如 (-40, 35) 或 (-70, 20)），调整注释箭头位置
2. 将 savefig 的 dpi 从 180 改为 300，对比不同分辨率的导出效果
3. 修改 grid 的 alpha 参数（如 0.05 或 0.3），说明网格透明度对可读性的影响`,
    basicCode: `from matplotlib.ticker import FuncFormatter

fig, ax = plt.subplots(figsize=(8, 4.2))
colors = ["#9aa0a6"] * 5 + ["#1a73e8"]
bars = ax.bar(months, sales, color=colors)
ax.bar_label(bars, padding=4, fmt="%.0f")
ax.yaxis.set_major_formatter(FuncFormatter(lambda value, _: f"{value:.0f}万"))
ax.set(title="6月销售额达到半年最高", xlabel="月份", ylabel="销售额")
ax.spines[["top", "right", "left"]].set_visible(False)
ax.grid(axis="y", alpha=0.15)
fig.tight_layout()
plt.show()`,
    advancedCode: `from io import BytesIO

fig, ax = plt.subplots(figsize=(8, 4.2))
ax.plot(months, profit, marker="o", color="#188038", linewidth=2)
peak = int(profit.argmax())
ax.annotate(f"最高 {profit[peak]} 万元", (months[peak], profit[peak]), xytext=(-60, 28), textcoords="offset points", arrowprops={"arrowstyle": "->", "color": "#188038"})
ax.set(title="利润在6月达到最高", ylabel="利润（万元）")
fig.tight_layout()
buffer = BytesIO()
fig.savefig(buffer, format="png", dpi=180, bbox_inches="tight")
print(f"导出PNG大小: {buffer.getbuffer().nbytes / 1024:.1f} KB")
plt.show()`,
    practice: `fig, ax = plt.subplots(figsize=(8, 4.2))
sales_growth = np.r_[np.nan, np.diff(sales) / sales[:-1]]
ax.plot(months, sales_growth * 100, marker="o", color="#1a73e8")
ax.axhline(0, color="#9aa0a6", linewidth=1)
ax.set(title="除3月外，月度销售额保持增长", ylabel="环比增长率（%）")
ax.spines[["top", "right"]].set_visible(False)
ax.grid(axis="y", alpha=0.15)
fig.tight_layout()
plt.show()`
  }),
  36: chart({
    summary: "理解Seaborn的长表映射、Axes级与Figure级接口、主题和调色板。",
    when: "使用DataFrame直接完成统计聚合、分类映射和统一视觉风格。",
    dataShape: "优先使用每行一个观察、每列一个变量的长表。",
    parameters: ["data：数据表", "x/y：位置变量", "hue：颜色分组", "style/size：其他映射"],
    interpretation: "先确认每个视觉通道对应哪一列，再判断函数是否自动执行了统计聚合。",
    pitfalls: ["宽表和长表混用", "不知道barplot默认计算均值", "Figure级函数传入已有Axes"],
    practiceTask: `运行基础图表后，完成以下任务：

1. 将 sns.axes_style("ticks") 改为 "whitegrid" 或 "dark"，对比不同主题风格
2. 修改 palette 参数从 "Set2" 为 "pastel" 或 "muted"，观察调色板变化
3. 在 scatterplot 中添加 style="channel" 参数，观察形状映射与颜色映射的组合效果`,
    basicCode: `fig, ax = plt.subplots(figsize=(8, 4.2))
sns.scatterplot(data=marketing, x="visits", y="sales", hue="channel", ax=ax)
ax.set(title="Seaborn长表映射", xlabel="访问量", ylabel="销售额")
ax.legend(title="渠道", frameon=False)
fig.tight_layout()
plt.show()`,
    advancedCode: `with sns.axes_style("ticks"):
    fig, axes = plt.subplots(1, 2, figsize=(10, 4))
    sns.countplot(data=orders, x="category", color="#1a73e8", ax=axes[0])
    sns.boxplot(data=orders, x="category", y="order_value", hue="category", palette="Set2", legend=False, ax=axes[1])
    axes[0].set(title="订单量", xlabel="品类", ylabel="订单数")
    axes[1].set(title="客单价分布", xlabel="品类", ylabel="元")
    sns.despine()
    fig.tight_layout()
plt.show()`,
    practice: `sns.set_theme(style="whitegrid", palette="colorblind")
fig, ax = plt.subplots(figsize=(8, 4.2))
sns.barplot(data=orders, x="category", y="order_value", errorbar=None, ax=ax)
ax.set(title="品类平均客单价", xlabel="品类", ylabel="元")
fig.tight_layout()
plt.show()`
  }),
  37: chart({
    summary: "用countplot统计分类变量频数，并通过顺序和hue比较构成。",
    when: "回答每个类别有多少条观察。",
    dataShape: "一列分类变量；hue可增加第二个分类维度。",
    parameters: ["order：类别顺序", "hue：组内分类", "stat：计数或比例", "palette：颜色"],
    interpretation: "柱高是行数或比例，不代表金额、均值或总和。",
    pitfalls: ["把countplot误认为数值聚合", "类别顺序随数据变化", "类别太多导致标签拥挤"],
    practiceTask: `运行基础图表后，完成以下任务：

1. 将 stat="percent" 改为 stat="count"，对比百分比与计数的纵轴含义
2. 移除 order 参数，观察无序与按频数排序的可读性差异
3. 修改 y="category" 为 x="category"，将水平柱状图改为垂直布局`,
    basicCode: `order = orders["category"].value_counts().index
fig, ax = plt.subplots(figsize=(8, 4.2))
sns.countplot(data=orders, y="category", order=order, color="#1a73e8", ax=ax)
ax.set(title="各品类订单量", xlabel="订单数", ylabel="品类")
fig.tight_layout()
plt.show()`,
    advancedCode: `fig, ax = plt.subplots(figsize=(8, 4.2))
sns.countplot(data=orders, x="category", hue="satisfied", stat="percent", palette=["#188038", "#f9ab00"], ax=ax)
ax.set(title="品类评价构成", xlabel="品类", ylabel="占全部订单比例（%）")
ax.legend(title="评价", frameon=False)
fig.tight_layout()
plt.show()`,
    practice: `region_order = orders["region"].value_counts().index
fig, ax = plt.subplots(figsize=(8, 4.2))
sns.countplot(data=orders, y="region", hue="channel", order=region_order, palette="colorblind", ax=ax)
ax.set(title="区域渠道订单量", xlabel="订单数", ylabel="区域")
ax.legend(title="渠道", frameon=False)
fig.tight_layout()
plt.show()`
  }),
  38: chart({
    summary: "用barplot比较分类组的均值或其他估计量，并理解误差线。",
    when: "比较各类别的平均值、中位数或自定义统计量。",
    dataShape: "一列类别和一列数值；每组需要多个观察才能估计误差。",
    parameters: ["estimator：估计量", "errorbar：误差表示", "hue：分组", "order：顺序"],
    interpretation: "柱高是估计值，误差线含义由errorbar参数决定；同时报告样本量。",
    pitfalls: ["把均值柱高解释为总量", "隐藏分布和样本量", "误差线含义不明确"],
    practiceTask: `运行基础图表后，完成以下任务：

1. 将 estimator="mean" 改为 estimator="median"，对比均值与中位数的柱高差异
2. 修改 errorbar=("ci", 90) 为 errorbar="sd"，观察置信区间与标准差的误差线长度
3. 将 errorbar=None 改为 errorbar=("ci", 95)，说明误差线对估计不确定性的表达作用`,
    basicCode: `summary = orders.groupby("category")["order_value"].agg(["mean", "median", "count"]).round(1)
display(summary)
fig, ax = plt.subplots(figsize=(8, 4.2))
sns.barplot(data=orders, x="category", y="order_value", errorbar=None, color="#1a73e8", ax=ax)
ax.set(title="品类平均客单价", xlabel="品类", ylabel="平均客单价（元）")
fig.tight_layout()
plt.show()`,
    advancedCode: `fig, ax = plt.subplots(figsize=(9, 4.5))
sns.barplot(data=orders, x="category", y="order_value", hue="channel", estimator="mean", errorbar=("ci", 90), palette="colorblind", ax=ax)
ax.set(title="分渠道比较品类客单价", xlabel="品类", ylabel="平均客单价（元）")
ax.legend(title="渠道", frameon=False)
fig.tight_layout()
plt.show()`,
    practice: `fig, ax = plt.subplots(figsize=(8, 4.2))
sns.barplot(data=orders, x="region", y="items", estimator="mean", errorbar="sd", color="#188038", ax=ax)
ax.set(title="区域平均购买件数及标准差", xlabel="区域", ylabel="件数")
fig.tight_layout()
plt.show()`
  }),
  39: chart({
    summary: "用点和连接线比较类别估计值，突出差异方向与交互模式。",
    when: "比较多个类别或两个因素下的均值趋势，不需要柱形面积。",
    dataShape: "一至两个分类变量和一个数值变量。",
    parameters: ["estimator：点估计", "errorbar：误差", "dodge：分组错位", "markers/linestyles：样式"],
    interpretation: "读取点的位置和组间斜率；非平行线可能提示因素交互。",
    pitfalls: ["把类别间连接线解释为连续时间", "类别顺序没有业务意义", "多组线条难以辨认"],
    practiceTask: `运行基础图表后，完成以下任务：

1. 将 dodge=0.25 改为 dodge=0，观察分组错位与重叠显示的差异
2. 修改 markers 参数从 ["o", "s", "^"] 为 ["D", "v", "p"]，对比不同标记形状的区分度
3. 调整 linestyles 从 ["-", "--", ":"] 为全部 "-"，说明线型对多组区分的作用`,
    basicCode: `fig, ax = plt.subplots(figsize=(8, 4.2))
sns.pointplot(data=orders, x="category", y="order_value", errorbar=("ci", 90), color="#1a73e8", ax=ax)
ax.set(title="品类客单价点估计", xlabel="品类", ylabel="平均客单价（元）")
fig.tight_layout()
plt.show()`,
    advancedCode: `fig, ax = plt.subplots(figsize=(9, 4.5))
sns.pointplot(data=orders, x="category", y="order_value", hue="channel", dodge=0.25, markers=["o", "s", "^"], linestyles=["-", "--", ":"], errorbar=None, palette="colorblind", ax=ax)
ax.set(title="渠道与品类客单价模式", xlabel="品类", ylabel="平均客单价（元）")
ax.legend(title="渠道", frameon=False)
fig.tight_layout()
plt.show()`,
    practice: `fig, ax = plt.subplots(figsize=(8, 4.2))
sns.pointplot(data=orders, x="region", y="items", hue="satisfied", dodge=0.2, errorbar=None, palette=["#188038", "#f9ab00"], ax=ax)
ax.set(title="区域购买件数与评价", xlabel="区域", ylabel="平均件数")
ax.legend(title="评价", frameon=False)
fig.tight_layout()
plt.show()`
  }),
  40: chart({
    summary: "用Seaborn箱线图比较分类组的中位数、四分位距和潜在异常。",
    when: "分类变量下比较连续数值分布。",
    dataShape: "长表中的一列分类变量和一列连续数值。",
    parameters: ["whis：须", "hue：子分组", "order：类别顺序", "showfliers：异常点"],
    interpretation: "比较中位数、箱体宽度和须外点；结合原始散点判断样本密度。",
    pitfalls: ["只看中位数忽略离散程度", "样本很少仍隐藏原始点", "须外点直接视为错误"],
    practiceTask: `运行基础图表后，完成以下任务：

1. 添加 showfliers=False 参数，对比显示与隐藏异常点的视觉效果
2. 修改 whis 参数从默认 1.5 为 3.0，观察须范围变化对异常点数量的影响
3. 移除 hue="category" 参数，对比分组与不分组箱线图的信息密度`,
    basicCode: `fig, ax = plt.subplots(figsize=(8, 4.5))
sns.boxplot(data=orders, x="category", y="order_value", hue="category", palette="Set2", legend=False, ax=ax)
ax.set(title="品类客单价分布", xlabel="品类", ylabel="客单价（元）")
fig.tight_layout()
plt.show()`,
    advancedCode: `fig, ax = plt.subplots(figsize=(9, 4.8))
sns.boxplot(data=orders, x="region", y="order_value", hue="channel", palette="colorblind", ax=ax)
ax.set(title="区域与渠道客单价分布", xlabel="区域", ylabel="客单价（元）")
ax.legend(title="渠道", frameon=False, ncol=3)
fig.tight_layout()
plt.show()`,
    practice: `fig, ax = plt.subplots(figsize=(8.5, 4.5))
sns.boxplot(data=orders, x="satisfied", y="order_value", hue="category", palette="Set2", ax=ax)
ax.set(title="评价与客单价分布", xlabel="评价", ylabel="客单价（元）")
ax.legend(title="品类", frameon=False)
fig.tight_layout()
plt.show()`
  }),
  41: chart({
    summary: "用小提琴图展示分类组的平滑密度形状和中心信息。",
    when: "样本量足够，希望比较多峰、偏态或尾部形状。",
    dataShape: "每组包含较多连续数值观察。",
    parameters: ["inner：内部摘要", "cut：密度延伸", "bw_adjust：带宽", "split：二分类对称拆分"],
    interpretation: "宽处表示估计密度较高；形状受带宽影响，不等于实际频数。",
    pitfalls: ["小样本产生误导性平滑形状", "不说明每组样本量", "不同组独立归一化却比较绝对宽度"],
    practiceTask: `运行基础图表后，完成以下任务：

1. 将 inner="quart" 改为 inner="box"，对比四分位线与箱线摘要的显示效果
2. 调整 bw_adjust 参数（如 0.5 或 2.0），说明带宽对密度曲线平滑度的影响
3. 修改 cut 参数从 0 为 2，观察密度曲线在数据范围外的延伸变化`,
    basicCode: `fig, ax = plt.subplots(figsize=(8, 4.6))
sns.violinplot(data=orders, x="category", y="order_value", hue="category", palette="Set2", legend=False, inner="quart", cut=0, ax=ax)
ax.set(title="品类客单价密度", xlabel="品类", ylabel="客单价（元）")
fig.tight_layout()
plt.show()`,
    advancedCode: `two_channels = orders[orders["channel"].isin(["自然流量", "广告"])]
fig, ax = plt.subplots(figsize=(9, 4.8))
sns.violinplot(data=two_channels, x="category", y="order_value", hue="channel", split=True, inner="quart", cut=0, palette=["#1a73e8", "#f9ab00"], ax=ax)
ax.set(title="自然流量与广告客单价密度", xlabel="品类", ylabel="客单价（元）")
ax.legend(title="渠道", frameon=False)
fig.tight_layout()
plt.show()`,
    practice: `fig, ax = plt.subplots(figsize=(8, 4.5))
sns.violinplot(data=orders, x="region", y="items", hue="region", legend=False, inner="box", cut=0, palette="pastel", ax=ax)
ax.set(title="区域购买件数分布", xlabel="区域", ylabel="件数")
fig.tight_layout()
plt.show()`
  }),
  42: chart({
    summary: "用轻微抖动展示分类组中的每一个原始观察。",
    when: "样本量中小，需要保留真实点并查看重叠和离群。",
    dataShape: "分类变量与数值变量，每行一条观察。",
    parameters: ["jitter：水平抖动", "size：点大小", "alpha：透明度", "dodge：hue错位"],
    interpretation: "读取点密度、范围和异常值；抖动只改变显示位置，不改变数据。",
    pitfalls: ["点太多造成黑块", "抖动过大导致类别边界模糊", "不透明点遮挡重叠"],
    practiceTask: `运行基础图表后，完成以下任务：

1. 将 jitter 参数从 0.22 改为 0.05 或 0.4，观察抖动幅度对点分散程度的影响
2. 调整 alpha 参数（如 0.3 或 0.9），说明透明度对重叠点可见性的作用
3. 修改 dodge=True 为 dodge=False，对比分组错位与叠加显示的视觉效果`,
    basicCode: `sample = orders.sample(120, random_state=42)
fig, ax = plt.subplots(figsize=(8, 4.5))
sns.stripplot(data=sample, x="category", y="order_value", jitter=0.22, alpha=0.55, color="#1a73e8", ax=ax)
ax.set(title="品类客单价原始观察", xlabel="品类", ylabel="客单价（元）")
fig.tight_layout()
plt.show()`,
    advancedCode: `sample = orders.sample(150, random_state=420)
fig, ax = plt.subplots(figsize=(9, 4.8))
sns.stripplot(data=sample, x="category", y="order_value", hue="channel", dodge=True, jitter=0.18, alpha=0.6, palette="colorblind", ax=ax)
ax.set(title="分渠道展示原始订单", xlabel="品类", ylabel="客单价（元）")
ax.legend(title="渠道", frameon=False)
fig.tight_layout()
plt.show()`,
    practice: `sample = orders.sample(100, random_state=421)
fig, ax = plt.subplots(figsize=(8, 4.5))
sns.boxplot(data=sample, x="region", y="order_value", color="white", showfliers=False, ax=ax)
sns.stripplot(data=sample, x="region", y="order_value", color="#188038", alpha=0.5, jitter=0.2, ax=ax)
ax.set(title="箱线摘要与原始点", xlabel="区域", ylabel="客单价（元）")
fig.tight_layout()
plt.show()`
  }),
  43: chart({
    summary: "用无重叠蜂群布局展示分类组内的原始点和局部密度。",
    when: "样本量不大，需要避免点重叠并观察实际分布。",
    dataShape: "分类变量与数值变量；通常每组不超过数百点。",
    parameters: ["size：点大小", "hue：分组", "dodge：错位", "warn_thresh：拥挤警告"],
    interpretation: "横向展开宽度反映局部点密度，每个点仍是一条真实观察。",
    pitfalls: ["大样本渲染慢", "点过大无法完成布局", "把横向位置当成数据值"],
    practiceTask: `运行基础图表后，完成以下任务：

1. 将 size 参数从 4 改为 6 或 2，观察点大小对蜂群布局密度的影响
2. 修改 dodge=True 为 dodge=False，对比分组错位与叠加的横向展开效果
3. 移除 violinplot 背景层，只保留 swarmplot，说明蜂群图单独使用时的信息完整性`,
    basicCode: `sample = orders.sample(90, random_state=43)
fig, ax = plt.subplots(figsize=(8, 4.5))
sns.swarmplot(data=sample, x="category", y="order_value", hue="category", palette="Set2", legend=False, size=4, ax=ax)
ax.set(title="品类客单价蜂群图", xlabel="品类", ylabel="客单价（元）")
fig.tight_layout()
plt.show()`,
    advancedCode: `sample = orders.sample(120, random_state=430)
fig, ax = plt.subplots(figsize=(9, 4.8))
sns.violinplot(data=sample, x="category", y="order_value", color="#e8eaed", inner=None, cut=0, ax=ax)
sns.swarmplot(data=sample, x="category", y="order_value", hue="satisfied", palette=["#188038", "#f9ab00"], size=3.5, ax=ax)
ax.set(title="密度轮廓与真实订单", xlabel="品类", ylabel="客单价（元）")
ax.legend(title="评价", frameon=False)
fig.tight_layout()
plt.show()`,
    practice: `sample = orders.sample(75, random_state=431)
fig, ax = plt.subplots(figsize=(8, 4.5))
sns.swarmplot(data=sample, x="region", y="items", hue="channel", dodge=True, size=4, palette="colorblind", ax=ax)
ax.set(title="区域购买件数蜂群图", xlabel="区域", ylabel="件数")
ax.legend(title="渠道", frameon=False)
fig.tight_layout()
plt.show()`
  }),
  44: chart({
    summary: "用histplot在Seaborn中完成分组、堆积和密度直方图。",
    when: "探索连续变量分布，并需要通过hue比较类别。",
    dataShape: "连续数值列，可配合一列分类变量。",
    parameters: ["bins/binwidth：分箱", "stat：频数或密度", "multiple：layer/stack/fill", "element：bars/step/poly"],
    interpretation: "比较中心、偏态和尾部；相同分箱边界是组间比较前提。",
    pitfalls: ["不同组样本量不等却比较频数", "堆积后难以看清小组形状", "同时打开过多视觉选项"],
    practiceTask: `运行基础图表后，完成以下任务：

1. 将 bins 参数从 18 改为 12 或 25，观察分箱数量对分布细节的影响
2. 修改 stat="density" 为 stat="probability"，对比密度与概率的纵轴含义
3. 调整 multiple="fill" 为 multiple="stack"，说明填充与堆积对组间比较的差异`,
    basicCode: `fig, ax = plt.subplots(figsize=(8, 4.3))
sns.histplot(data=orders, x="order_value", bins=18, color="#1a73e8", ax=ax)
ax.set(title="订单金额直方图", xlabel="客单价（元）", ylabel="订单数")
fig.tight_layout()
plt.show()`,
    advancedCode: `fig, ax = plt.subplots(figsize=(8.5, 4.5))
sns.histplot(data=orders, x="order_value", hue="category", bins=18, stat="density", common_norm=False, element="step", fill=False, palette="colorblind", ax=ax)
ax.set(title="品类客单价密度对比", xlabel="客单价（元）", ylabel="密度")
fig.tight_layout()
plt.show()`,
    practice: `fig, ax = plt.subplots(figsize=(8.5, 4.5))
sns.histplot(data=marketing, x="conversion", hue="channel", bins=16, multiple="fill", palette="colorblind", ax=ax)
ax.set(title="不同转化率区间的渠道构成", xlabel="转化率", ylabel="渠道构成比例")
fig.tight_layout()
plt.show()`
  }),
  45: chart({
    summary: "用核密度估计平滑展示分布，并理解带宽和边界的影响。",
    when: "样本量较充足，希望比较连续分布的整体形状。",
    dataShape: "连续数值样本；分组KDE要求每组有足够且不完全相同的数值。",
    parameters: ["bw_adjust：带宽", "fill：填充", "common_norm：共同归一化", "cut：边界延伸"],
    interpretation: "曲线面积表示概率密度，峰高不是样本数；用不同带宽检查峰形稳定性。",
    pitfalls: ["小样本使用KDE", "边界外出现不可能值", "把平滑峰当作真实分组"],
    practiceTask: `运行基础图表后，完成以下任务：

1. 将 bw_adjust 参数从 0.9 改为 0.5 或 1.5，观察带宽对密度曲线平滑度的影响
2. 修改 common_norm=False 为 common_norm=True，对比独立归一化与共同归一化的曲线高度
3. 调整 cut 参数从 0 为 3，说明边界延伸对密度估计范围的影响`,
    basicCode: `import scipy

fig, ax = plt.subplots(figsize=(8, 4.3))
sns.kdeplot(data=orders, x="order_value", fill=True, color="#1a73e8", cut=0, ax=ax)
ax.set(title="订单金额核密度", xlabel="客单价（元）", ylabel="密度")
fig.tight_layout()
plt.show()`,
    advancedCode: `fig, ax = plt.subplots(figsize=(8.5, 4.5))
sns.kdeplot(data=orders, x="order_value", hue="category", common_norm=False, bw_adjust=0.9, cut=0, linewidth=2, palette="colorblind", ax=ax)
ax.set(title="品类客单价密度", xlabel="客单价（元）", ylabel="密度")
fig.tight_layout()
plt.show()`,
    practice: `fig, axes = plt.subplots(1, 2, figsize=(10, 4))
sns.kdeplot(data=marketing, x="sales", bw_adjust=0.45, color="#188038", ax=axes[0])
axes[0].set(title="较小带宽")
sns.kdeplot(data=marketing, x="sales", bw_adjust=1.6, color="#188038", ax=axes[1])
axes[1].set(title="较大带宽")
fig.tight_layout()
plt.show()`
  }),
  46: chart({
    summary: "用ECDF直接展示小于等于某值的样本比例，无需选择分箱或带宽。",
    when: "比较分位数、阈值覆盖率或不同组的完整累计分布。",
    dataShape: "一列连续数值，可按类别分组。",
    parameters: ["stat：proportion/count", "complementary：互补累计", "hue：分组", "weights：权重"],
    interpretation: "在任意X值读取累计比例，或在给定比例处读取分位值。",
    pitfalls: ["不理解阶梯线含义", "组间样本量不等时比较count", "把陡峭部分解释为时间变化"],
    practiceTask: `运行基础图表后，完成以下任务：

1. 将 complementary=False 改为 complementary=True，对比累计分布与互补累计分布的曲线方向
2. 修改 stat="proportion" 为 stat="count"，观察比例与计数的纵轴差异
3. 在图上添加 axvline 标记特定分位数（如中位数位置），说明ECDF在分位数读取中的作用`,
    basicCode: `fig, ax = plt.subplots(figsize=(8, 4.3))
sns.ecdfplot(data=orders, x="order_value", color="#1a73e8", ax=ax)
ax.axhline(0.5, color="#9aa0a6", linestyle="--")
ax.set(title="订单金额累计分布", xlabel="客单价（元）", ylabel="累计比例")
fig.tight_layout()
plt.show()`,
    advancedCode: `fig, ax = plt.subplots(figsize=(8.5, 4.5))
sns.ecdfplot(data=orders, x="order_value", hue="category", palette="colorblind", ax=ax)
ax.axvline(300, color="#d93025", linestyle="--", label="300元阈值")
ax.set(title="品类客单价累计分布", xlabel="客单价（元）", ylabel="累计比例")
fig.tight_layout()
plt.show()`,
    practice: `fig, ax = plt.subplots(figsize=(8.5, 4.5))
sns.ecdfplot(data=marketing, x="conversion", hue="channel", complementary=True, palette="colorblind", ax=ax)
ax.set(title="转化率超过阈值的比例", xlabel="转化率阈值", ylabel="超过阈值的比例")
fig.tight_layout()
plt.show()`
  }),
  47: chart({
    summary: "使用scatterplot把位置、颜色、大小和样式映射到DataFrame列。",
    when: "检查两个数值变量关系，并同时观察分类或第三个数值变量。",
    dataShape: "每行一条观察，至少两列数值，可增加类别和大小字段。",
    parameters: ["hue：颜色", "size：点面积", "style：点形", "alpha：透明度"],
    interpretation: "先看整体关系，再比较颜色组、点大小和异常观察。",
    pitfalls: ["同时使用过多映射", "点大小范围过大", "图例覆盖数据"],
    practiceTask: `运行基础图表后，完成以下任务：

1. 将 sizes=(20, 180) 改为 sizes=(40, 120)，观察气泡大小范围对可读性的影响
2. 调整 alpha 参数（如 0.4 或 0.9），说明透明度对重叠点显示的作用
3. 移除 style="channel" 参数，对比形状映射与纯颜色映射的信息密度`,
    basicCode: `fig, ax = plt.subplots(figsize=(8, 4.6))
sns.scatterplot(data=marketing, x="visits", y="sales", hue="channel", alpha=0.7, palette="colorblind", ax=ax)
ax.set(title="访问量与销售额", xlabel="访问量", ylabel="销售额")
ax.legend(title="渠道", frameon=False)
fig.tight_layout()
plt.show()`,
    advancedCode: `fig, ax = plt.subplots(figsize=(9, 5))
sns.scatterplot(data=marketing, x="visits", y="sales", hue="channel", size="ad_spend", sizes=(20, 180), style="channel", alpha=0.7, palette="colorblind", ax=ax)
ax.set(title="访问量、销售额与广告投入", xlabel="访问量", ylabel="销售额")
ax.legend(title="渠道 / 广告投入", frameon=False, bbox_to_anchor=(1.02, 1), loc="upper left")
fig.tight_layout()
plt.show()`,
    practice: `fig, ax = plt.subplots(figsize=(8.5, 4.8))
sns.scatterplot(data=orders, x="items", y="order_value", hue="category", style="satisfied", alpha=0.65, palette="colorblind", ax=ax)
ax.set(title="购买件数与客单价", xlabel="购买件数", ylabel="客单价（元）")
ax.legend(frameon=False, bbox_to_anchor=(1.02, 1), loc="upper left")
fig.tight_layout()
plt.show()`
  }),
  48: chart({
    summary: "用lineplot对重复观察进行统计聚合并显示时间趋势和误差。",
    when: "时间或有序X轴上，每个位置存在多条观察，需要展示均值与不确定性。",
    dataShape: "长表，一列有序X、一列数值Y，可增加分组列。",
    parameters: ["estimator：聚合函数", "errorbar：误差", "units：个体线", "sort：排序"],
    interpretation: "默认线是各X位置的均值，阴影是误差区间；先确认聚合口径。",
    pitfalls: ["把聚合线当成单个真实序列", "日期未排序", "误差阴影含义不清"],
    practiceTask: `运行基础图表后，完成以下任务：

1. 将 errorbar=None 改为 errorbar="sd" 或 errorbar=("ci", 95)，观察误差区间的显示
2. 修改 estimator 为 "median"，对比均值线与中位数线的趋势差异
3. 添加 markers=False 参数，说明标记点对时间序列可读性的作用`,
    basicCode: `fig, ax = plt.subplots(figsize=(8.5, 4.3))
sns.lineplot(data=daily, x="date", y="sales", errorbar=None, color="#1a73e8", marker="o", ax=ax)
ax.set(title="每日平均销售额", xlabel="日期", ylabel="销售额")
ax.tick_params(axis="x", rotation=30)
fig.tight_layout()
plt.show()`,
    advancedCode: `fig, ax = plt.subplots(figsize=(9, 4.5))
sns.lineplot(data=daily, x="date", y="sales", hue="region", marker="o", errorbar=None, palette="colorblind", ax=ax)
ax.set(title="区域每日销售趋势", xlabel="日期", ylabel="销售额")
ax.legend(title="区域", frameon=False)
ax.tick_params(axis="x", rotation=30)
fig.tight_layout()
plt.show()`,
    practice: `weekly = daily.copy()
weekly["day"] = weekly["date"].dt.day
fig, ax = plt.subplots(figsize=(8.5, 4.3))
sns.lineplot(data=weekly, x="day", y="sales", hue="region", style="region", markers=True, dashes=False, errorbar=None, ax=ax)
ax.set(title="按日序号比较区域趋势", xlabel="日", ylabel="销售额")
ax.legend(frameon=False)
fig.tight_layout()
plt.show()`
  }),
  49: chart({
    summary: "通过regplot和lmplot叠加回归趋势，检查线性关系和分组差异。",
    when: "需要描述两个数值变量的拟合方向，而不是证明因果。",
    dataShape: "两列数值；lmplot可增加分类分组和分面。",
    parameters: ["order：多项式阶数", "robust：稳健拟合", "ci：区间", "scatter_kws/line_kws：样式"],
    interpretation: "读取斜率方向、散点离散和区间；检查异常点是否主导拟合。",
    pitfalls: ["把回归线解释为因果", "忽略非线性和异方差", "只展示拟合线不展示原始点"],
    practiceTask: `运行基础图表后，完成以下任务：

1. 将 order=1 改为 order=2，观察线性与二次多项式拟合的曲线差异
2. 修改 ci=95 为 ci=None，对比显示与隐藏置信区间的视觉效果
3. 添加 robust=True 参数，说明稳健拟合对异常点的抗性`,
    basicCode: `fig, ax = plt.subplots(figsize=(8, 4.5))
sns.regplot(data=marketing, x="visits", y="sales", scatter_kws={"alpha": 0.45, "s": 25}, line_kws={"color": "#d93025"}, ax=ax)
ax.set(title="访问量与销售额线性趋势", xlabel="访问量", ylabel="销售额")
fig.tight_layout()
plt.show()`,
    advancedCode: `grid = sns.lmplot(data=marketing, x="visits", y="sales", hue="channel", col="channel", col_wrap=3, height=3.2, scatter_kws={"alpha": 0.4, "s": 22}, palette="colorblind")
grid.set_axis_labels("访问量", "销售额")
grid.set_titles("{col_name}")
grid.fig.suptitle("分渠道回归趋势", y=1.04)
plt.show()`,
    practice: `fig, ax = plt.subplots(figsize=(8, 4.5))
sns.regplot(data=marketing, x="ad_spend", y="sales", order=2, scatter_kws={"alpha": 0.4, "s": 24}, line_kws={"color": "#188038"}, ax=ax)
ax.set(title="广告投入与销售额的非线性趋势检查", xlabel="广告投入", ylabel="销售额")
fig.tight_layout()
plt.show()`
  }),
  50: chart({
    summary: "用jointplot同时展示两个变量关系及各自边缘分布。",
    when: "深入检查一对数值变量的联合关系和单变量分布。",
    dataShape: "两列连续数值，可增加hue分类。",
    parameters: ["kind：scatter/hex/kde/reg/hist", "marginal_kws：边缘设置", "height：尺寸", "ratio：主图比例"],
    interpretation: "中心图读取关系，边缘图读取各变量分布；两部分应结合解释。",
    pitfalls: ["只看中心趋势忽略边缘偏态", "大样本散点过度重叠", "不适合一次比较很多变量"],
    practiceTask: `运行基础图表后，完成以下任务：

1. 将 kind="scatter" 改为 kind="kde" 或 kind="reg"，对比不同中心图类型的信息展示
2. 修改 height 参数从 6 改为 8，观察整体图形尺寸对可读性的影响
3. 调整 ratio 参数（如设为 3），说明主图与边缘图比例对布局的影响`,
    basicCode: `grid = sns.jointplot(data=marketing, x="visits", y="sales", kind="scatter", height=6, joint_kws={"alpha": 0.45, "s": 24}, color="#1a73e8")
grid.set_axis_labels("访问量", "销售额")
grid.fig.suptitle("访问量与销售额联合分布", y=1.02)
plt.show()`,
    advancedCode: `grid = sns.jointplot(data=marketing, x="visits", y="sales", hue="channel", height=7, palette="colorblind", joint_kws={"alpha": 0.45, "s": 24})
grid.set_axis_labels("访问量", "销售额")
grid.fig.suptitle("分渠道联合分布", y=1.02)
plt.show()`,
    practice: `grid = sns.jointplot(data=marketing, x="ad_spend", y="conversion", kind="hex", height=6, color="#188038")
grid.set_axis_labels("广告投入", "转化率")
grid.fig.suptitle("广告投入与转化率六边形密度", y=1.02)
plt.show()`
  }),
  51: chart({
    summary: "用pairplot和PairGrid快速筛查多个数值变量的成对关系。",
    when: "探索阶段同时检查少量数值变量的分布、相关和分组结构。",
    dataShape: "多个数值列，可增加一列分类hue；建议先抽样。",
    parameters: ["vars：选择变量", "corner：下三角", "diag_kind：对角图", "plot_kws：点样式"],
    interpretation: "沿对角线看单变量分布，非对角线看成对关系；再选择重点关系制作最终图。",
    pitfalls: ["变量过多产生巨大矩阵", "大样本不抽样", "把探索矩阵直接作为最终报告"],
    practiceTask: `运行基础图表后，完成以下任务：

1. 将 corner=True 改为 corner=False，观察完整矩阵与下三角矩阵的信息冗余度
2. 修改 diag_kind="hist" 为 diag_kind="kde"，对比直方图与密度图在对角线的显示效果
3. 调整 plot_kws 中的 alpha 参数（如 0.3 或 0.7），说明透明度对多变量散点图的作用`,
    basicCode: `sample = marketing.sample(150, random_state=51)
grid = sns.pairplot(sample, vars=["visits", "ad_spend", "sales", "conversion"], corner=True, diag_kind="hist", plot_kws={"alpha": 0.45, "s": 22})
grid.fig.suptitle("营销指标成对关系", y=1.02)
plt.show()`,
    advancedCode: `sample = marketing.sample(160, random_state=510)
grid = sns.pairplot(sample, vars=["visits", "ad_spend", "sales"], hue="channel", corner=True, diag_kind="hist", palette="colorblind", plot_kws={"alpha": 0.5, "s": 24})
grid.fig.suptitle("分渠道营销指标关系", y=1.02)
plt.show()`,
    practice: `sample = orders.sample(140, random_state=511)
grid = sns.pairplot(sample, vars=["order_value", "items"], hue="category", diag_kind="hist", palette="Set2", plot_kws={"alpha": 0.55, "s": 25})
grid.fig.suptitle("订单指标与品类", y=1.02)
plt.show()`
  }),
  52: chart({
    summary: "用颜色矩阵展示相关系数、透视表或任意二维数值。",
    when: "比较行×列组合或压缩读取数值矩阵。",
    dataShape: "二维矩阵或可透视成长×宽矩阵的长表。",
    parameters: ["annot：标注", "fmt：格式", "cmap：色盘", "center/vmin/vmax：色阶"],
    interpretation: "先读色阶含义，再找极值、带状结构和异常组合。",
    pitfalls: ["色阶范围随数据变化无法跨图比较", "相关矩阵使用单向色盘", "标注过密"],
    practiceTask: `运行基础图表后，完成以下任务：

1. 将 cmap="vlag" 改为 cmap="coolwarm" 或 "RdBu_r"，对比不同发散色盘的视觉效果
2. 修改 center=0 为不设置 center，观察色阶中心对相关矩阵显示的影响
3. 调整 fmt=".2f" 为 fmt=".0f"，说明标注精度对数值可读性的作用`,
    basicCode: `corr = marketing[["visits", "ad_spend", "sales", "conversion"]].corr()
mask = np.triu(np.ones_like(corr, dtype=bool), k=1)
fig, ax = plt.subplots(figsize=(7, 5))
sns.heatmap(corr, mask=mask, annot=True, fmt=".2f", cmap="vlag", center=0, vmin=-1, vmax=1, square=True, ax=ax)
ax.set_title("营销指标相关系数")
fig.tight_layout()
plt.show()`,
    advancedCode: `pivot = orders.pivot_table(index="region", columns="category", values="order_value", aggfunc="mean")
fig, ax = plt.subplots(figsize=(7.5, 4))
sns.heatmap(pivot, annot=True, fmt=".0f", cmap="Blues", linewidths=0.5, cbar_kws={"label": "平均客单价（元）"}, ax=ax)
ax.set(title="区域与品类客单价", xlabel="品类", ylabel="区域")
fig.tight_layout()
plt.show()`,
    practice: `counts = pd.crosstab(orders["region"], orders["channel"])
fig, ax = plt.subplots(figsize=(7.5, 4))
sns.heatmap(counts, annot=True, fmt="d", cmap="YlGnBu", linewidths=0.5, ax=ax)
ax.set(title="区域与渠道订单量", xlabel="渠道", ylabel="区域")
fig.tight_layout()
plt.show()`
  }),
  53: chart({
    summary: "用层次聚类重新排列矩阵，发现相似行列和潜在群组。",
    when: "行列数量较多，希望按相似模式自动分组。",
    dataShape: "行和列均为可比较的数值矩阵；通常需要标准化。",
    parameters: ["z_score/standard_scale：标准化", "method：连接方法", "metric：距离", "row_cluster/col_cluster：聚类方向"],
    interpretation: "树状图表达合并顺序和距离，色块表达标准化后的相对模式。",
    pitfalls: ["量纲不同却不标准化", "把聚类结果当作唯一真实分类", "样本太少或缺失太多"],
    practiceTask: `运行基础图表后，完成以下任务：

1. 将 z_score=1 改为 standard_scale=0，对比按列标准化与按行标准化的聚类结果
2. 修改 row_cluster=True 为 row_cluster=False，观察禁用行聚类对树状图的影响
3. 调整 method 参数（如 'average' 或 'complete'），说明不同连接方法对聚类结构的影响`,
    basicCode: `import scipy

category_region = orders.pivot_table(index="category", columns="region", values="order_value", aggfunc="mean")
grid = sns.clustermap(category_region, cmap="Blues", annot=True, fmt=".0f", figsize=(7, 6), row_cluster=True, col_cluster=True)
grid.fig.suptitle("品类与区域客单价聚类", y=1.02)
plt.show()`,
    advancedCode: `profile = marketing.groupby("channel")[["visits", "ad_spend", "sales", "conversion"]].mean()
grid = sns.clustermap(profile, z_score=1, cmap="vlag", center=0, annot=True, fmt=".2f", figsize=(8, 6))
grid.fig.suptitle("渠道指标标准化聚类", y=1.02)
plt.show()`,
    practice: `region_profile = orders.groupby("region").agg(order_value=("order_value", "mean"), items=("items", "mean"))
grid = sns.clustermap(region_profile, standard_scale=1, cmap="YlGnBu", annot=True, fmt=".2f", figsize=(7, 5))
grid.fig.suptitle("区域订单特征聚类", y=1.02)
plt.show()`
  }),
  54: chart({
    summary: "使用FacetGrid、catplot和relplot把类别映射为可比较的小图。",
    when: "一个图过于拥挤，需要按行列分组重复相同图形。",
    dataShape: "长表，包含X、Y以及一至两个分面分类变量。",
    parameters: ["row/col：分面", "col_wrap：换行", "sharex/sharey：共享轴", "height/aspect：尺寸"],
    interpretation: "在共享坐标下比较模式、斜率和分布；同时检查每个面板样本量。",
    pitfalls: ["面板过多", "坐标不共享却直接比较高低", "分面和hue重复编码同一变量"],
    practiceTask: `运行基础图表后，完成以下任务：

1. 将 col_wrap=3 改为 col_wrap=2，观察分面换行对布局的影响
2. 修改 sharex=True 为 sharex=False，对比共享与独立X轴对子图比较的作用
3. 调整 aspect 参数（如 0.8 或 1.2），说明子图宽高比对可读性的影响`,
    basicCode: `grid = sns.relplot(data=marketing, x="visits", y="sales", col="channel", col_wrap=3, hue="channel", height=3.3, aspect=1, palette="colorblind", legend=False)
grid.set_axis_labels("访问量", "销售额")
grid.set_titles("{col_name}")
grid.fig.suptitle("分渠道访问量与销售额", y=1.04)
plt.show()`,
    advancedCode: `grid = sns.catplot(data=orders, x="category", y="order_value", col="region", kind="box", hue="category", palette="Set2", legend=False, height=3.5, aspect=0.9)
grid.set_axis_labels("品类", "客单价（元）")
grid.set_titles("{col_name}")
grid.fig.suptitle("分区域品类客单价", y=1.04)
plt.show()`,
    practice: `facet = sns.FacetGrid(daily, row="region", height=2.2, aspect=3, sharex=True, sharey=True, margin_titles=True)
facet.map_dataframe(sns.lineplot, x="date", y="sales", marker="o", errorbar=None, color="#1a73e8")
facet.set_axis_labels("日期", "销售额")
facet.set_titles(row_template="{row_name}")
facet.fig.subplots_adjust(top=0.9)
facet.fig.suptitle("区域每日销售趋势")
plt.show()`
  }),
  55: chart({
    summary: "理解Plotly Figure、Trace、Layout、交互模式和Hover信息。",
    when: "需要缩放、悬浮、图例筛选或导出独立HTML的交互图表。",
    dataShape: "优先使用长表；Plotly Express快速建图，Graph Objects精细控制。",
    parameters: ["data_frame：数据", "x/y：位置", "color：分组", "hover_data：悬浮信息"],
    interpretation: "Hover补充精确值，缩放帮助局部检查，图例可显示或隐藏序列。",
    pitfalls: ["把Hover当作唯一标签", "图表初始视图缺少结论", "在大数据上一次渲染过多点"],
    practiceTask: `运行基础图表后，完成以下任务：

1. 将 hovermode="x unified" 改为 hovermode="closest"，观察悬浮信息聚合方式的变化
2. 修改 template="plotly_white" 为 "plotly_dark"，对比不同模板的视觉风格
3. 修改 hovertemplate 自定义悬停信息格式，说明交互提示对精确读值的作用`,
    basicCode: `fig = px.line(monthly, x="month", y="sales", markers=True, title="Plotly Figure基础")
fig.update_layout(xaxis_title="月份", yaxis_title="销售额（万元)", hovermode="x unified")
fig.show()

print("Trace数量:", len(fig.data))
print("第一个Trace类型:", fig.data[0].type)`,
    advancedCode: `fig = go.Figure()
fig.add_trace(go.Scatter(x=monthly["month"], y=monthly["sales"], mode="lines+markers", name="销售额"))
fig.add_trace(go.Scatter(x=monthly["month"], y=monthly["profit"], mode="lines+markers", name="利润"))
fig.update_layout(title="Graph Objects多Trace示例", xaxis_title="月份", yaxis_title="金额（万元）", hovermode="x unified", template="plotly_white")
fig.show()`,
    practice: `fig = px.bar(regional, x="region", y="sales", color="channel", barmode="group", title="区域渠道销售")
fig.update_traces(hovertemplate="%{x}<br>销售额 %{y} 万元<extra>%{fullData.name}</extra>")
fig.update_layout(xaxis_title="区域", yaxis_title="销售额（万元）")
fig.show()`
  }),
  56: chart({
    summary: "用交互折线图查看时间趋势、多序列和Hover精确值。",
    when: "时间或有序阶段上的连续变化，并需要交互检查单点。",
    dataShape: "有序X列与一至多列Y；长表更适合color分组。",
    parameters: ["markers：观测点", "line_shape：线形", "hovermode：悬浮模式", "range_x/range_y：初始范围"],
    interpretation: "默认视图应表达总体趋势，Hover用于确认拐点和精确值。",
    pitfalls: ["月份字符串未显式排序", "序列单位不同仍放同一Y轴", "图例名称使用内部列名"],
    practiceTask: `运行基础图表后，完成以下任务：

1. 将 markers=True 改为 markers=False，观察数据点显示对趋势可读性的影响
2. 添加 line_shape="spline" 参数，对比折线与平滑曲线的视觉差异
3. 添加 hovertemplate 自定义悬停信息格式，说明交互提示对精确读值的作用`,
    basicCode: `fig = px.line(monthly, x="month", y="sales", markers=True, title="上半年销售额趋势")
fig.update_layout(xaxis_title="月份", yaxis_title="销售额（万元）", hovermode="x unified")
fig.show()`,
    advancedCode: `long = monthly.melt(id_vars="month", value_vars=["sales", "profit"], var_name="metric", value_name="value")
long["metric"] = long["metric"].map({"sales": "销售额", "profit": "利润"})
fig = px.line(long, x="month", y="value", color="metric", markers=True, title="销售额与利润趋势")
fig.update_layout(xaxis_title="月份", yaxis_title="金额（万元）", legend_title="指标", hovermode="x unified")
fig.show()`,
    practice: `indexed = monthly.copy()
indexed["销售额指数"] = indexed["sales"] / indexed["sales"].iloc[0] * 100
indexed["订单量指数"] = indexed["orders"] / indexed["orders"].iloc[0] * 100
long_index = indexed.melt(id_vars="month", value_vars=["销售额指数", "订单量指数"], var_name="指标", value_name="指数")
fig = px.line(long_index, x="month", y="指数", color="指标", markers=True, title="经营指标相对增长")
fig.add_hline(y=100, line_dash="dash", line_color="gray")
fig.show()`
  }),
  57: chart({
    summary: "用交互柱状图比较类别、分组和堆积构成。",
    when: "比较类别数值并需要Hover、图例筛选或排序。",
    dataShape: "类别列、数值列和可选分组列。",
    parameters: ["barmode：group/stack/relative", "orientation：方向", "text_auto：标签", "category_orders：顺序"],
    interpretation: "比较共享基线上的长度；通过图例暂时隐藏分组帮助检查。",
    pitfalls: ["类别顺序不稳定", "堆积图比较中间序列", "文字标签与Hover重复过多"],
    practiceTask: `运行基础图表后，完成以下任务：

1. 将 barmode="group" 改为 barmode="stack" 或 "relative"，对比分组、堆积与相对堆积布局
2. 添加 text_auto=True 参数，观察柱形数值标签的显示效果
3. 修改 hovertemplate 自定义悬停信息格式，说明交互提示对精确读值的作用`,
    basicCode: `totals = regional.groupby("region", as_index=False)["sales"].sum().sort_values("sales")
fig = px.bar(totals, x="sales", y="region", orientation="h", text_auto=True, title="区域总销售额")
fig.update_layout(xaxis_title="销售额（万元）", yaxis_title="区域")
fig.show()`,
    advancedCode: `fig = px.bar(regional, x="region", y="sales", color="channel", barmode="group", text_auto=True, title="区域渠道销售对比")
fig.update_layout(xaxis_title="区域", yaxis_title="销售额（万元）", legend_title="渠道")
fig.show()`,
    practice: `fig = px.bar(regional, x="region", y="sales", color="channel", barmode="stack", title="区域渠道销售构成")
fig.update_traces(hovertemplate="%{x}<br>%{fullData.name}: %{y} 万元<extra></extra>")
fig.update_layout(xaxis_title="区域", yaxis_title="销售额（万元）", legend_title="渠道")
fig.show()`
  }),
  58: chart({
    summary: "用交互散点图查看二维关系并通过Hover检查单个观察。",
    when: "分析两个数值变量关系，需要交互识别异常点。",
    dataShape: "两列数值和可选分类列；每行一条观察。",
    parameters: ["color：分类", "symbol：形状", "opacity：透明度", "hover_data：悬浮字段"],
    interpretation: "通过缩放查看密集区域，Hover确认异常观察的类别和精确值。",
    pitfalls: ["点太多导致前端卡顿", "Hover字段泄露无关或敏感信息", "只看局部缩放后忘记恢复全局"],
    practiceTask: `运行基础图表后，完成以下任务：

1. 将 opacity=0.7 改为 0.4 或 1.0，观察透明度对重叠点显示的影响
2. 添加 symbol="channel" 参数，对比颜色映射与形状映射的组合区分效果
3. 修改 hover_data 增加或移除字段，说明悬浮信息内容对交互检查的作用`,
    basicCode: `fig = px.scatter(orders, x="items", y="order_value", color="category", hover_data=["region", "channel"], opacity=0.7, title="购买件数与客单价")
fig.update_layout(xaxis_title="购买件数", yaxis_title="客单价（元）", legend_title="品类")
fig.show()`,
    advancedCode: `fig = px.scatter(orders, x="order_value", y="sales", color="region", symbol="channel", hover_name="category", opacity=0.65, title="客单价与订单销售额")
fig.update_layout(xaxis_title="客单价（元）", yaxis_title="订单销售额（元）", legend_title="区域 / 渠道")
fig.show()`,
    practice: `sample = orders.nlargest(80, "sales")
fig = px.scatter(sample, x="items", y="sales", color="category", hover_data={"order_value": ":.1f", "region": True}, title="高销售订单关系")
fig.update_layout(xaxis_title="购买件数", yaxis_title="订单销售额（元）")
fig.show()`
  }),
  59: chart({
    summary: "用气泡面积编码第三个数值变量，在二维位置上增加规模信息。",
    when: "同时比较X、Y和规模三个数值维度。",
    dataShape: "两列位置变量、一列非负大小变量和可选分类字段。",
    parameters: ["size：气泡面积", "size_max：最大直径", "color：分类或连续值", "hover_name：标识"],
    interpretation: "位置优先于面积读取；面积只适合粗略比较规模。",
    pitfalls: ["面积值跨度太大", "最小气泡不可见", "用半径而非面积造成视觉误导"],
    practiceTask: `运行基础图表后，完成以下任务：

1. 将 size_max 从 70 改为 40 或 100，观察气泡最大直径对规模区分的影响
2. 移除 text 参数改用 hover_name，对比常显标签与悬浮标识的可读性
3. 修改 hovertemplate 自定义悬停信息格式，说明交互提示对规模精确读值的作用`,
    basicCode: `category_summary = orders.groupby("category", as_index=False).agg(order_value=("order_value", "mean"), items=("items", "mean"), sales=("sales", "sum"))
fig = px.scatter(category_summary, x="items", y="order_value", size="sales", color="category", text="category", size_max=70, title="品类规模气泡图")
fig.update_layout(xaxis_title="平均购买件数", yaxis_title="平均客单价（元）", showlegend=False)
fig.show()`,
    advancedCode: `region_category = orders.groupby(["region", "category"], as_index=False).agg(order_value=("order_value", "mean"), items=("items", "mean"), sales=("sales", "sum"))
fig = px.scatter(region_category, x="items", y="order_value", size="sales", color="region", hover_name="category", size_max=60, title="区域品类经营规模")
fig.update_layout(xaxis_title="平均购买件数", yaxis_title="平均客单价（元）", legend_title="区域")
fig.show()`,
    practice: `channel_summary = orders.groupby("channel", as_index=False).agg(order_value=("order_value", "mean"), items=("items", "mean"), sales=("sales", "sum"))
fig = px.scatter(channel_summary, x="order_value", y="items", size="sales", color="channel", text="channel", size_max=75, title="渠道价值与规模")
fig.update_layout(xaxis_title="平均客单价（元）", yaxis_title="平均购买件数", showlegend=False)
fig.show()`
  }),
  60: chart({
    summary: "用交互面积图展示连续趋势的累计量或多类别构成。",
    when: "强调随时间变化的总量、区间或组成。",
    dataShape: "有序X、非负Y和可选分类列。",
    parameters: ["groupnorm：百分比归一化", "line_group：序列", "color：堆积层", "hovermode：悬浮"],
    interpretation: "顶部边界表示总量，各层厚度表示组成；Hover可查看某时点的精确值。",
    pitfalls: ["中间层难以比较", "序列有负值", "图例顺序与堆积顺序不一致"],
    practiceTask: `运行基础图表后，完成以下任务：

1. 将 groupnorm="fraction" 改为 groupnorm=None，对比百分比构成与绝对量堆积
2. 修改 hovermode="x unified" 为 "closest"，观察悬浮信息聚合方式的变化
3. 添加 hovertemplate 自定义悬停信息格式，说明交互提示对某时点精确值读取的作用`,
    basicCode: `fig = px.area(monthly, x="month", y="sales", markers=True, title="上半年销售额面积图")
fig.update_layout(xaxis_title="月份", yaxis_title="销售额（万元）", hovermode="x unified")
fig.show()`,
    advancedCode: `composition = pd.DataFrame({
    "month": np.repeat(monthly["month"], 3),
    "category": ["办公", "数码", "家居"] * len(monthly),
    "sales": [38, 52, 30, 42, 65, 41, 40, 60, 39, 48, 78, 50, 55, 92, 58, 59, 105, 64],
})
fig = px.area(composition, x="month", y="sales", color="category", title="品类销售构成")
fig.update_layout(xaxis_title="月份", yaxis_title="销售额（万元）", legend_title="品类", hovermode="x unified")
fig.show()`,
    practice: `share_data = regional.copy()
fig = px.area(share_data, x="region", y="sales", color="channel", groupnorm="fraction", title="区域渠道百分比构成")
fig.update_layout(xaxis_title="区域", yaxis_title="构成比例", legend_title="渠道")
fig.show()`
  }),
  61: chart({
    summary: "用交互直方图查看分布，并通过悬浮和图例比较分类组。",
    when: "探索连续变量的频数、密度和分组形状。",
    dataShape: "一列连续数值和可选分类列。",
    parameters: ["nbins：分箱数", "histnorm：归一化", "barmode：overlay/stack", "marginal：边缘图"],
    interpretation: "Hover显示每个分箱范围和数量；改变分箱确认分布结论稳定。",
    pitfalls: ["分组时分箱边界不一致", "图例筛选后忘记样本量改变", "过度依赖默认分箱"],
    practiceTask: `运行基础图表后，完成以下任务：

1. 将 nbins 从 20 改为 12 或 30，观察分箱数量对分布形状的影响
2. 修改 barmode="overlay" 为 "stack"，对比叠加与堆积对分组分布比较的作用
3. 添加 marginal="violin" 参数，观察边缘图对分布形状的补充展示`,
    basicCode: `fig = px.histogram(orders, x="order_value", nbins=20, title="订单金额分布")
fig.update_layout(xaxis_title="客单价（元）", yaxis_title="订单数", bargap=0.04)
fig.show()`,
    advancedCode: `fig = px.histogram(orders, x="order_value", color="category", nbins=20, barmode="overlay", opacity=0.6, histnorm="probability density", marginal="box", title="品类客单价分布")
fig.update_layout(xaxis_title="客单价（元）", yaxis_title="概率密度", legend_title="品类")
fig.show()`,
    practice: `fig = px.histogram(orders, x="items", color="channel", barmode="group", category_orders={"items": sorted(orders["items"].unique())}, title="渠道购买件数分布")
fig.update_layout(xaxis_title="购买件数", yaxis_title="订单数", legend_title="渠道")
fig.show()`
  }),
  62: chart({
    summary: "用交互箱线图比较分布摘要，并通过Hover查看具体异常值。",
    when: "比较类别组的中位数、离散程度和潜在异常。",
    dataShape: "一列分类和一列连续数值。",
    parameters: ["points：显示点", "notched：缺口", "color：分组", "hover_data：补充信息"],
    interpretation: "读取箱体、中位数和须；悬浮异常点确认其所属类别和字段。",
    pitfalls: ["点全部显示造成拥挤", "把异常点自动判为错误", "不同组样本量不可见"],
    practiceTask: `运行基础图表后，完成以下任务：

1. 将 points="outliers" 改为 points="all" 或 points=False，观察显示点数量的差异
2. 添加 notched=True 参数，对比缺口箱线图与标准箱线图的中位数比较效果
3. 修改 hover_data 增加补充字段，说明悬浮信息对异常点溯源的作用`,
    basicCode: `fig = px.box(orders, x="category", y="order_value", color="category", points="outliers", title="品类客单价箱线图")
fig.update_layout(xaxis_title="品类", yaxis_title="客单价（元）", showlegend=False)
fig.show()`,
    advancedCode: `fig = px.box(orders, x="region", y="order_value", color="channel", points="suspectedoutliers", notched=True, title="区域渠道客单价")
fig.update_layout(xaxis_title="区域", yaxis_title="客单价（元）", legend_title="渠道")
fig.show()`,
    practice: `fig = px.box(orders, x="category", y="items", color="region", points="all", title="品类购买件数分布")
fig.update_traces(jitter=0.25, pointpos=0)
fig.update_layout(xaxis_title="品类", yaxis_title="购买件数", legend_title="区域")
fig.show()`
  }),
  63: chart({
    summary: "用交互小提琴图展示平滑密度，并可同时显示箱线和原始点。",
    when: "样本量充足，需要比较分布形状、偏态和多峰。",
    dataShape: "分类列和连续数值列。",
    parameters: ["box：箱线摘要", "points：原始点", "violinmode：group/overlay", "spanmode：范围"],
    interpretation: "宽度是估计密度，Hover可查看具体点；必须结合样本量解释。",
    pitfalls: ["小样本密度不稳定", "多组叠加遮挡", "用宽度比较绝对样本量"],
    practiceTask: `运行基础图表后，完成以下任务：

1. 将 box=True 改为 box=False，观察内部箱线摘要对中心信息展示的影响
2. 修改 points="outliers" 为 points="all"，对比仅显示异常点与显示全部原始点
3. 将 violinmode="group" 改为 "overlay"，说明分组模式对多组密度比较的作用`,
    basicCode: `fig = px.violin(orders, x="category", y="order_value", color="category", box=True, points=False, title="品类客单价小提琴图")
fig.update_layout(xaxis_title="品类", yaxis_title="客单价（元）", showlegend=False)
fig.show()`,
    advancedCode: `fig = px.violin(orders, x="category", y="order_value", color="channel", box=True, points="outliers", violinmode="group", title="渠道与品类客单价密度")
fig.update_layout(xaxis_title="品类", yaxis_title="客单价（元）", legend_title="渠道")
fig.show()`,
    practice: `fig = px.violin(orders, x="region", y="items", color="region", box=True, points="all", title="区域购买件数分布")
fig.update_traces(jitter=0.15, marker_size=3)
fig.update_layout(xaxis_title="区域", yaxis_title="购买件数", showlegend=False)
fig.show()`
  }),
  64: chart({
    summary: "用交互热力图展示二维矩阵，并通过Hover读取精确行列组合。",
    when: "比较行×列数值矩阵或相关关系。",
    dataShape: "二维数组或透视后的DataFrame。",
    parameters: ["color_continuous_scale：色盘", "zmin/zmax：色阶", "text_auto：标注", "aspect：宽高"],
    interpretation: "先理解颜色范围，再通过Hover确认极值单元格。",
    pitfalls: ["色阶被异常值拉伸", "发散数据使用单向色盘", "行列顺序无业务逻辑"],
    practiceTask: `运行基础图表后，完成以下任务：

1. 将 color_continuous_scale="Blues" 改为 "Viridis" 或 "YlOrRd"，对比不同色盘的视觉效果
2. 修改 text_auto=".0f" 为 text_auto=False，观察单元格标注对精确读值的作用
3. 添加 zmin 和 zmax 固定色阶范围，说明固定色阶对跨图比较的意义`,
    basicCode: `matrix = orders.pivot_table(index="region", columns="category", values="sales", aggfunc="sum", fill_value=0)
fig = px.imshow(matrix, text_auto=".0f", color_continuous_scale="Blues", aspect="auto", title="区域品类销售额")
fig.update_layout(xaxis_title="品类", yaxis_title="区域", coloraxis_colorbar_title="销售额")
fig.show()`,
    advancedCode: `corr = orders[["order_value", "items", "sales"]].corr()
fig = px.imshow(corr, text_auto=".2f", color_continuous_scale="RdBu_r", zmin=-1, zmax=1, title="订单指标相关矩阵")
fig.update_layout(coloraxis_colorbar_title="相关系数")
fig.show()`,
    practice: `channel_region = orders.pivot_table(index="region", columns="channel", values="order_value", aggfunc="mean")
fig = px.imshow(channel_region, text_auto=".1f", color_continuous_scale="YlGnBu", aspect="auto", title="区域渠道平均客单价")
fig.update_layout(xaxis_title="渠道", yaxis_title="区域")
fig.show()`
  }),
  65: chart({
    summary: "用矩形面积表达层级节点规模，通过点击逐层下钻。",
    when: "展示具有父子层级的类别占比，并强调规模。",
    dataShape: "层级路径列和非负数值列。",
    parameters: ["path：层级路径", "values：面积", "color：颜色指标", "branchvalues：父子值规则"],
    interpretation: "矩形面积表示规模，嵌套表示父子关系；Hover确认精确值。",
    pitfalls: ["层级过深", "节点太多标签不可读", "面积和颜色同时编码无关指标"],
    practiceTask: `运行基础图表后，完成以下任务：

1. 修改 textinfo 从 "label+value+percent parent" 为 "label+percent root"，对比不同占比参考基准
2. 将 color 从连续指标改为分类字段（如 color="department"），观察颜色编码方式的变化
3. 添加 px.Constant 顶层节点包裹路径，说明统一根节点对层级完整性的作用`,
    basicCode: `fig = px.treemap(hierarchy, path=["department", "category"], values="sales", color="sales", color_continuous_scale="Blues", title="部门与品类销售结构")
fig.update_traces(textinfo="label+value+percent parent")
fig.show()`,
    advancedCode: `tree = orders.groupby(["region", "category"], as_index=False)["sales"].sum()
fig = px.treemap(tree, path=[px.Constant("全国"), "region", "category"], values="sales", color="region", title="全国区域品类销售结构")
fig.update_traces(root_color="#f1f3f4")
fig.show()`,
    practice: `channel_tree = orders.groupby(["channel", "category"], as_index=False)["sales"].sum()
fig = px.treemap(channel_tree, path=["channel", "category"], values="sales", color="sales", color_continuous_scale="Greens", title="渠道品类销售结构")
fig.show()`
  }),
  66: chart({
    summary: "用同心环展示层级路径和各层占比，并支持点击下钻。",
    when: "层级较浅，需要同时呈现父级和子级构成。",
    dataShape: "层级路径及非负数值。",
    parameters: ["path：层级", "values：扇区大小", "maxdepth：显示深度", "color：颜色"],
    interpretation: "内环是上级，外环是下级；角度表示相对规模。",
    pitfalls: ["层级和节点过多", "跨父级直接比较外环角度", "颜色与层级关系不清"],
    practiceTask: `运行基础图表后，完成以下任务：

1. 添加 maxdepth=2 参数，观察限制显示深度对多层旭日图的影响
2. 修改 textinfo 从 "label+percent parent" 为 "label+percent entry"，对比不同占比参考基准
3. 将 color 从分类字段改为数值指标（如 color="sales"），说明连续色阶对规模的编码作用`,
    basicCode: `fig = px.sunburst(hierarchy, path=["department", "category"], values="sales", color="department", title="部门与品类销售层级")
fig.update_traces(textinfo="label+percent parent")
fig.show()`,
    advancedCode: `sun = orders.groupby(["region", "channel", "category"], as_index=False)["sales"].sum()
fig = px.sunburst(sun, path=["region", "channel", "category"], values="sales", color="region", maxdepth=3, title="区域、渠道与品类结构")
fig.show()`,
    practice: `practice_sun = orders.groupby(["category", "region"], as_index=False)["sales"].sum()
fig = px.sunburst(practice_sun, path=[px.Constant("全部品类"), "category", "region"], values="sales", color="category", title="品类与区域销售层级")
fig.show()`
  }),
  67: chart({
    summary: "用漏斗宽度展示流程各阶段人数和转化损失。",
    when: "业务流程具有明确先后阶段，需要查看流失。",
    dataShape: "有序阶段列和人数或数量列。",
    parameters: ["orientation：方向", "textinfo：标签", "funnelmode：分组", "category_orders：阶段顺序"],
    interpretation: "计算阶段转化率和累计转化率，重点定位最大流失环节。",
    pitfalls: ["阶段不是同一批用户", "忽略时间窗口", "只看绝对流失不看转化率"],
    practiceTask: `运行基础图表后，完成以下任务：

1. 修改 textinfo 从 "value+percent initial+percent previous" 为 "value+percent previous"，对比整体转化率与相邻阶段转化率
2. 在分渠道漏斗中添加 hovertemplate 自定义悬停信息格式，查看各阶段精确人数
3. 将 color 映射为转化率指标，说明颜色编码对定位最大流失环节的作用`,
    basicCode: `fig = px.funnel(funnel, x="users", y="stage", title="用户转化漏斗")
fig.update_traces(textinfo="value+percent initial+percent previous")
fig.update_layout(xaxis_title="用户数", yaxis_title="阶段")
fig.show()`,
    advancedCode: `funnel_detail = pd.DataFrame({
    "stage": funnel["stage"].tolist() * 2,
    "channel": ["自然流量"] * len(funnel) + ["广告"] * len(funnel),
    "users": [7000, 4500, 2100, 1280, 1010, 5000, 2700, 1000, 570, 410],
})
fig = px.funnel(funnel_detail, x="users", y="stage", color="channel", title="分渠道转化漏斗")
fig.update_layout(xaxis_title="用户数", yaxis_title="阶段", legend_title="渠道")
fig.show()`,
    practice: `practice_funnel = funnel.copy()
practice_funnel["previous_rate"] = practice_funnel["users"] / practice_funnel["users"].shift(1)
print(practice_funnel)
fig = px.funnel(practice_funnel, x="users", y="stage", color="previous_rate", color_continuous_scale="Blues", title="转化率着色漏斗")
fig.show()`
  }),
  68: chart({
    summary: "用瀑布图解释一个起点如何经过多个增减项到达终点。",
    when: "分析利润、预算、用户或库存的增减贡献。",
    dataShape: "有序贡献项、正负变化值以及起止汇总项。",
    parameters: ["measure：relative/total/absolute", "connector：连接线", "increasing/decreasing：颜色", "text：标签"],
    interpretation: "从左到右累计读取，区分正贡献、负贡献和最终总计。",
    pitfalls: ["贡献项不满足可加性", "起点和终点口径不同", "项目过多导致难读"],
    practiceTask: `运行基础图表后，完成以下任务：

1. 将 textposition="outside" 改为 "inside"，观察数值标签位置对可读性的影响
2. 修改 increasing 和 decreasing 的 marker color，对比不同正负配色方案的区分度
3. 将某个 measure 项从 "relative" 改为 "total"，说明汇总项对累计读取的作用`,
    basicCode: `fig = go.Figure(go.Waterfall(
    name="利润变化",
    orientation="v",
    measure=["absolute", "relative", "relative", "relative", "relative", "total"],
    x=["上期利润", "销售增长", "提价", "营销费用", "物流费用", "本期利润"],
    y=[120, 48, 22, -18, -12, 0],
    connector={"line": {"color": "#9aa0a6"}},
    textposition="outside",
))
fig.update_layout(title="利润变化贡献", yaxis_title="利润（万元）", showlegend=False)
fig.show()`,
    advancedCode: `fig = go.Figure(go.Waterfall(
    measure=["absolute", "relative", "relative", "relative", "total"],
    x=["期初用户", "新增用户", "召回用户", "流失用户", "期末用户"],
    y=[8200, 1400, 360, -920, 0],
    increasing={"marker": {"color": "#188038"}},
    decreasing={"marker": {"color": "#d93025"}},
    totals={"marker": {"color": "#1a73e8"}},
    textposition="outside",
))
fig.update_layout(title="月度用户规模变化", yaxis_title="用户数")
fig.show()`,
    practice: `fig = go.Figure(go.Waterfall(
    measure=["absolute", "relative", "relative", "relative", "total"],
    x=["预算", "人力节省", "工具采购", "外包费用", "最终结余"],
    y=[100, 12, -18, -24, 0],
    textposition="outside",
))
fig.update_layout(title="项目预算变化", yaxis_title="金额（万元）")
fig.show()`
  }),
  69: chart({
    summary: "用时间线展示任务起止、重叠、负责人和项目节奏。",
    when: "计划或复盘具有开始和结束日期的任务。",
    dataShape: "任务名称、开始时间、结束时间和可选分组字段。",
    parameters: ["x_start/x_end：时间", "y：任务", "color：负责人", "category_orders：任务顺序"],
    interpretation: "比较任务持续时间、依赖重叠和关键时间段。",
    pitfalls: ["结束时间早于开始时间", "任务顺序与执行顺序相反", "时间线代替详细依赖管理"],
    practiceTask: `运行基础图表后，完成以下任务：

1. 将 color 从 "owner" 改为 "phase" 或任务字段，观察颜色分组维度切换的效果
2. 修改 update_yaxes 的 autorange="reversed" 为默认，对比任务排列顺序的差异
3. 添加 hover_data 显示任务持续天数，说明悬浮信息对时间跨度读取的作用`,
    basicCode: `fig = px.timeline(timeline, x_start="start", x_end="finish", y="task", color="owner", title="数据分析项目时间线")
fig.update_yaxes(autorange="reversed", title="任务")
fig.update_xaxes(title="日期")
fig.update_layout(legend_title="负责人")
fig.show()`,
    advancedCode: `timeline_detail = timeline.copy()
timeline_detail["duration"] = (timeline_detail["finish"] - timeline_detail["start"]).dt.days
fig = px.timeline(timeline_detail, x_start="start", x_end="finish", y="owner", color="task", hover_data=["duration"], title="按负责人查看项目安排")
fig.update_yaxes(autorange="reversed", title="负责人")
fig.update_xaxes(title="日期")
fig.update_layout(legend_title="任务")
fig.show()`,
    practice: `practice_timeline = pd.DataFrame({
    "task": ["需求确认", "数据清洗", "模型分析", "汇报制作"],
    "start": pd.to_datetime(["2026-04-01", "2026-04-03", "2026-04-06", "2026-04-10"]),
    "finish": pd.to_datetime(["2026-04-03", "2026-04-07", "2026-04-11", "2026-04-13"]),
    "phase": ["准备", "准备", "分析", "交付"],
})
fig = px.timeline(practice_timeline, x_start="start", x_end="finish", y="task", color="phase", title="分析任务计划")
fig.update_yaxes(autorange="reversed")
fig.show()`
  }),
  70: chart({
    summary: "用Geo地图表达国家或地区的空间位置、规模和差异。",
    when: "地理位置本身对解释有意义，例如市场、网点或区域指标。",
    dataShape: "标准地理编码、名称以及数值指标。",
    parameters: ["locations：地理编码", "locationmode：编码类型", "projection：投影", "scope：区域范围"],
    interpretation: "结合位置和指标读取空间模式；地图面积不能替代数值比较。",
    pitfalls: ["地理编码无法匹配", "大区域视觉面积造成偏见", "无空间意义的数据强行使用地图"],
    practiceTask: `运行基础图表后，完成以下任务：

1. 将 projection="natural earth" 改为 "orthographic" 或 "mercator"，对比不同地图投影的效果
2. 修改 color_continuous_scale 从 "Blues" 为 "YlOrRd"，观察色盘对指标差异的表达
3. 添加 hover_data 显示增长率等补充字段，说明悬浮信息对空间数据解读的作用`,
    basicCode: `fig = px.scatter_geo(countries, locations="country", locationmode="country names", size="sales", color="growth", hover_name="market", projection="natural earth", color_continuous_scale="Blues", title="Gapminder：人均GDP与预期寿命")
fig.update_layout(coloraxis_colorbar_title="预期寿命")
fig.show()`,
    advancedCode: `fig = px.choropleth(countries, locations="country", locationmode="country names", color="sales", hover_name="market", hover_data={"growth": ":.1f"}, projection="natural earth", color_continuous_scale="YlGnBu", title="Gapminder：各国人均GDP")
fig.update_layout(coloraxis_colorbar_title="人均GDP")
fig.show()`,
    practice: `map_points = pd.DataFrame({
    "city": ["上海", "广州", "北京", "成都"],
    "lat": [31.23, 23.13, 39.90, 30.57],
    "lon": [121.47, 113.26, 116.40, 104.07],
    "sales": [320, 250, 280, 190],
})
fig = px.scatter_geo(map_points, lat="lat", lon="lon", size="sales", hover_name="city", projection="natural earth", title="国内城市销售点位")
fig.update_geos(lataxis_range=[15, 55], lonaxis_range=[70, 140])
fig.show()`
  }),
  71: chart({
    summary: "组合子图、按钮、下拉菜单、范围控件和HTML导出，形成完整交互视图。",
    when: "多个相关图表需要在一个Figure中协调展示或切换。",
    dataShape: "共享维度的多组数据；导出前应控制Trace数量。",
    parameters: ["make_subplots：布局", "updatemenus：按钮", "rangeslider：范围滑块", "to_html：导出"],
    interpretation: "控件应解决明确任务，默认状态必须可读，交互变化需要保持单位和标题一致。",
    pitfalls: ["控件太多", "按钮状态与标题不同步", "HTML过大", "子图图例重复"],
    practiceTask: `运行基础图表后，完成以下任务：

1. 将 updatemenus 的 direction 从 "down" 改为 "right"，观察按钮排列方向的变化
2. 修改 rangeslider_visible 从 True 为 False，对比有无范围滑块的交互差异
3. 将 to_html 的 include_plotlyjs 从 "cdn" 改为 True，说明内联脚本对HTML文件大小的影响`,
    basicCode: `fig = make_subplots(rows=1, cols=2, subplot_titles=["销售趋势", "区域销售"])
fig.add_trace(go.Scatter(x=monthly["month"], y=monthly["sales"], mode="lines+markers", name="销售额"), row=1, col=1)
totals = regional.groupby("region", as_index=False)["sales"].sum()
fig.add_trace(go.Bar(x=totals["region"], y=totals["sales"], name="区域合计"), row=1, col=2)
fig.update_layout(title="经营分析组合图", template="plotly_white")
fig.show()`,
    advancedCode: `fig = go.Figure()
fig.add_trace(go.Scatter(x=monthly["month"], y=monthly["sales"], mode="lines+markers", name="销售额", visible=True))
fig.add_trace(go.Scatter(x=monthly["month"], y=monthly["profit"], mode="lines+markers", name="利润", visible=False))
fig.update_layout(
    title="指标切换",
    updatemenus=[{
        "buttons": [
            {"label": "销售额", "method": "update", "args": [{"visible": [True, False]}, {"title": "月度销售额"}]},
            {"label": "利润", "method": "update", "args": [{"visible": [False, True]}, {"title": "月度利润"}]},
        ],
        "direction": "down",
    }],
    template="plotly_white",
)
fig.show()`,
    practice: `fig = px.line(monthly, x="month", y="sales", markers=True, title="可导出的销售趋势")
fig.update_xaxes(rangeslider_visible=True)
html = fig.to_html(include_plotlyjs="cdn", full_html=True)
print(f"HTML字符数: {len(html):,}")
fig.show()`
  })
};
