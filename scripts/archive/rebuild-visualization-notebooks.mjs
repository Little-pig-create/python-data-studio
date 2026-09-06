import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = path.join(root, "notebooks", "course");

const sourceLines = (source) => {
  const normalized = `${source.trim()}\n`;
  return normalized.match(/[^\n]*\n|[^\n]+$/g) || [];
};

const markdown = (id, source) => ({
  id,
  cell_type: "markdown",
  metadata: {},
  source: sourceLines(source)
});

const code = (id, source, tags = []) => ({
  id,
  cell_type: "code",
  execution_count: null,
  metadata: tags.length ? { tags } : {},
  outputs: [],
  source: sourceLines(source)
});

const createNotebook = (chapter, module, cells) => ({
  cells,
  metadata: {
    course_content_version: 2,
    course: { chapter, module },
    kernelspec: {
      display_name: "Python 3",
      language: "python",
      name: "python3"
    },
    language_info: {
      name: "python",
      version: "3.x",
      pygments_lexer: "ipython3"
    }
  },
  nbformat: 4,
  nbformat_minor: 5
});

const notebooks = [
  {
    file: "第19章_Matplotlib绘图基础.ipynb",
    chapter: 19,
    module: "matplotlib",
    cells: [
      markdown("ch19-intro", `
# 第19章 Matplotlib绘图基础

Matplotlib适合制作可精确控制、可导出的静态图。本章只解决一个核心问题：**怎样把一组数据稳定地画成一张信息完整的图**。

## 学习目标

- 区分\`Figure\`（整张画布）与\`Axes\`（具体绘图区）；
- 使用面向对象接口完成“创建 → 绘制 → 标注 → 布局 → 显示”；
- 为图表补齐标题、坐标轴、图例、网格和单位；
- 根据分析问题选择趋势图、比较图或关系图。

**本章产出**：一张能够独立说明“半年销售趋势”的折线图。`),
      markdown("ch19-setup-notes", `
## 0. 准备一份可复现的数据

先集中完成导入和数据准备，后续单元格只关注绘图。月份是有序类别，销售额和订单量是两个数值序列。`),
      code("ch19-setup", `
import numpy as np
import matplotlib.pyplot as plt

months = np.array(['1月', '2月', '3月', '4月', '5月', '6月'])
revenue = np.array([12.0, 15.5, 14.2, 18.8, 21.4, 24.6])
orders = np.array([118, 146, 139, 172, 194, 221])

print(f'月份数: {len(months)}')
print(f'销售额范围: {revenue.min():.1f}–{revenue.max():.1f} 万元')`),
      markdown("ch19-first-chart-notes", `
## 1. 从一张最小可用图开始

折线图回答“指标如何随有序时间变化”。\`marker\`帮助确认每个点都是一次真实观测，网格只沿Y轴显示，避免干扰月份阅读。

观察图后回答：增长是否连续？哪一个月出现回落？`),
      code("ch19-first-chart", `
fig, ax = plt.subplots(figsize=(8, 4.2))
ax.plot(months, revenue, marker='o', linewidth=2, color='#1a73e8')
ax.set(
    title='上半年销售额趋势',
    xlabel='月份',
    ylabel='销售额（万元）'
)
ax.grid(axis='y', alpha=0.25)
fig.tight_layout()
plt.show()`),
      markdown("ch19-object-model-notes", `
## 2. 理解 Figure 与 Axes

- \`fig\`管理画布大小、多个子图和最终导出；
- \`ax\`管理数据线、坐标轴、标题、图例和注释；
- 一张图可以有多个\`Axes\`，每个\`Axes\`可以包含多条数据序列。

实际项目中优先使用\`fig, ax = plt.subplots()\`，比依赖全局状态的\`plt.plot()\`更容易维护。`),
      code("ch19-object-model", `
revenue_index = revenue / revenue[0] * 100
order_index = orders / orders[0] * 100

fig, ax = plt.subplots(figsize=(8, 4.2))
ax.plot(months, revenue_index, marker='o', label='销售额指数')
ax.plot(months, order_index, marker='s', label='订单量指数')
ax.axhline(100, color='#9aa0a6', linewidth=1, linestyle='--')
ax.set(title='销售额与订单量的相对变化', ylabel='指数（1月=100）')
ax.legend(frameon=False, ncol=2)
ax.grid(axis='y', alpha=0.2)
fig.tight_layout()
plt.show()

print('画布中的绘图区数量:', len(fig.axes))
print('当前绘图区中的数据线数量:', len(ax.lines))`),
      markdown("ch19-annotation-notes", `
## 3. 让图表能够独立表达

一张脱离代码仍能读懂的图，至少需要：

1. 标题说明主题；
2. 坐标轴包含指标和单位；
3. 图例只在存在多条序列时使用；
4. 注释指向真正值得解释的变化。

下面只标记最低点和最高点，不给每个数据点都堆上文字。`),
      code("ch19-annotation", `
low_index = int(revenue.argmin())
high_index = int(revenue.argmax())

fig, ax = plt.subplots(figsize=(8, 4.2))
ax.plot(months, revenue, marker='o', linewidth=2.2, color='#188038')
ax.fill_between(months, revenue, revenue.min() - 1, color='#188038', alpha=0.08)
ax.annotate(
    f'最低 {revenue[low_index]:.1f}',
    (months[low_index], revenue[low_index]),
    xytext=(12, -28),
    textcoords='offset points',
    arrowprops={'arrowstyle': '->', 'color': '#5f6368'}
)
ax.annotate(
    f'最高 {revenue[high_index]:.1f}',
    (months[high_index], revenue[high_index]),
    xytext=(-52, 24),
    textcoords='offset points',
    arrowprops={'arrowstyle': '->', 'color': '#5f6368'}
)
ax.set(title='上半年销售额：4月后增长加快', ylabel='销售额（万元）')
ax.spines[['top', 'right']].set_visible(False)
ax.grid(axis='y', alpha=0.2)
fig.tight_layout()
plt.show()`),
      markdown("ch19-choice-guide", `
## 4. 先问问题，再选图表

| 分析问题 | 首选图表 | 关键检查 |
| --- | --- | --- |
| 指标随时间怎样变化？ | 折线图 | X轴是否具有自然顺序 |
| 哪个类别更高？ | 排序柱状图 | 是否从零开始、单位是否一致 |
| 两个变量是否一起变化？ | 散点图 | 是否存在离群点或分组差异 |
| 数值集中在哪个区间？ | 直方图、箱线图 | 样本量与分箱是否合理 |

不要因为图表“好看”而选择它。图表类型必须服务于问题。`),
      markdown("ch19-practice-notes", `
## 5. 练习：完成一张交付级趋势图

运行下面的代码后完成三项修改：

1. 将标题改成一句结论；
2. 标记增长最快的相邻月份；
3. 把销售额替换为你自己的六期数据，检查单位是否仍然正确。`),
      code("ch19-practice", `
growth = np.diff(revenue)
fastest = int(growth.argmax()) + 1

fig, ax = plt.subplots(figsize=(8, 4.2))
ax.plot(months, revenue, marker='o', linewidth=2, color='#1a73e8')
ax.scatter(months[fastest], revenue[fastest], s=90, color='#d93025', zorder=3)
ax.annotate(
    f'环比增加 {growth[fastest - 1]:.1f} 万元',
    (months[fastest], revenue[fastest]),
    xytext=(-70, 28),
    textcoords='offset points',
    arrowprops={'arrowstyle': '->', 'color': '#d93025'}
)
ax.set(title='上半年销售额总体上升', xlabel='月份', ylabel='销售额（万元）')
ax.spines[['top', 'right']].set_visible(False)
ax.grid(axis='y', alpha=0.2)
fig.tight_layout()
plt.show()` , ["exercise"]),
      markdown("ch19-summary", `
## 本章小结

- \`Figure\`负责整张画布，\`Axes\`负责具体绘图；
- 面向对象接口使多个图、注释和导出更可控；
- 标题回答“这是什么”，坐标轴回答“数值和单位是什么”；
- 选择图表前先明确是在分析趋势、比较、关系还是分布。

下一章将把这些基础组合成常用图表。`)
    ]
  },
  {
    file: "第20章_Matplotlib常用图表.ipynb",
    chapter: 20,
    module: "matplotlib",
    cells: [
      markdown("ch20-intro", `
# 第20章 Matplotlib常用图表

本章围绕同一份经营数据练习五类常用图表。重点不是记住函数名，而是建立“**问题 → 数据结构 → 图表类型**”的映射。

## 学习目标

- 用折线图表达时间趋势；
- 用排序柱状图和堆积柱状图完成类别比较；
- 用散点图判断两个数值变量的关系；
- 用直方图和箱线图检查分布与异常值；
- 识别不适合使用饼图、双轴图的场景。`),
      markdown("ch20-setup-notes", `
## 0. 数据准备

\`monthly\`记录月度经营指标，\`regional\`记录各区域的渠道收入。两张表分别适合趋势分析和类别比较。`),
      code("ch20-setup", `
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

monthly = pd.DataFrame({
    'month': ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月'],
    'revenue': [120, 138, 131, 160, 176, 190, 205, 228],
    'ad_spend': [18, 20, 19, 24, 26, 28, 31, 34],
    'orders': [1180, 1290, 1240, 1430, 1550, 1680, 1770, 1920]
})

regional = pd.DataFrame({
    'region': ['华东', '华南', '华北', '西南'],
    'online': [86, 72, 64, 48],
    'offline': [42, 35, 38, 31]
})

monthly.head()`),
      markdown("ch20-line-notes", `
## 1. 折线图：回答时间趋势

时间必须按真实顺序排列。折线的斜率表达变化速度，因此不要用折线图连接没有自然顺序的类别。`),
      code("ch20-line", `
fig, ax = plt.subplots(figsize=(8, 4.2))
ax.plot(monthly['month'], monthly['revenue'], marker='o', color='#1a73e8')
ax.set(title='月度销售额持续增长', xlabel='月份', ylabel='销售额（万元）')
ax.spines[['top', 'right']].set_visible(False)
ax.grid(axis='y', alpha=0.2)
fig.tight_layout()
plt.show()`),
      markdown("ch20-bar-notes", `
## 2. 柱状图：回答类别比较

排序可以缩短读者寻找最大值的时间。水平柱状图更适合较长的类别名称，数值轴应从零开始，避免夸大差异。`),
      code("ch20-bar", `
totals = regional.assign(total=regional['online'] + regional['offline'])
totals = totals.sort_values('total')

fig, ax = plt.subplots(figsize=(8, 4.2))
bars = ax.barh(totals['region'], totals['total'], color='#1a73e8')
ax.bar_label(bars, padding=4, fmt='%.0f')
ax.set(title='华东区域销售额最高', xlabel='销售额（万元）')
ax.spines[['top', 'right', 'left']].set_visible(False)
ax.grid(axis='x', alpha=0.2)
fig.tight_layout()
plt.show()`),
      markdown("ch20-stacked-notes", `
## 3. 堆积柱状图：同时看总量与构成

堆积图适合比较总量和少量组成部分。只有最底部的序列共享同一基线，组成项过多时应改用分组柱状图或百分比图。`),
      code("ch20-stacked", `
fig, ax = plt.subplots(figsize=(8, 4.2))
ax.bar(regional['region'], regional['online'], label='线上', color='#1a73e8')
ax.bar(
    regional['region'],
    regional['offline'],
    bottom=regional['online'],
    label='线下',
    color='#f9ab00'
)
ax.set(title='各区域销售渠道构成', ylabel='销售额（万元）')
ax.legend(frameon=False, ncol=2)
ax.spines[['top', 'right']].set_visible(False)
ax.grid(axis='y', alpha=0.2)
fig.tight_layout()
plt.show()`),
      markdown("ch20-scatter-notes", `
## 4. 散点图：回答变量关系

每个点代表一条观测。趋势方向可以提示相关关系，但不能单凭图表证明因果。先检查异常点，再解释整体趋势。`),
      code("ch20-scatter", `
fig, ax = plt.subplots(figsize=(7.2, 4.5))
points = ax.scatter(
    monthly['ad_spend'],
    monthly['revenue'],
    s=monthly['orders'] / 8,
    c=np.arange(len(monthly)),
    cmap='Blues'
)
for _, row in monthly.iterrows():
    ax.annotate(row['month'], (row['ad_spend'], row['revenue']), xytext=(5, 4), textcoords='offset points')
ax.set(title='广告投入与销售额同向变化', xlabel='广告投入（万元）', ylabel='销售额（万元）')
ax.spines[['top', 'right']].set_visible(False)
ax.grid(alpha=0.18)
fig.tight_layout()
plt.show()`),
      markdown("ch20-distribution-notes", `
## 5. 直方图与箱线图：回答分布和异常

- 直方图显示数值落在哪些区间，分箱数量会影响形状；
- 箱线图概括中位数、四分位距和潜在离群点；
- 小样本不应依赖平滑曲线得出强结论。`),
      code("ch20-distribution", `
rng = np.random.default_rng(20)
order_values = np.concatenate([
    rng.normal(180, 42, 180),
    rng.normal(340, 55, 35),
    np.array([620, 690])
])

fig, axes = plt.subplots(1, 2, figsize=(9, 4))
axes[0].hist(order_values, bins=14, color='#1a73e8', edgecolor='white')
axes[0].set(title='订单金额分布', xlabel='订单金额（元）', ylabel='订单数')
axes[1].boxplot(order_values, vert=True, patch_artist=True, boxprops={'facecolor': '#d2e3fc'})
axes[1].set(title='订单金额箱线图', ylabel='订单金额（元）', xticks=[])
for ax in axes:
    ax.spines[['top', 'right']].set_visible(False)
    ax.grid(axis='y', alpha=0.18)
fig.tight_layout()
plt.show()`),
      markdown("ch20-choice-guide", `
## 图表选择速查

| 任务 | 图表 | 不应忽略 |
| --- | --- | --- |
| 时间变化 | 折线图 | 时间顺序、缺失时间点 |
| 类别高低 | 排序柱状图 | 从零开始、相同单位 |
| 总量与构成 | 堆积柱状图 | 组成项不要过多 |
| 两变量关系 | 散点图 | 离群点、分组、非线性 |
| 单变量分布 | 直方图 + 箱线图 | 样本量、分箱、偏态 |

饼图只适用于类别很少且总和确实为100%的情况；大多数比较任务用柱状图更容易读。`),
      markdown("ch20-practice-notes", `
## 6. 练习：制作渠道对比图

把下面的分组柱状图改成你的业务数据，并完成：

1. 对区域按总销售额排序；
2. 为最高的一组添加注释；
3. 用一句话写出图表结论。`),
      code("ch20-practice", `
x = np.arange(len(regional))
width = 0.36

fig, ax = plt.subplots(figsize=(8, 4.2))
ax.bar(x - width / 2, regional['online'], width, label='线上', color='#1a73e8')
ax.bar(x + width / 2, regional['offline'], width, label='线下', color='#f9ab00')
ax.set(
    title='所有区域的线上销售额均高于线下',
    ylabel='销售额（万元）',
    xticks=x,
    xticklabels=regional['region']
)
ax.legend(frameon=False, ncol=2)
ax.spines[['top', 'right']].set_visible(False)
ax.grid(axis='y', alpha=0.18)
fig.tight_layout()
plt.show()` , ["exercise"]),
      markdown("ch20-summary", `
## 本章小结

常用图表并不是一组互换的皮肤：折线图表达顺序，柱状图比较长度，散点图比较位置，直方图和箱线图描述分布。先确定分析任务，再选择最容易被准确读取的视觉编码。`)
    ]
  },
  {
    file: "第21章_图表美化与组合.ipynb",
    chapter: 21,
    module: "matplotlib",
    cells: [
      markdown("ch21-intro", `
# 第21章 图表美化与组合

美化的目标不是增加装饰，而是建立清晰的信息层级。本章从默认图出发，逐步处理颜色、格式、注释、多子图和导出。

## 学习目标

- 用有限颜色区分重点与背景；
- 格式化百分比、金额和刻度；
- 使用注释解释关键变化；
- 组合多个子图形成一致的分析面板；
- 正确导出PNG和SVG。`),
      markdown("ch21-setup-notes", `
## 0. 数据准备

使用季度业务数据制作一页静态经营简报。所有图表共享同一组季度和品牌色。`),
      code("ch21-setup", `
from io import BytesIO
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from matplotlib.ticker import FuncFormatter, PercentFormatter

quarterly = pd.DataFrame({
    'quarter': ['Q1', 'Q2', 'Q3', 'Q4'],
    'revenue': [320, 365, 410, 485],
    'profit': [42, 55, 61, 82],
    'conversion': [0.118, 0.126, 0.133, 0.151]
})

BLUE = '#1a73e8'
GREEN = '#188038'
GRAY = '#9aa0a6'
quarterly`),
      markdown("ch21-hierarchy-notes", `
## 1. 用视觉层级突出结论

同一张图中只保留一个主色。非重点元素使用中性色，移除没有信息价值的边框，并直接标记关键值。`),
      code("ch21-hierarchy", `
colors = [GRAY, GRAY, GRAY, BLUE]
fig, ax = plt.subplots(figsize=(8, 4.2))
bars = ax.bar(quarterly['quarter'], quarterly['revenue'], color=colors, width=0.62)
ax.bar_label(bars, padding=4, fmt='%.0f')
ax.set(title='Q4销售额达到全年最高', ylabel='销售额（万元）')
ax.spines[['top', 'right', 'left']].set_visible(False)
ax.tick_params(axis='y', length=0)
ax.grid(axis='y', alpha=0.16)
fig.tight_layout()
plt.show()`),
      markdown("ch21-format-notes", `
## 2. 格式化刻度和注释

展示层负责把小数转换为百分比、把大数增加单位。不要修改原始数据来迎合图表格式，计算值与展示值应分开。`),
      code("ch21-format", `
fig, ax = plt.subplots(figsize=(8, 4.2))
ax.plot(quarterly['quarter'], quarterly['conversion'], marker='o', linewidth=2.2, color=GREEN)
ax.yaxis.set_major_formatter(PercentFormatter(1.0))
ax.set(title='转化率逐季提升', ylabel='转化率')
ax.annotate(
    f"{quarterly['conversion'].iloc[-1]:.1%}",
    ('Q4', quarterly['conversion'].iloc[-1]),
    xytext=(-12, 18),
    textcoords='offset points',
    color=GREEN,
    fontweight='bold'
)
ax.spines[['top', 'right']].set_visible(False)
ax.grid(axis='y', alpha=0.18)
fig.tight_layout()
plt.show()`),
      markdown("ch21-subplots-notes", `
## 3. 多子图：统一阅读顺序

相关指标可以放在同一画布，但每个子图只承担一个问题。共享X轴能减少重复标签，标题使用同一语法和层级。`),
      code("ch21-subplots", `
fig, axes = plt.subplots(2, 1, figsize=(9, 6.2), sharex=True)

axes[0].bar(quarterly['quarter'], quarterly['revenue'], color=BLUE)
axes[0].set(title='销售额', ylabel='万元')

axes[1].plot(quarterly['quarter'], quarterly['profit'], marker='o', color=GREEN, linewidth=2)
axes[1].set(title='利润', ylabel='万元', xlabel='季度')

for ax in axes:
    ax.spines[['top', 'right']].set_visible(False)
    ax.grid(axis='y', alpha=0.16)

fig.suptitle('年度经营指标', fontsize=16, fontweight='bold', y=1.01)
fig.tight_layout()
plt.show()`),
      markdown("ch21-comparison-notes", `
## 4. 不同量纲优先转为指数

双Y轴容易让两条曲线看起来人为同步。若目标是比较变化速度，先把指标转换为“首期=100”的指数，通常比双轴更诚实。`),
      code("ch21-indexed", `
revenue_index = quarterly['revenue'] / quarterly['revenue'].iloc[0] * 100
profit_index = quarterly['profit'] / quarterly['profit'].iloc[0] * 100

fig, ax = plt.subplots(figsize=(8, 4.2))
ax.plot(quarterly['quarter'], revenue_index, marker='o', label='销售额指数', color=BLUE)
ax.plot(quarterly['quarter'], profit_index, marker='s', label='利润指数', color=GREEN)
ax.axhline(100, color=GRAY, linewidth=1, linestyle='--')
ax.set(title='利润增速快于销售额', ylabel='指数（Q1=100）')
ax.legend(frameon=False)
ax.spines[['top', 'right']].set_visible(False)
ax.grid(axis='y', alpha=0.16)
fig.tight_layout()
plt.show()`),
      markdown("ch21-export-notes", `
## 5. 导出静态图

- PNG适合文档、网页和聊天工具；
- SVG适合后续排版和无损缩放；
- \`bbox_inches='tight'\`避免标题或图例被裁切；
- 导出前确认尺寸、字体和背景色。

浏览器内核中的文件位于临时文件系统，下面用内存缓冲区验证导出结果。`),
      code("ch21-export", `
fig, ax = plt.subplots(figsize=(8, 4.2))
ax.plot(quarterly['quarter'], quarterly['revenue'], marker='o', color=BLUE)
ax.set(title='季度销售额', ylabel='万元')
ax.spines[['top', 'right']].set_visible(False)
fig.tight_layout()

png_buffer = BytesIO()
svg_buffer = BytesIO()
fig.savefig(png_buffer, format='png', dpi=180, bbox_inches='tight')
fig.savefig(svg_buffer, format='svg', bbox_inches='tight')
print(f'PNG大小: {png_buffer.getbuffer().nbytes / 1024:.1f} KB')
print(f'SVG大小: {svg_buffer.getbuffer().nbytes / 1024:.1f} KB')
plt.show()`),
      markdown("ch21-practice-notes", `
## 6. 综合练习：一页经营简报

在下面的双图面板基础上完成：

1. 给最高利润率季度加注释；
2. 统一标题语法、颜色和单位；
3. 写一句不超过30字的结论。`),
      code("ch21-practice", `
profit_margin = quarterly['profit'] / quarterly['revenue']

fig, axes = plt.subplots(1, 2, figsize=(10, 4.2))
axes[0].bar(quarterly['quarter'], quarterly['revenue'], color=[GRAY, GRAY, GRAY, BLUE])
axes[0].set(title='Q4销售额最高', ylabel='万元')

axes[1].plot(quarterly['quarter'], profit_margin, marker='o', color=GREEN, linewidth=2)
axes[1].yaxis.set_major_formatter(PercentFormatter(1.0))
axes[1].set(title='利润率稳步提升', ylabel='利润率')

for ax in axes:
    ax.spines[['top', 'right']].set_visible(False)
    ax.grid(axis='y', alpha=0.16)
fig.suptitle('年度经营简报', fontsize=16, fontweight='bold')
fig.tight_layout()
plt.show()` , ["exercise"]),
      markdown("ch21-summary", `
## 本章小结

有效的美化会减少读者的判断成本：主色表达重点，格式表达单位，注释表达原因，多子图表达结构。装饰不能代替结论，组合图也不能牺牲可比性。`)
    ]
  },
  {
    file: "第22章_Seaborn基础与分类图表.ipynb",
    chapter: 22,
    module: "seaborn",
    cells: [
      markdown("ch22-intro", `
# 第22章 Seaborn基础与分类图表

Seaborn建立在Matplotlib之上，擅长直接使用整洁的DataFrame完成分组统计和统一配色。本章重点学习分类变量与数值变量的组合。

## 学习目标

- 理解Seaborn与Matplotlib的分工；
- 使用长表数据映射\`x\`、\`y\`和\`hue\`；
- 区分频数、均值和完整分布；
- 使用\`countplot\`、\`barplot\`、\`boxplot\`和\`stripplot\`；
- 避免用均值柱状图掩盖样本量和离群点。`),
      markdown("ch22-setup-notes", `
## 0. 构造订单明细

每一行代表一笔订单，这种“每行一个观测、每列一个变量”的长表结构最适合Seaborn。固定随机种子保证每次运行得到同一结果。`),
      code("ch22-setup", `
import numpy as np
import pandas as pd
import seaborn as sns
import matplotlib.pyplot as plt

rng = np.random.default_rng(22)
n = 240
orders = pd.DataFrame({
    'category': rng.choice(['办公', '数码', '家居'], n, p=[0.34, 0.38, 0.28]),
    'channel': rng.choice(['自然流量', '广告', '会员'], n, p=[0.42, 0.36, 0.22]),
    'region': rng.choice(['华东', '华南', '华北'], n),
    'order_value': np.clip(rng.normal(260, 75, n), 45, None)
})
orders.loc[orders['category'] == '数码', 'order_value'] *= 1.35
orders['satisfied'] = rng.choice(['满意', '一般'], n, p=[0.78, 0.22])

sns.set_theme(style='whitegrid', context='notebook')
orders.head()`),
      markdown("ch22-relationship-notes", `
## 1. Seaborn与Matplotlib如何配合

Seaborn负责根据DataFrame列名完成统计映射，Matplotlib的\`Axes\`仍负责标题、坐标轴、注释和最终布局。常见流程是：

\`sns.xxxplot(data=df, ..., ax=ax)\` → \`ax.set(...)\` → \`fig.tight_layout()\`。`),
      code("ch22-api", `
fig, ax = plt.subplots(figsize=(8, 4.2))
sns.countplot(data=orders, x='category', color='#1a73e8', ax=ax)
ax.set(title='各品类订单量', xlabel='品类', ylabel='订单数')
ax.spines[['top', 'right']].set_visible(False)
fig.tight_layout()
plt.show()`),
      markdown("ch22-count-notes", `
## 2. countplot：比较频数

\`countplot\`统计每个类别出现的行数。它回答“有多少笔”，不是“金额是多少”。排序时显式传入\`order\`，避免类别顺序随数据变化。`),
      code("ch22-count", `
category_order = orders['category'].value_counts().index

fig, ax = plt.subplots(figsize=(8, 4.2))
sns.countplot(
    data=orders,
    y='category',
    order=category_order,
    hue='satisfied',
    palette=['#1a73e8', '#f9ab00'],
    ax=ax
)
ax.set(title='订单量及满意度构成', xlabel='订单数', ylabel='品类')
ax.legend(title='评价', frameon=False)
fig.tight_layout()
plt.show()`),
      markdown("ch22-bar-notes", `
## 3. barplot：比较统计量

\`barplot\`默认计算每组均值，不是简单计数。下面关闭误差线以聚焦均值；正式分析中应同时报告样本量，并说明误差线的含义。`),
      code("ch22-bar", `
summary = orders.groupby('category')['order_value'].agg(['mean', 'median', 'count']).round(1)
display(summary)

fig, ax = plt.subplots(figsize=(8, 4.2))
sns.barplot(
    data=orders,
    x='category',
    y='order_value',
    estimator='mean',
    errorbar=None,
    color='#1a73e8',
    ax=ax
)
ax.set(title='数码品类平均客单价最高', xlabel='品类', ylabel='平均客单价（元）')
ax.spines[['top', 'right']].set_visible(False)
fig.tight_layout()
plt.show()`),
      markdown("ch22-distribution-notes", `
## 4. boxplot + stripplot：同时看概括与原始点

箱线图适合比较中位数和离散程度，但会隐藏样本的具体密度。叠加抽样后的散点，可以判断箱体背后有多少真实观测。`),
      code("ch22-box-strip", `
sample = orders.sample(120, random_state=22)

fig, ax = plt.subplots(figsize=(8.5, 4.6))
sns.boxplot(
    data=orders,
    x='category',
    y='order_value',
    hue='category',
    palette='Set2',
    legend=False,
    ax=ax
)
sns.stripplot(
    data=sample,
    x='category',
    y='order_value',
    color='#202124',
    alpha=0.35,
    size=3,
    ax=ax
)
ax.set(title='各品类客单价分布', xlabel='品类', ylabel='客单价（元）')
fig.tight_layout()
plt.show()`),
      markdown("ch22-hue-notes", `
## 5. hue：增加一个分类维度

\`hue\`用于组内对比。颜色数量应保持克制，并确认每个组合都有足够样本；否则均值差异可能只是随机波动。`),
      code("ch22-hue", `
fig, ax = plt.subplots(figsize=(9, 4.5))
sns.barplot(
    data=orders,
    x='category',
    y='order_value',
    hue='channel',
    errorbar=None,
    palette='colorblind',
    ax=ax
)
ax.set(title='不同渠道的品类客单价', xlabel='品类', ylabel='平均客单价（元）')
ax.legend(title='渠道', frameon=False, ncol=3)
fig.tight_layout()
plt.show()`),
      markdown("ch22-practice-notes", `
## 6. 练习：选择正确的分类图

请分别回答：

1. 哪个区域订单最多？使用\`countplot\`；
2. 哪个区域平均客单价最高？使用\`barplot\`；
3. 该差异是否由少量高价订单造成？使用\`boxplot\`验证。`),
      code("ch22-practice", `
fig, axes = plt.subplots(1, 2, figsize=(10, 4.2))
sns.countplot(data=orders, x='region', color='#1a73e8', ax=axes[0])
axes[0].set(title='区域订单量', xlabel='区域', ylabel='订单数')

sns.boxplot(
    data=orders,
    x='region',
    y='order_value',
    hue='region',
    palette='Set2',
    legend=False,
    ax=axes[1]
)
axes[1].set(title='区域客单价分布', xlabel='区域', ylabel='客单价（元）')

for ax in axes:
    ax.spines[['top', 'right']].set_visible(False)
fig.tight_layout()
plt.show()` , ["exercise"]),
      markdown("ch22-summary", `
## 本章小结

\`countplot\`统计行数，\`barplot\`聚合数值，\`boxplot\`概括分布，\`stripplot\`保留原始观察。看到一根柱子时，先确认它表达的是计数、总和还是均值。`)
    ]
  },
  {
    file: "第23章_分布与关系图表.ipynb",
    chapter: 23,
    module: "seaborn",
    cells: [
      markdown("ch23-intro", `
# 第23章 分布与关系图表

本章从单变量分布进入多变量关系。目标是回答三个问题：数据集中在哪里、变量是否一起变化、这种关系在不同群体中是否一致。

## 学习目标

- 使用直方图、ECDF和KDE描述分布；
- 理解分箱数量与平滑带宽对图形的影响；
- 使用散点图编码分组与第三个数值变量；
- 使用回归线描述趋势而非证明因果；
- 用成对关系图快速筛查多个变量。`),
      markdown("ch23-setup-notes", `
## 0. 构造营销样本

每行代表一次活动观察。销售额与访问量、广告投入相关，同时保留渠道分组，便于检查分组差异。`),
      code("ch23-setup", `
import numpy as np
import pandas as pd
import seaborn as sns
import matplotlib.pyplot as plt

rng = np.random.default_rng(23)
n = 260
marketing = pd.DataFrame({
    'channel': rng.choice(['搜索', '社交', '会员'], n, p=[0.42, 0.34, 0.24]),
    'visits': rng.integers(80, 850, n),
    'ad_spend': rng.uniform(2, 38, n)
})
channel_effect = marketing['channel'].map({'搜索': 18, '社交': 8, '会员': 32})
marketing['sales'] = (
    45
    + marketing['visits'] * 0.16
    + marketing['ad_spend'] * 2.4
    + channel_effect
    + rng.normal(0, 28, n)
).clip(10)
marketing['conversion'] = (
    marketing['sales'] / marketing['visits'] + rng.normal(0, 0.018, n)
).clip(0.02, 0.5)

sns.set_theme(style='whitegrid')
marketing.describe().round(2)`),
      markdown("ch23-hist-notes", `
## 1. 直方图与ECDF：先看真实分布

直方图依赖分箱宽度，ECDF显示“小于等于某值的样本比例”且不需要分箱。两者并排可以避免把某一种参数设置误当成数据事实。`),
      code("ch23-hist-ecdf", `
fig, axes = plt.subplots(1, 2, figsize=(10, 4.2))
sns.histplot(data=marketing, x='sales', bins=18, color='#1a73e8', ax=axes[0])
axes[0].set(title='销售额直方图', xlabel='销售额（万元）', ylabel='观察数')

sns.ecdfplot(data=marketing, x='sales', color='#188038', ax=axes[1])
axes[1].axhline(0.5, color='#9aa0a6', linestyle='--', linewidth=1)
axes[1].set(title='销售额累计分布', xlabel='销售额（万元）', ylabel='累计比例')

fig.tight_layout()
plt.show()`),
      markdown("ch23-kde-notes", `
## 2. KDE：用平滑曲线比较分布

KDE是估计曲线，不是原始频数。带宽过小会产生虚假波峰，带宽过大会掩盖结构。样本很少或边界明显时，优先展示直方图或ECDF。

该单元格首次使用KDE时会按需加载SciPy。`),
      code("ch23-kde", `
import scipy

fig, ax = plt.subplots(figsize=(8, 4.4))
sns.kdeplot(
    data=marketing,
    x='sales',
    hue='channel',
    common_norm=False,
    fill=False,
    linewidth=2,
    ax=ax
)
ax.set(title='不同渠道的销售额密度', xlabel='销售额（万元）', ylabel='密度')
fig.tight_layout()
plt.show()`),
      markdown("ch23-scatter-notes", `
## 3. 散点图：查看关系、分组和异常点

位置编码\`visits\`与\`sales\`，颜色编码渠道，点大小编码广告投入。一次只增加有分析价值的维度，避免颜色、形状、大小同时过载。`),
      code("ch23-scatter", `
fig, ax = plt.subplots(figsize=(8.5, 5))
sns.scatterplot(
    data=marketing,
    x='visits',
    y='sales',
    hue='channel',
    size='ad_spend',
    sizes=(20, 180),
    alpha=0.72,
    palette='colorblind',
    ax=ax
)
ax.set(title='访问量与销售额总体正相关', xlabel='访问量', ylabel='销售额（万元）')
ax.legend(title='渠道 / 广告投入', frameon=False, bbox_to_anchor=(1.02, 1), loc='upper left')
fig.tight_layout()
plt.show()`),
      markdown("ch23-regression-notes", `
## 4. 回归图：描述趋势，不证明因果

\`regplot\`添加线性拟合和置信区间。斜率可以概括方向，但遗漏变量、异常点和反向因果都可能改变解释。先看散点，再看拟合线。`),
      code("ch23-regression", `
fig, axes = plt.subplots(1, 2, figsize=(10, 4.2), sharey=True)
for ax, channel, color in zip(axes, ['搜索', '会员'], ['#1a73e8', '#188038']):
    subset = marketing[marketing['channel'] == channel]
    sns.regplot(
        data=subset,
        x='visits',
        y='sales',
        scatter_kws={'alpha': 0.45, 's': 24},
        line_kws={'color': color, 'linewidth': 2},
        ax=ax
    )
    ax.set(title=f'{channel}渠道', xlabel='访问量', ylabel='销售额（万元）')
fig.suptitle('分渠道检查访问量与销售额关系', fontsize=15)
fig.tight_layout()
plt.show()`),
      markdown("ch23-pairplot-notes", `
## 5. pairplot：快速筛查多个数值变量

\`pairplot\`适合探索阶段，不适合作为最终报告图。变量过多会形成大量子图，因此只选择与问题有关的列，并使用抽样控制渲染成本。`),
      code("ch23-pairplot", `
pair_sample = marketing.sample(150, random_state=23)
grid = sns.pairplot(
    pair_sample,
    vars=['visits', 'ad_spend', 'sales', 'conversion'],
    hue='channel',
    corner=True,
    diag_kind='hist',
    plot_kws={'alpha': 0.55, 's': 24}
)
grid.fig.suptitle('营销指标成对关系', y=1.02)
plt.show()`),
      markdown("ch23-practice-notes", `
## 6. 练习：验证一个关系

选择\`ad_spend\`和\`sales\`完成：

1. 先画散点图并按渠道着色；
2. 分渠道添加回归趋势；
3. 找出偏离趋势最大的观察；
4. 写明“相关不等于因果”的具体原因。`),
      code("ch23-practice", `
fig, ax = plt.subplots(figsize=(8.5, 4.8))
sns.scatterplot(
    data=marketing,
    x='ad_spend',
    y='sales',
    hue='channel',
    alpha=0.65,
    palette='colorblind',
    ax=ax
)
ax.set(title='广告投入与销售额关系需要分渠道解释', xlabel='广告投入（万元）', ylabel='销售额（万元）')
ax.legend(title='渠道', frameon=False)
fig.tight_layout()
plt.show()` , ["exercise"]),
      markdown("ch23-summary", `
## 本章小结

分布图回答“值在哪里”，关系图回答“变量是否共同变化”。直方图有分箱，KDE有带宽，回归线有模型假设；任何平滑结果都必须回到原始观察和分组结构中解释。`)
    ]
  },
  {
    file: "第24章_热力图与分面图.ipynb",
    chapter: 24,
    module: "seaborn",
    cells: [
      markdown("ch24-intro", `
# 第24章 热力图与分面图

当变量或分组增多时，一张普通散点图很快会拥挤。本章学习两种组织信息的方法：用热力图展示矩阵，用分面图把不同群体拆成可比较的小图。

## 学习目标

- 正确计算并解释相关系数矩阵；
- 使用遮罩、中心值和标注改善热力图；
- 将长表透视为适合热力图的矩阵；
- 使用\`relplot\`和\`FacetGrid\`构建分面图；
- 控制分面顺序、共享坐标轴和每个面板的样本量。`),
      markdown("ch24-setup-notes", `
## 0. 构造多维经营数据

数据包含月份、区域、渠道和多个数值指标。每一行是一组“月份 × 区域 × 渠道”的观察。`),
      code("ch24-setup", `
import numpy as np
import pandas as pd
import seaborn as sns
import matplotlib.pyplot as plt

rng = np.random.default_rng(24)
rows = []
for month_index, month in enumerate(['1月', '2月', '3月', '4月', '5月', '6月'], start=1):
    for region in ['华东', '华南', '华北']:
        for channel in ['自然流量', '广告']:
            visits = rng.integers(380, 920) + month_index * 28
            conversion = rng.uniform(0.09, 0.18) + (0.015 if channel == '广告' else 0)
            orders = int(visits * conversion)
            revenue = orders * rng.uniform(0.18, 0.32)
            rows.append([month, month_index, region, channel, visits, conversion, orders, revenue])

metrics = pd.DataFrame(rows, columns=[
    'month', 'month_index', 'region', 'channel',
    'visits', 'conversion', 'orders', 'revenue'
])
sns.set_theme(style='whitegrid')
metrics.head()`),
      markdown("ch24-correlation-notes", `
## 1. 相关热力图：压缩一个对称矩阵

相关系数范围是-1到1，只描述线性共同变化。矩阵上下三角重复，因此可以遮住一半；发散色盘以0为中心，正负关系更容易区分。

相关系数高不代表因果，也可能由共同趋势或计算关系导致。`),
      code("ch24-correlation", `
numeric_columns = ['visits', 'conversion', 'orders', 'revenue']
corr = metrics[numeric_columns].corr()
mask = np.triu(np.ones_like(corr, dtype=bool), k=1)

fig, ax = plt.subplots(figsize=(7.2, 5.2))
sns.heatmap(
    corr,
    mask=mask,
    annot=True,
    fmt='.2f',
    cmap='vlag',
    center=0,
    vmin=-1,
    vmax=1,
    square=True,
    linewidths=0.5,
    ax=ax
)
ax.set_title('经营指标相关系数')
fig.tight_layout()
plt.show()`),
      markdown("ch24-pivot-notes", `
## 2. 透视热力图：比较“行 × 列”的数值

热力图要求二维矩阵。先用\`pivot_table\`明确行、列和聚合方式，再绘图。缺失组合应保留为空，而不是自动当作0。`),
      code("ch24-pivot", `
region_month = metrics.pivot_table(
    index='region',
    columns='month',
    values='revenue',
    aggfunc='sum'
).reindex(columns=['1月', '2月', '3月', '4月', '5月', '6月'])

fig, ax = plt.subplots(figsize=(9, 3.8))
sns.heatmap(
    region_month,
    annot=True,
    fmt='.0f',
    cmap='Blues',
    linewidths=0.5,
    cbar_kws={'label': '销售额（万元）'},
    ax=ax
)
ax.set(title='区域月度销售额', xlabel='月份', ylabel='区域')
fig.tight_layout()
plt.show()`),
      markdown("ch24-relplot-notes", `
## 3. relplot：按类别拆分关系

\`relplot\`是Figure级接口，可以用\`col\`或\`row\`自动创建分面。所有面板共享坐标范围时，斜率和高低才可直接比较。`),
      code("ch24-relplot", `
grid = sns.relplot(
    data=metrics,
    x='visits',
    y='revenue',
    hue='channel',
    col='region',
    kind='scatter',
    palette='colorblind',
    height=3.6,
    aspect=0.9,
    facet_kws={'sharex': True, 'sharey': True}
)
grid.set_axis_labels('访问量', '销售额（万元）')
grid.set_titles('{col_name}')
grid.fig.suptitle('分区域查看访问量与销售额关系', y=1.05)
plt.show()`),
      markdown("ch24-facetgrid-notes", `
## 4. FacetGrid：自定义每个面板

\`FacetGrid\`适合需要自定义绘图函数或同时使用行、列分面的场景。必须固定\`row_order\`和\`col_order\`，保证不同运行和报告中的顺序一致。`),
      code("ch24-facetgrid", `
facet = sns.FacetGrid(
    metrics,
    row='channel',
    col='region',
    row_order=['自然流量', '广告'],
    col_order=['华东', '华南', '华北'],
    height=2.5,
    aspect=1.15,
    margin_titles=True,
    sharex=True,
    sharey=True
)
facet.map_dataframe(
    sns.lineplot,
    x='month_index',
    y='conversion',
    marker='o',
    errorbar=None,
    color='#1a73e8'
)
facet.set(
    xticks=range(1, 7),
    xticklabels=['1月', '2月', '3月', '4月', '5月', '6月']
)
facet.set_axis_labels('月份', '转化率')
facet.set_titles(row_template='{row_name}', col_template='{col_name}')
facet.fig.subplots_adjust(top=0.88)
facet.fig.suptitle('各区域与渠道的月度转化率')
plt.show()`),
      markdown("ch24-design-guide", `
## 分面设计检查表

| 检查项 | 目的 |
| --- | --- |
| 每个面板样本量是否足够 | 避免把随机波动当作组间差异 |
| 坐标范围是否共享 | 保证斜率和高低可以比较 |
| 行列顺序是否固定 | 保证阅读路径稳定 |
| 分面数量是否可控 | 超过约12个面板时考虑筛选或交互图 |
| 颜色是否仍有必要 | 分面已经编码一个类别，不要重复过多维度 |

热力图适合矩阵比较，分面图适合重复的小图比较；两者都不应取代原始数据检查。`),
      markdown("ch24-practice-notes", `
## 5. 综合练习：定位低转化组合

完成下面的渠道 × 区域热力图后：

1. 找出平均转化率最低的组合；
2. 回到原始数据检查该组合有多少条观察；
3. 用分面折线图确认低值是长期现象还是单月波动。`),
      code("ch24-practice", `
conversion_matrix = metrics.pivot_table(
    index='region',
    columns='channel',
    values='conversion',
    aggfunc='mean'
)

fig, ax = plt.subplots(figsize=(6.5, 3.8))
sns.heatmap(
    conversion_matrix,
    annot=True,
    fmt='.1%',
    cmap='YlGnBu',
    linewidths=0.5,
    ax=ax
)
ax.set(title='区域与渠道平均转化率', xlabel='渠道', ylabel='区域')
fig.tight_layout()
plt.show()

lowest_pair = conversion_matrix.stack().idxmin()
lowest_value = conversion_matrix.stack().min()
print(f'最低组合: {lowest_pair[0]} / {lowest_pair[1]}，平均转化率 {lowest_value:.1%}')` , ["exercise"]),
      markdown("ch24-summary", `
## 本章小结

热力图把矩阵映射为颜色，分面图把类别映射为小图。前者依赖正确的聚合与色阶，后者依赖一致的坐标与顺序。完成本章后，应能把复杂多维数据拆成可比较、可解释的视觉结构。`)
    ]
  }
];

for (const definition of notebooks) {
  const notebook = createNotebook(
    definition.chapter,
    definition.module,
    definition.cells
  );
  const outputPath = path.join(outputDirectory, definition.file);
  fs.writeFileSync(outputPath, `${JSON.stringify(notebook, null, 2)}\n`, "utf8");
  console.log(`Updated ${definition.file} (${definition.cells.length} cells)`);
}
