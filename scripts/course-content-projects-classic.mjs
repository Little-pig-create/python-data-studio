const project = (profile) => profile;

const browserLoad = (file, options = "") => `from js import window
base_url = window.location.origin
df = pd.read_csv(f"{base_url}/datasets/${file}"${options})`;

export const projectProfiles = {
  72: project({
    summary: "使用 UCI Online Retail 20 万行公开交易样本，完成经营口径清洗、KPI 诊断、商品集中度分析与 RFM 客户分层。",
    objectives: ["建立可复核的交易清洗口径", "从交易明细构造经营 KPI", "识别商品与国家贡献集中度", "用 RFM 形成可行动的客户分层", "把结果写成决策建议而非图表描述"],
    background: "英国在线零售商希望回答收入来自哪里、哪些客户值得维护、哪些客户正在流失。数据来自 UCI Machine Learning Repository 的 Online Retail（原始 541,909 行），课程使用固定随机种子抽取的 200,000 行公开样本，保留取消单、退货和缺失客户等真实质量问题。",
    dataDictionary: [["InvoiceNo","发票号","以 C 开头通常为取消单"],["StockCode","商品编码","商品主键"],["Description","商品描述","存在缺失"],["Quantity","数量","负数通常表示退货"],["InvoiceDate","交易时间","英国当地时间"],["UnitPrice","单价","英镑"],["CustomerID","客户编号","部分缺失"],["Country","客户国家","订单归属地"]],
    qualityChecks: ["发票行是否重复", "取消单、负数量和非正单价占比", "CustomerID 与 Description 缺失率", "交易日期范围与异常时间", "KPI 是否仅基于有效正向销售"],
    tasks: ["读取数据并建立质量基线", "定义有效销售口径并构造收入", "计算月度与总体 KPI", "分析商品和国家贡献集中度", "构建 RFM 并划分运营客群", "输出行动建议与限制"],
    codeCells: [
      {title:"1. 加载与质量审计", explanation:"先保留原始问题并量化，避免清洗后无法解释样本变化。", code:`import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
${browserLoad("uci_online_retail_200k.csv", ', parse_dates=["InvoiceDate"]')}
audit = pd.Series({
    "行数": len(df), "重复行": df.duplicated().sum(),
    "客户缺失": df["CustomerID"].isna().sum(),
    "取消单": df["InvoiceNo"].astype(str).str.startswith("C").sum(),
    "数量非正": (df["Quantity"] <= 0).sum(), "单价非正": (df["UnitPrice"] <= 0).sum()
})
print(audit.to_string()); print("日期:", df.InvoiceDate.min(), "至", df.InvoiceDate.max()); print(df.head())`},
      {title:"2. 清洗口径与经营KPI", explanation:"有效销售排除重复、取消、退货、非正价格；客户分析再要求客户编号非空。", code:`sales = df.drop_duplicates().copy()
valid = (~sales["InvoiceNo"].astype(str).str.startswith("C")) & (sales["Quantity"] > 0) & (sales["UnitPrice"] > 0)
sales = sales.loc[valid].copy()
sales["revenue"] = sales["Quantity"] * sales["UnitPrice"]
kpi = pd.Series({"有效明细":len(sales), "收入(GBP)":sales.revenue.sum(), "发票数":sales.InvoiceNo.nunique(),
                 "有ID客户数":sales.CustomerID.nunique(), "客单价":sales.groupby("InvoiceNo").revenue.sum().mean()})
print(kpi.round(2).to_string())
print(f"有效明细保留率: {len(sales)/len(df):.1%}")`},
      {title:"3. 月度趋势与集中度", explanation:"趋势用于发现变化，Pareto 指标用于判断经营是否依赖少数商品或市场。", code:`sales["month"] = sales.InvoiceDate.dt.to_period("M").astype(str)
monthly = sales.groupby("month").agg(revenue=("revenue","sum"), invoices=("InvoiceNo","nunique"))
product = sales.groupby("StockCode").revenue.sum().sort_values(ascending=False)
country = sales.groupby("Country").revenue.sum().sort_values(ascending=False)
top20_n = max(1, int(np.ceil(len(product)*.2)))
print(monthly.round(0)); print(f"前20%商品收入贡献: {product.head(top20_n).sum()/product.sum():.1%}")
print("主要国家贡献:\\n", (country.head(8)/country.sum()).map(lambda x:f"{x:.1%}"))
monthly.revenue.plot(figsize=(9,4), marker="o", title="月度有效销售收入（GBP）"); plt.ylabel("GBP"); plt.tight_layout(); plt.show()`},
      {title:"4. RFM客户分层", explanation:"Recency 以数据末日次日为观察点；Frequency 使用不同发票数，Monetary 使用有效销售收入。", code:`customer_sales = sales.dropna(subset=["CustomerID"])
snapshot = customer_sales.InvoiceDate.max().normalize() + pd.Timedelta(days=1)
rfm = customer_sales.groupby("CustomerID").agg(
    recency=("InvoiceDate", lambda x:(snapshot-x.max().normalize()).days),
    frequency=("InvoiceNo","nunique"), monetary=("revenue","sum"))
rfm["r_score"] = pd.qcut(rfm.recency.rank(method="first"), 4, labels=[4,3,2,1]).astype(int)
rfm["f_score"] = pd.qcut(rfm.frequency.rank(method="first"), 4, labels=[1,2,3,4]).astype(int)
rfm["m_score"] = pd.qcut(rfm.monetary.rank(method="first"), 4, labels=[1,2,3,4]).astype(int)
rfm["segment"] = np.select([
    (rfm.r_score>=3)&(rfm.f_score>=3), (rfm.r_score<=2)&(rfm.f_score>=3),
    (rfm.r_score>=3)&(rfm.f_score<=2)], ["高价值活跃","高价值待唤回","新近低频"], default="一般/沉睡")
segment = rfm.groupby("segment").agg(customers=("monetary","size"), revenue=("monetary","sum"), median_recency=("recency","median"))
segment["revenue_share"] = segment.revenue/segment.revenue.sum()
print(segment.sort_values("revenue",ascending=False).round(2))`},
      {title:"5. 决策摘要", explanation:"把指标转换成具体动作，同时保留抽样、缺失客户与退货口径的限制。", code:`best = segment.revenue.idxmax(); risk_n = int((rfm.segment=="高价值待唤回").sum())
print("经营建议")
print(f"1. 收入最高客群为「{best}」，优先设计分层权益而非全量促销。")
print(f"2. 对 {risk_n} 位高价值待唤回客户做小规模召回测试，并设置增量评估。")
print("3. 对高贡献商品建立缺货与退货监控，避免集中度转化为供应风险。")
print("限制：课程数据是原始数据的固定20万行样本；CustomerID缺失交易不能进入RFM；本分析描述关联，不证明营销动作的因果效果。")`}
    ],
    conclusions: ["清洗口径直接决定收入和客群结论，必须与结果一同交付。", "RFM 是运营排序工具，不是客户终身价值或因果响应模型。", "集中度既意味着重点，也意味着供应与市场风险。"],
    acceptance: ["能解释有效销售口径", "能复算 KPI 与 Pareto 贡献", "能说明 RFM 三指标观察窗口", "建议包含目标客群、动作、指标和限制"]
  }),

  73: project({
    summary:"使用 seaborn 发布的 2019 年纽约出租车公开样本，分析需求时段、路线效率、票价结构与小费选择偏差。",
    objectives:["审计行程时间与金额字段", "构造时长、速度和小费率", "识别需求高峰与高价值路线", "稳健处理极端行程", "避免将支付方式差异误写为因果"],
    background:"运营团队需要安排运力并理解不同路线的收入质量。该数据含 6,433 笔纽约出租车行程，适合演示从行程明细到排班和服务建议的完整过程。",
    dataDictionary:[["pickup/dropoff","上下车时间","用于时长与时段"],["distance","里程","英里"],["fare/tip/tolls/total","金额组成","美元"],["payment","支付方式","存在缺失"],["pickup_borough/dropoff_borough","行政区","存在缺失"],["pickup_zone/dropoff_zone","交通分区","路线维度"]],
    qualityChecks:["下车是否晚于上车", "距离、票价和总额是否为正", "分区与支付方式缺失", "速度和小费率极端值", "total 与金额组成的口径差异"],
    tasks:["质量审计", "构造运营指标", "分析小时与星期需求", "比较行政区路线", "评估支付方式与小费的选择偏差", "输出排班与数据采集建议"],
    codeCells:[
      {title:"1. 加载、审计与派生指标", explanation:"先检查时间和金额，再构造可解释的运营指标。", code:`import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
${browserLoad("taxis.csv", ', parse_dates=["pickup","dropoff"]')}
df["minutes"]=(df.dropoff-df.pickup).dt.total_seconds()/60
df["speed_mph"]=df.distance/(df.minutes/60)
df["tip_rate"]=df.tip/df.fare.replace(0,np.nan)
print(pd.Series({"行数":len(df),"时间非正":(df.minutes<=0).sum(),"距离非正":(df.distance<=0).sum(),"票价非正":(df.fare<=0).sum(),"支付缺失":df.payment.isna().sum(),"行政区缺失":df.pickup_borough.isna().sum()}))
print(df[["distance","fare","tip","total","minutes","speed_mph","tip_rate"]].describe(percentiles=[.5,.95,.99]).round(2))`},
      {title:"2. 建立稳健分析样本", explanation:"用业务边界与分位数降低录入错误和极端行程对均值的支配。", code:`valid=df[(df.minutes>0)&(df.distance>0)&(df.fare>0)].copy()
limits={c:valid[c].quantile(.99) for c in ["minutes","speed_mph","tip_rate"]}
trips=valid[(valid.minutes<=limits["minutes"])&(valid.speed_mph<=limits["speed_mph"])&(valid.tip_rate<=limits["tip_rate"])].copy()
trips["hour"]=trips.pickup.dt.hour; trips["weekday"]=trips.pickup.dt.day_name()
print(f"稳健样本: {len(trips):,}/{len(df):,} ({len(trips)/len(df):.1%})"); print(limits)`},
      {title:"3. 需求高峰与路线表现", explanation:"同时看订单量、收入和单位小时收入，避免只追求单一指标。", code:`hourly=trips.groupby("hour").agg(trips=("fare","size"), revenue=("total","sum"), median_minutes=("minutes","median"))
hourly["revenue_per_trip_hour"]=hourly.revenue/(hourly.trips*hourly.median_minutes/60)
route=trips.dropna(subset=["pickup_borough","dropoff_borough"]).groupby(["pickup_borough","dropoff_borough"]).agg(trips=("fare","size"),median_total=("total","median"),median_minutes=("minutes","median"))
print("订单最多时段:\n",hourly.nlargest(5,"trips").round(2)); print("样本量>=20的高总额路线:\n",route.query("trips>=20").nlargest(8,"median_total").round(2))
hourly.trips.plot(kind="bar",figsize=(9,4),title="按小时的行程需求"); plt.tight_layout(); plt.show()`},
      {title:"4. 小费分析与选择偏差", explanation:"现金小费可能未完整记录；支付方式也不是随机分配，因此这里只报告条件差异。", code:`pay=trips.dropna(subset=["payment"]).groupby("payment").agg(trips=("tip","size"),median_tip_rate=("tip_rate","median"),mean_tip_rate=("tip_rate","mean"),median_fare=("fare","median"))
card=trips[trips.payment=="credit card"]
borough_tip=card.dropna(subset=["pickup_borough"]).groupby("pickup_borough").agg(trips=("tip","size"),median_tip_rate=("tip_rate","median"))
print(pay.round(3)); print("仅信用卡、按上车行政区:\n",borough_tip.query("trips>=30").sort_values("median_tip_rate",ascending=False).round(3))
print("注意：现金小费可能不在数据中，不能据此断言信用卡导致更高小费。")`},
      {title:"5. 运营建议", explanation:"建议必须对应可监控指标，并说明样本覆盖限制。", code:`peak=hourly.trips.idxmax(); efficient=hourly.revenue_per_trip_hour.idxmax()
print(f"1. {peak}:00 附近需求最高，可作为增配运力候选时段。")
print(f"2. {efficient}:00 的估算单位行程小时收入最高，需结合空驶和司机在线时长验证。")
print("3. 建立时长、速度、金额与地理缺失的每日质量看板。")
print("限制：样本仅覆盖2019年3月的部分行程；没有空驶、司机在线、天气和动态加价信息；结论是描述性关联。")`}
    ],
    conclusions:["运力决策要联合需求、耗时与收入，而非只看订单量。", "极端值处理必须报告规则和保留率。", "支付方式的小费差异受到记录机制和用户选择影响。"],
    acceptance:["能复核时长与速度公式", "能解释稳健样本边界", "能给出至少一个可监控排班建议", "不作支付方式的因果断言"]
  }),

  74: project({
    summary:"使用 Kaggle/Seaborn 经典 Titanic 数据，建立无数据泄漏的生存风险基线，并检查阈值与亚组表现。",
    objectives:["识别目标泄漏", "建立分层训练测试集", "用流水线处理缺失与类别变量", "比较概率模型与树模型", "检查阈值和亚组误差"],
    background:"该项目把经典 Titanic 数据当作风险建模练习，而非竞赛刷分。重点是可复现验证、泄漏控制、指标权衡和亚组审计。历史数据不能直接用于现实安全决策。",
    dataDictionary:[["survived","是否生存","目标变量"],["pclass/class","舱位等级","重复表达，保留 pclass"],["sex/age","性别与年龄","age 有缺失"],["sibsp/parch","同行亲属数","计数变量"],["fare","票价","连续变量"],["embarked","登船港口","类别变量"],["alive","生存文本标签","目标泄漏，禁止使用"]],
    qualityChecks:["目标类别比例", "缺失值", "重复语义字段", "alive 等直接泄漏", "训练测试是否分层且预处理仅拟合训练集"],
    tasks:["审计与选择特征", "建立预处理流水线", "训练逻辑回归基线", "与随机森林比较", "分析阈值取舍", "按性别和舱位审计误差"],
    codeCells:[
      {title:"1. 数据审计与泄漏清单", explanation:"alive 是 survived 的文字副本；who、adult_male 等字段也由其他变量派生，基线不使用。", code:`import numpy as np
import pandas as pd
${browserLoad("titanic.csv")}
print("形状:",df.shape," 生存率:",df.survived.mean().round(3)); print(df.isna().sum().sort_values(ascending=False).head(8))
features=["pclass","sex","age","sibsp","parch","fare","embarked"]
leakage=["alive","who","adult_male","class","embark_town","alone"]
print("建模特征:",features); print("排除的泄漏/冗余字段:",leakage)`},
      {title:"2. 无泄漏训练流水线", explanation:"划分在前，缺失填补和编码只在训练折上拟合。", code:`from sklearn.model_selection import train_test_split
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.linear_model import LogisticRegression
X=df[features]; y=df.survived
X_train,X_test,y_train,y_test=train_test_split(X,y,test_size=.25,stratify=y,random_state=74)
num=["age","sibsp","parch","fare"]; cat=["pclass","sex","embarked"]
prep=ColumnTransformer([("num",Pipeline([("impute",SimpleImputer(strategy="median")),("scale",StandardScaler())]),num),
                         ("cat",Pipeline([("impute",SimpleImputer(strategy="most_frequent")),("onehot",OneHotEncoder(handle_unknown="ignore"))]),cat)])
logit=Pipeline([("prep",prep),("model",LogisticRegression(max_iter=1000,random_state=74))]).fit(X_train,y_train)
print("训练/测试:",len(X_train),len(X_test))`},
      {title:"3. 模型比较与阈值", explanation:"ROC-AUC 衡量排序，精确率和召回率取决于决策阈值。", code:`from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import roc_auc_score,accuracy_score,precision_score,recall_score,confusion_matrix
forest=Pipeline([("prep",prep),("model",RandomForestClassifier(n_estimators=250,min_samples_leaf=4,random_state=74))]).fit(X_train,y_train)
rows=[]
for name,model in {"逻辑回归":logit,"随机森林":forest}.items():
    p=model.predict_proba(X_test)[:,1]; pred=(p>=.5).astype(int)
    rows.append([name,roc_auc_score(y_test,p),accuracy_score(y_test,pred),precision_score(y_test,pred),recall_score(y_test,pred)])
print(pd.DataFrame(rows,columns=["模型","ROC-AUC","准确率","精确率","召回率"]).set_index("模型").round(3))
best=logit; prob=best.predict_proba(X_test)[:,1]
for t in [.3,.5,.7]:
    pred=(prob>=t); print(f"阈值{t:.1f}: precision={precision_score(y_test,pred):.3f}, recall={recall_score(y_test,pred):.3f}, matrix={confusion_matrix(y_test,pred).tolist()}")`},
      {title:"4. 亚组误差审计", explanation:"总体分数可能掩盖某些群体的高漏判率；这里只诊断差异，不把差异解释为因果。", code:`audit=X_test[["sex","pclass"]].copy(); audit["y"]=y_test.to_numpy(); audit["pred"]=(prob>=.5).astype(int)
def group_metrics(g):
    return pd.Series({"n":len(g),"accuracy":(g.y==g.pred).mean(),"recall":recall_score(g.y,g.pred,zero_division=0),"positive_rate":g.pred.mean()})
print("按性别:\n",audit.groupby("sex").apply(group_metrics,include_groups=False).round(3))
print("按舱位:\n",audit.groupby("pclass").apply(group_metrics,include_groups=False).round(3))`},
      {title:"5. 模型卡摘要", explanation:"模型交付不仅是分数，还包括用途、不可用途和监控要求。", code:`print("用途：教学用历史风险排序基线；不是现实救援或保险决策工具。")
print("输入：舱位、性别、年龄、亲属数、票价、登船港；排除 alive 等泄漏字段。")
print("验证：固定随机种子的分层留出集；应进一步使用交叉验证评估波动。")
print("风险：样本小、历史制度与价值观偏差、缺失非随机、亚组样本不均；预测差异不等于因果机制。")`}
    ],
    conclusions:["流水线防止预处理偷看测试集。", "阈值应随漏判和误报成本选择。", "总体指标必须配合亚组误差与适用边界。"],
    acceptance:["能指出 alive 泄漏", "能解释分层划分和 Pipeline", "能比较 ROC-AUC 与阈值指标", "能生成亚组审计与模型卡"]
  }),

  75: project({
    summary:"使用 UCI Adult 官方训练集与测试集建立收入分类基线，并审计性别、种族群体的预测率和错误率差异。",
    objectives:["按 UCI 官方划分读取 48,842 行数据", "清理问号缺失与测试标签", "建立稀疏类别流水线", "评估分类性能", "进行公平性诊断并准确表达限制"],
    background:"Adult/Census Income 是经典公开分类数据，目标是预测年收入是否超过 50K。项目强调技术性能与责任边界并重：群体差异是审计信号，不等于已证明歧视原因，也不能单凭指标决定部署。",
    dataDictionary:[["age/workclass/education","人口与教育字段","类别与数值混合"],["occupation/relationship","职业与家庭关系","可能含社会结构偏差"],["race/sex","敏感属性","用于审计，也可能影响模型"],["capital-gain/loss","资本收益损失","高度偏态"],["hours-per-week","每周工时","数值"],["income","是否 >50K","测试标签末尾带点"]],
    qualityChecks:["官方训练测试行数", "字段前后空格和 ? 缺失", "测试文件首行说明", "标签尾随句点", "敏感群体样本量与阳性率"],
    tasks:["按官方切分读取数据", "清理缺失与标签", "训练逻辑回归流水线", "评估 ROC-AUC 与分类指标", "审计群体预测率、TPR、FPR", "形成治理与部署限制"],
    codeCells:[
      {title:"1. 读取UCI官方训练与测试集", explanation:"测试文件首行是说明，标签带句点；读取时显式处理，避免静默错标。", code:`import numpy as np
import pandas as pd
from js import window
base_url=window.location.origin
cols=["age","workclass","fnlwgt","education","education_num","marital_status","occupation","relationship","race","sex","capital_gain","capital_loss","hours_per_week","native_country","income"]
train=pd.read_csv(f"{base_url}/datasets/adult.data",names=cols,skipinitialspace=True,na_values="?")
test=pd.read_csv(f"{base_url}/datasets/adult.test",names=cols,skiprows=1,skipinitialspace=True,na_values="?")
test["income"]=test.income.str.rstrip(".")
print("官方训练/测试:",train.shape,test.shape); print("训练缺失最多:\n",train.isna().sum().sort_values(ascending=False).head())
print("标签比例:",train.income.value_counts(normalize=True).round(3).to_dict())`},
      {title:"2. 预处理与模型训练", explanation:"保持官方测试集完全独立；类别缺失填补后独热编码，数值使用中位数填补和缩放。", code:`from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import OneHotEncoder,StandardScaler
from sklearn.linear_model import LogisticRegression
target="income"; drop=[target,"fnlwgt"]
features=[c for c in cols if c not in drop]
X_train=train[features]; y_train=(train[target]==">50K").astype(int)
X_test=test[features]; y_test=(test[target]==">50K").astype(int)
num=X_train.select_dtypes(include="number").columns.tolist(); cat=[c for c in features if c not in num]
prep=ColumnTransformer([("num",Pipeline([("impute",SimpleImputer(strategy="median")),("scale",StandardScaler())]),num),
 ("cat",Pipeline([("impute",SimpleImputer(strategy="most_frequent")),("onehot",OneHotEncoder(handle_unknown="ignore"))]),cat)])
model=Pipeline([("prep",prep),("model",LogisticRegression(max_iter=500,random_state=75))]).fit(X_train,y_train)
print("特征:",len(features),"数值:",len(num),"类别:",len(cat))`},
      {title:"3. 官方测试集性能", explanation:"同时报告排序能力、阈值结果和混淆矩阵，不用准确率掩盖类别不平衡。", code:`from sklearn.metrics import roc_auc_score,accuracy_score,precision_score,recall_score,confusion_matrix
prob=model.predict_proba(X_test)[:,1]; pred=(prob>=.5).astype(int)
print(pd.Series({"ROC-AUC":roc_auc_score(y_test,prob),"accuracy":accuracy_score(y_test,pred),"precision":precision_score(y_test,pred),"recall":recall_score(y_test,pred)}).round(3))
print("混淆矩阵 [[TN,FP],[FN,TP]]:\n",confusion_matrix(y_test,pred))`},
      {title:"4. 性别与种族公平性审计", explanation:"报告样本量、真实阳性率、预测阳性率、TPR 和 FPR。小群体指标波动大，应结合置信区间。", code:`audit=X_test[["sex","race"]].copy(); audit["y"]=y_test.to_numpy(); audit["pred"]=pred
def fairness(g):
    y=g.y.to_numpy(); p=g.pred.to_numpy(); pos=y==1; neg=y==0
    return pd.Series({"n":len(g),"actual_positive":y.mean(),"pred_positive":p.mean(),
      "TPR":p[pos].mean() if pos.any() else np.nan,"FPR":p[neg].mean() if neg.any() else np.nan})
sex_report=audit.groupby("sex").apply(fairness,include_groups=False)
race_report=audit.groupby("race").apply(fairness,include_groups=False).sort_values("n",ascending=False)
print("按性别:\n",sex_report.round(3)); print("按种族:\n",race_report.round(3))
print("性别预测阳性率差:",round(sex_report.pred_positive.max()-sex_report.pred_positive.min(),3))`},
      {title:"5. 敏感属性对照与治理结论", explanation:"移除敏感字段不保证公平，因为教育、职业等变量可能是代理变量；对照仅用于诊断。", code:`reduced=[c for c in features if c not in ["sex","race"]]
num2=X_train[reduced].select_dtypes(include="number").columns.tolist(); cat2=[c for c in reduced if c not in num2]
prep2=ColumnTransformer([("num",Pipeline([("impute",SimpleImputer(strategy="median")),("scale",StandardScaler())]),num2),
 ("cat",Pipeline([("impute",SimpleImputer(strategy="most_frequent")),("onehot",OneHotEncoder(handle_unknown="ignore"))]),cat2)])
model2=Pipeline([("prep",prep2),("model",LogisticRegression(max_iter=500,random_state=75))]).fit(X_train[reduced],y_train)
p2=model2.predict_proba(X_test[reduced])[:,1]; pred2=(p2>=.5).astype(int)
print("移除sex/race后的 ROC-AUC:",round(roc_auc_score(y_test,p2),3))
audit["pred_reduced"]=pred2
print("移除敏感字段后的预测阳性率:\n",audit.groupby("sex").pred_reduced.mean().round(3))
print("治理结论：差异需要业务合法性、标签机制、代理变量、阈值与不确定性共同审查；不能把统计差异直接称为因果歧视，也不能因移除敏感字段就宣称公平。")`}
    ],
    conclusions:["官方测试集提供可复核的泛化评估。", "准确率不足以评价不平衡分类。", "公平性需要多指标、群体样本量与使用情境共同判断。", "fairness through unawareness 并不成立。"],
    acceptance:["能正确清理官方测试标签", "预处理只拟合训练集", "能解释 TPR/FPR 与预测阳性率", "能区分模型差异、因果歧视和治理决策"]
  })
};
