import { machineLearningProfiles as coreProfiles } from "./course-content-machine-learning.mjs";

const lines = (...items) => items.join("\n");
const make = ({ summary, objectives, concepts, setup, demo, pitfalls, practiceCode, practiceAssert }) => ({
  summary,
  objectives,
  concepts,
  examples: [
    { title: "数据与问题定义", explanation: "先明确样本、特征、目标和验证方式，再训练模型。", code: setup },
    { title: "模型、公式与诊断", explanation: "把核心数学量映射到 sklearn 输出，并检查泛化表现。", code: demo }
  ],
  pitfalls,
  practice: ["修改一个关键参数并重新运行", "记录指标变化并解释原因", "检查结论是否依赖测试集或隐藏泄漏"],
  practiceCode,
  practiceAssert
});

export const machineLearningProfiles = {
  ...coreProfiles,
  90: make({
    summary: "使用随机森林回归捕捉非线性关系，并通过袋外误差、测试误差和置换重要性评价模型。",
    objectives: ["训练 RandomForestRegressor", "理解集成平均公式", "比较 OOB、训练与测试误差", "使用置换重要性解释回归模型"],
    concepts: ["集成预测：\\(\\hat f(x)=B^{-1}\\sum_{b=1}^B f_b(x)\\)", "Bootstrap 降低树之间的相关性", "min_samples_leaf 控制局部平滑程度", "重要性描述预测依赖，不代表因果影响"],
    setup: lines(
      "from sklearn.datasets import load_diabetes",
      "from sklearn.model_selection import train_test_split",
      "from sklearn.ensemble import RandomForestRegressor",
      "data=load_diabetes(as_frame=True); X,y=data.data,data.target",
      "X_train,X_test,y_train,y_test=train_test_split(X,y,test_size=.25,random_state=90)",
      "forest=RandomForestRegressor(n_estimators=300,min_samples_leaf=5,oob_score=True,n_jobs=-1,random_state=90).fit(X_train,y_train)",
      "print('样本/特征:',X.shape,' OOB R2:',round(forest.oob_score_,3))"
    ),
    demo: lines(
      "import pandas as pd",
      "from sklearn.metrics import mean_absolute_error,mean_squared_error,r2_score",
      "from sklearn.inspection import permutation_importance",
      "pred=forest.predict(X_test)",
      "metrics={'MAE':mean_absolute_error(y_test,pred),'RMSE':mean_squared_error(y_test,pred)**.5,'R2':r2_score(y_test,pred)}",
      "print({k:round(v,3) for k,v in metrics.items()})",
      "perm=permutation_importance(forest,X_test,y_test,n_repeats=10,random_state=90,n_jobs=-1)",
      "display(pd.Series(perm.importances_mean,index=X.columns).sort_values(ascending=False).head())"
    ),
    pitfalls: ["用训练 R² 评价泛化", "把树数量当作主要正则化参数", "将特征重要性解释为因果", "忽略随机森林对训练内存和预测延迟的影响"],
    practiceCode: lines(
      "rows=[]",
      "for leaf in [1,5,15]:",
      "    m=RandomForestRegressor(n_estimators=150,min_samples_leaf=leaf,n_jobs=-1,random_state=90).fit(X_train,y_train)",
      "    p=m.predict(X_test); rows.append([leaf,mean_absolute_error(y_test,p),r2_score(y_test,p)])",
      "practice_result=pd.DataFrame(rows,columns=['min_leaf','MAE','R2']); display(practice_result.round(3))"
    ),
    practiceAssert: "assert len(practice_result)==3\nassert practice_result.MAE.gt(0).all()"
  }),
  91: make({
    summary: "理解梯度提升的加法模型，比较学习率、迭代轮数和叶节点复杂度。",
    objectives: ["解释逐轮拟合残差", "训练 HistGradientBoostingRegressor", "理解 learning_rate 与 max_iter", "使用早停控制过拟合"],
    concepts: ["加法更新：\\(F_m(x)=F_{m-1}(x)+\\eta h_m(x)\\)", "负梯度给出下一轮拟合方向", "较小学习率通常需要更多迭代", "验证集早停属于模型选择的一部分"],
    setup: lines(
      "from sklearn.datasets import load_diabetes",
      "from sklearn.model_selection import train_test_split",
      "from sklearn.ensemble import HistGradientBoostingRegressor",
      "from sklearn.metrics import mean_absolute_error",
      "data=load_diabetes(as_frame=True); X,y=data.data,data.target",
      "X_train,X_test,y_train,y_test=train_test_split(X,y,test_size=.25,random_state=91)"
    ),
    demo: lines(
      "import pandas as pd",
      "rows=[]",
      "for rate,iters in [(.03,300),(.06,180),(.1,100)]:",
      "    m=HistGradientBoostingRegressor(learning_rate=rate,max_iter=iters,max_leaf_nodes=10,l2_regularization=1,random_state=91).fit(X_train,y_train)",
      "    rows.append([rate,iters,m.n_iter_,mean_absolute_error(y_test,m.predict(X_test))])",
      "result=pd.DataFrame(rows,columns=['learning_rate','max_iter','actual_iter','MAE']); display(result.round(3))"
    ),
    pitfalls: ["同时增大学习率和模型复杂度", "在测试集上进行大量参数尝试", "认为 boosting 总会优于简单基线", "没有报告训练时间和模型复杂度"],
    practiceCode: lines(
      "practice=[]",
      "for leaves in [5,10,20]:",
      "    m=HistGradientBoostingRegressor(max_leaf_nodes=leaves,max_iter=180,learning_rate=.06,random_state=91).fit(X_train,y_train)",
      "    practice.append([leaves,mean_absolute_error(y_test,m.predict(X_test))])",
      "practice_result=pd.DataFrame(practice,columns=['leaves','MAE']); display(practice_result)"
    ),
    practiceAssert: "assert practice_result.MAE.gt(0).all()"
  }),
  92: make({
    summary: "处理多分类问题，理解 Softmax 概率、宏平均与加权平均指标。",
    objectives: ["训练多分类逻辑回归", "解释 Softmax 概率", "读取每类精确率与召回率", "区分 macro、micro 和 weighted 平均"],
    concepts: ["Softmax：\\(P(y=k|x)=e^{z_k}/\\sum_j e^{z_j}\\)", "每行类别概率之和为 1", "macro 对每个类别等权", "weighted 按类别样本量加权"],
    setup: lines(
      "from sklearn.datasets import load_wine",
      "from sklearn.model_selection import train_test_split",
      "from sklearn.pipeline import make_pipeline",
      "from sklearn.preprocessing import StandardScaler",
      "from sklearn.linear_model import LogisticRegression",
      "data=load_wine(as_frame=True); X,y=data.data,data.target",
      "X_train,X_test,y_train,y_test=train_test_split(X,y,stratify=y,random_state=92)",
      "model=make_pipeline(StandardScaler(),LogisticRegression(max_iter=1000)).fit(X_train,y_train)"
    ),
    demo: lines(
      "import pandas as pd",
      "from sklearn.metrics import classification_report,log_loss",
      "prob=model.predict_proba(X_test); pred=model.predict(X_test)",
      "print('概率行和:',prob[:3].sum(axis=1).round(6))",
      "print('多分类log loss:',round(log_loss(y_test,prob),3))",
      "report=pd.DataFrame(classification_report(y_test,pred,target_names=data.target_names,output_dict=True)).T",
      "display(report.round(3))"
    ),
    pitfalls: ["只报告总体准确率", "将类别编号解释成连续数值", "忽略少数类别召回率", "把 OvR 或 Softmax 的系数直接当成因果效应"],
    practiceCode: lines(
      "from sklearn.metrics import f1_score",
      "practice_scores={avg:f1_score(y_test,pred,average=avg) for avg in ['macro','micro','weighted']}",
      "print({k:round(v,3) for k,v in practice_scores.items()})"
    ),
    practiceAssert: "assert set(practice_scores)=={'macro','micro','weighted'}"
  }),
  93: make({
    summary: "从混淆矩阵手算准确率、精确率、召回率和 F1，建立指标与错误成本的联系。",
    objectives: ["识别 TN、FP、FN、TP", "手算 Precision、Recall 与 F1", "使用 classification_report", "根据业务错误成本选择指标"],
    concepts: ["Precision=TP/(TP+FP)", "Recall=TP/(TP+FN)", "F1=2PR/(P+R)", "指标选择取决于漏判与误报成本"],
    setup: lines(
      "from sklearn.datasets import load_breast_cancer",
      "from sklearn.model_selection import train_test_split",
      "from sklearn.linear_model import LogisticRegression",
      "from sklearn.pipeline import make_pipeline",
      "from sklearn.preprocessing import StandardScaler",
      "data=load_breast_cancer(as_frame=True); X,y=data.data,data.target",
      "X_train,X_test,y_train,y_test=train_test_split(X,y,stratify=y,random_state=93)",
      "model=make_pipeline(StandardScaler(),LogisticRegression(max_iter=1000)).fit(X_train,y_train)",
      "pred=model.predict(X_test)"
    ),
    demo: lines(
      "from sklearn.metrics import confusion_matrix,precision_score,recall_score,f1_score",
      "tn,fp,fn,tp=confusion_matrix(y_test,pred).ravel()",
      "precision=tp/(tp+fp); recall=tp/(tp+fn); f1=2*precision*recall/(precision+recall)",
      "print({'TN':tn,'FP':fp,'FN':fn,'TP':tp})",
      "print('手算:',round(precision,3),round(recall,3),round(f1,3))",
      "print('sklearn:',round(precision_score(y_test,pred),3),round(recall_score(y_test,pred),3),round(f1_score(y_test,pred),3))"
    ),
    pitfalls: ["未确认正类定义", "类别不平衡时只看准确率", "把精确率和召回率混淆", "没有把指标转换成实际错误数量"],
    practiceCode: lines(
      "practice_matrix=confusion_matrix(y_test,pred)",
      "practice_total=practice_matrix.sum()",
      "practice_accuracy=(practice_matrix[0,0]+practice_matrix[1,1])/practice_total",
      "print('accuracy:',round(practice_accuracy,3))"
    ),
    practiceAssert: "assert abs(practice_accuracy-model.score(X_test,y_test))<1e-12"
  }),
  94: make({
    summary: "使用 ROC、PR 曲线和阈值表评估概率排序，并根据成本选择决策阈值。",
    objectives: ["计算 ROC-AUC 与 PR-AUC", "理解 TPR、FPR 和 Precision", "生成阈值性能表", "按错误成本选择阈值"],
    concepts: ["TPR=TP/(TP+FN)", "FPR=FP/(FP+TN)", "PR-AUC 更关注正类稀少任务", "阈值选择不能依赖最终测试集"],
    setup: lines(
      "import numpy as np",
      "from sklearn.datasets import load_breast_cancer",
      "from sklearn.model_selection import train_test_split",
      "from sklearn.pipeline import make_pipeline",
      "from sklearn.preprocessing import StandardScaler",
      "from sklearn.linear_model import LogisticRegression",
      "from sklearn.metrics import roc_auc_score,average_precision_score,precision_score,recall_score",
      "data=load_breast_cancer(as_frame=True); X,y=data.data,data.target",
      "X_train,X_test,y_train,y_test=train_test_split(X,y,stratify=y,random_state=94)",
      "model=make_pipeline(StandardScaler(),LogisticRegression(max_iter=1000)).fit(X_train,y_train)",
      "prob=model.predict_proba(X_test)[:,1]"
    ),
    demo: lines(
      "import pandas as pd",
      "print('ROC-AUC/PR-AUC:',round(roc_auc_score(y_test,prob),3),round(average_precision_score(y_test,prob),3))",
      "rows=[]",
      "for t in np.arange(.1,1,.1):",
      "    p=prob>=t; rows.append([t,precision_score(y_test,p),recall_score(y_test,p),p.mean()])",
      "thresholds=pd.DataFrame(rows,columns=['threshold','precision','recall','positive_rate'])",
      "display(thresholds.round(3))"
    ),
    pitfalls: ["AUC 高就忽略阈值表现", "在测试集上挑阈值", "正类比例变化后仍沿用旧 PR 基线", "没有考虑复核容量"],
    practiceCode: lines(
      "eligible=thresholds.query('recall>=0.95')",
      "selected_threshold=float(eligible.loc[eligible.precision.idxmax(),'threshold'])",
      "print('满足召回约束的高精确率阈值:',selected_threshold)"
    ),
    practiceAssert: "assert 0<selected_threshold<1"
  }),
  95: make({
    summary: "针对不平衡分类比较类别权重、PR-AUC、Top-K Lift 和覆盖率。",
    objectives: ["建立 Dummy 基线", "使用 class_weight", "计算 Top-K Lift", "结合营销或审核容量评价模型"],
    concepts: ["PR 基线约等于正类比例", "Lift@k=Top-k正类率/总体正类率", "类别权重改变损失贡献", "响应概率不等于干预增量"],
    setup: lines(
      "import pandas as pd",
      "from js import window",
      "df=pd.read_csv(f\"{window.location.origin}/datasets/bank_marketing_full.csv\",sep=';')",
      "df['target']=(df.y=='yes').astype(int)",
      "features=['age','campaign','pdays','previous','emp.var.rate','cons.price.idx','euribor3m','nr.employed']",
      "from sklearn.model_selection import train_test_split",
      "X_train,X_test,y_train,y_test=train_test_split(df[features],df.target,stratify=df.target,random_state=95)"
    ),
    demo: lines(
      "from sklearn.pipeline import make_pipeline",
      "from sklearn.preprocessing import StandardScaler",
      "from sklearn.linear_model import LogisticRegression",
      "from sklearn.metrics import average_precision_score",
      "model=make_pipeline(StandardScaler(),LogisticRegression(max_iter=500,class_weight='balanced')).fit(X_train,y_train)",
      "prob=model.predict_proba(X_test)[:,1]",
      "ranked=pd.DataFrame({'y':y_test.to_numpy(),'p':prob}).sort_values('p',ascending=False)",
      "for share in [.05,.1,.2]:",
      "    top=ranked.head(int(len(ranked)*share)); print(share,'PR-AUC',round(average_precision_score(y_test,prob),3),'lift',round(top.y.mean()/ranked.y.mean(),2),'coverage',round(top.y.sum()/ranked.y.sum(),3))"
    ),
    pitfalls: ["只报告准确率", "把过采样放在切分之前", "Top-K 结果不报告名单规模", "把高响应评分称为因果 uplift"],
    practiceCode: lines(
      "k=int(len(ranked)*.1); top10=ranked.head(k)",
      "practice_lift=top10.y.mean()/ranked.y.mean()",
      "print('Top10 lift:',round(practice_lift,2))"
    ),
    practiceAssert: "assert practice_lift>1"
  }),
  96: make({
    summary: "检查分类概率是否可信，并使用校准曲线、Brier Score 和 CalibratedClassifierCV 改善概率。",
    objectives: ["区分排序与校准", "计算 Brier Score", "读取校准分箱", "使用交叉验证校准模型"],
    concepts: ["Brier=\\(n^{-1}\\sum_i(p_i-y_i)^2\\)", "校准概率 0.7 应约有 70% 正例", "sigmoid 稳健、isotonic 更灵活", "校准必须使用独立数据或内部交叉验证"],
    setup: lines(
      "from sklearn.datasets import load_breast_cancer",
      "from sklearn.model_selection import train_test_split",
      "from sklearn.ensemble import RandomForestClassifier",
      "from sklearn.calibration import CalibratedClassifierCV,calibration_curve",
      "from sklearn.metrics import brier_score_loss,roc_auc_score",
      "data=load_breast_cancer(as_frame=True); X,y=data.data,data.target",
      "X_train,X_test,y_train,y_test=train_test_split(X,y,stratify=y,random_state=96)"
    ),
    demo: lines(
      "import pandas as pd",
      "base=RandomForestClassifier(n_estimators=200,min_samples_leaf=3,random_state=96)",
      "raw=base.fit(X_train,y_train); calibrated=CalibratedClassifierCV(base,method='sigmoid',cv=5).fit(X_train,y_train)",
      "rows=[]",
      "for name,m in [('raw',raw),('calibrated',calibrated)]:",
      "    p=m.predict_proba(X_test)[:,1]; rows.append([name,brier_score_loss(y_test,p),roc_auc_score(y_test,p)])",
      "display(pd.DataFrame(rows,columns=['model','Brier','ROC_AUC']).set_index('model').round(4))",
      "obs,forecast=calibration_curve(y_test,calibrated.predict_proba(X_test)[:,1],n_bins=6)",
      "display(pd.DataFrame({'预测概率':forecast,'实际比例':obs}).round(3))"
    ),
    pitfalls: ["AUC 高就认为概率可信", "在测试集上拟合校准器", "小样本使用过细的校准分箱", "部署后不监控概率漂移"],
    practiceCode: lines(
      "practice_brier={name:brier_score_loss(y_test,m.predict_proba(X_test)[:,1]) for name,m in [('raw',raw),('calibrated',calibrated)]}",
      "print(practice_brier)"
    ),
    practiceAssert: "assert all(0<=v<=1 for v in practice_brier.values())"
  }),
  97: make({
    summary: "将 K-Means 用于客户分群，结合轮廓系数、簇规模和业务画像解释分群。",
    objectives: ["构造客户级 RFM 特征", "标准化后聚类", "比较多个簇数", "输出可行动的簇画像"],
    concepts: ["目标：\\(\\min_\\mu\\sum_i\\min_k||x_i-\\mu_k||^2\\)", "簇编号没有大小含义", "轮廓系数兼顾簇内紧密和簇间分离", "分群稳定性比单次最优分数更重要"],
    setup: lines(
      "import pandas as pd",
      "from js import window",
      "sales=pd.read_csv(f\"{window.location.origin}/datasets/uci_online_retail_200k.csv\",parse_dates=['InvoiceDate'])",
      "sales=sales[(sales.Quantity>0)&(sales.UnitPrice>0)&sales.CustomerID.notna()].copy()",
      "sales['revenue']=sales.Quantity*sales.UnitPrice; snapshot=sales.InvoiceDate.max()+pd.Timedelta(days=1)",
      "rfm=sales.groupby('CustomerID').agg(recency=('InvoiceDate',lambda x:(snapshot-x.max()).days),frequency=('InvoiceNo','nunique'),monetary=('revenue','sum')).clip(lower=0)"
    ),
    demo: lines(
      "import numpy as np",
      "from sklearn.preprocessing import StandardScaler",
      "from sklearn.cluster import KMeans",
      "from sklearn.metrics import silhouette_score",
      "features=np.log1p(rfm); Xs=StandardScaler().fit_transform(features)",
      "scores={}; models={}",
      "for k in range(2,7):",
      "    models[k]=KMeans(n_clusters=k,n_init=20,random_state=97).fit(Xs); scores[k]=silhouette_score(Xs,models[k].labels_)",
      "best_k=max(scores,key=scores.get); rfm['cluster']=models[best_k].labels_",
      "print('scores:',{k:round(v,3) for k,v in scores.items()})",
      "display(rfm.groupby('cluster').agg(customers=('monetary','size'),recency=('recency','median'),frequency=('frequency','median'),monetary=('monetary','median')).round(1))"
    ),
    pitfalls: ["在交易行而非客户粒度聚类", "金额偏态不处理", "把簇编号写成价值等级", "没有验证不同随机种子下的稳定性"],
    practiceCode: lines(
      "practice_sizes=rfm.cluster.value_counts()",
      "print(practice_sizes.sort_index())"
    ),
    practiceAssert: "assert practice_sizes.sum()==len(rfm)\nassert practice_sizes.size==best_k"
  }),
  98: make({
    summary: "比较层次聚类和 DBSCAN，理解连接方式、密度邻域和噪声点。",
    objectives: ["训练 AgglomerativeClustering", "理解 linkage", "训练 DBSCAN", "识别噪声标签 -1"],
    concepts: ["层次聚类逐步合并最近簇", "single/complete/ward 定义不同簇间距离", "DBSCAN 使用 eps 与 min_samples 定义核心点", "密度方法可发现非球形簇和噪声"],
    setup: lines(
      "from sklearn.datasets import make_moons",
      "from sklearn.preprocessing import StandardScaler",
      "X,y=make_moons(n_samples=500,noise=.08,random_state=98)",
      "Xs=StandardScaler().fit_transform(X)"
    ),
    demo: lines(
      "import pandas as pd",
      "from sklearn.cluster import AgglomerativeClustering,DBSCAN",
      "from sklearn.metrics import silhouette_score,adjusted_rand_score",
      "agg=AgglomerativeClustering(n_clusters=2,linkage='ward').fit(Xs)",
      "db=DBSCAN(eps=.25,min_samples=6).fit(Xs)",
      "rows=[['层次聚类',len(set(agg.labels_)),0,adjusted_rand_score(y,agg.labels_)],['DBSCAN',len(set(db.labels_)-{-1}),(db.labels_==-1).sum(),adjusted_rand_score(y,db.labels_)]]",
      "display(pd.DataFrame(rows,columns=['模型','簇数','噪声点','ARI']).round(3))"
    ),
    pitfalls: ["未缩放就设置 eps", "把 DBSCAN 噪声强制归入普通簇", "只用轮廓系数评价非凸簇", "在大数据上忽略层次聚类的内存成本"],
    practiceCode: lines(
      "practice=[]",
      "for eps in [.15,.25,.4]:",
      "    labels=DBSCAN(eps=eps,min_samples=6).fit_predict(Xs); practice.append([eps,len(set(labels)-{-1}),(labels==-1).sum()])",
      "practice_result=pd.DataFrame(practice,columns=['eps','clusters','noise']); display(practice_result)"
    ),
    practiceAssert: "assert len(practice_result)==3"
  }),
  99: make({
    summary: "使用 PCA 压缩高维数据，分析解释方差、特征载荷和降维后的分类性能。",
    objectives: ["计算累计解释方差", "理解特征值和主成分", "解释载荷", "把 PCA 放入无泄漏流水线"],
    concepts: ["PCA：\\(\\max_{||w||=1}Var(Xw)\\)", "主成分是协方差矩阵特征向量", "特征值对应解释方差", "PCA 保留方差，不保证保留目标信息"],
    setup: lines(
      "from sklearn.datasets import load_wine",
      "from sklearn.preprocessing import StandardScaler",
      "from sklearn.decomposition import PCA",
      "data=load_wine(as_frame=True); X,y=data.data,data.target",
      "Xs=StandardScaler().fit_transform(X)",
      "pca=PCA().fit(Xs)"
    ),
    demo: lines(
      "import numpy as np,pandas as pd",
      "cumulative=np.cumsum(pca.explained_variance_ratio_)",
      "needed=int(np.argmax(cumulative>=.95)+1)",
      "print('95%方差成分数:',needed,'累计:',round(cumulative[needed-1],3))",
      "loadings=pd.DataFrame(pca.components_[:2].T,index=X.columns,columns=['PC1','PC2'])",
      "display(loadings.abs().sort_values('PC1',ascending=False).head())"
    ),
    pitfalls: ["切分前拟合 PCA", "未标准化不同量纲特征", "把主成分命名为未经验证的潜变量", "认为解释方差越高预测一定越好"],
    practiceCode: lines(
      "from sklearn.pipeline import make_pipeline",
      "from sklearn.linear_model import LogisticRegression",
      "from sklearn.model_selection import cross_val_score",
      "practice_model=make_pipeline(StandardScaler(),PCA(n_components=.95),LogisticRegression(max_iter=500))",
      "practice_score=cross_val_score(practice_model,X,y,cv=5).mean(); print(round(practice_score,3))"
    ),
    practiceAssert: "assert 0<=practice_score<=1"
  }),
  100: make({
    summary: "为独立同分布、分组数据和时间序列选择正确交叉验证策略。",
    objectives: ["使用 KFold 与 StratifiedKFold", "使用 GroupKFold 防止实体泄漏", "使用 TimeSeriesSplit 保持时间顺序", "报告均值与标准差"],
    concepts: ["CV均值：\\(K^{-1}\\sum_k score_k\\)", "分类通常保持类别比例", "同一客户不能跨训练验证折", "未来数据不能进入过去训练"],
    setup: lines(
      "import numpy as np",
      "from sklearn.datasets import load_breast_cancer",
      "from sklearn.pipeline import make_pipeline",
      "from sklearn.preprocessing import StandardScaler",
      "from sklearn.linear_model import LogisticRegression",
      "from sklearn.model_selection import StratifiedKFold,cross_val_score",
      "data=load_breast_cancer(as_frame=True); X,y=data.data,data.target",
      "model=make_pipeline(StandardScaler(),LogisticRegression(max_iter=1000))"
    ),
    demo: lines(
      "for folds in [3,5,10]:",
      "    cv=StratifiedKFold(n_splits=folds,shuffle=True,random_state=100)",
      "    s=cross_val_score(model,X,y,cv=cv,scoring='roc_auc')",
      "    print(folds,'mean',round(s.mean(),4),'std',round(s.std(),4),'scores',s.round(3))"
    ),
    pitfalls: ["时间序列使用随机 KFold", "同一用户记录跨折", "只报告 CV 最佳折", "交叉验证后仍用相同数据声称独立测试"],
    practiceCode: lines(
      "from sklearn.model_selection import TimeSeriesSplit",
      "ts=TimeSeriesSplit(n_splits=4)",
      "practice_splits=[(train[-1],test[0]) for train,test in ts.split(np.arange(100))]",
      "print(practice_splits)"
    ),
    practiceAssert: "assert all(a<b for a,b in practice_splits)"
  }),
  101: make({
    summary: "使用 GridSearchCV 和 RandomizedSearchCV 在流水线内调参，并控制搜索空间和计算预算。",
    objectives: ["正确命名流水线参数", "运行网格搜索", "运行随机搜索", "读取 cv_results_ 与最佳模型"],
    concepts: ["超参数在 fit 前指定", "网格成本等于组合数乘折数", "随机搜索适合连续或大空间", "最终测试集只使用一次"],
    setup: lines(
      "from sklearn.datasets import load_breast_cancer",
      "from sklearn.model_selection import train_test_split,GridSearchCV,RandomizedSearchCV",
      "from sklearn.pipeline import make_pipeline",
      "from sklearn.preprocessing import StandardScaler",
      "from sklearn.svm import SVC",
      "data=load_breast_cancer(as_frame=True); X,y=data.data,data.target",
      "X_train,X_test,y_train,y_test=train_test_split(X,y,stratify=y,test_size=.2,random_state=101)",
      "pipe=make_pipeline(StandardScaler(),SVC())"
    ),
    demo: lines(
      "import pandas as pd",
      "grid=GridSearchCV(pipe,{'svc__C':[.1,1,10],'svc__gamma':['scale',.01,.1]},cv=5,scoring='roc_auc',n_jobs=-1).fit(X_train,y_train)",
      "print('best:',grid.best_params_,'CV:',round(grid.best_score_,3),'test:',round(grid.score(X_test,y_test),3))",
      "display(pd.DataFrame(grid.cv_results_)[['param_svc__C','param_svc__gamma','mean_test_score','std_test_score']].sort_values('mean_test_score',ascending=False).head())"
    ),
    pitfalls: ["搜索前反复查看测试集", "把预处理放在搜索外", "搜索范围无业务或计算依据", "只展示最佳分数不展示波动"],
    practiceCode: lines(
      "from scipy.stats import loguniform",
      "random_search=RandomizedSearchCV(pipe,{'svc__C':loguniform(1e-2,1e2),'svc__gamma':loguniform(1e-4,1)},n_iter=10,cv=4,scoring='roc_auc',random_state=101,n_jobs=-1).fit(X_train,y_train)",
      "print(random_search.best_params_,round(random_search.best_score_,3))"
    ),
    practiceAssert: "assert 0<=random_search.best_score_<=1"
  }),
  102: make({
    summary: "用统一切分、统一指标和 Dummy 基线比较多个模型，同时报告性能与复杂度。",
    objectives: ["建立分类基线", "用相同 CV 比较模型", "报告均值与波动", "考虑训练时间和解释成本"],
    concepts: ["模型提升应相对基线衡量", "CV 差异小于波动时不宜过度排名", "复杂模型需要足够增益证明价值", "测试集不是排行榜训练资源"],
    setup: lines(
      "from sklearn.datasets import load_breast_cancer",
      "from sklearn.model_selection import StratifiedKFold,cross_validate",
      "from sklearn.pipeline import make_pipeline",
      "from sklearn.preprocessing import StandardScaler",
      "from sklearn.dummy import DummyClassifier",
      "from sklearn.linear_model import LogisticRegression",
      "from sklearn.ensemble import RandomForestClassifier",
      "data=load_breast_cancer(as_frame=True); X,y=data.data,data.target",
      "cv=StratifiedKFold(5,shuffle=True,random_state=102)"
    ),
    demo: lines(
      "import pandas as pd",
      "models={'dummy':DummyClassifier(strategy='prior'),'logit':make_pipeline(StandardScaler(),LogisticRegression(max_iter=1000)),'forest':RandomForestClassifier(n_estimators=200,min_samples_leaf=3,n_jobs=-1,random_state=102)}",
      "rows=[]",
      "for name,m in models.items():",
      "    s=cross_validate(m,X,y,cv=cv,scoring='roc_auc',return_train_score=True)",
      "    rows.append([name,s['test_score'].mean(),s['test_score'].std(),s['fit_time'].mean()])",
      "comparison=pd.DataFrame(rows,columns=['model','CV_AUC','std','fit_seconds']).set_index('model')",
      "display(comparison.round(4))"
    ),
    pitfalls: ["不同模型使用不同数据切分", "没有 Dummy 基线", "分数差异极小时强行排名", "忽略预测延迟、稳定性和可解释性"],
    practiceCode: lines(
      "best_model=comparison.CV_AUC.idxmax()",
      "improvement=comparison.loc[best_model,'CV_AUC']-comparison.loc['dummy','CV_AUC']",
      "print(best_model,round(improvement,3))"
    ),
    practiceAssert: "assert improvement>=0"
  }),
  103: make({
    summary: "使用置换重要性、单变量特征选择和部分依赖解释模型，并明确解释边界。",
    objectives: ["使用 SelectKBest", "计算置换重要性", "理解部分依赖", "区分预测解释与因果解释"],
    concepts: ["置换重要性衡量打乱特征后的性能下降", "单变量选择忽略交互关系", "相关特征会分摊重要性", "解释工具描述模型，不证明现实机制"],
    setup: lines(
      "from sklearn.datasets import load_breast_cancer",
      "from sklearn.model_selection import train_test_split",
      "from sklearn.ensemble import RandomForestClassifier",
      "data=load_breast_cancer(as_frame=True); X,y=data.data,data.target",
      "X_train,X_test,y_train,y_test=train_test_split(X,y,stratify=y,random_state=103)",
      "model=RandomForestClassifier(n_estimators=250,min_samples_leaf=3,n_jobs=-1,random_state=103).fit(X_train,y_train)"
    ),
    demo: lines(
      "import pandas as pd",
      "from sklearn.inspection import permutation_importance",
      "perm=permutation_importance(model,X_test,y_test,n_repeats=15,scoring='roc_auc',random_state=103,n_jobs=-1)",
      "importance=pd.DataFrame({'feature':X.columns,'mean':perm.importances_mean,'std':perm.importances_std}).sort_values('mean',ascending=False)",
      "display(importance.head(10).round(4))",
      "print('负重要性数量:',(importance['mean']<0).sum())"
    ),
    pitfalls: ["使用训练集计算置换重要性", "相关变量中只保留排名第一者", "把模型解释写成因果机制", "忽略解释结果的抽样波动"],
    practiceCode: lines(
      "from sklearn.feature_selection import SelectKBest,f_classif",
      "selector=SelectKBest(f_classif,k=8).fit(X_train,y_train)",
      "selected_features=X.columns[selector.get_support()].tolist()",
      "print(selected_features)"
    ),
    practiceAssert: "assert len(selected_features)==8"
  }),
  104: make({
    summary: "把预处理与模型作为单一制品保存，完成输入校验、批量推理和结果复核。",
    objectives: ["保存完整 Pipeline", "加载模型并复现预测", "校验列名与顺序", "设计批量预测输出"],
    concepts: ["模型制品必须包含预处理", "推理输入契约包括字段、类型和单位", "序列化文件不能从不可信来源加载", "版本、训练时间和特征清单应随制品记录"],
    setup: lines(
      "from sklearn.datasets import load_iris",
      "from sklearn.pipeline import make_pipeline",
      "from sklearn.preprocessing import StandardScaler",
      "from sklearn.linear_model import LogisticRegression",
      "import pickle",
      "data=load_iris(as_frame=True); X,y=data.data,data.target",
      "model=make_pipeline(StandardScaler(),LogisticRegression(max_iter=500)).fit(X,y)",
      "payload=pickle.dumps(model)",
      "restored=pickle.loads(payload)",
      "print('制品字节数:',len(payload),'特征:',model.feature_names_in_.tolist())"
    ),
    demo: lines(
      "import pandas as pd,numpy as np",
      "batch=X.head(5).copy()",
      "required=restored.feature_names_in_.tolist()",
      "assert batch.columns.tolist()==required",
      "output=batch.assign(prediction=restored.predict(batch),confidence=restored.predict_proba(batch).max(axis=1))",
      "display(output)",
      "print('重载预测一致:',np.array_equal(model.predict(batch),restored.predict(batch)))"
    ),
    pitfalls: ["只保存估计器而漏掉预处理", "不校验输入字段和单位", "加载不可信 pickle", "没有记录 sklearn 版本和训练数据版本"],
    practiceCode: lines(
      "practice_batch=X.tail(3).copy()",
      "practice_output=pd.DataFrame({'prediction':restored.predict(practice_batch),'confidence':restored.predict_proba(practice_batch).max(axis=1)})",
      "display(practice_output)"
    ),
    practiceAssert: "assert len(practice_output)==3\nassert practice_output.confidence.between(0,1).all()"
  }),
  105: make({
    summary: "综合 UCI Online Retail 数据构建客户消费价值回归基线，强调观察窗口与目标窗口分离。",
    objectives: ["构造客户历史特征", "定义未来消费目标", "避免时间穿越", "评价 MAE 与 Top 客户覆盖"],
    concepts: ["特征只能来自观察截止日前", "目标为未来窗口消费额", "金额长尾可使用 log1p", "高消费预测不等于营销增量"],
    setup: lines(
      "import pandas as pd,numpy as np",
      "from js import window",
      "tx=pd.read_csv(f\"{window.location.origin}/datasets/uci_online_retail_200k.csv\",parse_dates=['InvoiceDate'])",
      "tx=tx[(tx.Quantity>0)&(tx.UnitPrice>0)&tx.CustomerID.notna()].copy(); tx['revenue']=tx.Quantity*tx.UnitPrice",
      "cutoff=tx.InvoiceDate.quantile(.8); history=tx[tx.InvoiceDate<cutoff]; future=tx[tx.InvoiceDate>=cutoff]",
      "snapshot=cutoff.normalize()",
      "features=history.groupby('CustomerID').agg(recency=('InvoiceDate',lambda x:(snapshot-x.max().normalize()).days),frequency=('InvoiceNo','nunique'),monetary=('revenue','sum'),items=('Quantity','sum'))",
      "target=future.groupby('CustomerID').revenue.sum().rename('future_revenue')",
      "customer=features.join(target,how='left').fillna({'future_revenue':0}); print(customer.shape)"
    ),
    demo: lines(
      "from sklearn.model_selection import train_test_split",
      "from sklearn.ensemble import RandomForestRegressor",
      "from sklearn.metrics import mean_absolute_error",
      "X=customer.drop(columns='future_revenue'); y=np.log1p(customer.future_revenue)",
      "X_train,X_test,y_train,y_test=train_test_split(X,y,test_size=.25,random_state=105)",
      "model=RandomForestRegressor(n_estimators=250,min_samples_leaf=8,n_jobs=-1,random_state=105).fit(X_train,y_train)",
      "pred=model.predict(X_test); print('log-MAE:',round(mean_absolute_error(y_test,pred),3))",
      "result=pd.DataFrame({'actual':np.expm1(y_test),'predicted':np.expm1(pred)}).sort_values('predicted',ascending=False)",
      "print('Top10%实际收入覆盖:',round(result.head(max(1,len(result)//10)).actual.sum()/result.actual.sum(),3))"
    ),
    pitfalls: ["随机拆交易行造成同一客户泄漏", "使用未来交易构造 recency", "直接拟合极端长尾金额", "把消费预测当成促销因果响应"],
    practiceCode: lines(
      "baseline=np.repeat(y_train.median(),len(y_test))",
      "baseline_mae=mean_absolute_error(y_test,baseline); model_mae=mean_absolute_error(y_test,pred)",
      "print('baseline/model:',round(baseline_mae,3),round(model_mae,3))"
    ),
    practiceAssert: "assert model_mae>=0\nassert baseline_mae>=0"
  }),
  106: make({
    summary: "基于 Olist 订单链路预测物流延期风险，严格限定下单时可获得的特征。",
    objectives: ["定义延期目标", "构造下单时特征", "按时间切分", "评价 PR-AUC 与召回率"],
    concepts: ["延期：实际签收日晚于预计日", "发货和签收时间属于事后泄漏", "时间切分模拟未来上线", "阈值应结合催单处理容量"],
    setup: lines(
      "import pandas as pd",
      "from js import window",
      "base=window.location.origin",
      "orders=pd.read_csv(f\"{base}/datasets/olist_orders_dataset.csv\",parse_dates=['order_purchase_timestamp','order_delivered_customer_date','order_estimated_delivery_date'])",
      "items=pd.read_csv(f\"{base}/datasets/olist_order_items_dataset.csv\")",
      "customers=pd.read_csv(f\"{base}/datasets/olist_customers_dataset.csv\")",
      "sellers=pd.read_csv(f\"{base}/datasets/olist_sellers_dataset.csv\")",
      "agg=items.groupby('order_id').agg(item_count=('order_item_id','size'),goods_value=('price','sum'),freight_value=('freight_value','sum'),seller_id=('seller_id','first'))",
      "df=orders.merge(agg,on='order_id').merge(customers[['customer_id','customer_state']],on='customer_id').merge(sellers[['seller_id','seller_state']],on='seller_id')",
      "df=df.query(\"order_status=='delivered'\").dropna(subset=['order_delivered_customer_date']).copy()",
      "df['late']=(df.order_delivered_customer_date>df.order_estimated_delivery_date).astype(int)",
      "df['month']=df.order_purchase_timestamp.dt.month; df['weekday']=df.order_purchase_timestamp.dt.dayofweek",
      "df['promise_days']=(df.order_estimated_delivery_date-df.order_purchase_timestamp).dt.total_seconds()/86400",
      "df=df.sort_values('order_purchase_timestamp')",
      "num=['item_count','goods_value','freight_value','month','weekday','promise_days']; cat=['customer_state','seller_state']; features=num+cat"
    ),
    demo: lines(
      "from sklearn.compose import ColumnTransformer",
      "from sklearn.preprocessing import OneHotEncoder,StandardScaler",
      "from sklearn.pipeline import make_pipeline",
      "from sklearn.linear_model import LogisticRegression",
      "from sklearn.metrics import average_precision_score,precision_score,recall_score",
      "split=int(len(df)*.8); train,test=df.iloc[:split],df.iloc[split:]",
      "prep=ColumnTransformer([('cat',OneHotEncoder(handle_unknown='ignore'),cat),('num',StandardScaler(),num)])",
      "model=make_pipeline(prep,LogisticRegression(max_iter=700,class_weight='balanced')).fit(train[features],train.late)",
      "prob=model.predict_proba(test[features])[:,1]; pred=prob>=.5",
      "print('测试延期率:',round(test.late.mean(),3),'PR-AUC:',round(average_precision_score(test.late,prob),3),'precision:',round(precision_score(test.late,pred),3),'recall:',round(recall_score(test.late,pred),3))"
    ),
    pitfalls: ["使用签收或发货后字段", "随机切分掩盖时间漂移", "只看准确率", "卖家或地区缺失时宣称完整归因"],
    practiceCode: lines(
      "ranked=pd.DataFrame({'y':test.late.to_numpy(),'p':prob}).sort_values('p',ascending=False)",
      "top=ranked.head(max(1,len(ranked)//10)); practice_lift=top.y.mean()/ranked.y.mean()",
      "print('Top10% lift:',round(practice_lift,2))"
    ),
    practiceAssert: "assert practice_lift>0"
  }),
  107: make({
    summary: "使用 UCI Bike Sharing 小时数据完成时间特征、时间切分、需求回归和残差诊断。",
    objectives: ["建立时间顺序", "排除目标组成字段", "比较基线与提升模型", "按小时诊断误差"],
    concepts: ["cnt=casual+registered，后二者是目标泄漏", "未来测试集必须晚于训练集", "MAE 与租赁量同单位", "残差分组揭示模型在哪些时段失效"],
    setup: lines(
      "import pandas as pd",
      "from js import window",
      "df=pd.read_csv(f\"{window.location.origin}/datasets/bike_sharing_hour.csv\",parse_dates=['dteday'])",
      "df['timestamp']=df.dteday+pd.to_timedelta(df.hr,unit='h'); df=df.sort_values('timestamp')",
      "features=['season','yr','mnth','hr','holiday','weekday','workingday','weathersit','temp','atemp','hum','windspeed']",
      "split=int(len(df)*.8); train,test=df.iloc[:split],df.iloc[split:]"
    ),
    demo: lines(
      "import numpy as np",
      "from sklearn.ensemble import HistGradientBoostingRegressor",
      "from sklearn.metrics import mean_absolute_error,mean_squared_error",
      "model=HistGradientBoostingRegressor(max_iter=200,max_leaf_nodes=20,random_state=107).fit(train[features],train.cnt)",
      "pred=model.predict(test[features]); baseline=np.repeat(train.cnt.tail(24*28).mean(),len(test))",
      "print('baseline/model MAE:',round(mean_absolute_error(test.cnt,baseline),1),round(mean_absolute_error(test.cnt,pred),1),'RMSE:',round(mean_squared_error(test.cnt,pred)**.5,1))",
      "errors=pd.DataFrame({'hour':test.hr,'abs_error':abs(test.cnt.to_numpy()-pred)})",
      "display(errors.groupby('hour').abs_error.mean().nlargest(6).round(1))"
    ),
    pitfalls: ["使用 casual 和 registered 预测 cnt", "随机切分小时记录", "只报告总体误差", "把全网需求预测当作站点调度方案"],
    practiceCode: lines(
      "practice_mae=errors.groupby('hour').abs_error.mean()",
      "worst_hour=int(practice_mae.idxmax()); print('误差最高小时:',worst_hour)"
    ),
    practiceAssert: "assert 0<=worst_hour<=23"
  }),
  108: make({
    summary: "使用 UCI Bank Marketing 构建无通话时长泄漏的客户筛选模型，并交付容量约束下的名单指标。",
    objectives: ["识别 duration 泄漏", "处理类别与数值特征", "按 PR-AUC 评价模型", "输出 Top-K Lift 与覆盖率"],
    concepts: ["duration 在通话结束后才知道", "响应概率不是营销因果增量", "Top-K 对应有限呼叫容量", "模型上线还需同意、频控和公平性治理"],
    setup: lines(
      "import pandas as pd",
      "from js import window",
      "df=pd.read_csv(f\"{window.location.origin}/datasets/bank_marketing_full.csv\",sep=';'); df['target']=(df.y=='yes').astype(int)",
      "drop=['y','target','duration']; features=[c for c in df.columns if c not in drop]",
      "from sklearn.model_selection import train_test_split",
      "X_train,X_test,y_train,y_test=train_test_split(df[features],df.target,stratify=df.target,test_size=.25,random_state=108)",
      "cat=X_train.select_dtypes('object').columns.tolist(); num=[c for c in features if c not in cat]"
    ),
    demo: lines(
      "from sklearn.compose import ColumnTransformer",
      "from sklearn.preprocessing import OneHotEncoder,StandardScaler",
      "from sklearn.pipeline import make_pipeline",
      "from sklearn.linear_model import LogisticRegression",
      "from sklearn.metrics import average_precision_score",
      "prep=ColumnTransformer([('cat',OneHotEncoder(handle_unknown='ignore'),cat),('num',StandardScaler(),num)])",
      "model=make_pipeline(prep,LogisticRegression(max_iter=700,class_weight='balanced')).fit(X_train,y_train)",
      "prob=model.predict_proba(X_test)[:,1]; ranked=pd.DataFrame({'y':y_test.to_numpy(),'p':prob}).sort_values('p',ascending=False)",
      "print('PR-AUC:',round(average_precision_score(y_test,prob),3))",
      "for share in [.05,.1,.2]:",
      "    top=ranked.head(int(len(ranked)*share)); print(share,'conversion',round(top.y.mean(),3),'lift',round(top.y.mean()/ranked.y.mean(),2),'coverage',round(top.y.sum()/ranked.y.sum(),3))"
    ),
    pitfalls: ["把 duration 放入呼叫前模型", "把响应评分叫作 uplift", "只追求转化率不报告覆盖和名单量", "忽略同意、投诉和频控"],
    practiceCode: lines(
      "top10=ranked.head(int(len(ranked)*.1)); practice_lift=top10.y.mean()/ranked.y.mean()",
      "practice_coverage=top10.y.sum()/ranked.y.sum()",
      "print(round(practice_lift,2),round(practice_coverage,3))"
    ),
    practiceAssert: "assert practice_lift>1\nassert 0<=practice_coverage<=1"
  })
};
