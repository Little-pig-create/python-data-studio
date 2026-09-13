"""第9章 循环与迭代：批量处理账目"""

TITLE = "循环与迭代：批量处理账目"
EST_MINUTES = 55

CELLS = [
    ("md", """\
# 第9章 循环与迭代：批量处理账目

一个月 60 笔账，不可能每笔写一行代码。**循环**让一段代码对每条数据各执行一次，
是“批量处理”的全部秘密。

本章把前八章攒下的零件（列表、字典、条件）组装成真正的
**月度账单统计程序**。""", []),

    ("md", """\
## 学习目标

学完本章，你能够：

- 用 for 遍历列表、字典和数字序列；
- 用累计器（total、计数器）和条件筛选完成报表统计；
- 用 while 处理“次数未知”的场景，并用 break / continue 控制流程；
- 说出循环四大坑：range 差一、遍历时改列表、死循环、缩进错位。""", []),

    ("md", """\
## 9.1 for：对每条数据做一次

**概念**：for 循环逐个取出序列中的元素：

```python
for 元素 in 序列:
    处理这个元素
```

冒号 + 缩进的老规矩不变。**遍历列表时不要在循环体内增删这个列表**。""", []),

    ("md", "### 例 1｜最小例子：逐个打印", []),

    ("code", """\
fruits = ["苹果", "香蕉", "橙子"]

for fruit in fruits:      # 每轮循环，fruit 依次是列表里的一项
    print("今日水果:", fruit)""", ["example"]),

    ("md", "### 例 2｜业务例子：逐笔核对账目", []),

    ("code", """\
spends = [18.5, 6.0, 25.5, 32.0, 88.0]

total = 0.0               # 累计器：循环前先定义
for amount in spends:
    total += amount       # 每轮累加
    print(f"记入 {amount:6.1f} 元，小计 {total:6.1f} 元")

print(f"月合计 {total:.1f} 元")""", ["example"]),

    ("md", """\
**输出解读**：六行输出，最后一行 `月合计 170.0 元`。
**累计器三步**：循环前置 0 → 循环内累加 → 循环后使用。
这个模式叫**聚合循环**，是所有统计代码的骨架。

### 例 3｜常见错误：循环里增删列表""", []),

    ("code", """\
spends = [18.5, 0.0, 6.0, 0.0, 25.5]

# 反例：边遍历边删除，会跳过元素
# for amount in spends:
#     if amount == 0.0:
#         spends.remove(amount)   # 删完后列表缩短，下一项被跳过
# print(spends)                   # 结果不可靠！

# 修复 1：建新列表（推荐）
valid = []
for amount in spends:
    if amount > 0:
        valid.append(amount)
print(valid)

# 修复 2：先复制再删原列表
for amount in spends.copy():
    if amount == 0.0:
        spends.remove(amount)
print(spends)""", ["example"]),

    ("md", """\
**要点**：**“改旧列表”几乎总该改成“建新列表”。** 输出一样时优先选前者——
意图更清晰，也没有跳元素的坑。""", []),

    ("md", """\
## 9.2 range 与 enumerate：带编号的循环

**概念**：
`range(n)` 产生 0 到 n-1 的整数序列（含头不含尾，和切片同规则）；
`range(start, stop, step)` 可指定起点终点步长。
要“第几条 + 内容”时用 `enumerate(xs)`（第 5 章已见过），**不要**手写 `i += 1`。""", []),

    ("md", "### 例 1｜最小例子：range 的三副面孔", []),

    ("code", """\
print(list(range(3)))          # [0, 1, 2]：到 n-1 停
print(list(range(1, 4)))       # [1, 2, 3]：含头不含尾
print(list(range(10, 0, -2)))  # [10, 8, 6, 4, 2]：倒着走""", ["example"]),

    ("md", "### 例 2｜业务例子：按周汇总月账目", []),

    ("code", """\
month = [18.5, 6.0, 25.5, 32.0,   # 第 1 周
         12.0, 88.0, 45.9, 9.9]   # 第 2 周（演示 8 天账）

for week_no, start in enumerate(range(0, len(month), 4), start=1):
    week_end = start + 4                      # 本周结束位置
    week_total = sum(month[start:week_end])   # 切片取出本周
    print(f"第 {week_no} 周合计: {week_total:.1f} 元")""", ["example"]),

    ("md", """### 例 3｜常见错误：range 差一""", []),

    ("code", """\
spends = [18.5, 6.0, 25.5]

# 反例：想要 3 个却只拿到 2 个
print(list(range(1, len(spends))))     # [1, 2]：漏了 0 号

# 正确：range(len(...)) 从 0 开始
print(list(range(len(spends))))        # [0, 1, 2]

# 但更推荐 enumerate，编号与取值一步到位
for i, amount in enumerate(spends, start=1):
    print(f"第 {i} 笔 {amount}")""", ["example"]),

    ("md", """\
## 9.3 循环 + 条件：筛选与查找

**概念**：循环体内放 if，就得到两个经典模式——
**筛选**（满足条件的收集起来）与**查找**（找到第一个满足的就停）。
查找用 `break` 提前退出；`continue` 则跳过本轮进入下一轮。""", []),

    ("md", "### 例 1｜业务例子：筛出大额支出", []),

    ("code", """\
records = [
    {"summary": "午餐", "amount": 25.5},
    {"summary": "耳机", "amount": 399.0},
    {"summary": "地铁", "amount": 4.0},
    {"summary": "球鞋", "amount": 529.0},
]

big = []
for record in records:
    if record["amount"] >= 100:
        big.append(record["summary"])

print("大额支出:", big)""", ["example"]),

    ("md", "### 例 2｜业务例子：找到第一笔大额就停", []),

    ("code", """\
records = [
    {"summary": "午餐", "amount": 25.5},
    {"summary": "耳机", "amount": 399.0},
    {"summary": "球鞋", "amount": 529.0},
]

for record in records:
    if record["amount"] >= 100:
        print("第一笔大额是:", record["summary"])
        break               # 找到就退出，后面的不再看
else:
    print("没有大额支出")    # for-else：循环完整跑完且没 break 时执行""", ["example"]),

    ("md", """\
**输出解读**：`第一笔大额是: 耳机`。`for-else` 是 Python 特色：
else 块在**循环没被 break 打断**时执行，适合“找遍了都没有”的提示。

### 例 3｜常见错误：continue 与 break 记反""", []),

    ("code", """\
spends = [18.5, 0.0, 6.0]

# continue：跳过本轮，继续下一轮（0 元账不打印，但循环继续）
for amount in spends:
    if amount == 0.0:
        continue
    print("有效账目:", amount)

# break：整个循环结束（见到 0 元就不看了）
for amount in [18.5, 0.0, 6.0]:
    if amount == 0.0:
        break
    print("截止前的账目:", amount)""", ["example"]),

    ("md", """\
## 9.4 while：次数未知时循环

**概念**：for 管“遍历已知数据”，while 管“条件满足就一直做”：
余额还没扣完、用户还没输入对……**while 必须在循环体内改变条件**，
否则就是死循环。""", []),

    ("md", "### 例 1｜业务例子：储蓄目标", []),

    ("code", """\
balance = 1000.0
target = 1050.0
weekly_save = 20.0
weeks = 0

while balance < target:
    balance += weekly_save
    weeks += 1

print(f"需要 {weeks} 周，届时余额 {balance:.1f} 元")""", ["example"]),

    ("md", "### 例 2｜常见错误：死循环与保险丝", []),

    ("code", """\
# 反例：忘记更新条件变量，永远循环
# balance = 1000.0
# while balance < 1050:
#     print("存钱")       # 没人改 balance，永远停不下来（此时只能中断内核）

# 保险丝写法：给循环加上限
balance = 1000.0
weeks = 0
while balance < 1050 and weeks < 52:   # 最多算一年
    balance += 20.0
    weeks += 1
print(weeks, balance)""", ["example"]),

    ("md", """\
**要点**：写 while 先回答三个问题——**条件什么时候变？由谁变？最多循环多少次？**
答不出来就改用 for。死循环时用内核的中断按钮（stop）停掉。""", []),

    ("md", """\
## 9.5 实战：把账本统计写完整

综合前四节，一段完整的月度报表代码。这也是第 10 章
把它封装成函数的素材。""", []),

    ("md", "### 例 1｜业务例子：月度账单报表", []),

    ("code", """\
ledger = [
    {"summary": "午餐", "category": "餐饮", "amount": 25.5},
    {"summary": "地铁", "category": "交通", "amount": 4.0},
    {"summary": "耳机", "category": "数码", "amount": 399.0},
    {"summary": "晚餐", "category": "餐饮", "amount": 32.0},
    {"summary": "打车", "category": "交通", "amount": 28.0},
    {"summary": "电影", "category": "娱乐", "amount": 45.0},
]

total = 0.0
by_category = {}
big = []

for record in ledger:
    amount = record["amount"]
    total += amount
    category = record["category"]
    by_category[category] = by_category.get(category, 0.0) + amount
    if amount >= 100:
        big.append(record["summary"])

print(f"共 {len(ledger)} 笔，总支出 {total:.1f} 元")
for category, amount in by_category.items():
    share = amount / total
    print(f"  {category}: {amount:.1f} 元（{share:.0%}）")
print("大额支出:", big)""", ["example"]),

    ("md", """\
**输出解读**：一行行读——累计器算总额；字典聚合模板算分类占比；
筛选模式收集大额。三段式结构清晰，每段都能单独测试。
**这就是“程序”了：输入数据，输出报表。**""", []),

    ("md", """\
## 综合练习""", []),

    ("md", "### 练一练 9.1：日均支出与超标日", ["exercise"]),

    ("code", """\
daily = [120.5, 0.0, 88.0, 210.0, 66.5, 0.0, 302.0]

# TODO 1：用循环统计有效天数（金额 > 0）与有效日总支出
# TODO 2：打印日均支出（总支出 / 有效天数，保留 1 位小数）
# TODO 3：收集超过 200 元的日期编号（从 1 数）到大额列表并打印""", ["exercise"]),

    ("md", "### 练一练 9.2：找第一笔与最后一笔", ["exercise"]),

    ("code", """\
ledger = [
    {"summary": "早餐", "amount": 6.0},
    {"summary": "奶茶", "amount": 22.0},
    {"summary": "晚餐", "amount": 32.0},
]

# TODO 1：用循环 + break 找到第一个超过 20 元的账目并打印
# TODO 2：用循环找出金额最大的一笔（不许用 max），打印摘要与金额""", ["exercise"]),

    ("md", "### 练一练 9.3：储蓄计划（while）", ["exercise"]),

    ("code", """\
# 每月存 800，目标 10000；但每月有 5% 的概率额外支出 200（用固定序列模拟）
monthly_extra = [0, 200, 0, 0, 200, 0, 0, 200, 0, 0, 0, 0, 200, 0, 0]

balance = 0.0
month = 0

# TODO：用 while 循环存钱（balance < 10000 时继续），
#       每月 balance += 800 - monthly_extra[month]，
#       打印达成目标用了几个月、最终余额。
# 注意：给 while 加保险丝（month < len(monthly_extra)）""", ["exercise"]),

    ("md", """\
## 易错点清单

- 循环内增删正在遍历的列表，元素被跳过——改为“建新列表”；
- `range(1, n)` 少了 0 号；`range(a, b)` 不含 b；
- while 忘了更新条件变量 → 死循环；写 while 先设保险丝；
- 累计器在循环**内**置 0，每轮都清零——累计器必须定义在循环外；
- break/continue 记反：continue 只跳本轮，break 结束整个循环。""", []),

    ("md", """\
## 本章小结

- for 遍历数据，while 跑未知次数；累计器、筛选、查找三大模式覆盖大多数需求。
- enumerate 带编号，for-else 处理“没找到”。
- 实战段落演示了完整月报：聚合 + 占比 + 大额筛选。
- 下一章把这段报表代码装进函数——一处定义，处处调用。""", []),

    ("md", """\
## 参考答案""", []),

    ("code", """\
# 练一练 9.1 参考答案
daily = [120.5, 0.0, 88.0, 210.0, 66.5, 0.0, 302.0]

valid_days = 0
total = 0.0
big = []
for i, amount in enumerate(daily, start=1):
    if amount <= 0:
        continue
    valid_days += 1
    total += amount
    if amount > 200:
        big.append(i)

print(f"日均支出 {total / valid_days:.1f} 元")
print("大额日:", big)""", ["solution"]),

    ("code", """\
# 练一练 9.2 参考答案
ledger = [
    {"summary": "早餐", "amount": 6.0},
    {"summary": "奶茶", "amount": 22.0},
    {"summary": "晚餐", "amount": 32.0},
]

for record in ledger:
    if record["amount"] > 20:
        print("第一笔超过 20 元:", record["summary"])
        break

biggest = ledger[0]
for record in ledger[1:]:
    if record["amount"] > biggest["amount"]:
        biggest = record
print("最大一笔:", biggest["summary"], biggest["amount"])""", ["solution"]),

    ("code", """\
# 练一练 9.3 参考答案
monthly_extra = [0, 200, 0, 0, 200, 0, 0, 200, 0, 0, 0, 0, 200, 0, 0]

balance = 0.0
month = 0
while balance < 10000 and month < len(monthly_extra):
    balance += 800 - monthly_extra[month]
    month += 1
print(f"用了 {month} 个月，最终余额 {balance:.1f} 元")""", ["solution"]),
]
