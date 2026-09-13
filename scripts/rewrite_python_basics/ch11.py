"""第11章 函数进阶：内置函数、lambda 与组合"""

TITLE = "函数进阶：内置函数、lambda 与组合"
EST_MINUTES = 50

CELLS = [
    ("md", """\
# 第11章 函数进阶：内置函数、lambda 与组合

上一章你写了不少“遍历 + 筛选 + 累计”的样板代码。其实 Python 早已内置了
这些常见套路：`sorted`、`sum`、`max` 都能接受**函数作为参数**，
再配上一行的 `lambda`，四五行就能顶过去十几行。

本章不是炫技：这些写法在 pandas（第 19 章起）的文档里随处可见，
看不懂它们，后面寸步难行。""", []),

    ("md", """\
## 学习目标

学完本章，你能够：

- 用 `key=` 参数让 sorted / max / min 按自定义规则工作；
- 在“用完即弃”的场景写 lambda，并知道何时该改用 def；
- 读懂数据处理中高频出现的“组合拳”（sorted + lambda、sum + 生成器）；
- 用这章的视角回头看第 9 章的聚合循环，理解哪一段被谁替代了。""", []),

    ("md", """\
## 11.1 函数是值：可以传递的“规则”

**概念**：Python 里函数和数字一样是**值**——可以存进变量、当作参数传递。
接受函数的参数通常叫 `key`：它的意思是
**“排序/比较时，先对每个元素调用这个函数，再按结果排”**。""", []),

    ("md", "### 例 1｜最小例子：按绝对值排序", []),

    ("code", """\
nums = [-8, 3, -5, 1]

print(sorted(nums))                    # [-8, -5, 3, 1]：默认按数值
print(sorted(nums, key=abs))           # [1, 3, -5, -8]：按绝对值
print(max(nums, key=abs))              # -8：绝对值最大的元素本身""", ["example"]),

    ("md", "### 例 2｜业务例子：按金额找账目", []),

    ("code", """\
ledger = [
    {"summary": "午餐", "amount": 25.5},
    {"summary": "耳机", "amount": 399.0},
    {"summary": "地铁", "amount": 4.0},
    {"summary": "球鞋", "amount": 529.0},
]

# 第 9 章的“手写找最大”在这里只要一行
top = max(ledger, key=lambda record: record["amount"])
print("最大单笔:", top["summary"], top["amount"])

# Top2 = 降序排序 + 切片
top2 = sorted(ledger, key=lambda record: record["amount"], reverse=True)[:2]
print("前两笔:", [(r["summary"], r["amount"]) for r in top2])""", ["example"]),

    ("md", """\
**输出解读**：`max(ledger, key=...)` 返回的是**元素本身**（字典），
不是金额——这是和 `max([金额列表])` 的关键区别，也是它好用的地方。

### 例 3｜常见错误：key 用错层级""", []),

    ("code", """\
ledger = [
    {"summary": "午餐", "amount": 25.5},
    {"summary": "地铁", "amount": 4.0},
]

# 反例 1：直接传字典会崩（字典之间不能比大小）
# print(max(ledger))            # TypeError: '>' not supported ...

# 反例 2：key 里调用了函数却没传函数（加了括号 = 立刻执行）
# sorted(ledger, key=max(ledger["amount"]))   # 语义混乱，必错

# 反例 3：lambda 忘了接收参数
# sorted(ledger, key=lambda: 0)

# 正确：key 接收“一个参数的函数”，返回用于比较的值
print(max(ledger, key=lambda r: r["amount"]))""", ["example"]),

    ("md", """\
**要点**：`key=` 后面是**函数名或 lambda 本身**，不写括号；
`max` 比较的是 key 函数的返回值，返回的是原元素。""", []),

    ("md", """\
## 11.2 lambda：一次性的小函数

**概念**：`lambda 参数: 表达式` 定义一个**没有名字的小函数**，
表达式结果就是返回值。适用场景：**只在一处使用、逻辑一行说得清**
（比如上面做 key 的取字段函数）。
逻辑超过一行、需要注释、要复用——**改用 def**。""", []),

    ("md", "### 例 1｜最小例子：lambda 与 def 等价", []),

    ("code", """\
square = lambda x: x ** 2          # lambda 写法
def square2(x):                    # 等价的 def 写法
    return x ** 2

print(square(6), square2(6))       # 36 36

# lambda 直接当参数传递（最常见的形态）
pairs = [("餐饮", 25.5), ("数码", 399.0), ("交通", 4.0)]
by_amount = sorted(pairs, key=lambda pair: pair[1], reverse=True)
print(by_amount)""", ["example"]),

    ("md", "### 例 2｜业务例子：多字段排序", []),

    ("code", """\
ledger = [
    {"category": "餐饮", "amount": 25.5},
    {"category": "交通", "amount": 88.0},
    {"category": "餐饮", "amount": 32.0},
]

# 先按类别、类别内按金额降序——key 返回元组即可（第 5 章的元组比较）
result = sorted(
    ledger,
    key=lambda r: (r["category"], -r["amount"]),
)
for r in result:
    print(r["category"], r["amount"])""", ["example"]),

    ("md", """\
**输出解读**：餐饮(32.0)、餐饮(25.5)、交通(88.0)。
元组比较逐位进行：先比类别，同类别再比金额；`-amount` 用负号实现降序，
是“同一 key 内混合升降序”的惯用小技巧。

### 例 3｜常见错误：把 lambda 当万能缩写""", []),

    ("code", """\
# 反例：塞进 lambda 的逻辑已经读不懂了
f = lambda r: (r["amount"] >= 100 and "大额" or (r["amount"] >= 20 and "中额" or "小额"))
print(f({"amount": 150}))

# 修复：有分支、有名字的逻辑，用 def
def level(amount):
    if amount >= 100:
        return "大额"
    if amount >= 20:
        return "中额"
    return "小额"

print(level(150), level(25), level(5))""", ["example"]),

    ("md", """\
**要点**：**lambda 一行、def 一生。** 读到自己的 lambda 需要停顿超过一秒，
就升级成 def。""", []),

    ("md", """\
## 11.3 组合拳：sorted、sum、max 与生成器表达式

**概念**：`sum(x for x in xs if 条件)` 这种写法叫**生成器表达式**：
“遍历 + 条件筛选”压缩进一行，直接喂给 sum/max/min。
它和列表推导（方括号版）的区别是不必先建出整个列表，边算边取。""", []),

    ("md", "### 例 1｜最小例子：三种筛选求和", []),

    ("code", """\
spends = [18.5, 0.0, 235.0, 6.0, 88.0]

print(sum(spends))                              # 全部求和
print(sum(a for a in spends if a > 0))          # 只加正数
print(sum(a for a in spends if a >= 100) / sum(spends))  # 大额占比""", ["example"]),

    ("md", "### 例 2｜业务例子：重写第 9 章的月报统计", []),

    ("code", """\
ledger = [
    {"summary": "午餐", "category": "餐饮", "amount": 25.5},
    {"summary": "地铁", "category": "交通", "amount": 4.0},
    {"summary": "耳机", "category": "数码", "amount": 399.0},
    {"summary": "晚餐", "category": "餐饮", "amount": 32.0},
]

total = sum(r["amount"] for r in ledger)

categories = {r["category"] for r in ledger}          # 集合推导：去重
for category in sorted(categories):
    part = sum(r["amount"] for r in ledger if r["category"] == category)
    print(f"  {category}: {part:.1f} 元（{part / total:.0%}）")

top = max(ledger, key=lambda r: r["amount"])
print(f"总支出 {total:.1f} 元，最大单笔 {top['summary']} {top['amount']} 元")""", ["example"]),

    ("md", """\
**输出解读**：对照第 9 章 1.5 节的版本——三段手写循环浓缩成
“sum + 条件”“集合推导”“max + lambda”三个惯用法。
**两种写法都要会**：手写循环是理解的基础，惯用法是阅读他人代码的通行证。

### 例 3｜常见错误：生成器只能用一次""", []),

    ("code", """\
spends = [10.0, 20.0, 30.0]

gen = (a for a in spends if a > 0)
print(sum(gen))     # 60.0
print(sum(gen))     # 0！生成器已耗尽，第二次是空

# 修复：重复使用就先固化成列表
valid = [a for a in spends if a > 0]
print(sum(valid), max(valid))""", ["example"]),

    ("md", """\
**要点**：生成器是“流水线”，流过一次就没了；
要反复用，先 `list(...)` / 列表推导存下来。""", []),

    ("md", """\
## 11.4 常用工具函数补齐

**概念**：最后补齐数据处理高频的几个内置函数——
`zip`（并行遍历多个序列）、`any` / `all`（存在性/全体性判断）、
`map`（逐个转换；能用推导就优先用推导）。""", []),

    ("md", "### 例 1｜业务例子：对账", []),

    ("code", """\
mine = [25.5, 4.0, 399.0]        # 我记的
bank = [25.5, 4.0, 389.0]        # 银行流水

# zip 并行遍历：每轮给出一对 (mine_i, bank_i)
for i, (a, b) in enumerate(zip(mine, bank), start=1):
    if a != b:
        print(f"第 {i} 笔不平: 我记 {a}，银行 {b}")

print("全部一致:", all(a == b for a, b in zip(mine, bank)))
print("存在差异:", any(a != b for a, b in zip(mine, bank)))""", ["example"]),

    ("md", "### 例 2｜常见错误：zip 长度不齐被静默截断", []),

    ("code", """\
mine = [25.5, 4.0, 399.0]
bank = [25.5, 4.0]               # 银行少了一笔

print(list(zip(mine, bank)))     # 只配对 2 对！399.0 没了对账对象

# 修复：数据量对不上时先检查长度
if len(mine) != len(bank):
    print(f"笔数不一致: {len(mine)} vs {len(bank)}，先对齐再对账")
else:
    print(all(a == b for a, b in zip(mine, bank)))""", ["example"]),

    ("md", """\
## 综合练习""", []),

    ("md", "### 练一练 11.1：排序与 Top", ["exercise"]),

    ("code", """\
ledger = [
    {"summary": "午餐", "category": "餐饮", "amount": 25.5},
    {"summary": "地铁", "category": "交通", "amount": 4.0},
    {"summary": "球鞋", "category": "购物", "amount": 529.0},
    {"summary": "耳机", "category": "数码", "amount": 399.0},
]

# TODO 1：按金额从大到小打印每笔账（summary + amount）
# TODO 2：用 max(key=lambda...) 打印最贵一笔的摘要
# TODO 3：打印最便宜的**两笔**的摘要列表""", ["exercise"]),

    ("md", "### 练一练 11.2：惯用法改写", ["exercise"]),

    ("code", """\
spends = [18.5, 0.0, 235.0, 6.0, 88.0, 0.0]

# TODO 1：用 sum + 生成器表达式统计有效（>0）笔数与有效总额
# TODO 2：any/all 判断：是否存在 0 元账？是否全部 > 0？
# TODO 3：把三笔金额和三笔摘要并行 zip 成 (summary, amount) 列表并打印
notes = ["A", "B", "C"]""", ["exercise"]),

    ("md", "### 练一练 11.3：lambda 还是 def？", ["exercise"]),

    ("code", """\
ledger = [
    {"category": "餐饮", "amount": 25.5},
    {"category": "餐饮", "amount": 32.0},
    {"category": "交通", "amount": 4.0},
]

# TODO 1：用 sorted + lambda 按 (类别升序, 金额降序) 排序并打印
# TODO 2：写一个 def 版本的 level(amount)（>=100 大额 / >=20 中额 / 其余小额），
#         再用 level 当 key，给每笔账打印金额与档位""", ["exercise"]),

    ("md", """\
## 易错点清单

- `key=` 传的是函数本身，不能加括号调用；
- `max(字典列表)` 直接崩，必须给 key；
- lambda 里塞 if/or 逻辑难读难调，超一行就改 def；
- 生成器表达式只能消费一次，重复用先转列表；
- zip 对不齐长度会静默截断，重要对账先查长度。""", []),

    ("md", """\
## 本章小结

- `key=` + `lambda` 是 sorted/max/min 的万能规则接口。
- 生成器表达式把“筛选 + 聚合”压成一行，但只能用一次。
- 手写循环（第 9 章）与惯用法（本章）是一体两面：先会写，再会读。
- Python 基础到此收官：下一章让数据落地——文件与 JSON 持久化。""", []),

    ("md", """\
## 参考答案""", []),

    ("code", """\
# 练一练 11.1 参考答案
ledger = [
    {"summary": "午餐", "category": "餐饮", "amount": 25.5},
    {"summary": "地铁", "category": "交通", "amount": 4.0},
    {"summary": "球鞋", "category": "购物", "amount": 529.0},
    {"summary": "耳机", "category": "数码", "amount": 399.0},
]

for r in sorted(ledger, key=lambda r: r["amount"], reverse=True):
    print(r["summary"], r["amount"])

print(max(ledger, key=lambda r: r["amount"])["summary"])
print([r["summary"] for r in sorted(ledger, key=lambda r: r["amount"])[:2]])""", ["solution"]),

    ("code", """\
# 练一练 11.2 参考答案
spends = [18.5, 0.0, 235.0, 6.0, 88.0, 0.0]
notes = ["A", "B", "C"]

valid = [a for a in spends if a > 0]
print(len(valid), sum(valid))
print(any(a == 0 for a in spends), all(a > 0 for a in spends))
print(list(zip(notes, [18.5, 235.0, 6.0])))""", ["solution"]),

    ("code", """\
# 练一练 11.3 参考答案
ledger = [
    {"category": "餐饮", "amount": 25.5},
    {"category": "餐饮", "amount": 32.0},
    {"category": "交通", "amount": 4.0},
]

for r in sorted(ledger, key=lambda r: (r["category"], -r["amount"])):
    print(r["category"], r["amount"])

def level(amount):
    if amount >= 100:
        return "大额"
    if amount >= 20:
        return "中额"
    return "小额"

for r in ledger:
    print(r["amount"], level(r["amount"]))""", ["solution"]),
]
