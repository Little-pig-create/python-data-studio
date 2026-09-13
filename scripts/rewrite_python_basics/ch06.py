"""第6章 字典：命名记录与聚合"""

TITLE = "字典：命名记录与聚合"
EST_MINUTES = 50

CELLS = [
    ("md", """\
# 第6章 字典：命名记录与聚合

元组取字段要靠“数位置”：`record[3]` 是金额——可读性差，位置一换全错。
**字典（dict）**按**名字**存取数据：`record["amount"]`。

这一章把记账记录升级成字典，并学会字典最强大的用途——**聚合统计**
（每个类别花了多少、每种支付方式几笔）。""", []),

    ("md", """\
## 学习目标

学完本章，你能够：

- 创建字典，按键读写、增删字段，理解“键必须唯一”；
- 用 `get()` 安全取值，说出它和 `[]` 的区别；
- 用 `keys()`、`values()`、`items()` 遍历字典；
- 用字典完成“按类别聚合金额”这一经典统计。""", []),

    ("md", """\
## 6.1 字典基础：按键存取

**概念**：字典由**键值对**组成：`{"amount": 25.5}`。
键通常是字符串（或数字/元组），**不可重复**；值可以是任何类型。
`d[key]` 读取，`d[key] = v` 新增或修改，`del d[key]` 删除。""", []),

    ("md", "### 例 1｜最小例子：增删改查", []),

    ("code", """\
record = {"date": "2026-08-01", "summary": "午餐", "amount": 25.5}

print(record["summary"])    # 午餐：按键取
record["amount"] = 26.0     # 改
record["category"] = "餐饮"  # 增：键不存在就是新增
del record["summary"]       # 删
print(record)""", ["example"]),

    ("md", "### 例 2｜业务例子：一笔账的字典档案", []),

    ("code", """\
record = {
    "date": "2026-08-01",
    "summary": "午餐-黄焖鸡",
    "category": "餐饮",
    "amount": 25.5,
    "paid_by": "微信",
}

print(f"{record['summary']} 花了 {record['amount']} 元")
print(f"支付方式: {record['paid_by']}")""", ["example"]),

    ("md", """\
**输出解读**：取值时外层用双引号、内层用单引号，避免引号冲突。
比元组好在哪？`record[3]` 三个月后没人记得是什么，`record["amount"]` 谁都看得懂。

### 例 3｜常见错误：访问不存在的键""", []),

    ("code", """\
record = {"amount": 25.5}

# 反例：键不存在直接 KeyError
# print(record["coupon"])    # KeyError: 'coupon'

# 修复 1：get() 取不到给默认值，不报错
print(record.get("coupon"))          # None
print(record.get("coupon", 0.0))     # 0.0：常用“没有优惠就是 0”

# 修复 2：先 in 判断（或第 8 章 if / 第 13 章 try）
if "coupon" in record:
    print(record["coupon"])
else:
    print("没有优惠券字段")""", ["example"]),

    ("md", """\
**要点**：`d[key]` 用于“肯定存在”的键；`d.get(key, 默认)` 用于“可能没有”的键。
拿不准就用 `get`，这是减少 KeyError 的第一步。""", []),

    ("md", """\
## 6.2 遍历：keys、values、items

**概念**：三种遍历——`for k in d`（默认遍历键）、`d.values()`（只要值）、
`d.items()`（键值一起拿，循环里解包成 `for k, v in ...`）。
第 9 章才正式学 for，这里先认识形态，练一练里会先用起来。""", []),

    ("md", "### 例 1｜最小例子：三种遍历的样子", []),

    ("code", """\
record = {"餐饮": 25.5, "交通": 4.0, "娱乐": 45.0}

for key in record:                 # 默认遍历键
    print(key, end="; ")
print()
print(list(record.values()))       # 值的集合
for category, amount in record.items():   # 键值解包
    print(f"{category}: {amount} 元")""", ["example"]),

    ("md", "### 例 2｜业务例子：账单字段清单", []),

    ("code", """\
record = {
    "date": "2026-08-01",
    "summary": "午餐-黄焖鸡",
    "category": "餐饮",
    "amount": 25.5,
}

for field, value in record.items():
    print(f"{field:>8}: {value}")   # :>8 右对齐 8 个字符，输出更整齐""", ["example"]),

    ("md", "### 例 3｜常见错误：遍历时增删键", []),

    ("code", """\
prices = {"午餐": 25.5, "地铁": 4.0}

# 反例：边遍历边删除会报错
# for key in prices:
#     if prices[key] < 10:
#         del prices[key]    # RuntimeError: dictionary changed size

# 修复：先收集要删的键，遍历结束后再删
to_drop = [key for key in prices if prices[key] < 10]
for key in to_drop:
    del prices[key]
print(prices)    # {'午餐': 25.5}""", ["example"]),

    ("md", """\
**要点**：Python 明确禁止遍历字典时增删键。套路是
**先找齐（列表推导暂记），后动手**。""", []),

    ("md", """\
## 6.3 聚合统计：字典的看家本领

**概念**：业务里最常见的问题——“每类合计多少”。
字典聚合模板三步：**建空字典 → 逐条累加 → 得到结果**：

```python
totals = {}
totals[类别] = totals.get(类别, 0) + 金额
```

`get(key, 0)` 首次出现时从 0 起步，之后不断累加。""", []),

    ("md", "### 例 1｜最小例子：数出现次数", []),

    ("code", """\
words = ["餐饮", "交通", "餐饮", "娱乐", "餐饮"]

counts = {}
for word in words:
    counts[word] = counts.get(word, 0) + 1
print(counts)    # {'餐饮': 3, '交通': 1, '娱乐': 1}""", ["example"]),

    ("md", "### 例 2｜业务例子：按类别聚合月支出", []),

    ("code", """\
# 8 月前几笔账：(类别, 金额)
records = [
    ("餐饮", 25.5),
    ("交通", 4.0),
    ("餐饮", 18.0),
    ("娱乐", 45.0),
    ("交通", 88.0),
]

totals = {}
for category, amount in records:
    totals[category] = totals.get(category, 0.0) + amount

for category, total in totals.items():
    print(f"{category}: {total:.1f} 元")
print(f"最大开销类别: {max(totals, key=totals.get)}")""", ["example"]),

    ("md", """\
**输出解读**：`餐饮: 43.5 元`、`交通: 92.0 元`、`娱乐: 45.0 元`，最大开销是交通。
`max(totals, key=totals.get)` 的意思是“按值比较，返回值最大的键”——
这行惯用法值得直接背下来。

### 例 3｜常见错误：新键直接做加法""", []),

    ("code", """\
totals = {"餐饮": 25.5}

# 反例：新类别直接 += 会 KeyError
category, amount = "交通", 4.0
# totals[category] += amount    # KeyError: '交通'

# 修复：get(key, 0) 起步
totals[category] = totals.get(category, 0.0) + amount
print(totals)    # {'餐饮': 25.5, '交通': 4.0}""", ["example"]),

    ("md", """\
**要点**：`totals[k] += v` 隐含“先读取”，键不存在就崩。
**累加一律 `totals[k] = totals.get(k, 0) + v`**，一劳永逸。""", []),

    ("md", """\
## 6.4 嵌套：列表装字典——真正的账本

**概念**：真实数据的标准形态是 **列表装字典**（一条记录一个字典）。
第 19 章的 pandas DataFrame 就是它的升级版。这里先练“从一堆字典里取数”。""", []),

    ("md", "### 例 1｜业务例子：账本与月度合计", []),

    ("code", """\
ledger = [
    {"date": "08-01", "summary": "午餐", "category": "餐饮", "amount": 25.5},
    {"date": "08-01", "summary": "地铁", "category": "交通", "amount": 4.0},
    {"date": "08-02", "summary": "电影", "category": "娱乐", "amount": 45.0},
    {"date": "08-02", "summary": "晚餐", "category": "餐饮", "amount": 32.0},
]

total = 0.0
for record in ledger:
    total += record["amount"]
print(f"共 {len(ledger)} 笔，合计 {total:.1f} 元")

# 找出金额最大的一笔
biggest = max(ledger, key=lambda r: r["amount"])   # lambda 第 11 章细讲
print("最大单笔:", biggest["summary"], biggest["amount"])""", ["example"]),

    ("md", "### 例 2｜常见错误：键名大小写/空格不一致", []),

    ("code", """\
ledger = [
    {"amount": 25.5},
    {"Amount": 4.0},     # 手滑：大写 A
]

# 反例：sum 时一半记录读不到
# total = sum(r["amount"] for r in ledger)   # KeyError: 'Amount'

# 修复：写入端统一键名（治本），读取端防御（治标）
total = 0.0
for record in ledger:
    total += record.get("amount", 0.0)
print(total)    # 25.5：坏记录被跳过，但要意识到 4.0 丢了——防御不是掩盖""", ["example"]),

    ("md", """\
**要点**：聚合结果莫名其妙偏小时，第一嫌疑就是**键名不一致或空值被 get 吞掉**。
用 `get(..., 0.0)` 兜底的同时，最好顺手统计一下“兜底发生了几次”。""", []),

    ("md", """\
## 综合练习""", []),

    ("md", "### 练一练 6.1：安全读取", ["exercise"]),

    ("code", """\
record = {"summary": "咖啡", "amount": 18.0}

# TODO 1：安全取出 "category"（没有就默认 "未分类"），存入 category
# TODO 2：安全取出 "coupon"（没有就默认 0.0），存入 coupon
# TODO 3：打印 实付 = amount - coupon，格式形如：实付 18.0 元""", ["exercise"]),

    ("md", "### 练一练 6.2：按支付方式聚合", ["exercise"]),

    ("code", """\
records = [
    ("微信", 25.5),
    ("支付宝", 88.0),
    ("微信", 4.0),
    ("现金", 12.0),
    ("微信", 45.0),
]

# TODO：用 get 聚合模板统计每种支付方式的金额，
#       打印每种方式的合计，并用 max(key=...) 打印主力支付方式""", ["exercise"]),

    ("md", "### 练一练 6.3：账本台账", ["exercise"]),

    ("code", """\
ledger = [
    {"summary": "午餐", "category": "餐饮", "amount": 25.5},
    {"summary": "地铁", "category": "交通", "amount": 4.0},
    {"summary": "晚餐", "category": "餐饮", "amount": 32.0},
]

# TODO 1：打印账目总数与总金额
# TODO 2：用 items 遍历 + 聚合模板，得到每类合计 totals
# TODO 3：打印最大开销类别及其金额""", ["exercise"]),

    ("md", """\
## 易错点清单

- `d[key]` 遇到不存在的键直接 KeyError，可能缺就用 `d.get(key, 默认)`；
- 键必须唯一，重复赋值是“覆盖”不是“报错”；
- 遍历字典时增删键会 RuntimeError，先收集后删除；
- `totals[k] += v` 对新键报错，累加用 `totals[k] = totals.get(k, 0) + v`；
- 聚合结果偏小：查键名不一致与空值兜底。""", []),

    ("md", """\
## 本章小结

- 字典按名字存取，`get` 是安全读取的第一反应。
- 聚合模板 `d[k] = d.get(k, 0) + v` 是纯 Python 统计的基石。
- 列表装字典是最小版账本；pandas（第 19 章）把它推向生产级。
- 下一章：只关心“出现过哪些类别”时，字典都嫌重——集合登场。""", []),

    ("md", """\
## 参考答案""", []),

    ("code", """\
# 练一练 6.1 参考答案
record = {"summary": "咖啡", "amount": 18.0}

category = record.get("category", "未分类")
coupon = record.get("coupon", 0.0)
print(f"实付 {record['amount'] - coupon} 元")""", ["solution"]),

    ("code", """\
# 练一练 6.2 参考答案
records = [
    ("微信", 25.5),
    ("支付宝", 88.0),
    ("微信", 4.0),
    ("现金", 12.0),
    ("微信", 45.0),
]

totals = {}
for method, amount in records:
    totals[method] = totals.get(method, 0.0) + amount

for method, total in totals.items():
    print(f"{method}: {total:.1f} 元")
print("主力支付:", max(totals, key=totals.get))""", ["solution"]),

    ("code", """\
# 练一练 6.3 参考答案
ledger = [
    {"summary": "午餐", "category": "餐饮", "amount": 25.5},
    {"summary": "地铁", "category": "交通", "amount": 4.0},
    {"summary": "晚餐", "category": "餐饮", "amount": 32.0},
]

print(f"共 {len(ledger)} 笔，合计 {sum(r['amount'] for r in ledger):.1f} 元")

totals = {}
for record in ledger:
    totals[record["category"]] = totals.get(record["category"], 0.0) + record["amount"]

top = max(totals, key=totals.get)
print(f"最大开销类别: {top}（{totals[top]:.1f} 元）")""", ["solution"]),
]
