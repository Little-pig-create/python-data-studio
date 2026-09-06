#!/usr/bin/env python3
"""Add concise, topic-aligned mathematical notes to canonical course notebooks.

The catalog is the source of truth for the notebooks the application loads.
Each inserted cell is tagged and marked, so the transformation is idempotent
and can safely run as part of the course build pipeline.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CATALOG_PATH = ROOT / "public" / "course" / "catalog.json"
MARKER_PREFIX = "<!-- math-foundation:"
FORMULA_SPECS: dict[str, dict[str, str]] = {}


def register(ids, title, equation, symbols, code, boundary, anchor=""):
    for lesson_id in ids:
        FORMULA_SPECS[lesson_id] = {
            "title": title,
            "equation": equation.strip(),
            "symbols": symbols,
            "code": code,
            "boundary": boundary,
            "anchor": anchor,
        }


# Python：只在“计算、集合、聚合”真正需要数学表达的章节补充。
register(
    ["chapter-2"],
    "把订单金额拆成可核对的计算链",
    r"S=\sum_{i=1}^{n}p_iq_i,\qquad P=\max(0,\ S-d)",
    r"$p_i$ 是第 $i$ 个商品单价，$q_i$ 是数量，$d$ 是优惠，$P$ 是应付金额。",
    "`subtotal = sum(price * quantity for ...)`，再计算 `payable = max(0, subtotal - discount)`。",
    "金额通常还需要明确币种、四舍五入规则和优惠的应用顺序。",
    "数值运算与中间变量",
)
register(
    ["chapter-6", "chapter-9", "capstone-python"],
    "从逐条记录到分组汇总",
    r"T_g=\sum_{i=1}^{n}x_i\,\mathbf{1}(c_i=g),\qquad B=I-E",
    r"$T_g$ 是类别 $g$ 的合计，$x_i$ 是金额，$\mathbf{1}(\cdot)$ 是条件成立时取 1 的指示函数；$B$ 为结余。",
    "循环或字典累加对应求和；`balance = income - expense` 对应结余。",
    "汇总前必须先统一记录粒度、金额类型和收入/支出的符号约定。",
)
register(
    ["chapter-7"],
    "用集合度量重合程度",
    r"J(A,B)=\frac{|A\cap B|}{|A\cup B|}",
    r"$A$、$B$ 是两个集合，$|\cdot|$ 表示元素个数，$J$ 越接近 1 表示越相似。",
    "`len(a & b) / len(a | b)` 是 Jaccard 相似度的直接代码表达。",
    "空集合并集为 0 时需要单独约定结果，不能直接相除。",
)

# NumPy：强调数组形状、广播和统计量之间的数学关系。
register(
    ["chapter-17"],
    "数组的形状就是坐标系统",
    r"A\in\mathbb{R}^{m\times n},\qquad A_{ij}=\text{第 }i\text{ 行、第 }j\text{ 列的值}",
    r"$m$ 是行数，$n$ 是列数；二维数组的 `shape` 为 $(m,n)$。",
    "`A.shape == (m, n)`，`A[i, j]` 访问数学记号中的 $A_{ij}$（Python 下标从 0 开始）。",
    "数学下标常从 1 开始，NumPy 下标从 0 开始，解释位置时要明确约定。",
)
register(
    ["chapter-18"],
    "布尔筛选是指示条件",
    r"A_{\text{selected}}=\{A_i\mid A_i>\tau\}",
    r"$\tau$ 是阈值，集合保留所有满足条件的元素。",
    "`mask = A > threshold` 生成条件，`A[mask]` 返回满足条件的值。",
    "筛选会改变样本构成；阈值必须来自业务规则或明确的统计口径。",
)
register(
    ["chapter-19"],
    "变形必须保持元素总数",
    r"\prod_{k=1}^{r}d_k=\prod_{j=1}^{s}e_j",
    r"$d_k$ 是原形状各维长度，$e_j$ 是目标形状各维长度。",
    "执行 `reshape(new_shape)` 前检查 `np.prod(old_shape) == np.prod(new_shape)`。",
    "元素数量相等只保证能够变形，不保证新的轴仍具有正确业务含义。",
)
register(
    ["chapter-20"],
    "广播把一维规则应用到矩阵",
    r"C_{ij}=A_{ij}+b_j",
    r"$A$ 是 $m\times n$ 矩阵，$b$ 长度为 $n$，同一个 $b_j$ 会作用于每一行。",
    "`C = A + b`；运行前用 `A.shape` 与 `b.shape` 确认 $b$ 对应哪条轴。",
    "能够广播不等于业务轴正确；门店规则和商品规则放错轴仍会得到无报错的错误结果。",
)
register(
    ["chapter-21"],
    "均值、方差与标准误",
    r"\bar{x}=\frac{1}{n}\sum_{i=1}^{n}x_i,\qquad s^2=\frac{1}{n-1}\sum_{i=1}^{n}(x_i-\bar{x})^2,\qquad SE=\frac{s}{\sqrt{n}}",
    r"$\bar{x}$ 是样本均值，$s^2$ 是样本方差，$SE$ 是均值标准误。",
    "`np.mean(x)`、`np.var(x, ddof=1)`、`np.std(x, ddof=1) / np.sqrt(len(x))`。",
    "随机抽样要固定种子并说明抽样总体；标准误不是原始数据的标准差。",
)
register(
    ["capstone-numpy"],
    "补货缺口与库存覆盖天数",
    r"R_{ij}=s_j+d_{ij}\ell_j,\qquad G_{ij}=I_{ij}-R_{ij},\qquad C_{ij}=\frac{I_{ij}}{d_{ij}}",
    r"$I$ 是库存，$d$ 是日需求，$s$ 是安全库存，$\ell$ 是提前期；$G<0$ 表示预警。",
    "利用广播计算 `required_stock`、`stock_gap` 和 `coverage_days`。",
    "需求为 0 时覆盖天数需要安全除法；参数变化应做敏感性检查。",
)

# Pandas：关注质量率、分组指标、连接完整性与窗口统计。
register(
    ["chapter-26"],
    "把数据质量问题量化",
    r"r_{miss}=\frac{N_{miss}}{N},\qquad r_{dup}=\frac{N_{dup}}{N}",
    r"$N$ 是检查单位总数，$N_{miss}$、$N_{dup}$ 分别是缺失和重复数量。",
    "`df.isna().mean()` 计算列缺失率，`df.duplicated(key).mean()` 计算重复率。",
    "分母必须与检查粒度一致；单元格缺失率、行缺失率和主键缺失率不能混用。",
)
register(
    ["chapter-29"],
    "分组聚合与加权平均",
    r"\bar{x}_g=\frac{1}{n_g}\sum_{i:c_i=g}x_i,\qquad \bar{x}_w=\frac{\sum_iw_ix_i}{\sum_iw_i}",
    r"$g$ 是分组，$n_g$ 是组内样本量，$w_i$ 是权重。",
    "`groupby(...).agg(...)` 对应组内统计；加权平均需要显式计算分子和分母。",
    "组均值不能在忽略样本量的情况下再次简单平均，否则会产生聚合偏差。",
)
register(
    ["chapter-30"],
    "连接完整率与粒度守恒",
    r"r_{match}=\frac{N_{matched}}{N_{left}},\qquad N_{after}=N_{before}\ \text{（一对一或多对一左连接）}",
    r"$r_{match}$ 衡量左表记录成功匹配的比例。",
    "使用 `indicator=True` 统计匹配状态，并用 `validate=` 声明连接关系。",
    "行数守恒只适用于预期的一对一/多对一场景；明细表合并前常需先聚合。",
)
register(
    ["chapter-31"],
    "滚动窗口把局部历史变成基准",
    r"MA_t^{(k)}=\frac{1}{k}\sum_{j=0}^{k-1}x_{t-j}",
    r"$k$ 是窗口长度，$MA_t^{(k)}$ 是时点 $t$ 的 $k$ 期移动平均。",
    "先按时间排序，再用 `series.rolling(k).mean()`；需要历史基准时再配合 `shift(1)`。",
    "窗口开头样本不足，且滚动统计不能使用未来数据；必须明确 `min_periods`。",
)
register(
    ["capstone-pandas", "chapter-83"],
    "履约异常率与平均延迟",
    r"r_{late}=\frac{\sum_i\mathbf{1}(d_i>0)}{n},\qquad \bar{d}=\frac{1}{n}\sum_{i=1}^{n}d_i",
    r"$d_i$ 是实际送达日减预计送达日的天数，$r_{late}$ 是延期订单占比。",
    "构造 `delay_days` 和 `is_late` 后按月份、地区或品类分组聚合。",
    "未送达订单与缺失预计日期需要单独定义，不能静默排除后仍称为总体延期率。",
)

# 统计图：同一种统计语义在 Matplotlib、Seaborn、Plotly 中共享公式。
register(
    ["chapter-34", "chapter-66"],
    "趋势图中的变化量与增长率",
    r"\Delta x_t=x_t-x_{t-1},\qquad g_t=\frac{x_t-x_{t-1}}{x_{t-1}}",
    r"$\Delta x_t$ 是绝对变化，$g_t$ 是环比增长率。",
    "排序后使用 `diff()` 与 `pct_change()`，再把结果放进 Hover 或注释。",
    "当上一期为 0 或时间间隔不一致时，增长率需要特殊处理。",
)
register(
    ["chapter-35", "chapter-67"],
    "比较图中的差值与占比",
    r"d_i=x_i-x_{ref},\qquad s_i=\frac{x_i}{\sum_jx_j}",
    r"$x_{ref}$ 是比较基准，$s_i$ 是类别 $i$ 的总体占比。",
    "在绘图前计算差值或占比列，柱长只负责呈现已经定义好的指标。",
    "排序、分母范围和是否包含“其他”类别都会改变占比解释。",
)
register(
    ["chapter-36", "chapter-56", "chapter-68"],
    "散点关系与 Pearson 相关系数",
    r"r=\frac{\sum_i(x_i-\bar{x})(y_i-\bar{y})}{\sqrt{\sum_i(x_i-\bar{x})^2\sum_i(y_i-\bar{y})^2}}",
    r"$r\in[-1,1]$ 描述线性共同变化的方向和强度。",
    "`df[[x, y]].corr().iloc[0, 1]` 与散点图配合使用。",
    "相关不等于因果；异常值、非线性和分组结构都可能改变总体相关。",
)
register(
    ["chapter-37", "chapter-53", "chapter-71"],
    "直方图的频数与密度",
    r"\hat{f}_j=\frac{n_j}{n\,h_j}",
    r"$n_j$ 是第 $j$ 个箱中的样本数，$h_j$ 是箱宽；密度直方图总面积为 1。",
    "固定 `bins` 或箱边界比较不同组；密度口径使用 `stat='density'` 或对应参数。",
    "箱宽改变会显著改变形状；不同样本量的组不宜直接比较原始频数。",
)
register(
    ["chapter-38", "chapter-49", "chapter-72"],
    "箱线图的四分位数与异常界限",
    r"IQR=Q_3-Q_1,\qquad [L,U]=[Q_1-1.5IQR,\ Q_3+1.5IQR]",
    r"$Q_1$、$Q_3$ 是第一和第三四分位数，IQR 描述中间 50% 数据的跨度。",
    "用 `quantile([.25, .5, .75])` 复核图中的箱体和中位数。",
    "落在界限外的是统计异常点，不等于错误数据，更不能自动删除。",
)
register(
    ["chapter-39", "chapter-70"],
    "面积堆叠必须满足组成恒等式",
    r"T_t=\sum_{g=1}^{G}x_{g,t},\qquad s_{g,t}=\frac{x_{g,t}}{T_t}",
    r"$x_{g,t}$ 是组 $g$ 在时点 $t$ 的值，$T_t$ 是同一时点总体。",
    "绘图前按时间透视为宽表，并检查各层之和是否等于总体。",
    "堆叠顺序影响可读性；除最底层外，其他类别不适合比较细小变化。",
)
register(
    ["chapter-40", "chapter-75", "chapter-76"],
    "构成图的守恒关系",
    r"s_i=\frac{x_i}{\sum_jx_j},\qquad \sum_i s_i=1",
    r"$s_i$ 是类别或节点占总体的比例。",
    "先聚合并检查 `share.sum()` 接近 1，再传给饼图、矩形树图或旭日图。",
    "层级图要求父节点值与子节点口径一致；类别过多时应合并长尾。",
)
register(
    ["chapter-41", "chapter-47", "chapter-48", "chapter-57"],
    "均值的不确定性区间",
    r"CI_{95\%}\approx \bar{x}\pm1.96\frac{s}{\sqrt{n}}",
    r"$\bar{x}$ 是样本均值，$s$ 是样本标准差，$n$ 是样本量。",
    "统计图中的误差线应明确表示标准差、标准误还是置信区间。",
    "该近似依赖样本与分布条件；小样本或偏态数据可考虑 bootstrap。",
)
register(
    ["chapter-50", "chapter-54", "chapter-73"],
    "核密度估计把样本平滑成分布",
    r"\hat{f}_h(x)=\frac{1}{nh}\sum_{i=1}^{n}K\!\left(\frac{x-x_i}{h}\right)",
    r"$K$ 是核函数，$h$ 是带宽；$h$ 越大曲线越平滑。",
    "调整 `bw_adjust`（或旧版带宽参数）并与原始样本/直方图交叉检查。",
    "KDE 会在观测范围外延伸，小样本或有自然边界的数据尤其要谨慎。",
)
register(
    ["chapter-55"],
    "经验累积分布函数",
    r"\hat{F}_n(x)=\frac{1}{n}\sum_{i=1}^{n}\mathbf{1}(x_i\le x)",
    r"$\hat{F}_n(x)$ 表示样本中不大于 $x$ 的比例。",
    "ECDF 的纵轴可直接解释为累计比例，适合比较中位数、尾部和阈值覆盖率。",
    "曲线差异是描述性证据；组间样本量和抽样方式仍需报告。",
)
register(
    ["chapter-58"],
    "最小二乘回归线",
    r"\hat{y}=\beta_0+\beta_1x,\qquad \min_{\beta_0,\beta_1}\sum_i(y_i-\hat{y}_i)^2",
    r"$\beta_1$ 描述 $x$ 每增加 1 单位时预测均值的线性变化。",
    "`regplot`/`lmplot` 展示拟合关系；同时检查残差、异常点与分组。",
    "回归线描述条件关联，不自动提供因果解释。",
)
register(
    ["chapter-59", "chapter-60"],
    "联合分布与协方差矩阵",
    r"\operatorname{Cov}(X,Y)=\frac{1}{n-1}\sum_i(x_i-\bar{x})(y_i-\bar{y}),\qquad \Sigma_{jk}=\operatorname{Cov}(X_j,X_k)",
    r"协方差矩阵 $\Sigma$ 汇总多个变量两两共同变化。",
    "联合图用于深挖一对变量，成对图用于扫描多个变量；重点关系再用数值统计复核。",
    "量纲会影响协方差，比较不同尺度变量时通常使用相关矩阵。",
)
register(
    ["chapter-61", "chapter-74"],
    "矩阵颜色必须对应明确的数值变换",
    r"z_{ij}=\frac{x_{ij}-\mu_j}{\sigma_j}",
    r"$z_{ij}$ 是按列标准化后的值，使不同单位的列可在同一色阶比较。",
    "根据问题选择原值、比例、相关系数或 z-score，再设置统一色阶。",
    "标准化会丢失原单位；色阶中心、范围和缺失值颜色都必须说明。",
)
register(
    ["chapter-62", "chapter-109"],
    "距离决定聚类结果",
    r"d_2(x,y)=\sqrt{\sum_j(x_j-y_j)^2},\qquad d_1(x,y)=\sum_j|x_j-y_j|",
    r"$d_2$ 是欧氏距离，$d_1$ 是曼哈顿距离。",
    "聚类前标准化特征，并说明距离与 linkage/邻域参数的选择。",
    "不同量纲会让大数值特征主导距离；聚类簇不是天然存在的真实类别。",
)
register(
    ["capstone-matplotlib"],
    "一页经营报告的核心口径",
    r"Revenue=\sum_i q_ip_i,\qquad AOV=\frac{Revenue}{N_{orders}}",
    r"$q_i$、$p_i$ 是商品数量和单价，AOV 是平均订单金额。",
    "先生成统一指标表，再让趋势、贡献、分布和关系图共享同一口径。",
    "退货、取消和税费是否计入会改变销售额定义，必须在报告中注明。",
)
register(
    ["capstone-seaborn"],
    "比较客群差异的标准化尺度",
    r"d=\frac{\bar{x}_1-\bar{x}_2}{s_p},\qquad s_p=\sqrt{\frac{(n_1-1)s_1^2+(n_2-1)s_2^2}{n_1+n_2-2}}",
    r"$d$ 是标准化均值差，$s_p$ 是合并标准差。",
    "图形先展示分布和样本量，标准化差异可作为补充而不是替代原始单位。",
    "偏态、极端值和组间方差差异会影响该指标，应与稳健统计量共同解释。",
)
register(
    ["chapter-69"],
    "气泡图应让面积而不是半径对应数值",
    r"A_i\propto v_i,\qquad r_i=\sqrt{\frac{A_i}{\pi}}\propto\sqrt{v_i}",
    r"$v_i$ 是编码数值，$A_i$ 是气泡面积，$r_i$ 是半径。",
    "使用绘图库的 `size`/`sizeref` 机制，让视觉面积与数据量成比例。",
    "气泡面积难以精确比较，应保留 Hover 数值并避免过大的尺寸跨度。",
)
register(
    ["chapter-77"],
    "漏斗转化率",
    r"c_k=\frac{N_k}{N_{k-1}},\qquad C_k=\frac{N_k}{N_0}",
    r"$c_k$ 是相邻阶段转化率，$C_k$ 是从起点到阶段 $k$ 的累计转化率。",
    "先确认阶段顺序与观察单位，再同时计算人数、相邻转化率和累计转化率。",
    "阶段不是严格包含关系时不能使用漏斗；不同批次或时间窗也不能混合。",
)
register(
    ["chapter-78"],
    "瀑布图的逐步守恒",
    r"V_k=V_0+\sum_{i=1}^{k}\Delta_i",
    r"$V_0$ 是起点，$\Delta_i$ 是第 $i$ 项正负变化，$V_k$ 是累计结果。",
    "逐项计算变化并检查最终累计值是否等于报表终值。",
    "变化项必须互斥且口径一致，否则“贡献”会被重复计算。",
)
register(
    ["chapter-79"],
    "时间线中的持续时间",
    r"duration_i=t_i^{end}-t_i^{start}",
    r"开始与结束时间必须使用同一时区和时间单位。",
    "解析时间后先计算持续时长，检查负值与重叠，再绘制甘特图。",
    "缺失结束时间、跨时区和并行任务需要显式规则。",
)
register(
    ["chapter-80"],
    "地图比较应优先使用率而不是总量",
    r"rate_i=\frac{count_i}{exposure_i}\times k",
    r"$exposure_i$ 是人口、客户数或业务机会数，$k$ 是统一倍率。",
    "将事件数与暴露量合并后计算标准化率，再映射颜色或大小。",
    "行政区面积会制造视觉偏差；缺失地区和小分母率值需要标注。",
)
register(
    ["capstone-plotly"],
    "经营预警相对基准",
    r"a_t=\frac{x_t-b_t}{b_t},\qquad alert_t=\mathbf{1}(a_t<-\tau)",
    r"$b_t$ 是历史基准，$\tau$ 是预警阈值。",
    "用滚动中位数或计划值构造 `baseline`，再把偏离比例放进 Hover。",
    "阈值应做敏感性检查；基准不足或为 0 时不能直接计算偏离率。",
)

# 综合项目：把业务指标写成可复核的决策口径。
register(
    ["chapter-82"],
    "RFM 的三个客户价值维度",
    r"R_i=t_{ref}-t_i^{last},\qquad F_i=N_i,\qquad M_i=\sum_{j\in i}amount_j",
    r"$R$ 是距最近消费的时间，$F$ 是消费频次，$M$ 是消费金额。",
    "先聚合到客户粒度，再分别计算 R、F、M 并记录参考日期。",
    "评分分箱依赖样本分布，跨时间或跨市场比较时必须重新校准。",
)
register(
    ["chapter-84", "capstone-projects"],
    "有限资源下的需求覆盖率",
    r"coverage(S)=\frac{\sum_{i\in S}d_i}{\sum_i d_i}",
    r"$S$ 是被选中的高峰时段集合，$d_i$ 是该时段需求。",
    "按需求或风险排序选择时段，并比较不同阈值下的覆盖率与行动量。",
    "历史覆盖率不是未来保证；还需考虑站点容量、成本和需求漂移。",
)
register(
    ["chapter-85"],
    "营销名单的转化率与 Lift",
    r"conversion=\frac{TP}{N_{contact}},\qquad Lift@K=\frac{conversion@K}{conversion_{all}}",
    r"$TP$ 是成功转化人数，$K$ 是按模型分数选出的名单规模。",
    "按概率降序取 Top-K，比较名单转化率、覆盖率和总体基准。",
    "Lift 不包含联系成本和客户价值；模型名单仍需合规与公平性检查。",
)

# 机器学习：核心模型、指标和决策章节均补充“公式—代码—边界”。
register(
    ["intro-machine-learning", "chapter-87"],
    "机器学习是在未见数据上最小化风险",
    r"\hat{R}(f)=\frac{1}{n}\sum_{i=1}^{n}L\bigl(y_i,f(x_i)\bigr)",
    r"$L$ 是损失函数，$\hat{R}$ 是样本上的经验风险。",
    "训练只使用训练集拟合；验证集选方案；测试集只做最终一次评估。",
    "训练误差低不代表泛化好；数据泄漏会让评估虚高。",
)
register(
    ["chapter-88"],
    "标准化与 Pipeline",
    r"z_{ij}=\frac{x_{ij}-\mu_j^{train}}{\sigma_j^{train}}",
    r"均值和标准差只能从训练数据估计，再应用到验证/测试数据。",
    "把 `StandardScaler` 和模型放进同一个 `Pipeline`。",
    "切分前标准化会泄漏验证和测试分布。",
)
register(
    ["chapter-89"],
    "线性回归与正则化",
    r"\hat{y}=\beta_0+x^T\beta,\qquad \min_{\beta}\sum_i(y_i-\hat{y}_i)^2+\lambda\lVert\beta\rVert_2^2",
    r"$\lambda$ 控制 Ridge 正则强度，抑制过大的系数。",
    "比较 `LinearRegression` 与 `Ridge(alpha=...)` 的验证误差。",
    "系数依赖特征尺度；线性预测关系不等于因果效应。",
)
register(
    ["chapter-90"],
    "逻辑回归把线性得分映射为概率",
    r"p(y=1\mid x)=\sigma(z)=\frac{1}{1+e^{-z}},\qquad z=\beta_0+x^T\beta",
    r"$p$ 是正类概率，分类阈值不必固定为 0.5。",
    "使用 `predict_proba` 得到概率，再按业务成本选择阈值。",
    "未校准的概率和相关系数不能直接解释为真实因果影响。",
)
register(
    ["chapter-91"],
    "KNN 由距离和邻居投票定义",
    r"d(x,z)=\sqrt{\sum_j(x_j-z_j)^2},\qquad \hat{y}=\operatorname{mode}\{y_i:i\in N_k(x)\}",
    r"$N_k(x)$ 是离样本 $x$ 最近的 $k$ 个训练样本。",
    "标准化后比较不同 `n_neighbors`，并通过验证集选择 $k$。",
    "高维空间距离会退化；类别不平衡时多数类可能主导投票。",
)
register(
    ["chapter-92"],
    "决策树用纯度下降选择切分",
    r"Gini(S)=1-\sum_kp_k^2,\qquad Gain=I(S)-\frac{n_L}{n}I(L)-\frac{n_R}{n}I(R)",
    r"$p_k$ 是节点内类别 $k$ 的比例，$I$ 可取 Gini 或熵。",
    "限制 `max_depth`、`min_samples_leaf` 并比较验证表现。",
    "深树很容易记住训练噪声；特征重要性不等于因果贡献。",
)
register(
    ["chapter-93"],
    "随机森林通过多棵树降低方差",
    r"\hat{f}_{RF}(x)=\frac{1}{B}\sum_{b=1}^{B}\hat{f}_b(x)\quad\text{或}\quad \hat{y}=\operatorname{mode}\{\hat{y}_b\}_{b=1}^{B}",
    r"$B$ 是树的数量；回归取平均，分类通常取投票或平均概率。",
    "用 `n_estimators` 控制树数，并结合 `max_features`、深度和 OOB/验证结果评估。",
    "树之间高度相关时集成收益会下降；更多树主要降低随机波动，不自动解决偏差。",
)
register(
    ["chapter-94", "chapter-102"],
    "提升模型逐步拟合残差",
    r"F_M(x)=F_0(x)+\sum_{m=1}^{M}\eta\,h_m(x)",
    r"$h_m$ 是第 $m$ 个弱学习器，$\eta$ 是学习率。",
    "联合调节 `learning_rate` 与 `n_estimators`，用验证集观察过拟合。",
    "较小学习率通常需要更多树；加法结构仍可能学习到数据偏差。",
)
register(
    ["chapter-95"],
    "SVM 最大化分类间隔",
    r"\min_{w,b}\frac{1}{2}\lVert w\rVert^2+C\sum_i\xi_i,\qquad y_i(w^Tx_i+b)\ge1-\xi_i",
    r"$C$ 控制间隔宽度与训练错误之间的权衡。",
    "标准化特征，并在验证集比较 `C`、核函数和 `gamma`。",
    "核 SVM 在大样本上成本高；决策分数不是天然概率。",
)
register(
    ["chapter-96"],
    "朴素贝叶斯由 Bayes 公式组成",
    r"P(y\mid x)\propto P(y)\prod_{j=1}^{p}P(x_j\mid y)",
    r"模型假设给定类别后各特征条件独立。",
    "文本频数常用 MultinomialNB，连续近似正态特征常用 GaussianNB。",
    "条件独立假设通常不真实，但模型仍可作为快速、可解释的基线。",
)
register(
    ["chapter-97", "chapter-108"],
    "K-Means 最小化簇内平方距离",
    r"\min_{C_1,\ldots,C_K}\sum_{k=1}^{K}\sum_{x_i\in C_k}\lVert x_i-\mu_k\rVert_2^2",
    r"$\mu_k$ 是第 $k$ 个簇中心。",
    "标准化特征，固定 `random_state`，结合 inertia、轮廓系数和业务可解释性选择 $K$。",
    "K-Means 偏好球状、大小相近的簇，簇编号本身没有顺序含义。",
)
register(
    ["chapter-98", "chapter-110"],
    "PCA 寻找方差最大的正交方向",
    r"\Sigma v_k=\lambda_kv_k,\qquad z_k=Xv_k,\qquad EVR_k=\frac{\lambda_k}{\sum_j\lambda_j}",
    r"$v_k$ 是第 $k$ 个主成分方向，$\lambda_k$ 是其解释方差。",
    "标准化后拟合 `PCA`，用 `explained_variance_ratio_` 决定保留维度。",
    "PCA 是无监督线性投影；高方差方向不一定最有业务或预测价值。",
)
register(
    ["chapter-99", "chapter-111"],
    "交叉验证汇总泛化波动",
    r"\bar{s}=\frac{1}{K}\sum_{k=1}^{K}s_k,\qquad SD(s)=\sqrt{\frac{1}{K-1}\sum_k(s_k-\bar{s})^2}",
    r"$s_k$ 是第 $k$ 折验证分数。",
    "同时报告均值和标准差，并选择与时间、分组或类别结构匹配的切分器。",
    "交叉验证折并非完全独立；时间数据不能随机打乱未来与过去。",
)
register(
    ["chapter-100"],
    "阈值连接概率与错误成本",
    r"\hat{y}_t=\mathbf{1}(p\ge t),\qquad Cost(t)=c_{FP}FP(t)+c_{FN}FN(t)",
    r"$t$ 是阈值，$c_{FP}$、$c_{FN}$ 是两类错误成本。",
    "遍历多个阈值，记录 precision、recall、行动数量和业务成本。",
    "阈值必须在验证集确定；测试集不能反复用于选择。",
)
register(
    ["chapter-101", "chapter-118"],
    "回归误差与解释度",
    r"MAE=\frac{1}{n}\sum_i|y_i-\hat{y}_i|,\qquad RMSE=\sqrt{\frac{1}{n}\sum_i(y_i-\hat{y}_i)^2},\qquad R^2=1-\frac{\sum_i(y_i-\hat{y}_i)^2}{\sum_i(y_i-\bar{y})^2}",
    r"MAE 保留原单位，RMSE 更惩罚大误差，$R^2$ 相对均值基线衡量解释度。",
    "至少同时报告一个原单位误差和基线比较，并检查高误差样本。",
    "$R^2$ 可以为负；不同目标尺度的数据不能只凭 RMSE 横向比较。",
)
register(
    ["chapter-103"],
    "Softmax 多分类概率",
    r"P(y=k\mid x)=\frac{e^{z_k}}{\sum_{j=1}^{K}e^{z_j}},\qquad L=-\sum_{k=1}^{K}y_k\log p_k",
    r"$z_k$ 是类别 $k$ 的得分，交叉熵惩罚真实类别概率过低。",
    "用 `predict_proba` 检查每行概率和为 1，并查看按类别的错误。",
    "总体准确率可能掩盖少数类别；需要宏平均指标和混淆矩阵。",
)
register(
    ["chapter-104"],
    "混淆矩阵派生分类指标",
    r"Precision=\frac{TP}{TP+FP},\qquad Recall=\frac{TP}{TP+FN},\qquad F_1=\frac{2PR}{P+R}",
    r"TP、FP、FN 分别是真阳性、假阳性、假阴性。",
    "先明确哪个类别是正类，再通过混淆矩阵核对指标分子和分母。",
    "F1 隐含 precision 与 recall 同等重要，未必符合真实业务成本。",
)
register(
    ["chapter-105"],
    "ROC 与 PR 曲线的坐标",
    r"TPR=\frac{TP}{TP+FN},\qquad FPR=\frac{FP}{FP+TN},\qquad Precision=\frac{TP}{TP+FP}",
    r"ROC 绘制 TPR–FPR，PR 绘制 Precision–Recall。",
    "类别稀少时优先结合 PR-AUC、基准正类率和实际行动量。",
    "AUC 汇总所有阈值，不直接给出部署阈值或业务收益。",
)
register(
    ["chapter-106"],
    "Top-K Lift 衡量名单浓度",
    r"Lift@K=\frac{TP_K/K}{P/N}",
    r"$TP_K/K$ 是 Top-K 名单命中率，$P/N$ 是总体正类率。",
    "概率降序后计算多个 K 或预算比例下的 lift、命中数和覆盖率。",
    "Lift 依赖评估样本的基准率；不同时间或人群间不能脱离基准直接比较。",
)
register(
    ["chapter-107"],
    "Brier Score 衡量概率误差",
    r"BS=\frac{1}{n}\sum_{i=1}^{n}(p_i-y_i)^2",
    r"$p_i$ 是预测概率，$y_i\in\{0,1\}$；分数越小越好。",
    "结合校准曲线比较预测概率与实际发生率。",
    "校准好不等于区分能力强；应与 ROC/PR 和业务阈值共同评估。",
)
register(
    ["chapter-112"],
    "超参数搜索是在验证规则下求最优",
    r"\theta^*=\arg\max_{\theta\in\Theta}\frac{1}{K}\sum_{k=1}^{K}s_k(\theta)",
    r"$\Theta$ 是候选超参数空间，$s_k$ 是第 $k$ 折分数。",
    "把预处理和模型放进 Pipeline，再用 GridSearchCV 或 RandomizedSearchCV。",
    "搜索次数越多，验证集过拟合风险越高；最终仍需独立测试集。",
)
register(
    ["chapter-113"],
    "候选模型必须相对基线改进",
    r"\Delta s=s_{model}-s_{baseline},\qquad relative\ gain=\frac{s_{model}-s_{baseline}}{|s_{baseline}|}",
    r"同一切分、同一指标下的差值才具有可比性。",
    "先建立 Dummy/简单规则基线，再比较候选模型和运行成本。",
    "小幅分数提升可能不足以抵消复杂度、延迟和维护风险。",
)
register(
    ["chapter-114"],
    "置换重要性衡量性能下降",
    r"I_j=s(X,y)-s(X_{\pi(j)},y)",
    r"$X_{\pi(j)}$ 表示随机打乱第 $j$ 个特征后的数据。",
    "在独立验证/测试数据上多次置换，报告重要性均值与波动。",
    "相关特征会共享或替代重要性；重要性不是因果效应。",
)
register(
    ["chapter-115"],
    "批量推理的阈值合同",
    r"\hat{y}_i=\mathbf{1}(p_i\ge t),\qquad action\ rate=\frac{1}{n}\sum_i\hat{y}_i",
    r"$t$ 是部署阈值，action rate 是被模型触发行动的样本比例。",
    "保存完整 Pipeline，并在批量预测结果中同时输出概率、阈值和版本。",
    "只保存模型主体会丢失预处理；特征缺失或顺序变化必须阻止推理。",
)
register(
    ["chapter-116"],
    "客户价值预测的误差口径",
    r"WMAE=\frac{\sum_iw_i|y_i-\hat{y}_i|}{\sum_iw_i}",
    r"$w_i$ 可表示客户金额、业务优先级或样本权重。",
    "同时报告普通 MAE 与业务加权误差，并检查高价值客户误差。",
    "权重体现决策偏好，必须由业务规则给出，不能为提高分数随意调整。",
)
register(
    ["chapter-117", "capstone-machine-learning"],
    "上线决策应最小化预期错误成本",
    r"C(t)=c_{FP}FP(t)+c_{FN}FN(t)+c_AA(t),\qquad t^*=\arg\min_t C(t)",
    r"$FP(t)$、$FN(t)$ 是阈值 $t$ 下两类错误数，$A(t)$ 是行动量；$c_{FP}$、$c_{FN}$、$c_A$ 是对应单位成本。",
    "在验证集比较阈值下的错误、行动量与成本，再锁定阈值评估测试集。",
    "成本估计也有不确定性；上线结论应包含试点、监控和停止条件。",
)
register(
    ["chapter-119"],
    "营销模型的期望净收益",
    r"EV(t)=TP(t)v-FP(t)c-c_A\bigl(TP(t)+FP(t)\bigr)",
    r"$v$ 是一次成功转化价值，$c$ 是错误联系代价，$c_A$ 是行动成本。",
    "基于验证集阈值表计算期望收益，并报告联系人数和风险。",
    "价值与成本应来自可审计假设；历史收益不能保证未来分布不变。",
)


# 每个主题都提供“从定义到结论”的推导路径。共享同一数学语义的章节
# 复用推导，但仍通过各章自己的代码对应与使用边界落回当前应用场景。
DERIVATIONS = {
    "把订单金额拆成可核对的计算链": r"""
**第 1 步｜先算每一行。** 第 $i$ 个商品的小计由单价与数量相乘：

$$
a_i=p_iq_i
$$

**第 2 步｜再把明细汇总。** 订单原价是所有行小计之和：

$$
S=a_1+cdots+a_n=sum_{i=1}^{n}a_i
$$

**第 3 步｜最后应用业务规则。** 优惠后金额先得到 $S-d$；若系统不允许负应付额，就取它与 0 的较大值。
""".strip(),
    "从逐条记录到分组汇总": r"""
**第 1 步｜把条件写成 0/1 开关。** 对每条记录定义

$$
\delta_{ig}=\mathbf{1}(c_i=g)
$$

属于类别 $g$ 时 $\delta_{ig}=1$，否则为 0。于是 $x_i\delta_{ig}$ 只保留目标组的金额。

**第 2 步｜对保留下来的金额求和。** 这就是循环中“满足条件才累加”的数学形式：

$$
T_g=\sum_{i=1}^{n}x_i\delta_{ig}
$$

**第 3 步｜由类别合计得到结余。** 分别汇总收入 $I$ 与支出 $E$ 后，结余为 $B=I-E$。
""".strip(),
    "用集合度量重合程度": r"""
**第 1 步｜数共同元素。** 令 $c=|A\cap B|$。

**第 2 步｜用容斥关系计算并集。** 两个集合直接相加会把交集数两次，因此

$$
|A\cup B|=|A|+|B|-c
$$

**第 3 步｜用共同部分除以全部不同元素。** 因而

$$
J(A,B)=\frac{c}{|A|+|B|-c}
$$

完全不重合时为 0，两个非空集合完全相同时为 1。
""".strip(),
    "数组的形状就是坐标系统": r"""
**第 1 步｜先确定轴。** $m\times n$ 数组包含 $m$ 行与 $n$ 列，总元素数为

$$
N=mn
$$

**第 2 步｜用两个下标定位。** 元素 $A_{ij}$ 的第一个下标沿行轴变化，第二个下标沿列轴变化。

**第 3 步｜连接到内存中的线性位置。** 对按行连续存放的数组，数学下标从 0 计时，线性位置可写成

$$
k=in+j
$$

所以“形状”不仅描述大小，也决定一维数据如何被解释成坐标。
""".strip(),
    "布尔筛选是指示条件": r"""
**第 1 步｜逐元素判断。** 把条件结果记为掩码

$$
m_i=\mathbf{1}(A_i>\tau)
$$

**第 2 步｜掩码决定保留谁。** 被选中的元素满足 $m_i=1$，选中数量为

$$
n_{selected}=\sum_{i=1}^{n}m_i
$$

**第 3 步｜还能得到筛选比例。** $n_{selected}/n$ 就是超过阈值的样本占比。
""".strip(),
    "变形必须保持元素总数": r"""
**第 1 步｜计算原数组容量。** 原形状 $(d_1,\ldots,d_r)$ 的元素数是

$$
N_{old}=\prod_{k=1}^{r}d_k
$$

**第 2 步｜计算目标容量。** 新形状 $(e_1,\ldots,e_s)$ 需要

$$
N_{new}=\prod_{j=1}^{s}e_j
$$

**第 3 步｜比较容量。** `reshape` 只重新解释同一串元素，不会创造或删除数据，所以必须有 $N_{old}=N_{new}$。
""".strip(),
    "广播把一维规则应用到矩阵": r"""
**第 1 步｜把向量看成一行。** 长度为 $n$ 的 $b$ 可解释为 $1\times n$ 数组。

**第 2 步｜沿缺少的行轴复制。** 广播得到的概念矩阵满足

$$
B_{ij}=b_j,\qquad i=1,\ldots,m
$$

**第 3 步｜执行逐位置运算。** 因此 $C=A+B$ 等价于对每一行应用同一组列规则：$C_{ij}=A_{ij}+b_j$。NumPy 通常不会真的复制整张 $B$，但语义与此相同。
""".strip(),
    "均值、方差与标准误": r"""
**第 1 步｜均值确定数据中心。** $\bar{x}$ 让正负离差相互抵消：

$$
\sum_{i=1}^{n}(x_i-\bar{x})=0
$$

**第 2 步｜平方离差衡量离散。** 样本方差用 $n-1$ 校正估计偏差，再令 $s=\sqrt{s^2}$ 得到标准差。

**第 3 步｜均值比单个观测更稳定。** 若样本近似独立同分布，

$$
\operatorname{Var}(\bar{X})=\frac{\sigma^2}{n}
\quad\Longrightarrow\quad
SE(\bar{X})\approx\frac{s}{\sqrt{n}}
$$

样本量扩大 4 倍，均值标准误约缩小一半，而不是缩小到四分之一。
""".strip(),
    "补货缺口与库存覆盖天数": r"""
**第 1 步｜估计提前期需求。** 日需求为 $d_{ij}$、提前期为 $\ell_j$ 时，等待补货期间预计消耗

$$
D^{lead}_{ij}=d_{ij}\ell_j
$$

**第 2 步｜加上安全缓冲。** 目标库存为 $R_{ij}=D^{lead}_{ij}+s_j$。

**第 3 步｜从两个方向判断风险。** 库存缺口 $G_{ij}=I_{ij}-R_{ij}$ 衡量“够不够”，覆盖天数 $C_{ij}=I_{ij}/d_{ij}$ 衡量“还能撑多久”。
""".strip(),
    "把数据质量问题量化": r"""
**第 1 步｜为每个检查单位建立标记。** 缺失标记 $m_i$、重复标记 $u_i$ 都只取 0 或 1。

$$
m_i=\mathbf{1}(x_i\text{ 缺失}),\qquad u_i=\mathbf{1}(key_i\text{ 重复})
$$

**第 2 步｜0/1 均值就是比例。** 因为 $\sum_i m_i=N_{miss}$，所以

$$
\frac{1}{N}\sum_i m_i=\frac{N_{miss}}{N}
$$

重复率同理。关键不是公式本身，而是分母 $N$ 到底表示行、主键还是单元格。
""".strip(),
    "分组聚合与加权平均": r"""
**第 1 步｜组均值来自组内总和与组内数量。** 记 $S_g=\sum_{i:c_i=g}x_i$，则 $\bar{x}_g=S_g/n_g$。

**第 2 步｜合并组均值时恢复各组权重。** 总体均值不是组均值的简单平均，而是

$$
\bar{x}=\frac{\sum_g n_g\bar{x}_g}{\sum_g n_g}
$$

**第 3 步｜推广到一般权重。** 把样本量 $n_g$ 换成任意非负权重 $w_i$，就得到加权平均 $\sum_iw_ix_i/\sum_iw_i$。
""".strip(),
    "连接完整率与粒度守恒": r"""
**第 1 步｜记录左表每一行是否匹配。** 令 $m_i=1$ 表示成功匹配，否则为 0。

$$
N_{matched}=\sum_{i=1}^{N_{left}}m_i
$$

**第 2 步｜得到匹配率。** $r_{match}=N_{matched}/N_{left}$。

**第 3 步｜检查一行会扩成几行。** 若左表第 $i$ 行在右表匹配到 $k_i$ 行，左连接后的行数为

$$
N_{after}=\sum_{i=1}^{N_{left}}\max(1,k_i)
$$

只有预期的一对一或多对一连接，才应有 $N_{after}=N_{left}$。
""".strip(),
    "滚动窗口把局部历史变成基准": r"""
**第 1 步｜定义时点 $t$ 的历史窗口。** 长度为 $k$ 的窗口是

$$
W_t=\{x_{t-k+1},\ldots,x_t\}
$$

**第 2 步｜在窗口内求局部均值。** 窗口和 $S_t^{(k)}=\sum_{j=0}^{k-1}x_{t-j}$，除以有效观察数就得到移动平均。

**第 3 步｜避免把当期答案放进基准。** 若要用“此前 $k$ 期”预测或判断当期，应计算

$$
Baseline_t=MA_{t-1}^{(k)}
$$

代码上就是先 `rolling(k).mean()` 再 `shift(1)`。
""".strip(),
    "履约异常率与平均延迟": r"""
**第 1 步｜把日期差转成同一单位。** 每单延迟天数为 $d_i=t_i^{actual}-t_i^{promised}$。

**第 2 步｜把“是否延期”变成指标。** $l_i=\mathbf{1}(d_i>0)$，因此延期订单数是 $\sum_i l_i$。

**第 3 步｜区分两个不同问题。** $r_{late}=\sum_i l_i/n$ 回答“多少订单延期”，而

$$
\bar d_{late}=\frac{\sum_i d_i l_i}{\sum_i l_i}
$$

回答“已延期订单平均晚几天”；它与全体订单的平均日期差不是同一口径。
""".strip(),
    "趋势图中的变化量与增长率": r"""
**第 1 步｜先算绝对变化。** $\Delta x_t=x_t-x_{t-1}$ 保留原单位。

**第 2 步｜再除以前一期形成相对变化。** 先写倍率 $r_t=x_t/x_{t-1}$，增长率就是 $g_t=r_t-1$。

**第 3 步｜多期增长要连乘。** 从 0 期到 $T$ 期的累计增长满足

$$
\frac{x_T}{x_0}=\prod_{t=1}^{T}(1+g_t)
$$

因此不能把多期百分比简单相加，除非变化都很小且只做近似。
""".strip(),
    "比较图中的差值与占比": r"""
**第 1 步｜差值回答“多了多少”。** $d_i=x_i-x_{ref}$，保留原单位。

**第 2 步｜比例回答“是基准的几倍”。** $r_i=x_i/x_{ref}$；相对变化是 $r_i-1$。

**第 3 步｜构成占比需要共同分母。** 令 $T=\sum_jx_j$，则 $s_i=x_i/T$，并且

$$
\sum_i s_i=\frac{\sum_i x_i}{T}=1
$$

所以只有互斥且穷尽的类别，才适合解释为整体构成。
""".strip(),
    "散点关系与 Pearson 相关系数": r"""
**第 1 步｜先去掉量纲。** 标准化后 $z_{xi}=(x_i-\bar{x})/s_x$、$z_{yi}=(y_i-\bar{y})/s_y$。

**第 2 步｜看同一观测上的方向是否一致。** 当两个标准化值同号时，乘积 $z_{xi}z_{yi}$ 为正；异号时为负。

**第 3 步｜对共同变化求平均。** 样本相关可写为

$$
r=\frac{1}{n-1}\sum_{i=1}^{n}z_{xi}z_{yi}
$$

展开标准化定义，就得到分子为离差乘积、分母为两个平方和平方根的常见形式。
""".strip(),
    "直方图的频数与密度": r"""
**第 1 步｜用箱边界划分数轴。** 第 $j$ 个箱为 $[b_j,b_{j+1})$，箱宽 $h_j=b_{j+1}-b_j$。

**第 2 步｜数落入箱中的样本。** $n_j=\sum_i\mathbf{1}(b_j\le x_i<b_{j+1})$，相对频率为 $n_j/n$。

**第 3 步｜让柱形面积代表概率。** 柱高应满足“高 × 宽 = 相对频率”，所以

$$
\hat f_jh_j=\frac{n_j}{n}
\quad\Longrightarrow\quad
\hat f_j=\frac{n_j}{nh_j}
$$

把所有柱面积相加就得到 1。
""".strip(),
    "箱线图的四分位数与异常界限": r"""
**第 1 步｜用分位数切分排序数据。** $Q_1$、$Q_2$、$Q_3$ 分别对应累计比例 25%、50%、75%。

**第 2 步｜中间一半数据的跨度是**

$$
IQR=Q_3-Q_1
$$

**第 3 步｜把箱体向两侧延伸 1.5 个 IQR。** 下、上界分别为 $L=Q_1-1.5IQR$、$U=Q_3+1.5IQR$。箱线图的“须”通常落到界内最远的实际观测，而不是直接画到 $L$、$U$。
""".strip(),
    "面积堆叠必须满足组成恒等式": r"""
**第 1 步｜同一时点先统一粒度。** 各组数值为 $x_{1,t},\ldots,x_{G,t}$。

**第 2 步｜逐层累加形成边界。** 第 $g$ 层上边界为

$$
H_{g,t}=\sum_{j=1}^{g}x_{j,t}
$$

**第 3 步｜最上层必须回到总体。** $H_{G,t}=T_t$；若画百分比堆叠，则每层厚度为 $s_{g,t}=x_{g,t}/T_t$ 且总和为 1。
""".strip(),
    "构成图的守恒关系": r"""
**第 1 步｜先定义同一总体。** $T=\sum_{i=1}^{K}x_i$。

**第 2 步｜每个类别除以同一总体。** $s_i=x_i/T$。

**第 3 步｜验证守恒。** $\sum_i s_i=\sum_i x_i/T=T/T=1$。层级图还要逐个父节点检查

$$
x_{parent}=\sum_{c\in children(parent)}x_c
$$

否则面积虽然能画出来，却不再代表一致的层级构成。
""".strip(),
    "均值的不确定性区间": r"""
**第 1 步｜样本均值存在抽样波动。** 独立同分布条件下 $\operatorname{Var}(\bar X)=\sigma^2/n$。

**第 2 步｜用样本标准差估计未知的 $\sigma$。** 得到 $SE\approx s/\sqrt n$。

**第 3 步｜用标准化分布给出区间。** 大样本近似下

$$
\frac{\bar X-\mu}{SE}\approx N(0,1)
$$

标准正态中约 95% 落在 $[-1.96,1.96]$，移项后得到 $\bar x\pm1.96SE$。小样本时应把 1.96 换成相应的 $t$ 分位数。
""".strip(),
    "核密度估计把样本平滑成分布": r"""
**第 1 步｜每个样本放置一个核。** 以 $x_i$ 为中心、带宽为 $h$ 的核为

$$
K_h(x-x_i)=\frac{1}{h}K\!\left(\frac{x-x_i}{h}\right)
$$

$1/h$ 保证拉宽曲线后面积仍为 1。

**第 2 步｜把所有小曲线平均。** $n$ 个单位面积核相加后再除以 $n$，总面积仍为 1，于是得到 $\hat f_h(x)$。

**第 3 步｜理解带宽。** 较小 $h$ 保留局部起伏但方差大；较大 $h$ 更平滑但可能抹掉真实结构。
""".strip(),
    "经验累积分布函数": r"""
**第 1 步｜对给定阈值逐个判断。** $I_i(x)=\mathbf{1}(x_i\le x)$。

**第 2 步｜把满足条件的个数除以样本量。**

$$
\hat F_n(x)=\frac{\sum_iI_i(x)}{n}
$$

**第 3 步｜理解阶梯。** 每经过一个样本点，累计比例增加 $1/n$；因此经验中位数可写成满足 $\hat F_n(x)\ge0.5$ 的最小 $x$。
""".strip(),
    "最小二乘回归线": r"""
**第 1 步｜定义预测与残差。** $\hat y_i=\beta_0+\beta_1x_i$，$e_i=y_i-\hat y_i$。

**第 2 步｜让残差平方和最小。** 对 $SSE=\sum_ie_i^2$ 分别对 $\beta_0$、$\beta_1$ 求导并令其为 0，可得

$$
\hat\beta_1=\frac{\sum_i(x_i-\bar x)(y_i-\bar y)}{\sum_i(x_i-\bar x)^2},
\qquad
\hat\beta_0=\bar y-\hat\beta_1\bar x
$$

**第 3 步｜代回得到拟合线。** 斜率本质上是“共同变化”除以 $x$ 自身变化。
""".strip(),
    "联合分布与协方差矩阵": r"""
**第 1 步｜中心化每个变量。** $x_i^c=x_i-\bar x$、$y_i^c=y_i-\bar y$。

**第 2 步｜观察离差乘积。** 同向偏离产生正乘积，反向偏离产生负乘积；平均后得到协方差。

**第 3 步｜推广到多个变量。** 对中心化数据矩阵 $X_c$，

$$
\Sigma=\frac{1}{n-1}X_c^TX_c
$$

其中第 $(j,k)$ 个元素正是变量 $j$ 与 $k$ 的协方差。
""".strip(),
    "矩阵颜色必须对应明确的数值变换": r"""
**第 1 步｜按列估计中心与尺度。** $\mu_j=\frac1n\sum_ix_{ij}$，$\sigma_j^2=\frac1{n-1}\sum_i(x_{ij}-\mu_j)^2$。

**第 2 步｜把原值换成离均值多少个标准差。** $z_{ij}=(x_{ij}-\mu_j)/\sigma_j$。

**第 3 步｜检查变换结果。** 对非零方差列，标准化后近似满足

$$
\frac1n\sum_i z_{ij}\approx0,
\qquad
\frac1{n-1}\sum_i z_{ij}^2=1
$$

因此不同原始单位可以共享色阶，但颜色不再表示原单位。
""".strip(),
    "距离决定聚类结果": r"""
**第 1 步｜先计算逐特征差异。** $\Delta_j=x_j-y_j$。

**第 2 步｜选择如何汇总差异。** 欧氏距离对大差异平方后更敏感，曼哈顿距离把绝对差异直接相加。

**第 3 步｜看尺度为什么重要。** 若改用标准化坐标 $z_j=(x_j-\mu_j)/\sigma_j$，则欧氏距离变为

$$
d_z(x,y)=\sqrt{\sum_j\left(\frac{x_j-y_j}{\sigma_j}\right)^2}
$$

这等于让每一维按自身尺度参与比较，避免大单位变量天然主导距离。
    """.strip(),
}

DERIVATIONS.update({
    "一页经营报告的核心口径": r"""
**第 1 步｜从订单明细计算行金额。** 第 $i$ 行销售额是 $r_i=q_ip_i$。

**第 2 步｜汇总到报告口径。** 总销售额 $Revenue=\sum_ir_i$；若一张订单有多行，订单数必须先按订单主键去重得到 $N_{orders}$。

**第 3 步｜得到客单价。** 

$$
AOV=\frac{Revenue}{N_{orders}}
$$

进一步按日期或品类拆分时，分子与分母必须使用同一筛选范围。
""".strip(),
    "比较客群差异的标准化尺度": r"""
**第 1 步｜先计算原单位差异。** $\Delta=\bar x_1-\bar x_2$ 回答两组平均相差多少。

**第 2 步｜合并两组组内波动。** 两组平方离差和分别为 $(n_1-1)s_1^2$ 与 $(n_2-1)s_2^2$，合并后除以总自由度：

$$
s_p^2=\frac{(n_1-1)s_1^2+(n_2-1)s_2^2}{n_1+n_2-2}
$$

**第 3 步｜用共同尺度标准化。** $d=\Delta/s_p$ 表示均值相差多少个合并标准差，便于比较不同单位的指标。
""".strip(),
    "气泡图应让面积而不是半径对应数值": r"""
**第 1 步｜圆的视觉面积由半径决定。** $A_i=\pi r_i^2$。

**第 2 步｜要求面积与数据成比例。** 设 $A_i=cv_i$，其中 $c$ 是统一缩放常数。

**第 3 步｜解出绘图半径。** 

$$
r_i=\sqrt{\frac{cv_i}{\pi}}
$$

如果错误地令 $r_i\propto v_i$，视觉面积会变成 $A_i\propto v_i^2$，大值会被夸张。
""".strip(),
    "漏斗转化率": r"""
**第 1 步｜相邻阶段比较。** 从阶段 $k-1$ 到 $k$ 的转化率是 $c_k=N_k/N_{k-1}$。

**第 2 步｜逐阶段连乘。** 从起点到阶段 $k$ 的累计转化为

$$
C_k=c_1c_2\cdots c_k
$$

**第 3 步｜中间人数会约掉。** 展开连乘后

$$
C_k=\frac{N_1}{N_0}\frac{N_2}{N_1}\cdots\frac{N_k}{N_{k-1}}=\frac{N_k}{N_0}
$$

这要求每一阶段人群都是前一阶段的子集。
""".strip(),
    "瀑布图的逐步守恒": r"""
**第 1 步｜每一步更新一次余额。** $V_k=V_{k-1}+\Delta_k$。

**第 2 步｜连续代入前一步。** $V_2=V_0+\Delta_1+\Delta_2$，继续展开可得

$$
V_k=V_0+\sum_{i=1}^{k}\Delta_i
$$

**第 3 步｜用终点做校验。** 若报表给出终值 $V_{reported}$，应检查 $V_0+\sum_i\Delta_i-V_{reported}=0$ 或只存在可解释的舍入差。
""".strip(),
    "时间线中的持续时间": r"""
**第 1 步｜统一时间基准。** 把开始与结束时间都转换到同一时区，记为 $t_i^{start}$、$t_i^{end}$。

**第 2 步｜相减得到时间差。** $\Delta t_i=t_i^{end}-t_i^{start}$。

**第 3 步｜换成业务单位。** 若底层差值以秒计，则

$$
duration_i^{hour}=\frac{\Delta t_i^{second}}{3600}
$$

负持续时间说明顺序或时区有问题，不能通过取绝对值掩盖。
""".strip(),
    "地图比较应优先使用率而不是总量": r"""
**第 1 步｜区分事件数与机会数。** 地区 $i$ 有事件数 $count_i$，但产生事件的暴露量是 $exposure_i$。

**第 2 步｜除以暴露量消除规模影响。** 原始率为 $count_i/exposure_i$。

**第 3 步｜乘统一倍率提高可读性。** 每万人发生数为

$$
rate_i=\frac{count_i}{exposure_i}\times10{,}000
$$

倍率只改变显示单位，不改变地区排序；小分母却会放大随机波动。
""".strip(),
    "经营预警相对基准": r"""
**第 1 步｜构造只来自可用历史的基准。** 例如 $b_t=\operatorname{median}(x_{t-k},\ldots,x_{t-1})$。

**第 2 步｜计算相对偏离。** 绝对差是 $x_t-b_t$，再除以 $b_t$ 得到无量纲偏离 $a_t$。

**第 3 步｜把规则变成可执行信号。** 当负向偏离超过阈值 $\tau$ 时，

$$
alert_t=\mathbf{1}(a_t<-\tau)
$$

同时输出 $a_t$ 与 $b_t$，才能解释为什么触发预警。
""".strip(),
    "RFM 的三个客户价值维度": r"""
**第 1 步｜把交易明细聚合到客户。** 对客户 $i$ 的交易集合 $J_i$，频次 $F_i=|J_i|$，金额 $M_i=\sum_{j\in J_i}amount_j$。

**第 2 步｜用统一参考日计算最近度。** 最后交易日 $t_i^{last}=\max_{j\in J_i}t_j$，所以 $R_i=t_{ref}-t_i^{last}$。

**第 3 步｜方向统一后再评分。** 因为较小的 $R$ 更好，而较大的 $F$、$M$ 更好，可把分箱分数写成

$$
Score_i=w_Rs_R(-R_i)+w_Fs_F(F_i)+w_Ms_M(M_i)
$$

负号只表示最近度方向相反，不表示日期本身为负。
""".strip(),
    "有限资源下的需求覆盖率": r"""
**第 1 步｜计算全部需求。** $D=\sum_id_i$。

**第 2 步｜给定行动集合 $S$。** 可被覆盖的需求是 $D_S=\sum_{i\in S}d_i$。

**第 3 步｜形成 0 到 1 的指标。** $coverage(S)=D_S/D$。再加入一个时段 $j$ 的边际提升为

$$
\Delta coverage_j=coverage(S\cup\{j\})-coverage(S)=\frac{d_j}{D}
$$

在成本相同且需求互不重叠时，按 $d_j$ 从大到小选择会最快提高覆盖率。
""".strip(),
    "营销名单的转化率与 Lift": r"""
**第 1 步｜计算总体基准率。** $p_{all}=P/N$，其中 $P$ 是全部样本中的正类数。

**第 2 步｜按模型分数取前 $K$ 名。** 名单命中数为 $TP_K$，名单转化率 $p_K=TP_K/K$。

**第 3 步｜与随机名单比较。** 

$$
Lift@K=\frac{p_K}{p_{all}}
$$

Lift 为 2 表示该名单的正类浓度约为总体的 2 倍，不表示转化人数翻倍，也不等于利润翻倍。
    """.strip(),
})

DERIVATIONS.update({
    "机器学习是在未见数据上最小化风险": r"""
**第 1 步｜先定义单个样本的损失。** 预测函数 $f$ 在样本 $(x_i,y_i)$ 上产生 $L_i=L(y_i,f(x_i))$。

**第 2 步｜真正关心的是未来总体风险。** 若未来数据来自分布 $P$，理想目标是

$$
R(f)=\mathbb{E}_{(X,Y)\sim P}[L(Y,f(X))]
$$

**第 3 步｜用训练样本近似未知期望。** 经验风险 $\hat R(f)=\sum_iL_i/n$ 是可计算代理。模型在训练集最小化它，验证集估计方案选择后的泛化表现，测试集只做最终审计。
""".strip(),
    "标准化与 Pipeline": r"""
**第 1 步｜只在训练集估计参数。** 对特征 $j$，计算 $\mu_j^{train}$ 与 $\sigma_j^{train}$。

**第 2 步｜训练、验证和测试共用同一变换。** 

$$
z_{ij}^{split}=\frac{x_{ij}^{split}-\mu_j^{train}}{\sigma_j^{train}}
$$

**第 3 步｜解释泄漏。** 若把验证数据也用于均值计算，实际使用的是

$$
\mu_j^{all}=\frac{n_{train}\mu_j^{train}+n_{valid}\mu_j^{valid}}{n_{train}+n_{valid}}
$$

其中已经含有验证分布信息；Pipeline 的作用就是把“每折只拟合训练部分”固化下来。
""".strip(),
    "线性回归与正则化": r"""
**第 1 步｜普通最小二乘只惩罚预测残差。** 矩阵形式为 $\lVert y-X\beta\rVert_2^2$。

**第 2 步｜Ridge 再惩罚大系数。** 目标变为

$$
J(\beta)=\lVert y-X\beta\rVert_2^2+\lambda\lVert\beta\rVert_2^2
$$

**第 3 步｜令梯度为 0。** $-2X^T(y-X\beta)+2\lambda\beta=0$，因此在相应可逆条件下

$$
\hat\beta=(X^TX+\lambda I)^{-1}X^Ty
$$

$\lambda$ 增大使解更稳定、方差通常下降，但偏差会上升；截距通常不参与惩罚。
""".strip(),
    "逻辑回归把线性得分映射为概率": r"""
**第 1 步｜线性部分给出任意实数得分。** $z=\beta_0+x^T\beta$。

**第 2 步｜把概率的赔率写成线性。** 逻辑回归假设

$$
\log\frac{p}{1-p}=z
$$

两边取指数并解出 $p$，得到 $p=1/(1+e^{-z})$。

**第 3 步｜用概率损失拟合。** 单个二分类样本的负对数似然为

$$
\ell_i=-\bigl[y_i\log p_i+(1-y_i)\log(1-p_i)\bigr]
$$

训练优化概率质量，部署阈值则由错误成本另行决定。
""".strip(),
    "KNN 由距离和邻居投票定义": r"""
**第 1 步｜计算查询点与每个训练样本的距离。** 例如欧氏距离 $d_i=\lVert x-x_i\rVert_2$。

**第 2 步｜选出距离最小的 $k$ 个索引。** 

$$
N_k(x)=\operatorname*{arg\,min}_{S:|S|=k}\sum_{i\in S}d_i
$$

**第 3 步｜汇总邻居标签。** 分类概率可估计为 $\hat p(y=c\mid x)=\sum_{i\in N_k(x)}\mathbf1(y_i=c)/k$，再选择概率最大的类别。$k$ 小时边界灵活但波动大，$k$ 大时更平滑但可能欠拟合。
""".strip(),
    "决策树用纯度下降选择切分": r"""
**第 1 步｜计算父节点不纯度。** 分类节点中类别比例为 $p_k$，Gini 为 $1-\sum_kp_k^2$。

**第 2 步｜候选切分产生左右子节点。** 切分后的期望不纯度是按样本量加权平均：

$$
I_{after}=\frac{n_L}{n}I(L)+\frac{n_R}{n}I(R)
$$

**第 3 步｜选择下降最多的切分。** $Gain=I(S)-I_{after}$。不断最大化训练集上的下降会生成很深的树，因此还需要深度、叶节点样本数或剪枝约束。
""".strip(),
    "随机森林通过多棵树降低方差": r"""
**第 1 步｜每棵树给出一个有波动的预测。** 记第 $b$ 棵树为 $\hat f_b(x)$，其方差约为 $\sigma^2$。

**第 2 步｜对 $B$ 棵树求平均。** 回归森林使用 $\bar f_B(x)=\sum_b\hat f_b(x)/B$；分类可先平均各类概率再取最大者。

**第 3 步｜展开平均值的方差。** 若任意两棵树预测的相关系数近似为 $\rho$，则

$$
\operatorname{Var}(\bar f_B)
=\sigma^2\left(\rho+\frac{1-\rho}{B}\right)
$$

**第 4 步｜解释两个调参方向。** 增大 $B$ 只会压低 $(1-\rho)/B$；随机抽样特征与样本的价值，是尽量降低树之间的 $\rho$。若所有树高度相似，树再多也仍受 $\rho\sigma^2$ 限制。
""".strip(),
    "提升模型逐步拟合残差": r"""
**第 1 步｜从简单初始模型开始。** 例如平方损失下 $F_0(x)$ 可取目标均值。

**第 2 步｜计算当前模型还没解释的方向。** 一般损失下使用负梯度

$$
r_{im}=-\left.\frac{\partial L(y_i,F(x_i))}{\partial F(x_i)}\right|_{F=F_{m-1}}
$$

平方损失时它正比于普通残差 $y_i-F_{m-1}(x_i)$。

**第 3 步｜让新弱学习器拟合该方向并更新。** $F_m=F_{m-1}+\eta h_m$；递推展开后就是多个弱学习器的加法模型。
""".strip(),
    "SVM 最大化分类间隔": r"""
**第 1 步｜分类边界为** $w^Tx+b=0$，两个规范化支持边界为 $w^Tx+b=\pm1$。

**第 2 步｜两条支持边界之间的距离是**

$$
margin=\frac{2}{\lVert w\rVert}
$$

因此最大化间隔等价于最小化 $\lVert w\rVert^2/2$。

**第 3 步｜用松弛变量允许少量违例。** $\xi_i$ 衡量样本违反间隔的程度，目标加上 $C\sum_i\xi_i$。较大 $C$ 更强调少犯训练错误，较小 $C$ 更强调宽间隔。
""".strip(),
    "朴素贝叶斯由 Bayes 公式组成": r"""
**第 1 步｜从 Bayes 公式开始。** 

$$
P(y\mid x)=\frac{P(x\mid y)P(y)}{P(x)}
$$

比较不同类别时，分母 $P(x)$ 相同，可以忽略。

**第 2 步｜加入条件独立假设。** $P(x\mid y)=\prod_jP(x_j\mid y)$。

**第 3 步｜转到对数空间避免很多小概率连乘下溢。** 

$$
\log score(y)=\log P(y)+\sum_j\log P(x_j\mid y)
$$

最终选择对数得分最大的类别。
""".strip(),
    "K-Means 最小化簇内平方距离": r"""
**第 1 步｜固定中心，分配样本。** $c_i=\arg\min_k\lVert x_i-\mu_k\rVert_2^2$。

**第 2 步｜固定分配，更新中心。** 对第 $k$ 个簇，平方距离和关于 $\mu_k$ 的最小值在样本均值处：

$$
\mu_k=\frac{1}{|C_k|}\sum_{x_i\in C_k}x_i
$$

**第 3 步｜交替执行。** 分配步和更新步都不会增大目标函数，因此算法会收敛到一个局部最优；不同初始中心可能得到不同结果。
""".strip(),
    "PCA 寻找方差最大的正交方向": r"""
**第 1 步｜先中心化数据并计算协方差。** $\Sigma=X_c^TX_c/(n-1)$。

**第 2 步｜寻找单位方向 $v$ 上方差最大者。** 投影 $z=X_cv$ 的方差为 $v^T\Sigma v$，所以求解

$$
\max_{\lVert v\rVert=1}v^T\Sigma v
$$

**第 3 步｜使用拉格朗日乘子。** 对 $v^T\Sigma v-\lambda(v^Tv-1)$ 求导，得到 $\Sigma v=\lambda v$。最大特征值对应第一主成分，后续方向再加与前面方向正交的约束。

**第 4 步｜用特征值计算解释方差比。** $EVR_k=\lambda_k/\sum_j\lambda_j$。
""".strip(),
    "交叉验证汇总泛化波动": r"""
**第 1 步｜把样本分成 $K$ 个互斥验证折。** 第 $k$ 次用其余折训练，在第 $k$ 折得到分数 $s_k$。

**第 2 步｜平均各折表现。** $\bar s=\sum_ks_k/K$ 近似描述该训练流程在不同样本划分下的表现。

**第 3 步｜报告划分敏感性。** 标准差衡量折间波动；若只想描述均值估计的不确定度，可另算

$$
SE(\bar s)\approx\frac{SD(s)}{\sqrt K}
$$

但各折训练集高度重叠，并不严格独立，所以这个标准误只能谨慎参考。
""".strip(),
    "阈值连接概率与错误成本": r"""
**第 1 步｜阈值把概率变成行动。** $\hat y_i(t)=\mathbf1(p_i\ge t)$。

**第 2 步｜由逐样本条件累计错误。** 

$$
FP(t)=\sum_i\mathbf1(y_i=0,\hat y_i(t)=1),
\quad
FN(t)=\sum_i\mathbf1(y_i=1,\hat y_i(t)=0)
$$

**第 3 步｜把不同错误换成同一成本单位。** $Cost(t)=c_{FP}FP(t)+c_{FN}FN(t)$，在验证集候选阈值中选择成本最小者，而不是默认 0.5。
""".strip(),
    "回归误差与解释度": r"""
**第 1 步｜定义每个样本残差。** $e_i=y_i-\hat y_i$。

**第 2 步｜选择如何汇总误差。** $MAE$ 平均绝对距离；$RMSE$ 先平均平方再开方，因此大残差权重更高。

**第 3 步｜与均值基线比较。** 常数模型 $\hat y_i=\bar y$ 的平方误差和是 $SST=\sum_i(y_i-\bar y)^2$，候选模型为 $SSE=\sum_ie_i^2$，所以

$$
R^2=1-\frac{SSE}{SST}
$$

$SSE>SST$ 时 $R^2<0$，表示还不如直接预测均值。
""".strip(),
    "Softmax 多分类概率": r"""
**第 1 步｜模型为每个类别给出得分。** 类别 $k$ 的 logit 为 $z_k$。

**第 2 步｜指数化使权重为正，再归一化。** 

$$
p_k=\frac{e^{z_k}}{\sum_je^{z_j}},
\qquad
\sum_kp_k=1
$$

**第 3 步｜用真实类别选择对应概率。** one-hot 标签中只有真实类别 $y$ 的 $y_k=1$，所以交叉熵 $-\sum_ky_k\log p_k=-\log p_y$。真实类别概率越小，惩罚越大。
""".strip(),
    "混淆矩阵派生分类指标": r"""
**第 1 步｜把预测与真实标签交叉计数。** 正类预测中包含 $TP+FP$，真实正类中包含 $TP+FN$。

**第 2 步｜形成两个不同条件比例。** Precision 是“预测为正时有多准”，Recall 是“真实为正时找回多少”。

**第 3 步｜用调和平均合并。** 

$$
F_1=\frac{2}{1/P+1/R}=\frac{2PR}{P+R}
$$

调和平均会被较小的一项明显拉低，所以只有 precision 与 recall 都不差时 F1 才高。
""".strip(),
    "ROC 与 PR 曲线的坐标": r"""
**第 1 步｜移动阈值。** 每个 $t$ 都产生一组 $TP(t),FP(t),FN(t),TN(t)$。

**第 2 步｜计算曲线坐标。** ROC 使用 $(FPR(t),TPR(t))$，PR 使用 $(Recall(t),Precision(t))$。

**第 3 步｜理解面积。** ROC-AUC 可解释为随机抽取一个正例和负例时，正例得分更高的概率：

$$
AUC=P(score^+>score^-)
$$

但面积平均了所有阈值，最终行动点仍需结合基准率、预算和错误成本选择。
""".strip(),
    "Top-K Lift 衡量名单浓度": r"""
**第 1 步｜总体正类率给出随机基线。** $p_{base}=P/N$。

**第 2 步｜分数排序后取前 $K$。** Top-K 命中率 $p_K=TP_K/K$，正类覆盖率 $Recall@K=TP_K/P$。

**第 3 步｜比较浓度。** $Lift@K=p_K/p_{base}$。累计增益还可写成

$$
Gain@K=\frac{TP_K}{P}=Recall@K
$$

Lift 侧重名单“纯度提升”，Gain 侧重找回了多少全部正类，两者应一起报告。
""".strip(),
    "Brier Score 衡量概率误差": r"""
**第 1 步｜逐样本计算概率平方误差。** $b_i=(p_i-y_i)^2$；预测越自信且越错误，惩罚越大。

**第 2 步｜对全部样本平均。** $BS=\sum_ib_i/n$。

**第 3 步｜按概率区间检查校准。** 若第 $g$ 个区间平均预测为 $\bar p_g$、实际正类率为 $\bar y_g$，校准误差的一种摘要是

$$
CE=\sum_g\frac{n_g}{n}(\bar p_g-\bar y_g)^2
$$

Brier 同时受校准与区分影响，因此还要配合校准曲线和排序指标。
""".strip(),
    "超参数搜索是在验证规则下求最优": r"""
**第 1 步｜每组参数都走同一交叉验证。** 对候选 $\theta$，计算 $\bar s(\theta)=\sum_ks_k(\theta)/K$。

**第 2 步｜在候选空间内选择。** $\theta^*=\arg\max_{\theta\in\Theta}\bar s(\theta)$。

**第 3 步｜用全部训练数据重拟合。** 选择完成后得到

$$
\hat f^*=Train(D_{train};\theta^*)
$$

再只在独立测试集评估一次。若用同一个测试集反复比较参数，它就已经变成验证集。
""".strip(),
    "候选模型必须相对基线改进": r"""
**第 1 步｜同一验证折内做配对比较。** 第 $k$ 折差值 $d_k=s_{model,k}-s_{baseline,k}$。

**第 2 步｜平均差值而不只比较两个独立均值。** 

$$
\bar d=\frac1K\sum_kd_k,
\qquad
SD(d)=\sqrt{\frac1{K-1}\sum_k(d_k-\bar d)^2}
$$

**第 3 步｜再衡量相对提升。** 当基线不接近 0 时，可计算 $\bar d/|\bar s_{baseline}|$。分数提升还要与推理成本、延迟和维护复杂度一起评审。
""".strip(),
    "置换重要性衡量性能下降": r"""
**第 1 步｜记录未破坏数据时的基准分数。** $s_0=s(X,y)$。

**第 2 步｜只打乱特征 $j$，破坏它与目标及其他特征的对应关系。** 第 $r$ 次置换分数为 $s_{jr}$。

**第 3 步｜计算并重复平均性能下降。** 

$$
I_j=\frac1R\sum_{r=1}^{R}(s_0-s_{jr})
$$

同时报告这些下降的标准差，才能看出重要性是否稳定。
""".strip(),
    "批量推理的阈值合同": r"""
**第 1 步｜完整 Pipeline 输出概率。** $p_i=f_{version}(x_i)$。

**第 2 步｜固定已审批阈值形成行动标记。** $a_i=\mathbf1(p_i\ge t)$。

**第 3 步｜预估批次负载。** 

$$
N_{action}=\sum_ia_i,
\qquad
action\ rate=\frac{N_{action}}{n}
$$

概率、阈值、模型版本和特征版本共同构成可复现的推理合同。
""".strip(),
    "客户价值预测的误差口径": r"""
**第 1 步｜为每位客户计算绝对误差。** $e_i=|y_i-\hat y_i|$。

**第 2 步｜把业务权重归一化。** $\alpha_i=w_i/\sum_jw_j$，于是 $\sum_i\alpha_i=1$。

**第 3 步｜加权误差是误差的加权平均。** 

$$
WMAE=\sum_i\alpha_ie_i=\frac{\sum_iw_i|y_i-\hat y_i|}{\sum_iw_i}
$$

权重越大的客户对最终指标影响越大，所以权重规则必须在建模前确定并可审计。
""".strip(),
    "上线决策应最小化预期错误成本": r"""
**第 1 步｜阈值决定三种业务数量。** 对每个 $t$，统计误报 $FP(t)$、漏报 $FN(t)$ 与触发行动数 $A(t)=TP(t)+FP(t)$。

**第 2 步｜把数量换成同一货币或效用单位。** 

$$
C(t)=c_{FP}FP(t)+c_{FN}FN(t)+c_AA(t)
$$

**第 3 步｜比较候选阈值。** 在验证集上求 $t^*=\arg\min_tC(t)$，并同时检查容量约束 $A(t)\le A_{max}$。

**第 4 步｜锁定方案后再评估。** 测试集只用于估计已锁定 $t^*$ 的成本与波动，不能继续用它调阈值。
""".strip(),
    "营销模型的期望净收益": r"""
**第 1 步｜阈值产生联系名单。** 联系人数 $A(t)=TP(t)+FP(t)$。

**第 2 步｜拆分收益与成本。** 成功响应带来价值 $TP(t)v$；无效联系产生额外代价 $FP(t)c$；每次行动还承担 $c_AA(t)$。

**第 3 步｜得到净收益并选阈值。** 

$$
EV(t)=TP(t)v-FP(t)c-c_AA(t),
\qquad
t^*=\arg\max_tEV(t)
$$

若名单有预算上限，还需同时满足 $A(t)\le A_{max}$，不能只追求无约束的最高收益。
""".strip(),
})

# 新增公式主题时必须同步提供推导，避免退化成只有结论的“公式卡片”。
missing_derivations = sorted({spec["title"] for spec in FORMULA_SPECS.values()} - set(DERIVATIONS))
if missing_derivations:
    raise RuntimeError("missing formula derivations: " + ", ".join(missing_derivations))
for spec in FORMULA_SPECS.values():
    spec["derivation"] = DERIVATIONS[spec["title"]]


def source_text(cell):
    source = cell.get("source", "")
    return "".join(source) if isinstance(source, list) else str(source)


def render_note(lesson_id, spec):
    return f"""{MARKER_PREFIX}{lesson_id} -->
### 数学推导｜{spec['title']}

> 阅读方法：先跟着步骤理解每个量怎样产生，再看最后的可计算形式；不需要脱离业务场景死记公式。

{spec['derivation']}

**把上面的关系收束为本章计算式：**

$$
{spec['equation']}
$$

**符号解释：** {spec['symbols']}

**代码对应：** {spec['code']}

**使用边界：** {spec['boundary']}
"""


def insertion_index(cells, anchor):
    if anchor:
        for index, cell in enumerate(cells):
            if cell.get("cell_type") == "markdown" and anchor in source_text(cell):
                return index + 1
    for index, cell in enumerate(cells):
        if cell.get("cell_type") == "code":
            return index
    return len(cells)


def update_notebook(path, lesson_id, spec, check_only=False):
    notebook = json.loads(path.read_text(encoding="utf-8"))
    cells = notebook.get("cells", [])
    marker = f"{MARKER_PREFIX}{lesson_id} -->"
    note = render_note(lesson_id, spec)
    existing = next((index for index, cell in enumerate(cells) if marker in source_text(cell)), None)

    if existing is not None:
        cell = cells[existing]
        desired_metadata = {**cell.get("metadata", {}), "tags": sorted(set(cell.get("metadata", {}).get("tags", [])) | {"math-foundation"})}
        changed = source_text(cell) != note or cell.get("metadata", {}) != desired_metadata
        if changed and not check_only:
            cell["source"] = note
            cell["metadata"] = desired_metadata
            path.write_text(json.dumps(notebook, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        return changed

    if check_only:
        return True

    cell_id = "math-" + lesson_id.replace("intro-", "intro-").replace("capstone-", "cap-")
    cells.insert(insertion_index(cells, spec.get("anchor", "")), {
        "cell_type": "markdown",
        "id": cell_id[:64],
        "metadata": {"tags": ["math-foundation"]},
        "source": note,
    })
    path.write_text(json.dumps(notebook, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return True


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="fail if a configured formula note is missing or stale")
    args = parser.parse_args()

    catalog = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    chapters = {item["id"]: item for item in catalog.get("chapters", [])}
    unknown = sorted(set(FORMULA_SPECS) - set(chapters))
    if unknown:
        raise SystemExit("formula specs reference unknown lessons: " + ", ".join(unknown))

    changed = []
    for lesson_id, spec in FORMULA_SPECS.items():
        item = chapters[lesson_id]
        path = ROOT / "public" / item["path"].lstrip("/")
        if not path.exists():
            raise SystemExit(f"notebook missing for {lesson_id}: {path}")
        if update_notebook(path, lesson_id, spec, check_only=args.check):
            changed.append(lesson_id)

    print(f"math formula notebooks configured: {len(FORMULA_SPECS)}")
    print(f"{'stale' if args.check else 'changed'}: {len(changed)}")
    if args.check and changed:
        raise SystemExit("missing or stale math notes: " + ", ".join(changed))


if __name__ == "__main__":
    main()
