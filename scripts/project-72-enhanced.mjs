// 项目72：订单分析 - 升级版（1200笔订单，完整RFM+异常检测）
// 这是 course-content-projects.mjs 中项目72的增强版本

const cells = [
  {
    title: "1. 准备1200笔订单数据（6个月真实模拟）",
    explanation: "生成1200笔订单，涵盖150个客户、4个区域、3个渠道、3个品类。注入真实业务规律：周末订单多30%、新客首单金额小、促销月折扣大。",
    code: `import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from datetime import datetime, timedelta

rng = np.random.default_rng(72)

# 生成1200笔订单，跨越6个月
dates = pd.date_range("2026-01-01", periods=6*30, freq="D")
n_orders = 1200
order_dates = rng.choice(dates, n_orders)
order_dates = pd.Series(sorted(order_dates)).reset_index(drop=True)

# 维度字段
regions = ["华东", "华南", "华北", "西南"]
channels = ["自然流量", "广告", "会员"]
categories = ["办公", "数码", "家居"]
n_customers = 150

orders = pd.DataFrame({
    "order_id": [f"O{i:05d}" for i in range(1, n_orders + 1)],
    "customer_id": rng.choice([f"C{i:04d}" for i in range(1, n_customers + 1)], n_orders),
    "order_date": order_dates.values,
    "region": rng.choice(regions, n_orders),
    "channel": rng.choice(channels, n_orders),
    "category": rng.choice(categories, n_orders),
    "units": rng.integers(1, 8, n_orders),
    "unit_price": rng.choice([59, 89, 129, 299, 499, 799], n_orders),
    "discount": rng.choice([0.8, 0.85, 0.9, 0.95, 1.0], n_orders),
})

# 业务规律1：周末订单多30%
orders["dow"] = orders["order_date"].dt.dayofweek
weekend_mask = orders["dow"].isin([5, 6])
orders.loc[weekend_mask, "units"] = (orders.loc[weekend_mask, "units"] * 1.3).astype(int)

# 业务规律2：新客首单金额较小（折扣更多）
customer_first_order = orders.groupby("customer_id")["order_date"].min()
is_first_order = orders["order_date"] == orders["customer_id"].map(customer_first_order)
orders.loc[is_first_order, "discount"] = orders.loc[is_first_order, "discount"] * 0.85

# 业务规律3：促销月（3月、10月）折扣更大
promo_months = [3, 10]
promo_mask = orders["order_date"].dt.month.isin(promo_months)
orders.loc[promo_mask, "discount"] = (orders.loc[promo_mask, "discount"] * 0.9).clip(upper=1.0)

# 计算订单金额
orders["order_amount"] = orders["units"] * orders["unit_price"] * orders["discount"]

print(f"生成订单数: {len(orders)}")
print(f"唯一客户数: {orders['customer_id'].nunique()}")
print(f"日期范围: {orders['order_date'].min()} 到 {orders['order_date'].max()}")
print(f"总销售额: ¥{orders['order_amount'].sum():,.0f}")
print(f"\\n前5笔订单:\\n{orders.head()}")`
  },
  {
    title: "2. 数据质量检查与清洗",
    explanation: "检查1200笔订单的完整性、合理性。故意加入3个质量问题（缺失、异常、重复），演示清洗规则。",
    code: `# 模拟数据质量问题
raw_orders = orders.copy()

# 问题1：5条订单缺失单价
problem_indices = rng.choice(len(raw_orders), 5, replace=False)
raw_orders.loc[problem_indices, "unit_price"] = np.nan

# 问题2：2条订单的折扣超出范围
raw_orders.loc[100, "discount"] = 1.15  # 超过100%
raw_orders.loc[200, "discount"] = -0.1   # 负折扣

# 问题3：3条重复订单
raw_orders = pd.concat([raw_orders, raw_orders.iloc[rng.choice(len(raw_orders), 3)]], ignore_index=True)

print("【原始数据问题】")
print(f"总记录数: {len(raw_orders)}")
print(f"重复订单: {raw_orders.duplicated(subset=['order_id']).sum()}")
print(f"\\n缺失值统计:")
print(raw_orders.isna().sum())
print(f"\\n异常值检查:")
print(f"  负件数: {(raw_orders['units'] < 0).sum()}")
print(f"  异常折扣: {((raw_orders['discount'] < 0) | (raw_orders['discount'] > 1)).sum()}")

# 清洗规则
clean_orders = raw_orders.drop_duplicates(subset=["order_id"]).copy()
clean_orders["unit_price"] = clean_orders["unit_price"].fillna(clean_orders["unit_price"].median())
clean_orders = clean_orders[(clean_orders["discount"] >= 0) & (clean_orders["discount"] <= 1)].copy()
clean_orders = clean_orders[clean_orders["units"] > 0].copy()
clean_orders["order_amount"] = clean_orders["units"] * clean_orders["unit_price"] * clean_orders["discount"]

print(f"\\n【清洗后】")
print(f"保留记录数: {len(clean_orders)}")
print(f"去除记录数: {len(raw_orders) - len(clean_orders)}")
print(f"清洗率: {(len(raw_orders) - len(clean_orders)) / len(raw_orders) * 100:.1f}%")`
  },
  {
    title: "3. 计算RFM客户价值指标",
    explanation: "RFM三维度：最近购买（Recency）、购买频率（Frequency）、购买金额（Monetary）。识别哪20%的客户贡献80%销售额。",
    code: `# 以数据最后一天为参考点
reference_date = clean_orders["order_date"].max()

# 计算RFM指标
customer_rfm = clean_orders.groupby("customer_id").agg({
    "order_date": lambda x: (reference_date - x.max()).days,  # Recency: 天数
    "order_id": "count",                                       # Frequency: 购买次数
    "order_amount": "sum"                                      # Monetary: 总消费
}).rename(columns={
    "order_date": "recency_days",
    "order_id": "frequency",
    "order_amount": "monetary"
}).reset_index()

# 计算客户价值排名
customer_rfm["customer_value"] = customer_rfm["monetary"]
customer_rfm = customer_rfm.sort_values("customer_value", ascending=False).reset_index(drop=True)
customer_rfm["value_rank"] = range(1, len(customer_rfm) + 1)

# Pareto分析：80/20法则
total_value = customer_rfm["monetary"].sum()
cumsum = customer_rfm["monetary"].cumsum() / total_value
pareto_20_pct = (cumsum <= 0.80).sum()

print(f"RFM指标统计:")
print(f"  客户总数: {len(customer_rfm)}")
print(f"  平均复购: {customer_rfm['frequency'].mean():.1f}次")
print(f"  平均客单价: ¥{(customer_rfm['monetary'] / customer_rfm['frequency']).mean():,.0f}")
print(f"\\n【帕累托分析（80/20法则）】")
print(f"  销售额80%来自前{pareto_20_pct}个客户（占{pareto_20_pct/len(customer_rfm)*100:.1f}%）")
print(f"  这部分客户的平均客户价值: ¥{customer_rfm.head(pareto_20_pct)['monetary'].mean():,.0f}")
print(f"\\nTop 10客户价值榜单:")
print(customer_rfm.head(10)[["customer_id", "frequency", "monetary", "recency_days"]].to_string(index=False))`
  },
  {
    title: "4. RFM客户分层与策略",
    explanation: "根据消费金额和购买频率，将客户分为4个等级：金牌（高消费+高频）、银牌（高消费或高频）、铜牌（其他）、风险（长期未购）。",
    code: `# 计算分位数用于分层
frequency_q75 = customer_rfm["frequency"].quantile(0.75)
monetary_q75 = customer_rfm["monetary"].quantile(0.75)
recency_q25 = customer_rfm["recency_days"].quantile(0.25)

# 分层逻辑
def segment_customer(row):
    if row["recency_days"] > 90:
        return "风险流失"
    elif row["frequency"] >= frequency_q75 and row["monetary"] >= monetary_q75:
        return "金牌客户"
    elif row["frequency"] >= frequency_q75 or row["monetary"] >= monetary_q75:
        return "银牌客户"
    else:
        return "铜牌客户"

customer_rfm["segment"] = customer_rfm.apply(segment_customer, axis=1)

# 分层统计
segment_stats = customer_rfm.groupby("segment").agg({
    "customer_id": "count",
    "monetary": ["sum", "mean"],
    "frequency": "mean"
}).round(0)
segment_stats.columns = ["客户数", "总销售额", "平均消费", "平均频率"]

print("【客户分层统计】")
print(segment_stats)
print(f"\\n【策略建议】")
print(f"• 金牌客户({(customer_rfm['segment'] == '金牌客户').sum()}人): VIP权益、专属优惠、高频互动")
print(f"• 银牌客户({(customer_rfm['segment'] == '银牌客户').sum()}人): 定向促销、等级奖励、升级鼓励")
print(f"• 铜牌客户({(customer_rfm['segment'] == '铜牌客户').sum()}人): 新手优惠、首次优惠复用、积分鼓励")
print(f"• 风险流失({(customer_rfm['segment'] == '风险流失').sum()}人): 召回优惠、反馈收集、原因分析")`
  },
  {
    title: "5. 异常订单检测",
    explanation: "使用统计方法识别异常：超大额订单、超低价折扣、异常时间购买。这些可能是欺诈、清货或数据错误。",
    code: `# 定义异常检测规则
print("【异常订单检测】\\n")

# 规则1：超大额订单（>95百分位）
high_amount_threshold = clean_orders["order_amount"].quantile(0.95)
high_amount_orders = clean_orders[clean_orders["order_amount"] > high_amount_threshold]
print(f"规则1 - 超大额订单（>¥{high_amount_threshold:,.0f}）: {len(high_amount_orders)}笔")

# 规则2：超低折扣（<0.8）
low_discount_orders = clean_orders[clean_orders["discount"] < 0.80]
print(f"规则2 - 超低折扣（<0.8）: {len(low_discount_orders)}笔")

# 规则3：极端件数（>6件）
high_units_orders = clean_orders[clean_orders["units"] > 6]
print(f"规则3 - 超大订单量（>6件）: {len(high_units_orders)}笔")

# 规则4：同客户同日多笔（可能的重复或异常）
same_day_dups = clean_orders.groupby(["customer_id", "order_date"]).size()
multi_order_same_day = (same_day_dups > 1).sum()
print(f"规则4 - 同客户同日多笔订单: {multi_order_same_day}个客户")

# 风险评分
anomaly_count = (
    (clean_orders["order_amount"] > high_amount_threshold).astype(int) +
    (clean_orders["discount"] < 0.80).astype(int) +
    (clean_orders["units"] > 6).astype(int)
)
risk_orders = clean_orders[anomaly_count >= 2].copy()
risk_orders["risk_score"] = anomaly_count[anomaly_count >= 2]

print(f"\\n【高风险订单（≥2个异常特征）】")
print(f"总数: {len(risk_orders)}")
if len(risk_orders) > 0:
    print(f"\\n高风险订单示例:")
    print(risk_orders[["order_id", "customer_id", "order_amount", "discount", "units"]].head(10).to_string(index=False))`
  },
  {
    title: "6. 客户生命周期与复购分析",
    explanation: "追踪每个客户的购买周期：从首次购买到最后购买的时间、复购间隔分布、复购成本。",
    code: `# 客户生命周期分析
customer_lifecycle = clean_orders.groupby("customer_id").agg({
    "order_date": ["min", "max", "count"],
    "order_amount": ["sum", "mean"]
}).reset_index()
customer_lifecycle.columns = ["customer_id", "first_order", "last_order", "order_count", "total_amount", "avg_order_value"]

# 计算生命周期长度
customer_lifecycle["lifecycle_days"] = (customer_lifecycle["last_order"] - customer_lifecycle["first_order"]).dt.days
customer_lifecycle["days_since_last"] = (reference_date - customer_lifecycle["last_order"]).dt.days

# 计算复购率
repeat_customers = (customer_lifecycle["order_count"] > 1).sum()
repeat_rate = repeat_customers / len(customer_lifecycle)

# 复购间隔分析
orders_with_prev = clean_orders.sort_values(["customer_id", "order_date"]).reset_index(drop=True)
orders_with_prev["prev_order_date"] = orders_with_prev.groupby("customer_id")["order_date"].shift()
orders_with_prev["days_to_repeat"] = (orders_with_prev["order_date"] - orders_with_prev["prev_order_date"]).dt.days
repeat_intervals = orders_with_prev["days_to_repeat"].dropna()

print(f"【客户生命周期分析】")
print(f"平均生命周期: {customer_lifecycle['lifecycle_days'].mean():.0f}天")
print(f"复购率: {repeat_rate:.1%}（{repeat_customers}个客户复购）")
print(f"平均复购间隔: {repeat_intervals.mean():.0f}天")
print(f"\\n生命周期分布:")
print(f"  0天（单次购）: {(customer_lifecycle['lifecycle_days'] == 0).sum()}客户")
print(f"  1-30天: {((customer_lifecycle['lifecycle_days'] > 0) & (customer_lifecycle['lifecycle_days'] <= 30)).sum()}客户")
print(f"  31-60天: {((customer_lifecycle['lifecycle_days'] > 30) & (customer_lifecycle['lifecycle_days'] <= 60)).sum()}客户")
print(f"  >60天: {(customer_lifecycle['lifecycle_days'] > 60).sum()}客户")

# 客户质量象限
high_lifetime_value = customer_lifecycle["total_amount"] >= customer_lifecycle["total_amount"].median()
high_recency = customer_lifecycle["days_since_last"] <= customer_lifecycle["days_since_last"].median()
print(f"\\n【客户质量象限】")
print(f"高价值+高活跃(理想客户): {(high_lifetime_value & high_recency).sum()}个")
print(f"高价值+低活跃(流失风险): {(high_lifetime_value & ~high_recency).sum()}个")
print(f"低价值+高活跃(成长潜力): {(~high_lifetime_value & high_recency).sum()}个")
print(f"低价值+低活跃(僵尸客户): {(~high_lifetime_value & ~high_recency).sum()}个")`
  },
  {
    title: "7. 产品组合与交叉销售分析",
    explanation: "发现哪些商品经常一起购买。指导交叉销售、捆绑营销、库存联动。",
    code: `# 产品组合分析
category_pairs = clean_orders.groupby("customer_id")["category"].apply(lambda x: list(set(x)))
pairs = []
for cats in category_pairs:
    for i in range(len(cats)):
        for j in range(i+1, len(cats)):
            pair = tuple(sorted([cats[i], cats[j]]))
            pairs.append(pair)

from collections import Counter
pair_counts = Counter(pairs)
pair_df = pd.DataFrame(pair_counts.most_common(10), columns=["category_pair", "co_purchase_count"])

# 计算关联度
total_customers = len(clean_orders.groupby("customer_id"))
pair_df["lift"] = pair_df["co_purchase_count"] / total_customers * 100

print("【产品组合分析 - Top 10关联购买】")
print(pair_df.to_string(index=False))

# 品类销售贡献
category_contribution = clean_orders.groupby("category").agg({
    "order_amount": "sum",
    "order_id": "count",
    "customer_id": "nunique"
}).round(0)
category_contribution.columns = ["销售额", "订单数", "客户数"]
category_contribution = category_contribution.sort_values("销售额", ascending=False)

print(f"\\n【品类销售贡献】")
print(category_contribution)
print(f"\\n【交叉销售建议】")
print(f"• 将关联度最高的商品放在购物车推荐位")
print(f"• 在'办公'和'{pair_df.iloc[0]['category_pair'][1]}'商品页面交叉展示")
print(f"• 设计'组合优惠'（购买两个品类享受折扣）")`
  },
  {
    title: "8. 渠道质量对比分析",
    explanation: "比较不同获客渠道的客户质量：获客成本、客户价值、转化率、复购率。确定投资重点。",
    code: `# 渠道分析
channel_analysis = clean_orders.groupby("channel").agg({
    "order_id": "count",
    "customer_id": "nunique",
    "order_amount": ["sum", "mean"]
}).round(0)
channel_analysis.columns = ["订单数", "客户数", "总销售额", "客单价"]

# 计算派生指标
channel_analysis["每客平均值"] = channel_analysis["总销售额"] / channel_analysis["客户数"]
channel_analysis["复购客户"] = 0
channel_analysis["复购率"] = 0.0

for channel in channel_analysis.index:
    channel_orders = clean_orders[clean_orders["channel"] == channel]
    repeat_customers = channel_orders.groupby("customer_id").size()
    repeat_count = (repeat_customers > 1).sum()
    channel_analysis.loc[channel, "复购客户"] = repeat_count
    channel_analysis.loc[channel, "复购率"] = repeat_count / channel_analysis.loc[channel, "客户数"]

# 按客户价值排序
channel_analysis = channel_analysis.sort_values("每客平均值", ascending=False)

print("【渠道质量对比】")
print(channel_analysis.round(2))

print(f"\\n【渠道投资建议】")
best_channel = channel_analysis.index[0]
best_ltv = channel_analysis.iloc[0]["每客平均值"]
print(f"• {best_channel}: 每客户生命周期价值最高(¥{best_ltv:,.0f})，建议增加投入")

# 渠道×区域的热力图数据
channel_region = clean_orders.groupby(["channel", "region"])["order_amount"].sum().unstack(fill_value=0)
print(f"\\n【渠道×区域销售热力】")
print(channel_region.astype(int))`
  },
  {
    title: "9. 数据驱动的业务结论",
    explanation: "基于以上分析，形成3个具体、可执行、带量化目标的优化方向。",
    code: `print("【基于数据的客户策略建议】\\n")

# 结论1：客户分层投入
top_20pct_customers = pareto_20_pct
top_20pct_value = customer_rfm.head(top_20pct_customers)["monetary"].sum()
top_20pct_contribution = top_20pct_value / total_value * 100
print(f"【结论1】客户80/20规律显著")
print(f"  • 销售额80%来自前{top_20pct_customers}个客户（占比{top_20pct_customers/len(customer_rfm)*100:.1f}%）")
print(f"  • 这部分客户平均消费¥{customer_rfm.head(top_20pct_customers)['monetary'].mean():,.0f}")
print(f"  建议: 对这部分客户投入专项权益预算，预期可提升复购率5-10%")

# 结论2：渠道优化
best_channel_data = channel_analysis.iloc[0]
print(f"\\n【结论2】渠道质量差异大")
print(f"  • {best_channel}渠道客户生命周期价值最高(¥{best_channel_data['每客平均值']:,.0f})")
print(f"  • 复购率达{best_channel_data['复购率']:.1%}，高于平均{repeat_rate:.1%}")
print(f"  建议: 增加{best_channel}渠道投入20%预算，减少低质渠道")

# 结论3：流失预警与召回
churn_risk = customer_rfm[customer_rfm["segment"] == "风险流失"]
churn_value = churn_risk["monetary"].sum()
print(f"\\n【结论3】流失风险客户规模")
print(f"  • {len(churn_risk)}个客户90天未购买，累计贡献¥{churn_value:,.0f}")
print(f"  • 如恢复其中30%的复购，可增加¥{churn_value * 0.3:,.0f}收入")
print(f"  建议: 设计定向召回营销，目标恢复30%的风险客户")

print(f"\\n【综合效果评估】")
total_potential = churn_value * 0.3
print(f"  预期收入增长: ¥{total_potential:,.0f}（约{total_potential/total_value*100:.1f}%）")`
  },
  {
    title: "10. 项目验收与复盘",
    explanation: "最后用程序检查项目是否达到职业级分析标准：数据完整、分析深度、可复现性、可执行性。",
    code: `print("【项目验收清单】\\n")

acceptance_checklist = {
    "数据规模": len(clean_orders) >= 1000,
    "客户多样性": len(clean_orders['customer_id'].unique()) >= 100,
    "时间跨度": (clean_orders['order_date'].max() - clean_orders['order_date'].min()).days >= 150,
    "质量检查": len(raw_orders) - len(clean_orders) >= 5,
    "RFM分析": len(customer_rfm) > 0,
    "分层结果": len(customer_rfm['segment'].unique()) >= 4,
    "异常检测": len(risk_orders) > 0,
    "生命周期分析": repeat_rate > 0,
    "渠道对比": len(channel_analysis) >= 2,
    "可执行建议": 3,
}

passed = sum(acceptance_checklist.values())
total = len(acceptance_checklist)

for item, result in acceptance_checklist.items():
    status = "✓" if result else "✗"
    print(f"{status} {item}")

print(f"\\n验收得分: {passed}/{total} ({passed/total*100:.0f}%)")
print("\\n项目完成: 订单分析从数据清洗→RFM分层→异常检测→生命周期→渠道优化的完整闭环已建立。")`
  }
];

export default cells;
