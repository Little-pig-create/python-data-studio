const lines = (...items) => items.join("\n");

const lesson = ({ summary, objectives, concepts, examples, pitfalls, practice, practiceCode, practiceAssert }) => ({
  summary, objectives, concepts, examples, pitfalls, practice, practiceCode, practiceAssert
});

export const machineLearningProfiles = {
  76: lesson({
    summary: "建立 scikit-learn 的标准监督学习工作流：准备 X/y、分层切分、拟合模型、预测并与简单基线比较。",
    objectives: ["区分特征矩阵 X 与目标 y", "使用训练集和测试集评估泛化能力", "分类任务使用 stratify 保持类别比例", "用 DummyClassifier 建立最低可接受基线"],
    concepts: ["fit 只在训练集学习参数", "predict 在未参与训练的数据上产生结果", "测试集不能参与模型选择", "固定 random_state 便于复现，不代表结果天然稳定"],
    examples: [
      { title: "认识 sklearn 数据集", explanation: "Iris 是 150 行、4 个数值特征、3 个类别的经典多分类数据。", code: lines(
        "import pandas as pd",
        "from sklearn.datasets import load_iris",
        "iris = load_iris(as_frame=True)",
        "X, y = iris.data, iris.target",
        "print('特征形状:', X.shape, '目标形状:', y.shape)",
        "print('类别:', dict(enumerate(iris.target_names)))",
        "display(pd.concat([X.head(), y.head().rename('target')], axis=1))"
      )},
      { title: "切分、训练与基线", explanation: "分层切分后训练逻辑回归，并与只预测多数类的模型比较。", code: lines(
        "from sklearn.model_selection import train_test_split",
        "from sklearn.linear_model import LogisticRegression",
        "from sklearn.dummy import DummyClassifier",
        "from sklearn.metrics import accuracy_score",
        "X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.25, stratify=y, random_state=76)",
        "model = LogisticRegression(max_iter=500).fit(X_train, y_train)",
        "dummy = DummyClassifier(strategy='most_frequent').fit(X_train, y_train)",
        "print('模型准确率:', round(accuracy_score(y_test, model.predict(X_test)), 3))",
        "print('多数类基线:', round(accuracy_score(y_test, dummy.predict(X_test)), 3))",
        "print('训练/测试类别比例:')",
        "print(pd.DataFrame({'train': y_train.value_counts(normalize=True), 'test': y_test.value_counts(normalize=True)}).round(3))"
      )}
    ],
    pitfalls: ["在全部数据上训练后再报告同一数据的得分", "反复查看测试集并据此调参", "类别不平衡时忘记 stratify", "没有任何简单基线就宣称模型有效"],
    practice: ["把 test_size 改为 0.3", "训练一个 StandardScaler + LogisticRegression 流水线", "比较新模型与多数类基线"],
    practiceCode: lines(
      "from sklearn.pipeline import make_pipeline",
      "from sklearn.preprocessing import StandardScaler",
      "Xp_train, Xp_test, yp_train, yp_test = train_test_split(X, y, test_size=0.3, stratify=y, random_state=76)",
      "practice_model = make_pipeline(StandardScaler(), LogisticRegression(max_iter=500)).fit(Xp_train, yp_train)",
      "practice_score = practice_model.score(Xp_test, yp_test)",
      "print('练习准确率:', round(practice_score, 3))"
    ),
    practiceAssert: "assert 0 <= practice_score <= 1\nassert len(Xp_test) == 45"
  }),

  77: lesson({
    summary: "使用 ColumnTransformer 和 Pipeline 对数值、类别与缺失值进行一致预处理，避免训练测试之间的数据泄漏。",
    objectives: ["识别数值和类别特征", "分别配置缺失填补、缩放和独热编码", "用 ColumnTransformer 合并预处理", "把预处理与模型封装为 Pipeline"],
    concepts: ["数值缩放对距离和间隔模型很重要", "OneHotEncoder 将无序类别转成指示变量", "handle_unknown 避免测试集新类别报错", "Pipeline 保证交叉验证时每折独立拟合预处理"],
    examples: [
      { title: "构造混合类型数据", explanation: "使用 Titanic 公开数据展示真实缺失值和类别字段。", code: lines(
        "import pandas as pd",
        "from js import window",
        "url = f\"{window.location.origin}/datasets/titanic.csv\"",
        "df = pd.read_csv(url)",
        "features = ['pclass', 'sex', 'age', 'fare', 'embarked']",
        "X, y = df[features], df['survived']",
        "print(X.dtypes)",
        "print('缺失值:', X.isna().sum().to_dict())"
      )},
      { title: "列级预处理流水线", explanation: "所有填补和编码都封装在流水线中，只在训练集拟合。", code: lines(
        "from sklearn.model_selection import train_test_split",
        "from sklearn.compose import ColumnTransformer",
        "from sklearn.pipeline import Pipeline",
        "from sklearn.impute import SimpleImputer",
        "from sklearn.preprocessing import OneHotEncoder, StandardScaler",
        "from sklearn.linear_model import LogisticRegression",
        "num = ['age', 'fare']; cat = ['pclass', 'sex', 'embarked']",
        "prep = ColumnTransformer([",
        "    ('num', Pipeline([('impute', SimpleImputer(strategy='median')), ('scale', StandardScaler())]), num),",
        "    ('cat', Pipeline([('impute', SimpleImputer(strategy='most_frequent')), ('onehot', OneHotEncoder(handle_unknown='ignore'))]), cat)",
        "])",
        "pipe = Pipeline([('prep', prep), ('model', LogisticRegression(max_iter=500))])",
        "X_train, X_test, y_train, y_test = train_test_split(X, y, stratify=y, random_state=77)",
        "pipe.fit(X_train, y_train)",
        "print('测试准确率:', round(pipe.score(X_test, y_test), 3))",
        "print('转换后特征数:', len(pipe.named_steps['prep'].get_feature_names_out()))"
      )}
    ],
    pitfalls: ["切分前用全量数据计算均值或标准差", "对名义类别直接使用 1、2、3 表示大小", "测试集出现新类别时编码器报错", "在训练和预测阶段手工维护两套预处理代码"],
    practice: ["增加 sibsp 和 parch 两个数值特征", "重新拟合流水线", "输出新特征数和测试准确率"],
    practiceCode: lines(
      "features2 = features + ['sibsp', 'parch']",
      "num2 = num + ['sibsp', 'parch']",
      "prep2 = ColumnTransformer([('num', Pipeline([('impute', SimpleImputer(strategy='median')), ('scale', StandardScaler())]), num2), ('cat', Pipeline([('impute', SimpleImputer(strategy='most_frequent')), ('onehot', OneHotEncoder(handle_unknown='ignore'))]), cat)])",
      "X2_train, X2_test, y2_train, y2_test = train_test_split(df[features2], y, stratify=y, random_state=77)",
      "pipe2 = Pipeline([('prep', prep2), ('model', LogisticRegression(max_iter=500))]).fit(X2_train, y2_train)",
      "practice_score = pipe2.score(X2_test, y2_test)",
      "print('准确率:', round(practice_score, 3))"
    ),
    practiceAssert: "assert 0 <= practice_score <= 1\nassert len(pipe2.named_steps['prep'].get_feature_names_out()) >= 8"
  }),

  78: lesson({
    summary: "使用线性回归预测连续目标，并通过 Ridge 正则化控制系数规模；用 MAE、RMSE 和 R² 从不同角度评价误差。",
    objectives: ["识别回归任务", "解释线性模型的系数与截距", "计算 MAE、RMSE 和 R²", "理解 Ridge 的 alpha 对偏差和方差的影响"],
    concepts: ["线性回归最小化残差平方和", "Ridge 对大系数施加 L2 惩罚", "MAE 与目标同单位且对极端值较稳健", "R² 小于 0 表示还不如预测测试集均值"],
    examples: [
      { title: "糖尿病进展回归", explanation: "Diabetes 数据包含 442 个样本和 10 个标准化生理特征。", code: lines(
        "import pandas as pd",
        "from sklearn.datasets import load_diabetes",
        "from sklearn.model_selection import train_test_split",
        "data = load_diabetes(as_frame=True)",
        "X, y = data.data, data.target",
        "X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.25, random_state=78)",
        "print(X.shape, y.describe().round(1).to_dict())"
      )},
      { title: "OLS 与 Ridge 对比", explanation: "在同一测试集上比较预测误差和系数范数。", code: lines(
        "import numpy as np",
        "from sklearn.linear_model import LinearRegression, Ridge",
        "from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score",
        "rows = []",
        "for name, model in {'OLS': LinearRegression(), 'Ridge': Ridge(alpha=10)}.items():",
        "    model.fit(X_train, y_train); pred = model.predict(X_test)",
        "    rows.append([name, mean_absolute_error(y_test, pred), mean_squared_error(y_test, pred)**0.5, r2_score(y_test, pred), np.linalg.norm(model.coef_)])",
        "result = pd.DataFrame(rows, columns=['模型','MAE','RMSE','R2','系数L2范数']).set_index('模型')",
        "display(result.round(3))"
      )}
    ],
    pitfalls: ["把相关系数解释成因果效应", "只报告 R² 不报告误差单位", "用测试集选择 alpha 后仍称其为最终测试集", "线性外推到训练范围之外"],
    practice: ["比较 alpha 为 0.1、1、10、100 的 Ridge", "选择测试 RMSE 最低者", "观察 alpha 与系数范数关系"],
    practiceCode: lines(
      "ridge_rows = []",
      "for alpha in [0.1, 1, 10, 100]:",
      "    m = Ridge(alpha=alpha).fit(X_train, y_train)",
      "    p = m.predict(X_test)",
      "    ridge_rows.append([alpha, mean_squared_error(y_test, p)**0.5, np.linalg.norm(m.coef_)])",
      "practice_result = pd.DataFrame(ridge_rows, columns=['alpha','RMSE','coef_norm'])",
      "display(practice_result.round(3))"
    ),
    practiceAssert: "assert len(practice_result) == 4\nassert practice_result['coef_norm'].is_monotonic_decreasing"
  }),

  79: lesson({
    summary: "使用逻辑回归输出分类概率，理解系数、决策阈值、混淆矩阵和 ROC-AUC。",
    objectives: ["训练二分类逻辑回归", "使用 predict_proba 获取概率", "区分概率排序与阈值分类", "解释标准化后的系数方向"],
    concepts: ["逻辑回归建模的是对数胜算", "默认阈值通常为 0.5", "ROC-AUC 衡量随机正例排在随机负例之前的概率", "系数解释依赖特征尺度与共线性"],
    examples: [
      { title: "乳腺癌二分类", explanation: "使用标准化流水线，避免特征量纲影响优化与正则化。", code: lines(
        "import pandas as pd",
        "from sklearn.datasets import load_breast_cancer",
        "from sklearn.model_selection import train_test_split",
        "from sklearn.pipeline import make_pipeline",
        "from sklearn.preprocessing import StandardScaler",
        "from sklearn.linear_model import LogisticRegression",
        "data = load_breast_cancer(as_frame=True)",
        "X, y = data.data, data.target",
        "X_train, X_test, y_train, y_test = train_test_split(X, y, stratify=y, random_state=79)",
        "model = make_pipeline(StandardScaler(), LogisticRegression(max_iter=1000)).fit(X_train, y_train)"
      )},
      { title: "概率、阈值与指标", explanation: "改变阈值会在精确率与召回率之间移动。", code: lines(
        "from sklearn.metrics import roc_auc_score, precision_score, recall_score, confusion_matrix",
        "prob = model.predict_proba(X_test)[:, 1]",
        "print('ROC-AUC:', round(roc_auc_score(y_test, prob), 3))",
        "for threshold in [0.3, 0.5, 0.7]:",
        "    pred = (prob >= threshold).astype(int)",
        "    print(threshold, 'precision=', round(precision_score(y_test, pred), 3), 'recall=', round(recall_score(y_test, pred), 3), 'matrix=', confusion_matrix(y_test, pred).tolist())"
      )}
    ],
    pitfalls: ["把 predict 输出当成概率", "只按准确率选择阈值", "忘记确认哪个标签是正类", "将系数大小直接当作变量重要性或因果效应"],
    practice: ["寻找召回率至少 0.95 的最高阈值", "报告该阈值下精确率", "输出混淆矩阵"],
    practiceCode: lines(
      "candidates = []",
      "for threshold in [i/100 for i in range(5, 96)]:",
      "    p = (prob >= threshold).astype(int)",
      "    r = recall_score(y_test, p)",
      "    if r >= 0.95: candidates.append((threshold, precision_score(y_test, p), r))",
      "best_threshold, best_precision, best_recall = max(candidates, key=lambda x: x[0])",
      "print(best_threshold, round(best_precision, 3), round(best_recall, 3))"
    ),
    practiceAssert: "assert best_recall >= 0.95\nassert 0 < best_threshold < 1"
  }),

  80: lesson({
    summary: "掌握 KNN 的距离投票原理、特征缩放要求，以及邻居数 k 对欠拟合和过拟合的影响。",
    objectives: ["训练 KNeighborsClassifier", "解释距离和邻居投票", "使用标准化避免量纲主导", "通过验证比较不同 k"],
    concepts: ["k 小时边界灵活、方差较高", "k 大时边界平滑、偏差较高", "预测成本随训练样本增长", "距离模型对无关特征和量纲敏感"],
    examples: [
      { title: "Wine 数据与缩放", explanation: "Wine 的 13 个化学特征量纲差异明显，适合展示缩放的重要性。", code: lines(
        "import pandas as pd",
        "from sklearn.datasets import load_wine",
        "from sklearn.model_selection import train_test_split",
        "from sklearn.pipeline import make_pipeline",
        "from sklearn.preprocessing import StandardScaler",
        "from sklearn.neighbors import KNeighborsClassifier",
        "data = load_wine(as_frame=True); X, y = data.data, data.target",
        "X_train, X_test, y_train, y_test = train_test_split(X, y, stratify=y, random_state=80)",
        "raw = KNeighborsClassifier(n_neighbors=5).fit(X_train, y_train)",
        "scaled = make_pipeline(StandardScaler(), KNeighborsClassifier(n_neighbors=5)).fit(X_train, y_train)",
        "print('未缩放/缩放:', round(raw.score(X_test,y_test),3), round(scaled.score(X_test,y_test),3))"
      )},
      { title: "比较邻居数", explanation: "在固定切分上观察 k 的影响；正式选择应使用交叉验证。", code: lines(
        "rows=[]",
        "for k in [1,3,5,9,15,25]:",
        "    m=make_pipeline(StandardScaler(),KNeighborsClassifier(n_neighbors=k)).fit(X_train,y_train)",
        "    rows.append([k,m.score(X_train,y_train),m.score(X_test,y_test)])",
        "scores=pd.DataFrame(rows,columns=['k','train','test'])",
        "display(scores)"
      )}
    ],
    pitfalls: ["未缩放直接计算距离", "使用训练准确率选择 k", "在高维稀疏数据中忽视维度灾难", "大数据上忽略预测延迟"],
    practice: ["用 weights='distance' 比较 k=3、5、9", "选择测试得分最高配置", "记录与均匀投票的差异"],
    practiceCode: lines(
      "practice_scores = {}",
      "for k in [3,5,9]:",
      "    m=make_pipeline(StandardScaler(),KNeighborsClassifier(n_neighbors=k,weights='distance')).fit(X_train,y_train)",
      "    practice_scores[k]=m.score(X_test,y_test)",
      "print(practice_scores)"
    ),
    practiceAssert: "assert set(practice_scores) == {3,5,9}\nassert all(0 <= v <= 1 for v in practice_scores.values())"
  }),

  81: lesson({
    summary: "使用决策树学习可解释的分裂规则，并通过深度、叶节点样本量和剪枝限制过拟合。",
    objectives: ["训练 DecisionTreeClassifier", "解释节点分裂和叶节点", "比较训练与测试性能", "读取特征重要性和文本规则"],
    concepts: ["树模型无需特征缩放", "深树容易记住训练噪声", "max_depth 与 min_samples_leaf 控制复杂度", "内置 impurity importance 偏向可分裂机会多的特征"],
    examples: [
      { title: "从浅树开始", explanation: "Iris 浅树便于展示规则和决策路径。", code: lines(
        "import pandas as pd",
        "from sklearn.datasets import load_iris",
        "from sklearn.model_selection import train_test_split",
        "from sklearn.tree import DecisionTreeClassifier, export_text",
        "data=load_iris(as_frame=True); X,y=data.data,data.target",
        "X_train,X_test,y_train,y_test=train_test_split(X,y,stratify=y,random_state=81)",
        "tree=DecisionTreeClassifier(max_depth=3,min_samples_leaf=4,random_state=81).fit(X_train,y_train)",
        "print(export_text(tree,feature_names=list(X.columns)))",
        "print('训练/测试:',round(tree.score(X_train,y_train),3),round(tree.score(X_test,y_test),3))"
      )},
      { title: "复杂度与重要性", explanation: "比较不同深度并查看模型采用的分裂特征。", code: lines(
        "rows=[]",
        "for depth in [1,2,3,5,None]:",
        "    m=DecisionTreeClassifier(max_depth=depth,random_state=81).fit(X_train,y_train)",
        "    rows.append([str(depth),m.get_depth(),m.get_n_leaves(),m.score(X_train,y_train),m.score(X_test,y_test)])",
        "display(pd.DataFrame(rows,columns=['max_depth','实际深度','叶数','train','test']))",
        "display(pd.Series(tree.feature_importances_,index=X.columns).sort_values(ascending=False))"
      )}
    ],
    pitfalls: ["只看规则易读就认为结论因果可靠", "让树无限生长后报告训练得分", "把 impurity importance 当成稳定真相", "小样本下忽略树结构的不稳定性"],
    practice: ["训练 min_samples_leaf 为 1、5、10 的树", "固定 max_depth=4", "比较叶节点数和测试准确率"],
    practiceCode: lines(
      "practice_rows=[]",
      "for leaf in [1,5,10]:",
      "    m=DecisionTreeClassifier(max_depth=4,min_samples_leaf=leaf,random_state=81).fit(X_train,y_train)",
      "    practice_rows.append([leaf,m.get_n_leaves(),m.score(X_test,y_test)])",
      "practice_result=pd.DataFrame(practice_rows,columns=['min_leaf','leaves','score'])",
      "display(practice_result)"
    ),
    practiceAssert: "assert len(practice_result) == 3\nassert practice_result['score'].between(0,1).all()"
  }),

  82: lesson({
    summary: "理解随机森林如何通过样本和特征随机化集成多棵树，并使用袋外评估与置换重要性诊断模型。",
    objectives: ["训练 RandomForestClassifier", "理解 bootstrap 与特征子采样", "使用 OOB 分数", "比较内置重要性与置换重要性"],
    concepts: ["多棵低相关树平均可降低方差", "n_estimators 主要影响稳定性和计算量", "OOB 使用每棵树未抽中的样本评估", "置换重要性衡量打乱特征后的性能下降"],
    examples: [
      { title: "随机森林与 OOB", explanation: "在乳腺癌数据上比较测试与袋外分数。", code: lines(
        "from sklearn.datasets import load_breast_cancer",
        "from sklearn.model_selection import train_test_split",
        "from sklearn.ensemble import RandomForestClassifier",
        "data=load_breast_cancer(as_frame=True); X,y=data.data,data.target",
        "X_train,X_test,y_train,y_test=train_test_split(X,y,stratify=y,random_state=82)",
        "forest=RandomForestClassifier(n_estimators=300,min_samples_leaf=3,oob_score=True,n_jobs=-1,random_state=82).fit(X_train,y_train)",
        "print('OOB/测试:',round(forest.oob_score_,3),round(forest.score(X_test,y_test),3))"
      )},
      { title: "两种特征重要性", explanation: "置换重要性在测试集测量，更直接反映泛化性能依赖。", code: lines(
        "import pandas as pd",
        "from sklearn.inspection import permutation_importance",
        "impurity=pd.Series(forest.feature_importances_,index=X.columns,name='impurity')",
        "perm=permutation_importance(forest,X_test,y_test,n_repeats=10,random_state=82,n_jobs=-1)",
        "compare=pd.concat([impurity,pd.Series(perm.importances_mean,index=X.columns,name='permutation')],axis=1)",
        "display(compare.sort_values('permutation',ascending=False).head(10).round(4))"
      )}
    ],
    pitfalls: ["认为更多树一定解决所有过拟合", "高基数特征下只看 impurity importance", "用测试集反复筛特征", "忽略森林比单树更难解释且占用更多资源"],
    practice: ["比较 50、150、300 棵树", "记录 OOB 和测试得分", "观察分数是否趋于稳定"],
    practiceCode: lines(
      "forest_rows=[]",
      "for n in [50,150,300]:",
      "    m=RandomForestClassifier(n_estimators=n,min_samples_leaf=3,oob_score=True,n_jobs=-1,random_state=82).fit(X_train,y_train)",
      "    forest_rows.append([n,m.oob_score_,m.score(X_test,y_test)])",
      "practice_result=pd.DataFrame(forest_rows,columns=['trees','oob','test'])",
      "display(practice_result.round(3))"
    ),
    practiceAssert: "assert len(practice_result) == 3\nassert practice_result[['oob','test']].le(1).all().all()"
  }),

  83: lesson({
    summary: "学习梯度提升逐轮拟合残差的思想，使用 HistGradientBoosting 处理表格数据，并通过学习率与迭代次数控制复杂度。",
    objectives: ["理解 boosting 的串行加法模型", "训练 HistGradientBoostingClassifier", "解释 learning_rate 和 max_iter", "使用早停与验证集控制过拟合"],
    concepts: ["每一轮新模型纠正当前模型的错误", "较小学习率通常需要更多迭代", "树深和叶节点数控制交互复杂度", "提升模型对参数较敏感，应通过交叉验证选择"],
    examples: [
      { title: "梯度提升分类", explanation: "HistGradientBoosting 对中大型表格数据采用直方图加速。", code: lines(
        "from sklearn.datasets import load_breast_cancer",
        "from sklearn.model_selection import train_test_split",
        "from sklearn.ensemble import HistGradientBoostingClassifier",
        "from sklearn.metrics import roc_auc_score",
        "data=load_breast_cancer(as_frame=True); X,y=data.data,data.target",
        "X_train,X_test,y_train,y_test=train_test_split(X,y,stratify=y,random_state=83)",
        "boost=HistGradientBoostingClassifier(max_iter=150,learning_rate=0.06,max_leaf_nodes=15,l2_regularization=1,early_stopping=True,random_state=83).fit(X_train,y_train)",
        "prob=boost.predict_proba(X_test)[:,1]",
        "print('迭代轮数:',boost.n_iter_,' ROC-AUC:',round(roc_auc_score(y_test,prob),3))"
      )},
      { title: "学习率与迭代数", explanation: "比较有限配置，正式调参应放进交叉验证。", code: lines(
        "import pandas as pd",
        "rows=[]",
        "for rate,iters in [(0.03,300),(0.06,150),(0.1,100)]:",
        "    m=HistGradientBoostingClassifier(learning_rate=rate,max_iter=iters,max_leaf_nodes=15,random_state=83).fit(X_train,y_train)",
        "    rows.append([rate,iters,roc_auc_score(y_test,m.predict_proba(X_test)[:,1])])",
        "display(pd.DataFrame(rows,columns=['learning_rate','max_iter','ROC_AUC']).round(3))"
      )}
    ],
    pitfalls: ["在小测试集上细调大量参数", "使用过深基学习器导致过拟合", "把训练轮数当成模型树深", "未与简单线性和森林基线比较"],
    practice: ["比较 max_leaf_nodes 为 5、15、31", "固定学习率和迭代次数", "报告测试 ROC-AUC"],
    practiceCode: lines(
      "practice_rows=[]",
      "for leaves in [5,15,31]:",
      "    m=HistGradientBoostingClassifier(max_leaf_nodes=leaves,max_iter=150,learning_rate=.06,random_state=83).fit(X_train,y_train)",
      "    practice_rows.append([leaves,roc_auc_score(y_test,m.predict_proba(X_test)[:,1])])",
      "practice_result=pd.DataFrame(practice_rows,columns=['leaves','auc'])",
      "display(practice_result.round(3))"
    ),
    practiceAssert: "assert practice_result['auc'].between(0,1).all()"
  }),

  84: lesson({
    summary: "理解支持向量机的最大间隔思想、核技巧和缩放要求，比较线性核与 RBF 核。",
    objectives: ["训练 SVC 分类器", "解释 C 与 gamma 的作用", "使用 StandardScaler", "比较线性和非线性决策边界"],
    concepts: ["支持向量决定分类间隔", "C 大时更强调训练误差、正则更弱", "RBF gamma 控制单个样本影响范围", "SVC 在超大样本上训练成本较高"],
    examples: [
      { title: "线性核与 RBF 核", explanation: "同一标准化流水线下比较两种核函数。", code: lines(
        "import pandas as pd",
        "from sklearn.datasets import load_breast_cancer",
        "from sklearn.model_selection import train_test_split",
        "from sklearn.pipeline import make_pipeline",
        "from sklearn.preprocessing import StandardScaler",
        "from sklearn.svm import SVC",
        "data=load_breast_cancer(as_frame=True); X,y=data.data,data.target",
        "X_train,X_test,y_train,y_test=train_test_split(X,y,stratify=y,random_state=84)",
        "rows=[]",
        "for kernel in ['linear','rbf']:",
        "    m=make_pipeline(StandardScaler(),SVC(kernel=kernel,C=1)).fit(X_train,y_train)",
        "    rows.append([kernel,m.score(X_train,y_train),m.score(X_test,y_test),m.named_steps['svc'].n_support_.sum()])",
        "display(pd.DataFrame(rows,columns=['kernel','train','test','支持向量数']))"
      )},
      { title: "C 与 gamma", explanation: "参数共同控制 RBF 边界复杂度。", code: lines(
        "grid=[]",
        "for c in [0.1,1,10]:",
        "    for gamma in ['scale',0.01,0.1]:",
        "        m=make_pipeline(StandardScaler(),SVC(C=c,gamma=gamma)).fit(X_train,y_train)",
        "        grid.append([c,str(gamma),m.score(X_test,y_test)])",
        "display(pd.DataFrame(grid,columns=['C','gamma','test']).pivot(index='C',columns='gamma',values='test').round(3))"
      )}
    ],
    pitfalls: ["不缩放就调 C 和 gamma", "在大数据上直接运行核 SVM", "用同一测试集挑选核和参数", "开启 probability=True 后忽略额外校准成本"],
    practice: ["用 GridSearchCV 搜索 C=[0.1,1,10]", "搜索 gamma=['scale',0.01,0.1]", "输出最佳参数"],
    practiceCode: lines(
      "from sklearn.model_selection import GridSearchCV",
      "search=GridSearchCV(make_pipeline(StandardScaler(),SVC()),{'svc__C':[.1,1,10],'svc__gamma':['scale',.01,.1]},cv=5,n_jobs=-1)",
      "search.fit(X_train,y_train)",
      "print(search.best_params_,round(search.best_score_,3))"
    ),
    practiceAssert: "assert 'svc__C' in search.best_params_\nassert 0 <= search.best_score_ <= 1"
  }),

  85: lesson({
    summary: "使用 Gaussian Naive Bayes 建立快速概率分类基线，理解条件独立假设和概率平滑。",
    objectives: ["训练 GaussianNB", "理解类先验与条件似然", "获取预测概率", "用校准曲线检查概率质量"],
    concepts: ["朴素贝叶斯假设给定类别后特征条件独立", "GaussianNB 假设每类中连续特征近似高斯", "模型速度快且适合做基线", "分类准确不等于概率已经校准"],
    examples: [
      { title: "Wine 多分类基线", explanation: "GaussianNB 无需迭代优化，适合快速建立基准。", code: lines(
        "from sklearn.datasets import load_wine",
        "from sklearn.model_selection import train_test_split",
        "from sklearn.naive_bayes import GaussianNB",
        "from sklearn.metrics import classification_report, log_loss",
        "data=load_wine(as_frame=True); X,y=data.data,data.target",
        "X_train,X_test,y_train,y_test=train_test_split(X,y,stratify=y,random_state=85)",
        "nb=GaussianNB().fit(X_train,y_train)",
        "pred=nb.predict(X_test); prob=nb.predict_proba(X_test)",
        "print(classification_report(y_test,pred,target_names=data.target_names,zero_division=0))",
        "print('log loss:',round(log_loss(y_test,prob),3))"
      )},
      { title: "平滑参数比较", explanation: "var_smoothing 防止方差过小导致数值不稳定。", code: lines(
        "import pandas as pd",
        "rows=[]",
        "for smoothing in [1e-11,1e-9,1e-7,1e-5]:",
        "    m=GaussianNB(var_smoothing=smoothing).fit(X_train,y_train)",
        "    rows.append([smoothing,m.score(X_test,y_test),log_loss(y_test,m.predict_proba(X_test))])",
        "display(pd.DataFrame(rows,columns=['var_smoothing','accuracy','log_loss']))"
      )}
    ],
    pitfalls: ["把条件独立假设当成数据真实机制", "只比较准确率而忽略概率质量", "对文本计数使用 GaussianNB 而非 MultinomialNB", "小测试集上过度调 var_smoothing"],
    practice: ["设置 priors=[1/3,1/3,1/3]", "与数据学习出的类先验比较", "报告准确率和 log loss"],
    practiceCode: lines(
      "uniform_nb=GaussianNB(priors=[1/3,1/3,1/3]).fit(X_train,y_train)",
      "uniform_prob=uniform_nb.predict_proba(X_test)",
      "practice_accuracy=uniform_nb.score(X_test,y_test)",
      "practice_loss=log_loss(y_test,uniform_prob)",
      "print(round(practice_accuracy,3),round(practice_loss,3))"
    ),
    practiceAssert: "assert 0 <= practice_accuracy <= 1\nassert practice_loss >= 0"
  }),

  86: lesson({
    summary: "使用 K-Means 完成无监督分群，理解标准化、簇数选择、惯性与轮廓系数，并用已知标签仅作事后诊断。",
    objectives: ["训练 KMeans", "理解质心与簇内平方和", "标准化不同量纲特征", "使用 silhouette_score 比较簇数"],
    concepts: ["聚类没有天然正确标签", "K-Means 假设欧氏空间中的近似球形簇", "初始化会影响局部最优", "簇编号没有顺序且每次可能置换"],
    examples: [
      { title: "Wine 数据聚类", explanation: "先标准化，再用多个随机初始化提高稳定性。", code: lines(
        "import pandas as pd",
        "from sklearn.datasets import load_wine",
        "from sklearn.preprocessing import StandardScaler",
        "from sklearn.cluster import KMeans",
        "from sklearn.metrics import silhouette_score, adjusted_rand_score",
        "data=load_wine(as_frame=True); X,y=data.data,data.target",
        "Xs=StandardScaler().fit_transform(X)",
        "km=KMeans(n_clusters=3,n_init=20,random_state=86).fit(Xs)",
        "print('silhouette:',round(silhouette_score(Xs,km.labels_),3))",
        "print('与品种标签ARI（仅诊断）:',round(adjusted_rand_score(y,km.labels_),3))",
        "print(pd.crosstab(km.labels_,y,rownames=['cluster'],colnames=['wine_class']))"
      )},
      { title: "比较簇数", explanation: "惯性必然随 k 下降，应结合轮廓系数和业务可解释性。", code: lines(
        "rows=[]",
        "for k in range(2,8):",
        "    m=KMeans(n_clusters=k,n_init=20,random_state=86).fit(Xs)",
        "    rows.append([k,m.inertia_,silhouette_score(Xs,m.labels_)])",
        "result=pd.DataFrame(rows,columns=['k','inertia','silhouette'])",
        "display(result.round(3))"
      )}
    ],
    pitfalls: ["未标准化直接聚类", "把肘部图当作唯一客观答案", "把簇编号解释成高低等级", "用全部变量聚类后再以同一变量描述簇"],
    practice: ["选择轮廓系数最高的 k", "重新训练 K-Means", "输出各簇样本量"],
    practiceCode: lines(
      "best_k=int(result.loc[result.silhouette.idxmax(),'k'])",
      "best_km=KMeans(n_clusters=best_k,n_init=20,random_state=86).fit(Xs)",
      "cluster_sizes=pd.Series(best_km.labels_).value_counts().sort_index()",
      "print('best k:',best_k,'sizes:',cluster_sizes.to_dict())"
    ),
    practiceAssert: "assert 2 <= best_k <= 7\nassert cluster_sizes.sum() == len(X)"
  }),

  87: lesson({
    summary: "使用 PCA 将相关特征压缩为少数正交主成分，理解解释方差、载荷和降维流水线。",
    objectives: ["标准化后拟合 PCA", "解释 explained_variance_ratio", "选择累计解释方差阈值", "将 PCA 放入预测流水线避免泄漏"],
    concepts: ["PCA 是无监督线性投影", "主成分彼此正交且按方差排序", "载荷表示原特征与成分的线性组合", "高解释方差不保证最适合预测目标"],
    examples: [
      { title: "Wine 二维投影", explanation: "标准化后查看前两个主成分及累计解释方差。", code: lines(
        "import pandas as pd",
        "from sklearn.datasets import load_wine",
        "from sklearn.preprocessing import StandardScaler",
        "from sklearn.decomposition import PCA",
        "data=load_wine(as_frame=True); X,y=data.data,data.target",
        "Xs=StandardScaler().fit_transform(X)",
        "pca=PCA(n_components=2).fit(Xs)",
        "Z=pca.transform(Xs)",
        "print('解释方差:',pca.explained_variance_ratio_.round(3),'累计:',round(pca.explained_variance_ratio_.sum(),3))",
        "display(pd.DataFrame(Z,columns=['PC1','PC2']).assign(target=y).head())"
      )},
      { title: "载荷与成分数", explanation: "查看每个主成分主要由哪些原始特征构成。", code: lines(
        "loadings=pd.DataFrame(pca.components_.T,index=X.columns,columns=['PC1','PC2'])",
        "print('PC1绝对载荷最高:')",
        "display(loadings.PC1.abs().sort_values(ascending=False).head())",
        "pca95=PCA(n_components=.95).fit(Xs)",
        "print('达到95%累计解释方差需要成分数:',pca95.n_components_)"
      )}
    ],
    pitfalls: ["未标准化导致大尺度特征支配主成分", "把主成分解释成因果因子", "切分前拟合 PCA 造成泄漏", "仅凭解释方差决定预测性能"],
    practice: ["构建 StandardScaler + PCA(0.9) + LogisticRegression", "使用分层测试集", "报告保留成分数和准确率"],
    practiceCode: lines(
      "from sklearn.model_selection import train_test_split",
      "from sklearn.pipeline import make_pipeline",
      "from sklearn.linear_model import LogisticRegression",
      "X_train,X_test,y_train,y_test=train_test_split(X,y,stratify=y,random_state=87)",
      "pca_model=make_pipeline(StandardScaler(),PCA(n_components=.9),LogisticRegression(max_iter=500)).fit(X_train,y_train)",
      "practice_score=pca_model.score(X_test,y_test)",
      "kept=pca_model.named_steps['pca'].n_components_",
      "print('成分数:',kept,'准确率:',round(practice_score,3))"
    ),
    practiceAssert: "assert 1 <= kept < X.shape[1]\nassert 0 <= practice_score <= 1"
  }),

  88: lesson({
    summary: "使用交叉验证估计模型波动，并用 GridSearchCV 在训练数据内部选择超参数，最后只在独立测试集评估一次。",
    objectives: ["使用 StratifiedKFold", "同时报告均值和标准差", "用 GridSearchCV 搜索流水线参数", "保持最终测试集独立"],
    concepts: ["交叉验证重复利用训练数据估计泛化", "分层折保持类别比例", "超参数是拟合前配置而非模型学习参数", "嵌套选择越多，越需要独立最终测试"],
    examples: [
      { title: "多指标交叉验证", explanation: "比较逻辑回归在 5 个分层折上的准确率与 ROC-AUC 波动。", code: lines(
        "import pandas as pd",
        "from sklearn.datasets import load_breast_cancer",
        "from sklearn.model_selection import train_test_split, StratifiedKFold, cross_validate",
        "from sklearn.pipeline import make_pipeline",
        "from sklearn.preprocessing import StandardScaler",
        "from sklearn.linear_model import LogisticRegression",
        "data=load_breast_cancer(as_frame=True); X,y=data.data,data.target",
        "X_train,X_test,y_train,y_test=train_test_split(X,y,stratify=y,test_size=.2,random_state=88)",
        "pipe=make_pipeline(StandardScaler(),LogisticRegression(max_iter=1000))",
        "cv=StratifiedKFold(n_splits=5,shuffle=True,random_state=88)",
        "scores=cross_validate(pipe,X_train,y_train,cv=cv,scoring=['accuracy','roc_auc'])",
        "print(pd.DataFrame(scores)[['test_accuracy','test_roc_auc']].agg(['mean','std']).round(4))"
      )},
      { title: "流水线参数搜索", explanation: "参数名使用步骤名双下划线；搜索只使用训练集。", code: lines(
        "from sklearn.model_selection import GridSearchCV",
        "search=GridSearchCV(pipe,{'logisticregression__C':[.01,.1,1,10,100]},scoring='roc_auc',cv=cv,n_jobs=-1,return_train_score=True)",
        "search.fit(X_train,y_train)",
        "print('最佳参数:',search.best_params_,' CV AUC:',round(search.best_score_,4))",
        "print('独立测试 AUC:',round(search.score(X_test,y_test),4))",
        "display(pd.DataFrame(search.cv_results_)[['param_logisticregression__C','mean_train_score','mean_test_score','std_test_score']].round(4))"
      )}
    ],
    pitfalls: ["调参前已经多次查看测试集", "只报告最佳均值不报告波动", "预处理不在 Pipeline 内导致折间泄漏", "盲目扩大搜索空间造成多重尝试偏差"],
    practice: ["同时搜索 penalty='l1'/'l2' 和 C", "使用 solver='liblinear'", "输出最优参数和测试 AUC"],
    practiceCode: lines(
      "practice_pipe=make_pipeline(StandardScaler(),LogisticRegression(max_iter=1000,solver='liblinear'))",
      "practice_search=GridSearchCV(practice_pipe,{'logisticregression__C':[.01,.1,1,10],'logisticregression__penalty':['l1','l2']},scoring='roc_auc',cv=cv,n_jobs=-1)",
      "practice_search.fit(X_train,y_train)",
      "practice_test_score=practice_search.score(X_test,y_test)",
      "print(practice_search.best_params_,round(practice_test_score,4))"
    ),
    practiceAssert: "assert 0 <= practice_test_score <= 1\nassert 'logisticregression__penalty' in practice_search.best_params_"
  }),

  89: lesson({
    summary: "在类别不平衡任务中使用 PR-AUC、类别权重和阈值选择，使模型评价与漏判、误报和业务容量一致。",
    objectives: ["识别准确率陷阱", "计算 ROC-AUC 与 PR-AUC", "使用 class_weight", "按目标召回率或有限容量选择阈值"],
    concepts: ["PR-AUC 的基线等于正类比例", "类别权重改变训练损失而非数据本身", "阈值决定最终错误成本", "重采样和阈值必须只依据训练/验证数据设计"],
    examples: [
      { title: "构造不平衡任务", explanation: "从乳腺癌数据中固定抽取较少正类，演示准确率为何可能误导。", code: lines(
        "import numpy as np",
        "import pandas as pd",
        "from sklearn.datasets import load_breast_cancer",
        "from sklearn.model_selection import train_test_split",
        "data=load_breast_cancer(as_frame=True); X=data.data; original=data.target",
        "rng=np.random.default_rng(89)",
        "positive_idx=np.flatnonzero(original.to_numpy()==0)",
        "negative_idx=np.flatnonzero(original.to_numpy()==1)",
        "keep=np.r_[rng.choice(positive_idx,60,replace=False),negative_idx]",
        "X_imb=X.iloc[keep]; y_imb=(original.iloc[keep].to_numpy()==0).astype(int)",
        "X_train,X_test,y_train,y_test=train_test_split(X_imb,y_imb,stratify=y_imb,test_size=.3,random_state=89)",
        "print('正类比例:',round(y_imb.mean(),3),' 全预测负类准确率:',round(1-y_test.mean(),3))"
      )},
      { title: "权重、概率与阈值", explanation: "比较普通与平衡权重模型，并按验证目标选择阈值。", code: lines(
        "from sklearn.pipeline import make_pipeline",
        "from sklearn.preprocessing import StandardScaler",
        "from sklearn.linear_model import LogisticRegression",
        "from sklearn.metrics import roc_auc_score,average_precision_score,precision_score,recall_score",
        "rows=[]; models={}",
        "for name,weight in [('普通',None),('平衡','balanced')]:",
        "    m=make_pipeline(StandardScaler(),LogisticRegression(max_iter=1000,class_weight=weight)).fit(X_train,y_train)",
        "    p=m.predict_proba(X_test)[:,1]; pred=p>=.5; models[name]=(m,p)",
        "    rows.append([name,roc_auc_score(y_test,p),average_precision_score(y_test,p),precision_score(y_test,pred),recall_score(y_test,pred)])",
        "display(pd.DataFrame(rows,columns=['模型','ROC_AUC','PR_AUC','precision','recall']).set_index('模型').round(3))"
      )},
      { title: "有限容量 Top-K", explanation: "当人工复核只能覆盖 10% 样本时，直接评价最高分名单。", code: lines(
        "prob=models['平衡'][1]",
        "ranked=pd.DataFrame({'y':y_test,'prob':prob}).sort_values('prob',ascending=False)",
        "k=max(1,int(len(ranked)*.1)); top=ranked.head(k)",
        "lift=top.y.mean()/ranked.y.mean()",
        "print(f'Top 10% 样本={k}, precision={top.y.mean():.3f}, lift={lift:.2f}, recall={top.y.sum()/ranked.y.sum():.3f}')"
      )}
    ],
    pitfalls: ["不平衡任务只报告准确率", "在测试集上选择阈值再报告测试性能", "使用类别权重后仍假设概率天然校准", "只追求召回率而不考虑人工容量和误报成本"],
    practice: ["在平衡权重模型上寻找召回率至少 0.8 的最高阈值", "报告精确率", "输出阈值和两个指标"],
    practiceCode: lines(
      "choices=[]",
      "for threshold in np.linspace(.05,.95,91):",
      "    pred=prob>=threshold; recall=recall_score(y_test,pred)",
      "    if recall>=.8: choices.append((threshold,precision_score(y_test,pred),recall))",
      "selected=max(choices,key=lambda x:x[0])",
      "print('threshold, precision, recall:',tuple(round(v,3) for v in selected))"
    ),
    practiceAssert: "assert selected[2] >= 0.8\nassert 0 < selected[0] < 1"
  })
};
