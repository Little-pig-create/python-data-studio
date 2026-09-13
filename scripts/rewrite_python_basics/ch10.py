"""第10章 函数基础：参数、返回值与职责"""

TITLE = "函数基础：参数、返回值与职责"
EST_MINUTES = 55

CELLS = [
    ("md", """\
# 第10章 函数基础：参数、返回值与职责

上一章的月度报表代码有 20 行。下个月要用，复制粘贴一遍？
下下个月再改规则，两个地方都要改——很快就会改漏。

**函数**把一段逻辑装进盒子：起个名字、说明输入输出，之后**一处定义、处处调用**。
本章结束时，月度报表会变成一行 `print_monthly_report(ledger)`。""", []),

    ("md", """\
## 学习目标

学完本章，你能够：

- 定义带参数、有返回值的函数，说清形参/实参与 return 的作用；
- 给参数设默认值，用关键字参数提高可读性；
- 用“单一职责”把大段代码拆成小函数；
- 避开三大坑：忘写 return、print 与 return 混淆、可变默认参数。""", []),

    ("md", """\
## 10.1 定义与调用：def、参数、return

**概念**：函数三要素——**名字**（做什么）、**参数**（需要什么输入）、
**返回值**（给出什么结果）：

```python
def 函数名(参数):
    逻辑
    return 结果
```

`return` 做两件事：把值交还给调用方，并**立即结束函数**。""", []),

    ("md", "### 例 1｜最小例子：加法函数", []),

    ("code", """\
def add_tax(amount, rate):
    '''计算含税金额（这个三引号说明叫 docstring，help() 能看到）'''
    return amount * (1 + rate)

result = add_tax(100.0, 0.06)   # 调用：实参按位置传给形参
print(result)                   # 106.0
print(add_tax(amount=200.0, rate=0.06))   # 关键字参数：更易读""", ["example"]),

    ("md", "### 例 2｜业务例子：单笔账的实付计算", []),

    ("code", """\
def final_amount(unit_price, quantity, discount=0.0):
    '''按数量折算小计，再减去固定优惠'''
    subtotal = unit_price * quantity
    return subtotal - discount

print(final_amount(299.0, 2))               # 无优惠
print(final_amount(299.0, 2, 30.0))         # 满 300 减 30
print(final_amount(128.0, 3, discount=10))  # 关键字传优惠""", ["example"]),

    ("md", """\
**输出解读**：三行 `598.0 / 568.0 / 374.0`。
同一个函数吃三种参数组合。`discount=0.0` 是**默认参数**：
不传就按 0 处理，传了就覆盖。

### 例 3｜常见错误：忘写 return 与 print/return 混淆""", []),

    ("code", """\
# 反例 1：只 print 不 return
def add_tax_broken(amount, rate):
    print(amount * (1 + rate))     # 打印了，但没交还结果

result = add_tax_broken(100.0, 0.06)
print(result)                      # None！函数没有 return，返回 None

# 反例 2：return 后的代码永远不执行
def early(a, b):
    return a + b
    print("算完了")                 # 不可达代码（IDE 会灰掉提示）

# 修复：结果 return，展示交给调用方
def add_tax_fixed(amount, rate):
    return amount * (1 + rate)

print(add_tax_fixed(100.0, 0.06))  # 调用方决定打印""", ["example"]),

    ("md", """\
**要点**：**print 是给人看的，return 是给程序用的。**
函数只负责算（return），打不打印由调用方决定——这样函数才能被复用、被测试。""", []),

    ("md", """\
## 10.2 局部变量与作用域

**概念**：函数内部定义的变量是**局部变量**，函数结束就消失；
外面的变量同名也不是同一个。函数想用什么数据，**通过参数传进来**；
想交出什么结果，**通过 return 传出去**——这条“进出走门口”的纪律，
是代码可维护性的基石。""", []),

    ("md", "### 例 1｜最小例子：局部变量出不了门", []),

    ("code", """\
def calc():
    inner = 42        # 局部变量
    return inner

print(calc())
# print(inner)       # NameError：inner 只活在 calc 里

total = 100          # 外面的变量

def add_local():
    total = 1        # 这是函数自己的 total，不是外面那个
    return total

print(add_local())   # 1
print(total)         # 100：外面的没被改动""", ["example"]),

    ("md", "### 例 2｜业务例子：函数各管一段", []),

    ("code", """\
ledger = [
    {"summary": "午餐", "category": "餐饮", "amount": 25.5},
    {"summary": "地铁", "category": "交通", "amount": 4.0},
    {"summary": "耳机", "category": "数码", "amount": 399.0},
    {"summary": "晚餐", "category": "餐饮", "amount": 32.0},
]

def total_of(records):
    '''总支出'''
    total = 0.0
    for record in records:
        total += record["amount"]
    return total

def top_record(records):
    '''金额最大的一笔'''
    biggest = records[0]
    for record in records[1:]:
        if record["amount"] > biggest["amount"]:
            biggest = record
    return biggest

print(f"总支出 {total_of(ledger):.1f} 元")
top = top_record(ledger)
print("最大单笔:", top["summary"], top["amount"])""", ["example"]),

    ("md", """\
**输出解读**：两个函数各自通过参数拿数据、通过 return 交结果，
互相不碰对方的变量。想测谁就调谁——这就是“函数化”之后的灵活性。

### 例 3｜常见错误：依赖外部变量（隐式耦合）""", []),

    ("code", """\
rate = 0.06    # 全局变量

def with_tax(amount):
    return amount * (1 + rate)     # 依赖外面的 rate

print(with_tax(100.0))
rate = 0.13                        # 某天有人改了全局值
print(with_tax(100.0))             # 同样的调用，结果变了——排障噩梦！

# 修复：把依赖写成参数，行为可预期
def with_tax_v2(amount, rate=0.06):
    return amount * (1 + rate)

print(with_tax_v2(100.0), with_tax_v2(100.0, 0.13))""", ["example"]),

    ("md", """\
**要点**：函数体里出现的每个名字，要么是**参数**，要么是**局部定义**。
全局变量能不用就不用（常量除外，如 `TAX_RATE = 0.06` 且从不改动）。""", []),

    ("md", """\
## 10.3 单一职责：把大函数拆小

**概念**：一个函数只做**一件事**，名字说明这件事。
判断标准：能不能用一句“它负责……”描述完？描述里出现“然后、顺便”，
就该拆。拆完的小函数还能单独测试、单独复用。""", []),

    ("md", "### 例 1｜业务例子：报表三段拆分", []),

    ("code", """\
ledger = [
    {"summary": "午餐", "category": "餐饮", "amount": 25.5},
    {"summary": "地铁", "category": "交通", "amount": 4.0},
    {"summary": "耳机", "category": "数码", "amount": 399.0},
    {"summary": "晚餐", "category": "餐饮", "amount": 32.0},
]

def summarize(records):
    '''返回 (总支出, 分类合计字典)'''
    total = 0.0
    by_category = {}
    for record in records:
        amount = record["amount"]
        total += amount
        by_category[record["category"]] = (
            by_category.get(record["category"], 0.0) + amount
        )
    return total, by_category          # 元组打包，第 5 章的解包用上了

def render(total, by_category):
    '''只负责把结果排版成人话'''
    print(f"总支出 {total:.1f} 元")
    for category, amount in by_category.items():
        share = amount / total
        print(f"  {category}: {amount:.1f} 元（{share:.0%}）")

total, by_category = summarize(ledger)   # 计算
render(total, by_category)               # 展示""", ["example"]),

    ("md", """\
**输出解读**：`summarize` 只算不打印，`render` 只排版不计算——
**计算与展示分离**。以后要把报表输出到文件，只改 render；
要改统计口径，只改 summarize。

### 例 2｜常见错误：一个函数管到底""", []),

    ("code", """\
# 反例风格示例（伪代码，勿模仿其结构）：
# def do_everything(ledger):
#     读取数据... 校验... 汇总... 打印... 存文件...
# ——任何一步要改，整函数重测；任何一段想复用，都得整块复制。

# 修复思路演示：拆成 summarize + render（见上例），
# 再加上一层薄薄的“编排”函数
def report(records):
    total, by_category = summarize(records)
    render(total, by_category)

report(ledger)""", ["example"]),

    ("md", """\
**要点**：编排函数（如 report）允许很短——它只负责“按顺序叫人干活”。
理想的代码像公司：员工各司其职，主管只做调度。""", []),

    ("md", """\
## 10.4 常见坑：可变默认参数

**概念**：默认参数只在**函数定义时创建一次**。
默认值是列表/字典时，所有调用**共享同一个对象**——跨调用“记住”了上次的数据，
这是 Python 著名的坑。""", []),

    ("md", "### 例 1｜反例与修复", []),

    ("code", """\
# 反例：可变默认参数
def add_record_broken(record, records=[]):
    records.append(record)
    return records

print(add_record_broken({"amount": 25.5}))   # [25.5]
print(add_record_broken({"amount": 4.0}))    # [25.5, 4.0]！上次的数据还在

# 修复：默认 None，函数内新建
def add_record(record, records=None):
    if records is None:
        records = []
    records.append(record)
    return records

print(add_record({"amount": 25.5}))
print(add_record({"amount": 4.0}))           # 各自独立""", ["example"]),

    ("md", """\
**要点**：**默认参数只用不可变值**（数字、字符串、None）。
需要可变容器时，写 `=None` 再在函数里新建。""", []),

    ("md", """\
## 综合练习""", []),

    ("md", "### 练一练 10.1：平均数函数", ["exercise"]),

    ("code", """\
def average(numbers):
    '''TODO：返回平均值；空列表返回 0.0（提示：先判断 len）'''
    pass

# 自测（写完后取消注释，应输出 33.3 和 0.0）
# print(f"{average([10.0, 20.0, 70.0]):.1f}")
# print(average([]))""", ["exercise"]),

    ("md", "### 练一练 10.2：分类筛选函数", ["exercise"]),

    ("code", """\
ledger = [
    {"summary": "午餐", "category": "餐饮", "amount": 25.5},
    {"summary": "地铁", "category": "交通", "amount": 4.0},
    {"summary": "晚餐", "category": "餐饮", "amount": 32.0},
]

def records_of(records, category):
    '''TODO：返回 category 类的全部记录组成的列表'''
    pass

# 自测：应输出 2 和 57.5
# food = records_of(ledger, "餐饮")
# print(len(food), sum(r["amount"] for r in food))""", ["exercise"]),

    ("md", "### 练一练 10.3：拆分月报", ["exercise"]),

    ("code", """\
ledger = [
    {"summary": "午餐", "category": "餐饮", "amount": 25.5},
    {"summary": "地铁", "category": "交通", "amount": 4.0},
    {"summary": "耳机", "category": "数码", "amount": 399.0},
]

# TODO 1：定义 biggest(records) 返回金额最大的一笔（复用第 9 章逻辑）
# TODO 2：定义 report(records)：打印总数、总支出、最大单笔三行
#         （内部可以调用本章已有的 summarize/思路，展示与计算分离）
# TODO 3：调用 report(ledger) 验证输出三行""", ["exercise"]),

    ("md", """\
## 易错点清单

- 函数没有 return，调用结果永远是 None；
- `print` 进函数代替 `return`，导致结果无法被复用；
- 函数悄悄依赖全局变量，全局一改结果全变；
- 可变默认参数 `def f(x, items=[])` 跨调用共享数据，应写 `=None`；
- 一个函数又算又打又存——违反单一职责，难复用难测试。""", []),

    ("md", """\
## 本章小结

- 函数 = 名字 + 参数 + return；计算与展示分离，数据进出走参数和返回值。
- 默认参数与关键字参数让调用更省心；可变默认参数是雷区。
- 单一职责拆函数：summarize 管算、render 管排、编排函数管调度。
- 下一章：函数的进阶玩法——内置高阶函数、lambda 与组合。""", []),

    ("md", """\
## 参考答案""", []),

    ("code", """\
# 练一练 10.1 参考答案
def average(numbers):
    if not numbers:
        return 0.0
    return sum(numbers) / len(numbers)

print(f"{average([10.0, 20.0, 70.0]):.1f}")
print(average([]))""", ["solution"]),

    ("code", """\
# 练一练 10.2 参考答案
def records_of(records, category):
    result = []
    for record in records:
        if record["category"] == category:
            result.append(record)
    return result

ledger = [
    {"summary": "午餐", "category": "餐饮", "amount": 25.5},
    {"summary": "地铁", "category": "交通", "amount": 4.0},
    {"summary": "晚餐", "category": "餐饮", "amount": 32.0},
]
food = records_of(ledger, "餐饮")
print(len(food), sum(r["amount"] for r in food))""", ["solution"]),

    ("code", """\
# 练一练 10.3 参考答案
ledger = [
    {"summary": "午餐", "category": "餐饮", "amount": 25.5},
    {"summary": "地铁", "category": "交通", "amount": 4.0},
    {"summary": "耳机", "category": "数码", "amount": 399.0},
]

def biggest(records):
    largest = records[0]
    for record in records[1:]:
        if record["amount"] > largest["amount"]:
            largest = record
    return largest

def report(records):
    total = sum(r["amount"] for r in records)
    top = biggest(records)
    print(f"共 {len(records)} 笔")
    print(f"总支出 {total:.1f} 元")
    print(f"最大单笔 {top['summary']} {top['amount']} 元")

report(ledger)""", ["solution"]),
]
