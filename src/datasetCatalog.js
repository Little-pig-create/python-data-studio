export const publicDatasets = [
  { id: "module1-scores", name: "模块一班级成绩", file: "module1_scores.csv", category: "课程实训", rows: "500 行", description: "为模块一文件处理综合练习准备的模拟成绩数据，包含正常记录、重复记录和少量异常记录。" },
  { id: "titanic", name: "Titanic 生存预测", file: "titanic.csv", category: "分类", rows: "891 行", description: "经典二分类数据，适合缺失值处理、特征工程和分类模型入门。" },
  { id: "online-retail", name: "Online Retail 交易", file: "uci_online_retail_200k.csv", category: "消费分析", rows: "200,000 行", description: "英国零售交易样本，适合 RFM、复购和用户价值分析。" },
  { id: "olist-orders", name: "Olist 电商订单", file: "olist_orders_dataset.csv", category: "物流", rows: "99,441 行", description: "巴西电商订单主表，适合履约时效与延期风险分析。" },
  { id: "olist-items", name: "Olist 订单明细", file: "olist_order_items_dataset.csv", category: "物流", rows: "112,650 行", description: "订单商品明细，可与订单、商家和客户表联动分析。" },
  { id: "bike-sharing", name: "Bike Sharing 需求", file: "bike_sharing_hour.csv", category: "回归", rows: "17,379 行", description: "小时级共享单车数据，适合时间特征、回归和需求预测。" },
  { id: "bank-marketing", name: "Bank Marketing", file: "bank_marketing_full.csv", category: "分类", rows: "45,211 行", separator: ";", description: "银行电话营销数据，适合不平衡分类与营销响应预测。" },
  { id: "diamonds", name: "Diamonds 钻石价格", file: "diamonds.csv", category: "探索分析", rows: "53,940 行", description: "钻石特征与价格数据，适合可视化、回归和异常值分析。" },
  { id: "gapminder", name: "Gapminder 国家发展", file: "gapminder.csv", category: "可视化", rows: "1,704 行", description: "国家年度发展指标，适合时间序列与交互式可视化。" },
  { id: "penguins", name: "Palmer Penguins", file: "penguins.csv", category: "分类", rows: "344 行", description: "企鹅测量数据，适合小数据探索、缺失值处理和分类。" },
  { id: "taxis", name: "NYC Taxis", file: "taxis.csv", category: "探索分析", rows: "6,433 行", description: "纽约出租车行程样本，适合日期处理和运营效率分析。" }
];

export const readCodeForDataset = (dataset) => {
  const options = dataset.separator ? `, sep=${JSON.stringify(dataset.separator)}` : "";
  return `import pandas as pd\n\nurl = "/datasets/${dataset.file}"\ndf = pd.read_csv(url${options})\ndf.head()`;
};
