import { projectProfiles as baseProfiles } from "./course-content-projects-classic.mjs";

const load = (name, options = "") => `from js import window
base_url = window.location.origin
df = pd.read_csv(f"{base_url}/datasets/${name}"${options})`;

export const projectProfiles = {
  ...baseProfiles,
  72: {
    ...baseProfiles[72],
    summary: "使用 UCI Online Retail 20 万行公开交易样本，完成用户消费口径清洗、经营 KPI、消费集中度与 RFM 客群运营分析。",
    background: "英国在线零售商希望理解用户消费规模、复购与流失风险。数据来自 UCI Machine Learning Repository 的 Online Retail（原始 541,909 行），课程使用固定随机种子抽取的 200,000 行公开样本，并保留退货、取消和客户缺失等真实问题。"
  },
  73: {
    summary: "使用 Olist 巴西电商近 10 万笔真实公开订单，连接订单与商品明细，诊断承运时效、延期风险、运费负担和卖家履约表现。",
    objectives: ["建立订单级物流宽表", "正确处理未签收与时间缺失", "衡量采购到发货、在途和总履约时长", "识别延期订单的时间与卖家集中度", "把诊断转化为物流 SLA 与监控建议"],
    background: "Olist 公开数据覆盖巴西多卖家电商平台 2016-2018 年订单。运营团队需要判断延期发生在出库还是运输环节、哪些卖家和月份风险更高，以及运费对商品价值的负担。数据来自 Olist 发布的 Brazilian E-Commerce Public Dataset；客户评价并不能证明某个物流环节导致满意度变化。",
    dataDictionary: [["order_id","订单编号","订单表与明细表连接键"],["order_status","订单状态","delivered/canceled 等"],["order_purchase_timestamp","下单时间","流程起点"],["order_delivered_carrier_date","交承运商时间","出库完成"],["order_delivered_customer_date","客户签收时间","实际完成"],["order_estimated_delivery_date","预计送达时间","承诺基线"],["price/freight_value","商品价/运费","订单明细金额"],["seller_id","卖家编号","履约责任维度"]],
    qualityChecks: ["订单主键是否唯一", "订单明细一对多连接后是否重复计算订单", "各里程碑时间缺失与逆序", "未签收订单不能计算实际履约时长", "异常负时长和极端长尾", "金额字段是否非负"],
    tasks: ["读取并连接订单与明细", "聚合到订单粒度避免重复", "构造出库、运输、总履约与延期指标", "分析月度 SLA", "定位卖家延期集中度", "输出物流运营行动清单"],
    codeCells: [
      {title:"1. 读取订单与商品明细", explanation:"订单表是一单一行，商品表是一单多行；先分别审计，再聚合连接。", code:`import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from js import window
base_url=window.location.origin
date_cols=["order_purchase_timestamp","order_approved_at","order_delivered_carrier_date","order_delivered_customer_date","order_estimated_delivery_date"]
orders=pd.read_csv(f"{base_url}/datasets/olist_orders_dataset.csv",parse_dates=date_cols)
items=pd.read_csv(f"{base_url}/datasets/olist_order_items_dataset.csv",parse_dates=["shipping_limit_date"])
print("订单/明细:",orders.shape,items.shape)
print("订单主键重复:",orders.order_id.duplicated().sum()," 无明细订单:",(~orders.order_id.isin(items.order_id)).sum())
print("状态分布:\\n",orders.order_status.value_counts())`},
      {title:"2. 构造订单级物流宽表", explanation:"先把商品价、运费和卖家数聚合到订单级，避免多商品订单把时效重复计权。", code:`item_order=items.groupby("order_id").agg(item_count=("order_item_id","size"),goods_value=("price","sum"),freight_value=("freight_value","sum"),seller_count=("seller_id","nunique"))
seller_order=items.groupby("order_id").seller_id.first().rename("primary_seller")
logistics=orders.merge(item_order,on="order_id",how="left").merge(seller_order,on="order_id",how="left",validate="one_to_one")
logistics["dispatch_days"]=(logistics.order_delivered_carrier_date-logistics.order_purchase_timestamp).dt.total_seconds()/86400
logistics["transit_days"]=(logistics.order_delivered_customer_date-logistics.order_delivered_carrier_date).dt.total_seconds()/86400
logistics["lead_days"]=(logistics.order_delivered_customer_date-logistics.order_purchase_timestamp).dt.total_seconds()/86400
logistics["delay_days"]=(logistics.order_delivered_customer_date-logistics.order_estimated_delivery_date).dt.total_seconds()/86400
logistics["late"]=logistics.delay_days.gt(0)
logistics["freight_ratio"]=logistics.freight_value/logistics.goods_value.replace(0,np.nan)
print(logistics[["dispatch_days","transit_days","lead_days","delay_days","freight_ratio"]].describe(percentiles=[.5,.9,.95,.99]).round(2))`},
      {title:"3. SLA与流程瓶颈", explanation:"只在已签收订单上衡量实际时效；分别看出库和运输才能定位责任环节。", code:`delivered=logistics[(logistics.order_status=="delivered")&logistics.order_delivered_customer_date.notna()].copy()
valid=(delivered.dispatch_days>=0)&(delivered.transit_days>=0)&(delivered.lead_days>=0)
delivered=delivered.loc[valid]
delivered["purchase_month"]=delivered.order_purchase_timestamp.dt.to_period("M").astype(str)
monthly=delivered.groupby("purchase_month").agg(orders=("order_id","size"),late_rate=("late","mean"),median_dispatch=("dispatch_days","median"),median_transit=("transit_days","median"),p90_lead=("lead_days",lambda x:x.quantile(.9)))
print("已签收有效订单:",len(delivered)," 延期率:",f"{delivered.late.mean():.1%}")
print(monthly.tail(12).round(2))
monthly.late_rate.plot(figsize=(10,4),marker="o",title="按下单月的延期率"); plt.ylabel("延期率"); plt.tight_layout(); plt.show()`},
      {title:"4. 卖家与运费风险", explanation:"设置最小订单量，避免用少量订单给卖家贴标签。高延期率只是筛查信号，还需拆分承运商和地区。", code:`seller=delivered.groupby("primary_seller").agg(orders=("order_id","size"),late_rate=("late","mean"),median_dispatch=("dispatch_days","median"),median_freight_ratio=("freight_ratio","median"))
eligible=seller.query("orders>=30").sort_values(["late_rate","orders"],ascending=False)
print("订单>=30的高延期卖家:\\n",eligible.head(12).round(3))
print("运费占商品价值中位数:",f"{delivered.freight_ratio.median():.1%}"," P90:",f"{delivered.freight_ratio.quantile(.9):.1%}")`},
      {title:"5. 物流运营结论", explanation:"形成可执行的 SLA 分层、监控和后续数据需求。", code:`worst=monthly.late_rate.idxmax(); p90=delivered.lead_days.quantile(.9)
print(f"1. 月度延期峰值出现在 {worst}，回查当月卖家出库与承运时长。")
print(f"2. 总履约 P90 为 {p90:.1f} 天，建议按地区/品类进一步建立差异化承诺。")
print(f"3. 将 {len(eligible)} 个订单量>=30的卖家纳入分层SLA看板，重点看延期率与出库中位数。")
print("限制：公开数据不含承运商、仓库节点和实时轨迹；卖家差异可能受地区与品类结构影响，不能直接归因。")`}
    ],
    conclusions: ["物流时效必须在订单粒度计算。", "延期要拆成出库和在途环节。", "卖家排名必须设置样本量门槛并做结构校正。", "公开订单数据适合诊断，不足以做承运商因果评估。"],
    acceptance: ["连接后保持一单一行", "能解释未签收订单的处理", "能计算月度延期率和 P90", "建议包含 SLA、责任环节和数据限制"]
  },
  74: {
    summary: "使用 UCI Bike Sharing 17,379 条小时级租赁记录，分析通勤峰谷、天气冲击和注册/临时用户差异，并建立无泄漏需求预测基线。",
    objectives: ["理解小时级时间序列结构", "区分临时与注册用户需求", "识别工作日和天气下的峰谷", "避免使用 casual/registered 预测 cnt 的目标泄漏", "用时间切分评估需求预测"],
    background: "共享单车运营需要决定何时补车、在哪类天气下预留运力。UCI Bike Sharing Dataset 汇总华盛顿特区 Capital Bikeshare 2011-2012 年逐小时租赁，并匹配天气和日历字段。",
    dataDictionary: [["dteday/hr","日期/小时","需求时间"],["workingday/holiday","工作日/节假日","日历变量"],["weathersit","天气等级","1好至4差"],["temp/atemp/hum/windspeed","归一化气象指标","连续变量"],["casual/registered","临时/注册用户数","cnt 的组成，不可作预测特征"],["cnt","总租赁量","预测目标"]],
    qualityChecks: ["instant 是否唯一", "日期小时是否重复", "cnt 是否等于 casual+registered", "时间是否连续及是否存在缺口", "归一化气象字段范围"],
    tasks: ["结构审计与时间索引", "分析小时和工作日需求", "比较用户类型", "分析天气条件", "用时间切分训练需求模型", "输出补车建议与限制"],
    codeCells: [
      {title:"1. 加载与结构审计", explanation:"验证目标构成关系，并建立真正的时间顺序。", code:`import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from js import window
base_url=window.location.origin
df=pd.read_csv(f"{base_url}/datasets/bike_sharing_hour.csv",parse_dates=["dteday"])
df["timestamp"]=df.dteday+pd.to_timedelta(df.hr,unit="h")
df=df.sort_values("timestamp")
print("形状:",df.shape," 时间:",df.timestamp.min(),"至",df.timestamp.max())
print("时间重复:",df.timestamp.duplicated().sum()," 目标构成错误:",(df.cnt!=df.casual+df.registered).sum())
print(df[["temp","atemp","hum","windspeed","cnt"]].describe().round(2))`},
      {title:"2. 通勤峰谷与用户结构", explanation:"注册用户通常体现通勤规律，临时用户更受休闲场景影响；分开看比总量更有运营价值。", code:`profile=df.groupby(["workingday","hr"])[["casual","registered","cnt"]].mean()
print("工作日需求最高小时:\\n",profile.loc[1].nlargest(5,"cnt").round(1))
print("非工作日需求最高小时:\\n",profile.loc[0].nlargest(5,"cnt").round(1))
fig,ax=plt.subplots(figsize=(9,4))
profile.loc[1,["casual","registered"]].plot(ax=ax,title="工作日：临时与注册用户小时需求")
ax.set_ylabel("平均租赁量"); plt.tight_layout(); plt.show()`},
      {title:"3. 天气与运力风险", explanation:"天气不是随机分配的，比较用于排班情景而非因果断言。", code:`weather=df.groupby("weathersit").agg(hours=("cnt","size"),mean_demand=("cnt","mean"),p90_demand=("cnt",lambda x:x.quantile(.9)),registered_share=("registered",lambda x:x.sum()/df.loc[x.index,"cnt"].sum()))
print(weather.round(2))
heat=df.pivot_table(index="hr",columns="workingday",values="cnt",aggfunc="mean")
print("各场景P90:",df.groupby(["workingday","weathersit"]).cnt.quantile(.9).round(0).to_dict())`},
      {title:"4. 时间切分需求预测", explanation:"按时间保留最后 20% 做测试，不随机打乱未来；明确排除 casual 和 registered 两个目标组成字段。", code:`from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.metrics import mean_absolute_error
features=["season","yr","mnth","hr","holiday","weekday","workingday","weathersit","temp","atemp","hum","windspeed"]
split=int(len(df)*.8); train,test=df.iloc[:split],df.iloc[split:]
cat=["season","mnth","hr","weekday","weathersit"]; num=[c for c in features if c not in cat]
prep=ColumnTransformer([("cat",OneHotEncoder(handle_unknown="ignore",sparse_output=False),cat),("num","passthrough",num)])
model=Pipeline([("prep",prep),("model",HistGradientBoostingRegressor(max_iter=180,random_state=74))])
model.fit(train[features],train.cnt); pred=model.predict(test[features])
baseline=np.repeat(train.cnt.tail(24*28).mean(),len(test))
print("时间测试区间:",test.timestamp.min(),"至",test.timestamp.max())
print("模型 MAE:",round(mean_absolute_error(test.cnt,pred),1)," 均值基线 MAE:",round(mean_absolute_error(test.cnt,baseline),1))`},
      {title:"5. 调度建议", explanation:"预测必须进入库存、站点容量和调度成本体系后才能落地。", code:`work_peak=profile.loc[1].cnt.idxmax(); off_peak=profile.loc[0].cnt.idxmax()
print(f"1. 工作日全网峰值约在 {work_peak}:00，非工作日约在 {off_peak}:00，补车应在峰值前完成。")
print("2. 以工作日×天气等级的P90作为初始运力情景，并用滚动时间窗回测。")
print("3. 当前数据没有站点库存、OD流向和调度成本，只能做全网需求预测，不能直接生成调度路线。")`}
    ],
    conclusions: ["用户类型拆分揭示通勤与休闲需求差异。", "预测 cnt 时使用 casual/registered 会造成目标泄漏。", "时间切分比随机切分更接近未来预测。", "全网需求还不是站点级调度方案。"],
    acceptance: ["验证 cnt 构成关系", "能识别工作日峰值", "模型排除泄漏字段", "使用时间测试集并与基线比较"]
  },
  75: {
    summary: "使用 UCI Bank Marketing 41,188 条真实电话营销记录，分析客户触达与定期存款转化，建立避免通话时长泄漏的营销评分基线。",
    objectives: ["处理分号分隔与 unknown 类别", "分析触达次数和客户结构", "识别 duration 的事后泄漏", "在类别不平衡下评价模型", "按有限呼叫容量输出 lift 分层"],
    background: "葡萄牙银行希望在有限呼叫容量下提高定期存款营销效率。UCI Bank Marketing 数据记录客户属性、历史联系、宏观指标和本次活动结果。duration 只有通话结束后才知道，不能用于呼叫前名单排序。",
    dataDictionary: [["age/job/education","客户画像","人口与职业类别"],["housing/loan/default","信贷状态","含 unknown"],["contact/month/day_of_week","触达渠道与时间","活动字段"],["duration","本次通话时长","强泄漏，名单生成时未知"],["campaign/pdays/previous","联系历史","999 表示此前未联系"],["poutcome","上次活动结果","历史信号"],["y","是否认购定期存款","目标"]],
    qualityChecks: ["分隔符与字段类型", "unknown 的分布", "目标类别不平衡", "duration 泄漏", "campaign 极端重复触达", "时间字段不是完整时间戳"],
    tasks: ["加载并审计", "分析转化与触达疲劳", "构建呼叫前模型", "评价 ROC-AUC、PR-AUC 与召回率", "计算 Top 10% lift", "输出合规营销建议"],
    codeCells: [
      {title:"1. 加载与营销质量审计", explanation:"unknown 是原数据的显式类别，不擅自当作真实的“否”；先量化再决定处理。", code:`import numpy as np
import pandas as pd
from js import window
base_url=window.location.origin
df=pd.read_csv(f"{base_url}/datasets/bank_marketing_full.csv",sep=";")
df["target"]=(df.y=="yes").astype(int)
unknown=(df.astype(str)=="unknown").sum().sort_values(ascending=False)
print("形状:",df.shape," 转化率:",f"{df.target.mean():.2%}")
print("unknown最多字段:\\n",unknown.head(8))
print("单次活动联系次数:\\n",df.campaign.describe(percentiles=[.5,.9,.95,.99]).round(1))`},
      {title:"2. 客群与触达诊断", explanation:"这是描述性比较；活动名单本身存在选择机制，不能把组间差异解释为干预效果。", code:`job=df.groupby("job").agg(customers=("target","size"),conversion=("target","mean")).query("customers>=200").sort_values("conversion",ascending=False)
touch=pd.cut(df.campaign,[0,1,2,3,5,10,np.inf],labels=["1","2","3","4-5","6-10","11+"])
fatigue=df.groupby(touch,observed=True).agg(customers=("target","size"),conversion=("target","mean"))
print("职业客群:\\n",job.round(3)); print("联系次数与转化:\\n",fatigue.round(3))
print("注意：低意向客户可能被多次联系，不能据此断言多联系导致低转化。")`},
      {title:"3. 构建无事后泄漏模型", explanation:"排除 duration，因为生成呼叫名单时本次通话尚未发生；使用分层切分和类别权重。", code:`from sklearn.model_selection import train_test_split
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder,StandardScaler
from sklearn.linear_model import LogisticRegression
features=[c for c in df.columns if c not in ["y","target","duration"]]
X_train,X_test,y_train,y_test=train_test_split(df[features],df.target,test_size=.25,stratify=df.target,random_state=75)
cat=X_train.select_dtypes(include="object").columns.tolist(); num=[c for c in features if c not in cat]
prep=ColumnTransformer([("cat",OneHotEncoder(handle_unknown="ignore"),cat),("num",StandardScaler(),num)])
model=Pipeline([("prep",prep),("model",LogisticRegression(max_iter=700,class_weight="balanced",random_state=75))]).fit(X_train,y_train)
print("已排除事后字段 duration；训练/测试:",len(X_train),len(X_test))`},
      {title:"4. 分类性能与Top-K Lift", explanation:"营销名单关心有限容量内能覆盖多少转化客户，因此 PR-AUC 和 Top-K lift 比单独准确率更有用。", code:`from sklearn.metrics import roc_auc_score,average_precision_score,precision_score,recall_score
prob=model.predict_proba(X_test)[:,1]; pred=(prob>=.5).astype(int)
print(pd.Series({"ROC-AUC":roc_auc_score(y_test,prob),"PR-AUC":average_precision_score(y_test,prob),"precision@0.5":precision_score(y_test,pred),"recall@0.5":recall_score(y_test,pred)}).round(3))
ranked=pd.DataFrame({"y":y_test.to_numpy(),"p":prob}).sort_values("p",ascending=False)
for share in [.05,.10,.20]:
    top=ranked.head(int(len(ranked)*share)); lift=top.y.mean()/ranked.y.mean()
    print(f"Top {share:.0%}: 名单{len(top)}, 转化率{top.y.mean():.2%}, lift={lift:.2f}, 覆盖转化{top.y.sum()/ranked.y.sum():.1%}")`},
      {title:"5. 营销策略与治理", explanation:"模型排序不能替代客户同意、频控和成本收益规则。", code:`top10=ranked.head(int(len(ranked)*.1))
print(f"1. 若容量为测试客户的10%，模型名单转化率约 {top10.y.mean():.2%}，上线前需用新活动做随机对照验证增量。")
print("2. 对 campaign 设置频控并监控退订/投诉；不能从观察数据断言重复联系的因果伤害。")
print("3. 上线监控 PR-AUC、Top-K转化、覆盖率、不同客户群的触达率与投诉率。")
print("限制：数据来自历史电话活动，缺少完整成本、同意状态和时间戳；模型预测相关性，不预测营销的个体因果增量。")`}
    ],
    conclusions: ["呼叫前模型必须排除 duration。", "不平衡营销任务应报告 PR-AUC 与容量相关 lift。", "高响应概率不等于高增量响应。", "频控、同意与公平触达属于部署必要条件。"],
    acceptance: ["正确读取分号 CSV", "明确排除 duration", "能计算 Top 10% lift", "能区分响应模型与 uplift/因果模型"]
  }
};
