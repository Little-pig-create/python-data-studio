"""第5章 元组：固定字段与解包"""

TITLE = "元组：固定字段与解包"
EST_MINUTES = 40

CELLS = [
    ("md", """\
# 第5章 元组：固定字段与解包

一笔账往往有多个字段：`(日期, 摘要, 金额)`。这种“字段数量和含义固定、
不需要增删”的数据，Python 用**元组（tuple）**表示。

元组和列表长得像，核心区别一句话：**列表可变，元组不可变**。
本章重点不在元组本身的操作（和列表几乎一样），而在它最大的价值——
**打包与解包**。""", []),

    ("md", """\
## 学习目标

学完本章，你能够：

- 创建元组、访问元素，说清它与列表的区别；
- 用元组返回/接收多个值（解包），读懂 `a, b = b, a`；
- 判断什么时候该用元组、什么时候该用列表；
- 知道“只有一个元素的元组”要写 `(x,)`。""", []),

    ("md", """\
## 5.1 元组基础：不可变的序列

**概念**：元组用圆括号书写：`record = ("2026-08-01", "午餐", 25.5)`。
索引、切片、`len()`、`in` 都和列表相同；区别是**创建后不能增删改**——
任何“修改”都会直接报错。""", []),

    ("md", "### 例 1｜最小例子：访问与不可变", []),

    ("code", """\
record = ("2026-08-01", "午餐", 25.5)

print(record[0])     # 2026-08-01
print(record[-1])    # 25.5
print(len(record))   # 3

# 反例：修改元组会直接报错
# record[1] = "晚餐"   # TypeError: 'tuple' object does not support item assignment""", ["example"]),

    ("md", "### 例 2｜业务例子：一条账目记录", []),

    ("code", """\
# (日期, 摘要, 类别, 金额) 四元组
record_a = ("2026-08-01", "午餐-黄焖鸡", "餐饮", 25.5)
record_b = ("2026-08-01", "地铁", "交通", 4.0)

records = [record_a, record_b]      # 列表装元组：账本雏形
total = record_a[-1] + record_b[-1]
print(f"{len(records)} 笔账，合计 {total:.1f} 元")""", ["example"]),

    ("md", """\
**输出解读**：`2 笔账，合计 29.5 元`。“列表装元组”是最基础的账本结构：
列表负责“可增删”（能记账），元组负责“字段固定”（单笔账不会被改乱）。

### 例 3｜常见错误：单元素元组与“该可变时用了元组”""", []),

    ("code", """\
# 反例 1：单元素元组忘了逗号
not_tuple = (25.5)
print(type(not_tuple).__name__)    # float！括号只是运算括号
one_tuple = (25.5,)
print(type(one_tuple).__name__)    # tuple：差别只在那个逗号

# 反例 2：字段需要增删时用元组，自找麻烦
record = ("2026-08-01", "午餐", 25.5)
# record.append(4.0)               # AttributeError：元组没有 append
# 修复：需要变化就换成列表，或重建元组
record = record + (4.0, "外卖配送")
print(record)""", ["example"]),

    ("md", """\
**选择口诀**：**会增删改 → 列表；字段固定 → 元组。**
拿不准时用列表（更宽容），需要“防手滑”或做字典键时用元组。""", []),

    ("md", """\
## 5.2 解包：一次拆开多个值

**概念**：把元组（或列表）的元素一次性赋给多个变量叫**解包**：
`date, summary, amount = record`。
两边数量必须相等；用 `*rest` 可以收集剩余部分；
`a, b = b, a` 交换两个变量就是解包的经典应用。""", []),

    ("md", "### 例 1｜最小例子：交换与收集", []),

    ("code", """\
a, b = 1, 2        # 右边其实是元组 (1, 2)，被解包
a, b = b, a        # 交换
print(a, b)        # 2 1

nums = (10, 20, 30, 40)
first, *rest = nums
print(first, rest)   # 10 [20, 30, 40]：rest 是列表""", ["example"]),

    ("md", "### 例 2｜业务例子：函数一次返回多个结果（先见为快）", []),

    ("code", """\
# 月份小结函数：同时返回总支出和最大单笔（第 10 章细讲函数）
def month_summary(spends):
    return sum(spends), max(spends)   # 打包成元组返回

week = [18.5, 6.0, 25.5, 32.0, 12.0, 88.0, 45.9]
total, biggest = month_summary(week)   # 解包接收
print(f"合计 {total:.1f} 元，最大单笔 {biggest:.1f} 元")""", ["example"]),

    ("md", """\
**输出解读**：`return a, b` 返回的其实是一个元组，接收时解包。
这套“打包返回 → 解包接收”是 Python 的惯用法，pandas、sklearn 里到处都是。

### 例 3｜常见错误：解包数量不匹配""", []),

    ("code", """\
record = ("2026-08-01", "午餐", 25.5)

# 反例：两边数量不等
# date, amount = record       # ValueError: too many values to unpack

# 修复 1：数量对齐
date, summary, amount = record
print(date, amount)

# 修复 2：字段多时用 *rest 收集
date, *others = record
print(date, others)""", ["example"]),

    ("md", """\
## 5.3 enumerate：带上编号的解包

**概念**：遍历列表想要“第几条 + 内容”时，用 `enumerate(xs)`，
它每次给出 `(索引, 元素)` 二元组——for 循环里最常见的解包（第 9 章展开循环）。""", []),

    ("md", "### 例 1｜业务例子：打印带序号的账目", []),

    ("code", """\
week = [18.5, 6.0, 25.5, 32.0]

for i, amount in enumerate(week, start=1):   # start=1 从 1 号开始编号
    print(f"第 {i} 笔：{amount:.1f} 元")""", ["example"]),

    ("md", """\
**输出解读**：四行“第 N 笔”输出。`enumerate` 避免了手写 `i = i + 1`，
`start=1` 让编号更符合人的习惯。""", []),

    ("md", """\
## 综合练习""", []),

    ("md", "### 练一练 5.1：解包账目记录", ["exercise"]),

    ("code", """\
record = ("2026-08-02", "打车-机场", "交通", 88.0)

# TODO 1：解包到 date, summary, category, amount 四个变量
# TODO 2：打印 "2026-08-02 的交通支出为 88.0 元"（用解包出的变量拼 f-string）""", ["exercise"]),

    ("md", "### 练一练 5.2：min-max 一起返回", ["exercise"]),

    ("code", """\
week = [18.5, 6.0, 25.5, 32.0, 12.0, 88.0, 45.9]

# TODO：仿照 month_summary，写函数返回 (最小, 最大)，
#       解包接收后打印 "最省 6.0 元，最贵 88.0 元""", ["exercise"]),

    ("md", "### 练一练 5.3：元组还是列表？", ["exercise"]),

    ("md", """\
不写代码，口答并说明理由：

1. 一周 7 天的星期名（周一到周日，内容固定）——元组还是列表？
2. 今天的待办事项（会随时加减）——元组还是列表？
3. 一个坐标点 (x, y)——元组还是列表？""", ["exercise"]),

    ("code", """\
# 练一练 5.3 验证区（口答后可运行感受）
weekday_names = ("周一", "周二", "周三", "周四", "周五", "周六", "周日")
todos = ["记账", "买菜"]
point = (3.5, 7.2)
print(type(weekday_names).__name__, type(todos).__name__, type(point).__name__)""", ["exercise"]),

    ("md", """\
## 易错点清单

- 单元素元组必须写 `(x,)`，`(x)` 只是括号运算；
- 元组不可变：没有 append/remove，`record[i] = v` 报 TypeError；
- 解包两边数量不等会 ValueError，字段多用 `*rest`；
- `return a, b` 返回的是元组——这是特性不是坑，但要心里有数。""", []),

    ("md", """\
## 本章小结

- 元组 = 不可变列表，适合字段固定的记录。
- 解包是核心技能：多值返回、变量交换、enumerate 遍历都靠它。
- 结构选择：记录用元组、账本（会增删）用列表装元组。
- 下一章：按名字取字段——字典，让 `record["金额"]` 成为可能。""", []),

    ("md", """\
## 参考答案""", []),

    ("code", """\
# 练一练 5.1 参考答案
record = ("2026-08-02", "打车-机场", "交通", 88.0)

date, summary, category, amount = record
print(f"{date} 的{category}支出为 {amount} 元")""", ["solution"]),

    ("code", """\
# 练一练 5.2 参考答案
week = [18.5, 6.0, 25.5, 32.0, 12.0, 88.0, 45.9]

def min_max(spends):
    return min(spends), max(spends)

cheapest, priciest = min_max(week)
print(f"最省 {cheapest} 元，最贵 {priciest} 元")""", ["solution"]),

    ("code", """\
# 练一练 5.3 参考答案
# 1. 元组：内容固定不变，用元组防误改；
# 2. 列表：待办会随时增删，需要可变；
# 3. 元组：坐标字段固定，且元组可作为字典键使用。""", ["solution"]),
]
