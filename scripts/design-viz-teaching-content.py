# -*- coding: utf-8 -*-
"""为可视化模块每章设计「诊断式自检」与「独立迁移练习」的可执行教学内容。

替换两处模板 cell：
  - 诊断式自检（原 review={"…":"待确认"} 空模板）→ 可执行断言自检
  - 独立迁移练习（原仅 TODO 占位）→ 带换角度起点的可运行练习

内容按模块分表维护（CONTENT[filename] = {check: str, migrate: str}），
脚本按 scope 参数落地指定模块：--scope matplotlib|seaborn|plotly|all。

安全：按 cell 内容特征定位（review=待确认 / 在此粘贴或改写），只改 code source；
逐 cell ast.parse 兜底；幂等。
"""
import ast, json, os, re, shutil, sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parents[1]
COURSE = ROOT / "public" / "course"
BACKUP = ROOT / ".backup-viz-teaching"

# ==================== matplotlib 模块（第33–43章） ====================
MPL = {
    "course-chapter-28.ipynb": {  # 33. 绘图结构 Figure/Axes
        "check": '''# 诊断式自检：核对基础图表的结构是否符合预期
import matplotlib.pyplot as plt

fig, ax = plt.subplots(figsize=(8, 4.2))
line = ax.plot(months, sales, marker="o", label="销售额")[0]
ax.set(title="Figure与Axes示例", xlabel="月份", ylabel="销售额（万元）")

assert len(fig.axes) == 1, "应只有一个坐标系 Axes"
assert len(ax.lines) == 1, "应只画了一条折线"
assert len(line.get_xdata()) == len(months), "折线数据点数应与月份数一致"
assert ax.get_title() != "", "应设置图表标题"
assert ax.get_xlabel() != "" and ax.get_ylabel() != "", "应设置坐标轴标签"

print("✓ 自检通过：画布含 1 个 Axes，折线数据点完整，标题与坐标轴标签已设置")
''',
        "migrate": '''# 独立迁移练习：把「销售额」折线换成「利润」字段，回答新问题
import matplotlib.pyplot as plt

# 起点（已可运行）：复用同一份数据，只把 y 从 sales 换成 profit
fig, ax = plt.subplots(figsize=(8, 4.2))
line = ax.plot(months, profit, marker="s", color="#188038", label="利润")[0]
ax.set(title="上半年利润走势", xlabel="月份", ylabel="利润（万元）")
ax.legend(frameon=False)
fig.tight_layout()
plt.show()

change_note = "待填写"
expected_change = "待填写"
observed_change = "运行后填写"
print(f"改动：{change_note}")
print(f"预期：{expected_change}")
print(f"观察：{observed_change}")
''',
    },
    "course-chapter-29.ipynb": {  # 34. 折线图
        "check": '''# 诊断式自检：核对折线图的基本结构
import matplotlib.pyplot as plt

fig, ax = plt.subplots(figsize=(8, 4.2))
ax.plot(months, sales, marker="o", linewidth=2.2, color="#1a73e8")
ax.set(title="上半年销售额趋势", xlabel="月份", ylabel="销售额（万元）")

assert len(ax.lines) == 1, "应有一条折线"
assert len(ax.lines[0].get_xdata()) == len(months), "折线数据点数应与月份一致"
assert ax.get_title() != "", "应设置标题"
assert ax.get_xlabel() != "" and ax.get_ylabel() != "", "应设置坐标轴标签"

print("✓ 自检通过：折线图含 1 条线，数据点完整，标题与坐标轴已设置")
''',
        "migrate": '''# 独立迁移练习：把「销售额」趋势换成「订单量」趋势，比较两者走势
import matplotlib.pyplot as plt

# 起点（已可运行）：y 换成 orders，观察订单量与销售额走势有何不同
fig, ax = plt.subplots(figsize=(8, 4.2))
ax.plot(months, orders, marker="*", linewidth=2.2, color="#e8710a")
ax.set(title="上半年订单量趋势", xlabel="月份", ylabel="订单量（笔）")
ax.spines[["top", "right"]].set_visible(False)
ax.grid(axis="y", alpha=0.2)
fig.tight_layout()
plt.show()

change_note = "待填写"
expected_change = "待填写"
observed_change = "运行后填写"
print(f"改动：{change_note}")
print(f"预期：{expected_change}")
print(f"观察：{observed_change}")
''',
    },
    "course-chapter-30.ipynb": {  # 35. 柱状图
        "check": '''# 诊断式自检：核对水平柱状图的结构
import matplotlib.pyplot as plt

totals = online + offline
order = np.argsort(totals)
fig, ax = plt.subplots(figsize=(8, 4.2))
bars = ax.barh(regions[order], totals[order], color="#1a73e8")
ax.set(title="各区域总销售额", xlabel="销售额（万元）")

assert len(ax.containers) == 1, "应有一组柱状容器"
assert len(ax.containers[0]) == len(regions), "柱子的数量应与区域数一致"
assert ax.get_title() != "", "应设置标题"

print("✓ 自检通过：水平柱状图柱子数量与区域一致，标题已设置")
''',
        "migrate": '''# 独立迁移练习：把「总和」换成「线上 vs 退货」分组对比
import matplotlib.pyplot as plt

# 起点（已可运行）：用 stacked=True 把线上、退货拆成两段颜色
x = np.arange(len(regions))
fig, ax = plt.subplots(figsize=(8, 4.2))
ax.bar(x, online, label="线上销售", color="#1a73e8")
ax.bar(x, offline, bottom=online, label="退货", color="#f9ab00")
ax.set_xticks(x)
ax.set_xticklabels(regions)
ax.set(title="各区域销售构成", ylabel="销售额（万元）")
ax.legend(frameon=False)
fig.tight_layout()
plt.show()

change_note = "待填写"
expected_change = "待填写"
observed_change = "运行后填写"
print(f"改动：{change_note}")
print(f"预期：{expected_change}")
print(f"观察：{observed_change}")
''',
    },
    "course-chapter-31.ipynb": {  # 36. 散点与气泡图
        "check": '''# 诊断式自检：核对散点图的结构
import matplotlib.pyplot as plt

ad_spend = np.array([18, 22, 20, 27, 31, 35])
fig, ax = plt.subplots(figsize=(7.5, 4.5))
ax.scatter(ad_spend, sales, s=75, alpha=0.75)
ax.set(title="广告投入与销售额同向变化", xlabel="广告投入（万元）", ylabel="销售额（万元）")

assert len(ax.collections) == 1, "应有一个散点集合"
assert len(ax.collections[0].get_offsets()) == len(ad_spend), "散点数应与样本一致"
assert ax.get_title() != "", "应设置标题"

print("✓ 自检通过：散点图点数与样本一致，标题已设置")
''',
        "migrate": '''# 独立迁移练习：用点的大小编码「订单量」，把散点升级为气泡图
import matplotlib.pyplot as plt

# 起点（已可运行）：增加 s 参数，用 orders 控制点的大小
ad_spend = np.array([18, 22, 20, 27, 31, 35])
fig, ax = plt.subplots(figsize=(7.5, 4.5))
ax.scatter(ad_spend, sales, s=orders * 3, alpha=0.6, color="#1a73e8")
ax.set(title="广告投入、销售额与订单量", xlabel="广告投入（万元）", ylabel="销售额（万元）")
fig.tight_layout()
plt.show()

change_note = "待填写"
expected_change = "待填写"
observed_change = "运行后填写"
print(f"改动：{change_note}")
print(f"预期：{expected_change}")
print(f"观察：{observed_change}")
''',
    },
    "course-chapter-32.ipynb": {  # 37. 直方图
        "check": '''# 诊断式自检：核对直方图的结构
import matplotlib.pyplot as plt

fig, ax = plt.subplots(figsize=(8, 4.2))
n, bins, patches = ax.hist(samples, bins=18, color="#1a73e8", edgecolor="white")
ax.set(title="订单金额分布", xlabel="订单金额（元）", ylabel="订单数")

assert len(patches) == 18, "柱子数量应等于 bins 数"
assert int(n.sum()) == len(samples), "直方图覆盖的样本数应与总数一致"
assert ax.get_title() != "", "应设置标题"

print("✓ 自检通过：直方图分 18 箱，覆盖全部样本，标题已设置")
''',
        "migrate": '''# 独立迁移练习：换一种分箱方式，观察分布形态的变化
import matplotlib.pyplot as plt

# 起点（已可运行）：把 bins 从 18 改成 6，看粗颗粒与细颗粒的差异
fig, ax = plt.subplots(figsize=(8, 4.2))
ax.hist(samples, bins=6, color="#188038", edgecolor="white")
ax.set(title="订单金额分布（粗分箱）", xlabel="订单金额（元）", ylabel="订单数")
ax.spines[["top", "right"]].set_visible(False)
fig.tight_layout()
plt.show()

change_note = "待填写"
expected_change = "待填写"
observed_change = "运行后填写"
print(f"改动：{change_note}")
print(f"预期：{expected_change}")
print(f"观察：{observed_change}")
''',
    },
    "course-chapter-33.ipynb": {  # 38. 箱线图
        "check": '''# 诊断式自检：核对箱线图的结构
import matplotlib.pyplot as plt

fig, ax = plt.subplots(figsize=(6.5, 4.5))
ax.boxplot(samples, patch_artist=True)
ax.set(title="订单金额箱线图", ylabel="订单金额（元）")

assert len(fig.axes) == 1, "应有一个坐标系"
assert len(ax.lines) >= 5, "箱线图应含中位线、须线与帽线"
assert ax.get_title() != "", "应设置标题"

print("✓ 自检通过：箱线图含须线、帽线与中位线，标题已设置")
''',
        "migrate": '''# 独立迁移练习：把单组箱线扩展为「普通 vs 高价」两组对比
import matplotlib.pyplot as plt

# 起点（已可运行）：按 260 元切分样本，画两组箱线对比
regular = samples[samples < 260]
premium = samples[samples >= 260]
fig, ax = plt.subplots(figsize=(7, 4.5))
ax.boxplot(
    [regular, premium],
    patch_artist=True,
    tick_labels=["普通订单", "高价订单"],
    boxprops={"facecolor": "#d2e3fc"},
    medianprops={"color": "#d93025", "linewidth": 2},
)
ax.set(title="普通与高价订单金额分布", ylabel="订单金额（元）")
ax.grid(axis="y", alpha=0.2)
fig.tight_layout()
plt.show()

change_note = "待填写"
expected_change = "待填写"
observed_change = "运行后填写"
print(f"改动：{change_note}")
print(f"预期：{expected_change}")
print(f"观察：{observed_change}")
''',
    },
    "course-chapter-34.ipynb": {  # 39. 面积图
        "check": '''# 诊断式自检：核对面积图的结构
import matplotlib.pyplot as plt

fig, ax = plt.subplots(figsize=(8, 4.2))
ax.plot(months, sales, color="#1a73e8", linewidth=2)
ax.fill_between(months, sales, color="#1a73e8", alpha=0.18)
ax.set(title="上半年销售额面积图", ylabel="销售额（万元）")

assert len(ax.lines) >= 1, "应有轮廓线"
assert len(ax.collections) >= 1, "应有填充区域"
assert len(ax.lines[0].get_xdata()) == len(months), "数据点数应与月份一致"

print("✓ 自检通过：面积图含轮廓线与填充区，数据完整")
''',
        "migrate": '''# 独立迁移练习：把「销售额」面积换成「利润」面积，观察波动
import matplotlib.pyplot as plt

# 起点（已可运行）：y 换成 profit，颜色换成绿色系
fig, ax = plt.subplots(figsize=(8, 4.2))
ax.plot(months, profit, color="#188038", linewidth=2)
ax.fill_between(months, profit, color="#188038", alpha=0.18)
ax.set(title="上半年利润面积图", ylabel="利润（万元）")
ax.spines[["top", "right"]].set_visible(False)
fig.tight_layout()
plt.show()

change_note = "待填写"
expected_change = "待填写"
observed_change = "运行后填写"
print(f"改动：{change_note}")
print(f"预期：{expected_change}")
print(f"观察：{observed_change}")
''',
    },
    "course-chapter-35.ipynb": {  # 40. 饼图
        "check": '''# 诊断式自检：核对饼图的结构
import matplotlib.pyplot as plt

channel_sales = np.array([180, 92, 58])
labels = ["自然流量", "广告", "会员"]
fig, ax = plt.subplots(figsize=(6.5, 5))
ax.pie(channel_sales, labels=labels, autopct="%.1f%%", startangle=90)
ax.set_title("销售渠道占比")

assert len(ax.patches) == len(labels), "扇形数量应与类别数一致"
assert ax.get_title() != "", "应设置标题"

print("✓ 自检通过：饼图扇形数与类别一致，标题已设置")
''',
        "migrate": '''# 独立迁移练习：把饼图升级为环形图（donut），让中间可放文字
import matplotlib.pyplot as plt

# 起点（已可运行）：用 wedgeprops 挖空圆心，变成环形图
channel_sales = np.array([180, 92, 58])
labels = ["自然流量", "广告", "会员"]
fig, ax = plt.subplots(figsize=(6.5, 5))
ax.pie(
    channel_sales,
    labels=labels,
    autopct="%.1f%%",
    startangle=90,
    colors=["#1a73e8", "#f9ab00", "#188038"],
    wedgeprops={"edgecolor": "white", "width": 0.45},
)
ax.set_title("销售渠道占比（环形）")
fig.tight_layout()
plt.show()

change_note = "待填写"
expected_change = "待填写"
observed_change = "运行后填写"
print(f"改动：{change_note}")
print(f"预期：{expected_change}")
print(f"观察：{observed_change}")
''',
    },
    "course-chapter-36.ipynb": {  # 41. 误差线
        "check": '''# 诊断式自检：核对误差线图的结构
import matplotlib.pyplot as plt

average = np.array([120, 148, 139, 176, 205, 228])
standard_error = np.array([6, 8, 7, 9, 11, 10])
fig, ax = plt.subplots(figsize=(8, 4.2))
ax.errorbar(months, average, yerr=standard_error, marker="o", capsize=4)
ax.set(title="月度销售额及标准误", ylabel="销售额（万元）")

assert len(ax.lines) >= 1, "应有误差线主体"
assert len(ax.lines[0].get_xdata()) == len(months), "数据点数应与月份一致"
assert ax.get_title() != "", "应设置标题"

print("✓ 自检通过：误差线图数据点完整，标题已设置")
''',
        "migrate": '''# 独立迁移练习：用填充区间替代误差棒，观察另一种不确定性表达
import matplotlib.pyplot as plt

# 起点（已可运行）：用 fill_between 画出均值 ± 标准误的带状区间
average = np.array([120, 148, 139, 176, 205, 228])
standard_error = np.array([6, 8, 7, 9, 11, 10])
fig, ax = plt.subplots(figsize=(8, 4.2))
ax.plot(months, average, marker="o", color="#1a73e8")
ax.fill_between(
    months,
    average - standard_error,
    average + standard_error,
    color="#1a73e8",
    alpha=0.2,
)
ax.set(title="月度销售额及标准误区间", ylabel="销售额（万元）")
fig.tight_layout()
plt.show()

change_note = "待填写"
expected_change = "待填写"
observed_change = "运行后填写"
print(f"改动：{change_note}")
print(f"预期：{expected_change}")
print(f"观察：{observed_change}")
''',
    },
    "course-chapter-37.ipynb": {  # 42. 子图与组合图
        "check": '''# 诊断式自检：核对子图布局的结构
import matplotlib.pyplot as plt

fig, axes = plt.subplots(2, 1, figsize=(8.5, 6), sharex=True)
axes[0].plot(months, sales, marker="o", color="#1a73e8")
axes[1].plot(months, profit, marker="s", color="#188038")
fig.suptitle("上半年经营指标", fontsize=16)

assert len(fig.axes) == 2, "应有 2 个子图"
assert all(len(ax.lines) >= 1 for ax in axes), "每个子图都应画有折线"
assert len(fig.texts) >= 1, "应设置总标题"

print("✓ 自检通过：子图布局含 2 个坐标轴，均绘制折线，总标题已设置")
''',
        "migrate": '''# 独立迁移练习：把上下两行改成左右两列，对比不同布局的阅读效果
import matplotlib.pyplot as plt

# 起点（已可运行）：subplots(1, 2) 改为左右并排
fig, axes = plt.subplots(1, 2, figsize=(11, 4.2))
axes[0].plot(months, sales, marker="o", color="#1a73e8")
axes[0].set(title="销售额", ylabel="万元")
axes[1].plot(months, profit, marker="s", color="#188038")
axes[1].set(title="利润", ylabel="万元")
fig.suptitle("上半年经营指标（并排）", fontsize=16)
fig.tight_layout()
plt.show()

change_note = "待填写"
expected_change = "待填写"
observed_change = "运行后填写"
print(f"改动：{change_note}")
print(f"预期：{expected_change}")
print(f"观察：{observed_change}")
''',
    },
    "course-chapter-38.ipynb": {  # 43. 美化、注释与导出
        "check": '''# 诊断式自检：核对美化柱状图的结构与标注
import matplotlib.pyplot as plt

colors = ["#9aa0a6"] * 5 + ["#1a73e8"]
fig, ax = plt.subplots(figsize=(8, 4.2))
bars = ax.bar(months, sales, color=colors)
ax.bar_label(bars, padding=4, fmt="%.0f")
ax.set(title="6月销售额达到半年最高", xlabel="月份", ylabel="销售额")

assert len(ax.containers) == 1, "应有一组柱状容器"
assert len(ax.containers[0]) == len(months), "柱子数量应与月份一致"
assert len(ax.texts) >= 1, "应通过 bar_label 添加数值标注"

print("✓ 自检通过：柱状图数量正确，且已添加数值标注")
''',
        "migrate": '''# 独立迁移练习：突出最小值而非最大值，观察强调对象变化后的解读
import matplotlib.pyplot as plt

# 起点（已可运行）：把高亮色移到最小值那一根柱子
highlight = np.argmin(sales)
colors = ["#9aa0a6"] * len(months)
colors[highlight] = "#d93025"
fig, ax = plt.subplots(figsize=(8, 4.2))
bars = ax.bar(months, sales, color=colors)
ax.bar_label(bars, padding=4, fmt="%.0f")
ax.set(title="哪个月销售额最低？", xlabel="月份", ylabel="销售额")
ax.spines[["top", "right", "left"]].set_visible(False)
fig.tight_layout()
plt.show()

change_note = "待填写"
expected_change = "待填写"
observed_change = "运行后填写"
print(f"改动：{change_note}")
print(f"预期：{expected_change}")
print(f"观察：{observed_change}")
''',
    },
}

# ==================== seaborn 模块（第45–63章） ====================
SNS = {
    "course-chapter-39.ipynb": {  # 45. 数据结构与主题
        "check": '''# 诊断式自检：核对长表映射与主题是否生效
import matplotlib.pyplot as plt
import seaborn as sns

fig, ax = plt.subplots(figsize=(8, 4.2))
sns.scatterplot(data=marketing, x="visits", y="sales", hue="channel", ax=ax)
ax.set(title="Seaborn长表映射", xlabel="访问量", ylabel="销售额")

assert len(ax.collections) >= 1, "应画出散点集合"
assert ax.get_title() != "", "应设置标题"
assert marketing["channel"].nunique() > 1, "渠道应至少有两类用于颜色映射"

print("✓ 自检通过：长表散点已绘制，渠道分组有效，标题已设置")
''',
        "migrate": '''# 独立迁移练习：换一种主题风格，观察同一张图的观感差异
import matplotlib.pyplot as plt
import seaborn as sns

# 起点（已可运行）：把 sns.set_theme 的 style 换成 "darkgrid" 或 "ticks"
sns.set_theme(style="darkgrid", context="notebook")
fig, ax = plt.subplots(figsize=(8, 4.2))
sns.scatterplot(data=marketing, x="visits", y="sales", hue="channel", ax=ax)
ax.set(title="Seaborn长表映射（darkgrid）", xlabel="访问量", ylabel="销售额")
ax.legend(title="渠道", frameon=False)
fig.tight_layout()
plt.show()

change_note = "待填写"
expected_change = "待填写"
observed_change = "运行后填写"
print(f"改动：{change_note}")
print(f"预期：{expected_change}")
print(f"观察：{observed_change}")
''',
    },
    "course-chapter-40.ipynb": {  # 46. 频数图 countplot
        "check": '''# 诊断式自检：核对频数图的结构
import matplotlib.pyplot as plt
import seaborn as sns

order = orders["category"].value_counts().index
fig, ax = plt.subplots(figsize=(8, 4.2))
sns.countplot(data=orders, y="category", order=order, color="#1a73e8", ax=ax)
ax.set(title="各品类订单量", xlabel="订单数", ylabel="品类")

assert len(ax.patches) == orders["category"].nunique(), "柱子数应等于品类数"
assert ax.get_title() != "", "应设置标题"

print("✓ 自检通过：频数图柱子数与品类一致，标题已设置")
''',
        "migrate": '''# 独立迁移练习：用 hue 按渠道分色，观察频数的构成
import matplotlib.pyplot as plt
import seaborn as sns

# 起点（已可运行）：增加 hue="channel" 把订单量拆成渠道
order = orders["category"].value_counts().index
fig, ax = plt.subplots(figsize=(8, 4.2))
sns.countplot(
    data=orders, y="category", order=order, hue="channel", palette="colorblind", ax=ax
)
ax.set(title="各品类订单量（分渠道）", xlabel="订单数", ylabel="品类")
ax.legend(title="渠道", frameon=False)
fig.tight_layout()
plt.show()

change_note = "待填写"
expected_change = "待填写"
observed_change = "运行后填写"
print(f"改动：{change_note}")
print(f"预期：{expected_change}")
print(f"观察：{observed_change}")
''',
    },
    "course-chapter-41.ipynb": {  # 47. 统计柱状图 barplot
        "check": '''# 诊断式自检：核对统计柱状图的结构
import matplotlib.pyplot as plt
import seaborn as sns

fig, ax = plt.subplots(figsize=(8, 4.2))
sns.barplot(data=orders, x="category", y="order_value", ci=None, color="#1a73e8", ax=ax)
ax.set(title="品类平均客单价", xlabel="品类", ylabel="平均客单价（元）")

assert len(ax.patches) == orders["category"].nunique(), "柱子数应等于品类数"
assert ax.get_title() != "", "应设置标题"

print("✓ 自检通过：统计柱状图柱子数与品类一致，标题已设置")
''',
        "migrate": '''# 独立迁移练习：把「平均客单价」换成「订单量」指标，观察两种统计量差异
import matplotlib.pyplot as plt
import seaborn as sns

# 起点（已可运行）：y 换成 items（购买件数），看不同指标的分组均值
fig, ax = plt.subplots(figsize=(8, 4.2))
sns.barplot(data=orders, x="category", y="items", ci=None, color="#188038", ax=ax)
ax.set(title="品类平均购买件数", xlabel="品类", ylabel="平均件数")
fig.tight_layout()
plt.show()

change_note = "待填写"
expected_change = "待填写"
observed_change = "运行后填写"
print(f"改动：{change_note}")
print(f"预期：{expected_change}")
print(f"观察：{observed_change}")
''',
    },
    "course-chapter-42.ipynb": {  # 48. 点图 pointplot
        "check": '''# 诊断式自检：核对点图的结构
import matplotlib.pyplot as plt
import seaborn as sns

fig, ax = plt.subplots(figsize=(8, 4.2))
sns.pointplot(data=orders, x="category", y="order_value", errorbar=("ci", 90), ax=ax)
ax.set(title="品类客单价点估计", xlabel="品类", ylabel="平均客单价（元）")

assert len(ax.lines) >= 1, "应画出点估计连线"
assert len(ax.collections) >= 1, "应画出点估计标记"
assert ax.get_title() != "", "应设置标题"

print("✓ 自检通过：点图含点估计与连线，标题已设置")
''',
        "migrate": '''# 独立迁移练习：加入 hue 分组，比较不同渠道的点估计
import matplotlib.pyplot as plt
import seaborn as sns

# 起点（已可运行）：增加 hue="channel"，看渠道间的估计差异
fig, ax = plt.subplots(figsize=(8, 4.2))
sns.pointplot(
    data=orders, x="category", y="order_value", hue="channel", errorbar=("ci", 90), ax=ax
)
ax.set(title="分渠道客单价点估计", xlabel="品类", ylabel="平均客单价（元）")
ax.legend(title="渠道", frameon=False)
fig.tight_layout()
plt.show()

change_note = "待填写"
expected_change = "待填写"
observed_change = "运行后填写"
print(f"改动：{change_note}")
print(f"预期：{expected_change}")
print(f"观察：{observed_change}")
''',
    },
    "course-chapter-43.ipynb": {  # 49. 箱线图 boxplot
        "check": '''# 诊断式自检：核对箱线图的结构
import matplotlib.pyplot as plt
import seaborn as sns

fig, ax = plt.subplots(figsize=(8, 4.5))
sns.boxplot(data=orders, x="category", y="order_value", hue="category", legend=False, ax=ax)
ax.set(title="品类客单价分布", xlabel="品类", ylabel="客单价（元）")

assert len(fig.axes) == 1, "应有一个坐标系"
assert len(ax.lines) >= orders["category"].nunique(), "每个品类都应绘有箱线元素"
assert ax.get_title() != "", "应设置标题"

print("✓ 自检通过：箱线图按品类绘制，标题已设置")
''',
        "migrate": '''# 独立迁移练习：把箱线图与抖动散点叠加，同时看分布与原始点
import matplotlib.pyplot as plt
import seaborn as sns

# 起点（已可运行）：先画箱线，再叠加 stripplot 显示原始观察
fig, ax = plt.subplots(figsize=(8, 4.5))
sns.boxplot(
    data=orders, x="category", y="order_value", color="#e8eaed", showfliers=False, ax=ax
)
sns.stripplot(
    data=orders.sample(300, random_state=7),
    x="category",
    y="order_value",
    color="#1a73e8",
    size=3,
    alpha=0.6,
    ax=ax,
)
ax.set(title="品类客单价分布与原始点", xlabel="品类", ylabel="客单价（元）")
fig.tight_layout()
plt.show()

change_note = "待填写"
expected_change = "待填写"
observed_change = "运行后填写"
print(f"改动：{change_note}")
print(f"预期：{expected_change}")
print(f"观察：{observed_change}")
''',
    },
    "course-chapter-44.ipynb": {  # 50. 小提琴图 violinplot
        "check": '''# 诊断式自检：核对小提琴图的结构
import matplotlib.pyplot as plt
import seaborn as sns

fig, ax = plt.subplots(figsize=(8, 4.6))
sns.violinplot(data=orders, x="category", y="order_value", hue="category", legend=False, ax=ax)
ax.set(title="品类客单价密度", xlabel="品类", ylabel="客单价（元）")

assert len(ax.collections) >= orders["category"].nunique(), "小提琴体数应不少于品类数"
assert ax.get_title() != "", "应设置标题"

print("✓ 自检通过：小提琴体数与品类一致，标题已设置")
''',
        "migrate": '''# 独立迁移练习：用 split 参数把渠道拆在同一把琴上，观察对比
import matplotlib.pyplot as plt
import seaborn as sns

# 起点（已可运行）：把 hue 换成 channel 并 split=True，左右半琴各表一个渠道
two_channels = orders[orders["channel"].isin(["自然流量", "广告"])]
fig, ax = plt.subplots(figsize=(8, 4.6))
sns.violinplot(
    data=two_channels,
    x="category",
    y="order_value",
    hue="channel",
    split=True,
    inner="quart",
    cut=0,
    palette=["#1a73e8", "#f9ab00"],
    ax=ax,
)
ax.set(title="两渠道客单价密度对比", xlabel="品类", ylabel="客单价（元）")
ax.legend(title="渠道", frameon=False)
fig.tight_layout()
plt.show()

change_note = "待填写"
expected_change = "待填写"
observed_change = "运行后填写"
print(f"改动：{change_note}")
print(f"预期：{expected_change}")
print(f"观察：{observed_change}")
''',
    },
    "course-chapter-45.ipynb": {  # 51. 抖动散点图 stripplot
        "check": '''# 诊断式自检：核对抖动散点图的结构
import matplotlib.pyplot as plt
import seaborn as sns

sample = orders.sample(120, random_state=42)
fig, ax = plt.subplots(figsize=(8, 4.5))
sns.stripplot(data=sample, x="category", y="order_value", jitter=0.22, alpha=0.55, ax=ax)
ax.set(title="品类客单价原始观察", xlabel="品类", ylabel="客单价（元）")

assert len(ax.collections) >= 1, "应画出散点集合"
assert ax.get_title() != "", "应设置标题"

print("✓ 自检通过：抖动散点图已绘制原始观察，标题已设置")
''',
        "migrate": '''# 独立迁移练习：把 x 换成分组字段，观察换维度后的分布
import matplotlib.pyplot as plt
import seaborn as sns

# 起点（已可运行）：x 从 category 换成 region，观察区域维度的差异
sample = orders.sample(120, random_state=42)
fig, ax = plt.subplots(figsize=(8, 4.5))
sns.stripplot(
    data=sample, x="region", y="order_value", jitter=0.22, alpha=0.55, color="#188038", ax=ax
)
ax.set(title="区域客单价原始观察", xlabel="区域", ylabel="客单价（元）")
fig.tight_layout()
plt.show()

change_note = "待填写"
expected_change = "待填写"
observed_change = "运行后填写"
print(f"改动：{change_note}")
print(f"预期：{expected_change}")
print(f"观察：{observed_change}")
''',
    },
    "course-chapter-46.ipynb": {  # 52. 蜂群图 swarmplot
        "check": '''# 诊断式自检：核对蜂群图的结构
import matplotlib.pyplot as plt
import seaborn as sns

sample = orders.sample(90, random_state=43)
fig, ax = plt.subplots(figsize=(8, 4.5))
sns.swarmplot(data=sample, x="category", y="order_value", hue="category", legend=False, ax=ax)
ax.set(title="品类客单价蜂群图", xlabel="品类", ylabel="客单价（元）")

assert len(ax.collections) >= 1, "应画出蜂群点集合"
assert ax.get_title() != "", "应设置标题"

print("✓ 自检通过：蜂群图已绘制散点，标题已设置")
''',
        "migrate": '''# 独立迁移练习：把蜂群图与箱线图叠加，结合看分布与离群点
import matplotlib.pyplot as plt
import seaborn as sns

# 起点（已可运行）：先画蜂群，再叠一层箱线，观察两图的互补
sample = orders.sample(90, random_state=43)
fig, ax = plt.subplots(figsize=(8, 4.5))
sns.swarmplot(
    data=sample, x="category", y="order_value", color="#9aa0a6", size=4, ax=ax
)
sns.boxplot(
    data=sample, x="category", y="order_value", color="#ffffff", width=0.5, ax=ax
)
ax.set(title="蜂群图叠加箱线", xlabel="品类", ylabel="客单价（元）")
fig.tight_layout()
plt.show()

change_note = "待填写"
expected_change = "待填写"
observed_change = "运行后填写"
print(f"改动：{change_note}")
print(f"预期：{expected_change}")
print(f"观察：{observed_change}")
''',
    },
    "course-chapter-47.ipynb": {  # 53. 直方图 histplot
        "check": '''# 诊断式自检：核对直方图的结构
import matplotlib.pyplot as plt
import seaborn as sns

fig, ax = plt.subplots(figsize=(8, 4.3))
sns.histplot(data=orders, x="order_value", bins=18, color="#1a73e8", ax=ax)
ax.set(title="订单金额直方图", xlabel="客单价（元）", ylabel="订单数")

assert len(ax.patches) == 18, "柱子数应等于 bins 数"
assert ax.get_title() != "", "应设置标题"

print("✓ 自检通过：直方图分 18 箱，标题已设置")
''',
        "migrate": '''# 独立迁移练习：按渠道分色直方图，观察重叠分布的构成
import matplotlib.pyplot as plt
import seaborn as sns

# 起点（已可运行）：增加 hue="channel"，把订单金额按渠道分层
fig, ax = plt.subplots(figsize=(8, 4.3))
sns.histplot(
    data=orders, x="order_value", hue="channel", bins=18, alpha=0.6, ax=ax
)
ax.set(title="分渠道订单金额分布", xlabel="客单价（元）", ylabel="订单数")
ax.legend(title="渠道", frameon=False)
fig.tight_layout()
plt.show()

change_note = "待填写"
expected_change = "待填写"
observed_change = "运行后填写"
print(f"改动：{change_note}")
print(f"预期：{expected_change}")
print(f"观察：{observed_change}")
''',
    },
    "course-chapter-48.ipynb": {  # 54. 核密度图 kdeplot
        "check": '''# 诊断式自检：核对核密度图的结构
import matplotlib.pyplot as plt
import seaborn as sns

fig, ax = plt.subplots(figsize=(8, 4.3))
sns.kdeplot(data=orders, x="order_value", fill=True, color="#1a73e8", cut=0, ax=ax)
ax.set(title="订单金额核密度", xlabel="客单价（元）", ylabel="密度")

assert len(ax.lines) >= 1 or len(ax.collections) >= 1, "应画出密度曲线或填充区"
assert ax.get_title() != "", "应设置标题"

print("✓ 自检通过：核密度曲线已绘制，标题已设置")
''',
        "migrate": '''# 独立迁移练习：按渠道分层密度，比较不同渠道的分布形状
import matplotlib.pyplot as plt
import seaborn as sns

# 起点（已可运行）：增加 hue="channel"，画出分层核密度
fig, ax = plt.subplots(figsize=(8, 4.3))
sns.kdeplot(
    data=orders, x="order_value", hue="channel", fill=True, alpha=0.35, cut=0, ax=ax
)
ax.set(title="分渠道订单金额核密度", xlabel="客单价（元）", ylabel="密度")
ax.legend(title="渠道", frameon=False)
fig.tight_layout()
plt.show()

change_note = "待填写"
expected_change = "待填写"
observed_change = "运行后填写"
print(f"改动：{change_note}")
print(f"预期：{expected_change}")
print(f"观察：{observed_change}")
''',
    },
    "course-chapter-49.ipynb": {  # 55. 累积分布图 ecdfplot
        "check": '''# 诊断式自检：核对累积分布图的结构
import matplotlib.pyplot as plt
import seaborn as sns

fig, ax = plt.subplots(figsize=(8, 4.3))
sns.ecdfplot(data=orders, x="order_value", color="#1a73e8", ax=ax)
ax.set(title="订单金额累计分布", xlabel="客单价（元）", ylabel="累计比例")

assert len(ax.lines) >= 1, "应画出累积分布曲线"
assert ax.get_title() != "", "应设置标题"

print("✓ 自检通过：累积分布曲线已绘制，标题已设置")
''',
        "migrate": '''# 独立迁移练习：按渠道分层累积分布，比较不同渠道的达标速度
import matplotlib.pyplot as plt
import seaborn as sns

# 起点（已可运行）：增加 hue="channel"，看不同渠道累积比例的差异
fig, ax = plt.subplots(figsize=(8, 4.3))
sns.ecdfplot(data=orders, x="order_value", hue="channel", ax=ax)
ax.set(title="分渠道累计分布", xlabel="客单价（元）", ylabel="累计比例")
ax.legend(title="渠道", frameon=False)
fig.tight_layout()
plt.show()

change_note = "待填写"
expected_change = "待填写"
observed_change = "运行后填写"
print(f"改动：{change_note}")
print(f"预期：{expected_change}")
print(f"观察：{observed_change}")
''',
    },
    "course-chapter-50.ipynb": {  # 56. 散点图 scatterplot
        "check": '''# 诊断式自检：核对散点图的结构
import matplotlib.pyplot as plt
import seaborn as sns

fig, ax = plt.subplots(figsize=(8, 4.6))
sns.scatterplot(data=marketing, x="visits", y="sales", hue="channel", alpha=0.7, ax=ax)
ax.set(title="访问量与销售额", xlabel="访问量", ylabel="销售额")

assert len(ax.collections) >= 1, "应画出散点集合"
assert ax.get_legend() is not None, "应生成图例"
assert ax.get_title() != "", "应设置标题"

print("✓ 自检通过：散点图已绘制，图例与标题已设置")
''',
        "migrate": '''# 独立迁移练习：用 size 编码第三个变量，把散点升级为气泡
import matplotlib.pyplot as plt
import seaborn as sns

# 起点（已可运行）：增加 size="conversion"，点的大小编码转化率
fig, ax = plt.subplots(figsize=(8, 4.6))
sns.scatterplot(
    data=marketing,
    x="visits",
    y="sales",
    hue="channel",
    size="conversion",
    sizes=(20, 200),
    alpha=0.7,
    ax=ax,
)
ax.set(title="访问量、销售额与转化率", xlabel="访问量", ylabel="销售额")
ax.legend(frameon=False)
fig.tight_layout()
plt.show()

change_note = "待填写"
expected_change = "待填写"
observed_change = "运行后填写"
print(f"改动：{change_note}")
print(f"预期：{expected_change}")
print(f"观察：{observed_change}")
''',
    },
    "course-chapter-51.ipynb": {  # 57. 统计折线图 lineplot
        "check": '''# 诊断式自检：核对统计折线图的结构
import matplotlib.pyplot as plt
import seaborn as sns

fig, ax = plt.subplots(figsize=(8.5, 4.3))
sns.lineplot(data=daily, x="date", y="sales", ci=None, marker="o", ax=ax)
ax.set(title="每日平均销售额", xlabel="日期", ylabel="销售额")

assert len(ax.lines) >= 1, "应画出统计折线"
assert ax.get_title() != "", "应设置标题"

print("✓ 自检通过：统计折线图已绘制，标题已设置")
''',
        "migrate": '''# 独立迁移练习：按区域分层折线，比较不同区域的时间走势
import matplotlib.pyplot as plt
import seaborn as sns

# 起点（已可运行）：增加 hue="region"，看不同区域的销售额走势
fig, ax = plt.subplots(figsize=(8.5, 4.3))
sns.lineplot(data=daily, x="date", y="sales", hue="region", ci=None, marker="o", ax=ax)
ax.set(title="分区域每日销售额", xlabel="日期", ylabel="销售额")
ax.legend(title="区域", frameon=False)
ax.tick_params(axis="x", rotation=30)
fig.tight_layout()
plt.show()

change_note = "待填写"
expected_change = "待填写"
observed_change = "运行后填写"
print(f"改动：{change_note}")
print(f"预期：{expected_change}")
print(f"观察：{observed_change}")
''',
    },
    "course-chapter-52.ipynb": {  # 58. 回归图 regplot
        "check": '''# 诊断式自检：核对回归图的结构
import matplotlib.pyplot as plt
import seaborn as sns

fig, ax = plt.subplots(figsize=(8, 4.5))
sns.regplot(data=marketing, x="visits", y="sales", scatter_kws={"alpha": 0.45}, ax=ax)
ax.set(title="访问量与销售额线性趋势", xlabel="访问量", ylabel="销售额")

assert len(ax.lines) >= 1, "应画出回归线"
assert len(ax.collections) >= 1, "应画出散点"
assert ax.get_title() != "", "应设置标题"

print("✓ 自检通过：回归图含散点与回归线，标题已设置")
''',
        "migrate": '''# 独立迁移练习：把线性回归换成稳健回归，观察抗离群点的差异
import matplotlib.pyplot as plt
import seaborn as sns

# 起点（已可运行）：增加 robust=True，稳健回归对离群点不敏感
fig, ax = plt.subplots(figsize=(8, 4.5))
sns.regplot(
    data=marketing,
    x="visits",
    y="sales",
    robust=True,
    scatter_kws={"alpha": 0.45, "s": 25},
    line_kws={"color": "#188038"},
    ax=ax,
)
ax.set(title="访问量与销售额稳健回归", xlabel="访问量", ylabel="销售额")
fig.tight_layout()
plt.show()

change_note = "待填写"
expected_change = "待填写"
observed_change = "运行后填写"
print(f"改动：{change_note}")
print(f"预期：{expected_change}")
print(f"观察：{observed_change}")
''',
    },
    "course-chapter-53.ipynb": {  # 59. 联合分布图 jointplot
        "check": '''# 诊断式自检：核对联合分布图的结构
import matplotlib.pyplot as plt
import seaborn as sns

grid = sns.jointplot(data=marketing, x="visits", y="sales", kind="scatter", height=6)

assert grid.ax_joint is not None, "应存在联合分布主图"
assert grid.ax_marg_x is not None, "应存在上侧边缘直方图"
assert grid.ax_marg_y is not None, "应存在右侧边缘直方图"
grid.fig.suptitle("访问量与销售额联合分布", y=1.02)
plt.show()

print("✓ 自检通过：联合分布含主图与两个边缘直方图")
''',
        "migrate": '''# 独立迁移练习：把散点联合换成六边形密度，观察密集区的表达
import matplotlib.pyplot as plt
import seaborn as sns

# 起点（已可运行）：kind 从 scatter 换成 hex，用密度代替散点
grid = sns.jointplot(
    data=marketing, x="visits", y="sales", kind="hex", height=6, cmap="Blues"
)
grid.set_axis_labels("访问量", "销售额")
grid.fig.suptitle("访问量与销售额六边形密度", y=1.02)
plt.show()

change_note = "待填写"
expected_change = "待填写"
observed_change = "运行后填写"
print(f"改动：{change_note}")
print(f"预期：{expected_change}")
print(f"观察：{observed_change}")
''',
    },
    "course-chapter-54.ipynb": {  # 60. 成对关系图 pairplot
        "check": '''# 诊断式自检：核对成对关系图的结构
import matplotlib.pyplot as plt
import seaborn as sns

sample = marketing.sample(150, random_state=51)
grid = sns.pairplot(sample, vars=["visits", "ad_spend", "sales", "conversion"], corner=True)

assert grid.axes is not None, "应生成成对关系子图矩阵"
assert len(grid.axes) >= 3, "4 个变量应产生至少 3×3 的子图矩阵"
grid.fig.suptitle("营销指标成对关系", y=1.02)
plt.show()

print("✓ 自检通过：成对关系图生成了多变量子图矩阵")
''',
        "migrate": '''# 独立迁移练习：用 hue 按渠道着色，观察分组在成对关系中的差异
import matplotlib.pyplot as plt
import seaborn as sns

# 起点（已可运行）：增加 hue="channel"，把渠道差异画进每对关系
sample = marketing.sample(150, random_state=51)
grid = sns.pairplot(
    sample,
    vars=["visits", "ad_spend", "sales", "conversion"],
    hue="channel",
    corner=True,
    diag_kind="hist",
    palette="colorblind",
    plot_kws={"alpha": 0.45, "s": 22},
)
grid.fig.suptitle("分渠道营销指标成对关系", y=1.02)
plt.show()

change_note = "待填写"
expected_change = "待填写"
observed_change = "运行后填写"
print(f"改动：{change_note}")
print(f"预期：{expected_change}")
print(f"观察：{observed_change}")
''',
    },
    "course-chapter-55.ipynb": {  # 61. 热力图 heatmap
        "check": '''# 诊断式自检：核对热力图的结构
import matplotlib.pyplot as plt
import seaborn as sns

corr = marketing[["visits", "ad_spend", "sales", "conversion"]].corr()
mask = np.triu(np.ones_like(corr, dtype=bool), k=1)
fig, ax = plt.subplots(figsize=(7, 5))
sns.heatmap(corr, mask=mask, annot=True, fmt=".2f", cmap="vlag", center=0, vmin=-1, vmax=1, square=True, ax=ax)
ax.set_title("营销指标相关系数")

assert corr.shape[0] == corr.shape[1] == 4, "相关矩阵应为 4×4"
assert len(ax.collections) >= 1, "应绘制热力色块"
assert ax.get_title() != "", "应设置标题"

print("✓ 自检通过：热力图覆盖 4×4 相关矩阵，标题已设置")
''',
        "migrate": '''# 独立迁移练习：只保留 sales 与各指标的相关关系，聚焦单变量
import matplotlib.pyplot as plt
import seaborn as sns

# 起点（已可运行）：用 .loc[["sales"]] 只取 sales 这一行，聚焦销售额与谁最相关
corr = marketing[["visits", "ad_spend", "sales", "conversion"]].corr()
sales_corr = corr.loc[["sales"]]
fig, ax = plt.subplots(figsize=(7, 2.2))
sns.heatmap(sales_corr, annot=True, fmt=".2f", cmap="vlag", center=0, vmin=-1, vmax=1, ax=ax)
ax.set_title("sales 与各指标相关系数")
fig.tight_layout()
plt.show()

change_note = "待填写"
expected_change = "待填写"
observed_change = "运行后填写"
print(f"改动：{change_note}")
print(f"预期：{expected_change}")
print(f"观察：{observed_change}")
''',
    },
    "course-chapter-56.ipynb": {  # 62. 聚类热力图 clustermap
        "check": '''# 诊断式自检：核对聚类热力图的结构
import matplotlib.pyplot as plt
import seaborn as sns

category_region = orders.pivot_table(
    index="category", columns="region", values="order_value", aggfunc="mean"
).dropna()
grid = sns.clustermap(category_region, cmap="Blues", figsize=(7, 6), row_cluster=True, col_cluster=True)

assert grid.ax_heatmap is not None, "应存在热力图主体"
assert grid.ax_row_dendrogram is not None, "应存在行聚类树"
assert grid.ax_col_dendrogram is not None, "应存在列聚类树"
grid.fig.suptitle("品类与区域客单价聚类", y=1.02)
plt.show()

print("✓ 自检通过：聚类热力图含热力主体与行列聚类树")
''',
        "migrate": '''# 独立迁移练习：换一种聚类距离，观察分组结果的变化
import matplotlib.pyplot as plt
import seaborn as sns

# 起点（已可运行）：用 method 换聚类算法（如 single/complete/ward）
category_region = orders.pivot_table(
    index="category", columns="region", values="order_value", aggfunc="mean"
).dropna()
grid = sns.clustermap(
    category_region, cmap="Blues", method="complete", figsize=(7, 6), row_cluster=True, col_cluster=True
)
grid.fig.suptitle("品类与区域客单价聚类（complete）", y=1.02)
plt.show()

change_note = "待填写"
expected_change = "待填写"
observed_change = "运行后填写"
print(f"改动：{change_note}")
print(f"预期：{expected_change}")
print(f"观察：{observed_change}")
''',
    },
    "course-chapter-57.ipynb": {  # 63. 分面图 FacetGrid
        "check": '''# 诊断式自检：核对分面图的结构
import matplotlib.pyplot as plt
import seaborn as sns

grid = sns.relplot(
    data=marketing, x="visits", y="sales", col="channel", col_wrap=3, height=3.3
)

assert grid.axes is not None, "应生成分面子图"
assert len(grid.axes.flat) >= marketing["channel"].nunique(), "分面数应不少于渠道数"
grid.fig.suptitle("分渠道访问量与销售额", y=1.04)
plt.show()

print("✓ 自检通过：分面图按渠道拆分，子图数充足")
''',
        "migrate": '''# 独立迁移练习：把 col 换成 row，观察行列分面的布局差异
import matplotlib.pyplot as plt
import seaborn as sns

# 起点（已可运行）：col 换 row，让渠道纵向排列
grid = sns.relplot(
    data=marketing,
    x="visits",
    y="sales",
    row="channel",
    hue="channel",
    height=3,
    aspect=1.6,
    palette="colorblind",
    legend=False,
)
grid.set_axis_labels("访问量", "销售额")
grid.fig.suptitle("分渠道访问量与销售额（行分面）", y=1.04)
plt.show()

change_note = "待填写"
expected_change = "待填写"
observed_change = "运行后填写"
print(f"改动：{change_note}")
print(f"预期：{expected_change}")
print(f"观察：{observed_change}")
''',
    },
}

# ==================== plotly 模块（第65–81章） ====================
PLT = {
    "course-chapter-58.ipynb": {  # 65. 图表结构与 Hover
        "check": '''# 诊断式自检：核对 Plotly Figure 的基本结构
import plotly.express as px

fig = px.line(monthly, x="month", y="sales", markers=True, title="Plotly Figure基础")
fig.update_layout(xaxis_title="月份", yaxis_title="销售额（万元）", hovermode="x unified")

assert len(fig.data) == 1, "应只有一条 trace"
assert fig.data[0].type == "scatter", "折线 trace 类型应为 scatter"
assert fig.layout.title.text != "", "应设置标题"
assert fig.layout.hovermode is not None, "应设置 hover 模式"

print("✓ 自检通过：Figure 含 1 条 scatter trace，标题与 hover 模式已设置")
''',
        "migrate": '''# 独立迁移练习：给 hover 增加一个额外字段，让悬停信息更丰富
import plotly.express as px

# 起点（已可运行）：增加 hover_data，把「订单量」也带进悬停提示
fig = px.line(
    monthly,
    x="month",
    y="sales",
    markers=True,
    hover_data={"month": False, "sales": ":.1f"},
    title="Plotly Figure基础（含悬停）",
)
fig.update_layout(xaxis_title="月份", yaxis_title="销售额（万元）", hovermode="x unified")
fig.show()

change_note = "待填写"
expected_change = "待填写"
observed_change = "运行后填写"
print(f"改动：{change_note}")
print(f"预期：{expected_change}")
print(f"观察：{observed_change}")
''',
    },
    "course-chapter-59.ipynb": {  # 66. 交互折线图 px.line
        "check": '''# 诊断式自检：核对交互折线图的结构
import plotly.express as px

fig = px.line(monthly, x="month", y="sales", markers=True, title="上半年销售额趋势")
fig.update_layout(xaxis_title="月份", yaxis_title="销售额（万元）")

assert len(fig.data) == 1, "应有一条折线 trace"
assert len(fig.data[0].x) == len(monthly), "折线数据点数应与月份一致"
assert fig.layout.title.text != "", "应设置标题"

print("✓ 自检通过：交互折线图数据完整，标题已设置")
''',
        "migrate": '''# 独立迁移练习：把「销售额」换成「订单量」，并加一条目标线对比
import plotly.express as px

# 起点（已可运行）：换 y 字段 + 添加水平参考线
fig = px.line(monthly, x="month", y="orders", markers=True, title="上半年订单量趋势")
fig.add_hline(y=monthly["orders"].mean(), line_dash="dash", line_color="#d93025")
fig.update_layout(xaxis_title="月份", yaxis_title="订单量（笔）", hovermode="x unified")
fig.show()

change_note = "待填写"
expected_change = "待填写"
observed_change = "运行后填写"
print(f"改动：{change_note}")
print(f"预期：{expected_change}")
print(f"观察：{observed_change}")
''',
    },
    "course-chapter-60.ipynb": {  # 67. 交互柱状图 px.bar
        "check": '''# 诊断式自检：核对交互柱状图的结构
import plotly.express as px

totals = regional.groupby("region", as_index=False)["sales"].sum().sort_values("sales")
fig = px.bar(totals, x="sales", y="region", orientation="h", text_auto=True, title="区域总销售额")
fig.update_layout(xaxis_title="销售额（万元）", yaxis_title="区域")

assert len(fig.data) == 1, "应有一条 bar trace"
assert len(fig.data[0].y) == len(totals), "柱子数应等于区域数"
assert fig.data[0].orientation == "h", "应为水平柱状图"

print("✓ 自检通过：水平柱状图柱子数与区域一致")
''',
        "migrate": '''# 独立迁移练习：用 color 按区域着色，突出最高与最低
import plotly.express as px

# 起点（已可运行）：增加 color="region" 给每根柱子着色
totals = regional.groupby("region", as_index=False)["sales"].sum().sort_values("sales")
fig = px.bar(
    totals,
    x="sales",
    y="region",
    orientation="h",
    text_auto=True,
    color="region",
    color_discrete_sequence=px.colors.qualitative.Set2,
    title="区域总销售额（分色）",
)
fig.update_layout(xaxis_title="销售额（万元）", yaxis_title="区域", showlegend=False)
fig.show()

change_note = "待填写"
expected_change = "待填写"
observed_change = "运行后填写"
print(f"改动：{change_note}")
print(f"预期：{expected_change}")
print(f"观察：{observed_change}")
''',
    },
    "course-chapter-61.ipynb": {  # 68. 交互散点图 px.scatter
        "check": '''# 诊断式自检：核对交互散点图的结构
import plotly.express as px

fig = px.scatter(orders, x="items", y="order_value", color="category", title="购买件数与客单价")
fig.update_layout(xaxis_title="购买件数", yaxis_title="客单价（元）")

assert len(fig.data) >= 1, "应至少有一条 scatter trace"
assert fig.data[0].type == "scatter", "应为散点 trace"
assert fig.layout.title.text != "", "应设置标题"

print("✓ 自检通过：交互散点图已生成 scatter trace，标题已设置")
''',
        "migrate": '''# 独立迁移练习：用 size 编码销售额，把散点升级为气泡图
import plotly.express as px

# 起点（已可运行）：增加 size="sales"，点的大小编码总销售额
fig = px.scatter(
    orders,
    x="items",
    y="order_value",
    color="category",
    size="sales",
    size_max=25,
    opacity=0.7,
    title="购买件数、客单价与销售额",
)
fig.update_layout(xaxis_title="购买件数", yaxis_title="客单价（元）", legend_title="品类")
fig.show()

change_note = "待填写"
expected_change = "待填写"
observed_change = "运行后填写"
print(f"改动：{change_note}")
print(f"预期：{expected_change}")
print(f"观察：{observed_change}")
''',
    },
    "course-chapter-62.ipynb": {  # 69. 交互气泡图
        "check": '''# 诊断式自检：核对气泡图的结构
import plotly.express as px

category_summary = orders.groupby("category", as_index=False).agg(
    order_value=("order_value", "mean"), items=("items", "mean"), sales=("sales", "sum")
)
fig = px.scatter(
    category_summary, x="items", y="order_value", size="sales", color="category", text="category"
)

assert len(fig.data) >= 1, "应至少有一条 scatter trace"
assert fig.data[0].marker.size is not None, "点的尺寸应编码销售额"
assert len(fig.data[0].x) == len(category_summary), "点数应等于品类数"

print("✓ 自检通过：气泡图点数与品类一致，尺寸已编码销售额")
''',
        "migrate": '''# 独立迁移练习：换尺寸字段，用「订单量」替代「销售额」编码气泡大小
import plotly.express as px

# 起点（已可运行）：size 换成 items（平均件数），观察不同编码下的气泡
category_summary = orders.groupby("category", as_index=False).agg(
    order_value=("order_value", "mean"), items=("items", "mean"), count=("sales", "count")
)
fig = px.scatter(
    category_summary,
    x="count",
    y="order_value",
    size="items",
    color="category",
    size_max=70,
    text="category",
    title="品类订单规模气泡图",
)
fig.update_layout(xaxis_title="订单量", yaxis_title="平均客单价（元）", showlegend=False)
fig.show()

change_note = "待填写"
expected_change = "待填写"
observed_change = "运行后填写"
print(f"改动：{change_note}")
print(f"预期：{expected_change}")
print(f"观察：{observed_change}")
''',
    },
    "course-chapter-63.ipynb": {  # 70. 交互面积图 px.area
        "check": '''# 诊断式自检：核对交互面积图的结构
import plotly.express as px

fig = px.area(monthly, x="month", y="sales", markers=True, title="上半年销售额面积图")
fig.update_layout(xaxis_title="月份", yaxis_title="销售额（万元）")

assert len(fig.data) == 1, "应有一条 area trace"
assert fig.data[0].type == "scatter", "面积图 trace 类型应为 scatter"
assert len(fig.data[0].x) == len(monthly), "数据点数应与月份一致"

print("✓ 自检通过：交互面积图数据完整，标题已设置")
''',
        "migrate": '''# 独立迁移练习：按月份叠加多条面积，比较不同口径的构成
import plotly.express as px

# 起点（已可运行）：把销售额与利润画成两条面积，观察构成变化
monthly_long = monthly.melt(id_vars="month", value_vars=["sales", "profit"], var_name="指标", value_name="金额")
fig = px.area(
    monthly_long, x="month", y="金额", color="指标", title="销售额与利润面积对比"
)
fig.update_layout(xaxis_title="月份", yaxis_title="金额（万元）", hovermode="x unified")
fig.show()

change_note = "待填写"
expected_change = "待填写"
observed_change = "运行后填写"
print(f"改动：{change_note}")
print(f"预期：{expected_change}")
print(f"观察：{observed_change}")
''',
    },
    "course-chapter-64.ipynb": {  # 71. 交互直方图 px.histogram
        "check": '''# 诊断式自检：核对交互直方图的结构
import plotly.express as px

fig = px.histogram(orders, x="order_value", nbins=20, title="订单金额分布")
fig.update_layout(xaxis_title="客单价（元）", yaxis_title="订单数")

assert len(fig.data) == 1, "应有一条 histogram trace"
assert fig.data[0].type == "histogram", "应为直方图 trace"

print("✓ 自检通过：交互直方图已生成 histogram trace")
''',
        "migrate": '''# 独立迁移练习：按渠道分色直方图，观察重叠分布
import plotly.express as px

# 起点（已可运行）：增加 color="channel"，把金额分布按渠道分层
fig = px.histogram(
    orders, x="order_value", nbins=20, color="channel", opacity=0.7, title="分渠道订单金额分布"
)
fig.update_layout(xaxis_title="客单价（元）", yaxis_title="订单数", bargap=0.04)
fig.show()

change_note = "待填写"
expected_change = "待填写"
observed_change = "运行后填写"
print(f"改动：{change_note}")
print(f"预期：{expected_change}")
print(f"观察：{observed_change}")
''',
    },
    "course-chapter-65.ipynb": {  # 72. 交互箱线图 px.box
        "check": '''# 诊断式自检：核对交互箱线图的结构
import plotly.express as px

fig = px.box(orders, x="category", y="order_value", color="category", points="outliers", title="品类客单价箱线图")
fig.update_layout(xaxis_title="品类", yaxis_title="客单价（元）")

assert len(fig.data) >= 1, "应至少有一条 box trace"
assert fig.data[0].type == "box", "应为箱线图 trace"

print("✓ 自检通过：交互箱线图已生成 box trace")
''',
        "migrate": '''# 独立迁移练习：按渠道分组箱线，比较渠道间的金额分布
import plotly.express as px

# 起点（已可运行）：x 换成 channel，看不同渠道的客单价分布
fig = px.box(
    orders,
    x="channel",
    y="order_value",
    color="channel",
    points="outliers",
    title="分渠道客单价箱线图",
)
fig.update_layout(xaxis_title="渠道", yaxis_title="客单价（元）", showlegend=False)
fig.show()

change_note = "待填写"
expected_change = "待填写"
observed_change = "运行后填写"
print(f"改动：{change_note}")
print(f"预期：{expected_change}")
print(f"观察：{observed_change}")
''',
    },
    "course-chapter-66.ipynb": {  # 73. 交互小提琴图 px.violin
        "check": '''# 诊断式自检：核对交互小提琴图的结构
import plotly.express as px

fig = px.violin(orders, x="category", y="order_value", color="category", box=True, title="品类客单价小提琴图")
fig.update_layout(xaxis_title="品类", yaxis_title="客单价（元）")

assert len(fig.data) >= 1, "应至少有一条 violin trace"
assert fig.data[0].type == "violin", "应为小提琴图 trace"

print("✓ 自检通过：交互小提琴图已生成 violin trace")
''',
        "migrate": '''# 独立迁移练习：按渠道分面，观察不同渠道的密度形状
import plotly.express as px

# 起点（已可运行）：增加 facet_col 或 color，比较渠道间密度
fig = px.violin(
    orders,
    x="channel",
    y="order_value",
    color="channel",
    box=True,
    points=False,
    title="分渠道客单价小提琴图",
)
fig.update_layout(xaxis_title="渠道", yaxis_title="客单价（元）", showlegend=False)
fig.show()

change_note = "待填写"
expected_change = "待填写"
observed_change = "运行后填写"
print(f"改动：{change_note}")
print(f"预期：{expected_change}")
print(f"观察：{observed_change}")
''',
    },
    "course-chapter-67.ipynb": {  # 74. 交互热力图 px.imshow
        "check": '''# 诊断式自检：核对交互热力图的结构
import plotly.express as px

matrix = orders.pivot_table(
    index="region", columns="category", values="sales", aggfunc="sum", fill_value=0
)
fig = px.imshow(matrix, text_auto=".0f", color_continuous_scale="Blues", aspect="auto")
fig.update_layout(xaxis_title="品类", yaxis_title="区域")

assert len(fig.data) == 1, "应有一条 heatmap trace"
assert fig.data[0].type == "heatmap", "应为热力图 trace"
assert fig.data[0].z.shape == matrix.shape, "热力矩阵形状应与原矩阵一致"

print("✓ 自检通过：热力图矩阵形状一致，已生成 heatmap trace")
''',
        "migrate": '''# 独立迁移练习：换一种色盘，观察色阶对读图的影响
import plotly.express as px

# 起点（已可运行）：色盘换成 YlOrRd，比较冷暖色盘对高值的强调差异
matrix = orders.pivot_table(
    index="region", columns="category", values="sales", aggfunc="sum", fill_value=0
)
fig = px.imshow(
    matrix, text_auto=".0f", color_continuous_scale="YlOrRd", aspect="auto", title="区域品类销售额（YlOrRd）"
)
fig.update_layout(xaxis_title="品类", yaxis_title="区域", coloraxis_colorbar_title="销售额")
fig.show()

change_note = "待填写"
expected_change = "待填写"
observed_change = "运行后填写"
print(f"改动：{change_note}")
print(f"预期：{expected_change}")
print(f"观察：{observed_change}")
''',
    },
    "course-chapter-68.ipynb": {  # 75. 矩形树图 px.treemap
        "check": '''# 诊断式自检：核对矩形树图的结构
import plotly.express as px

fig = px.treemap(
    hierarchy, path=["department", "category"], values="sales", color="sales", title="部门与品类销售结构"
)

assert len(fig.data) == 1, "应有一条 treemap trace"
assert fig.data[0].type == "treemap", "应为矩形树图 trace"

print("✓ 自检通过：矩形树图已生成 treemap trace")
''',
        "migrate": '''# 独立迁移练习：换一种颜色编码，用「部门」而非「销售额」着色
import plotly.express as px

# 起点（已可运行）：color 从 sales 换成 department，用类别而非数值着色
fig = px.treemap(
    hierarchy,
    path=["department", "category"],
    values="sales",
    color="department",
    color_discrete_sequence=px.colors.qualitative.Set2,
    title="部门与品类销售结构（按部门着色）",
)
fig.update_traces(textinfo="label+value+percent parent")
fig.show()

change_note = "待填写"
expected_change = "待填写"
observed_change = "运行后填写"
print(f"改动：{change_note}")
print(f"预期：{expected_change}")
print(f"观察：{observed_change}")
''',
    },
    "course-chapter-69.ipynb": {  # 76. 旭日图 px.sunburst
        "check": '''# 诊断式自检：核对旭日图的结构
import plotly.express as px

fig = px.sunburst(hierarchy, path=["department", "category"], values="sales", title="部门与品类销售层级")

assert len(fig.data) == 1, "应有一条 sunburst trace"
assert fig.data[0].type == "sunburst", "应为旭日图 trace"

print("✓ 自检通过：旭日图已生成 sunburst trace")
''',
        "migrate": '''# 独立迁移练习：用「订单量」替代「销售额」，观察层级结构的变化
import plotly.express as px

# 起点（已可运行）：values 换成 sales 的另一口径，观察各层级贡献是否改变
fig = px.sunburst(
    hierarchy,
    path=["department", "category"],
    values="sales",
    color="department",
    title="部门与品类销售层级",
)
fig.update_traces(textinfo="label+percent parent")
fig.show()

change_note = "待填写"
expected_change = "待填写"
observed_change = "运行后填写"
print(f"改动：{change_note}")
print(f"预期：{expected_change}")
print(f"观察：{observed_change}")
''',
    },
    "course-chapter-70.ipynb": {  # 77. 漏斗图 px.funnel
        "check": '''# 诊断式自检：核对漏斗图的结构
import plotly.express as px

fig = px.funnel(funnel, x="users", y="stage", title="用户转化漏斗")
fig.update_traces(textinfo="value+percent initial+percent previous")

assert len(fig.data) == 1, "应有一条 funnel trace"
assert fig.data[0].type == "funnel", "应为漏斗图 trace"
assert len(fig.data[0].y) == len(funnel), "漏斗层级数应与阶段数一致"

print("✓ 自检通过：漏斗图层级与阶段一致，已生成 funnel trace")
''',
        "migrate": '''# 独立迁移练习：换一个转化指标，观察不同阶段的流失差异
import plotly.express as px

# 起点（已可运行）：把 users 换成金额，比较用户漏斗与金额漏斗的差异
funnel_money = funnel.assign(money=funnel["users"] * 3.2)
fig = px.funnel(funnel_money, x="money", y="stage", title="用户转化金额漏斗")
fig.update_traces(textinfo="value+percent initial+percent previous")
fig.update_layout(xaxis_title="金额（元）", yaxis_title="阶段")
fig.show()

change_note = "待填写"
expected_change = "待填写"
observed_change = "运行后填写"
print(f"改动：{change_note}")
print(f"预期：{expected_change}")
print(f"观察：{observed_change}")
''',
    },
    "course-chapter-71.ipynb": {  # 78. 瀑布图 Waterfall
        "check": '''# 诊断式自检：核对瀑布图的结构
import plotly.graph_objects as go

fig = go.Figure(
    go.Waterfall(
        name="利润变化",
        orientation="v",
        measure=["absolute", "relative", "relative", "relative", "relative", "total"],
        x=["上期利润", "销售增长", "提价", "营销费用", "物流费用", "本期利润"],
        y=[120, 48, 22, -18, -12, 0],
    )
)
fig.update_layout(title="利润变化贡献", showlegend=False)

assert len(fig.data) == 1, "应有一条 waterfall trace"
assert fig.data[0].type == "waterfall", "应为瀑布图 trace"
assert len(fig.data[0].x) == 6, "应包含 6 个贡献项"

print("✓ 自检通过：瀑布图含 6 个贡献项，已生成 waterfall trace")
''',
        "migrate": '''# 独立迁移练习：换一组经营数据，练习瀑布图的增减项设计
import plotly.graph_objects as go

# 起点（已可运行）：换一组「成本构成」数据，观察增减项的设置
fig = go.Figure(
    go.Waterfall(
        name="成本构成",
        orientation="v",
        measure=["absolute", "relative", "relative", "relative", "relative", "total"],
        x=["总成本", "原材料", "人工", "物流", "营销", "净成本"],
        y=[200, 90, 40, 25, 15, 0],
        connector={"line": {"color": "#9aa0a6"}},
        textposition="outside",
    )
)
fig.update_layout(title="成本构成贡献", yaxis_title="成本（万元）", showlegend=False)
fig.show()

change_note = "待填写"
expected_change = "待填写"
observed_change = "运行后填写"
print(f"改动：{change_note}")
print(f"预期：{expected_change}")
print(f"观察：{observed_change}")
''',
    },
    "course-chapter-72.ipynb": {  # 79. 时间线 px.timeline
        "check": '''# 诊断式自检：核对时间线图的结构
import plotly.express as px

fig = px.timeline(timeline, x_start="start", x_end="finish", y="task", color="owner", title="数据分析项目时间线")

assert len(fig.data) == 1, "应有一条 timeline trace"
assert fig.data[0].type == "bar", "时间线 trace 类型应为 bar"
assert len(fig.data[0].y) == len(timeline), "任务条数应与任务数一致"

print("✓ 自检通过：时间线任务条数与任务一致")
''',
        "migrate": '''# 独立迁移练习：按负责人分面，观察各成员的排期
import plotly.express as px

# 起点（已可运行）：增加 facet_col，按负责人拆分时间线
fig = px.timeline(
    timeline,
    x_start="start",
    x_end="finish",
    y="task",
    color="owner",
    facet_col="owner",
    title="分负责人项目时间线",
)
fig.update_yaxes(autorange="reversed")
fig.update_xaxes(title="日期")
fig.update_layout(legend_title="负责人")
fig.show()

change_note = "待填写"
expected_change = "待填写"
observed_change = "运行后填写"
print(f"改动：{change_note}")
print(f"预期：{expected_change}")
print(f"观察：{observed_change}")
''',
    },
    "course-chapter-73.ipynb": {  # 80. 地图图表 scatter_geo
        "check": '''# 诊断式自检：核对地图气泡图的结构
import plotly.express as px

fig = px.scatter_geo(
    countries,
    locations="country",
    locationmode="country names",
    size="sales",
    color="growth",
    projection="natural earth",
)

assert len(fig.data) == 1, "应有一条 scattergeo trace"
assert fig.data[0].type == "scattergeo", "应为地图散点 trace"
assert fig.data[0].locations is not None, "应指定国家位置"

print("✓ 自检通过：地图气泡图已生成 scattergeo trace，位置已指定")
''',
        "migrate": '''# 独立迁移练习：换一种投影，观察地图形态的变化
import plotly.express as px

# 起点（已可运行）：projection 换成 mercator 或 orthographic
fig = px.scatter_geo(
    countries,
    locations="country",
    locationmode="country names",
    size="sales",
    color="growth",
    hover_name="market",
    projection="mercator",
    color_continuous_scale="Blues",
    title="Gapminder：人均GDP与预期寿命（墨卡托）",
)
fig.update_layout(coloraxis_colorbar_title="预期寿命")
fig.show()

change_note = "待填写"
expected_change = "待填写"
observed_change = "运行后填写"
print(f"改动：{change_note}")
print(f"预期：{expected_change}")
print(f"观察：{observed_change}")
''',
    },
    "course-chapter-74.ipynb": {  # 81. 子图、控件与导出
        "check": '''# 诊断式自检：核对子图布局的结构
import plotly.graph_objects as go
from plotly.subplots import make_subplots

fig = make_subplots(rows=1, cols=2, subplot_titles=["销售趋势", "区域销售"])
fig.add_trace(go.Scatter(x=monthly["month"], y=monthly["sales"], mode="lines+markers"), row=1, col=1)
totals = regional.groupby("region", as_index=False)["sales"].sum()
fig.add_trace(go.Bar(x=totals["region"], y=totals["sales"]), row=1, col=2)
fig.update_layout(title="经营看板")

assert len(fig.data) == 2, "应有两条 trace（折线 + 柱状）"
assert len(fig.layout.annotations) == 2, "应有两个子图标题"

print("✓ 自检通过：子图含 2 条 trace 与 2 个子图标题")
''',
        "migrate": '''# 独立迁移练习：增加一个控件，让图表可交互切换
import plotly.graph_objects as go
from plotly.subplots import make_subplots

# 起点（已可运行）：给折线加 range slider，让时间范围可拖动
fig = make_subplots(rows=1, cols=2, subplot_titles=["销售趋势", "区域销售"])
fig.add_trace(
    go.Scatter(x=monthly["month"], y=monthly["sales"], mode="lines+markers", name="销售额"),
    row=1,
    col=1,
)
totals = regional.groupby("region", as_index=False)["sales"].sum()
fig.add_trace(
    go.Bar(x=totals["region"], y=totals["sales"], name="区域销售"),
    row=1,
    col=2,
)
fig.update_layout(title="经营看板（含滑块）", xaxis=dict(rangeslider=dict(visible=True)))
fig.show()

change_note = "待填写"
expected_change = "待填写"
observed_change = "运行后填写"
print(f"改动：{change_note}")
print(f"预期：{expected_change}")
print(f"观察：{observed_change}")
''',
    },
}


def find_cell_index(nb, kind):
    """按内容特征定位 cell：kind='check'|'migrate'。

    优先匹配旧模板特征；若已替换（找不到旧特征），返回 None 由调用方静默跳过。
    """
    for i, c in enumerate(nb.get("cells", [])):
        if c.get("cell_type") != "code":
            continue
        src = "".join(c.get("source", []))
        if kind == "check" and "review = {" in src and "待确认" in src:
            return i
        if kind == "migrate" and "在此粘贴或改写" in src:
            return i
    return None


def main():
    scope = "matplotlib"
    if "--scope" in sys.argv:
        scope = sys.argv[sys.argv.index("--scope") + 1]

    tables = []
    if scope in ("matplotlib", "all"):
        tables.append(("matplotlib", MPL))
    if scope in ("seaborn", "all"):
        tables.append(("seaborn", SNS))
    if scope in ("plotly", "all"):
        tables.append(("plotly", PLT))

    os.makedirs(BACKUP, exist_ok=True)
    stats = {"check": 0, "migrate": 0}
    changed_files = []

    for mod, content in tables:
        for rel, cells in content.items():
            p = COURSE / rel
            if not p.exists():
                print(f"跳过（不存在）: {rel}")
                continue
            nb = json.loads(p.read_text(encoding="utf-8"))
            shutil.copy2(p, BACKUP / rel)
            dirty = False

            for kind, src in cells.items():
                idx = find_cell_index(nb, kind)
                if idx is None:
                    continue  # 已替换过（幂等），静默跳过
                try:
                    ast.parse(src)
                except SyntaxError as e:
                    print(f"  !! {rel} {kind}: 语法错误 {e}，跳过")
                    continue
                if "".join(nb["cells"][idx].get("source", [])) == src:
                    continue  # 幂等
                nb["cells"][idx]["source"] = src.splitlines(keepends=True)
                stats[kind] += 1
                dirty = True

            if dirty:
                p.write_text(json.dumps(nb, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
                changed_files.append(rel)

    print(f"scope={scope}  改写文件={len(changed_files)}")
    print(f"  自检cell={stats['check']}  迁移cell={stats['migrate']}")
    for f in changed_files:
        print(f"  - {f}")


if __name__ == "__main__":
    main()
