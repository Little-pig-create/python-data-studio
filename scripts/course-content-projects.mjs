const project = ({
  summary,
  objectives,
  background,
  dataDictionary,
  qualityChecks,
  tasks,
  codeCells,
  conclusions,
  acceptance
}) => ({
  summary,
  objectives,
  background,
  dataDictionary,
  qualityChecks,
  tasks,
  codeCells,
  conclusions,
  acceptance
});

export const projectProfiles = {
  72: project({
    summary: "使用 Gapminder 真实面板数据（142国 × 12期 = 1704行），完成收敛性分析、人口加权增量分解与冲击事件定位，学习诊断型分析范式。",
    objectives: [
      "读取真实公开数据集并核验面板结构的完整性",
      "用离散度指标判断国家间差距是收敛还是扩大",
      "用 shift-share 方法把大洲变化分解为国内改善与人口结构两部分",
      "用 IQR 与逐期差分定位异常国家和冲击发生的年份",
      "区分相关关系的强度与函数形式，避免把相关写成因果"
    ],
    background: "世界卫生统计年报要回答一个问题：1952 到 2007 年间各洲预期寿命普遍上升，但国家之间的差距是缩小了还是扩大了？上升究竟来自各国自身改善，还是人口权重变化带来的算术效应？哪些国家出现过倒退，倒退发生在哪一年？本项目使用 Gapminder 基金会公开数据（随 plotly 离线分发）完成这份诊断。",
    dataDictionary: [
      ["country", "国家名称", "面板个体维度，142个"],
      ["continent", "所属大洲", "Asia/Europe/Africa/Americas/Oceania"],
      ["year", "观测年份", "1952-2007，每5年一期，共12期"],
      ["lifeExp", "预期寿命（岁）", "核心结果指标"],
      ["pop", "总人口（人）", "用于人口加权与结构分解"],
      ["gdpPercap", "人均GDP（国际元）", "解释变量，购买力平价计价"],
      ["iso_alpha", "ISO三位国家码", "用于关联外部数据"]
    ],
    qualityChecks: [
      "（country, year）组合是否唯一，可否作为面板主键",
      "是否为平衡面板：每个国家的观测期数是否一致",
      "年份间隔是否等距，能否直接做逐期差分",
      "lifeExp / pop / gdpPercap 是否均为正值",
      "缺失值分布是否集中在特定国家或年份"
    ],
    tasks: [
      "加载 Gapminder 数据并记录来源与字段口径",
      "完成面板结构审计与取值范围检查",
      "对比首末年份的分布形态，识别分布是否变窄",
      "计算标准差、变异系数与 P90-P10 差距，判定收敛方向",
      "用 shift-share 分解各洲预期寿命变化的来源",
      "定位倒退国家与单期最大跌幅发生的年份",
      "分析预期寿命与人均GDP的相关形式随时间的演变",
      "输出事实→假设→验证方案的三段式结论"
    ],
    codeCells: [
      {
        title: "1. 加载真实数据并记录溯源",
        explanation: "分析的第一步不是算指标，而是说清数据从哪来、每个字段什么含义、覆盖范围多大。plotly 把 Gapminder 数据以压缩 CSV 随包分发，因此这里读取的是本地文件，不需要联网。",
        code: `import numpy as np
import pandas as pd
import plotly.express as px
import matplotlib.pyplot as plt

pd.set_option("display.width", 130)
pd.set_option("display.max_columns", 20)

# 数据来源：Gapminder 基金会 https://www.gapminder.org/data/
# 分发方式：随 plotly 包内置的 gapminder.csv.gz，本地读取，无需网络
gap = px.data.gapminder()

print("数据形状（行, 列）:", gap.shape)
print("字段:", list(gap.columns))
print("年份范围:", gap["year"].min(), "到", gap["year"].max())
print("国家数:", gap["country"].nunique(), "  大洲数:", gap["continent"].nunique())
print()
print("前5行:")
print(gap.head())
print()
print("字段类型:")
print(gap.dtypes)`
      },
      {
        title: "2. 面板结构审计：主键、平衡性与取值范围",
        explanation: "面板数据的分析前提是结构可靠。要确认（国家, 年份）能唯一标识一行、每个国家的观测期数一致、年份等距，否则后面的逐期差分和分组对比都会算错。真实数据集也必须审计，不能因为它公开就假设它干净。",
        code: `# 1) 主键唯一性
dup = gap.duplicated(subset=["country", "year"]).sum()
print("重复的(country, year)组合数:", dup)

# 2) 平衡面板检查：每个国家的观测期数
periods = gap.groupby("country")["year"].nunique()
print("每国观测期数 - 最小:", periods.min(), " 最大:", periods.max())
print("是否为平衡面板:", periods.min() == periods.max())

# 3) 年份是否等距
years = np.sort(gap["year"].unique())
print("年份序列:", years.tolist())
print("年份间隔:", np.unique(np.diff(years)).tolist())

# 4) 缺失值与取值范围
print()
print("缺失值统计:")
print(gap.isna().sum()[lambda s: s > 0] if gap.isna().sum().sum() else "无缺失值")
print()
print("数值字段分布:")
print(gap[["lifeExp", "pop", "gdpPercap"]].describe().T[["min", "25%", "50%", "75%", "max"]])

# 5) 业务合理性：三个指标都应为正
for col in ["lifeExp", "pop", "gdpPercap"]:
    bad = (gap[col] <= 0).sum()
    print(f"{col} 非正值行数: {bad}")

print()
print("每洲国家数:")
print(gap.groupby("continent")["country"].nunique().sort_values(ascending=False))`
      },
      {
        title: "3. 首末年份分布对比：整体上移还是差距收窄",
        explanation: "诊断分析先看分布再看均值。均值上升有两种完全不同的形态：整个分布平移（所有国家一起改善），或者尾部追赶（落后国家改善更快、分布变窄）。二者对应的政策含义完全不同，所以必须先把分布画出来。",
        code: `y0, y1 = years[0], years[-1]
first = gap[gap["year"] == y0]["lifeExp"]
last = gap[gap["year"] == y1]["lifeExp"]

stat = pd.DataFrame({
    str(y0): first.describe(),
    str(y1): last.describe()
}).T[["mean", "std", "min", "25%", "50%", "75%", "max"]].round(2)
print("首末年份分布对比:")
print(stat)
print()
print(f"均值提升: {last.mean() - first.mean():.2f} 岁")
print(f"标准差变化: {last.std() - first.std():.2f} 岁（负值说明国家间差距收窄）")
print(f"最低值提升: {last.min() - first.min():.2f} 岁")
print(f"最高值提升: {last.max() - first.max():.2f} 岁")

fig, axes = plt.subplots(1, 2, figsize=(13, 4.2))
bins = np.arange(20, 90, 4)
axes[0].hist(first, bins=bins, alpha=0.65, label=str(y0), color="#94a3b8", edgecolor="white")
axes[0].hist(last, bins=bins, alpha=0.65, label=str(y1), color="#2563eb", edgecolor="white")
axes[0].set_title("Life expectancy distribution")
axes[0].set_xlabel("years")
axes[0].set_ylabel("countries")
axes[0].legend()
axes[0].grid(axis="y", alpha=0.3)

order = ["Africa", "Asia", "Americas", "Europe", "Oceania"]
data = [gap[(gap["year"] == y1) & (gap["continent"] == c)]["lifeExp"].values for c in order]
axes[1].boxplot(data, showmeans=True)
axes[1].set_xticklabels(order, rotation=15)
axes[1].set_title(f"By continent, {y1}")
axes[1].set_ylabel("years")
axes[1].grid(axis="y", alpha=0.3)
plt.tight_layout()
plt.show()`
      },
      {
        title: "4. 收敛性检验：离散度指标的时间趋势",
        explanation: "上一步只看了两个时点，可能是偶然。收敛是一个过程，要看每一期的离散度是否单调下降。这里用三个互补指标：标准差（绝对差距）、变异系数（相对差距）、P90-P10 分位差（对极端值不敏感）。三者同向才能下结论。",
        code: `conv = gap.groupby("year")["lifeExp"].agg(
    mean="mean", std="std",
    p10=lambda s: s.quantile(0.10),
    p90=lambda s: s.quantile(0.90)
).reset_index()
conv["cv"] = conv["std"] / conv["mean"]          # 变异系数
conv["p90_p10"] = conv["p90"] - conv["p10"]      # 分位差
print(conv.round(3).to_string(index=False))

f, l = conv.iloc[0], conv.iloc[-1]
print()
for name, key in [("标准差", "std"), ("变异系数", "cv"), ("P90-P10分位差", "p90_p10")]:
    chg = (l[key] - f[key]) / f[key] * 100
    print(f"{name}: {f[key]:.3f} -> {l[key]:.3f}  ({chg:+.1f}%)")

# 是否单调下降
mono = (conv["std"].diff().dropna() < 0).mean()
print(f"\\n标准差逐期下降的比例: {mono:.0%}")

fig, ax1 = plt.subplots(figsize=(9, 4.2))
ax1.plot(conv["year"], conv["mean"], "o-", color="#2563eb", label="mean")
ax1.fill_between(conv["year"], conv["p10"], conv["p90"], alpha=0.18,
                 color="#2563eb", label="P10-P90 band")
ax1.set_xlabel("year")
ax1.set_ylabel("life expectancy (years)", color="#2563eb")
ax1.grid(alpha=0.3)

ax2 = ax1.twinx()
ax2.plot(conv["year"], conv["cv"], "s--", color="#dc2626", label="CV (right)")
ax2.set_ylabel("coefficient of variation", color="#dc2626")

h1, l1 = ax1.get_legend_handles_labels()
h2, l2 = ax2.get_legend_handles_labels()
ax1.legend(h1 + h2, l1 + l2, loc="upper left", fontsize=9)
plt.title("Level rises while dispersion shrinks")
plt.tight_layout()
plt.show()`
      },
      {
        title: "5. 结构分解：增长来自国家自身改善还是人口权重变化",
        explanation: "这是诊断分析的核心工具。人口加权预期寿命的变化可以拆成两块：组内效应（各国自己进步）和结构效应（人口占比向高寿命国家转移）。同样的总变化，如果主要来自结构效应，说明并非普遍改善，而是统计口径的加权错觉。这个方法在业务里叫 shift-share，用来拆解客单价、毛利率、留存率的变化同样有效。",
        code: `def shift_share(df, group_col, value_col, weight_col, t0, t1):
    """把加权均值的变化拆成 组内效应 + 结构效应 + 交叉项"""
    a = df[df["year"] == t0].set_index(group_col)
    b = df[df["year"] == t1].set_index(group_col)
    idx = a.index.intersection(b.index)
    a, b = a.loc[idx], b.loc[idx]

    w0 = a[weight_col] / a[weight_col].sum()
    w1 = b[weight_col] / b[weight_col].sum()
    v0, v1 = a[value_col], b[value_col]

    within = (w0 * (v1 - v0)).sum()          # 权重不变，指标改善
    between = ((w1 - w0) * v0).sum()         # 指标不变，权重迁移
    cross = ((w1 - w0) * (v1 - v0)).sum()    # 交叉项
    total = (w1 * v1).sum() - (w0 * v0).sum()
    return pd.Series({"总变化": total, "组内效应": within,
                      "结构效应": between, "交叉项": cross})

rows = []
for c in order:
    sub = gap[gap["continent"] == c]
    r = shift_share(sub, "country", "lifeExp", "pop", y0, y1)
    r.name = c
    rows.append(r)
r = shift_share(gap, "country", "lifeExp", "pop", y0, y1)
r.name = "全球"
rows.append(r)

decomp = pd.DataFrame(rows).round(2)
decomp["组内占比"] = (decomp["组内效应"] / decomp["总变化"] * 100).round(1)
print("人口加权预期寿命变化分解（岁）:")
print(decomp.to_string())
print()
print("结论：组内占比接近或超过100%，说明提升几乎全部来自各国自身改善，")
print("      而非人口向高寿命国家迁移带来的加权效应。")

fig, ax = plt.subplots(figsize=(9, 4))
x = np.arange(len(decomp))
ax.bar(x - 0.2, decomp["组内效应"], 0.4, label="within", color="#2563eb")
ax.bar(x + 0.2, decomp["结构效应"], 0.4, label="between", color="#f59e0b")
ax.axhline(0, color="#334155", lw=1)
ax.set_xticks(x)
ax.set_xticklabels(decomp.index, rotation=15)
ax.set_ylabel("contribution (years)")
ax.set_title("Shift-share decomposition")
ax.legend()
ax.grid(axis="y", alpha=0.3)
plt.tight_layout()
plt.show()`
      },
      {
        title: "6. 异常识别：哪些国家出现倒退",
        explanation: "总量向好会掩盖局部恶化。这里做两层筛查：一是用 IQR 规则找出长期改善幅度显著偏低的国家（离群点），二是逐期差分找出单期最大跌幅，定位具体年份。真实数据里这些异常都对应可查证的历史事件，这正是数据分析能落到现实的地方。",
        code: `first = gap[gap["year"] == y0].set_index("country")["lifeExp"]
last = gap[gap["year"] == y1].set_index("country")["lifeExp"]
delta = (last - first).dropna().sort_values()
cont = gap.drop_duplicates("country").set_index("country")["continent"]

q1, q3 = delta.quantile([0.25, 0.75])
iqr = q3 - q1
low = q1 - 1.5 * iqr
print(f"改善幅度分布: 中位数 {delta.median():.2f} 岁, IQR [{q1:.2f}, {q3:.2f}], 下界 {low:.2f} 岁")

out = delta[delta < low]
print(f"IQR 规则命中 {len(out)} 个国家")
if out.empty:
    print(f"  -> 统计规则未命中: 改善幅度本身离散度很大(IQR 宽 {iqr:.1f} 岁),")
    print(f"     下界被推到 {low:.1f} 岁这种负值, 只有极端崩溃才可能触发。")
    print("  -> 这是真实数据的常态。阈值失灵时应改用业务规则, 而不是调参数硬凑出异常。")

neg = delta[delta < 0]
print(f"\\n规则A 净倒退({y0}-{y1} 寿命下降)的国家 {len(neg)} 个: {list(neg.index) if len(neg) else '无'}")

tail = delta.head(8)
print(f"\\n规则B 改善垫底 8 国(对比全球中位数 {delta.median():.1f} 岁):")
print(pd.DataFrame({
    "改善幅度": tail.round(2),
    "洲": cont.reindex(tail.index),
    f"{y1}寿命": last.reindex(tail.index).round(1),
}).to_string())

# 逐期差分，定位最坏的单期跌幅
g = gap.sort_values(["country", "year"])
g["chg"] = g.groupby("country")["lifeExp"].diff()
worst = g.dropna(subset=["chg"]).nsmallest(8, "chg")[["country", "year", "lifeExp", "chg"]]
print("\\n单期跌幅最大的记录（每期=5年）:")
print(worst.round(2).to_string(index=False))
print("\\n这些年份可与卢旺达大屠杀、柬埔寨内战、撒哈拉以南艾滋病流行等事件对照验证。")

flagged = list(dict.fromkeys(list(neg.index) + list(tail.index)))
print(f"\\n两条业务规则合并后的关注名单 {len(flagged)} 个: {flagged}")

focus = flagged[:5]
fig, ax = plt.subplots(figsize=(9, 4.4))
for c in focus:
    s = gap[gap["country"] == c]
    ax.plot(s["year"], s["lifeExp"], "o-", lw=1.8, ms=4, label=c)
ax.plot(conv["year"], conv["mean"], "k--", lw=2, label="global mean")
ax.set_xlabel("year")
ax.set_ylabel("life expectancy")
ax.set_title("Countries that fell behind")
ax.legend(fontsize=8, ncol=2)
ax.grid(alpha=0.3)
plt.tight_layout()
plt.show()`
      },
      {
        title: "7. 相关不等于因果：收入与寿命的 Preston 曲线",
        explanation: "找到倒退国家后，自然要问驱动因素。人均 GDP 是最直观的候选变量，但原始散点是弯曲的，直接算线性相关会低估关系强度。对收入取对数后关系近似线性，这就是经济学里的 Preston 曲线。注意最后的提醒：强相关只提示方向，不能直接当因果结论用。",
        code: `snap = gap[gap["year"] == y1].copy()
snap["log_gdp"] = np.log10(snap["gdpPercap"])

r_raw = snap["gdpPercap"].corr(snap["lifeExp"])
r_log = snap["log_gdp"].corr(snap["lifeExp"])
r_spearman = snap["gdpPercap"].corr(snap["lifeExp"], method="spearman")
print(f"{y1} 年 人均GDP vs 预期寿命")
print(f"  Pearson(原始)   = {r_raw:.3f}")
print(f"  Pearson(取对数) = {r_log:.3f}   <- 关系近似线性后大幅提升")
print(f"  Spearman(秩)    = {r_spearman:.3f}")

# 最小二乘拟合（numpy，无需额外依赖）
b, a = np.polyfit(snap["log_gdp"], snap["lifeExp"], 1)
snap["fitted"] = a + b * snap["log_gdp"]
snap["resid"] = snap["lifeExp"] - snap["fitted"]
r2 = 1 - (snap["resid"] ** 2).sum() / ((snap["lifeExp"] - snap["lifeExp"].mean()) ** 2).sum()
print(f"\\n拟合: lifeExp = {a:.1f} + {b:.1f} * log10(gdpPercap),  R^2 = {r2:.3f}")
print(f"解读: 人均GDP 每翻 10 倍，预期寿命约增加 {b:.1f} 岁")

print("\\n同等收入下寿命最低（负残差最大）:")
print(snap.nsmallest(5, "resid")[["country", "gdpPercap", "lifeExp", "resid"]].round(2).to_string(index=False))
print("\\n同等收入下寿命最高（正残差最大）:")
print(snap.nlargest(5, "resid")[["country", "gdpPercap", "lifeExp", "resid"]].round(2).to_string(index=False))

fig, ax = plt.subplots(figsize=(9, 5))
for c in order:
    s = snap[snap["continent"] == c]
    ax.scatter(s["gdpPercap"], s["lifeExp"], s=np.sqrt(s["pop"]) / 400,
               alpha=0.65, label=c)
xs = np.linspace(snap["log_gdp"].min(), snap["log_gdp"].max(), 50)
ax.plot(10 ** xs, a + b * xs, "k--", lw=2, label="log fit")
ax.set_xscale("log")
ax.set_xlabel("GDP per capita (log scale)")
ax.set_ylabel("life expectancy")
ax.set_title(f"Preston curve, {y1} (bubble = population)")
ax.legend(fontsize=9)
ax.grid(alpha=0.3)
plt.tight_layout()
plt.show()`
      },
      {
        title: "8. 结论汇总：把证据压缩成一张决策表",
        explanation: "分析的终点是可执行的结论。这一步把前面 7 步的关键数字汇总成结论表，每条结论都标注支撑证据来自哪一步、以及置信程度。养成这个习惯，汇报时就不会出现「我觉得」这类无根据的表述。",
        code: `summary = pd.DataFrame([
    ["全球预期寿命大幅提升",
     f"{conv.iloc[0]['mean']:.1f} -> {conv.iloc[-1]['mean']:.1f} 岁", "步骤3", "高"],
    ["国家间差距在收敛",
     f"变异系数 {conv.iloc[0]['cv']:.3f} -> {conv.iloc[-1]['cv']:.3f}，标准差逐期下降占比 {mono:.0%}", "步骤4", "高"],
    ["提升源于各国自身改善，非人口加权错觉",
     f"全球组内效应占比 {decomp.loc['全球', '组内占比']:.0f}%", "步骤5", "高"],
    ["局部存在明显倒退",
     f"{len(neg)} 国净倒退，垫底 8 国改善 <= {tail.max():.1f} 岁，"
     f"最坏单期跌幅 {worst['chg'].min():.1f} 岁", "步骤6", "高"],
    ["收入与寿命强相关但非线性",
     f"取对数后 r={r_log:.2f}，R^2={r2:.2f}", "步骤7", "中（相关非因果）"],
], columns=["结论", "关键证据", "来源", "置信度"])

print("=" * 92)
print("分析结论表")
print("=" * 92)
print(summary.to_string(index=False))

print("\\n" + "=" * 92)
print("行动建议（按优先级）")
print("=" * 92)
for i, (act, why) in enumerate([
    ("资源优先投向步骤6识别出的倒退国家", "总量向好掩盖了局部恶化，边际收益最高"),
    ("对负残差国家做专项诊断", "收入已达标但寿命偏低，问题在医疗体系而非经济总量"),
    ("以正残差国家为对标样本", "同等收入下表现更优，其公共卫生政策可复制"),
    ("补充时间序列因果推断", "本次仅证明相关性，需用双重差分等方法验证政策效果"),
], 1):
    print(f"{i}. {act}\\n   依据: {why}")

print("\\n分析局限: 数据为 5 年间隔的国家级聚合值，无法反映国内区域差异；")
print("          1952-2007 区间不含近年疫情冲击。")`
      }
    ],
    conclusions: [
      "全球预期寿命从 1952 年的约 49 岁提升到 2007 年的约 67 岁，同时国家间差距持续收敛，标准差与变异系数同向下降。",
      "shift-share 分解显示提升几乎全部来自各国自身改善（组内效应），而非人口向高寿命国家迁移造成的加权错觉。",
      "总量向好掩盖了局部恶化：IQR 阈值在这份数据上并未命中任何国家（改善幅度本身离散度过大），改用业务规则后才定位到净倒退国家与改善垫底群体，逐期差分进一步锁定具体年份，可与真实历史事件对照验证。",
      "人均 GDP 与预期寿命呈强对数关系（Preston 曲线），收入翻 10 倍约对应寿命增加数岁；残差分析能区分「钱花在了刀刃上」和「有钱但健康产出低」两类国家。"
    ],
    acceptance: [
      "能说明为什么要先审计面板完整性再做任何聚合",
      "能解释组内效应与结构效应的差别，并举一个业务场景的例子",
      "能用 IQR 规则完成一次异常国家筛查并解释阈值来源",
      "能说明为什么对 GDP 取对数后相关系数会提升，以及为什么不能由此得出因果结论"
    ]
  }),

  73: project({
    summary:
      "餐厅想提高小费收入，但不知道该从哪里下手：是抓大单、调班次、还是改服务对象？本项目用真实的 244 条餐厅账单记录，做分层归因和统计推断，区分「看起来有差异」和「真的有差异」。",
    objectives: [
      "掌握派生指标的设计：为什么要用小费率而不是小费绝对值做分析",
      "掌握分层分析（stratification）：逐维度拆解 + 样本量校验",
      "识别辛普森悖论：交叉分层后结论反转的成因",
      "在不依赖 scipy 的前提下，用置换检验判断组间差异的统计显著性",
      "用自举法（bootstrap）给出效应量的置信区间，而不是只报一个点估计"
    ],
    background:
      "数据来源：plotly 内置 tips 数据集，原始出自 Bryant & Smith《Practical Data Analysis: Case Studies in Business Statistics》(1995)，记录了美国某餐厅一名服务员连续若干天的 244 笔真实账单。字段包含账单金额、小费、顾客性别、是否吸烟区、星期、午/晚餐、同行人数。\\n\\n样本量只有 244——这恰恰是真实业务分析的常态。小样本下最容易犯的错误是把随机波动当成规律，所以本项目的重点不是画图，而是**证明差异存在**。",
    dataDictionary: [
      ["total_bill", "账单总额（美元）", "不含小费"],
      ["tip", "小费金额（美元）", "被解释变量的原始形态"],
      ["sex", "付款人性别", "Male / Female"],
      ["smoker", "是否吸烟区", "Yes / No"],
      ["day", "星期", "Thur / Fri / Sat / Sun"],
      ["time", "餐段", "Lunch / Dinner"],
      ["size", "同行人数", "1-6"],
      ["tip_pct", "小费率（派生）", "= tip / total_bill，本项目核心指标"]
    ],
    qualityChecks: [
      "确认无缺失值与非法值（账单金额、小费必须为正）",
      "检查重复行：完全相同的账单是否真实存在",
      "逐维度统计各分组样本量，标记 n < 20 的格子为「不可结论区」",
      "检查 day 与 time 的交叉分布，确认存在结构性空缺（周末无午餐记录）"
    ],
    tasks: [
      "构造小费率指标，并说明为什么它比小费绝对值更适合做跨账单比较",
      "对性别、吸烟区、星期、餐段、人数逐一做单因素分层，记录均值差与样本量",
      "做「餐段 × 星期」交叉表，找出单因素结论在交叉后被推翻的维度",
      "对最大的那个组间差异做置换检验，报告 p 值",
      "用自举法给出该差异的 95% 置信区间，判断它是否跨过 0",
      "汇总证据，给出可执行的行动建议并标注置信度"
    ],
    codeCells: [
      {
        title: "步骤1：载入真实账单数据并构造核心指标",
        explanation:
          "小费绝对值受账单规模主导，跨账单不可比。分析的第一个决策是把被解释变量换成**比率**：小费率 = 小费 / 账单额。这一步不是数据清洗，而是分析框架的设定——选错指标，后面所有统计都在回答错误的问题。",
        code: `import pandas as pd
import numpy as np
import plotly.express as px
import matplotlib.pyplot as plt

pd.set_option("display.width", 160)
pd.set_option("display.max_columns", 30)

# 真实公开数据：Bryant & Smith (1995) 餐厅小费数据，随 plotly 离线分发
tips = px.data.tips()

print("=" * 92)
print("数据集：餐厅账单与小费（244 笔真实交易）")
print("=" * 92)
print(f"形状: {tips.shape[0]} 行 × {tips.shape[1]} 列")
print(f"字段: {list(tips.columns)}")
print()
print(tips.head(8).to_string(index=False))

# 核心派生指标
tips["tip_pct"] = tips["tip"] / tips["total_bill"]
tips["bill_per_person"] = tips["total_bill"] / tips["size"]

print("\\n" + "-" * 92)
print("为什么用小费率而不是小费金额？")
print("-" * 92)
print(f"小费金额 与 账单额 的相关系数 : {tips['tip'].corr(tips['total_bill']):.3f}  ← 强相关，被账单规模主导")
print(f"小费率   与 账单额 的相关系数 : {tips['tip_pct'].corr(tips['total_bill']):.3f}  ← 已剥离规模效应")
print()
print("结论：小费金额高，可能只是账单大。要衡量「顾客大方程度」，必须用比率。")

print("\\n" + "-" * 92)
print("核心指标分布")
print("-" * 92)
desc = tips["tip_pct"].describe()
print(f"样本量 : {desc['count']:.0f}")
print(f"均值   : {desc['mean']:.4f}  ({desc['mean'] * 100:.2f}%)")
print(f"中位数 : {desc['50%']:.4f}  ({desc['50%'] * 100:.2f}%)")
print(f"标准差 : {desc['std']:.4f}")
print(f"范围   : {desc['min']:.4f} ~ {desc['max']:.4f}")
print()
print(f"均值 > 中位数，说明分布右偏：少数高小费率账单拉高了均值。")
print(f"→ 后续做组间比较时，均值和中位数都要看。")`
      },
      {
        title: "步骤2：数据质量审计与「不可结论区」标记",
        explanation:
          "244 行的数据集拆到「餐段 × 星期」这一层，某些格子可能只剩几条记录。分析者的职业素养体现在：**先把不能下结论的地方标出来**，而不是等画完图再解释为什么某根柱子是异常的。这里同时会发现一个结构性空缺——周末没有午餐记录。",
        code: `print("=" * 92)
print("数据质量审计")
print("=" * 92)

# 1. 缺失与非法值
print("\\n[1] 缺失值与合法性")
missing = tips.isna().sum()
print(f"    缺失值总数: {int(missing.sum())}")
illegal = ((tips["total_bill"] <= 0) | (tips["tip"] < 0)).sum()
print(f"    非法值（账单<=0 或 小费<0）: {int(illegal)}")
extreme = (tips["tip_pct"] > 0.5).sum()
print(f"    小费率 > 50% 的记录: {int(extreme)} 条  ← 保留，真实存在的慷慨顾客")

# 2. 重复行
print("\\n[2] 重复行检查")
dup = tips.duplicated().sum()
print(f"    完全重复的行: {int(dup)} 条")
if dup > 0:
    print("    判断：两桌顾客账单、小费、人数完全相同是可能的，属于真实巧合，不删除。")

# 3. 分组样本量 —— 决定哪些结论可以下
print("\\n[3] 各维度分组样本量（n < 20 视为不可结论区）")
for col in ["sex", "smoker", "day", "time", "size"]:
    counts = tips[col].value_counts().sort_index()
    parts = []
    for k, v in counts.items():
        flag = "!" if v < 20 else " "
        parts.append(f"{k}={v}{flag}")
    print(f"    {col:8s}: {'  '.join(parts)}")
print("    （标记 ! 的分组样本过少，其均值波动大，不单独下结论）")

# 4. 交叉分布 —— 发现结构性空缺
print("\\n[4] 餐段 × 星期 交叉样本量")
cross = pd.crosstab(tips["day"], tips["time"])
print(cross.to_string())

zeros = [(d, t) for d in cross.index for t in cross.columns if cross.loc[d, t] == 0]
print(f"\\n    空格子: {zeros}")
print("    这不是数据缺失，是业务事实：该餐厅周末不营业午市。")
print("    → 任何「午餐 vs 晚餐」的比较，实际上混入了「工作日 vs 周末」的差异。")
print("    → 这就是下一步必须做交叉分层的原因。")`
      },
      {
        title: "步骤3：单因素分层 —— 逐维度找差异",
        explanation:
          "分层分析是归因的起点：把总体按每个维度切开，看指标在哪个维度上分化最明显。关键是**同时输出效应量和样本量**——一个 5 个百分点的差异，如果只建立在 19 条记录上，那它更可能是噪声。这一步只做筛选，不下结论。",
        code: `print("=" * 92)
print("单因素分层分析：小费率在哪个维度上分化最明显")
print("=" * 92)

def stratify(df, col, metric="tip_pct"):
    g = df.groupby(col, observed=True)[metric].agg(["count", "mean", "median", "std"])
    g["mean_pct"] = g["mean"] * 100
    return g.sort_values("mean", ascending=False)

summary_rows = []
for col in ["sex", "smoker", "time", "day", "size"]:
    g = stratify(tips, col)
    print(f"\\n--- 按 {col} 分层 ---")
    for idx, row in g.iterrows():
        bar = "#" * int(row["mean"] * 200)
        warn = "  <- 样本过少" if row["count"] < 20 else ""
        print(f"  {str(idx):8s} n={int(row['count']):3d}  均值={row['mean_pct']:5.2f}%  "
              f"中位数={row['median'] * 100:5.2f}%  {bar}{warn}")

    # 记录该维度的最大组间差（仅统计样本量达标的组）
    valid = g[g["count"] >= 20]
    if len(valid) >= 2:
        spread = valid["mean"].max() - valid["mean"].min()
        summary_rows.append({
            "维度": col,
            "有效分组数": len(valid),
            "最高组": str(valid["mean"].idxmax()),
            "最低组": str(valid["mean"].idxmin()),
            "组间差(百分点)": spread * 100,
            "最小组样本": int(valid["count"].min()),
        })

rank = pd.DataFrame(summary_rows).sort_values("组间差(百分点)", ascending=False)
print("\\n" + "=" * 92)
print("维度重要性排序（按最大组间差，仅含样本量>=20 的组）")
print("=" * 92)
print(rank.to_string(index=False, float_format=lambda x: f"{x:.2f}"))

top = rank.iloc[0]
print(f"\\n候选主因：{top['维度']}（{top['最高组']} vs {top['最低组']}，"
      f"相差 {top['组间差(百分点)']:.2f} 个百分点）")
print("注意：这只是描述性差异。是否显著，要到步骤5做检验。")`
      },
      {
        title: "步骤4：交叉分层 —— 主动搜索辛普森悖论",
        explanation:
          "单因素分层的致命缺陷是混淆变量。步骤2 已经发现「午餐」只出现在工作日——所以「午餐 vs 晚餐」的差异里混着「工作日 vs 周末」。这一步不靠直觉猜，而是**程序化枚举所有 二元因素 × 控制变量 的组合，自动标记符号反转**。凡是总体方向和分层后方向不一致的，都是结论不可靠的信号。",
        code: `print("=" * 92)
print("交叉分层：搜索符号反转（辛普森悖论）")
print("=" * 92)

def mean_diff(df, factor, high, low, metric="tip_pct"):
    """返回 (均值差, high组样本量, low组样本量)"""
    a = df.loc[df[factor] == high, metric]
    b = df.loc[df[factor] == low, metric]
    if len(a) == 0 or len(b) == 0:
        return np.nan, len(a), len(b)
    return a.mean() - b.mean(), len(a), len(b)

binary_factors = {"sex": ("Male", "Female"), "smoker": ("Yes", "No"), "time": ("Lunch", "Dinner")}
controls = ["day", "time", "size", "smoker", "sex"]
MIN_N = 15

reversals = []
for factor, (hi, lo) in binary_factors.items():
    overall, n_hi, n_lo = mean_diff(tips, factor, hi, lo)
    print(f"\\n--- 因素 {factor}: {hi} vs {lo} ---")
    print(f"  总体差异: {overall * 100:+.2f} 个百分点  (n={n_hi} vs {n_lo})")

    for ctrl in controls:
        if ctrl == factor:
            continue
        print(f"  控制 {ctrl} 后：")
        for level in sorted(tips[ctrl].unique(), key=str):
            sub = tips[tips[ctrl] == level]
            d, na, nb = mean_diff(sub, factor, hi, lo)
            if np.isnan(d):
                print(f"    {ctrl}={level!s:8s} 该层缺少对照组，无法比较")
                continue
            reliable = na >= MIN_N and nb >= MIN_N
            mark = ""
            if reliable and np.sign(d) != np.sign(overall):
                mark = "  <== 符号反转"
                reversals.append((factor, ctrl, str(level), overall * 100, d * 100, na, nb))
            note = "" if reliable else "  (样本不足，仅供参考)"
            print(f"    {ctrl}={level!s:8s} 差异={d * 100:+6.2f} pp  (n={na:3d} vs {nb:3d}){mark}{note}")

print("\\n" + "=" * 92)
print("搜索结果")
print("=" * 92)
if reversals:
    rev = pd.DataFrame(reversals, columns=["因素", "控制变量", "层级", "总体差异pp", "该层差异pp", "n_high", "n_low"])
    print(rev.to_string(index=False, float_format=lambda x: f"{x:.2f}"))
    print("\\n以上组合中，总体结论与分层结论方向相反 —— 这就是辛普森悖论的现场。")
    print("成因：因素与控制变量不独立，分组样本占比不均，聚合时被权重扭曲。")
else:
    print("在样本量达标的层级中未发现符号反转，主效应方向稳健。")

print("\\n结构性提醒：")
lunch_days = sorted(tips.loc[tips["time"] == "Lunch", "day"].unique())
dinner_days = sorted(tips.loc[tips["time"] == "Dinner", "day"].unique())
print(f"  午餐仅出现在 {lunch_days}")
print(f"  晚餐出现在   {dinner_days}")
print("  → 「午餐 vs 晚餐」无法与「工作日 vs 周末」分离，此维度的因果解读必须放弃。")`
      },
      {
        title: "步骤5：置换检验 —— 差异是真的还是随机的",
        explanation:
          "小样本下最容易犯的错是把噪声当规律。置换检验的逻辑极其直观：假设分组标签毫无意义，那么把标签随机打乱几千次，得到的差异分布就是「纯随机能达到的水平」；如果真实差异落在这个分布的极端尾部，才说明分组有意义。它不需要正态假设，也不需要 scipy——只用 numpy 就能实现，而且比 t 检验更容易讲清楚原理。",
        code: `print("=" * 92)
print("置换检验：组间差异的统计显著性")
print("=" * 92)

def permutation_test(a, b, n_iter=5000, seed=42):
    """双尾置换检验。返回 (观测差异, p值, 零分布)"""
    a = np.asarray(a, dtype=float)
    b = np.asarray(b, dtype=float)
    observed = a.mean() - b.mean()
    pooled = np.concatenate([a, b])
    n_a = len(a)
    rng = np.random.default_rng(seed)
    null = np.empty(n_iter)
    for i in range(n_iter):
        shuffled = rng.permutation(pooled)
        null[i] = shuffled[:n_a].mean() - shuffled[n_a:].mean()
    # +1 修正，避免 p=0 这种过度自信的报告
    p_value = (np.sum(np.abs(null) >= abs(observed)) + 1) / (n_iter + 1)
    return observed, p_value, null

def cohens_d(a, b):
    a, b = np.asarray(a, float), np.asarray(b, float)
    n1, n2 = len(a), len(b)
    s_pool = np.sqrt(((n1 - 1) * a.var(ddof=1) + (n2 - 1) * b.var(ddof=1)) / (n1 + n2 - 2))
    return (a.mean() - b.mean()) / s_pool if s_pool > 0 else np.nan

def d_label(d):
    ad = abs(d)
    if ad < 0.2:
        return "可忽略"
    if ad < 0.5:
        return "小"
    if ad < 0.8:
        return "中"
    return "大"

candidates = [
    ("性别", "sex", "Male", "Female"),
    ("吸烟区", "smoker", "Yes", "No"),
    ("餐段", "time", "Lunch", "Dinner"),
    ("周末与否", "is_weekend", True, False),
]
tips["is_weekend"] = tips["day"].isin(["Sat", "Sun"])

results = []
for name, col, hi, lo in candidates:
    a = tips.loc[tips[col] == hi, "tip_pct"].values
    b = tips.loc[tips[col] == lo, "tip_pct"].values
    obs, p, null = permutation_test(a, b)
    d = cohens_d(a, b)
    results.append({
        "对比": f"{name}: {hi} vs {lo}",
        "n_high": len(a), "n_low": len(b),
        "差异pp": obs * 100,
        "p值": p,
        "Cohen_d": d,
        "效应量": d_label(d),
        "显著": "是" if p < 0.05 else "否",
    })
    print(f"\\n{name}: {hi}({len(a)}) vs {lo}({len(b)})")
    print(f"  观测差异 : {obs * 100:+.2f} 个百分点")
    print(f"  零分布   : 均值={null.mean() * 100:+.3f}pp  标准差={null.std() * 100:.3f}pp")
    print(f"  p 值     : {p:.4f}   {'← 显著 (p<0.05)' if p < 0.05 else '← 不显著，无法排除随机波动'}")
    print(f"  Cohen d  : {d:+.3f} ({d_label(d)}效应)")

res = pd.DataFrame(results)
print("\\n" + "=" * 92)
print("检验结果汇总")
print("=" * 92)
print(res.to_string(index=False, float_format=lambda x: f"{x:.4f}"))

sig = res[res["显著"] == "是"]
print(f"\\n{len(sig)} / {len(res)} 项对比达到显著水平。")
if len(sig) == 0:
    print("→ 关键结论：步骤3 看到的所有「差异」都无法与随机波动区分。")
    print("  244 个样本不足以支撑按人群细分的运营决策 —— 这是一个有价值的负面结论，")
    print("  它阻止团队基于噪声去调整排班或服务策略。")
else:
    print("→ 仅对显著项做后续决策，其余归入「证据不足」。")`
      },
      {
        title: "步骤6：自举置信区间 —— 把「点估计」换成「区间估计」",
        explanation:
          "只报一个均值是不负责任的：14.9% 这个数字背后可能是 ±0.5pp 的稳定估计，也可能是 ±3pp 的剧烈摇摆，而两者对应完全不同的决策信心。自举（bootstrap）从样本中有放回地重抽同等规模的数据几千次，用重抽结果的分布来量化不确定性。区间宽度会直接暴露哪些分组的样本量根本不够用。",
        code: `print("=" * 92)
print("自举置信区间：每个分组的估计精度")
print("=" * 92)

def bootstrap_ci(x, stat=np.mean, n_iter=4000, level=0.95, seed=7):
    """百分位法自举置信区间"""
    x = np.asarray(x, dtype=float)
    x = x[~np.isnan(x)]
    if len(x) < 2:
        return np.nan, np.nan, np.nan
    rng = np.random.default_rng(seed)
    boots = np.array([stat(rng.choice(x, size=len(x), replace=True)) for _ in range(n_iter)])
    alpha = (1 - level) / 2
    return stat(x), np.quantile(boots, alpha), np.quantile(boots, 1 - alpha)

rows = []
overall_pt, overall_lo, overall_hi = bootstrap_ci(tips["tip_pct"])
rows.append(["全体", "-", len(tips), overall_pt, overall_lo, overall_hi])

for dim in ["sex", "smoker", "time", "day", "size"]:
    for level in sorted(tips[dim].unique(), key=str):
        sub = tips.loc[tips[dim] == level, "tip_pct"]
        pt, lo, hi = bootstrap_ci(sub)
        rows.append([dim, str(level), len(sub), pt, lo, hi])

ci = pd.DataFrame(rows, columns=["维度", "层级", "样本量", "均值", "CI下界", "CI上界"])
ci["区间宽度pp"] = (ci["CI上界"] - ci["CI下界"]) * 100
for c in ["均值", "CI下界", "CI上界"]:
    ci[c] = ci[c] * 100
ci["覆盖全体均值"] = (ci["CI下界"] <= overall_pt * 100) & (ci["CI上界"] >= overall_pt * 100)

print(ci.to_string(index=False, float_format=lambda x: f"{x:.2f}"))

print("\\n" + "=" * 92)
print("精度诊断")
print("=" * 92)
wide = ci[(ci["区间宽度pp"] > 4) & (ci["维度"] != "全体")]
print(f"区间宽度 > 4 个百分点（估计极不稳定）的分组：{len(wide)} 个")
if len(wide) > 0:
    print(wide[["维度", "层级", "样本量", "均值", "区间宽度pp"]]
          .sort_values("区间宽度pp", ascending=False)
          .to_string(index=False, float_format=lambda x: f"{x:.2f}"))
    print("→ 这些分组不应单独作为决策依据。")

not_cover = ci[(~ci["覆盖全体均值"]) & (ci["维度"] != "全体")]
print(f"\\n置信区间不包含全体均值（真正与整体不同）的分组：{len(not_cover)} 个")
if len(not_cover) > 0:
    print(not_cover[["维度", "层级", "样本量", "均值", "CI下界", "CI上界"]]
          .to_string(index=False, float_format=lambda x: f"{x:.2f}"))
else:
    print("→ 所有分组的区间都覆盖了全体均值，与步骤5 的检验结论一致：细分证据不足。")

fig, ax = plt.subplots(figsize=(11, 6))
plot_df = ci[ci["维度"].isin(["size", "day"])].copy()
plot_df["标签"] = plot_df["维度"] + "=" + plot_df["层级"]
y = np.arange(len(plot_df))
err_lo = plot_df["均值"] - plot_df["CI下界"]
err_hi = plot_df["CI上界"] - plot_df["均值"]
ax.errorbar(plot_df["均值"], y, xerr=[err_lo, err_hi], fmt="o",
            color="#2563eb", ecolor="#93c5fd", elinewidth=3, capsize=4, markersize=7)
ax.axvline(overall_pt * 100, color="#dc2626", linestyle="--", linewidth=1.6,
           label=f"全体均值 {overall_pt * 100:.2f}%")
ax.set_yticks(y)
ax.set_yticklabels(plot_df["标签"])
ax.set_xlabel("小费率 (%)")
ax.set_title("各分组小费率的 95% 自举置信区间（横线越长=越不可信）")
ax.legend()
ax.grid(True, axis="x", alpha=0.3)
plt.tight_layout()
plt.show()`
      },
      {
        title: "步骤7：连续变量归因 —— 账单金额与小费率的真实关系",
        explanation:
          "分类维度全部失效之后，回到唯一的连续变量：账单金额。这里要同时做三件事——分箱看单调性、手工最小二乘拟合斜率、以及对比 tip 绝对额与 tip 率的相反结论。最后一点是本项目最重要的商业洞察：**指标选错，结论就会反向**。手写 OLS（不调库）能让学员真正理解回归系数是怎么算出来的。",
        code: `print("=" * 92)
print("账单金额 → 小费率：分箱 + 手工 OLS")
print("=" * 92)

tips["bill_bin"] = pd.qcut(tips["total_bill"], q=5,
                           labels=["最低20%", "较低", "中等", "较高", "最高20%"])
binned = tips.groupby("bill_bin", observed=True).agg(
    样本量=("tip_pct", "size"),
    账单均值=("total_bill", "mean"),
    小费额均值=("tip", "mean"),
    小费率均值=("tip_pct", "mean"),
).reset_index()
binned["小费率均值"] = binned["小费率均值"] * 100
print(binned.to_string(index=False, float_format=lambda x: f"{x:.2f}"))

first, last = binned.iloc[0], binned.iloc[-1]
print(f"\\n从最低20% 到最高20%：")
print(f"  账单   {first['账单均值']:.2f} → {last['账单均值']:.2f} 元 "
      f"({last['账单均值'] / first['账单均值']:.2f} 倍)")
print(f"  小费额 {first['小费额均值']:.2f} → {last['小费额均值']:.2f} 元 "
      f"({last['小费额均值'] / first['小费额均值']:.2f} 倍)  ← 绝对额上升")
print(f"  小费率 {first['小费率均值']:.2f}% → {last['小费率均值']:.2f}%  "
      f"({last['小费率均值'] - first['小费率均值']:+.2f} pp)  ← 比率下降")
print("  两个指标给出方向相反的结论，这正是「选错指标就得错结论」的教科书案例。")

def ols_simple(x, y):
    """手工一元最小二乘：beta = Cov(x,y)/Var(x)"""
    x, y = np.asarray(x, float), np.asarray(y, float)
    xbar, ybar = x.mean(), y.mean()
    beta = ((x - xbar) * (y - ybar)).sum() / ((x - xbar) ** 2).sum()
    alpha = ybar - beta * xbar
    pred = alpha + beta * x
    resid = y - pred
    ss_res, ss_tot = (resid ** 2).sum(), ((y - ybar) ** 2).sum()
    r2 = 1 - ss_res / ss_tot
    se_beta = np.sqrt(ss_res / (len(x) - 2) / ((x - xbar) ** 2).sum())
    return {"alpha": alpha, "beta": beta, "r2": r2, "se_beta": se_beta,
            "t": beta / se_beta, "pred": pred, "resid": resid}

print("\\n" + "-" * 92)
print("手工 OLS 拟合")
print("-" * 92)
m_rate = ols_simple(tips["total_bill"], tips["tip_pct"] * 100)
m_amt = ols_simple(tips["total_bill"], tips["tip"])
for label, m, unit in [("小费率(%)", m_rate, "pp"), ("小费额(元)", m_amt, "元")]:
    print(f"\\n因变量 = {label}")
    print(f"  截距 alpha = {m['alpha']:+.4f}")
    print(f"  斜率 beta  = {m['beta']:+.5f} {unit} / 每元账单   (t = {m['t']:+.2f})")
    print(f"  R^2        = {m['r2']:.4f}   → 账单金额只能解释 {m['r2'] * 100:.1f}% 的变异")
    print(f"  10 元账单增量的影响: {m['beta'] * 10:+.3f} {unit}")

print(f"\\n相关系数 corr(total_bill, tip)     = {tips['total_bill'].corr(tips['tip']):+.4f}")
print(f"相关系数 corr(total_bill, tip_pct) = {tips['total_bill'].corr(tips['tip_pct']):+.4f}")
print(f"人均账单 corr(bill_per_person, tip_pct) = "
      f"{tips['bill_per_person'].corr(tips['tip_pct']):+.4f}")

fig, axes = plt.subplots(1, 3, figsize=(17, 5))
axes[0].scatter(tips["total_bill"], tips["tip"], s=28, alpha=0.55, color="#2563eb")
order = np.argsort(tips["total_bill"].values)
axes[0].plot(tips["total_bill"].values[order], m_amt["pred"][order], color="#dc2626", linewidth=2)
axes[0].set_xlabel("账单金额 (元)"); axes[0].set_ylabel("小费额 (元)")
axes[0].set_title(f"小费额随账单上升 (R²={m_amt['r2']:.3f})")

axes[1].scatter(tips["total_bill"], tips["tip_pct"] * 100, s=28, alpha=0.55, color="#059669")
axes[1].plot(tips["total_bill"].values[order], m_rate["pred"][order], color="#dc2626", linewidth=2)
axes[1].axhline(tips["tip_pct"].mean() * 100, color="#6b7280", linestyle=":", linewidth=1.4)
axes[1].set_xlabel("账单金额 (元)"); axes[1].set_ylabel("小费率 (%)")
axes[1].set_title(f"小费率随账单下降 (R²={m_rate['r2']:.3f})")

axes[2].bar(binned["bill_bin"].astype(str), binned["小费率均值"], color="#7c3aed", alpha=0.85)
axes[2].axhline(tips["tip_pct"].mean() * 100, color="#dc2626", linestyle="--", linewidth=1.5)
axes[2].set_ylabel("小费率 (%)"); axes[2].set_title("分箱后的小费率单调性")
axes[2].tick_params(axis="x", rotation=20)
for ax in axes:
    ax.grid(True, alpha=0.3)
plt.tight_layout()
plt.show()`
      },
      {
        title: "步骤8：结论与行动 —— 一份诚实的分析报告",
        explanation:
          "把七步证据串成结论。这个项目的价值有一半来自**负面结论**：大部分人群细分差异经不起检验。敢于报告「证据不足」，并明确指出需要多少样本才能得出结论，是分析师专业性的核心体现——它避免了团队基于噪声去改排班、改服务话术。",
        code: `print("=" * 92)
print("分析报告：什么因素真正影响小费率")
print("=" * 92)

print("\\n【一、事实层】")
print(f"  样本 {len(tips)} 单，平均小费率 {tips['tip_pct'].mean() * 100:.2f}%，"
      f"中位数 {tips['tip_pct'].median() * 100:.2f}%（右偏分布）")
print(f"  95% 自举区间 [{overall_lo * 100:.2f}%, {overall_hi * 100:.2f}%]")

print("\\n【二、被证伪的假设】")
for _, r in res.iterrows():
    if r["显著"] == "否":
        print(f"  x {r['对比']}: 差异 {r['差异pp']:+.2f}pp, p={r['p值']:.3f}, "
              f"效应量{r['效应量']} → 无法与随机波动区分")

print("\\n【三、成立的结论】")
print(f"  v 小费率随账单金额单调下降：每增加 10 元账单，小费率降低 "
      f"{abs(m_rate['beta'] * 10):.3f} 个百分点 (t={m_rate['t']:.2f})")
print(f"  v 但小费绝对额随账单上升：每增加 10 元账单，小费增加 {m_amt['beta'] * 10:.3f} 元")
print(f"  v 账单金额仅解释小费率 {m_rate['r2'] * 100:.1f}% 的变异 → 主要驱动因素不在本数据集内")
if reversals:
    print(f"  v 发现 {len(reversals)} 处符号反转，聚合结论不可直接外推到分层")
print("  v 午餐与工作日完全重合，该维度不可做因果解读")

print("\\n" + "=" * 92)
print("行动建议")
print("=" * 92)
for i, (act, why) in enumerate([
    ("以「小费总额」而非「小费率」作为北极星指标", "率随账单下降但额上升，选错指标会得到反向结论"),
    ("优先做提升客单价的动作（套餐、加菜推荐）", "小费额与账单强正相关，是唯一被数据证实的杠杆"),
    ("暂停一切基于性别/吸烟/餐段的差异化服务策略", "这些差异均未通过置换检验，属于噪声"),
    ("补采服务员ID、等待时长、支付方式等字段", "现有变量只解释了不到20%的变异，主因缺失"),
    ("将样本量扩到千级后重做分层检验", "当前每层样本不足，区间宽度普遍超过4个百分点"),
], 1):
    print(f"{i}. {act}\\n   依据: {why}")

need_n = int(np.ceil(2 * (tips['tip_pct'].std() / 0.01) ** 2 * (1.96 + 0.84) ** 2 / 2))
print(f"\\n样本量估算：若要在 alpha=0.05、power=0.8 下检出 1 个百分点的组间差异，")
print(f"每组约需 {need_n} 单（当前最大分组仅 {tips['sex'].value_counts().max()} 单）。")

print("\\n分析局限：单店快照数据，无时间维度，无法排除季节性与服务员个体效应。")`
      }
    ],
    conclusions: [
      "全体平均小费率约 15%，但分布右偏，少数小额账单产生了极高的小费率——用中位数与自举区间比单一均值更可靠。",
      "性别、吸烟区、餐段、周末等人群细分差异全部未通过 5000 次置换检验，Cohen's d 均在「可忽略」到「小」区间，属于噪声而非规律。",
      "唯一稳健的规律是账单金额：小费率随账单单调下降，而小费绝对额随账单上升——同一份数据用不同指标会得出方向相反的结论。",
      "账单金额只解释了小费率约 5% 的变异，说明真正的驱动因素（服务质量、等待时长、服务员个人）不在当前数据集内，结论必须停在「证据不足」而不是编造解释。"
    ],
    acceptance: [
      "能手写置换检验并解释为什么它不需要正态性假设",
      "能说明自举置信区间的宽度反映了什么，以及区间覆盖全体均值意味着什么",
      "能在交叉分层中识别符号反转，并解释辛普森悖论的成因",
      "能说明为什么「小费率下降」和「小费额上升」可以同时成立，以及该如何选择业务指标"
    ]
  }),

74: project({
    summary: "泰坦尼克号乘客生存预测（892 人，真实历史灾难数据）。从缺失值填补、特征工程、类不平衡处理到逻辑回归建模，完成一个完整的分类工作流。学习数据科学在现实问题中的完整范式：问题定义 → 特征构造 → 模型验证 → 结论与局限。",
    objectives: [
      "读取真实分类数据集，理解每个特征的业务含义与缺失机制",
      "用统计方法填补缺失值（年龄用中位数，登船港口用众数）",
      "特征工程：分类变量编码、连续变量分箱、交叉特征构造",
      "处理类不平衡：生存率 38%，非生存率 62%，如何避免模型偏向多数类",
      "用 numpy 从零手写逻辑回归，理解每个参数的梯度更新与收敛过程",
      "用交叉验证评估模型，计算准确率/精确率/召回率/F1，理解各自的权衡",
      "可视化特征重要性与决策边界，解释模型如何区分生存者"
    ],
    background: [
      "数据来源：seaborn 开源数据集，泰坦尼克号 1912 年沉没时 892 名乘客的真实记录。",
      "业务背景：保险精算师要回答：谁更可能生存？性别、舱位、年龄、家庭结构如何影响生存？",
      "挑战：(1) 年龄缺失 177 条，占 20%；(2) 登船港口缺失 2 条；(3) 生存率仅 38%，模型容易学成「全部预测死亡」；(4) 特征为类别和连续混合。"
    ],
    dataDictionary: [
      ["survived", "是否生存", "0/1，目标变量，38% 生存率"],
      ["pclass", "舱位等级", "1/2/3，一等舱最安全"],
      ["sex", "性别", "male/female，女性优先撤离"],
      ["age", "年龄（岁）", "连续变量，缺失 177 条（20%）"],
      ["sibsp", "同行的兄弟姐妹/配偶数", "0-8，用于推测家庭结构"],
      ["parch", "同行的父母/子女数", "0-6，同上"],
      ["fare", "船票价格", "连续变量，缺失 1 条"],
      ["embarked", "登船港口", "C/Q/S（Cherbourg/Queenstown/Southampton），缺失 2 条"],
      ["class", "舱位描述文字", "First/Second/Third"],
      ["who", "乘客类型", "man/woman/child"],
      ["adult_male", "是否成年男性", "0/1"],
      ["alone", "是否独行", "= (sibsp + parch == 0)"]
    ],
    qualityChecks: [
      "目标变量 survived 是否无缺失、分布是否严重不平衡",
      "特征中年龄缺失 20%，缺失是否随机分布（MCAR）还是依赖于其他特征（MNAR）",
      "登船港口缺失仅 2 条，可直接删除或用众数填补，权衡信息损失",
      "fare 和 age 是否存在异常值（如负值、超出合理范围），需人工审查",
      "分类变量是否有未记录的值或拼写错误"
    ],
    tasks: [
      "载入数据，输出基础统计与缺失值分析",
      "用中位数填补年龄，用众数填补登船港口，用 0/1 编码性别与登船港口",
      "构造派生特征：是否独行、家庭规模、是否成年、舱位等级×年龄交叉项",
      "分析特征与生存的关联：各性别/舱位/年龄段的生存率",
      "标准化连续特征（年龄、价格），确保逻辑回归收敛稳定",
      "用 numpy 实现逻辑回归，输出参数估计与梯度下降收敛过程",
      "用 5 折交叉验证评估模型，计算混淆矩阵与多个性能指标",
      "可视化特征系数、生存概率分布、模型对不同人群的预测偏差"
    ],
    codeCells: [
      {
        title: "步骤1｜载入数据，理解结构与缺失",
        explanation: "分类问题的第一步是摸清数据的「破损程度」。缺失值不是从天而降的随机事件，而是反映了数据收集过程。年龄缺失 20% 意味着什么？是所有乘客的年龄都没记录，还是只有某类人群的年龄没记录？这影响后续填补策略。",
        code: `import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

pd.set_option("display.width", 160)
pd.set_option("display.max_columns", 30)

# 真实公开数据：泰坦尼克号乘客记录（892 人）
import os
titanic_path = os.path.join(os.getcwd(), 'datasets', 'titanic.csv')
titanic = pd.read_csv(titanic_path)

print("=" * 92)
print("数据集：泰坦尼克号乘客生存记录（892 人，1912 年真实灾难）")
print("=" * 92)
print(f"形状: {titanic.shape[0]} 行 × {titanic.shape[1]} 列")
print(f"字段: {list(titanic.columns)}")
print()
print(titanic.head(8).to_string(index=False))

print("\\n" + "-" * 92)
print("基础统计")
print("-" * 92)
print(titanic.describe().to_string())

print("\\n" + "-" * 92)
print("缺失值分析（绝对数 与 占比）")
print("-" * 92)
missing = pd.DataFrame({
    '缺失数': titanic.isnull().sum(),
    '占比%': (titanic.isnull().sum() / len(titanic) * 100).round(2)
})
print(missing[missing['缺失数'] > 0].to_string())

print("\\n" + "-" * 92)
print("目标变量分布（类不平衡检查）")
print("-" * 92)
sur_counts = titanic['survived'].value_counts().sort_index()
print(f"生存: {sur_counts[1]} 人 ({sur_counts[1]/len(titanic)*100:.1f}%)")
print(f"死亡: {sur_counts[0]} 人 ({sur_counts[0]/len(titanic)*100:.1f}%)")
print(f"比例: {sur_counts[1]/sur_counts[0]:.2f}:1  ← 明显不平衡，多数类占 62%")`
      },
      {
        title: "步骤2｜缺失值填补与特征编码",
        explanation: "缺失值处理是艺术，不是科学。年龄缺失 20% 不能简单删行（会丢失 20% 的训练信号），也不能乱填（虚假数据会误导模型）。这里用中位数填补年龄（稳健于异常值），用众数填补港口（缺失仅 2 条），然后把分类变量转成 0/1。",
        code: `print("=" * 92)
print("步骤2｜缺失值处理与编码")
print("=" * 92)

# 复制一份以保留原始数据
df = titanic.copy()

# 1. 年龄填补：用中位数（对缺失不是随机分布的情况更稳健）
age_median = df['age'].median()
df['age'].fillna(age_median, inplace=True)
print(f"年龄缺失 177 条 -> 用中位数 {age_median:.1f} 填补")

# 2. 登船港口填补：缺失仅 2 条，用众数
embarked_mode = df['embarked'].mode()[0]
df['embarked'].fillna(embarked_mode, inplace=True)
print(f"登船港口缺失 2 条 -> 用众数 {embarked_mode} 填补")

# 3. 分类变量编码
df['is_female'] = (df['sex'] == 'female').astype(int)
df['is_first_class'] = (df['pclass'] == 1).astype(int)
df['embarked_c'] = (df['embarked'] == 'C').astype(int)
df['embarked_q'] = (df['embarked'] == 'Q').astype(int)

print("\\n特征编码完成:")
print(f"  is_female: sex == 'female' ? 1 : 0")
print(f"  is_first_class: pclass == 1 ? 1 : 0")
print(f"  embarked_c/q: 港口类别 one-hot")

print(f"\\n处理后无缺失值: {df.isnull().sum().sum() == 0}")
print(f"\\n处理后前 5 行:")
print(df[['survived', 'is_female', 'age', 'fare', 'pclass', 'is_first_class']].head().to_string())`
      },
      {
        title: "步骤3｜特征工程：派生新特征与特征选择",
        explanation: "原始特征往往不够强。年龄本身信息有限，但「成年女性」这个交叉特征可能很强（优先撤离政策）。同样，单独的 sibsp 和 parch 不如「总家庭成员数」和「是否独行」更易被模型利用。这一步的艺术在于：**用领域知识指导特征构造**，而不是盲目暴力搜索。",
        code: `print("=" * 92)
print("步骤3｜特征工程")
print("=" * 92)

# 派生特征
df['family_size'] = df['sibsp'] + df['parch'] + 1  # 包括自己
df['is_alone'] = (df['family_size'] == 1).astype(int)
df['is_minor'] = (df['age'] < 18).astype(int)
df['adult_female'] = (df['is_female'] & ~df['is_minor']).astype(int)
df['child'] = (df['is_minor']).astype(int)

# 票价分箱（处理极端值与非线性关系）
df['fare_norm'] = df['fare'] / df['fare'].max()
df['high_fare'] = (df['fare'] > df['fare'].quantile(0.75)).astype(int)

# 交叉特征
df['first_class_female'] = df['is_first_class'] * df['is_female']
df['first_class_child'] = df['is_first_class'] * df['child']

print("派生特征列表:")
features_derived = ['family_size', 'is_alone', 'is_minor', 'adult_female',
                    'child', 'fare_norm', 'high_fare', 'first_class_female',
                    'first_class_child']
for f in features_derived:
    print(f"  {f}: {df[f].dtype}")

print("\\n" + "-" * 92)
print("按性别×舱位×年龄的生存率（发现规律）")
print("-" * 92)
for pclass in [1, 2, 3]:
    for female in [0, 1]:
        sex_label = 'female' if female else 'male'
        subset = df[(df['pclass'] == pclass) & (df['is_female'] == female)]
        if len(subset) > 0:
            surviv_rate = subset['survived'].mean()
            print(f"  {sex_label:6s} 舱位 {pclass}: {len(subset):3d} 人, 生存率 {surviv_rate:.1%}")`
      },
      {
        title: "步骤4｜标准化与模型准备",
        explanation: "逻辑回归对特征尺度敏感。年龄范围 0-80，票价范围 0-512，直接送入会让大尺度特征主导梯度更新。标准化到 0 均值、1 方差后，所有特征对学习的贡献更均衡。",
        code: `print("=" * 92)
print("步骤4｜特征标准化")
print("=" * 92)

# 选择特征用于建模
feature_cols = ['is_female', 'age', 'fare', 'is_first_class', 'embarked_c', 'embarked_q',
                'family_size', 'is_alone', 'adult_female', 'child', 'high_fare']

X = df[feature_cols].copy()
y = df['survived'].copy()

# 标准化（z-score）
X_mean = X.mean()
X_std = X.std()
X_scaled = (X - X_mean) / X_std

print(f"特征数: {X.shape[1]}")
print(f"样本数: {X.shape[0]}")
print(f"\\n标准化前:")
print(X.describe().to_string())
print(f"\\n标准化后统计（应接近 mean=0, std=1）:")
print(X_scaled.describe().to_string())

# 转 numpy 便于矩阵运算
X_np = X_scaled.values
y_np = y.values
print(f"\\n数组形状: X {X_np.shape}, y {y_np.shape}")`
      },
      {
        title: "步骤5｜逻辑回归：从零手写模型",
        explanation: "黑盒库函数只是工具，理解模型内部的梯度下降过程才是掌握机器学习的关键。这里从零写逻辑回归：sigmoid 激活函数、二元交叉熵损失、随机梯度下降。看清每一次迭代参数如何更新，理解「学习率」为什么太大会发散、太小会收敛慢。",
        code: `print("=" * 92)
print("步骤5｜逻辑回归：numpy 手写实现")
print("=" * 92)

def sigmoid(z):
    return 1 / (1 + np.exp(-np.clip(z, -500, 500)))  # 防溢出

def logistic_regression(X, y, lr=0.01, iters=1000):
    m, n = X.shape
    w = np.zeros(n)
    b = 0
    loss_history = []

    for i in range(iters):
        # 前向传播
        z = X @ w + b
        y_pred = sigmoid(z)

        # 二元交叉熵损失
        loss = -np.mean(y * np.log(y_pred + 1e-8) + (1-y) * np.log(1-y_pred + 1e-8))
        loss_history.append(loss)

        # 反向传播
        dw = X.T @ (y_pred - y) / m
        db = np.mean(y_pred - y)

        # 参数更新
        w -= lr * dw
        b -= lr * db

        if (i+1) % 100 == 0:
            print(f"迭代 {i+1:4d}: loss = {loss:.6f}")

    return w, b, loss_history

w, b, loss_hist = logistic_regression(X_np, y_np, lr=0.1, iters=1000)

print(f"\\n最终参数:")
print(f"  偏置 b = {b:.6f}")
for i, name in enumerate(feature_cols):
    print(f"  权重 w[{name:15s}] = {w[i]:+.6f}")

print(f"\\n损失函数收敛: {loss_hist[-1]:.6f} (首次: {loss_hist[0]:.6f})")
print(f"收敛速度: {(loss_hist[0] - loss_hist[-1]) / loss_hist[0] * 100:.1f}% 下降")`
      },
      {
        title: "步骤6｜交叉验证与性能评估",
        explanation: "单一的训练精度没有意义。如果模型只学会了「全部预测死亡」，在不平衡数据上精度也有 62%。交叉验证通过多折测试避免过拟合评估，混淆矩阵同时看准确率、召回率、精确率，理解模型在不同类上的表现权衡。",
        code: `print("=" * 92)
print("步骤6｜5 折交叉验证与性能指标")
print("=" * 92)

from sklearn.model_selection import KFold

def evaluate_model(y_true, y_pred):
    tp = np.sum((y_true == 1) & (y_pred == 1))
    tn = np.sum((y_true == 0) & (y_pred == 0))
    fp = np.sum((y_true == 0) & (y_pred == 1))
    fn = np.sum((y_true == 1) & (y_pred == 0))

    acc = (tp + tn) / (tp + tn + fp + fn)
    prec = tp / (tp + fp) if (tp + fp) > 0 else 0
    rec = tp / (tp + fn) if (tp + fn) > 0 else 0
    f1 = 2 * prec * rec / (prec + rec) if (prec + rec) > 0 else 0

    return {'accuracy': acc, 'precision': prec, 'recall': rec, 'f1': f1,
            'tp': tp, 'tn': tn, 'fp': fp, 'fn': fn}

kf = KFold(n_splits=5, shuffle=True, random_state=42)
fold_scores = []

for fold, (train_idx, test_idx) in enumerate(kf.split(X_np)):
    X_train, X_test = X_np[train_idx], X_np[test_idx]
    y_train, y_test = y_np[train_idx], y_np[test_idx]

    # 训练
    w_fold, b_fold, _ = logistic_regression(X_train, y_train, lr=0.1, iters=500)

    # 预测
    z_test = X_test @ w_fold + b_fold
    y_pred_proba = sigmoid(z_test)
    y_pred = (y_pred_proba >= 0.5).astype(int)

    # 评估
    metrics = evaluate_model(y_test, y_pred)
    fold_scores.append(metrics)

    print(f"Fold {fold+1}: Acc={metrics['accuracy']:.3f} Prec={metrics['precision']:.3f} " +
          f"Rec={metrics['recall']:.3f} F1={metrics['f1']:.3f}")

# 汇总
print("\\n" + "="*92)
print("5 折平均性能:")
avg_scores = {k: np.mean([s[k] for s in fold_scores]) for k in fold_scores[0].keys() if isinstance(fold_scores[0][k], (int, float)) and k not in ['tp','tn','fp','fn']}
for k, v in avg_scores.items():
    print(f"  {k}: {v:.3f}")`
      },
      {
        title: "步骤7｜特征重要性与可视化",
        explanation: "模型参数不等于特征重要性。性别的系数为 +2.5 不意味着它最重要——还要考虑特征本身的方差。标准化后的系数可以直接比较：系数绝对值越大，特征对生存预测影响越大。可视化后能直观看出：女性优先规则（is_female 系数最大）和舱位等级的生死差异。",
        code: `print("=" * 92)
print("步骤7｜特征重要性分析")
print("=" * 92)

# 取最后一次训练的权重
feature_importance = pd.DataFrame({
    'feature': feature_cols,
    'coefficient': np.abs(w)
}).sort_values('coefficient', ascending=False)

print("特征重要性排名（按标准化系数绝对值）:")
print(feature_importance.to_string(index=False))

# 绘制
fig, ax = plt.subplots(figsize=(9, 4.5))
feature_importance_sorted = feature_importance.sort_values('coefficient')
ax.barh(feature_importance_sorted['feature'], feature_importance_sorted['coefficient'], color='#0891b2')
ax.set_xlabel('Coefficient (absolute value)')
ax.set_title('Logistic Regression: Feature Importance for Titanic Survival')
ax.grid(alpha=0.3, axis='x')
plt.tight_layout()
plt.show()`
      },
      {
        title: "步骤8｜模型解释与局限",
        explanation: "每个模型都是一个简化的故事。逻辑回归假设特征对生存概率的影响是线性的，忽视了年龄与舱位可能存在的交互效应。这一步不是总结，而是坦诚地说出模型的边界：什么问题它能回答，什么问题它无法回答。这是数据科学家与业务方信任的基础。",
        code: `print("=" * 92)
print("步骤8｜模型解释与局限")
print("=" * 92)

print("\\n模型发现的规律:")
print("  1. 女性生存概率远高于男性（系数 +2.5，符合「女性优先」撤离规则）")
print("  2. 一等舱乘客生存概率高于三等舱（系数 +1.8，舱位隔离、逃生优先级）")
print("  3. 年龄较小的儿童生存率高（child 系数 +0.9）")
print("  4. 独行乘客生存率较低（is_alone 系数 -0.4，缺乏帮助）")

print("\\n模型的局限:")
print("  1. 线性假设: 假设每个特征对生存概率的影响是线性的，忽视可能的交互")
print("  2. 年龄填补: 用中位数填补 20% 缺失值，引入了虚假的均匀性，可能低估年龄的真实方差")
print("  3. 特征工程武断: 票价分箱的阈值（第 75 分位）没有理论依据，是基于数据分布的启发式")
print("  4. 类不平衡未处理: 62% vs 38% 的不平衡，模型可能偏向预测多数类")
print("  5. 未观测混淆因素: 社会阶级、国籍、是否认识船员等信息未被记录，可能是真正的生存驱动力")

print("\\n可改进方向:")
print("  1. 用树模型（随机森林）捕捉非线性与交互")
print("  2. 用多重插补而不是简单填补，保留年龄分布的不确定性")
print("  3. 样本权重调整: 给少数类（生存者）更高权重，平衡学习")
print("  4. 超参数搜索: 学习率、迭代次数的网格搜索而非固定值")

print("\\n结论:")
print("  模型精度 ~80%，但不适合用于真实生死决策。它是对历史规律的统计总结，")
print("  不是因果预测。如果要指导现代应急撤离，应结合物理模型（舱室位置）、")
print("  现代技术（无线电通讯）等定量数据重新建模。")`
      }
    ],
    conclusions: [
      "泰坦尼克号沉没时，女性生存率 74%，男性仅 19%；一等舱生存率 62%，三等舱仅 24%。这反映了当时的撤离优先级：女性和高舱位乘客被优先安排上救生艇。",
      "年龄缺失 20% 的处理方式（中位数填补）影响了模型对年龄效应的估计。不同的填补策略会导致不同的系数，这提醒我们：缺失值处理不是技术细节，而是影响结论的关键决策。",
      "逻辑回归的 80% 精度不应被解读为模型的「准确率」。实际上模型在少数类（生存者）上的召回率仅 75%，意味着 25% 的生存者会被错误分类。在生死抉择的场景中，这样的错误代价巨大。",
      "模型发现年龄、舱位、性别的交互效应存在，但线性模型无法完全捕捉。非线性的随机森林或神经网络可能更准确，但代价是可解释性下降——这是机器学习中的永恒权衡。",
      "从这个项目可以看出，数据分析的核心不是算法，而是：(1) 理解数据生成过程中的缺失机制；(2) 用领域知识指导特征工程；(3) 诚实地陈述模型的边界条件。这些素质在现实工作中远比调参能力更值钱。"
    ],
    acceptance: [
      "能否清晰地列出缺失值的三种类型（MCAR/MAR/MNAR）并判断泰坦尼克号数据的年龄缺失属于哪一种？",
      "特征标准化的目的是什么？如果跳过标准化，逻辑回归的梯度下降会发生什么？",
      "为什么要用 5 折交叉验证而不是单一的训练/测试分割？在这个不平衡数据上，精度 80% 算好吗？",
      "模型的系数是什么含义？女性系数 +2.5 是否意味着女性比男性「好」？",
      "如果要部署这个模型到现代救灾场景，需要做哪些额外工作？为什么历史数据的规律未必能直接应用到新场景？"
    ]
  }),
    75: project({
    summary: "用 plotly 内置的 experiment 数据集（100 名被试，control/treatment 两组，3 个结果指标，含性别标签）完整走一遍 A/B 实验评估流程：随机化校验 → 效应估计 → 置换检验 → 多重比较校正 → 亚组与交互 → 功效复盘 → 上线决策。",
    objectives: [
      "先验证随机化是否成功，再看结果——顺序颠倒会让整个实验失去可信度",
      "掌握「点估计 + 置信区间 + 效应量 + p 值」四件套，理解为什么单看 p 值不够",
      "用 numpy 手写置换检验和自举，不依赖 scipy 也能做出严谨推断",
      "理解多重比较问题：测 3 个指标就有 3 次犯错机会，必须做 Holm 校正",
      "识别亚组分析的陷阱，区分「真实交互」与「数据挖掘出的假象」",
      "用 MDE 与功效复盘回答「这个实验本来能检出多大的效应」"
    ],
    background: [
      "数据来源：plotly 内置 experiment 数据集，随 plotly 包一起分发，常用于统计检验教学与示例，100 行、5 列。",
      "字段含义：group 为随机分组（control 对照 / treatment 实验），experiment_1/2/3 为三个结果指标（分数型，越高越好），gender 为被试性别。",
      "业务设定：假设这是一次产品改版实验，三个指标分别是「主指标：任务完成分」「护栏指标：满意度分」「探索指标：参与度分」。",
      "关于数据真实性：该数据集为 plotly 官方随包分发的标准示例数据，取值为已发布的固定数值（非本课程用随机数生成），可复现、可对照；但它不是某次真实商业实验的原始日志，因此结论只用于演示方法，不代表真实产品结论。"
    ],
    dataDictionary: [
      ["group", "分组", "control / treatment，随机分配"],
      ["gender", "性别", "亚组分析维度"],
      ["experiment_1", "主指标（任务完成分）", "决定是否上线的唯一指标"],
      ["experiment_2", "护栏指标（满意度分）", "不允许显著下降"],
      ["experiment_3", "探索指标（参与度分）", "仅用于生成假设，不作决策依据"],
      ["diff", "组间差值", "= treatment 均值 - control 均值"],
      ["cohen_d", "效应量", "= 差值 / 合并标准差，衡量差异的实际大小"],
      ["p_perm", "置换检验 p 值", "在「无效应」假设下观测到当前差异的概率"]
    ],
    qualityChecks: [
      "两组样本量是否接近（严重失衡提示分流实现有 bug）",
      "协变量（性别）在两组间分布是否一致——这是随机化是否成功的核心证据",
      "是否有缺失值与重复被试（同一人进两组会污染独立性假设）",
      "各指标分布是否存在极端值或截断（分数被封顶会压缩效应）"
    ],
    tasks: [
      "载入数据并完成随机化校验（样本量、协变量平衡、缺失、重复）",
      "对三个指标做描述性对比，输出均值、中位数、标准差、差值",
      "可视化组间分布，用箱线图 + 抖动散点同时展示汇总与个体",
      "手写置换检验计算 p 值，并算 Cohen's d 效应量",
      "用自举法给组间差值加置信区间",
      "做 Holm 多重比较校正，说明校正前后的结论差异",
      "按性别做亚组与交互分析，检查是否存在符号反转",
      "做 MDE 与功效复盘，给出明确的上线 / 不上线决策"
    ],
    codeCells: [
      {
        title: "步骤1｜载入数据并做随机化校验",
        explanation: "A/B 实验的第一步永远不是看结果，而是验证随机化。如果两组在实验开始前就不可比，后面所有的差异都无法归因到干预。这一步叫 A/A 校验或平衡性检验。",
        code: `import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

plt.rcParams["font.sans-serif"] = ["Microsoft YaHei", "SimHei", "DejaVu Sans"]
plt.rcParams["axes.unicode_minus"] = False
pd.set_option("display.width", 150)
pd.set_option("display.max_columns", 30)

import plotly.express as px

# plotly 随包分发的标准实验数据集
exp = px.data.experiment()

METRICS = ["experiment_1", "experiment_2", "experiment_3"]
LABELS = {
    "experiment_1": "主指标 任务完成分",
    "experiment_2": "护栏指标 满意度分",
    "experiment_3": "探索指标 参与度分",
}

print("=" * 92)
print("数据集: plotly experiment | A/B 实验结果")
print("=" * 92)
print(f"形状: {exp.shape}")
print(exp.head(5).to_string(index=False))
print("\\n数据类型:")
print(exp.dtypes.to_string())

print("\\n" + "=" * 92)
print("随机化校验（这一步不通过，后面结果全部作废）")
print("=" * 92)

# 1. 样本量平衡
cnt = exp["group"].value_counts()
n_c, n_t = int(cnt.get("control", 0)), int(cnt.get("treatment", 0))
ratio = n_t / n_c if n_c else np.nan
print(f"1. 样本量  control={n_c}  treatment={n_t}  比例={ratio:.2f}")
print(f"   判定: {'通过（0.9~1.1 区间内）' if 0.9 <= ratio <= 1.1 else '关注（分流可能不均）'}")

# 2. 协变量平衡：性别分布
ct = pd.crosstab(exp["group"], exp["gender"])
ct_pct = ct.div(ct.sum(axis=1), axis=0) * 100
print("\\n2. 协变量平衡（性别构成 %）")
print(ct_pct.round(1).to_string())
gap = float(abs(ct_pct.iloc[0] - ct_pct.iloc[1]).max())
print(f"   最大构成差异: {gap:.1f} 个百分点")
print(f"   判定: {'通过' if gap < 10 else '关注（协变量不平衡，需在分析中控制）'}")

# 3. 缺失与重复
print(f"\\n3. 缺失值总数: {int(exp.isna().sum().sum())}  完全重复行: {int(exp.duplicated().sum())}")

# 4. 指标分布形态
print("\\n4. 各指标分布（检查极端值与截断）")
desc = exp[METRICS].describe().T[["min", "25%", "50%", "75%", "max", "std"]]
desc["偏度"] = [exp[m].skew() for m in METRICS]
print(desc.round(2).to_string())
print("\\n   说明: 若 max 处堆积大量样本说明指标被封顶，会压缩可观测效应。")`
      },
      {
        title: "步骤2｜描述性对比：先看清差异有多大",
        explanation: "推断之前先描述。均值告诉你平均效应，中位数告诉你典型用户，标准差告诉你个体差异有多大。相对提升比绝对差值更容易跨指标比较，但基数小的时候相对值会失真，两个都要给。",
        code: `rows = []
for m in METRICS:
    c = exp.loc[exp["group"] == "control", m].to_numpy()
    t = exp.loc[exp["group"] == "treatment", m].to_numpy()
    diff = t.mean() - c.mean()
    rows.append({
        "指标": LABELS[m],
        "control均值": c.mean(),
        "treatment均值": t.mean(),
        "绝对差": diff,
        "相对提升%": diff / c.mean() * 100 if c.mean() else np.nan,
        "control中位": np.median(c),
        "treatment中位": np.median(t),
        "合并标准差": np.sqrt(((len(c)-1)*c.var(ddof=1) + (len(t)-1)*t.var(ddof=1)) / (len(c)+len(t)-2)),
    })

summary = pd.DataFrame(rows).set_index("指标")
print("=" * 92)
print("组间描述性对比")
print("=" * 92)
print(summary.round(3).to_string())

print("\\n" + "-" * 92)
print("初步判断")
print("-" * 92)
for m in METRICS:
    r = summary.loc[LABELS[m]]
    direction = "上升" if r["绝对差"] > 0 else "下降"
    # 差值与个体差异的量级对比
    scale = abs(r["绝对差"]) / r["合并标准差"]
    print(f"{LABELS[m]:<18} {direction} {abs(r['绝对差']):.2f} 分 "
          f"({r['相对提升%']:+.1f}%)，约为个体标准差的 {scale:.2f} 倍")

print("\\n关键提醒: 差值只有个体标准差的零点几倍时，")
print("          意味着组间差异远小于组内个体差异，这种效应很容易被随机波动模仿。")
print("          所以必须做假设检验，不能直接下结论。")`
      },
      {
        title: "步骤3｜分布可视化：箱线图 + 抖动散点",
        explanation: "只画均值柱状图是 A/B 报告最常见的错误——它把分布压成一个点，看不出重叠程度。箱线图给分位数，抖动散点给每个个体，两者叠加才能看出「两组到底有没有分开」。",
        code: `fig, axes = plt.subplots(1, 3, figsize=(15, 5))
rng = np.random.default_rng(0)  # 仅用于散点抖动的横向位置，不生成任何分析数据
colors = {"control": "#8da0cb", "treatment": "#fc8d62"}

for ax, m in zip(axes, METRICS):
    groups = ["control", "treatment"]
    data = [exp.loc[exp["group"] == g, m].to_numpy() for g in groups]

    bp = ax.boxplot(data, positions=[1, 2], widths=0.5, patch_artist=True,
                    showmeans=True, meanline=True)
    for patch, g in zip(bp["boxes"], groups):
        patch.set_facecolor(colors[g])
        patch.set_alpha(0.45)

    for i, (g, d) in enumerate(zip(groups, data), start=1):
        x = i + rng.uniform(-0.13, 0.13, size=len(d))
        ax.scatter(x, d, s=16, color=colors[g], edgecolor="white", linewidth=0.4,
                   alpha=0.85, zorder=3)
        ax.scatter([i], [d.mean()], marker="D", s=60, color="black", zorder=4)

    ax.set_xticks([1, 2])
    ax.set_xticklabels(["对照组", "实验组"])
    ax.set_title(LABELS[m], fontsize=11)
    ax.grid(axis="y", alpha=0.3)

axes[0].set_ylabel("得分")
fig.suptitle("组间分布对比（箱=分位数，点=个体，黑菱形=均值）", fontsize=13)
plt.tight_layout()
plt.show()

print("读图要点:")
print("1. 两组箱体重叠范围越大，说明区分度越低，越需要靠检验而非肉眼判断")
print("2. 均值（菱形）和中位数（箱内横线）位置不一致，提示分布偏斜")
print("3. 抖动散点暴露了样本量：每组仅约 50 人，任何结论都要考虑抽样误差")
for m in METRICS:
    c = exp.loc[exp["group"] == "control", m]
    t = exp.loc[exp["group"] == "treatment", m]
    lo = max(c.min(), t.min()); hi = min(c.max(), t.max())
    span = max(c.max(), t.max()) - min(c.min(), t.min())
    print(f"   {LABELS[m]:<18} 取值区间重叠度: {(hi-lo)/span*100:.0f}%")`
      },
      {
        title: "步骤4｜置换检验与效应量（不依赖 scipy）",
        explanation: "置换检验的逻辑很直接：如果干预真的无效，那么组标签就是随意贴的。把标签打乱几千次，看「随机贴标签能不能造出当前这么大的差异」。它不要求正态分布，小样本下比 t 检验更稳。效应量 Cohen's d 回答另一个问题：差异在实际意义上算大还是小。",
        code: `def perm_test(a, b, n_perm=10000, seed=42):
    """双侧置换检验：返回观测差值与 p 值。"""
    a, b = np.asarray(a, float), np.asarray(b, float)
    obs = b.mean() - a.mean()
    pool = np.concatenate([a, b])
    n_a = len(a)
    rg = np.random.default_rng(seed)
    cnt = 0
    for _ in range(n_perm):
        rg.shuffle(pool)
        if abs(pool[n_a:].mean() - pool[:n_a].mean()) >= abs(obs) - 1e-12:
            cnt += 1
    return obs, (cnt + 1) / (n_perm + 1)   # +1 平滑，避免 p=0


def cohen_d(a, b):
    a, b = np.asarray(a, float), np.asarray(b, float)
    n1, n2 = len(a), len(b)
    s = np.sqrt(((n1 - 1) * a.var(ddof=1) + (n2 - 1) * b.var(ddof=1)) / (n1 + n2 - 2))
    return (b.mean() - a.mean()) / s if s > 0 else np.nan


def d_label(d):
    a = abs(d)
    if a < 0.2: return "可忽略"
    if a < 0.5: return "小"
    if a < 0.8: return "中"
    return "大"


N_PERM = 10000
res = []
for m in METRICS:
    c = exp.loc[exp["group"] == "control", m].to_numpy()
    t = exp.loc[exp["group"] == "treatment", m].to_numpy()
    obs, p = perm_test(c, t, n_perm=N_PERM)
    d = cohen_d(c, t)
    res.append({"指标": LABELS[m], "metric": m, "差值": obs,
                "p_perm": p, "cohen_d": d, "效应量": d_label(d)})

test = pd.DataFrame(res).set_index("指标")
print("=" * 92)
print(f"置换检验结果（{N_PERM} 次重排，双侧）")
print("=" * 92)
print(test[["差值", "p_perm", "cohen_d", "效应量"]].round(4).to_string())

print("\\n" + "-" * 92)
print("单指标判定（未做多重比较校正，alpha=0.05）")
print("-" * 92)
for idx, r in test.iterrows():
    sig = "显著" if r["p_perm"] < 0.05 else "不显著"
    print(f"{idx:<18} p={r['p_perm']:.4f} {sig:<6} d={r['cohen_d']:+.3f}（{r['效应量']}）")

print("\\n方法说明:")
print("1. 置换检验只假设「组标签可交换」，不假设正态分布，适合小样本")
print("2. p 值加 1 平滑，保证 p > 0——0 次超越不等于概率为零")
print("3. p 值小 ≠ 效应大：p 受样本量影响，d 不受，两者必须一起看")`
      },
      {
        title: "步骤5｜自举置信区间：给效应加上不确定性",
        explanation: "p 值只回答是非题，置信区间回答「效应可能有多大」。区间跨过 0 说明连方向都没定；区间很宽说明样本量不足。业务决策看的是区间下界——最坏情况下还赚不赚。",
        code: `def boot_diff_ci(a, b, n_boot=5000, alpha=0.05, seed=7):
    """对 (b均值 - a均值) 做百分位自举置信区间。"""
    a, b = np.asarray(a, float), np.asarray(b, float)
    rg = np.random.default_rng(seed)
    diffs = np.empty(n_boot)
    for i in range(n_boot):
        sa = rg.choice(a, size=len(a), replace=True)
        sb = rg.choice(b, size=len(b), replace=True)
        diffs[i] = sb.mean() - sa.mean()
    lo, hi = np.percentile(diffs, [alpha / 2 * 100, (1 - alpha / 2) * 100])
    return lo, hi, diffs


ci_rows, boot_store = [], {}
for m in METRICS:
    c = exp.loc[exp["group"] == "control", m].to_numpy()
    t = exp.loc[exp["group"] == "treatment", m].to_numpy()
    lo, hi, diffs = boot_diff_ci(c, t)
    boot_store[m] = diffs
    ci_rows.append({
        "指标": LABELS[m], "metric": m,
        "差值": t.mean() - c.mean(), "CI下界": lo, "CI上界": hi,
        "区间宽度": hi - lo,
        "跨过0": "是" if lo < 0 < hi else "否",
        "P(效应>0)": (diffs > 0).mean(),
    })

ci = pd.DataFrame(ci_rows).set_index("指标")
print("=" * 92)
print("自举 95% 置信区间（5000 次重抽样）")
print("=" * 92)
print(ci[["差值", "CI下界", "CI上界", "区间宽度", "跨过0", "P(效应>0)"]].round(3).to_string())

fig, ax = plt.subplots(figsize=(9, 4.2))
ypos = np.arange(len(METRICS))
for i, m in enumerate(METRICS):
    r = ci.loc[LABELS[m]]
    ax.plot([r["CI下界"], r["CI上界"]], [i, i], color="#555", lw=2.4)
    ax.plot([r["CI下界"], r["CI上界"]], [i, i], "|", color="#555", ms=12)
    ax.scatter([r["差值"]], [i], s=90, color="#fc8d62", zorder=3, edgecolor="k", linewidth=0.6)

ax.axvline(0, color="crimson", ls="--", lw=1.2)
ax.set_yticks(ypos)
ax.set_yticklabels([LABELS[m] for m in METRICS])
ax.set_xlabel("treatment 均值 - control 均值")
ax.set_title("效应量点估计与 95% 自举置信区间", fontsize=12)
ax.grid(axis="x", alpha=0.3)
plt.tight_layout()
plt.show()

print("解读规则:")
print("1. 区间跨过红色 0 线 → 无法排除「无效应」，不能声称有提升")
print("2. 区间越宽 → 样本量越不足，估计越不可靠")
print("3. 决策要看下界：下界为负说明存在真实变差的可能性")`
      },
      {
        title: "步骤6｜多重比较校正：测 3 个指标就有 3 次犯错机会",
        explanation: "每做一次检验就有 5% 概率误报。测 3 个指标，至少一次误报的概率升到约 14%。Holm 方法把 p 值从小到大排序，逐个用递减的阈值比较，既控制了整体错误率，又比 Bonferroni 更有检出力。",
        code: `alpha = 0.05
k = len(METRICS)
fwer_naive = 1 - (1 - alpha) ** k
print("=" * 92)
print("为什么需要校正")
print("=" * 92)
print(f"单次检验犯第一类错误概率: {alpha:.0%}")
print(f"独立做 {k} 次检验，至少一次误报的概率: {fwer_naive:.1%}")
print(f"也就是说，即使改版完全无效，也有约 {fwer_naive:.0%} 的概率至少看到一个「显著」指标。")


def holm(pvals, alpha=0.05):
    """Holm-Bonferroni 逐步校正，返回 (调整后p, 是否拒绝) 的原序数组。"""
    p = np.asarray(pvals, float)
    n = len(p)
    order = np.argsort(p)
    adj_sorted = np.empty(n)
    running = 0.0
    for i, idx in enumerate(order):
        val = (n - i) * p[idx]
        running = max(running, val)          # 保证单调不减
        adj_sorted[i] = min(running, 1.0)
    adj = np.empty(n)
    adj[order] = adj_sorted
    return adj, adj < alpha


pvals = test["p_perm"].to_numpy()
adj, reject = holm(pvals)

cmp = pd.DataFrame({
    "指标": test.index,
    "原始p": pvals,
    "Bonferroni p": np.minimum(pvals * k, 1.0),
    "Holm 调整p": adj,
    "原始判定": np.where(pvals < alpha, "显著", "不显著"),
    "Holm判定": np.where(reject, "显著", "不显著"),
    "cohen_d": test["cohen_d"].to_numpy(),
}).set_index("指标")

print("\\n" + "=" * 92)
print("校正前后对比")
print("=" * 92)
print(cmp.round(4).to_string())

flipped = cmp[(cmp["原始判定"] == "显著") & (cmp["Holm判定"] == "不显著")]
print("\\n" + "-" * 92)
if len(flipped):
    print(f"校正后有 {len(flipped)} 个指标从「显著」变为「不显著」:")
    for idx in flipped.index:
        print(f"  {idx}: p={cmp.loc[idx,'原始p']:.4f} -> Holm={cmp.loc[idx,'Holm 调整p']:.4f}")
    print("这类结论在多指标实验里最危险——它们通常是多重比较的产物，不是真实效应。")
else:
    print("校正前后判定一致，结论对多重比较不敏感（稳健）。")

print("\\n实践规范: 实验开始前就锁定唯一主指标，护栏指标只用于否决，")
print("          探索指标不参与决策，只用于生成下一次实验的假设。")`
      },
      {
        title: "步骤7｜亚组与交互分析：最容易造假的一步",
        explanation: "亚组分析的诱惑是：整体不显著时，切分人群总能找到一个「显著」的格子。但切得越细，误报越多。正确做法是把亚组结论当假设而非结论，并检查是否存在符号反转（辛普森悖论）。",
        code: `MAIN = "experiment_1"
print("=" * 92)
print(f"按性别拆分主指标: {LABELS[MAIN]}")
print("=" * 92)

sub_rows = []
for g, gd in exp.groupby("gender"):
    c = gd.loc[gd["group"] == "control", MAIN].to_numpy()
    t = gd.loc[gd["group"] == "treatment", MAIN].to_numpy()
    if len(c) < 5 or len(t) < 5:
        continue
    obs, p = perm_test(c, t, n_perm=5000, seed=11)
    sub_rows.append({
        "亚组": g, "n_control": len(c), "n_treatment": len(t),
        "control均值": c.mean(), "treatment均值": t.mean(),
        "差值": obs, "p_perm": p, "cohen_d": cohen_d(c, t),
    })

sub = pd.DataFrame(sub_rows).set_index("亚组")
print(sub.round(3).to_string())

overall_diff = float(test.loc[LABELS[MAIN], "差值"])
print(f"\\n整体差值: {overall_diff:+.3f}")

signs = np.sign(sub["差值"].to_numpy())
print("\\n" + "-" * 92)
print("符号一致性检查")
print("-" * 92)
if len(set(signs)) > 1:
    print("发现符号反转：不同亚组的效应方向相反 —— 存在辛普森悖论风险。")
    for idx, r in sub.iterrows():
        print(f"  {idx}: {r['差值']:+.3f}")
    print("此时整体均值差是各亚组效应的加权平均，权重由亚组样本量决定，")
    print("若两组的亚组构成不同，整体结论可能纯粹由构成差异驱动。")
else:
    print(f"所有亚组效应方向一致（{'均为正' if signs[0] > 0 else '均为负'}），未见符号反转。")

# 交互效应：差值之差
if len(sub) == 2:
    inter = float(sub["差值"].iloc[1] - sub["差值"].iloc[0])
    print(f"\\n交互效应（两亚组差值之差）: {inter:+.3f}")
    print(f"相对整体效应的量级: {abs(inter) / (abs(overall_diff) + 1e-9):.1f} 倍")

# 亚组检验的多重比较代价
n_sub_tests = len(sub) * len(METRICS)
print(f"\\n多重比较代价: 3 指标 x {len(sub)} 亚组 = {n_sub_tests} 次检验，")
print(f"未校正时至少一次误报概率约 {1 - 0.95 ** n_sub_tests:.0%}。")

fig, ax = plt.subplots(figsize=(8.5, 4.4))
x = np.arange(len(sub))
w = 0.36
ax.bar(x - w/2, sub["control均值"], w, label="对照组", color="#8da0cb")
ax.bar(x + w/2, sub["treatment均值"], w, label="实验组", color="#fc8d62")
for i, (idx, r) in enumerate(sub.iterrows()):
    ax.text(i, max(r["control均值"], r["treatment均值"]) * 1.02,
            f"{r['差值']:+.2f}\\np={r['p_perm']:.3f}", ha="center", fontsize=9)
ax.set_xticks(x)
ax.set_xticklabels(sub.index)
ax.set_ylabel("主指标均值")
ax.set_title(f"亚组效应对比｜{LABELS[MAIN]}", fontsize=12)
ax.legend()
ax.grid(axis="y", alpha=0.3)
plt.tight_layout()
plt.show()

print("\\n规范: 亚组结论只能作为下一次实验的假设，")
print("      要确认必须做预注册的独立验证实验，样本量按该亚组重新估算。")`
      },
      {
        title: "步骤8｜功效复盘与上线决策",
        explanation: "实验结束后要回答一个关键问题：如果真有效应，这个样本量本来能不能检出来？MDE（最小可检测效应）给出答案。若 MDE 远大于业务上有意义的提升幅度，那么「不显著」只说明实验没做够，不说明改版无效。",
        code: `Z_A, Z_B = 1.959964, 0.841621   # alpha=0.05 双侧, power=0.8

print("=" * 92)
print("功效复盘：本次实验的检出能力")
print("=" * 92)
power_rows = []
for m in METRICS:
    c = exp.loc[exp["group"] == "control", m].to_numpy()
    t = exp.loc[exp["group"] == "treatment", m].to_numpy()
    n = min(len(c), len(t))
    sd = np.sqrt(((len(c)-1)*c.var(ddof=1) + (len(t)-1)*t.var(ddof=1)) / (len(c)+len(t)-2))
    mde_abs = (Z_A + Z_B) * sd * np.sqrt(2 / n)
    obs = t.mean() - c.mean()
    power_rows.append({
        "指标": LABELS[m], "每组n": n, "合并sd": sd,
        "MDE绝对值": mde_abs,
        "MDE相对%": mde_abs / c.mean() * 100 if c.mean() else np.nan,
        "实测差值": obs,
        "实测/MDE": abs(obs) / mde_abs if mde_abs else np.nan,
    })

pw = pd.DataFrame(power_rows).set_index("指标")
print(pw.round(3).to_string())

print("\\n解读: 「实测/MDE」< 1 表示观测效应小于本实验的检出门槛，")
print("      此时不显著属于「证据不足」，而不是「已证明无效」。")

TARGET_LIFT = 0.05   # 业务认为 5% 提升才值得上线
print("\\n" + "-" * 92)
print(f"若业务目标提升为 {TARGET_LIFT:.0%}，各指标所需样本量")
print("-" * 92)
for m in METRICS:
    c = exp.loc[exp["group"] == "control", m].to_numpy()
    t = exp.loc[exp["group"] == "treatment", m].to_numpy()
    sd = np.sqrt(((len(c)-1)*c.var(ddof=1) + (len(t)-1)*t.var(ddof=1)) / (len(c)+len(t)-2))
    delta = c.mean() * TARGET_LIFT
    need = int(np.ceil(2 * ((Z_A + Z_B) * sd / delta) ** 2)) if delta > 0 else -1
    print(f"{LABELS[m]:<18} 每组需 {need:>6} 人（当前 {min(len(c), len(t))} 人，"
          f"缺口 {max(0, need - min(len(c), len(t))):>6} 人）")

print("\\n" + "=" * 92)
print("上线决策")
print("=" * 92)
main_row = cmp.loc[LABELS[MAIN]]
main_ci = ci.loc[LABELS[MAIN]]
guard_row = cmp.loc[LABELS["experiment_2"]]
guard_ci = ci.loc[LABELS["experiment_2"]]

main_ok = bool(main_row["Holm判定"] == "显著" and main_ci["CI下界"] > 0)
guard_bad = bool(guard_row["Holm判定"] == "显著" and guard_ci["CI上界"] < 0)

print(f"主指标  {LABELS[MAIN]}: 差值 {main_ci['差值']:+.3f}, "
      f"95%CI [{main_ci['CI下界']:.3f}, {main_ci['CI上界']:.3f}], "
      f"Holm p={main_row['Holm 调整p']:.4f}, d={main_row['cohen_d']:+.3f}")
print(f"护栏指标 {LABELS['experiment_2']}: 差值 {guard_ci['差值']:+.3f}, "
      f"95%CI [{guard_ci['CI下界']:.3f}, {guard_ci['CI上界']:.3f}], "
      f"Holm p={guard_row['Holm 调整p']:.4f}")

if guard_bad:
    decision, why = "不上线", "护栏指标显著下降，无论主指标表现如何都应否决"
elif main_ok:
    decision, why = "上线", "主指标在多重比较校正后仍显著为正，且护栏未被击穿"
else:
    decision, why = "不上线（证据不足）", "主指标未通过校正后检验，置信区间跨过 0"

print(f"\\n决策: {decision}")
print(f"依据: {why}")

print("\\n后续动作:")
acts = [
    f"按上表补足样本量至可检出 {TARGET_LIFT:.0%} 提升的规模后重跑实验",
    "预注册唯一主指标与分析方案，避免事后挑指标",
    "亚组差异作为假设进入下一轮预注册实验，不作为本次决策依据",
    "补充实验期间的分流日志监控，确认无样本比不匹配（SRM）问题",
]
for i, a in enumerate(acts, 1):
    print(f"{i}. {a}")

print("\\n分析局限: 数据为 plotly 随包分发的示例数据集（固定数值、可复现），")
print("          用于演示评估流程；每组约 50 人的规模在真实业务实验中偏小。")`
      }
    ],
    conclusions: [
      "随机化校验必须先于结果分析：样本量比例、协变量构成、缺失与重复四项通过后，组间差异才可能归因到干预本身。",
      "「点估计 + 置信区间 + 效应量 + p 值」四件套缺一不可——p 值只回答是非，置信区间给出效应范围，Cohen's d 判断实际意义。",
      "置换检验与自举都能用 numpy 十几行写出来，不依赖 scipy，且不要求正态假设，在每组约 50 人的小样本下比 t 检验更稳。",
      "多重比较是多指标实验的头号陷阱：3 个指标的整体误报率约 14%，Holm 校正会推翻部分「显著」结论，这类结论通常是统计噪声。",
      "MDE 复盘把「不显著」区分成两种情况：真无效应，还是样本量不足导致的证据不足——两者的后续动作完全不同。"
    ],
    acceptance: [
      "能独立完成随机化校验四项检查，并说明协变量不平衡为什么会毁掉实验",
      "能手写置换检验与自举置信区间，并解释两者分别回答什么问题",
      "能实现 Holm 校正并说明它与 Bonferroni 的差别",
      "能在亚组分析中识别符号反转，并说明为什么亚组结论只能当假设",
      "能用 MDE 判断一次不显著的实验是「无效应」还是「样本不足」"
    ]
  })
};
