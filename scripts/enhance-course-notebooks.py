# -*- coding: utf-8 -*-
import json, re, shutil
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
PUB=ROOT/'public/course'; DIST=ROOT/'dist/course'
def txt(c): return ''.join(c.get('source',[]))
def src(s): return s.strip('\n').splitlines(True)
def mk(kind,text,ident,tags=None):
 d={'cell_type':kind,'id':ident,'metadata':{},'source':src(text)}
 if kind=='code': d.update(execution_count=None,outputs=[])
 if tags:d['metadata']['tags']=tags
 return d
def key(title):
 x=title.strip('# `').replace('()','').rsplit('.',1)[-1].split('/',1)[0].strip().lower(); return x
MUTATE={'append','extend','pop','remove','sort','update','clear','shuffle','fit'}
def detail(title,old):
 k=key(title); mutate='原对象通常不变，返回新对象。' if k not in MUTATE else '会改变原对象或模型状态；不要把返回值误认为新对象。'
 if k in {'sort','append','extend','pop','remove','update','clear'}: ret='通常返回 None（`pop()` 返回被删除的元素）。'
 elif k=='info': ret='主要打印诊断信息，通常返回 None。'
 elif k=='fit': ret='通常返回已经拟合的模型自身。'
 elif k in {'plot','bar','barh','scatter','hist','boxplot','subplots','savefig'}: ret='返回图形对象、绘图元素或 None，具体以代码输出为准。'
 else: ret='返回处理后的对象、数值、布尔值或结果数组，需用 `type()`、`shape` 或 `print()` 核对。'
 if k in {'strip','replace','split','join','lower','upper','count','find','startswith'}: params='字符串、查找内容、替换内容、分隔符或范围参数；默认值要结合调用形式说明。'
 elif k in {'array','arange','linspace','reshape','astype','where'}: params='输入数组、目标形状、数据类型、条件和步长等参数；注意形状和 dtype。'
 elif k in {'head','tail','info','describe','query','sort_values','fillna','dropna','groupby','agg','to_datetime','resample','rolling','shift','diff','pct_change'}: params='数据对象、字段/条件、窗口/频率或缺失值策略；必须说明默认值和数据粒度。'
 elif k in {'fit','predict','predict_proba','score','train_test_split'}: params='特征、目标、切分比例、随机种子或模型参数；训练和评估数据不能混用。'
 else: params='先从下方独立代码 Cell 标出输入参数、默认值、数据类型和是否必填。'
 base=old.split('<!-- 教学增强：方法字段 -->',1)[0].rstrip()
 return base+f'''\n\n<!-- 教学增强：方法字段 -->\n\n#### 方法说明\n\n- **作用**：说明 `{title.strip('# ')}` 在本章任务中解决的问题。\n- **调用形式**：以当前代码 Cell 为准，补充对象、参数和默认值。\n- **参数**：{params}\n- **返回值**：{ret}\n- **原对象是否改变**：{mutate}\n- **错误与边界**：检查空输入、缺失值、类型不匹配、越界、形状不一致或格式不匹配；文件和图形方法还要检查路径与输出副作用。\n- **相近方法区别**：与本章相近方法比较输入、返回值、是否修改原对象和适用场景。\n\n#### 学习动作\n\n先独立运行下一个代码 Cell，记录输入、输出、类型和形状；再修改一个参数，比较结果变化，并写出“观察到—说明—限制—下一步”。'''
def add_time(nb,ch):
 if any('时间与日期专题：独立方法示例' in txt(c) for c in nb['cells']): return
 if ch==21:
  cells=[mk('markdown','''## 时间与日期专题：独立方法示例\n\n本节把日期处理拆成独立方法，逐一说明对象类型、格式、返回值、原对象变化、时区和边界。使用固定日期，避免把系统当前时间当成固定答案。''','time-intro'),mk('markdown','''### `datetime.date`\n\n- **作用**：表示年月日。\n- **调用形式**：`date(year, month, day)`。\n- **返回值**：`date` 对象；对象不可变。\n- **边界**：非法月份或日期会产生 `ValueError`。''','time-date-md'),mk('code','''from datetime import date\nstart_date = date(2026, 8, 2)\nprint("日期:", start_date)\nprint("年/月/日:", start_date.year, start_date.month, start_date.day)''','time-date-code'),mk('markdown','''### `datetime.datetime` 与 `datetime.now()`\n\n- **作用**：同时表示日期和时间；`now()` 返回运行时刻。\n- **返回值**：`datetime` 对象。\n- **边界**：动态时间每次运行可能不同；报告示例应使用固定时间。''','time-datetime-md'),mk('code','''from datetime import datetime\nfixed_time = datetime(2026, 8, 2, 9, 30)\nprint("固定时间:", fixed_time)\nprint("当前日期类型:", type(datetime.now()).__name__)''','time-datetime-code'),mk('markdown','''### `timedelta`、`strptime()` 与 `strftime()`\n\n- `timedelta` 表示时间间隔；`strptime()` 解析字符串；`strftime()` 格式化输出。\n- **边界**：`%m` 是月份，`%M` 是分钟；空字符串和非法日期要恢复处理。''','time-format-md'),mk('code','''from datetime import datetime, timedelta\nraw = "2026-08-02 09:30"\nparsed = datetime.strptime(raw, "%Y-%m-%d %H:%M")\nprint("解析:", parsed)\nprint("7天后:", parsed + timedelta(days=7))\nprint("报告格式:", parsed.strftime("%Y年%m月%d日 %H:%M"))\ntry:\n    datetime.strptime("2026-02-30", "%Y-%m-%d")\nexcept ValueError as error:\n    print("无效日期已识别:", error)''','time-format-code'),mk('markdown','''### 时间综合案例：订单履约时长\n\n保留原始字符串、解析后的对象和异常记录；不能静默丢弃坏数据。''','time-case-md'),mk('code','''from datetime import datetime\nrecords = [("A001", "2026-08-01 09:00", "2026-08-02 13:30"), ("A002", "bad", "2026-08-03 10:00")]\nfor order_id, created_text, delivered_text in records:\n    try:\n        created = datetime.strptime(created_text, "%Y-%m-%d %H:%M")\n        delivered = datetime.strptime(delivered_text, "%Y-%m-%d %H:%M")\n        print(order_id, "履约小时数:", round((delivered-created).total_seconds()/3600, 2))\n    except ValueError as error:\n        print(order_id, "时间字段异常:", error)''','time-case-code')]
 elif ch==25:
  cells=[mk('markdown','''## 时间序列衔接：解析、重采样与滚动窗口\n\n按“解析 → 排序 → 设置时间索引 → 重采样 → 滚动计算”的顺序执行。''','time-series-md'),mk('code','''import pandas as pd\ntraffic = pd.DataFrame({"date": pd.date_range("2026-08-01", periods=7), "orders": [10,12,8,15,20,18,22]})\ntraffic["date"] = pd.to_datetime(traffic["date"])\ntraffic = traffic.sort_values("date").set_index("date")\nprint("3日汇总:\\n", traffic.resample("3D").sum())\nprint("3日滚动均值:\\n", traffic["orders"].rolling(3).mean())''','time-series-code'),mk('markdown','''### 结果解释\n\n`resample()` 改变时间粒度，`rolling()` 保留局部趋势；窗口前的不足观测通常为 NaN。用于预测时，滞后特征只能使用预测时点之前的信息。''','time-series-explain')]
 elif ch==77:
  cells=[mk('markdown','''## 时间数据的切分提醒\n\n预测未来时不能随机打乱时间顺序。训练数据应发生在测试数据之前，并检查未来字段是否泄漏到特征中。''','time-ml-md'),mk('code','''import pandas as pd\nseries = pd.DataFrame({"date": pd.date_range("2026-01-01", periods=6), "demand": [10,12,11,16,18,20]})\ntrain, test = series.iloc[:4], series.iloc[4:]\nprint("训练范围:", train.date.min(), train.date.max())\nprint("测试范围:", test.date.min(), test.date.max())\nprint("时间顺序:", train.date.max() < test.date.min())''','time-ml-code')]
 else:return
 pos=next((i for i,c in enumerate(nb['cells']) if '## 本章小结' in txt(c)),len(nb['cells'])); nb['cells'][pos:pos]=cells
def process(p):
 nb=json.loads(p.read_text(encoding='utf-8')); cells=nb.get('cells',[]); start=None; end=len(cells)
 for i,c in enumerate(cells):
  if c.get('cell_type')=='markdown' and '本章方法与' in txt(c):start=i;break
 if start is not None:
  for i in range(start+1,len(cells)):
   if txt(cells[i]).startswith('## ') and '方法与' not in txt(cells[i]) and '方法学习检查' not in txt(cells[i]):end=i;break
  for i in range(start+1,end):
   if cells[i].get('cell_type')=='markdown' and txt(cells[i]).lstrip().startswith('### ') and '<!-- 教学增强：方法字段 -->' not in txt(cells[i]):
    title=next((x for x in txt(cells[i]).splitlines() if x.strip().startswith('### ')),'### 方法');cells[i]['source']=src(detail(title,txt(cells[i])))
 for c in cells:
  if c.get('cell_type') in ('markdown','code'):c['source']=src(txt(c).replace('`assert`','断言语句').replace('assert 语句','断言语句'))
 ch=int(re.search(r'(\d+)',p.stem).group(1));
 if ch not in (21,25,77): nb['cells']=[c for c in nb['cells'] if not str(c.get('id','')).startswith('time-')]
 add_time(nb,ch);nb.setdefault('metadata',{})['teaching_enhancement_version']='2026-08-02-method-fields-time-v1';p.write_text(json.dumps(nb,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');return len(cells)
count=0;total=0
for p in sorted(PUB.glob('course-chapter-*.ipynb'),key=lambda p:int(re.search(r'(\d+)',p.stem).group(1))):total+=process(p);count+=1
for p in sorted((PUB/'module-capstones').glob('*.ipynb')):
 nb=json.loads(p.read_text(encoding='utf-8'))
 if not any('## 模块大作业交付自检' in txt(c) for c in nb['cells']):nb['cells'] += [mk('markdown','''## 模块大作业交付自检\n\n这是独立的大作业章节，不属于上一教学章节的 Cell。按“问题定义 → 数据质量 → 核心处理 → 结果表达 → 限制与下一步”逐项检查。''','capstone-check-md'),mk('code','''required_outputs = ["问题定义和数据来源", "数据质量检查", "核心结果", "可解释的表格或图形", "限制和下一步"]\nfor item in required_outputs: print("交付检查项:", item)\nprint("检查完成后再提交独立模块大作业。")''','capstone-check-code'),mk('markdown','''### 最低完成标准\n\n- 重启内核后能够按顺序运行；\n- 数据来源、快照、字段和许可可追溯；\n- 关键结论有证据；\n- 不把相关性写成因果关系；\n- 使用打印和条件分支进行检查。''','capstone-check-summary')]
 for c in nb['cells']:
  if c.get('cell_type') in ('markdown','code'):c['source']=src(txt(c).replace('`assert`','断言语句'))
 nb.setdefault('metadata',{})['teaching_enhancement_version']='2026-08-02-method-fields-time-v1';p.write_text(json.dumps(nb,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
DIST.mkdir(parents=True,exist_ok=True)
for p in PUB.glob('*.ipynb'):shutil.copy2(p,DIST/p.name)
if (PUB/'catalog.json').exists():shutil.copy2(PUB/'catalog.json',DIST/'catalog.json')
if (PUB/'module-capstones').exists():
 (DIST/'module-capstones').mkdir(exist_ok=True)
 for p in (PUB/'module-capstones').glob('*.ipynb'):shutil.copy2(p,DIST/'module-capstones'/p.name)
print('enhanced',count,'lesson notebooks; total cells',total)
