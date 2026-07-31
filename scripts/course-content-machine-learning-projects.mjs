const lines = (...items) => items.join("\n");
const profile = (value) => value;

export const machineLearningProjectProfiles = {
  105: profile({
    summary: "使用 UCI Online Retail 公开交易数据，按照“问题定义—数据准备—模型训练—模型评价—模型理解”的教学路径，预测客户未来消费金额。",
    objectives: ["理解客户价值预测的样本粒度与时间窗口", "审计并清洗真实交易数据", "构造无时间穿越的客户特征与目标", "比较回归基线、线性模型和树模型", "使用金额误差、Top-K与错误切片理解模型"],
    background: "在统一观察日，根据客户此前的交易行为预测未来窗口内的消费金额。本章关注规范的回归建模过程，不把预测相关性解释为营销措施的因果效果。",
    dataDictionary: [["InvoiceNo", "发票号", "C开头通常为取消单"], ["InvoiceDate", "交易时间", "划分观察窗口与未来窗口"], ["CustomerID", "客户编号", "聚合到一位客户一行"], ["Quantity/UnitPrice", "数量/单价", "构造有效交易金额"], ["future_revenue", "未来消费金额", "回归目标"]],
    qualityChecks: ["重复、取消、退货和非正价格", "CustomerID缺失和清洗保留率", "观察窗口与目标窗口严格分离", "客户主键唯一", "未来零消费比例和金额长尾", "测试集不参与模型选择"],
    tasks: ["明确客户粒度、预测时点和未来窗口", "审计原始交易数据", "清洗交易并记录样本变化", "构造历史特征和未来目标", "探索目标分布并建立Dummy基线", "划分客户训练集与测试集", "比较Ridge与梯度提升模型", "在原始金额尺度和Top-K上评价", "分析错误样本与客户分组", "解释特征重要性并总结模型局限"],
    codeCells: [
      { title: "1. 原始数据质量审计", explanation: "先量化重复、取消、缺失和异常数值，建立可追溯的数据起点。", code: lines(
        "import numpy as np", "import pandas as pd", "from js import window",
        "raw=pd.read_csv(f\"{window.location.origin}/datasets/uci_online_retail_200k.csv\",parse_dates=['InvoiceDate'])",
        "audit=pd.Series({'原始行':len(raw),'完全重复':raw.duplicated().sum(),'客户缺失':raw.CustomerID.isna().sum(),'取消单':raw.InvoiceNo.astype(str).str.startswith('C').sum(),'数量非正':(raw.Quantity<=0).sum(),'单价非正':(raw.UnitPrice<=0).sum()})",
        "print(audit.to_string()); print('日期范围:',raw.InvoiceDate.min(),'至',raw.InvoiceDate.max()); display(raw.head())"
      )},
      { title: "2. 清洗交易并记录样本变化", explanation: "删除重复后，仅保留有客户编号的有效正向销售，并计算清洗保留率。", code: lines(
        "dedup=raw.drop_duplicates().copy()",
        "valid=(~dedup.InvoiceNo.astype(str).str.startswith('C'))&(dedup.Quantity>0)&(dedup.UnitPrice>0)&dedup.CustomerID.notna()",
        "sales=dedup.loc[valid].copy(); sales['revenue']=sales.Quantity*sales.UnitPrice",
        "clean_report=pd.Series({'去重后':len(dedup),'有效销售':len(sales),'删除行':len(raw)-len(sales),'保留率':len(sales)/len(raw)})",
        "print(clean_report.round(3).to_string()); print('单行金额分位数:\\n',sales.revenue.quantile([.5,.9,.99,.999]).round(2))"
      )},
      { title: "3. 定义时间窗口并构造客户样本", explanation: "截止日前的数据只生成特征，截止日后的数据只生成目标，从源头防止时间穿越。", code: lines(
        "cutoff=sales.InvoiceDate.quantile(.8).normalize(); hist=sales[sales.InvoiceDate<cutoff]; future=sales[sales.InvoiceDate>=cutoff]",
        "customer_features=hist.groupby('CustomerID').agg(recency=('InvoiceDate',lambda x:(cutoff-x.max().normalize()).days),frequency=('InvoiceNo','nunique'),monetary=('revenue','sum'),items=('Quantity','sum'),products=('StockCode','nunique'),active_days=('InvoiceDate',lambda x:(x.max().normalize()-x.min().normalize()).days+1))",
        "future_target=future.groupby('CustomerID').revenue.sum().rename('future_revenue')",
        "customer=customer_features.join(future_target,how='left').fillna({'future_revenue':0}); assert customer.index.is_unique",
        "print('观察截止日:',cutoff.date(),'客户数:',len(customer),'未来零消费:',f'{(customer.future_revenue==0).mean():.1%}')"
      )},
      { title: "4. 探索目标分布与客户差异", explanation: "金额目标同时具有大量零值和明显长尾，后续需要在对数尺度训练、原始金额尺度评价。", code: lines(
        "target_summary=customer.future_revenue.describe(percentiles=[.5,.75,.9,.95,.99]).round(2)",
        "customer['history_value_group']=pd.qcut(customer.monetary,4,labels=['Q1','Q2','Q3','Q4'])",
        "group_summary=customer.groupby('history_value_group',observed=True).agg(customers=('future_revenue','size'),future_positive_rate=('future_revenue',lambda x:(x>0).mean()),future_mean=('future_revenue','mean'),future_median=('future_revenue','median'))",
        "print(target_summary); display(group_summary.round(2))"
      )},
      { title: "5. 客户级划分与Dummy基线", explanation: "按客户划分训练集和测试集，并用中位数回归器建立最低比较基线。", code: lines(
        "from sklearn.model_selection import train_test_split", "from sklearn.dummy import DummyRegressor",
        "cols=['recency','frequency','monetary','items','products','active_days']; X=customer[cols].clip(lower=0); y_raw=customer.future_revenue; y=np.log1p(y_raw)",
        "X_train,X_test,y_train,y_test=train_test_split(X,y,test_size=.25,random_state=105,stratify=(y_raw>0))",
        "dummy=DummyRegressor(strategy='median').fit(X_train,y_train)",
        "print('训练/测试客户:',len(X_train),len(X_test)); print('训练/测试未来有消费比例:',f'{(y_train>0).mean():.1%}',f'{(y_test>0).mean():.1%}')"
      )},
      { title: "6. 比较线性模型与树模型", explanation: "使用五折交叉验证比较Ridge与梯度提升，以对数目标MAE选择模型。", code: lines(
        "from sklearn.model_selection import KFold,cross_val_score", "from sklearn.pipeline import make_pipeline", "from sklearn.preprocessing import StandardScaler", "from sklearn.linear_model import Ridge", "from sklearn.ensemble import HistGradientBoostingRegressor",
        "models={'Ridge':make_pipeline(StandardScaler(),Ridge(alpha=10)),'梯度提升':HistGradientBoostingRegressor(max_iter=180,max_leaf_nodes=12,l2_regularization=2,random_state=105)}",
        "cv=KFold(5,shuffle=True,random_state=105); rows=[]",
        "for name,model in models.items():",
        "    scores=-cross_val_score(model,X_train,y_train,cv=cv,scoring='neg_mean_absolute_error'); rows.append([name,scores.mean(),scores.std()])",
        "validation=pd.DataFrame(rows,columns=['model','CV_log_MAE','std']).sort_values('CV_log_MAE'); display(validation.round(3))",
        "best_name=validation.iloc[0].model; best_model=models[best_name].fit(X_train,y_train)"
      )},
      { title: "7. 在原始金额尺度评价模型", explanation: "把预测还原为金额，联合报告MAE、RMSE、R²和Dummy基线误差。", code: lines(
        "from sklearn.metrics import mean_absolute_error,mean_squared_error,r2_score",
        "prediction=np.maximum(0,np.expm1(best_model.predict(X_test))); actual=np.expm1(y_test); baseline=np.maximum(0,np.expm1(dummy.predict(X_test)))",
        "metrics=pd.Series({'MAE_GBP':mean_absolute_error(actual,prediction),'RMSE_GBP':mean_squared_error(actual,prediction)**.5,'R2':r2_score(actual,prediction),'Dummy_MAE':mean_absolute_error(actual,baseline)})",
        "result=X_test.copy(); result['actual']=actual.to_numpy(); result['prediction']=prediction; result['absolute_error']=(result.actual-result.prediction).abs()",
        "print('最佳模型:',best_name); print(metrics.round(2).to_string())"
      )},
      { title: "8. 使用Top-K检查排序能力", explanation: "Top-K只作为模型排序评价，比较不同观察比例覆盖了多少真实未来消费金额。", code: lines(
        "ranked=result.sort_values('prediction',ascending=False); total_revenue=max(ranked.actual.sum(),1e-9); topk_rows=[]",
        "for share in [.05,.10,.20]:",
        "    n=max(1,int(len(ranked)*share)); topk_rows.append([f'{share:.0%}',n,ranked.head(n).actual.sum()/total_revenue,ranked.head(n).actual.mean()])",
        "topk=pd.DataFrame(topk_rows,columns=['观察比例','客户数','真实金额覆盖率','组内平均金额']); display(topk.round(3))"
      )},
      { title: "9. 错误切片与高误差案例", explanation: "分别检查未来零消费/有消费客户，以及不同历史价值组的误差。", code: lines(
        "error_table=result.copy(); error_table['future_status']=np.where(error_table.actual>0,'未来有消费','未来零消费'); error_table['history_quartile']=pd.qcut(error_table.monetary,4,labels=False,duplicates='drop')+1",
        "status_error=error_table.groupby('future_status').absolute_error.agg(['count','mean','median'])",
        "value_error=error_table.groupby('history_quartile').absolute_error.agg(['count','mean','median'])",
        "print('按未来状态误差:\\n',status_error.round(2)); print('按历史价值分组误差:\\n',value_error.round(2)); display(error_table.nlargest(8,'absolute_error')[['actual','prediction','absolute_error','monetary','frequency']].round(2))"
      )},
      { title: "10. 特征解释与模型局限", explanation: "置换重要性说明模型依赖哪些历史信号，不能据此断言这些变量会导致未来消费。", code: lines(
        "from sklearn.inspection import permutation_importance",
        "permutation=permutation_importance(best_model,X_test,y_test,n_repeats=5,scoring='neg_mean_absolute_error',random_state=105)",
        "importance=pd.Series(permutation.importances_mean,index=cols).sort_values(ascending=False)",
        "print('置换重要性:\\n',importance.round(4)); print('局限: 固定交易样本、客户编号缺失、未来零值多且金额长尾；预测关系不代表营销干预的因果效果。')"
      )}
    ],
    conclusions: ["客户级预测必须先定义观察窗口和未来窗口", "金额长尾需要区分训练尺度与评价尺度", "总体误差、Top-K和分组误差回答不同问题", "特征重要性反映预测依赖而不是因果关系"],
    acceptance: ["完成原始审计与清洗报告", "观察和目标窗口无重叠", "比较Dummy与两个候选模型", "报告MAE、RMSE、R²和Top-K", "完成错误切片与置换重要性解释"]
  }),

  106: profile({
    summary: "使用 Olist 巴西电商公开数据，以物流延期分类为主线，学习多表建模、预测时点、数据泄漏、类别不平衡和业务阈值。",
    objectives: ["理解订单、明细、客户和卖家表的粒度", "构造订单级延期标签并排除事后字段", "使用时间顺序划分模拟未来预测", "比较概率基线、逻辑回归和随机森林", "使用PR-AUC、Top-K、错误切片与特征重要性评价模型"],
    background: "目标是在订单创建后预测是否会晚于预计日期签收。实际发货、实际签收和最终订单状态只能用于构造样本或标签，不能作为预测特征。",
    dataDictionary: [["order_id", "订单主键", "最终保持一单一行"], ["customer/seller_state", "客户州/卖家州", "下单时可用类别特征"], ["promise_days", "承诺时长", "预计送达日减下单日"], ["goods/freight_value", "商品额/运费", "订单级数值特征"], ["late", "是否延期", "实际签收晚于预计日"]],
    qualityChecks: ["订单主键及明细一对多关系", "聚合连接后订单唯一", "日期缺失与承诺天数异常", "已签收样本的选择口径", "实际发货和签收字段泄漏", "延期率随时间和地区变化"],
    tasks: ["明确订单粒度、预测时点与延期标签", "审计四张原始数据表", "聚合明细并连接订单级样本", "清洗日期并构造延期标签", "探索类别不平衡和场景差异", "审计泄漏并按时间划分三组数据", "建立预处理Pipeline和概率基线", "比较逻辑回归与随机森林", "评价PR-AUC、阈值、Lift与错误切片", "解释特征重要性并总结局限"],
    codeCells: [
      { title: "1. 加载四表并审计数据粒度", explanation: "先确认每张表的一行代表什么，再决定聚合和连接方式。", code: lines(
        "import numpy as np", "import pandas as pd", "from js import window", "base=window.location.origin",
        "orders=pd.read_csv(f'{base}/datasets/olist_orders_dataset.csv',parse_dates=['order_purchase_timestamp','order_delivered_customer_date','order_estimated_delivery_date','order_delivered_carrier_date'])",
        "items=pd.read_csv(f'{base}/datasets/olist_order_items_dataset.csv'); customers=pd.read_csv(f'{base}/datasets/olist_customers_dataset.csv'); sellers=pd.read_csv(f'{base}/datasets/olist_sellers_dataset.csv')",
        "audit=pd.Series({'订单行':len(orders),'订单键重复':orders.order_id.duplicated().sum(),'明细行':len(items),'明细订单数':items.order_id.nunique(),'客户键重复':customers.customer_id.duplicated().sum(),'卖家键重复':sellers.seller_id.duplicated().sum()})",
        "print(audit.to_string())"
      )},
      { title: "2. 聚合明细并连接订单级样本", explanation: "先把一对多商品明细聚合到订单，再用validate检查连接基数。", code: lines(
        "item_agg=items.groupby('order_id').agg(item_count=('order_item_id','size'),goods_value=('price','sum'),freight_value=('freight_value','sum'),primary_seller=('seller_id','first'),seller_count=('seller_id','nunique'))",
        "order_level=(orders.merge(item_agg,on='order_id',validate='one_to_one').merge(customers[['customer_id','customer_state']],on='customer_id',validate='many_to_one').merge(sellers[['seller_id','seller_state']].rename(columns={'seller_id':'primary_seller'}),on='primary_seller',validate='many_to_one'))",
        "assert order_level.order_id.is_unique",
        "print('连接后订单:',len(order_level),'缺少实际签收:',order_level.order_delivered_customer_date.isna().sum()); display(order_level[['order_id','item_count','goods_value','freight_value','seller_count']].head())"
      )},
      { title: "3. 清洗样本并定义延期标签", explanation: "标签来自签收结果；建模样本限定为有完整日期的已签收订单，并记录保留率。", code: lines(
        "complete=(order_level.order_status.eq('delivered')&order_level.order_delivered_customer_date.notna()&order_level.order_estimated_delivery_date.notna())",
        "model_df=order_level.loc[complete].copy(); model_df['promise_days']=(model_df.order_estimated_delivery_date-model_df.order_purchase_timestamp).dt.total_seconds()/86400",
        "model_df=model_df.query('promise_days>0').copy(); model_df['late']=(model_df.order_delivered_customer_date>model_df.order_estimated_delivery_date).astype(int)",
        "model_df['month']=model_df.order_purchase_timestamp.dt.month; model_df['weekday']=model_df.order_purchase_timestamp.dt.dayofweek; model_df=model_df.sort_values('order_purchase_timestamp').reset_index(drop=True)",
        "print('建模订单:',len(model_df),'保留率:',f'{len(model_df)/len(orders):.1%}','延期率:',f'{model_df.late.mean():.2%}')"
      )},
      { title: "4. 探索延期率与类别不平衡", explanation: "观察月份、承诺时长和订单规模的差异，但不把描述性相关解释为延期原因。", code: lines(
        "model_df['promise_group']=pd.qcut(model_df.promise_days,4,duplicates='drop')",
        "month_rate=model_df.groupby('month').late.agg(['size','mean']); promise_rate=model_df.groupby('promise_group',observed=True).late.agg(['size','mean'])",
        "print('月份延期率:\\n',month_rate.round(3)); print('承诺时长分组延期率:\\n',promise_rate.round(3)); print('多数类准确率:',f'{max(model_df.late.mean(),1-model_df.late.mean()):.2%}')"
      )},
      { title: "5. 泄漏审计与时间顺序划分", explanation: "用早期订单训练、中期订单验证、晚期订单测试，模拟模型面对未来数据。", code: lines(
        "num=['item_count','goods_value','freight_value','seller_count','month','weekday','promise_days']; cat=['customer_state','seller_state']; features=num+cat",
        "forbidden=['order_delivered_customer_date','order_delivered_carrier_date','order_status']; assert not set(features)&set(forbidden)",
        "train_end=int(len(model_df)*.64); val_end=int(len(model_df)*.80); train=model_df.iloc[:train_end]; val=model_df.iloc[train_end:val_end]; test=model_df.iloc[val_end:]",
        "print('禁止字段:',forbidden); print('训练/验证/测试:',len(train),len(val),len(test)); print('延期率:',*[f'{part.late.mean():.2%}' for part in [train,val,test]])",
        "print('训练截止:',train.order_purchase_timestamp.max(),'测试开始:',test.order_purchase_timestamp.min())"
      )},
      { title: "6. 预处理Pipeline与概率基线", explanation: "类别编码、数值缩放和模型封装为统一流程；Dummy概率作为最低基线。", code: lines(
        "from sklearn.compose import ColumnTransformer", "from sklearn.preprocessing import OneHotEncoder,StandardScaler", "from sklearn.pipeline import Pipeline", "from sklearn.dummy import DummyClassifier", "from sklearn.metrics import average_precision_score",
        "preprocess=ColumnTransformer([('cat',OneHotEncoder(handle_unknown='ignore'),cat),('num',StandardScaler(),num)])",
        "dummy=DummyClassifier(strategy='prior').fit(train[features],train.late); dummy_prob=dummy.predict_proba(val[features])[:,1]",
        "print('验证集正类率:',round(val.late.mean(),3),'Dummy PR-AUC:',round(average_precision_score(val.late,dummy_prob),3))"
      )},
      { title: "7. 比较逻辑回归与随机森林", explanation: "在同一验证集上比较两个常见分类器，测试集仍保持未查看。", code: lines(
        "from sklearn.linear_model import LogisticRegression", "from sklearn.ensemble import RandomForestClassifier",
        "models={'逻辑回归':Pipeline([('prep',preprocess),('model',LogisticRegression(max_iter=700,class_weight='balanced'))]),'随机森林':Pipeline([('prep',preprocess),('model',RandomForestClassifier(n_estimators=160,min_samples_leaf=8,class_weight='balanced',n_jobs=-1,random_state=106))])}",
        "rows=[]",
        "for name,model in models.items():",
        "    model.fit(train[features],train.late); rows.append([name,average_precision_score(val.late,model.predict_proba(val[features])[:,1])])",
        "validation=pd.DataFrame(rows,columns=['model','validation_PR_AUC']).sort_values('validation_PR_AUC',ascending=False); display(validation.round(3))",
        "best_name=validation.iloc[0].model; dev=model_df.iloc[:val_end]; best_model=models[best_name].fit(dev[features],dev.late); probability=best_model.predict_proba(test[features])[:,1]"
      )},
      { title: "8. 测试集概率指标与阈值比较", explanation: "PR-AUC是主指标，并比较不同Top-K比例下的精确率、召回率和Lift。", code: lines(
        "from sklearn.metrics import roc_auc_score,log_loss,confusion_matrix",
        "metrics=pd.Series({'ROC_AUC':roc_auc_score(test.late,probability),'PR_AUC':average_precision_score(test.late,probability),'LogLoss':log_loss(test.late,probability)})",
        "ranked=pd.DataFrame({'actual':test.late.to_numpy(),'probability':probability}).sort_values('probability',ascending=False); threshold_rows=[]",
        "for share in [.05,.10,.20]:",
        "    n=max(1,int(len(ranked)*share)); top=ranked.head(n); threshold_rows.append([f'{share:.0%}',top.probability.min(),top.actual.mean(),top.actual.sum()/ranked.actual.sum(),top.actual.mean()/ranked.actual.mean()])",
        "threshold_table=pd.DataFrame(threshold_rows,columns=['Top比例','概率阈值','Precision','Recall','Lift']); print(metrics.round(3).to_string()); display(threshold_table.round(3))",
        "threshold=threshold_table.loc[threshold_table['Top比例']=='10%','概率阈值'].iloc[0]; prediction=probability>=threshold; print('Top10%混淆矩阵:',confusion_matrix(test.late,prediction).tolist())"
      )},
      { title: "9. 错误类型与地区切片", explanation: "区分漏判与误报，并检查模型在主要客户州的错误率是否一致。", code: lines(
        "error_df=test[['customer_state','promise_days','item_count','late']].copy(); error_df['probability']=probability; error_df['prediction']=prediction",
        "error_df['error_type']=np.select([(error_df.late==1)&(~error_df.prediction),(error_df.late==0)&error_df.prediction],['漏判延期','误报延期'],default='判断正确')",
        "state_report=error_df.groupby('customer_state').agg(orders=('late','size'),late_rate=('late','mean'),mean_score=('probability','mean'),error_rate=('error_type',lambda x:(x!='判断正确').mean())).query('orders>=200').sort_values('error_rate',ascending=False)",
        "print(error_df.error_type.value_counts()); display(state_report.head(12).round(3))"
      )},
      { title: "10. 特征解释与模型局限", explanation: "用测试子样本计算置换重要性，并讨论数据缺失和预测边界。", code: lines(
        "from sklearn.inspection import permutation_importance",
        "sample_n=min(4000,len(test)); sample_idx=np.linspace(0,len(test)-1,sample_n,dtype=int)",
        "permutation=permutation_importance(best_model,test.iloc[sample_idx][features],test.iloc[sample_idx].late,n_repeats=3,scoring='average_precision',random_state=106,n_jobs=-1)",
        "importance=pd.Series(permutation.importances_mean,index=features).sort_values(ascending=False)",
        "print('最佳模型:',best_name); print('置换重要性:\\n',importance.round(4)); print('局限: 数据缺少距离、仓库节点、承运商和实时轨迹；地区特征的重要性不能解释为地区导致延期。')"
      )}
    ],
    conclusions: ["多表建模必须先统一到订单粒度", "标签可使用事后结果，但特征必须在预测时可获得", "时间顺序划分比随机划分更接近未来预测", "类别不平衡任务应联合观察PR-AUC、Recall和Lift"],
    acceptance: ["完成四表粒度与连接审计", "订单主键唯一且记录清洗口径", "排除实际发货、签收和最终状态字段", "比较Dummy和两个候选模型", "完成阈值、错误切片和置换重要性分析"]
  }),

  107: profile({
    summary: "使用 UCI Bike Sharing 小时数据，按照时间序列回归的教学流程预测共享单车小时需求。",
    objectives: ["审计时间索引和目标构成", "识别目标组成字段造成的直接泄漏", "构造周期时间特征", "使用时间顺序划分和季节基线", "比较随机森林与梯度提升", "通过残差切片和特征重要性理解模型"],
    background: "根据日历与天气信息预测全网下一时段的租赁需求。本章关注时间回归建模，不使用站点库存和OD信息，也不把相关性解释为天气的因果效应。",
    dataDictionary: [["timestamp", "日期与小时", "排序和切分依据"], ["workingday/weathersit", "工作日/天气", "已知场景特征"], ["temp/hum/windspeed", "气象变量", "归一化连续变量"], ["casual/registered", "需求组成", "直接构成目标，禁止作为特征"], ["cnt", "总租赁量", "回归目标"]],
    qualityChecks: ["时间重复、排序与缺失小时", "cnt是否等于casual加registered", "缺失值和变量范围", "训练时间严格早于测试", "目标组成字段泄漏", "总体误差之外的时段差异"],
    tasks: ["明确小时预测目标和预测提前量", "审计时间索引与目标构成", "识别并排除泄漏字段", "探索工作日、小时和天气差异", "构造小时与月份周期特征", "按时间划分训练、验证和测试", "建立季节基线并比较两个模型", "报告MAE、RMSE、R²与峰值识别", "分析残差切片和高误差时段", "解释特征重要性并总结局限"],
    codeCells: [
      { title: "1. 时间索引与数据质量审计", explanation: "组合日期和小时形成真正的时间主键，并检查排序、重复和缺失。", code: lines(
        "import numpy as np", "import pandas as pd", "from js import window",
        "df=pd.read_csv(f\"{window.location.origin}/datasets/bike_sharing_hour.csv\",parse_dates=['dteday'])",
        "df['timestamp']=df.dteday+pd.to_timedelta(df.hr,unit='h'); df=df.sort_values('timestamp').reset_index(drop=True)",
        "audit=pd.Series({'行数':len(df),'时间重复':df.timestamp.duplicated().sum(),'缺失值':df.isna().sum().sum(),'时间是否递增':df.timestamp.is_monotonic_increasing})",
        "print(audit.to_string()); print('时间范围:',df.timestamp.min(),'至',df.timestamp.max())"
      )},
      { title: "2. 目标构成与泄漏检查", explanation: "casual和registered相加就是cnt，若作为特征会让模型提前看到答案。", code: lines(
        "composition_error=(df.cnt!=df.casual+df.registered).sum(); forbidden=['casual','registered','cnt']",
        "print('目标构成错误:',composition_error); print('禁止进入特征:',forbidden); display(df[['cnt','casual','registered']].describe().round(1))"
      )},
      { title: "3. 探索小时、工作日与天气场景", explanation: "探索用于认识数据和设计误差切片，不把组间差异直接解释为因果作用。", code: lines(
        "hour_profile=df.groupby(['workingday','hr']).cnt.mean(); weather_profile=df.groupby('weathersit').agg(hours=('cnt','size'),mean_demand=('cnt','mean'),p90=('cnt',lambda x:x.quantile(.9)))",
        "print('工作日需求最高小时:\\n',hour_profile.loc[1].nlargest(5).round(1)); print('非工作日需求最高小时:\\n',hour_profile.loc[0].nlargest(5).round(1)); display(weather_profile.round(1))"
      )},
      { title: "4. 构造周期时间特征", explanation: "正余弦编码让23点和0点、12月和1月在特征空间中保持相邻。", code: lines(
        "df['hour_sin']=np.sin(2*np.pi*df.hr/24); df['hour_cos']=np.cos(2*np.pi*df.hr/24); df['month_sin']=np.sin(2*np.pi*df.mnth/12); df['month_cos']=np.cos(2*np.pi*df.mnth/12)",
        "features=['season','yr','mnth','hr','holiday','weekday','workingday','weathersit','temp','atemp','hum','windspeed','hour_sin','hour_cos','month_sin','month_cos']",
        "assert not set(features)&set(forbidden); print('特征数量:',len(features)); display(df[['hr','hour_sin','hour_cos','mnth','month_sin','month_cos']].head())"
      )},
      { title: "5. 时间划分与季节基线", explanation: "训练、验证和测试严格按时间排列；工作日×小时均值构成直观基线。", code: lines(
        "from sklearn.metrics import mean_absolute_error,mean_squared_error,r2_score",
        "train_end=int(len(df)*.64); val_end=int(len(df)*.80); train=df.iloc[:train_end]; val=df.iloc[train_end:val_end]; test=df.iloc[val_end:]",
        "baseline_profile=train.groupby(['workingday','hr']).cnt.mean(); val_baseline=np.array([baseline_profile.get((w,h),train.cnt.mean()) for w,h in zip(val.workingday,val.hr)])",
        "print('训练/验证/测试:',len(train),len(val),len(test)); print('训练截止:',train.timestamp.max(),'测试开始:',test.timestamp.min()); print('验证集季节基线MAE:',round(mean_absolute_error(val.cnt,val_baseline),1))"
      )},
      { title: "6. 比较随机森林与梯度提升", explanation: "在验证时段上比较两个非线性回归模型，最终测试时段保持独立。", code: lines(
        "from sklearn.ensemble import RandomForestRegressor,HistGradientBoostingRegressor",
        "models={'随机森林':RandomForestRegressor(n_estimators=180,min_samples_leaf=3,n_jobs=-1,random_state=107),'梯度提升':HistGradientBoostingRegressor(max_iter=220,max_leaf_nodes=20,l2_regularization=1,random_state=107)}",
        "rows=[]",
        "for name,model in models.items():",
        "    model.fit(train[features],train.cnt); rows.append([name,mean_absolute_error(val.cnt,model.predict(val[features]))])",
        "validation=pd.DataFrame(rows,columns=['model','validation_MAE']).sort_values('validation_MAE'); display(validation.round(1))",
        "best_name=validation.iloc[0].model; dev=df.iloc[:val_end]; best_model=models[best_name].fit(dev[features],dev.cnt); prediction=np.maximum(0,best_model.predict(test[features]))"
      )},
      { title: "7. 最终回归指标与峰值识别", explanation: "总体回归误差之外，再检查模型是否识别出真实高需求时段。", code: lines(
        "test_profile=dev.groupby(['workingday','hr']).cnt.mean(); test_baseline=np.array([test_profile.get((w,h),dev.cnt.mean()) for w,h in zip(test.workingday,test.hr)])",
        "metrics=pd.Series({'MAE':mean_absolute_error(test.cnt,prediction),'RMSE':mean_squared_error(test.cnt,prediction)**.5,'R2':r2_score(test.cnt,prediction),'Baseline_MAE':mean_absolute_error(test.cnt,test_baseline)})",
        "peak_threshold=dev.cnt.quantile(.9); actual_peak=test.cnt>=peak_threshold; predicted_peak=prediction>=peak_threshold",
        "peak_precision=((actual_peak)&(predicted_peak)).sum()/max(predicted_peak.sum(),1); peak_recall=((actual_peak)&(predicted_peak)).sum()/max(actual_peak.sum(),1)",
        "print('最佳模型:',best_name); print(metrics.round(2).to_string()); print('高需求阈值:',round(peak_threshold,1),'峰值Precision:',round(peak_precision,3),'峰值Recall:',round(peak_recall,3))"
      )},
      { title: "8. 构造残差并进行时间切片", explanation: "总体MAE可能掩盖特定小时、月份或工作日场景中的系统性误差。", code: lines(
        "errors=test[['timestamp','hr','mnth','workingday','weathersit','cnt']].copy(); errors['prediction']=prediction; errors['residual']=errors.cnt-errors.prediction; errors['absolute_error']=errors.residual.abs()",
        "hour_error=errors.groupby('hr').absolute_error.mean().nlargest(6); month_error=errors.groupby('mnth').absolute_error.mean().nlargest(4); workday_error=errors.groupby('workingday').absolute_error.agg(['count','mean','median'])",
        "print('误差最高小时:\\n',hour_error.round(1)); print('误差最高月份:\\n',month_error.round(1)); print('工作日切片:\\n',workday_error.round(1))"
      )},
      { title: "9. 检查高误差案例", explanation: "查看最大正负残差，判断模型在节假日、异常天气或需求突变时如何失效。", code: lines(
        "largest_under=errors.nlargest(6,'residual')[['timestamp','cnt','prediction','residual','workingday','weathersit']]",
        "largest_over=errors.nsmallest(6,'residual')[['timestamp','cnt','prediction','residual','workingday','weathersit']]",
        "print('明显低估案例:'); display(largest_under.round(1)); print('明显高估案例:'); display(largest_over.round(1))"
      )},
      { title: "10. 特征解释与模型局限", explanation: "置换重要性展示模型依赖的预测信号，并明确数据只能支持全网小时需求建模。", code: lines(
        "from sklearn.inspection import permutation_importance",
        "sample_n=min(3000,len(test)); sample_idx=np.linspace(0,len(test)-1,sample_n,dtype=int)",
        "permutation=permutation_importance(best_model,test.iloc[sample_idx][features],test.iloc[sample_idx].cnt,n_repeats=3,scoring='neg_mean_absolute_error',random_state=107,n_jobs=-1)",
        "importance=pd.Series(permutation.importances_mean,index=features).sort_values(ascending=False)",
        "print('置换重要性前10:\\n',importance.head(10).round(2)); print('局限: 数据没有站点库存、OD流向和未来天气预报，不能据此完成站点级调度或因果解释。')"
      )}
    ],
    conclusions: ["时间数据不能随机打乱后评价未来表现", "目标组成字段是最直接的数据泄漏", "季节基线能判断复杂模型是否真正提供增益", "总体误差必须结合峰值和时间切片理解"],
    acceptance: ["完成时间索引和目标构成审计", "排除casual与registered", "使用严格时间三段划分", "比较季节基线和两个模型", "报告回归指标、峰值指标和误差切片", "完成高误差案例与置换重要性分析"]
  }),

  108: profile({
    summary: "使用 UCI Bank Marketing 公开数据，按照二分类教学流程建立客户响应预测模型，重点学习事后泄漏、类别不平衡和阈值评价。",
    objectives: ["审计重复、unknown和正类比例", "识别并排除duration事后泄漏", "使用分层训练验证测试划分", "建立混合类型预处理Pipeline", "比较Dummy、逻辑回归和随机森林", "使用PR-AUC、Top-K、错误切片和特征重要性理解模型"],
    background: "目标是在通话开始前预测客户是否可能认购定期存款。模型学习历史响应关系，不回答一次电话是否会对特定客户产生因果增量。",
    dataDictionary: [["age/job/education", "客户画像", "数值与类别特征"], ["duration", "本次通话时长", "通话结束后才知道，禁止使用"], ["campaign/pdays/previous", "接触历史", "活动相关特征"], ["poutcome", "上次活动结果", "历史信号"], ["y", "是否认购", "二分类目标"]],
    qualityChecks: ["分号分隔及字段类型", "unknown的数量和含义", "重复记录与campaign长尾", "正类比例和多数类准确率", "duration事后泄漏", "三组数据的类别比例"],
    tasks: ["明确通话前预测时点与目标", "审计数据质量和类别不平衡", "清理重复并探索响应差异", "识别duration等禁止字段", "分层划分训练、验证和测试", "建立混合类型预处理Pipeline", "比较Dummy、逻辑回归和随机森林", "评价PR-AUC、阈值、Lift与覆盖率", "分析错误类型和客户分组", "解释特征重要性并总结模型局限"],
    codeCells: [
      { title: "1. 原始数据质量与类别不平衡审计", explanation: "检查分隔符、重复、unknown、目标比例和长尾变量。", code: lines(
        "import numpy as np", "import pandas as pd", "from js import window",
        "raw = pd.read_csv(\"/datasets/bank_marketing_full.csv\", sep=\";\")",
        "unknown = (",
        "    raw.astype(str) == \"unknown\"",
        ").sum().sort_values(ascending=False)",
        "positive_rate = (raw[\"y\"] == \"yes\").mean()",
        "majority_accuracy = max(positive_rate, 1 - positive_rate)",
        "audit = pd.Series(",
        "    {",
        "        \"行数\": len(raw),",
        "        \"重复\": raw.duplicated().sum(),",
        "        \"正类率\": positive_rate,",
        "        \"多数类准确率\": majority_accuracy,",
        "        \"campaign_P99\": raw[\"campaign\"].quantile(0.99),",
        "    }",
        ")",
        "print(audit.round(3).to_string())",
        "print(\"unknown 最多字段：\\n\", unknown.head(8))"
      )},
      { title: "2. 清理重复并探索响应差异", explanation: "unknown保留为显式类别，因为未知并不等于否；描述性组间差异不代表营销因果效果。", code: lines(
        "df=raw.drop_duplicates().copy(); df['target']=(df.y=='yes').astype(int)",
        "job_response=df.groupby('job').target.agg(['size','mean']).query('size>=200').sort_values('mean',ascending=False)",
        "contact_response=df.groupby('contact').target.agg(['size','mean']).sort_values('mean',ascending=False)",
        "print('清理后:',len(df),'正类率:',f'{df.target.mean():.2%}'); display(job_response.round(3)); display(contact_response.round(3))"
      )},
      { title: "3. 定义预测时点并检查泄漏", explanation: "duration只有通话结束后才能获得，在通话前响应预测中属于典型事后泄漏。", code: lines(
        "forbidden=['y','target','duration']; features=[column for column in df.columns if column not in forbidden]",
        "assert not set(features)&set(forbidden)",
        "print('预测时点: 通话开始前'); print('禁止字段:',forbidden); print('可用特征数量:',len(features)); print('duration与目标的组间均值仅用于说明泄漏风险:\\n',df.groupby('target').duration.mean().round(1))"
      )},
      { title: "4. 分层划分与Dummy基线", explanation: "分层划分保持三组正类比例一致；验证集选模型，测试集只用于最终评价。", code: lines(
        "from sklearn.model_selection import train_test_split", "from sklearn.dummy import DummyClassifier", "from sklearn.metrics import average_precision_score",
        "X=df[features]; y=df.target; X_dev,X_test,y_dev,y_test=train_test_split(X,y,test_size=.2,stratify=y,random_state=108); X_train,X_val,y_train,y_val=train_test_split(X_dev,y_dev,test_size=.2,stratify=y_dev,random_state=108)",
        "dummy=DummyClassifier(strategy='prior').fit(X_train,y_train); dummy_probability=dummy.predict_proba(X_val)[:,1]",
        "print('训练/验证/测试:',len(X_train),len(X_val),len(X_test)); print('正类率:',*[round(part.mean(),3) for part in [y_train,y_val,y_test]]); print('Dummy PR-AUC:',round(average_precision_score(y_val,dummy_probability),3))"
      )},
      { title: "5. 建立混合类型预处理Pipeline", explanation: "类别变量独热编码、数值变量标准化，并把预处理与模型绑定，避免数据处理泄漏。", code: lines(
        "from sklearn.compose import ColumnTransformer", "from sklearn.preprocessing import OneHotEncoder,StandardScaler", "from sklearn.pipeline import Pipeline",
        "cat=X_train.select_dtypes('object').columns.tolist(); num=[column for column in features if column not in cat]",
        "preprocess=ColumnTransformer([('cat',OneHotEncoder(handle_unknown='ignore'),cat),('num',StandardScaler(),num)])",
        "print('类别特征:',len(cat),'数值特征:',len(num)); print('类别示例:',cat[:6]); print('数值示例:',num[:6])"
      )},
      { title: "6. 比较逻辑回归与随机森林", explanation: "两个模型使用相同数据和预处理，在验证集PR-AUC上进行公平比较。", code: lines(
        "from sklearn.linear_model import LogisticRegression", "from sklearn.ensemble import RandomForestClassifier",
        "models={'逻辑回归':Pipeline([('prep',preprocess),('model',LogisticRegression(max_iter=700,class_weight='balanced'))]),'随机森林':Pipeline([('prep',preprocess),('model',RandomForestClassifier(n_estimators=180,min_samples_leaf=10,class_weight='balanced',n_jobs=-1,random_state=108))])}",
        "rows=[]",
        "for name,model in models.items():",
        "    model.fit(X_train,y_train); rows.append([name,average_precision_score(y_val,model.predict_proba(X_val)[:,1])])",
        "validation=pd.DataFrame(rows,columns=['model','validation_PR_AUC']).sort_values('validation_PR_AUC',ascending=False); display(validation.round(3))",
        "best_name=validation.iloc[0].model; best_model=models[best_name].fit(X_dev,y_dev); probability=best_model.predict_proba(X_test)[:,1]"
      )},
      { title: "7. 测试集概率指标评价", explanation: "类别不平衡时以PR-AUC为主，同时报告ROC-AUC和概率损失。", code: lines(
        "from sklearn.metrics import roc_auc_score,log_loss",
        "metrics=pd.Series({'ROC_AUC':roc_auc_score(y_test,probability),'PR_AUC':average_precision_score(y_test,probability),'LogLoss':log_loss(y_test,probability),'正类率':y_test.mean()})",
        "print('最佳模型:',best_name); print(metrics.round(3).to_string())"
      )},
      { title: "8. 比较Top-K阈值、Lift与覆盖率", explanation: "Top-K用于教学性阈值评价，展示精确率、召回率和Lift之间的权衡。", code: lines(
        "from sklearn.metrics import confusion_matrix",
        "ranked=pd.DataFrame({'row_id':X_test.index,'actual':y_test.to_numpy(),'probability':probability}).sort_values('probability',ascending=False); threshold_rows=[]",
        "for share in [.05,.10,.20]:",
        "    n=max(1,int(len(ranked)*share)); top=ranked.head(n); threshold_rows.append([f'{share:.0%}',top.probability.min(),top.actual.mean(),top.actual.sum()/ranked.actual.sum(),top.actual.mean()/ranked.actual.mean()])",
        "threshold_table=pd.DataFrame(threshold_rows,columns=['Top比例','概率阈值','Precision','Recall','Lift']); display(threshold_table.round(3))",
        "threshold=threshold_table.loc[threshold_table['Top比例']=='10%','概率阈值'].iloc[0]; prediction=probability>=threshold; print('Top10%混淆矩阵:',confusion_matrix(y_test,prediction).tolist())"
      )},
      { title: "9. 错误类型与客户分组", explanation: "区分漏判响应与误报响应，并比较年龄段中的实际率、平均评分和错误率。", code: lines(
        "error_df=X_test[['age','job','contact','campaign']].copy(); error_df['actual']=y_test; error_df['probability']=probability; error_df['prediction']=prediction",
        "error_df['error_type']=np.select([(error_df.actual==1)&(~error_df.prediction),(error_df.actual==0)&error_df.prediction],['漏判响应','误报响应'],default='判断正确')",
        "error_df['age_group']=pd.cut(error_df.age,[0,30,45,60,120],labels=['<=30','31-45','46-60','60+'])",
        "age_report=error_df.groupby('age_group',observed=True).agg(customers=('actual','size'),actual_rate=('actual','mean'),mean_score=('probability','mean'),error_rate=('error_type',lambda x:(x!='判断正确').mean()))",
        "print(error_df.error_type.value_counts()); display(age_report.round(3))"
      )},
      { title: "10. 特征解释与模型局限", explanation: "置换重要性说明模型主要利用哪些历史信号，同时强调响应预测不等于干预效果预测。", code: lines(
        "from sklearn.inspection import permutation_importance",
        "sample_n=min(3000,len(X_test)); sample_idx=np.linspace(0,len(X_test)-1,sample_n,dtype=int)",
        "permutation=permutation_importance(best_model,X_test.iloc[sample_idx],y_test.iloc[sample_idx],n_repeats=3,scoring='average_precision',random_state=108,n_jobs=-1)",
        "importance=pd.Series(permutation.importances_mean,index=features).sort_values(ascending=False)",
        "print('置换重要性前10:\\n',importance.head(10).round(4)); print('局限: 数据来自历史营销活动，unknown较多且存在选择机制；响应概率不能解释电话带来的个体因果增量。')"
      )}
    ],
    conclusions: ["预测时点决定duration为什么必须排除", "分层划分保证类别不平衡下的可比性", "PR-AUC和Top-K指标比准确率更有信息", "响应预测模型不等于因果增量模型"],
    acceptance: ["完成重复、unknown和类别比例审计", "排除duration及目标字段", "完成分层三级划分和Dummy基线", "比较两个Pipeline模型", "报告PR-AUC、Top-K、Lift与混淆矩阵", "完成错误分组与置换重要性分析"]
  })
};
